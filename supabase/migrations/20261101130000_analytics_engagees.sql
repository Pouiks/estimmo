-- ============================================================================
-- Analytics du formulaire : une session « engagée » a touché ou renseigné un
-- champ OU a validé au moins une étape. Les sessions antérieures au 01/11/2026
-- n'ont pas d'événements de champ : sans ce second critère, une session
-- arrivée à l'étape 2 comptait comme « non engagée », ce qui contredisait
-- l'entonnoir. Définition courante de la fonction (remplace celle de
-- 20261101120000_analytics_formulaire.sql).
-- ============================================================================
create or replace function public.analytics_formulaire(
  p_depuis timestamptz,
  p_jusqua timestamptz,
  p_appareil text default null,
  p_locale text default null,
  p_page text default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with ev as materialized (
  select id, session_id, step, event, champ, valeur, appareil, locale, page,
         ecoule_ms, created_at
  from form_events
  where created_at >= p_depuis
    and created_at < p_jusqua
    and (p_appareil is null or appareil = p_appareil)
    and (p_locale is null or locale = p_locale)
    and (p_page is null or page = p_page)
),
sessions as (
  select session_id,
         bool_or(event = 'submit') as soumis,
         coalesce(max(step) filter (where event = 'view'), 1)::int as etape_max,
         min(created_at) as debut,
         max(appareil) as appareil,
         max(locale) as locale,
         max(page) as page
  from ev
  group by session_id
),
-- Une session non soumise s'est arrêtée sur la dernière étape affichée.
abandons as (
  select session_id, etape_max as step
  from sessions
  where not soumis and etape_max between 1 and 4
),
-- Durée d'une étape : premier affichage → première validation.
durees as (
  select session_id, step,
         min(ecoule_ms) filter (where event = 'view') as t_vue,
         min(ecoule_ms) filter (where event = 'complete') as t_fin
  from ev
  where event in ('view', 'complete')
  group by session_id, step
),
etapes as (
  select s.etape,
         count(distinct e.session_id) filter (where e.event = 'view') as vues,
         count(distinct e.session_id) filter (where e.event = 'complete') as completees,
         count(distinct e.session_id) filter (where e.event = 'retour') as retours,
         count(*) filter (where e.event = 'erreur') as erreurs,
         count(distinct e.session_id) filter (where e.event = 'erreur') as sessions_erreur,
         count(distinct e.session_id) filter (where e.event = 'sortie') as sorties,
         (select count(*) from abandons a where a.step = s.etape) as abandons,
         (select percentile_cont(0.5) within group (order by d.t_fin - d.t_vue)
            from durees d
           where d.step = s.etape
             and d.t_vue is not null
             and d.t_fin is not null
             and d.t_fin >= d.t_vue) as duree_mediane_ms
  from generate_series(1, 5) as s(etape)
  left join ev e on e.step = s.etape
  group by s.etape
),
champs as (
  select step, champ,
         count(distinct session_id) filter (where event = 'focus') as touches,
         count(distinct session_id) filter (where event = 'saisie') as renseignes,
         count(*) filter (where event = 'erreur') as erreurs,
         count(distinct session_id) filter (where event = 'erreur') as sessions_erreur
  from ev
  where champ is not null and event in ('focus', 'saisie', 'erreur')
  group by step, champ
),
-- Dernier champ touché sur l'étape d'abandon (null : aucune interaction).
dernier_champ as (
  select distinct on (a.session_id) a.session_id, a.step, e.champ
  from abandons a
  left join ev e
    on e.session_id = a.session_id
   and e.step = a.step
   and e.champ is not null
   and e.event in ('focus', 'saisie', 'erreur')
  order by a.session_id, e.ecoule_ms desc nulls last, e.id desc nulls last
),
derniers as (
  select step, champ, count(*) as n
  from dernier_champ
  group by step, champ
),
-- Dernière valeur choisie par session et par champ (les champs multiples
-- sont stockés « a,b,c » et éclatés ici).
valeurs_finales as (
  select distinct on (session_id, champ) session_id, champ, valeur
  from ev
  where event = 'saisie' and valeur is not null
  order by session_id, champ, ecoule_ms desc nulls last, id desc
),
valeurs as (
  select vf.champ, v.valeur, count(*) as n
  from valeurs_finales vf
  cross join lateral unnest(string_to_array(vf.valeur, ',')) as v(valeur)
  group by vf.champ, v.valeur
),
jours as (
  select (debut at time zone 'Europe/Paris')::date as jour,
         count(*) as sessions,
         count(*) filter (where soumis) as soumissions
  from sessions
  group by 1
),
segments as (
  select d.dimension, d.valeur,
         count(*) as sessions,
         count(*) filter (where s.soumis) as soumissions
  from sessions s
  cross join lateral (values
    ('appareil', coalesce(s.appareil, 'inconnu')),
    ('locale', coalesce(s.locale, 'inconnu')),
    ('page', coalesce(s.page, 'inconnu'))
  ) as d(dimension, valeur)
  group by d.dimension, d.valeur
)
select jsonb_build_object(
  'sessions', (select count(*) from sessions),
  -- Le formulaire est dans le hero de l'accueil : une session « engagée »
  -- a touché ou renseigné un champ, ou validé une étape (les autres n'ont
  -- fait que voir la page).
  'engagees', (
    select count(distinct session_id) from ev
    where event in ('focus', 'saisie', 'erreur', 'complete', 'submit') or step >= 2
  ),
  'soumissions', (select count(*) filter (where soumis) from sessions),
  'duree_mediane_ms', (
    select percentile_cont(0.5) within group (order by ecoule_ms)
    from ev where event = 'submit' and ecoule_ms is not null
  ),
  'etapes', (select coalesce(jsonb_agg(to_jsonb(t) order by t.etape), '[]'::jsonb) from etapes t),
  'champs', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from champs t),
  'derniers', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from derniers t),
  'valeurs', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from valeurs t),
  'jours', (select coalesce(jsonb_agg(to_jsonb(t) order by t.jour), '[]'::jsonb) from jours t),
  'segments', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from segments t)
)
$$;

revoke execute on function public.analytics_formulaire(timestamptz, timestamptz, text, text, text)
  from public, anon, authenticated;
