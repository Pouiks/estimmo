-- Résumé par département pour le hub /prix-immobilier et les pages
-- /prix-immobilier/departement/[dept] (agrégats uniquement, licence DVF).
create or replace function public.departements_resume()
returns table (
  departement text,
  nb_communes bigint,
  nb_ventes_12m bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select departement, count(*), coalesce(sum(nb_ventes_12m), 0)
  from communes_stats
  group by departement
  order by departement
$$;

revoke execute on function public.departements_resume() from public, anon, authenticated;
