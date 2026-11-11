-- ============================================================================
-- ESTIMMO 3.0.0 - date de la dernière vente DVF connue (audit P2)
--
-- La fenêtre de 30 mois des comparables était comptée depuis la date du jour
-- alors que DVF est publié avec 6 à 10 mois de retard : la fenêtre réellement
-- couverte tombait à 19 mois. Elle est désormais ancrée sur la dernière vente
-- présente en base, lue ici sans parcourir la table (pas d'index sur
-- date_mutation : la valeur est posée par l'import dans dvf_meta).
-- ============================================================================

create table if not exists public.dvf_meta (
  cle text primary key,
  valeur text not null,
  updated_at timestamptz not null default now()
);

alter table public.dvf_meta enable row level security;

insert into public.dvf_meta (cle, valeur)
select 'derniere_vente', max(date_mutation)::text
from public.dvf_mutations
where exists (select 1 from public.dvf_mutations)
on conflict (cle) do update set valeur = excluded.valeur, updated_at = now();

create or replace function public.dvf_derniere_vente()
returns date
language sql
stable
as $$
  select valeur::date from public.dvf_meta where cle = 'derniere_vente'
$$;

revoke execute on function public.dvf_derniere_vente() from public, anon, authenticated;
