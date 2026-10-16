-- ============================================================================
-- ESTIMMO - index DVF avec colonnes de filtrage
--
-- Sur le plan gratuit (compute Nano, peu de cache), le coût des recherches
-- est dominé par les accès au heap pour des lignes ensuite rejetées par les
-- filtres surface/date (ex. Paris : 52 000 candidats pour 5 700 retenus).
-- En ajoutant surface et date dans les index, ces filtres sont évalués sur
-- l'entrée d'index : seules les lignes utiles sont lues sur le heap.
-- Les fonctions comparent désormais la surface en entier (pas de cast de la
-- colonne) pour que ces conditions deviennent des clés d'index.
-- ============================================================================

drop index if exists public.dvf_mutations_geo_idx;
drop index if exists public.dvf_mutations_insee_idx;

create index dvf_mutations_geo_idx
  on public.dvf_mutations (type_local, (lat_e6 / 50000), lon_e6, surface_reelle_bati, date_mutation);

create index dvf_mutations_insee_idx
  on public.dvf_mutations (code_insee collate "C", type_local, surface_reelle_bati, date_mutation);

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
    and (m.lat_e6 / 50000) between
          (round((p_lat - p_radius_m / 111320.0) * 1e6)::int / 50000)
      and (round((p_lat + p_radius_m / 111320.0) * 1e6)::int / 50000)
    and m.lon_e6 between
          round((p_lon - p_radius_m / (111320.0 * greatest(cos(radians(p_lat)), 0.05))) * 1e6)::int
      and round((p_lon + p_radius_m / (111320.0 * greatest(cos(radians(p_lat)), 0.05))) * 1e6)::int
    and m.surface_reelle_bati >= ceil(p_surface_min)::int
    and m.surface_reelle_bati <= floor(p_surface_max)::int
    and m.date_mutation >= p_date_min
    and st_dwithin(
      st_setsrid(st_makepoint(m.lon_e6 / 1e6, m.lat_e6 / 1e6), 4326)::geography,
      st_setsrid(st_makepoint(p_lon, p_lat), 4326)::geography,
      p_radius_m
    )
  order by distance_m
  limit 5000
$$;

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
    and m.surface_reelle_bati >= ceil(p_surface_min)::int
    and m.surface_reelle_bati <= floor(p_surface_max)::int
    and m.date_mutation >= p_date_min
  order by distance_m
  limit 5000
$$;

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
    and m.surface_reelle_bati >= ceil(p_surface_min)::int
    and m.surface_reelle_bati <= floor(p_surface_max)::int
    and m.date_mutation >= p_date_min
  order by distance_m
  limit 5000
$$;

revoke execute on function public.find_comparables_radius(double precision, double precision, text, numeric, numeric, date, double precision) from public, anon, authenticated;
revoke execute on function public.find_comparables_commune(double precision, double precision, text, text, numeric, numeric, date) from public, anon, authenticated;
revoke execute on function public.find_comparables_departement(double precision, double precision, text, text, numeric, numeric, date) from public, anon, authenticated;
