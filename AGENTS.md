<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ESTIMMO — notes projet

Estimateur immobilier (vente/location) + générateur de leads, France entière.
**Spécification complète : `starter.md` (racine) — c'est la source de vérité.**

## Stack
Next.js 16 App Router (TS) · Tailwind v4 + shadcn/ui (base-ui, pas radix) ·
Supabase cloud (Postgres + PostGIS, Auth, Storage) · Brevo (email) · Zod v4 ·
Vitest · pnpm. Déploiement Vercel.

## Commandes
- `pnpm dev` / `pnpm build` / `pnpm lint` / `pnpm typecheck` / `pnpm test`
- `pnpm db:migrate` — applique `supabase/migrations/*.sql` (runner maison, table `_migrations`)
- `pnpm admin:create <email> <mdp>` — crée l'utilisateur admin
- `pnpm import:dvf` / `pnpm import:loyers` — ingestion données (local, jamais Vercel)
- Les scripts lisent `.env.local` via `node --env-file-if-exists`

## Architecture
- `app/(site)` public SEO · `app/(admin)/admin` protégé (proxy.ts + rôle `profiles`) · `app/api`
- `lib/estimation` moteur pur testé · `lib/supabase` clients (server/client/admin) · `lib/config.ts` marque/agent/honoraires
- RLS activé partout, aucune policy publique : tout accès data passe par le service_role côté serveur
- Jamais exposer de mutation DVF individuelle publiquement (licence DGFiP) — uniquement des agrégats (`communes_stats`)

## Décisions actées (avec le client)
- Honoraires affichés : « à partir de 3 % » exclusif vs « minimum 6 % » simple
- Import DVF : France entière, 3 dernières années (Supabase plan Pro requis)
- Brevo/CRM sans clés en dev → mode simulation (emails loggés, file CRM en pending)
- Départements sans DVF : 57, 67, 68, 976 (le brief inversait 67/68) → fallback estimation manuelle
- `annee_construction` stockée en texte (tranches du formulaire), pas en int
- Slug commune : `nom-cp` (ex. `nice-06000`), désambiguïsé par code INSEE si homonymes

## État d'avancement — PROJET LIVRÉ (14/07/2026)
- [x] Phase 1 — Socle (Next 16, migrations, auth admin)
- [x] Phase 1bis — Supabase cloud (eu-west-1, pooler aws-0) : migrations + admin + imports
- [x] Phase 2 — Imports : DVF France 2023-2025 (2 290 975 ventes, ~650 Mo), ANIL 2025 (34 900 communes)
- [x] Phase 3 — Moteur estimation (64 tests Vitest)
- [x] Phase 4 — Formulaire 4 étapes + API leads + résultat (E2E : Nice vente/location, Strasbourg→manuelle)
- [x] Phase 5 — Brevo (simulation sans clé) + file CRM + cron (E2E mock : 500→retry backoff→sent, idempotence)
- [x] Phase 6 — Admin complet (E2E session réelle)
- [x] Phase 7 — SEO : ~35 k pages communes ISR, sitemap 34 923 URLs, JSON-LD Dataset+FAQ
- [x] Phase 8 — Lighthouse prod : landing Perf 95/SEO 100 ; commune Perf 96/SEO 100

## Reste à faire (nécessite le client)
- Clé Brevo + email expéditeur vérifié (sinon simulation console)
- URL + clé du webhook CRM du propriétaire
- Repo GitHub (secrets SUPABASE_DB_URL, CRON_SECRET, var SITE_URL) + déploiement Vercel
- Vérifier le plan Supabase Pro (base 647 Mo > free tier)
- Purger les leads de test : delete from leads (cascade crm_sync_queue)
