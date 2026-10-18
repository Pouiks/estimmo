-- i18n : langue du prospect (email dans sa langue) et langue des articles.
alter table public.leads
  add column if not exists locale text not null default 'fr'
  check (locale in ('fr', 'en'));

alter table public.articles
  add column if not exists lang text not null default 'fr'
  check (lang in ('fr', 'en'));

create index if not exists articles_lang_statut_idx
  on public.articles (lang, statut, published_at desc);
