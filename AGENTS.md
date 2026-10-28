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
  `articles.lang` + `articles.traduction_de` (28/10/2026) : une version anglaise est un
  article `en` relié à son original `fr` (bouton « Créer la version anglaise » de l'éditeur
  admin = copie en brouillon à traduire, slug suffixé `-en` ; `lib/blog/traductions.ts`).
  Les deux versions se déclarent en hreflang (page + sitemap) ; `/en/blog/<slug-fr>`
  redirige vers la version anglaise si elle est en ligne, sinon vers `/en/blog` ; les liens
  internes et « À lire aussi » copiés du français sont traduits au rendu quand la version
  anglaise de la cible est en ligne. Migrations `20261018120000_i18n_locale.sql`,
  `20261028120000_articles_traduction.sql`.
- **Surcharges admin** (`/admin/traductions`, table `traductions`) : la conseillère peut
  reformuler n'importe quelle clé par langue (ton, SEO). Les JSON restent la source
  embarquée ; `lib/i18n/request.ts` fusionne les surcharges (`appliquerSurcharges`,
  cache `unstable_cache` taggé `traductions`, repli JSON si base injoignable). Une
  surcharge doit garder les mêmes arguments/balises ICU que l'original
  (`validerSurcharge`, `lib/i18n/icu.ts`) ; on ne peut pas créer de clé depuis l'admin.
  Après enregistrement : `revalidateTag("traductions")` + `revalidatePath("/[locale]", "layout")`.
  Migration `20261018150000_traductions.sql`.
- **Outils** : `pnpm email:preview` (6 aperçus fr/en), `pnpm test:coverage` (v8).

## Blog éditorial (19/10/2026)
- **Source** : `content/blog/articles.json` (28 articles, format du brief rédactionnel),
  gabarit de page `content/blog/apercu-article.html`. Corps en HTML de confiance
  (`contenu_html`) ; les anciens articles TipTap (`contenu` jsonb) restent rendus.
- **Import** : `pnpm import:articles` (idempotent par slug, contrôles `lib/blog/import.ts`,
  testés sur le vrai fichier). Calendrier : 1 article / 2 j à 7 h Paris dans l'ordre du
  fichier (`--debut`, `--intervalle`, `--heure`, `--replanifier`, `--brouillon`,
  `--programmer`, `--dry-run`). Une réimportation ne touche ni statut ni date.
- **En ligne** = `statut = publie` ET `published_at <= now()` (`lib/blog/publication.ts`) ;
  date future = programmé, invisible partout (liste, page, sitemap). Cron quotidien
  `/api/cron/blog` (06:05 UTC, compatible Vercel gratuit) : revalide le blog quand
  une date passe (`diffuse_le`). Admin : publier / dépublier / publier maintenant en
  un clic, éditeur dédié (SEO, date, HTML, FAQ, articles liés), aperçu `/admin/blog/[id]/apercu`.
- **Rendu** (`lib/blog/html.ts`) : un lien vers un article pas encore en ligne devient
  du texte (pas de 404) ; une image absente devient un aplat.
- **Images** : le HTML et `image_cover` gardent les chemins logiques du JSON
  (`/images/blog/<slug>/cover.webp`…), résolus au rendu par `resoudreImage`
  (`lib/blog/images.ts`) : 1) emplacement affecté depuis l'admin (colonne `visuels`
  { chemin → url }, jamais touchée par l'import) ; 2) fichier dans `public/images/blog/`
  recensé par `pnpm blog:images` (lancé par `pnpm build`) ; 3) sinon aplat.
- **Bibliothèque** (`lib/blog/medias.ts`, table `medias`, bucket Storage `blog`) : un
  média par fichier (alt/légende par défaut, dimensions, format cover 1200×630 / corps
  1200×800 / libre, prompt, parent_id si recadrage). Un emplacement d'article = un média
  (url) ; alt et légende publiés = ceux de l'article (`image_cover_alt`, `<img alt>` +
  `<figcaption>` réécrits par `modifierImageCorps`). Dans la page d'un article :
  Envoyer (recadrage exact, WebP < 200 Ko, sharp `lib/blog/optimisation.ts`, position
  « auto » = stratégie attention) ou Bibliothèque (sélecteur ; format différent → média
  dérivé recadré). `/admin/medias` : envois libres (≤ 2000 px, ≤ 350 Ko), alt/légende,
  usages par article, suppression (libère les emplacements), purge des non utilisées ;
  la page synchronise au chargement les fichiers Storage absents de la table. Le
  navigateur réduit la photo avant envoi (`lib/blog/reduire-image.ts`) ;
  `serverActions.bodySizeLimit` = 4 Mo (Vercel plafonne à 4,5 Mo). Fichiers :
  `visuels/<slug>-<nom>-<id>.webp`, `bibliotheque/`, `articles/` (ancien éditeur).
  Prompts de génération : `content/blog/prompts-images.md` et `aiPrompt` du JSON.
- **Réactivité admin** : `revaliderBlog()` revalide par motif de route
  (`/[locale]/blog`, `/[locale]/blog/[slug]`, sitemap) sans requête ni boucle ; une
  action qui appelle `revalidatePath` sur la page courante la rafraîchit déjà → pas de
  `router.refresh()` en plus (double rendu) ; dépôt Storage et insertion `medias` en
  parallèle ; la page Médias ne relit Storage que si la table est vide ou via le
  bouton « Synchroniser » (un listing Storage ≈ 1 s).
- **Éditeur du corps** (`components/admin/editeur-corps.tsx`) : mode visuel (TipTap,
  rendu identique au site via `.article-corps`) ou HTML brut, bascule libre. Nœuds sur
  mesure `components/admin/tiptap-editorial.ts` (aside.a-retenir, div.cta-estimation,
  figure + figcaption, img avec width/height/loading, tableaux TableKit) ; images
  insérées depuis la bibliothèque. Sortie normalisée par `normaliserHtmlEditeur`
  (table-wrapper, attributs techniques retirés) avant enregistrement.
- **HTML de confiance** : `problemesHtml` (lib/blog/html.ts) est une liste noire
  (script/iframe/svg/base…, attributs on*, srcdoc/formaction, URLs javascript:/data:)
  testée sur la forme brute ET décodée (entités, caractères de contrôle). Le corps est
  rédigé par un admin authentifié : ce n'est pas une allowlist pour contenu tiers.
- **Sitemap images** : `imagesPubliees` (couverture + images du corps résolues) dans
  `<image:image>` de chaque article de `/sitemaps/pages.xml`.
- **SEO** : `<title>` = metaTitle (+ « | ESTIMMO » si ≤ 60 car.), canonical, OG/Twitter
  article, JSON-LD BlogPosting + BreadcrumbList + FAQPage. `updated_at` (= dateModified,
  lastmod) ne bouge que sur un changement éditorial (trigger, migration 20261019120000).

## Sécurité (16/10/2026)
- Admin (19/10/2026) : chaque action serveur commence par `requireAdmin()` (session
  Supabase + rôle `profiles`) ; `proxy.ts` redirige /admin vers /admin/login.
  Depuis le 20/10 : jeton vérifié localement par `getClaims()` (ES256, JWKS en cache
  10 min dans le module auth-js ; jamais `getSession()` seul) et rôle en cache 5 min
  (`unstable_cache`, tag `profiles`) → zéro aller-retour d'auth sur instance chaude.
  Caches client/images : `experimental.staleTimes.dynamic` 30 s, `images.minimumCacheTTL`
  31 j (noms de fichiers uniques). Aucune
  requête SQL construite par concaténation (supabase-js / RPC ; scripts en `$1`).
  Uploads : taille ≤ 4 Mo, décodage par sharp (fichier non-image refusé), toujours
  ré-encodé en WebP (métadonnées et charges utiles supprimées), noms slugifiés sous
  préfixes fixes ; suppression par uuid. Bucket Storage `blog` public en lecture,
  écriture service_role seulement. Pas de CSP (à envisager).
- `lib/security/rate-limit.ts` : limite par IP en mémoire sur /api/leads (5/10 min), track, geocode, quartier. Par instance serverless, pas globale
- Pot de miel `website` dans le payload lead : si rempli → faux succès, rien n'est enregistré
- Emails : toute valeur saisie par le prospect passe par `escapeHtml` ; export CSV neutralise les formules
- `CRON_SECRET` obligatoire en prod (jetons de rappel) ; comparaisons Bearer en temps constant
- `shadcn` est une devDependency (CLI) : ne pas le remettre en dependencies (il tire 20+ CVE inutiles)
- Le formulaire d'estimation est intégré au hero de la landing (`#estimation`) ; /estimation reste pour les liens entrants
- Partage social (28/10/2026) : `openGraphPour` fournit toujours une image : celle de la page
  (couverture d'article) sinon `/og.png?t=…&s=…&l=…` (`app/og.png/route.tsx`, ImageResponse
  1200×630, marque + titre + sous-titre, cache CDN 1 an, 60 req/min par IP ; le point dans
  le chemin l'exclut du proxy i18n). Layout : `twitter.card = summary_large_image`
  (Twitter/X reprend les balises og:*), `viewport.themeColor` (couleur des aperçus Discord).
  Communes : sous-titre = description (prix au m²). Instagram ne génère pas d'aperçu de lien.
- JSON-LD (21/10/2026) : toujours via `<JsonLd data={…}>` (`components/site/json-ld.tsx`), qui échappe « < » (`serialiserJsonLd`, `lib/seo/json-ld.ts`) : une surcharge de traduction ou une FAQ saisie dans l'admin ne peut pas fermer la balise. Jamais de `JSON.stringify` direct dans un `<script>`. Fils d'Ariane : `jsonLdFilAriane([...])`, toujours le reflet du `<nav>` visible (landing, /blog, /prix-immobilier, baromètre, départements, communes, articles)

## Contraintes déploiement
- Fonctions Vercel en **`dub1`** (vercel.json `regions`) : Supabase est en eu-west-1.
  Par défaut elles tournaient à iad1 (Virginie) et chaque requête base/Storage
  traversait l'Atlantique (~100 ms × 10 par action admin). Ne pas retirer.
- Plan Vercel **Pro** → cron toutes les 5 min autorisé (vercel.json = `*/5 * * * *`).
  NB : le plan Hobby (gratuit) limite les crons à 1×/jour et ferait échouer le
  déploiement avec ce schedule ; en cas de retour en gratuit, repasser en quotidien
  (ex. `0 3 * * *`) ou brancher un déclencheur externe (Supabase pg_cron /
  cron-job.org) sur /api/cron/crm-sync (`Authorization: Bearer $CRON_SECRET`).
  Sans CRM_WEBHOOK_URL le cron ne fait rien.

## Reste à faire (nécessite le client)
- Blog : les 28 articles sont en base en **brouillon** (dates du 20/10 au 13/12/2026 déjà
  posées) car la prod tournait encore sur l'ancien code, qui affiche tout article
  « publie » sans regarder la date. Après déploiement : `pnpm import:articles --programmer`
  (et `--replanifier --debut <date>` si le 20/10 est passé). Puis livrer les 84 images
  (fait le 19/10 : 1er article en ligne, 27 programmés ; images via /admin/blog).
- Clé Resend (RESEND_API_KEY) + EMAIL_FROM sur domaine vérifié (sinon simulation console)
- URL + clé du webhook CRM du propriétaire
- Repo GitHub (secrets SUPABASE_DB_URL, CRON_SECRET, var SITE_URL) + déploiement Vercel
- Relancer `pnpm import:loyers` (28/10/2026 : décodage Windows-1252 des CSV ANIL) : corrige les 325 communes sans vente DVF dont le nom et le slug contiennent U+FFFD (ex. `Tr�con` → `trecon-51582`) ; les anciens slugs cassés passent en 404, sitemap et pages département rafraîchis sous 24 h (ISR)
- Purger les leads de test : delete from leads (cascade crm_sync_queue)
- Search Console : `/sitemap.xml` est désormais un index de sitemaps (pages.xml, communes-N.xml) - vérifier qu'il est bien relu après déploiement
