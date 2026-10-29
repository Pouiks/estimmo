-- Versions linguistiques intégrées : un article porte sa version française
-- (colonnes de base) et ses traductions dans `traductions` (jsonb, clé = locale :
-- { titre, meta_title, meta_description, extrait, contenu_html, faq,
--   image_cover_alt, statut 'brouillon' | 'publie' }). Même slug dans toutes les
-- langues. Remplace le modèle « article anglais séparé relié par traduction_de ».
--
-- Étape 1/2, compatible avec le code encore déployé (qui lit `lang` et
-- `traduction_de`) : les anciennes colonnes sont conservées ; après fusion, toutes
-- les lignes restantes sont `lang = 'fr'`. Leur suppression est l'étape 2
-- (20261029130000_articles_traductions_nettoyage.sql), appliquée une fois le
-- nouveau code en production.

alter table public.articles
  add column if not exists traductions jsonb not null default '{}'::jsonb;
alter table public.articles drop constraint if exists articles_traductions_objet;
alter table public.articles add constraint articles_traductions_objet
  check (jsonb_typeof(traductions) = 'object');

-- Garde-fou : un article anglais sans original ne peut pas être fusionné.
do $$
begin
  if exists (select 1 from public.articles where lang = 'en' and traduction_de is null) then
    raise exception 'Article anglais sans original (traduction_de null) : à rattacher ou supprimer avant migration';
  end if;
end
$$;

-- Versions anglaises existantes → fusionnées dans leur original, sans faire
-- avancer updated_at (dateModified) de l'article français.
alter table public.articles disable trigger articles_set_updated_at;

update public.articles fr
set traductions = fr.traductions || jsonb_build_object('en', jsonb_build_object(
      'titre', en.titre,
      'meta_title', en.meta_title,
      'meta_description', en.meta_description,
      'extrait', en.extrait,
      'contenu_html', en.contenu_html,
      'faq', en.faq,
      'image_cover_alt', en.image_cover_alt,
      'statut', coalesce(en.statut, 'brouillon')))
from public.articles en
where en.lang = 'en' and en.traduction_de = fr.id;

delete from public.articles where lang = 'en' and traduction_de is not null;

alter table public.articles enable trigger articles_set_updated_at;

-- updated_at = dateModified : ne bouge que sur un changement éditorial. Publier
-- ou dépublier une version traduite (traductions.<locale>.statut) n'en est pas un.
create or replace function public.articles_set_updated_at()
returns trigger
language plpgsql
as $$
declare
  n jsonb := to_jsonb(new) - array['updated_at', 'statut', 'diffuse_le'];
  o jsonb := to_jsonb(old) - array['updated_at', 'statut', 'diffuse_le'];
  l text;
begin
  for l in
    select jsonb_object_keys(coalesce(new.traductions, '{}'::jsonb) || coalesce(old.traductions, '{}'::jsonb))
  loop
    n := n #- array['traductions', l, 'statut'];
    o := o #- array['traductions', l, 'statut'];
  end loop;
  if n is distinct from o then
    new.updated_at = now();
  else
    new.updated_at = old.updated_at;
  end if;
  return new;
end;
$$;
