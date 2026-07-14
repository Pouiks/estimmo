# PROMPT MAÎTRE — Estimateur immobilier & générateur de leads


---

## Contexte et objectif

Tu vas construire une application web de génération de leads pour un professionnel de l'immobilier opérant sur **toute la France**. Le visiteur (prospect vendeur ou bailleur) remplit un formulaire en 4 étapes décrivant son bien, laisse ses coordonnées, et reçoit une **estimation de prix (vente) ou de loyer (location)** basée sur les données publiques françaises. Chaque soumission crée un lead scoré, stocké en base, poussé vers un CRM externe, et déclenche un email de confirmation.

Objectif business : capter les coordonnées AVANT d'afficher le résultat, scorer les leads par intention, et convertir en rendez-vous puis en mandat (de préférence exclusif).

**Marque / nom du site** : `ESTIMMO`
**Honoraires affichés** : `entre 3 et 7% en mandat exclusif` vs `Entre 3 et 6% en mandat simple`
**Coordonnées de l'agent (email résultat + footer)** : `Carenza Brown — 06 12 34 56 78 — browncarenza@gmail.com`

---

## Stack imposée (non négociable)

- **Next.js 15+ (App Router, TypeScript)** — monorepo unique, un seul déploiement
- **Hébergement : Vercel**
- **Base de données : Supabase** (Postgres + extension **PostGIS** activée + Supabase Auth + Storage)
- **Email transactionnel : Brevo** (API v3)
- **Géocodage : Géoplateforme IGN** — `https://data.geopf.fr/geocodage/search/` (ne PAS utiliser api-adresse.data.gouv.fr, décommissionnée)
- **Styling : Tailwind CSS + shadcn/ui**
- **Éditeur blog : TipTap** (contenu stocké en JSON dans Supabase)
- Validation : **Zod** partout (formulaires + API)

---

## Architecture du repo

Une seule app Next.js, trois zones logiques :

```
/app
  /(site)              → public, SEO maximal
    /page.tsx          → landing avec CTA estimation
    /estimation        → formulaire 4 étapes + écran résultat
    /prix-immobilier/[slug-commune]  → pages SEO programmatiques
    /blog et /blog/[slug]
    /mentions-legales, /politique-confidentialite
  /(admin)             → protégé par Supabase Auth (rôle admin)
    /admin/leads       → liste, filtres, détail, statut d'appel
    /admin/blog        → CRUD articles (TipTap)
    /admin/estimations-manuelles → file des leads en zone non couverte
    /admin/stats       → volume leads, taux de complétion par étape
  /api
    /leads             → POST création lead (transactionnel)
    /estimation        → POST calcul estimation
    /geocode           → proxy géocodage IGN (cache)
    /cron/crm-sync     → retry file de synchro CRM (Vercel Cron)
    /revalidate        → revalidation ISR à la publication d'un article
/scripts               → hors runtime Vercel, exécutés en local ou GitHub Action
  /import-dvf.ts       → téléchargement + nettoyage + import DVF
  /import-loyers.ts    → import Carte des loyers ANIL
/lib
  /estimation          → moteur de calcul (pur, testable)
  /crm                 → client de push CRM + file de retry
  /brevo, /supabase, /geocode
```

---

## Schéma de base de données (Supabase / SQL)

Créer les migrations SQL suivantes (adapter les types au besoin, activer RLS partout, accès service-role côté serveur uniquement) :

```sql
-- Transactions DVF nettoyées (import semestriel)
create table dvf_mutations (
  id bigserial primary key,
  date_mutation date not null,
  valeur_fonciere numeric not null,
  type_local text not null check (type_local in ('appartement','maison')),
  surface_reelle_bati numeric not null,
  nb_pieces int,
  code_insee text not null,
  code_postal text,
  geom geometry(Point, 4326) not null,
  prix_m2 numeric generated always as (valeur_fonciere / nullif(surface_reelle_bati,0)) stored
);
create index on dvf_mutations using gist (geom);
create index on dvf_mutations (code_insee, type_local, date_mutation);

-- Indicateurs de loyers ANIL (import annuel)
create table loyers_communes (
  code_insee text primary key,
  loyer_m2_appartement numeric,
  loyer_m2_appt_t1_t2 numeric,
  loyer_m2_appt_t3_plus numeric,
  loyer_m2_maison numeric,
  millesime int not null
);

-- Stats agrégées par commune (pré-calculées, alimentent les pages SEO)
create table communes_stats (
  code_insee text primary key,
  nom_commune text not null,
  slug text unique not null,
  departement text,
  prix_m2_median_appartement numeric,
  prix_m2_median_maison numeric,
  nb_ventes_12m int,
  evolution_1an_pct numeric,
  updated_at timestamptz default now()
);

-- Leads
create table leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  -- contact
  prenom text, nom text, email text not null, telephone text not null,
  consentement_rgpd boolean not null, date_consentement timestamptz not null,
  -- projet & bien
  projet text not null check (projet in ('vente','location')),
  horizon text check (horizon in ('en_vente','moins_3_mois','3_6_mois','curiosite')),
  type_bien text not null check (type_bien in ('appartement','maison')),
  adresse_libelle text, code_insee text, lat double precision, lon double precision,
  surface numeric not null, surface_type text check (surface_type in ('carrez','habitable')),
  pieces int, chambres int, etage int, ascenseur boolean,
  surface_terrain numeric, annee_construction int,
  exterieur text[], stationnement text,
  etat_general text, age_cuisine text, age_sdb text, dpe text,
  atouts text[],
  -- estimation
  estimation jsonb,           -- fourchette, prix_m2_zone, nb_comparables, rayon, confiance
  estimation_manuelle boolean default false,  -- true si zone non couverte
  score_lead int,
  -- suivi commercial
  statut text default 'nouveau' check (statut in ('nouveau','appele','rdv','mandat_simple','mandat_exclusif','perdu')),
  notes text
);

-- File de synchronisation CRM (jamais perdre un lead)
create table crm_sync_queue (
  id bigserial primary key,
  lead_id uuid references leads(id),
  payload jsonb not null,
  idempotency_key uuid not null default gen_random_uuid(),
  status text default 'pending' check (status in ('pending','sent','failed')),
  attempts int default 0,
  last_error text,
  created_at timestamptz default now()
);

-- Blog
create table articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  titre text not null,
  meta_description text,
  contenu jsonb not null,        -- JSON TipTap
  image_cover text,
  statut text default 'brouillon' check (statut in ('brouillon','publie')),
  published_at timestamptz, updated_at timestamptz default now()
);
```

---

## Scripts d'ingestion des données (hors Vercel)

### `scripts/import-dvf.ts`
1. Télécharger les fichiers DVF géolocalisés depuis data.gouv.fr (fichiers « DVF géolocalisées » d'Etalab, CSV par année : `https://files.data.gouv.fr/geo-dvf/latest/csv/`) pour les **3 dernières années**.
2. Nettoyage strict avant insertion :
   - garder uniquement `nature_mutation = 'Vente'` (exclure VEFA, échanges, adjudications)
   - `type_local` ∈ {Appartement, Maison}
   - surface bâtie entre 8 et 500 m² ; valeur foncière entre 5 000 € et 10 M€
   - prix/m² entre 200 et 25 000 €/m² (borne anti-aberrations)
   - dédupliquer les mutations multi-lignes (même id_mutation) : ne garder qu'une ligne par mutation mono-local ; exclure les mutations multi-locaux hétérogènes
   - coordonnées lat/lon obligatoires
3. Insertion par batchs de 5 000 lignes dans `dvf_mutations`.
4. Recalculer `communes_stats` (médianes 12 mois glissants par commune et type, évolution vs année précédente, slugs URL-safe type `nice-06000`).
5. Le script est **idempotent** (truncate + reload par millésime). Il tourne en local ou via GitHub Action, jamais sur Vercel. Prévoir une exécution en avril et octobre (calendrier de publication DVF).

### `scripts/import-loyers.ts`
Importer le dernier millésime de la « Carte des loyers » ANIL (CSV sur data.gouv.fr, indicateurs par commune : appartement T1-T2, T3+, toutes typologies, maison) dans `loyers_communes`. **Obligation légale** : afficher la mention « Estimations ANIL, à partir des données du Groupe SeLoger et de leboncoin » partout où un loyer est affiché.

---

## Moteur d'estimation (`lib/estimation`)

Fonctions pures, testées unitairement (Vitest).

### Vente
1. Entrée : lat/lon, code INSEE, type de bien, surface, réponses qualitatives.
2. Recherche de comparables dans `dvf_mutations` via PostGIS (`ST_DWithin`) :
   - même `type_local`, surface entre 0,7× et 1,3× la surface saisie, mutation < 30 mois
   - rayons successifs : **400 m → 800 m → 1 500 m → 3 000 m → commune entière → département**
   - s'arrêter au premier palier donnant **≥ 8 comparables** ; retenir le palier atteint
3. Prix/m² de référence = **médiane pondérée** : poids = (1/(1+distance_km)) × (1/(1+ancienneté_mois/12)).
4. Coefficients d'ajustement (multiplicatifs, chacun borné, **somme totale plafonnée à ±25 %**) :
   - état général : à rénover −15 %, à rafraîchir −7 %, bon 0 %, refait à neuf +8 %
   - âge cuisine : <5 ans +3 %, 5-10 ans 0 %, 10-20 ans −2 %, >20 ans −4 %
   - âge salle de bain : mêmes paliers
   - DPE : A/B +5 %, C/D 0 %, E −4 %, F −8 %, G −12 %
   - appartement : RDC −5 %, dernier étage avec ascenseur +5 %, étage ≥2 sans ascenseur −3 %
   - extérieur : balcon +3 %, terrasse +5 %, jardin +6 % (non cumulables, prendre le max)
   - stationnement : garage/box +4 %, place +2 %
5. Sortie :
   - `mediane = prix_m2_ajusté × surface`
   - fourchette = médiane ± un pourcentage fonction de la **dispersion** des comparables (écart interquartile) : min ±6 %, max ±15 %
   - `confiance` : haute (≥15 comparables, rayon ≤800 m), moyenne (≥8, rayon ≤3 km), faible (sinon)
6. **Fallback estimation manuelle** : si code INSEE en Haut-Rhin (67), Bas-Rhin (68), Moselle (57) ou Mayotte (976) — absents de DVF — OU si <8 comparables même au niveau département : ne pas afficher de chiffre. Afficher l'écran « Votre secteur nécessite une analyse personnalisée — estimation offerte sous 24 h, nous vous rappelons ». Le lead est créé avec `estimation_manuelle = true` et apparaît en tête de la file admin.

### Location
Loyer mensuel estimé = `loyer_m2` de la commune (choisir la colonne selon type et typologie : T1-T2 si ≤2 pièces, T3+ sinon, maison) × surface. Fourchette ±10 %. Ajustements limités : état général (−8 % à +5 %) et DPE (F/G −8 % — mentionner l'interdiction de louer les passoires selon le calendrier légal en vigueur). Confiance toujours « indicative » + mention source ANIL.

---

## Formulaire d'estimation (4 étapes)

Composant multi-étapes avec barre de progression, state persisté (localStorage n'est pas nécessaire : state React + parametre de reprise), validation Zod par étape, navigation retour possible. Mobile-first. Tracker le taux d'abandon par étape (event simple en base ou analytics).

**Étape 1 — Votre projet**
- Vendre / Mettre en location (toggle)
- Si vente : horizon → « Déjà en vente » / « Moins de 3 mois » / « 3 à 6 mois » / « Simple curiosité »
- Type de bien : Appartement / Maison
- Adresse : champ avec **autocomplétion Géoplateforme IGN** (debounce 300 ms, via le proxy `/api/geocode` pour cacher et logger). Stocker libellé + code INSEE + lat/lon.

**Étape 2 — Votre bien**
- Surface : label dynamique → « Surface Carrez » si appartement (tooltip : « Surface privative hors caves, parkings, balcons et parties sous 1,80 m ») / « Surface habitable » si maison
- Nombre de pièces, nombre de chambres
- Si appartement : étage + ascenseur (oui/non)
- Si maison : surface du terrain
- Année de construction (tranches : avant 1950 / 1950-1975 / 1975-2000 / 2000-2012 / après 2012)
- Extérieur (multi) : aucun / balcon / terrasse / jardin
- Stationnement : aucun / place / garage-box

**Étape 3 — État du bien**
- État général : à rénover / à rafraîchir / bon état / refait à neuf (cartes cliquables illustrées)
- Âge de la cuisine : moins de 5 ans / 5-10 ans / 10-20 ans / plus de 20 ans
- Âge de la salle de bain : mêmes tranches
- DPE : A → G / « Je ne sais pas »
- Atouts (multi, optionnel) : vue dégagée / lumineux / calme / dernier étage / traversant

**Étape 4 — Vos coordonnées** (l'estimation ne s'affiche qu'après)
- Prénom, Nom, Email (validé), **Téléphone (obligatoire, format FR validé)**
- Case à cocher obligatoire : consentement explicite RGPD (« J'accepte que mes données soient utilisées pour me recontacter au sujet de mon projet immobilier — voir politique de confidentialité »)
- Bouton « Voir mon estimation »

À la soumission : POST `/api/leads` → calcul estimation + score + insertion lead + enqueue CRM + envoi email Brevo → redirection écran résultat.

**Score du lead (0-100)** : horizon (en_vente 40 / <3 mois 35 / 3-6 mois 20 / curiosité 5) + projet vente 20 (location 10) + téléphone valide 20 + DPE renseigné 10 + atouts renseignés 10.

---

## Écran résultat

- Fourchette basse / **médiane mise en avant** / haute + prix au m² de la zone
- Indice de confiance + « basé sur N ventes comparables dans un rayon de X m » (vente) ou mention ANIL (location)
- Bloc commercial : « Vendez au meilleur prix » → honoraires **`a partir de 3%` % en exclusivité** (avantages listés : diffusion prioritaire, photos pro, engagement de moyens) vs `minimum 6` % en mandat simple. CTA principal : « Être rappelé pour affiner mon estimation » (déjà fait, message de confirmation) + téléphone cliquable.
- Disclaimer : « Estimation indicative fondée sur les données publiques DVF/ANIL, ne constitue pas un avis de valeur. Une visite est nécessaire pour un prix précis. »

## Email de confirmation (Brevo)

Template transactionnel envoyé immédiatement : récapitulatif du bien, fourchette d'estimation (ou « analyse manuelle sous 24 h »), coordonnées complètes de l'agent `Carenza Brown — 06 12 34 56 78 — browncarenza@gmail.com`, CTA « Prendre rendez-vous », rappel honoraires exclusif vs simple, lien politique de confidentialité et désinscription. Envoyer aussi une **notification interne** à l'agent pour chaque lead avec le score et le téléphone.

---

## Push CRM (contrat d'interface)

Le CRM est externe et développé par le propriétaire. Ne jamais bloquer le parcours utilisateur sur le CRM :
1. Le lead est TOUJOURS écrit dans Supabase d'abord.
2. Une ligne est insérée dans `crm_sync_queue` avec le payload ci-dessous.
3. Un Vercel Cron (`/api/cron/crm-sync`, toutes les 5 min) dépile : POST vers `process.env.CRM_WEBHOOK_URL` avec headers `Authorization: Bearer ${CRM_API_KEY}` et `Idempotency-Key`. Succès (2xx) → `sent`. Échec → retry avec backoff, max 10 tentatives, puis `failed` + visible dans l'admin.

Payload :
```json
{
  "contact": { "prenom": "", "nom": "", "email": "", "telephone": "",
    "consentement_rgpd": true, "date_consentement": "ISO8601" },
  "bien": { "projet": "vente|location", "horizon": "", "type": "appartement|maison",
    "adresse": { "libelle": "", "code_insee": "", "lat": 0, "lon": 0 },
    "surface": 0, "surface_type": "carrez|habitable", "pieces": 0, "chambres": 0,
    "etage": null, "ascenseur": null, "surface_terrain": null,
    "annee_construction": "", "exterieur": [], "stationnement": "",
    "etat_general": "", "age_cuisine": "", "age_sdb": "", "dpe": "" },
  "estimation": { "fourchette_basse": 0, "mediane": 0, "fourchette_haute": 0,
    "prix_m2_zone": 0, "nb_comparables": 0, "rayon_m": 0, "confiance": "",
    "manuelle": false },
  "meta": { "source": "estimateur_web", "lead_id": "uuid", "score_lead": 0, "utm": {} }
}
```

---

## SEO (priorité absolue du front public)

1. **Pages programmatiques** `/prix-immobilier/[slug-commune]` générées depuis `communes_stats` :
   - contenu : prix m² médian appartement/maison, nombre de ventes 12 mois, évolution, loyer moyen ANIL, texte généré par template avec variables (pas de duplicate content brut : varier les structures de phrases selon des gabarits), CTA estimation pré-rempli avec la commune
   - **ISR** avec revalidation 24 h ; `generateStaticParams` sur les ~2 000 communes les plus peuplées au build, le reste à la demande
   - metadata dynamiques (title « Prix immobilier à {Commune} ({CP}) — Prix au m² {année} »), OpenGraph, JSON-LD (`Dataset` + `FAQPage` avec 3-4 Q/R sur les prix locaux)
   - maillage interne : communes voisines du même département en bas de page
2. **CONTRAINTE LÉGALE DVF** : n'afficher publiquement que des **statistiques agrégées**. Ne jamais publier ni rendre indexable une liste de transactions individuelles (adresse + prix) — la licence DGFiP interdit la ré-identification et l'indexation des données par les moteurs de recherche.
3. Blog : rendu SSG/ISR depuis Supabase, revalidation on-demand à la publication (`/api/revalidate`), slugs propres, images optimisées `next/image`.
4. `sitemap.xml` dynamique (pages communes + articles publiés + pages statiques), `robots.txt` (bloquer `/admin` et `/api`).
5. Core Web Vitals : composants server par défaut, JS client minimal (formulaire uniquement), fonts locales, pas de layout shift.

---

## Admin `(admin)`

- Auth : Supabase Auth, email/password, table `profiles` avec rôle ; middleware Next.js protégeant `/admin/*`.
- **Leads** : tableau filtrable (statut, score, projet, date), tri par score décroissant, détail complet, changement de statut, champ notes, bouton « rejouer la synchro CRM » pour les `failed`, export CSV.
- **Estimations manuelles** : file dédiée des leads `estimation_manuelle = true`, badge d'alerte.
- **Blog** : liste, création/édition TipTap (titres, images via Supabase Storage, gras, listes, liens), champs SEO (slug, meta description), brouillon/publié, déclenchement revalidation ISR.
- **Stats** : leads par jour/semaine, répartition par score, taux de complétion par étape du formulaire.

---

## RGPD & légal

- Consentement explicite stocké avec horodatage ; finalité claire.
- Page politique de confidentialité : responsable de traitement `CARENZA BROWN`, finalités (estimation + recontact commercial), durée de conservation des leads **3 ans après dernier contact**, droits d'accès/rectification/suppression via `browncarenza@gmail.com`.
- Mentions légales complètes ; bannière cookies uniquement si un outil analytics dépose des cookies (préférer un analytics sans cookie type Vercel Analytics).
- Mention source ANIL sur tout affichage de loyer ; mention « source : DVF — data.gouv.fr » sur les stats de vente.

---

## Variables d'environnement

```
NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
BREVO_API_KEY / BREVO_SENDER_EMAIL
CRM_WEBHOOK_URL / CRM_API_KEY
CRON_SECRET
ADMIN_NOTIFICATION_EMAIL
NEXT_PUBLIC_SITE_URL
```

---

## Ordre de développement (respecter ces phases, livrer et vérifier à chaque fin de phase)

1. **Socle** : init Next.js + Supabase + migrations SQL + auth admin minimale.
2. **Data** : scripts d'import DVF (tester sur 1 département d'abord, ex. 06) + import ANIL + calcul `communes_stats`.
3. **Moteur** : lib d'estimation vente + location, avec tests unitaires sur des cas réels (Paris, ville moyenne, rural, Alsace → fallback).
4. **Formulaire** : 4 étapes + API leads + écran résultat + score.
5. **Notifications** : email Brevo (prospect + interne) + file CRM + cron de synchro.
6. **Admin** : leads, estimations manuelles, blog.
7. **SEO** : pages programmatiques communes, sitemap, JSON-LD, metadata.
8. **Finitions** : pages légales, analytics, tests de bout en bout du parcours.

## Critères d'acceptation

- Un prospect à Nice obtient une fourchette cohérente avec ≥8 comparables et reçoit son email en <1 min.
- Un prospect à Strasbourg (Bas-Rhin) obtient l'écran « analyse manuelle » et le lead apparaît dans la file admin dédiée.
- Si `CRM_WEBHOOK_URL` répond 500, le lead est quand même en base et la synchro est retentée automatiquement.
- Aucun affichage de transaction DVF individuelle n'est accessible publiquement.
- Les pages `/prix-immobilier/[commune]` sont servies en statique avec metadata et JSON-LD valides.
- Lighthouse SEO ≥ 95 et Performance ≥ 90 sur la landing et une page commune.