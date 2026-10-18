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
pnpm import:dvf                   # DVF France entière 3 ans (~5 min, ~210 Mo en base)
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
| `RESEND_API_KEY` / `EMAIL_FROM` | Emails transactionnels via Resend (absents = simulation en console) ; `EMAIL_FROM` sur domaine vérifié, format `Nom affiché <adresse>` (une adresse nue est préfixée par `SITE.emailSender`) |
| `CRM_WEBHOOK_URL` / `CRM_API_KEY` | Webhook du CRM externe (absents = file en attente) |
| `CRON_SECRET` | Protège `/api/cron/crm-sync` et `/api/revalidate` ; signe les liens « être rappelé » (**obligatoire en production**) |
| `ADMIN_NOTIFICATION_EMAIL` | Destinataire des notifications de nouveaux leads |
| `NEXT_PUBLIC_SITE_URL` | URL canonique du site (SEO, emails), ex. `https://www.estimmo-direct.com` ; figée au build → redéployer après modification |
| `SEO_PRERENDER_COUNT` | Pages communes pré-rendues au build (défaut 2000) |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Jeton de la balise meta Google Search Console (optionnel) |

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
app/[locale]/(site)/ Public SEO, fr à la racine et en sous /en : landing (tunnel d'estimation
                   intégré), /estimation, /prix-immobilier/[commune] (~35 000 pages ISR 24 h,
                   en généré à la demande), blog, pages légales
app/admin/         Back-office protégé (proxy + rôle), français uniquement : leads,
                   estimations manuelles, blog TipTap (langue par article), stats
app/sitemap.xml    Index des sitemaps → app/sitemaps/[fichier] (pages.xml, communes-N.xml)
app/api/           leads (création + estimation + score), geocode (proxy IGN),
                   track (entonnoir), cron/crm-sync, revalidate
lib/estimation/    Moteur pur testé : comparables par paliers, médiane pondérée,
                   ajustements ±25 %, loyers ANIL, score lead, zones non couvertes
lib/crm/           Payload contractuel + file de synchro (retry backoff, idempotence)
lib/email/         Emails prospect + notification interne (Resend)
lib/security/      Rate limit mémoire par IP, comparaison de secrets, échappement HTML
lib/i18n/          next-intl : routage (fr défaut / en), proxy de détection, formats,
                   helpers SEO (hreflang, URLs), revalidation multilingue
messages/          Traductions fr/en, un fichier JSON par namespace (parité testée)
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
4. Supabase : le plan **gratuit** suffit (base complète ≈ 250 Mo sur 500 Mo
   grâce au format compact de `dvf_mutations`, migration `20261016120000`).
   Attention : un projet gratuit est mis en pause après 7 jours sans requête.
