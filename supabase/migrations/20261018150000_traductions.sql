-- Surcharges de traduction editees depuis l'admin : elles priment sur les
-- fichiers messages/<locale>/*.json au rendu (ton, SEO). Une ligne par
-- (langue, cle a points). RLS active sans policy : acces service_role seulement.
create table if not exists traductions (
  locale text not null check (locale in ('fr', 'en')),
  cle text not null,
  valeur text not null,
  updated_at timestamptz not null default now(),
  primary key (locale, cle)
);

alter table traductions enable row level security;
