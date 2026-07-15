-- KPIs nationaux du barometre (page /barometre-immobilier).
-- Retourne des agregats uniquement : conforme licence DVF.
create or replace function public.barometre_kpis()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'nb_communes', (select count(*) from communes_stats),
    'nb_ventes_12m', (select coalesce(sum(nb_ventes_12m), 0) from communes_stats),
    'updated_at', (select max(updated_at) from communes_stats)
  )
$$;

revoke execute on function public.barometre_kpis() from public, anon, authenticated;
