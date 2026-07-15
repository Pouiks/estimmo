# ESTIMMO - Estimateur immobilier & générateur de leads

Application web d'estimation immobilière (vente et location) couvrant toute la
France, conçue pour capter des leads vendeurs/bailleurs qualifiés. Le visiteur
décrit son bien en 4 étapes, laisse ses coordonnées, et reçoit une fourchette
de prix fondée sur les données publiques (ventes DVF, loyers ANIL). Chaque
soumission crée un lead scoré, stocké dans Supabase, poussé vers le CRM externe
et confirmé par email.

> Spécification complète du projet : [`starter.md`](starter.md)

## Stack

Next.js 16 (App Router, TypeScript) · Supabase (Postgres + PostGIS, Auth,
Storage) · Tailwind CSS v4 + shadcn/ui · TipTap (blog) · Resend (emails) ·
Zod v4 · Vitest · pnpm · déploiement Vercel.

## Démarrage

```bash
pnpm install
cp .env.example .env.local        # puis remplir les clés (voir ci-dessous)
pnpm db:migrate                   # applique supabase/migrations/*.sql
pnpm admin:create admin@exemple.fr motdepasse
pnpm import:loyers                # loyers ANIL (~2 min)
pnpm import:dvf                   # DVF France entière 3 ans (~10 min, ~650 Mo en base)
pnpm dev                          # http://localhost:3000
```

Import partiel pour développer plus vite :
`pnpm import:dvf -- --depts 06 --years 2025` (ou `--dry-run` sans écrire).

## Variables d'environnement

| Variable | Rôle |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Projet Supabase (Dashboard → Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | Accès serveur (jamais côté client) |
| `SUPABASE_DB_URL` | Chaîne Postgres « Session pooler » - scripts locaux/CI uniquement |
| `RESEND_API_KEY` / `EMAIL_FROM` | Emails transactionnels via Resend (absents = simulation en console) ; `EMAIL_FROM` sur domaine vérifié |
| `CRM_WEBHOOK_URL` / `CRM_API_KEY` | Webhook du CRM externe (absents = file en attente) |
| `CRON_SECRET` | Protège `/api/cron/crm-sync` et `/api/revalidate` |
| `ADMIN_NOTIFICATION_EMAIL` | Destinataire des notifications de nouveaux leads |
| `NEXT_PUBLIC_SITE_URL` | URL canonique du site (SEO, emails) |
| `SEO_PRERENDER_COUNT` | Pages communes pré-rendues au build (défaut 2000) |

## Commandes

| Commande | Description |
| --- | --- |
| `pnpm dev` / `build` / `start` | Next.js |
| `pnpm test` / `typecheck` / `lint` | Qualité (91 tests Vitest) |
| `pnpm db:migrate` | Migrations SQL idempotentes (table `_migrations`) |
| `pnpm admin:create <email> <mdp>` | Crée/promeut un admin (`/admin/login`) |
| `pnpm import:dvf [-- --years … --depts … --dry-run]` | Import ventes DVF |
| `pnpm import:loyers [-- --dry-run]` | Import Carte des loyers ANIL |
| `pnpm sql "select …"` | Requête directe sur la base |

## Architecture

```
app/(site)/        Public SEO : landing, estimation (4 étapes), /prix-immobilier/[commune]
                   (~35 000 pages ISR 24 h), blog, pages légales
app/(admin)/admin/ Back-office protégé (proxy + rôle) : leads, estimations
                   manuelles, blog TipTap, stats
app/api/           leads (création + estimation + score), geocode (proxy IGN),
                   track (entonnoir), cron/crm-sync, revalidate
lib/estimation/    Moteur pur testé : comparables par paliers, médiane pondérée,
                   ajustements ±25 %, loyers ANIL, score lead, zones non couvertes
lib/crm/           Payload contractuel + file de synchro (retry backoff, idempotence)
lib/brevo/         Emails prospect + notification interne
scripts/           Imports DVF/ANIL (hors Vercel), migrations, outillage
supabase/          Migrations SQL (RLS verrouillé partout)
```

## Données

- **DVF géolocalisé** (Etalab) : ventes réelles, publication semestrielle
  (avril/octobre) → GitHub Action `Import DVF` planifiée. Nettoyage : ventes
  seules, mono-logement, bornes 8–500 m², 5 k€–10 M€, 200–25 000 €/m².
- **Carte des loyers ANIL** : publication annuelle → mettre à jour
  `MILLESIME` et les URLs dans `scripts/import-loyers.ts`, puis lancer la
  GitHub Action `Import loyers ANIL`.
- Départements absents de DVF : 57, 67, 68 (Livre foncier) et 976 → les
  leads y basculent en **estimation manuelle** (file admin dédiée).
- Contrainte légale : seules des **statistiques agrégées** sont exposées
  publiquement ; les mutations individuelles ne sortent jamais du serveur.

## Déploiement Vercel

1. Importer le repo dans Vercel, renseigner toutes les variables d'environnement
   (sans `SUPABASE_DB_URL`, inutile au runtime).
2. `vercel.json` programme le cron CRM (`*/5 * * * *`) - définir `CRON_SECRET`.
3. Secrets GitHub Actions : `SUPABASE_DB_URL`, `CRON_SECRET` + variable
   `SITE_URL` pour la revalidation post-import.
4. Supabase : plan **Pro** requis (la base DVF France ≈ 650 Mo).
