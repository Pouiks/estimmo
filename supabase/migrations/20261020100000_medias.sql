-- Bibliothèque d'images du blog : une ligne par fichier du bucket Storage
-- « blog ». Les emplacements d'article (articles.visuels : chemin logique →
-- url) et le HTML des articles référencent les médias par leur url ; un média
-- supprimé libère ses emplacements. alt/légende = valeurs par défaut du média,
-- l'article garde son propre alt (contexte SEO de la page).
create table public.medias (
  id uuid primary key default gen_random_uuid(),
  chemin text unique not null,          -- chemin dans le bucket (visuels/…, bibliotheque/…, articles/…)
  url text unique not null,
  alt text not null default '',
  legende text,
  largeur smallint not null,
  hauteur smallint not null,
  taille integer not null,              -- octets
  -- 'cover' 1200×630, 'corps' 1200×800, 'libre' (proportions d'origine)
  format text not null default 'libre' check (format in ('cover', 'corps', 'libre')),
  prompt text,                          -- prompt de génération, le cas échéant
  parent_id uuid references public.medias (id) on delete set null, -- recadrage d'un autre média
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index medias_created_idx on public.medias (created_at desc);
create index medias_format_idx on public.medias (format);

create trigger medias_set_updated_at
  before update on public.medias
  for each row execute function public.set_updated_at();

alter table public.medias enable row level security;
