-- ============================================================================
-- ESTIMMO 3.1.0 - contexte des pages communes (SEO, phase 2)
--
-- Chaque page commune doit porter des informations propres à la commune :
--   * communes_geo            centre et population (geo.api.gouv.fr, INSEE)
--   * communes_insee          logements, propriétaires, maisons/appartements
--                             (recensement INSEE, base « Logement »)
--   * communes_stats_annuelles médiane et volume par année civile et par type
--                             (DVF 2021 → aujourd'hui, agrégés à l'import sans
--                             stocker les mutations : plan Supabase gratuit)
--   * departements_stats      médianes départementales (comparaison)
--   * communes_stats          + ventes et médianes sur 36 mois (seuil de
--                             qualité : une commune à moins de 10 ventes par an
--                             mais au moins 30 sur 3 ans garde une page chiffrée)
--   * commune_contexte()      tout le contexte d'une commune en un appel
--                             (5 à 10 communes les plus proches à vol d'oiseau)
-- Uniquement des agrégats (licence DVF). Service_role seulement (RLS, revoke).
-- ============================================================================

create table if not exists public.communes_geo (
  code_insee text primary key,
  lat double precision not null,
  lon double precision not null,
  population integer,
  code_region text,
  updated_at timestamptz not null default now()
);
create index if not exists communes_geo_lat_idx on public.communes_geo (lat);
alter table public.communes_geo enable row level security;

create table if not exists public.communes_insee (
  code_insee text primary key,
  millesime smallint not null,
  logements integer,
  residences_principales integer,
  rp_proprietaires integer,
  maisons integer,
  appartements integer,
  updated_at timestamptz not null default now()
);
alter table public.communes_insee enable row level security;

create table if not exists public.communes_stats_annuelles (
  code_insee text not null,
  annee smallint not null,
  type_local "char" not null,
  nb_ventes integer not null,
  prix_m2_median real,
  primary key (code_insee, annee, type_local)
);
alter table public.communes_stats_annuelles enable row level security;

create table if not exists public.departements_stats (
  departement text primary key,
  prix_m2_median_appartement numeric,
  prix_m2_median_maison numeric,
  nb_ventes_12m integer not null default 0,
  evolution_1an_pct numeric,
  updated_at timestamptz not null default now()
);
alter table public.departements_stats enable row level security;

alter table public.communes_stats
  add column if not exists nb_ventes_36m integer not null default 0,
  add column if not exists prix_m2_median_36m_appartement numeric,
  add column if not exists prix_m2_median_36m_maison numeric;

-- ----------------------------------------------------------------------------
-- Médianes départementales (12 derniers mois de données, comme les communes).
-- ----------------------------------------------------------------------------
create or replace function public.refresh_departements_stats()
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

  delete from departements_stats;

  insert into departements_stats (
    departement, prix_m2_median_appartement, prix_m2_median_maison,
    nb_ventes_12m, evolution_1an_pct, updated_at
  )
  with stats as (
    select
      r.code_departement as departement,
      percentile_cont(0.5) within group (order by m.prix_m2)
        filter (where m.type_local = 'A'
                  and m.date_mutation > anchor - interval '12 months') as p_appart,
      percentile_cont(0.5) within group (order by m.prix_m2)
        filter (where m.type_local = 'M'
                  and m.date_mutation > anchor - interval '12 months') as p_maison,
      count(*) filter (where m.date_mutation > anchor - interval '12 months') as nb12,
      percentile_cont(0.5) within group (order by m.prix_m2)
        filter (where m.date_mutation > anchor - interval '12 months') as median_last,
      percentile_cont(0.5) within group (order by m.prix_m2)
        filter (where m.date_mutation > anchor - interval '24 months'
                  and m.date_mutation <= anchor - interval '12 months') as median_prev
    from dvf_mutations m
    join communes_ref r on r.code_insee = m.code_insee
    group by r.code_departement
  )
  select
    departement,
    round(p_appart::numeric, 0),
    round(p_maison::numeric, 0),
    nb12,
    case
      when median_prev > 0 and median_last is not null
      then round(((median_last - median_prev) / median_prev * 100)::numeric, 1)
    end,
    now()
  from stats;
end;
$$;

revoke execute on function public.refresh_departements_stats() from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Recalcul des communes : ajoute les agrégats sur 36 mois et enchaîne sur les
-- départements. Fusion (contenu_modifie_le ne bouge que si les chiffres changent).
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

  create temporary table nouvelles on commit drop as
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
        filter (where type_local = 'A'
                  and date_mutation > anchor - interval '36 months') as p36_appart,
      percentile_cont(0.5) within group (order by prix_m2)
        filter (where type_local = 'M'
                  and date_mutation > anchor - interval '36 months') as p36_maison,
      count(*) filter (where date_mutation > anchor - interval '36 months') as nb36,
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
      s.p36_appart,
      s.p36_maison,
      coalesce(s.nb36, 0) as nb36,
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
    code_departement as departement,
    round(p_appart::numeric, 0) as prix_m2_median_appartement,
    round(p_maison::numeric, 0) as prix_m2_median_maison,
    nb12 as nb_ventes_12m,
    evolution as evolution_1an_pct,
    nb36 as nb_ventes_36m,
    round(p36_appart::numeric, 0) as prix_m2_median_36m_appartement,
    round(p36_maison::numeric, 0) as prix_m2_median_36m_maison
  from rows_base;

  -- Communes disparues ou dont le slug change (nouvelle URL = nouvelle page).
  delete from communes_stats c
  where not exists (
    select 1 from nouvelles n where n.code_insee = c.code_insee and n.slug = c.slug
  );

  insert into communes_stats (
    code_insee, nom_commune, slug, code_postal, departement,
    prix_m2_median_appartement, prix_m2_median_maison,
    nb_ventes_12m, evolution_1an_pct,
    nb_ventes_36m, prix_m2_median_36m_appartement, prix_m2_median_36m_maison,
    updated_at, contenu_modifie_le
  )
  select
    code_insee, nom_commune, slug, code_postal, departement,
    prix_m2_median_appartement, prix_m2_median_maison,
    nb_ventes_12m, evolution_1an_pct,
    nb_ventes_36m, prix_m2_median_36m_appartement, prix_m2_median_36m_maison,
    now(), now()
  from nouvelles
  on conflict (code_insee) do update set
    nom_commune = excluded.nom_commune,
    code_postal = excluded.code_postal,
    departement = excluded.departement,
    prix_m2_median_appartement = excluded.prix_m2_median_appartement,
    prix_m2_median_maison = excluded.prix_m2_median_maison,
    nb_ventes_12m = excluded.nb_ventes_12m,
    evolution_1an_pct = excluded.evolution_1an_pct,
    nb_ventes_36m = excluded.nb_ventes_36m,
    prix_m2_median_36m_appartement = excluded.prix_m2_median_36m_appartement,
    prix_m2_median_36m_maison = excluded.prix_m2_median_36m_maison,
    updated_at = now(),
    contenu_modifie_le = case
      when (communes_stats.nom_commune, communes_stats.code_postal,
            communes_stats.prix_m2_median_appartement, communes_stats.prix_m2_median_maison,
            communes_stats.nb_ventes_12m, communes_stats.evolution_1an_pct,
            communes_stats.nb_ventes_36m, communes_stats.prix_m2_median_36m_appartement,
            communes_stats.prix_m2_median_36m_maison)
           is distinct from
           (excluded.nom_commune, excluded.code_postal,
            excluded.prix_m2_median_appartement, excluded.prix_m2_median_maison,
            excluded.nb_ventes_12m, excluded.evolution_1an_pct,
            excluded.nb_ventes_36m, excluded.prix_m2_median_36m_appartement,
            excluded.prix_m2_median_36m_maison)
      then now()
      else communes_stats.contenu_modifie_le
    end;

  perform public.refresh_departements_stats();
end;
$$;

revoke execute on function public.refresh_communes_stats() from public, anon, authenticated;

-- Remplit immédiatement les nouvelles colonnes (sans attendre le prochain import).
-- contenu_modifie_le n'est pas touché : les chiffres existants ne changent pas,
-- les nouveaux agrégats datent du gabarit (GABARIT_COMMUNE_MODIFIE_LE).
do $$
declare
  anchor date;
begin
  select max(date_mutation) into anchor from dvf_mutations;
  if anchor is null then return; end if;
  update communes_stats c set
    nb_ventes_36m = s.nb36,
    prix_m2_median_36m_appartement = round(s.p36_appart::numeric, 0),
    prix_m2_median_36m_maison = round(s.p36_maison::numeric, 0)
  from (
    select
      code_insee,
      count(*) filter (where date_mutation > anchor - interval '36 months') as nb36,
      percentile_cont(0.5) within group (order by prix_m2)
        filter (where type_local = 'A' and date_mutation > anchor - interval '36 months') as p36_appart,
      percentile_cont(0.5) within group (order by prix_m2)
        filter (where type_local = 'M' and date_mutation > anchor - interval '36 months') as p36_maison
    from dvf_mutations
    group by code_insee
  ) s
  where s.code_insee = c.code_insee;
end;
$$;

select public.refresh_departements_stats();

-- ----------------------------------------------------------------------------
-- Contexte complet d'une commune : géographie, INSEE, département, communes
-- les plus proches (à vol d'oiseau, parmi celles qui ont une page), séries
-- annuelles, date de la dernière vente DVF connue.
-- ----------------------------------------------------------------------------
create or replace function public.commune_contexte(p_code_insee text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with moi as (
    select lat, lon from communes_geo where code_insee = p_code_insee
  ),
  voisines as (
    select
      s.code_insee, s.nom_commune, s.slug, s.code_postal, s.departement,
      s.prix_m2_median_appartement, s.prix_m2_median_maison,
      s.nb_ventes_12m, s.nb_ventes_36m,
      s.prix_m2_median_36m_appartement, s.prix_m2_median_36m_maison,
      round(sqrt(
        power((g.lat - moi.lat) * 111.2, 2)
        + power((g.lon - moi.lon) * 111.2 * cos(radians(moi.lat)), 2)
      )::numeric, 1) as distance_km
    from communes_geo g
    join communes_stats s on s.code_insee = g.code_insee
    cross join moi
    where g.code_insee <> p_code_insee
      and g.lat between moi.lat - 0.6 and moi.lat + 0.6
      and g.lon between moi.lon - 0.8 and moi.lon + 0.8
    order by distance_km
    limit 10
  )
  select jsonb_build_object(
    'geo', (select to_jsonb(g) - 'updated_at' from communes_geo g where g.code_insee = p_code_insee),
    'insee', (select to_jsonb(i) - 'updated_at' from communes_insee i where i.code_insee = p_code_insee),
    'departement', (
      select to_jsonb(d) - 'updated_at'
      from departements_stats d
      where d.departement = (select departement from communes_stats where code_insee = p_code_insee)
    ),
    'voisines', (select coalesce(jsonb_agg(to_jsonb(v) order by v.distance_km), '[]'::jsonb) from voisines v),
    'annuelles', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'annee', annee, 'type_local', type_local::text,
        'nb_ventes', nb_ventes, 'prix_m2_median', prix_m2_median
      ) order by annee, type_local), '[]'::jsonb)
      from communes_stats_annuelles where code_insee = p_code_insee
    ),
    'derniere_vente', (select valeur from dvf_meta where cle = 'derniere_vente')
  )
$$;

revoke execute on function public.commune_contexte(text) from public, anon, authenticated;
