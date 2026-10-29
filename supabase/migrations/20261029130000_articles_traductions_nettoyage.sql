-- Étape 2/2 des versions linguistiques intégrées (voir 20261029120000) :
-- suppression des colonnes de l'ancien modèle « article anglais séparé ».
--
-- Appliquée après la mise en production du code qui ne lit plus `lang` ni
-- `traduction_de` (commit du 29/10/2026) : sur une base encore servie par
-- l'ancien code, le blog public et l'admin tomberaient en erreur.

drop index if exists public.articles_traduction_de_unique;
alter table public.articles drop constraint if exists articles_traduction_de_distinct;
alter table public.articles drop column if exists traduction_de;
-- articles_publies_idx (published_at desc where statut = 'publie') reste.
drop index if exists public.articles_lang_statut_idx;
alter table public.articles drop column if exists lang;
