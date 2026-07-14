-- ============================================================================
-- ESTIMMO — fonctions SQL
--   * recherche de comparables DVF (rayon / commune / département)
--   * recalcul des stats agrégées par commune
--
-- Ces fonctions retournent des mutations individuelles : leur exécution est
-- RÉVOQUÉE pour anon/authenticated (licence DGFiP — pas d'exposition publique).
-- Seul le service_role (côté serveur) peut les appeler.
-- ============================================================================

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
    m.prix_m2,
    m.surface_reelle_bati,
    m.date_mutation,
    st_distance(
      m.geom::geography,
      st_setsrid(st_makepoint(p_lon, p_lat), 4326)::geography
    ) as distance_m
  from dvf_mutations m
  where m.type_local = p_type_local
    and m.surface_reelle_bati between p_surface_min and p_surface_max
    and m.date_mutation >= p_date_min
    and st_dwithin(
      m.geom::geography,
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
    m.prix_m2,
    m.surface_reelle_bati,
    m.date_mutation,
    st_distance(
      m.geom::geography,
      st_setsrid(st_makepoint(p_lon, p_lat), 4326)::geography
    ) as distance_m
  from dvf_mutations m
  where m.code_insee = p_code_insee
    and m.type_local = p_type_local
    and m.surface_reelle_bati between p_surface_min and p_surface_max
    and m.date_mutation >= p_date_min
  order by distance_m
  limit 5000
$$;

-- ----------------------------------------------------------------------------
-- Comparables sur le département entier (dernier palier avant fallback manuel)
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
    m.prix_m2,
    m.surface_reelle_bati,
    m.date_mutation,
    st_distance(
      m.geom::geography,
      st_setsrid(st_makepoint(p_lon, p_lat), 4326)::geography
    ) as distance_m
  from dvf_mutations m
  where m.code_departement = p_code_departement
    and m.type_local = p_type_local
    and m.surface_reelle_bati between p_surface_min and p_surface_max
    and m.date_mutation >= p_date_min
  order by distance_m
  limit 5000
$$;

-- ----------------------------------------------------------------------------
-- Slugify (URL-safe, sans accents) : "Saint-Étienne" → "saint-etienne"
-- ----------------------------------------------------------------------------
create or replace function public.slugify(t text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(unaccent(t)), '[^a-z0-9]+', '-', 'g'))
$$;

-- ----------------------------------------------------------------------------
-- Recalcul complet de communes_stats.
--   * médianes de prix/m² sur les 12 derniers mois de données disponibles
--     (ancrées sur max(date_mutation) — DVF est publié avec ~6 mois de retard)
--   * évolution : médiane 12 derniers mois vs les 12 mois précédents
--   * slug : nom-commune + code postal (ex. nice-06000), désambiguïsé par
--     code INSEE en cas d'homonymie
--   * inclut aussi les communes sans ventes DVF mais couvertes par l'ANIL
--     (ex. Alsace-Moselle) → page loyers uniquement
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
        filter (where type_local = 'appartement'
                  and date_mutation > anchor - interval '12 months') as p_appart,
      percentile_cont(0.5) within group (order by prix_m2)
        filter (where type_local = 'maison'
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
