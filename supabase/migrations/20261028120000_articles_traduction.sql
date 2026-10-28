-- Versions linguistiques d'un article : une version anglaise est un article
-- `lang = 'en'` relié à son original français par traduction_de (hreflang,
-- bascule FR/EN sur le site, liens internes traduits au rendu).
alter table public.articles
  add column if not exists traduction_de uuid references public.articles (id) on delete set null;

alter table public.articles drop constraint if exists articles_traduction_de_distinct;
alter table public.articles add constraint articles_traduction_de_distinct
  check (traduction_de is null or traduction_de <> id);

-- Une seule traduction par original.
create unique index if not exists articles_traduction_de_unique
  on public.articles (traduction_de)
  where traduction_de is not null;
