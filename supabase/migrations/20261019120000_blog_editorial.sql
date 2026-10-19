-- Blog éditorial : articles rédigés en HTML (import JSON), publication
-- programmée, FAQ, articles liés. Les articles TipTap existants restent valides
-- (contenu jsonb), un article porte l'un OU l'autre format.

alter table public.articles alter column contenu drop not null;

alter table public.articles
  add column if not exists contenu_html text,
  add column if not exists meta_title text,
  add column if not exists extrait text,
  add column if not exists categorie text
    check (categorie in ('estimation', 'vente', 'achat-fiscalite')),
  add column if not exists auteur text,
  add column if not exists temps_lecture smallint,
  add column if not exists image_cover_alt text,
  add column if not exists image_cover_largeur smallint,
  add column if not exists image_cover_hauteur smallint,
  -- [{ question, answer }] affichée en accordéon + JSON-LD FAQPage
  add column if not exists faq jsonb not null default '[]'::jsonb,
  -- slugs des cartes « À lire aussi »
  add column if not exists articles_lies text[] not null default '{}',
  -- Usage interne (pilotage SEO, production des visuels) : jamais affiché
  add column if not exists mot_cle_principal text,
  add column if not exists mots_cles_secondaires text[] not null default '{}',
  add column if not exists points_cles text[] not null default '{}',
  add column if not exists images jsonb not null default '[]'::jsonb,
  -- Horodatage de la mise en ligne effective (cache du site rafraîchi).
  -- null + statut 'publie' + published_at passé = à diffuser par le cron.
  add column if not exists diffuse_le timestamptz;

alter table public.articles drop constraint if exists articles_contenu_present;
alter table public.articles add constraint articles_contenu_present
  check (contenu is not null or contenu_html is not null);

-- updated_at sert de dateModified (JSON-LD, sitemap) : il ne bouge que si le
-- contenu éditorial change (pas pour une (dé)publication ni une diffusion,
-- ni pour une réimportation identique).
create or replace function public.articles_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  if (to_jsonb(new) - array['updated_at', 'statut', 'diffuse_le'])
     is distinct from
     (to_jsonb(old) - array['updated_at', 'statut', 'diffuse_le']) then
    new.updated_at = now();
  else
    new.updated_at = old.updated_at;
  end if;
  return new;
end;
$$;

drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at
  before update on public.articles
  for each row execute function public.articles_set_updated_at();
