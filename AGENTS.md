<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ESTIMMO - notes projet

Estimateur immobilier (vente/location) + générateur de leads, France entière.
**Spécification complète : `starter.md` (racine) - c'est la source de vérité.**

## Stack
Next.js 16 App Router (TS) · Tailwind v4 + shadcn/ui (base-ui, pas radix) ·
Supabase cloud (Postgres + PostGIS, Auth, Storage) · Resend (email, domaine estimmo-direct.com) · Zod v4 ·
Vitest · pnpm. Déploiement Vercel.

## Commandes
- `pnpm dev` / `pnpm build` / `pnpm lint` / `pnpm typecheck` / `pnpm test`
- `pnpm db:migrate` - applique `supabase/migrations/*.sql` (runner maison, table `_migrations`)
- `pnpm admin:create <email> <mdp>` - crée l'utilisateur admin
- `pnpm import:dvf` / `pnpm import:loyers` - ingestion données (local, jamais Vercel)
- Les scripts lisent `.env.local` via `node --env-file-if-exists`

## Architecture
- `app/[locale]/(site)` public SEO (fr à la racine, en sous `/en`) · `app/admin` protégé (proxy.ts + rôle `profiles`, FR uniquement) · `app/api` · `app/sitemap.xml` + `app/sitemaps/[fichier]`
- `lib/estimation` moteur pur testé · `lib/supabase` clients (server/client/admin) · `lib/config.ts` marque/agent/taux (données seulement) · `lib/i18n` routage, proxy, formats, SEO multilingue · `messages/` traductions fr/en
- RLS activé partout, aucune policy publique : tout accès data passe par le service_role côté serveur
- Jamais exposer de mutation DVF individuelle publiquement (licence DGFiP) - uniquement des agrégats (`communes_stats`)

## Décisions actées (avec le client)
- Honoraires affichés : « à partir de 3 % » exclusif vs « minimum 6 % » simple
- Fourchette d'estimation vente resserrée à ±5-10 % selon dispersion (le ±6-15 %
  du brief donnait des écarts de 60 k€ jugés peu crédibles). Marque en bleu
  #2E90E5, tunnel d'estimation en Arial (15/07/2026)
- Import DVF : France entière, 3 dernières années. Depuis le 16/10/2026 la table
  `dvf_mutations` est au format compact (lat/lon en micro-degrés, prix_m2 real,
  type 'A'/'M', pas de PostGIS stocké) : ~92 octets/ligne, ~210 Mo France entière
  → tient dans le plan Supabase **gratuit** (500 Mo). Moteur et signatures SQL inchangés
- Email : Resend (pas Brevo - Brevo bloquait l'envoi des comptes gratuits). `lib/email`, `EMAIL_FROM` sur domaine vérifié estimmo-direct.com. Sans clé en dev → simulation console
- CRM sans clé en dev → file en pending
- Départements sans DVF : 57, 67, 68, 976 (le brief inversait 67/68) → fallback estimation manuelle
- `annee_construction` stockée en texte (tranches du formulaire), pas en int
- Slug commune : `nom-cp` (ex. `nice-06000`), désambiguïsé par code INSEE si homonymes

## État d'avancement - PROJET LIVRÉ (14/07/2026)
- [x] Phase 1 - Socle (Next 16, migrations, auth admin)
- [x] Phase 1bis - Supabase cloud (eu-west-1, pooler aws-0) : migrations + admin + imports
- [x] 16/10/2026 - Nouveau projet Supabase gratuit (mppdrdqykslyflmejzbt) : 6 migrations, ANIL 2025, DVF compact
- [x] Phase 2 - Imports : DVF France 2023-2025 (2 290 975 ventes, ~650 Mo), ANIL 2025 (34 900 communes)
- [x] Phase 3 - Moteur estimation (64 tests Vitest)
- [x] Phase 4 - Formulaire 4 étapes + API leads + résultat (E2E : Nice vente/location, Strasbourg→manuelle)
- [x] Phase 5 - Brevo (simulation sans clé) + file CRM + cron (E2E mock : 500→retry backoff→sent, idempotence)
- [x] Phase 6 - Admin complet (E2E session réelle)
- [x] Phase 7 - SEO : ~35 k pages communes ISR, sitemap 34 923 URLs, JSON-LD Dataset+FAQ
- [x] Phase 8 - Lighthouse prod : landing Perf 95/SEO 100 ; commune Perf 96/SEO 100
- [x] 18/10/2026 - i18n fr/en complet (next-intl) : site, tunnel, SEO, emails, blog ; 170+ tests Vitest

## i18n (18/10/2026) - next-intl 4, fr par défaut / en
- **URLs** : français sans préfixe (URLs historiques inchangées), anglais sous `/en/...`,
  mêmes slugs. `lib/i18n/routing.ts` (`localePrefix: as-needed`, cookie `NEXT_LOCALE` 1 an).
- **Détection** (`proxy.ts` → `lib/i18n/proxy.ts`) : langue principale du navigateur
  `fr*` → fr, toute autre langue → en (`lib/i18n/negociation.ts`), 307 à la 1re visite ;
  robots/outils d'audit jamais redirigés (`lib/i18n/robots.ts`) ; `/fr/x` → 307 `/x`.
  Le `matcher` du proxy doit rester un littéral ; `lib/i18n/matcher.test.ts` le vérifie
  (un mauvais échappement rend le proxy inactif hors racine → site en 404).
- **Messages** : `messages/<locale>/<namespace>.json`, assemblés par `messages/<locale>/index.ts`.
  Typage strict (`global.d.ts`) : `pnpm typecheck` refuse une clé inconnue ;
  `lib/i18n/messages.test.ts` impose parité fr/en, syntaxe ICU valide, mêmes arguments.
  Textes imposés par le client (`starter.md`) recopiés verbatim côté fr.
- **Règles de code** : aucun texte en dur dans `app/[locale]` et `components/estimation` ;
  `Link`/`redirect`/`permanentRedirect`/`usePathname` viennent de `@/lib/i18n/navigation`
  (jamais `next/link` côté site) ; nombres/dates via `useFormatter`/`getFormatter` et
  `lib/i18n/formats.ts` (plus de `toLocaleString("fr-FR")`) ; `lib/config.ts` ne contient
  que des données (noms, taux), `MENTIONS` a disparu au profit de `common.mentions.*`.
- **Server Components** : `localeDeParams(params)` puis `getTranslations({ locale, namespace })`.
  Route handlers / sitemap / emails : locale explicite (`next/root-params` y est indisponible),
  `/api/leads` lit `lead.locale` (champ du payload).
- **Client** : provider racine sans messages (les ~35 k pages SEO n'embarquent rien) ;
  seul le tunnel reçoit ses namespaces via `components/estimation/tunnel-provider.tsx`.
- **Zod** : les messages de `lib/leads/schema.ts` sont des clés `validation.*` ;
  `safeParse(x, AVEC_CLES)` + `traduireIssues` (`lib/leads/erreurs.ts`) côté client et serveur.
- **Rendu statique** : `generateStaticParams` des communes ne prérend que fr (en à la demande,
  ISR) ; revalidation via `revaliderSite()` (chemins internes `/fr/...` et `/en/...`).
- **SEO** : `alternatesPour()` (canonical + hreflang fr/en/x-default), `openGraphPour()`,
  JSON-LD `inLanguage` ; textes SEO générés dans `lib/seo/textes.ts` (namespace `commune`,
  variantes anti-duplicate conservées). Sitemaps : `/sitemap.xml` = index →
  `/sitemaps/pages.xml` + `/sitemaps/communes-N.xml` (une entrée par langue, 20 000
  communes par fichier) ; pages noindex exclues. Admin (`app/admin`) hors `[locale]`, FR.
- **Données** : `leads.locale` (email prospect dans sa langue, notification agent en FR),
  `articles.lang` (un article n'existe que dans sa langue ; `/en/blog/<slug-fr>` → 404 ;
  choix dans l'éditeur admin). Migration `20261018120000_i18n_locale.sql`.
- **Surcharges admin** (`/admin/traductions`, table `traductions`) : la conseillère peut
  reformuler n'importe quelle clé par langue (ton, SEO). Les JSON restent la source
  embarquée ; `lib/i18n/request.ts` fusionne les surcharges (`appliquerSurcharges`,
  cache `unstable_cache` taggé `traductions`, repli JSON si base injoignable). Une
  surcharge doit garder les mêmes arguments/balises ICU que l'original
  (`validerSurcharge`, `lib/i18n/icu.ts`) ; on ne peut pas créer de clé depuis l'admin.
  Après enregistrement : `revalidateTag("traductions")` + `revalidatePath("/[locale]", "layout")`.
  Migration `20261018150000_traductions.sql`.
- **Outils** : `pnpm email:preview` (6 aperçus fr/en), `pnpm test:coverage` (v8).

## Sécurité (16/10/2026)
- `lib/security/rate-limit.ts` : limite par IP en mémoire sur /api/leads (5/10 min), track, geocode, quartier. Par instance serverless, pas globale
- Pot de miel `website` dans le payload lead : si rempli → faux succès, rien n'est enregistré
- Emails : toute valeur saisie par le prospect passe par `escapeHtml` ; export CSV neutralise les formules
- `CRON_SECRET` obligatoire en prod (jetons de rappel) ; comparaisons Bearer en temps constant
- `shadcn` est une devDependency (CLI) : ne pas le remettre en dependencies (il tire 20+ CVE inutiles)
- Le formulaire d'estimation est intégré au hero de la landing (`#estimation`) ; /estimation reste pour les liens entrants

## Contraintes déploiement
- Plan Vercel **Pro** → cron toutes les 5 min autorisé (vercel.json = `*/5 * * * *`).
  NB : le plan Hobby (gratuit) limite les crons à 1×/jour et ferait échouer le
  déploiement avec ce schedule ; en cas de retour en gratuit, repasser en quotidien
  (ex. `0 3 * * *`) ou brancher un déclencheur externe (Supabase pg_cron /
  cron-job.org) sur /api/cron/crm-sync (`Authorization: Bearer $CRON_SECRET`).
  Sans CRM_WEBHOOK_URL le cron ne fait rien.

## Reste à faire (nécessite le client)
- Clé Resend (RESEND_API_KEY) + EMAIL_FROM sur domaine vérifié (sinon simulation console)
- URL + clé du webhook CRM du propriétaire
- Repo GitHub (secrets SUPABASE_DB_URL, CRON_SECRET, var SITE_URL) + déploiement Vercel
- Purger les leads de test : delete from leads (cascade crm_sync_queue)
- Search Console : `/sitemap.xml` est désormais un index de sitemaps (pages.xml, communes-N.xml) - vérifier qu'il est bien relu après déploiement
