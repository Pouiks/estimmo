-- Prompt de génération de la couverture (usage interne, affiché dans
-- l'emplacement « Couverture » de l'admin ; ceux des images du corps sont
-- dans articles.images[].aiPrompt).
alter table public.articles
  add column if not exists image_cover_prompt text;
