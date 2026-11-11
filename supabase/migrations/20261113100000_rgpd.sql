-- ============================================================================
-- RGPD (3.6.0) : droits des personnes et durées de conservation.
--
--   - leads.dernier_contact_le : point de départ de la durée de conservation
--     (3 ans, politique de confidentialité). Maintenu par trigger à chaque
--     changement de statut, de notes ou demande de rappel.
--   - leads.anonymise_le : lead anonymisé (identité et adresse effacées, le
--     reste conservé pour les statistiques). email/telephone deviennent nullables.
--   - demandes_rgpd : journal des demandes d'exercice des droits (accès,
--     effacement…), avec échéance de réponse (1 mois, art. 12.3 RGPD).
--   - purges_rgpd : trace de chaque passage de la purge automatique.
--   - anonymiser_leads(uuid[]) : anonymisation atomique (leads + file CRM).
--   - purger_rgpd(...) : purge quotidienne (cron /api/cron/rgpd).
--
-- Service_role seulement (RLS sans policy, revoke sur les fonctions).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- leads : dernier contact, anonymisation
-- ----------------------------------------------------------------------------
alter table public.leads
  add column if not exists dernier_contact_le timestamptz,
  add column if not exists anonymise_le timestamptz;

update public.leads
set dernier_contact_le = greatest(created_at, coalesce(demande_rappel_at, created_at))
where dernier_contact_le is null;

alter table public.leads
  alter column dernier_contact_le set default now(),
  alter column dernier_contact_le set not null,
  alter column email drop not null,
  alter column telephone drop not null;

create index if not exists leads_dernier_contact_idx
  on public.leads (dernier_contact_le)
  where anonymise_le is null;

-- Emails en minuscules (comme /api/leads désormais) : regroupement des demandes
-- d'un même prospect et recherche admin par égalité exacte.
update public.leads set email = lower(email) where email <> lower(email);

create index if not exists leads_email_idx on public.leads (email)
  where email is not null;

-- Tout contact commercial repousse la purge : changement de statut, note,
-- demande de rappel. L'anonymisation elle-même ne compte pas.
create or replace function public.leads_dernier_contact()
returns trigger
language plpgsql
as $$
begin
  if new.anonymise_le is null and (
       new.statut is distinct from old.statut
    or new.notes is distinct from old.notes
    or new.demande_rappel is distinct from old.demande_rappel
  ) then
    new.dernier_contact_le = now();
  end if;
  return new;
end;
$$;

drop trigger if exists leads_dernier_contact on public.leads;
create trigger leads_dernier_contact
  before update on public.leads
  for each row execute function public.leads_dernier_contact();

-- ----------------------------------------------------------------------------
-- Journal des demandes d'exercice des droits
-- ----------------------------------------------------------------------------
create table if not exists public.demandes_rgpd (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type text not null check (type in (
    'acces', 'rectification', 'effacement', 'opposition', 'portabilite', 'limitation'
  )),
  recue_le date not null default current_date,
  -- Email (ou téléphone) du demandeur tel que reçu : sert à retrouver la
  -- personne et à prouver la réponse. Conservé 5 ans puis purgé.
  demandeur text not null,
  leads uuid[] not null default '{}',
  echeance date not null,
  traitee_le timestamptz,
  action text check (action is null or action in (
    'export', 'anonymisation', 'suppression', 'rectification', 'refus', 'autre'
  )),
  reponse_envoyee boolean not null default false,
  -- Cases cochées par l'admin pour les copies hors base (CRM, Resend, boîte mail…).
  controles jsonb not null default '{}'::jsonb,
  notes text
);

create index if not exists demandes_rgpd_en_cours_idx
  on public.demandes_rgpd (echeance)
  where traitee_le is null;

alter table public.demandes_rgpd enable row level security;

-- ----------------------------------------------------------------------------
-- Trace des purges automatiques
-- ----------------------------------------------------------------------------
create table if not exists public.purges_rgpd (
  id bigserial primary key,
  executee_le timestamptz not null default now(),
  resultat jsonb not null
);

alter table public.purges_rgpd enable row level security;

-- ----------------------------------------------------------------------------
-- Anonymisation : identité, coordonnées, adresse et notes effacées ; bien,
-- estimation, statut, commune (code INSEE), source et dates conservés.
-- La file CRM suit : les envois déjà faits gardent un payload anonymisé, les
-- envois en attente sont abandonnés (le CRM ne recevra jamais ces données).
-- ----------------------------------------------------------------------------
create or replace function public.anonymiser_leads(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nb integer;
begin
  update public.leads
  set prenom = null,
      nom = null,
      email = null,
      telephone = null,
      adresse_libelle = null,
      lat = null,
      lon = null,
      notes = null,
      anonymise_le = now()
  where id = any(p_ids)
    and anonymise_le is null;
  get diagnostics v_nb = row_count;

  delete from public.crm_sync_queue
  where lead_id = any(p_ids) and status <> 'sent';

  update public.crm_sync_queue
  set payload = payload
    || jsonb_build_object(
         'contact', jsonb_build_object(
           'prenom', '', 'nom', '', 'email', '', 'telephone', '',
           'consentement_rgpd', payload->'contact'->'consentement_rgpd',
           'date_consentement', payload->'contact'->'date_consentement'
         ),
         'bien', coalesce(payload->'bien', '{}'::jsonb)
           || jsonb_build_object(
                'adresse', jsonb_build_object(
                  'libelle', '',
                  'code_insee', payload->'bien'->'adresse'->'code_insee',
                  'lat', null, 'lon', null
                )
              )
       )
  where lead_id = any(p_ids);

  return v_nb;
end;
$$;

revoke execute on function public.anonymiser_leads(uuid[]) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Purge quotidienne. Les prospects devenus clients (mandat signé) relèvent du
-- dossier de transaction, hors de cette purge.
-- ----------------------------------------------------------------------------
create or replace function public.purger_rgpd(
  p_conservation interval default interval '3 years',
  p_evenements interval default interval '25 months',
  p_journal interval default interval '5 years'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
  v_leads integer := 0;
  v_evenements integer;
  v_demandes integer;
  v_resultat jsonb;
begin
  select coalesce(array_agg(id), '{}')
  into v_ids
  from public.leads
  where anonymise_le is null
    and dernier_contact_le < now() - p_conservation
    and statut not in ('mandat_simple', 'mandat_exclusif');

  if cardinality(v_ids) > 0 then
    v_leads := public.anonymiser_leads(v_ids);
  end if;

  delete from public.form_events where created_at < now() - p_evenements;
  get diagnostics v_evenements = row_count;

  delete from public.demandes_rgpd
  where traitee_le is not null and traitee_le < now() - p_journal;
  get diagnostics v_demandes = row_count;

  v_resultat := jsonb_build_object(
    'leads_anonymises', v_leads,
    'evenements_supprimes', v_evenements,
    'demandes_supprimees', v_demandes,
    'conservation', p_conservation::text
  );

  insert into public.purges_rgpd (resultat) values (v_resultat);
  return v_resultat;
end;
$$;

revoke execute on function public.purger_rgpd(interval, interval, interval)
  from public, anon, authenticated;
