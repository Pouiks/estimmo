-- ============================================================================
-- ESTIMMO 3.0.2 - date de modification réelle des pages communes (SEO)
--
-- `updated_at` est l'heure du dernier recalcul, identique sur les 34 916
-- communes et changée à chaque import : utilisée comme <lastmod> du sitemap,
-- elle ne dit rien à Google (qui finit par l'ignorer). `contenu_modifie_le`
-- ne bouge que lorsque les chiffres de la commune changent réellement.
--
-- refresh_communes_stats() ne vide plus la table : il fusionne (mise à jour
-- des lignes dont les valeurs diffèrent, insertion des nouvelles, suppression
-- des disparues).
-- ============================================================================

alter table public.communes_stats
  add column if not exists contenu_modifie_le timestamptz not null default now();

update public.communes_stats set contenu_modifie_le = updated_at;

create index if not exists communes_stats_dept_modifie_idx
  on public.communes_stats (departement, contenu_modifie_le desc);

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
    code_departement as departement,
    round(p_appart::numeric, 0) as prix_m2_median_appartement,
    round(p_maison::numeric, 0) as prix_m2_median_maison,
    nb12 as nb_ventes_12m,
    evolution as evolution_1an_pct
  from rows_base;

  -- Communes disparues ou dont le slug change (nouvelle URL = nouvelle page).
  delete from communes_stats c
  where not exists (
    select 1 from nouvelles n where n.code_insee = c.code_insee and n.slug = c.slug
  );

  insert into communes_stats (
    code_insee, nom_commune, slug, code_postal, departement,
    prix_m2_median_appartement, prix_m2_median_maison,
    nb_ventes_12m, evolution_1an_pct, updated_at, contenu_modifie_le
  )
  select
    code_insee, nom_commune, slug, code_postal, departement,
    prix_m2_median_appartement, prix_m2_median_maison,
    nb_ventes_12m, evolution_1an_pct, now(), now()
  from nouvelles
  on conflict (code_insee) do update set
    nom_commune = excluded.nom_commune,
    code_postal = excluded.code_postal,
    departement = excluded.departement,
    prix_m2_median_appartement = excluded.prix_m2_median_appartement,
    prix_m2_median_maison = excluded.prix_m2_median_maison,
    nb_ventes_12m = excluded.nb_ventes_12m,
    evolution_1an_pct = excluded.evolution_1an_pct,
    updated_at = now(),
    contenu_modifie_le = case
      when (communes_stats.nom_commune, communes_stats.code_postal,
            communes_stats.prix_m2_median_appartement, communes_stats.prix_m2_median_maison,
            communes_stats.nb_ventes_12m, communes_stats.evolution_1an_pct)
           is distinct from
           (excluded.nom_commune, excluded.code_postal,
            excluded.prix_m2_median_appartement, excluded.prix_m2_median_maison,
            excluded.nb_ventes_12m, excluded.evolution_1an_pct)
      then now()
      else communes_stats.contenu_modifie_le
    end;
end;
$$;

revoke execute on function public.refresh_communes_stats() from public, anon, authenticated;
