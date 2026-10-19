-- Images du blog envoyées depuis l'admin (Supabase Storage, bucket « blog »).
-- visuels : { "<chemin logique>": "<URL Storage>" }, ex.
--   { "/images/blog/frais-de-notaire-calcul/cover.webp": "https://…/blog/visuels/frais-de-notaire-calcul/cover-1a2b3c4d.webp" }
-- Le HTML et image_cover gardent les chemins logiques du JSON éditorial ; le
-- rendu les résout (Storage, sinon public/, sinon aplat). L'import JSON ne
-- touche jamais cette colonne : une réimportation ne perd aucune image.
alter table public.articles
  add column if not exists visuels jsonb not null default '{}'::jsonb;
