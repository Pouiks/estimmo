-- Slug propre à chaque version linguistique : traductions.<locale>.slug.
-- Absent ou null = l'URL traduite reprend le slug français (/en/blog/<slug fr>).
-- Avec un slug anglais, la page anglaise vit sur /en/blog/<slug en> et l'ancienne
-- URL (/en/blog/<slug fr>) est redirigée (308) par la page.
--
-- Le slug français (colonne `slug`, unique) reste l'identifiant stable de
-- l'article : articles_lies, liens internes du corps, chemins d'images.
-- Tous les slugs publics partagent le même espace : un slug anglais ne doit
-- pas être le slug français d'un autre article (contrôlé à l'enregistrement
-- dans l'admin ; l'index ci-dessous garantit l'unicité entre slugs anglais).

alter table public.articles drop constraint if exists articles_traductions_en_slug_forme;
alter table public.articles add constraint articles_traductions_en_slug_forme
  check (
    traductions->'en'->>'slug' is null
    or traductions->'en'->>'slug' ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  );

create unique index if not exists articles_traductions_en_slug_unique
  on public.articles ((traductions->'en'->>'slug'))
  where traductions->'en'->>'slug' is not null;
