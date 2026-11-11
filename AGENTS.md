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
- `pnpm import:geo` / `pnpm import:insee` / `pnpm import:dvf:annuel -- --depts 30,34` - contexte
  des pages communes (centres + population, INSEE logement, séries annuelles DVF) ; `--dry-run` partout
- `pnpm seo:verif -- --depts 30,34 --n 12` - contrôle de bout en bout des pages communes en prod
  (200, canonical, noindex selon seuil, sitemap, orphelines, JSON-LD, version EN) ; code 1 si échec
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
- **Nettoyage DVF 2.0.0 (11/11/2026, après audit `audit/RAPPORT-estimation-vente.md`)** :
  deux logements identiques à lots distincts ou deux lignes strictement identiques sur la
  même parcelle = multi-logements (exclue) ; mutation exclue à partir de 2 dépendances
  (`dependances`) ; appartement : surface Carrez du lot retenue si ratio 0,5-1,5 avec la
  surface réelle (`surface_source`). Rejoue : `audit/reproduire-estimation.ts` ; mesure
  avant/après en base : `audit/comparables-base.ts`. Toute modification du calcul =
  entrée **majeure** dans `CHANGELOG.md` (règles en tête du fichier) + `package.json`
- Email : Resend (pas Brevo - Brevo bloquait l'envoi des comptes gratuits). `lib/email`, `EMAIL_FROM` sur domaine vérifié estimmo-direct.com. Sans clé en dev → simulation console
- CRM sans clé en dev → file en pending
- Départements sans DVF : 57, 67, 68, 976 (le brief inversait 67/68) → fallback estimation manuelle
- `annee_construction` stockée en texte (tranches du formulaire), pas en int
- Slug commune : `nom-cp` (ex. `nice-06000`), désambiguïsé par code INSEE si homonymes

## État d'avancement - PROJET LIVRÉ (14/07/2026)
- [x] Phase 1 - Socle (Next 16, migrations, auth admin)
- [x] Phase 1bis - Supabase cloud (eu-west-1, pooler aws-0) : migrations + admin + imports
- [x] 16/10/2026 - Nouveau projet Supabase gratuit (mppdrdqykslyflmejzbt) : 6 migrations, ANIL 2025, DVF compact
- [x] Phase 2 - Imports : DVF France 2023-2025 (1 721 982 ventes depuis le réimport 2.0.0 du 11/11/2026 ; 2 290 975 avant), ANIL 2025 (34 900 communes)
- [x] Phase 3 - Moteur estimation (64 tests Vitest)
- [x] Phase 4 - Formulaire 4 étapes + API leads + résultat (E2E : Nice vente/location, Strasbourg→manuelle)
- [x] Phase 5 - Brevo (simulation sans clé) + file CRM + cron (E2E mock : 500→retry backoff→sent, idempotence)
- [x] Phase 6 - Admin complet (E2E session réelle)
- [x] Phase 7 - SEO : ~35 k pages communes ISR, sitemap 34 923 URLs, JSON-LD Dataset+FAQ
- [x] Phase 8 - Lighthouse prod : landing Perf 95/SEO 100 ; commune Perf 96/SEO 100
- [x] 18/10/2026 - i18n fr/en complet (next-intl) : site, tunnel, SEO, emails, blog ; 170+ tests Vitest
- [x] 29/10/2026 - Blog : versions FR/EN dans un même article (onglets admin, `articles.traductions`) ; 274 tests
- [x] 01/11/2026 - Analytics du formulaire : événements par étape et par champ, section `/admin/analytics` ; 319 tests
- [x] 12/11/2026 - Chantier SEO pages communes (`audit/RAPPORT-seo-communes.md`) : 3.0.1 relais
  géocodage Photon, 3.0.2 correctifs techniques, 3.1.0 contenu propre à chaque commune (30 et 34
  pilotes), 3.2.0 on-page + formulaire, 3.3.0 EN noindex, 3.4.0 régions + maillage + `seo:verif`,
  3.5.0 pages Qui sommes-nous / Méthodologie ; 382 tests
- [x] 11/11/2026 - Audit du calcul de vente (`audit/`) + `CHANGELOG.md` (SemVer) ; 2.0.0 = réimport DVF avec lots distincts, ≤ 1 dépendance, surface Carrez ; 2.1.0 = frais de notaire estimés sous le résultat ; 3.0.0 = fenêtre 30 mois ancrée sur la dernière vente connue (`dvf_meta`, migration `20261111120000` appliquée le 11/11) + écrêtage Tukey dès 12 comparables ; 337 tests

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
- **Données** : `leads.locale` (email prospect dans sa langue, notification agent en FR) ;
  `articles.traductions` jsonb (29/10/2026) : un article porte sa version française dans
  ses colonnes et ses traductions par locale (`{ en: { titre, meta_title, meta_description,
  extrait, contenu_html, faq, image_cover_alt, statut, slug } }`) ; tout le reste (images,
  date, statut, catégorie, « À lire aussi ») est commun. Version EN visible = article en
  ligne ET `traductions.en.statut = 'publie'`. Sans version EN publiée, `/en/blog/x` affiche le
  français avec un bandeau (`components/blog/bandeau-langue.tsx`), `noindex`, ni canonical
  ni hreflang ; **jamais de `redirect` vers `/blog/x`** (le proxy renverrait un cookie
  `NEXT_LOCALE=en` vers `/en/…` en boucle), le lien du bandeau est le `Link` next-intl
  `locale="fr"` qui synchronise le cookie. Hreflang fr/en (page + sitemap) seulement si
  les deux versions sont en ligne. Fonctions pures : `lib/blog/traductions.ts`
  (`versionPour`, `languesEnLigne`, `traductionDepuis`, `slugsPublics`, `articleParSlug`…) ;
  requêtes : `lib/blog/publication.ts` (`articlesEnLigne(locale)` filtre en mémoire,
  `slugsEnLigne()` → Map slug fr → slugs publics).
  **Slug par langue (31/10/2026)** : la colonne `slug` (fr) reste l'identifiant stable
  (`articles_lies`, liens `/blog/<slug fr>` du corps, chemins d'images) ;
  `traductions.en.slug` (facultatif) donne l'URL `/en/blog/<slug en>`, sinon l'URL anglaise
  reprend le slug français. Tout article renvoyé par `versionPour` porte `slugs: { fr, en }`
  (slug public par langue) : les liens (`CarteArticle`, liens internes réécrits par
  `preparerHtml`, canonical/hreflang via `alternatesPour(chemins)`, sitemap via
  `entreesBilingues(chemins)`) utilisent `slugs[locale]`, jamais `slug`. La page
  `/[locale]/blog/[slug]` retrouve l'article par slug fr OU slug traduit
  (`articleEnLigne`, filtre `.or()` PostgREST sur `traductions->en->>slug`) et fait un
  `permanentRedirect` (next-intl, même locale → pas de boucle cookie) quand le slug de l'URL
  n'est pas le slug public de la langue (`/en/blog/<slug fr>` → `/en/blog/<slug en>`,
  `/blog/<slug en>` → `/blog/<slug fr>`) ; le sélecteur de langue passe par cette
  redirection. Un slug anglais n'est routable que si la version EN est publiée. Tous les
  slugs publics partagent le même espace : l'admin refuse un slug (fr ou en) déjà pris par
  un autre article (`slugDejaPris`), index unique + contrainte de forme en base
  (`20261031120000_articles_slug_traduit.sql`).
  Admin : onglets Français / English dans l'éditeur (`components/ui/tabs.tsx`, Base UI,
  `keepMounted` pour garder les deux TipTap), statut et slug propres à la version EN
  (« Depuis le titre » = slugify du titre anglais), « Partir du texte français », aperçu
  `?lang=en` ; **« Nouvel article » ouvre ce même éditeur** (`saveArticleEditorial` sans
  `id` = insertion, couverture `/images/blog/<slug>/cover.webp` 1200×630 à déposer ensuite
  depuis la section Images ; l'ancien éditeur TipTap `article-editor.tsx` ne sert plus
  qu'aux éventuels articles `contenu` jsonb, aucun en base) ; l'import JSON et le panneau
  Images ne touchent jamais `traductions`. Migrations `20261018120000_i18n_locale.sql`,
  `20261029120000_articles_traductions_integrees.sql` (ajoute `traductions`, fusionne
  l'ancien modèle `lang` + `traduction_de` du 28/10 en conservant ses colonnes pour la
  prod encore déployée) puis `20261029130000_articles_traductions_nettoyage.sql` (supprime
  `lang`/`traduction_de`, appliquée après le déploiement du nouveau code).
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

## Analytics du formulaire (01/11/2026) - `/admin/analytics`
- **Une seule source** : la table `form_events` (déjà utilisée pour l'entonnoir
  vue/complete/submit) s'enrichit de `champ`, `valeur`, `locale`, `appareil`,
  `page`, `ecoule_ms` (migration `20261101120000_analytics_formulaire.sql`,
  rétrocompatible : l'ancien code continue d'insérer). Événements :
  `view` (étape 1-4, 5 = résultat), `complete`, `submit`, `focus` (1er focus d'un
  champ texte), `saisie` (champ renseigné ; valeur seulement pour les champs à
  choix, `a,b` pour les multiples, `aucun` si vide, `oui`/`non` pour les
  booléens), `erreur` (validation affichée), `retour`, `erreur_api` (statut HTTP
  ou `reseau`), `recommencer`, `sortie` (pagehide). **Jamais de donnée
  personnelle** : adresse, email, téléphone, nom, surface… ne transmettent que
  « renseigné ». Pas de cookie, id de session tiré au chargement du formulaire.
- **Client** : `lib/analytics/suivi.ts` (`SuiviFormulaire`, pur et testé :
  file + lots de 50, délai 1,5 s, dédoublonnage, plafond 300 événements/session,
  `t` = ms depuis l'ouverture) branché dans `estimation-form.tsx` (`setField` →
  `saisie`, `onFocusCapture` du `<form>` → `focus` via l'attribut `name` des
  inputs, `validerEtape` → `erreurs`, `pagehide` → `sortie`). Transport `fetch`
  keepalive, repli `sendBeacon`. `/api/track` accepte le lot
  (`lib/analytics/evenements.ts`, Zod) et l'ancien format unitaire.
- **Agrégation en SQL** : fonction `analytics_formulaire(depuis, jusqua,
  appareil, locale, page)` → jsonb (entonnoir, abandons = sessions dont c'est la
  dernière étape vue sans submit, durées médianes vue→complete, champs
  touchés/renseignés/erreurs, dernier champ touché avant abandon, dernière
  valeur par session, série par jour Paris, segments). Service_role seulement
  (revoke anon/authenticated, comme `barometre_kpis`). Mise en forme pure :
  `lib/analytics/agregats.ts` (`preparerAnalytics`, libellés FR depuis
  `messages/fr` via `lib/analytics/libelles.ts`).
- **Lecture** : le formulaire est dans le hero de l'accueil → une « session »
  = un affichage de la page, d'où la tuile « Sessions engagées » (≥ 1 champ
  touché) et « abandons sans toucher aucun champ » à l'étape 1. L'entonnoir a
  quitté `/admin/stats` (lien vers Analytics). Les sessions antérieures au
  01/11/2026 n'ont ni champs, ni durées, ni appareil (segment « Inconnu »).
- **Exclusions** (`lib/analytics/exclusions.ts`) : les tests du propriétaire ne
  sont pas enregistrés. Par IP : `ANALYTICS_IPS_EXCLUES` (liste, vérifiée par
  `/api/track`). Par navigateur : cookie `estimmo_sans_suivi=1` (un an) posé par
  `proxy.ts` sur tout navigateur connecté à l'admin ; le tunnel ne crée alors
  aucun suivi et `/api/track` revérifie le cookie. Pour tester le suivi depuis
  son poste : navigation privée (sans cookie) ET IP absente de la variable.
- `engagees` (migration `20261101130000`) = session ayant touché un champ OU
  validé une étape (les sessions d'avant le 01/11 n'ont pas d'événements de
  champ) ; « étape la plus quittée » ignore les affichages sans interaction.
- Volume : ~40 événements/parcours complet, ~10 requêtes ; pas de purge
  automatique (à envisager si la table grossit, Supabase gratuit).

## SEO pages communes (12/11/2026) - `audit/RAPPORT-seo-communes.md`
- **Problème** : pages `/prix-immobilier/<commune>-<cp>` indexées puis désindexées (3-9 % de
  contenu unique, 74 % des communes < 10 ventes/an), `/en/` ressortant sur des requêtes FR.
- **Régime par département** (`lib/seo/indexation.ts`, `DEPARTEMENTS_PILOTES` = 30, 34) :
  page indexable si prix médian ET (≥ 10 ventes/12 mois OU ≥ 30 ventes/36 mois → médianes
  3 ans affichées, `fenetre: "36m"`) ; sinon `noindex, follow` + hors sitemap, toujours liée
  depuis la page département. Hors pilotes : statu quo (indexable, 12 mois). Étendre = ajouter
  des codes à la liste + lancer `import:dvf:annuel` pour ces départements.
- **Données** (migration `20261112110000_communes_contexte.sql`) : `communes_geo` (geo.api.gouv.fr),
  `communes_insee` (RP2022), `communes_stats_annuelles` (DVF 2021→ par année/type, agrégés à
  l'import sans stocker les mutations), `departements_stats`, colonnes 36 mois dans
  `communes_stats`, RPC `commune_contexte(code_insee)` (10 plus proches à vol d'oiseau, dept,
  séries, INSEE, dernière vente). `lib/seo/contexte.ts` renvoie null si la RPC manque : la page se
  rend sans ces sections. Migration `20261112100000` : `contenu_modifie_le` (lastmod réel, refresh
  par fusion) ; le sitemap retombe sur `updated_at` tant qu'elle n'est pas appliquée.
- **Textes** : `lib/seo/analyse.ts` (stats + contexte → faits : fenêtre, type de référence,
  tendance, volume, position vs voisines/département, évolution longue, INSEE) puis
  `lib/seo/textes.ts` (phrases à conditions, variantes par hash INSEE, FAQ 3-5). Messages dans
  `commune.json` (selects avec branche `other` obligatoire, parité fr/en testée).
- **On-page** : title absolu « Estimation immobilière {Commune} ({CP}) : prix au m² {année} »
  = H1 ; formulaire (`EstimationForm commune={…}`) sous le H1 (mobile) / colonne droite ;
  JSON-LD Dataset + FAQPage + BreadcrumbList + RealEstateAgent (`jsonLdAgentImmobilier`).
  Pages communes : canonical seul, **sans hreflang** ; `/en/` commune = `noindex, follow`.
- **Sitemaps** : `/sitemap.xml` → `pages.xml` (fixes, régions, départements, blog, fr+en) +
  `communes-<dept>.xml` (fr seulement, indexables seulement, lastmod = max(contenu_modifie_le,
  `GABARIT_COMMUNE_MODIFIE_LE`) ; **avancer cette constante à chaque changement du gabarit**).
- **Maillage** : accueil > /prix-immobilier > région (`lib/seo/regions.ts`,
  `/prix-immobilier/region/<slug>`) > département > commune ; 3 clics max ; bloc « Communes
  voisines » = 10 plus proches avec distance (repli : 8 plus actives du département).
- **Confiance** : `/qui-sommes-nous`, `/methodologie` (constantes injectées depuis le moteur),
  liées depuis chaque commune et le footer ; identité légale dans `SITE.agent` (vide = non affiché).
- **Robots** : `lib/i18n/robots.ts` reconnaît tout UA contenant « google » (Inspection Tool,
  GoogleOther) : jamais de 307 de langue pour eux.
- **Géocodage** (3.0.1) : `lib/geo/geocodage.ts` IGN → Photon (code INSEE retrouvé dans
  `communes_ref` par CP + nom) ; `citycode` pour les pages communes ; 502 + message si tout échoue.
- Performance (phase 6, 12/11/2026, Lighthouse mobile prod la-calmette) : 95, LCP 1,3 s, CLS 0,
  TBT 190 ms ; rien de bloquant, 26 Ko de JS inutilisé (bundle du formulaire).

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

## RGPD (13/11/2026, 3.6.0) - `audit/RAPPORT-rgpd-cookies.md`, `/admin/rgpd`
- **Module** `lib/rgpd/` : `constantes.ts` (durées : leads 3 ans après dernier contact,
  événements 25 mois, journal 5 ans, réponse 1 mois, version de la politique),
  `demandes.ts` (échéances, états, libellés, contrôles externes), `recherche.ts` (saisie →
  filtre PostgREST email/téléphone/nom), `export.ts` (export JSON + résumé texte fr/en),
  `serveur.ts` (requêtes service_role). Tout est testé sauf `serveur.ts`.
- **Données** (migration `20261113100000_rgpd.sql`) : `leads.dernier_contact_le` (trigger
  sur statut/notes/rappel), `leads.anonymise_le`, `email`/`telephone` nullables, emails en
  minuscules ; tables `demandes_rgpd` (journal) et `purges_rgpd` (traces) ; fonctions
  `anonymiser_leads(uuid[])` (leads + `crm_sync_queue.payload`, atomique) et
  `purger_rgpd(interval, interval, interval)` (clients `mandat_*` exclus). RLS, revoke.
- **Admin** : recherche `?q=` et badge « ×N demandes » (même email) dans `/admin/leads` ;
  fiche lead : carte RGPD (export txt/json via `/admin/leads/[id]/export`, anonymiser ou
  supprimer avec journalisation, toutes les demandes de l'email ou une seule) ; fiche
  anonymisée = lecture seule, sans contact ni notes. `/admin/rgpd` : demandes en cours
  (échéance, retard), saisie manuelle, clôture avec cases CRM/Resend/boîte mail, historique,
  purge (dernière exécution, prospects à venir sous 30 j, bouton). Le menu « … » de la liste
  garde la suppression simple non journalisée (leads de test).
- **Cron** `/api/cron/rgpd` (03:30 UTC, `CRON_SECRET`) = `executerPurge()`. Un lead
  anonymisé n'apparaît plus dans les leads d'un prospect, ne reçoit rien et ignore le lien
  « être rappelé ».
- **Politique de confidentialité** : chiffres injectés depuis `RGPD` ; toute modification
  des durées = changer la constante, la valeur par défaut SQL et `politiqueVersion`.
- Règle : jamais de donnée personnelle dans les logs (`/api/geocode` ne journalise que la
  longueur de la saisie). Pas encore de bannière cookies : à faire **avant** tout tag GTM
  (lot 3.7.0, spécification § 3 du rapport).

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
- **RGPD (13/11/2026)** : 1) `pnpm db:migrate` (migration `20261113100000_rgpd.sql`,
  validée en transaction annulée sur la prod) **avant** de déployer 3.6.0 (la liste des
  leads lit `anonymise_le`) ; 2) vérifier le cron `/api/cron/rgpd` dans Vercel après
  déploiement ; 3) décisions D1 (tags du conteneur GTM) et D7 (relecture des textes par
  Carenza) du rapport avant la bannière cookies ; 4) documents hors code : registre des
  traitements, DPA Supabase/Vercel/Resend, rétention Resend, identité légale.
- **SEO communes (12/11/2026)** : 1) `pnpm db:migrate` (migrations `20261112100000` et
  `20261112110000`, refusées au robot par le classificateur de sécurité) ; 2) `pnpm import:geo`,
  `pnpm import:insee` (France entière, ~2 min) puis `pnpm import:dvf:annuel -- --depts 30,34`
  (~10 min) ; 3) `pnpm seo:verif -- --depts 30,34` ; 4) renseigner `SITE.agent.reseau/rsac/
  siren/adresse/cartePro` (`lib/config.ts`) ; 5) Search Console : relire `/sitemap.xml`
  (index → `communes-<dept>.xml`), demander l'indexation de 5-10 communes du 30/34, suivre
  « Pages » par sitemap ; 6) après validation, étendre `DEPARTEMENTS_PILOTES` + imports.
- Analytics (01/11/2026) : appliquer `pnpm db:migrate` (migration
  `20261101120000_analytics_formulaire.sql`) **avant** de déployer : sans elle,
  les insertions de `/api/track` échouent (événements perdus) et `/admin/analytics`
  affiche un message d'erreur explicite
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
