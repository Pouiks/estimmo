-- ============================================================================
-- ESTIMMO - format compact des ventes DVF (plan Supabase gratuit, 500 Mo)
--
-- L'ancien schéma (numeric, bigserial, geometry + index GiST, 3 index btree)
-- pesait ~650 Mo pour la France sur 3 ans. Celui-ci stocke la même
-- information utile au moteur (prix/m², surface, date, type, commune,
-- position) sur ~60 octets par ligne :
--   * lat/lon en entiers (micro-degrés) au lieu d'une géométrie PostGIS
--   * recherche en rayon via un index (type, bande de latitude, longitude)
--     puis distance géodésique exacte (st_dwithin) sur les candidats
--   * pas de clé primaire ni de colonnes non utilisées (CP, pièces, dept)
-- Les fonctions gardent exactement la même signature et la même sémantique :
-- le moteur d'estimation (lib/estimation) est inchangé.
-- ============================================================================

drop function if exists public.find_comparables_radius(double precision, double precision, text, numeric, numeric, date, double precision);
drop function if exists public.find_comparables_commune(double precision, double precision, text, text, numeric, numeric, date);
drop function if exists public.find_comparables_departement(double precision, double precision, text, text, numeric, numeric, date);
drop table if exists public.dvf_mutations;

create table public.dvf_mutations (
  date_mutation date not null,
  prix_m2 real not null,
  surface_reelle_bati smallint not null,
  -- 'A' appartement / 'M' maison (1 octet)
  type_local "char" not null check (type_local in ('A', 'M')),
  code_insee text not null,
  -- position en micro-degrés (WGS84) : 4 octets chacun
  lat_e6 integer not null,
  lon_e6 integer not null
);

comment on table public.dvf_mutations is
  'Ventes DVF nettoyées (format compact). Jamais exposées individuellement : licence DGFiP.';

alter table public.dvf_mutations enable row level security;

-- Bande de latitude de 0,05° (~5,5 km) : une recherche en rayon ≤ 3 km
-- visite au plus 3 bandes, chacune restreinte à une fenêtre de longitude.
create index dvf_mutations_geo_idx
  on public.dvf_mutations (type_local, (lat_e6 / 50000), lon_e6);

-- Commune (égalité) et département (préfixe) : collation C pour que les
-- comparaisons de plage utilisent l'index.
create index dvf_mutations_insee_idx
  on public.dvf_mutations (code_insee collate "C", type_local);

-- ----------------------------------------------------------------------------
-- Comparables dans un rayon donné (mètres) autour d'un point
-- ----------------------------------------------------------------------------
create or replace function public.find_comparables_radius(
  p_lat double precision,
  p_lon double precision,
  p_type_local text,
  p_surface_min numeric,
  p_surface_max numeric,
  p_date_min date,
  p_radius_m double precision
)
returns table (
  prix_m2 numeric,
  surface_reelle_bati numeric,
  date_mutation date,
  distance_m double precision
)
language sql
stable
as $$
  select
    m.prix_m2::numeric,
    m.surface_reelle_bati::numeric,
    m.date_mutation,
    st_distance(
      st_setsrid(st_makepoint(m.lon_e6 / 1e6, m.lat_e6 / 1e6), 4326)::geography,
      st_setsrid(st_makepoint(p_lon, p_lat), 4326)::geography
    ) as distance_m
  from public.dvf_mutations m
  where m.type_local = (case when p_type_local = 'appartement' then 'A' else 'M' end)::"char"
    -- Boîte englobante (1° de latitude ≈ 111,32 km ; longitude corrigée du cos)
    and (m.lat_e6 / 50000) between
          (round((p_lat - p_radius_m / 111320.0) * 1e6)::int / 50000)
      and (round((p_lat + p_radius_m / 111320.0) * 1e6)::int / 50000)
    and m.lon_e6 between
          round((p_lon - p_radius_m / (111320.0 * greatest(cos(radians(p_lat)), 0.05))) * 1e6)::int
      and round((p_lon + p_radius_m / (111320.0 * greatest(cos(radians(p_lat)), 0.05))) * 1e6)::int
    and m.surface_reelle_bati between p_surface_min and p_surface_max
    and m.date_mutation >= p_date_min
    -- Distance exacte sur les candidats de la boîte
    and st_dwithin(
      st_setsrid(st_makepoint(m.lon_e6 / 1e6, m.lat_e6 / 1e6), 4326)::geography,
      st_setsrid(st_makepoint(p_lon, p_lat), 4326)::geography,
      p_radius_m
    )
  order by distance_m
  limit 5000
$$;

-- ----------------------------------------------------------------------------
-- Comparables sur la commune entière (distance calculée vers le point saisi)
-- ----------------------------------------------------------------------------
create or replace function public.find_comparables_commune(
  p_lat double precision,
  p_lon double precision,
  p_code_insee text,
  p_type_local text,
  p_surface_min numeric,
  p_surface_max numeric,
  p_date_min date
)
returns table (
  prix_m2 numeric,
  surface_reelle_bati numeric,
  date_mutation date,
  distance_m double precision
)
language sql
stable
as $$
  select
    m.prix_m2::numeric,
    m.surface_reelle_bati::numeric,
    m.date_mutation,
    st_distance(
      st_setsrid(st_makepoint(m.lon_e6 / 1e6, m.lat_e6 / 1e6), 4326)::geography,
      st_setsrid(st_makepoint(p_lon, p_lat), 4326)::geography
    ) as distance_m
  from public.dvf_mutations m
  where m.code_insee collate "C" = p_code_insee
    and m.type_local = (case when p_type_local = 'appartement' then 'A' else 'M' end)::"char"
    and m.surface_reelle_bati between p_surface_min and p_surface_max
    and m.date_mutation >= p_date_min
  order by distance_m
  limit 5000
$$;

-- ----------------------------------------------------------------------------
-- Comparables sur le département entier (dernier palier avant fallback manuel)
-- Le département est le préfixe du code INSEE ('06', '2A', '974').
-- ----------------------------------------------------------------------------
create or replace function public.find_comparables_departement(
  p_lat double precision,
  p_lon double precision,
  p_code_departement text,
  p_type_local text,
  p_surface_min numeric,
  p_surface_max numeric,
  p_date_min date
)
returns table (
  prix_m2 numeric,
  surface_reelle_bati numeric,
  date_mutation date,
  distance_m double precision
)
language sql
stable
as $$
  select
    m.prix_m2::numeric,
    m.surface_reelle_bati::numeric,
    m.date_mutation,
    st_distance(
      st_setsrid(st_makepoint(m.lon_e6 / 1e6, m.lat_e6 / 1e6), 4326)::geography,
      st_setsrid(st_makepoint(p_lon, p_lat), 4326)::geography
    ) as distance_m
  from public.dvf_mutations m
  where m.code_insee collate "C" >= p_code_departement
    and m.code_insee collate "C" < (p_code_departement || '~')
    and m.type_local = (case when p_type_local = 'appartement' then 'A' else 'M' end)::"char"
    and m.surface_reelle_bati between p_surface_min and p_surface_max
    and m.date_mutation >= p_date_min
  order by distance_m
  limit 5000
$$;

-- ----------------------------------------------------------------------------
-- Recalcul de communes_stats : identique à la version initiale, seuls les
-- codes de type_local ('A'/'M') changent.
-- ----------------------------------------------------------------------------
create or replace function public.refresh_communes_stats()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  anchor date;
begin
  select max(date_mutation) into anchor from dvf_mutations;
  anchor := coalesce(anchor, date '1900-01-01');

  delete from communes_stats;

  insert into communes_stats (
    code_insee, nom_commune, slug, code_postal, departement,
    prix_m2_median_appartement, prix_m2_median_maison,
    nb_ventes_12m, evolution_1an_pct, updated_at
  )
  with stats as (
    select
      code_insee,
      percentile_cont(0.5) within group (order by prix_m2)
        filter (where type_local = 'A'
                  and date_mutation > anchor - interval '12 months') as p_appart,
      percentile_cont(0.5) within group (order by prix_m2)
        filter (where type_local = 'M'
                  and date_mutation > anchor - interval '12 months') as p_maison,
      count(*) filter (where date_mutation > anchor - interval '12 months') as nb12,
      percentile_cont(0.5) within group (order by prix_m2)
        filter (where date_mutation > anchor - interval '12 months') as median_last,
      percentile_cont(0.5) within group (order by prix_m2)
        filter (where date_mutation > anchor - interval '24 months'
                  and date_mutation <= anchor - interval '12 months') as median_prev
    from dvf_mutations
    group by code_insee
  ),
  rows_base as (
    select
      r.code_insee,
      r.nom_commune,
      r.code_postal,
      r.code_departement,
      s.p_appart,
      s.p_maison,
      coalesce(s.nb12, 0) as nb12,
      case
        when s.median_prev > 0 and s.median_last is not null
        then round(((s.median_last - s.median_prev) / s.median_prev * 100)::numeric, 1)
      end as evolution,
      public.slugify(r.nom_commune) || '-' || coalesce(r.code_postal, r.code_insee) as base_slug
    from communes_ref r
    left join stats s on s.code_insee = r.code_insee
    where s.code_insee is not null
       or exists (select 1 from loyers_communes l where l.code_insee = r.code_insee)
  )
  select
    code_insee,
    nom_commune,
    case
      when count(*) over (partition by base_slug) > 1
      then base_slug || '-' || code_insee
      else base_slug
    end as slug,
    code_postal,
    code_departement,
    round(p_appart::numeric, 0),
    round(p_maison::numeric, 0),
    nb12,
    evolution,
    now()
  from rows_base;
end;
$$;

-- ----------------------------------------------------------------------------
-- Révocation : aucune de ces fonctions n'est appelable via l'API publique
-- ----------------------------------------------------------------------------
revoke execute on function public.find_comparables_radius(double precision, double precision, text, numeric, numeric, date, double precision) from public, anon, authenticated;
revoke execute on function public.find_comparables_commune(double precision, double precision, text, text, numeric, numeric, date) from public, anon, authenticated;
revoke execute on function public.find_comparables_departement(double precision, double precision, text, text, numeric, numeric, date) from public, anon, authenticated;
revoke execute on function public.refresh_communes_stats() from public, anon, authenticated;
