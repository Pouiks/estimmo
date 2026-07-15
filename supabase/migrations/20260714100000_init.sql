-- ============================================================================
-- ESTIMMO - schéma initial
--
-- Sécurité : RLS activé sur TOUTES les tables. Aucune policy publique sur les
-- tables métier → seules les requêtes service_role (côté serveur) y accèdent.
-- Exception : profiles (un utilisateur authentifié lit son propre profil).
-- Contrainte légale DVF : les mutations individuelles ne sont JAMAIS exposées
-- publiquement (pas de policy anon, fonctions RPC révoquées pour anon).
-- ============================================================================

create extension if not exists postgis;
create extension if not exists unaccent;

-- ----------------------------------------------------------------------------
-- Transactions DVF nettoyées (import semestriel - scripts/import-dvf.ts)
-- ----------------------------------------------------------------------------
create table dvf_mutations (
  id bigserial primary key,
  date_mutation date not null,
  valeur_fonciere numeric not null,
  type_local text not null check (type_local in ('appartement', 'maison')),
  surface_reelle_bati numeric not null,
  nb_pieces int,
  code_insee text not null,
  code_departement text not null,
  code_postal text,
  geom geometry(Point, 4326) not null,
  prix_m2 numeric generated always as (valeur_fonciere / nullif(surface_reelle_bati, 0)) stored
);

-- Index géographique fonctionnel : les recherches de comparables utilisent
-- ST_DWithin sur geography (distances exactes en mètres).
create index dvf_mutations_geog_idx on dvf_mutations using gist ((geom::geography));
create index dvf_mutations_insee_idx on dvf_mutations (code_insee, type_local, date_mutation);
create index dvf_mutations_dept_idx on dvf_mutations (code_departement, type_local, date_mutation);

-- ----------------------------------------------------------------------------
-- Référentiel communes (alimenté par les scripts d'import DVF + ANIL)
-- ----------------------------------------------------------------------------
create table communes_ref (
  code_insee text primary key,
  nom_commune text not null,
  code_postal text,
  code_departement text not null
);

-- ----------------------------------------------------------------------------
-- Indicateurs de loyers ANIL (import annuel - scripts/import-loyers.ts)
-- Mention légale obligatoire à chaque affichage :
-- « Estimations ANIL, à partir des données du Groupe SeLoger et de leboncoin »
-- ----------------------------------------------------------------------------
create table loyers_communes (
  code_insee text primary key,
  loyer_m2_appartement numeric,
  loyer_m2_appt_t1_t2 numeric,
  loyer_m2_appt_t3_plus numeric,
  loyer_m2_maison numeric,
  millesime int not null
);

-- ----------------------------------------------------------------------------
-- Stats agrégées par commune (pré-calculées → pages SEO /prix-immobilier/[slug])
-- Uniquement des agrégats : conforme à la licence DVF (pas de ré-identification).
-- ----------------------------------------------------------------------------
create table communes_stats (
  code_insee text primary key,
  nom_commune text not null,
  slug text unique not null,
  code_postal text,
  departement text not null,
  prix_m2_median_appartement numeric,
  prix_m2_median_maison numeric,
  nb_ventes_12m int not null default 0,
  evolution_1an_pct numeric,
  updated_at timestamptz not null default now()
);

create index communes_stats_dept_idx on communes_stats (departement);
create index communes_stats_volume_idx on communes_stats (nb_ventes_12m desc);

-- ----------------------------------------------------------------------------
-- Leads
-- annee_construction est stockée en texte : le formulaire propose des tranches
-- ('avant_1950', '1950_1975', '1975_2000', '2000_2012', 'apres_2012').
-- ----------------------------------------------------------------------------
create table leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- contact
  prenom text,
  nom text,
  email text not null,
  telephone text not null,
  consentement_rgpd boolean not null,
  date_consentement timestamptz not null,
  -- projet & bien
  projet text not null check (projet in ('vente', 'location')),
  horizon text check (horizon in ('en_vente', 'moins_3_mois', '3_6_mois', 'curiosite')),
  type_bien text not null check (type_bien in ('appartement', 'maison')),
  adresse_libelle text,
  code_insee text,
  lat double precision,
  lon double precision,
  surface numeric not null,
  surface_type text check (surface_type in ('carrez', 'habitable')),
  pieces int,
  chambres int,
  etage int,
  ascenseur boolean,
  surface_terrain numeric,
  annee_construction text,
  exterieur text[] not null default '{}',
  stationnement text,
  etat_general text,
  age_cuisine text,
  age_sdb text,
  dpe text,
  atouts text[] not null default '{}',
  -- estimation (fourchette, prix_m2_zone, nb_comparables, rayon_m, confiance…)
  estimation jsonb,
  estimation_manuelle boolean not null default false,
  score_lead int,
  -- suivi commercial
  statut text not null default 'nouveau'
    check (statut in ('nouveau', 'appele', 'rdv', 'mandat_simple', 'mandat_exclusif', 'perdu')),
  notes text,
  -- marketing
  utm jsonb not null default '{}'::jsonb
);

create index leads_created_idx on leads (created_at desc);
create index leads_statut_idx on leads (statut);
create index leads_score_idx on leads (score_lead desc nulls last);
create index leads_manuelle_idx on leads (created_at desc) where estimation_manuelle;

-- ----------------------------------------------------------------------------
-- File de synchronisation CRM (jamais perdre un lead)
-- ----------------------------------------------------------------------------
create table crm_sync_queue (
  id bigserial primary key,
  lead_id uuid references leads(id) on delete cascade,
  payload jsonb not null,
  idempotency_key uuid not null default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts int not null default 0,
  last_error text,
  next_retry_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index crm_sync_queue_pending_idx on crm_sync_queue (next_retry_at) where status = 'pending';
create index crm_sync_queue_lead_idx on crm_sync_queue (lead_id);

-- ----------------------------------------------------------------------------
-- Blog (contenu TipTap en JSON)
-- ----------------------------------------------------------------------------
create table articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  titre text not null,
  meta_description text,
  contenu jsonb not null,
  image_cover text,
  statut text default 'brouillon' check (statut in ('brouillon', 'publie')),
  published_at timestamptz,
  updated_at timestamptz not null default now()
);

create index articles_publies_idx on articles (published_at desc) where statut = 'publie';

-- ----------------------------------------------------------------------------
-- Profils admin (liés à Supabase Auth)
-- ----------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Événements du formulaire (suivi du taux d'abandon par étape)
-- ----------------------------------------------------------------------------
create table form_events (
  id bigserial primary key,
  session_id uuid not null,
  step smallint not null,
  event text not null check (event in ('view', 'complete', 'submit')),
  created_at timestamptz not null default now()
);

create index form_events_created_idx on form_events (created_at);
create index form_events_session_idx on form_events (session_id);

-- ----------------------------------------------------------------------------
-- Trigger updated_at
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger articles_set_updated_at
  before update on articles
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS : tout verrouillé par défaut (service_role uniquement),
-- sauf lecture de son propre profil pour les utilisateurs authentifiés.
-- ----------------------------------------------------------------------------
alter table dvf_mutations enable row level security;
alter table communes_ref enable row level security;
alter table loyers_communes enable row level security;
alter table communes_stats enable row level security;
alter table leads enable row level security;
alter table crm_sync_queue enable row level security;
alter table articles enable row level security;
alter table profiles enable row level security;
alter table form_events enable row level security;

create policy "profiles_select_own"
  on profiles for select
  to authenticated
  using (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- Bucket Storage public pour les images du blog
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('blog', 'blog', true)
on conflict (id) do nothing;
