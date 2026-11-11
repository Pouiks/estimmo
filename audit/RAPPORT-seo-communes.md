# Rapport - indexation durable des pages communes

Site : estimmo-direct.com · Chantier des 11 et 12 novembre 2026 · Versions 3.0.1 → 3.5.0
(`CHANGELOG.md`). Périmètre de départ : Gard (30) et Hérault (34).

## 1. Le problème et ses causes

Les pages `/prix-immobilier/{commune}-{cp}` apparaissaient quelques jours en position 70-80
puis disparaissaient ; la version `/en/` ressortait sur des requêtes françaises. L'audit du
11/11/2026 (lecture seule, phases 0 et 1) a confirmé l'hypothèse « pages trop minces et trop
semblables » et trouvé quatre défauts techniques :

| Constat | Mesure |
|---|---|
| Contenu unique par page (hors nom et chiffres, 5 pages comparées) | 2,6 % à 9,1 % |
| Longueur d'une page | 370 à 440 mots |
| Communes avec moins de 10 ventes sur 12 mois | 25 863 sur 34 916 (74 %) |
| Communes sans aucun prix (loyers seuls) | 5 782 |
| URLs dans les sitemaps (fr + en) | 69 832, lastmod identique partout |
| Meta description sans prix (communes sans appartement) | majorité des communes rurales |
| Google-InspectionTool / GoogleOther redirigés en 307 vers `/en/` | vérifié en prod |
| Tuile « évolution sur 1 an » affichée dès 1 vente | +15,2 % sur 15 ventes à La Calmette |

Ce qui était déjà correct : rendu serveur (ISR), 200 sans chaîne de redirections, canonical
absolu auto-référent, pas de noindex involontaire, robots.txt propre, vraie 404, JSON-LD
valides.

Incident annexe du 11/11 : la recherche d'adresse du formulaire ne répondait plus. Cause :
panne totale du géocodeur de l'IGN (504 sur tous ses points d'entrée), pas le dernier push.

## 2. Ce qui a été corrigé (par phase, un commit chacune)

| Version | Phase | Contenu |
|---|---|---|
| 3.0.1 | Incident | Relais de géocodage : IGN, puis Photon (OpenStreetMap) avec code INSEE retrouvé dans `communes_ref` ; message « service indisponible » si tout échoue ; paramètre `citycode`. Vérifié en prod : les adresses reviennent via Photon pendant la panne IGN. |
| 3.0.2 | 1 Technique | Meta description avec le bon prix (maison et/ou appartement) ; `contenu_modifie_le` = lastmod réel par commune (refresh par fusion) ; sitemaps découpés par département (`communes-30.xml`…) ; robots Google reconnus (plus de 307 de langue) ; tuile évolution masquée sous 10 ventes. |
| 3.1.0 | 2 Contenu | Nouvelles données : centres et population (geo.api.gouv.fr), INSEE logement (RP2022), séries annuelles DVF 2021-2025 par commune et type, médianes départementales, médianes 36 mois. Nouvelles sections : marché en chiffres (volume, tendance, évolution longue), prix par année, comparaison avec les 5 communes les plus proches et le département (tableau + phrases « plus chère / moins chère / dans la moyenne »), commune en bref (habitants, propriétaires, part de maisons), sources et date. FAQ de 3 à 5 questions chiffrées. Textes à conditions, deux tournures par commune. Seuil de qualité (noindex + hors sitemap). |
| 3.2.0 | 3 On-page | Title et H1 « Estimation immobilière {Commune} ({CP}) : prix au m² {année} » ; formulaire d'estimation sous le H1 (mobile) et en colonne droite (ordinateur), limité à la commune ; JSON-LD RealEstateAgent + FAQPage + BreadcrumbList + Dataset. |
| 3.3.0 | 4 Anglais | Pages communes `/en/` en `noindex, follow`, hors sitemap ; hreflang retirés des pages communes (canonical seul). Accueil, pages principales, départements, blog restent indexables en anglais. |
| 3.4.0 | 5 Maillage | 18 pages région ; arborescence accueil > prix immobilier > région > département > commune (fils d'Ariane visibles et JSON-LD) ; bloc « Communes voisines » = 10 plus proches avec distance ; `pnpm seo:verif` (orphelines, 3 clics, sitemap, canonical, noindex, JSON-LD, version EN). |
| 3.5.0 | 7 Confiance | Pages « Qui sommes-nous » et « Méthodologie » (chiffres injectés depuis le moteur), liées depuis chaque page commune et le pied de page ; mentions légales avec directrice de publication, statut, et lignes réseau / RSAC / SIREN / adresse / carte pro dès qu'elles sont renseignées. |
| - | 6 Performance | Mesuré en prod (Lighthouse mobile, La Calmette) : performance 95, LCP 1,3 s, CLS 0, TBT 190 ms. Rien de bloquant ; formulaire visible sans défilement sur mobile (capture 412×823). |

Contrôle final en prod (`pnpm seo:verif -- --depts 30,34 --n 8`) : 168 contrôles sur 168
réussis. Tests unitaires : 382 (contre 337 au départ), typecheck et lint verts.

### Seuil de qualité retenu

Une page commune est indexable si elle a un prix médian **et** au moins 10 ventes sur
12 mois, **ou** au moins 30 ventes sur 36 mois (elle affiche alors les médianes sur 3 ans,
étiquetées comme telles). Sinon : `noindex, follow`, hors sitemap, toujours accessible et
liée depuis la page département. Appliqué aux départements pilotes 30 et 34 seulement
(`DEPARTEMENTS_PILOTES`, `lib/seo/indexation.ts`) ; ailleurs rien ne change.

| Département | Communes | Indexables (règle 12 mois) | + règle 36 mois |
|---|---|---|---|
| Gard (30) | 350 | 142 | à mesurer après migration |
| Hérault (34) | 341 | 168 | à mesurer après migration |

## 3. Ce qui reste à faire

Dans l'ordre, depuis le poste de Virgile (le robot n'a pas le droit d'écrire sur la base de
prod : le lanceur de migrations lui a été refusé) :

1. `pnpm db:migrate` : applique `20261112100000_communes_stats_modifie_le.sql` (lastmod réel)
   et `20261112110000_communes_contexte.sql` (tables de contexte, colonnes 36 mois, RPC).
   Jusque-là le site fonctionne en mode dégradé : sections de contexte absentes, règle
   12 mois seule, lastmod = date du dernier recalcul.
2. `pnpm import:geo` puis `pnpm import:insee` (France entière, environ 2 minutes chacun),
   puis `pnpm import:dvf:annuel -- --depts 30,34` (millésimes 2021 à 2025, environ 10 minutes).
   Les trois acceptent `--dry-run` ; ils ont été validés ainsi le 12/11.
3. `pnpm seo:verif -- --depts 30,34` pour contrôler la prod, puis parcourir deux ou trois
   pages (ex. `/prix-immobilier/la-calmette-30190`, `/prix-immobilier/nimes-30000`).
4. Après 4 à 6 semaines de Search Console : étendre à d'autres départements en ajoutant
   leurs codes à `DEPARTEMENTS_PILOTES` et en lançant `import:dvf:annuel` pour eux.
   Prévoir l'entrée majeure au changelog (des pages sortent de l'index).
5. À chaque changement du gabarit commune : avancer `GABARIT_COMMUNE_MODIFIE_LE`
   (`lib/seo/sitemap.ts`) pour que le lastmod des sitemaps reste vrai.
6. Facultatif : performance, 26 Ko de JavaScript inutilisé dans le bundle partagé du
   formulaire ; remesurer sur le terrain une fois les pages réindexées.

## 4. À faire par Carenza

- **Search Console** (je n'ai pas accès à la propriété) : vérifier que `/sitemap.xml` est
  relu et que les fichiers `sitemaps/communes-30.xml` et `communes-34.xml` apparaissent ;
  demander l'indexation de 5 à 10 communes du Gard et de l'Hérault (La Calmette, Nîmes,
  Uzès, Lunel, Montpellier, Sète…) ; exporter le rapport Pages (motifs « Explorée,
  actuellement non indexée » et « Détectée, non indexée ») avant et après.
- **Identité légale** à transmettre pour les mentions légales et la page « Qui
  sommes-nous » (renseignée dans `lib/config.ts`, section `agent`) : statut exact
  (agent commercial en immobilier, mandataire indépendante…), réseau (iad France ?),
  numéro RSAC et ville du greffe, SIREN, adresse professionnelle, numéro de carte
  professionnelle du titulaire et CCI de délivrance. Même sans activité salariée, un site
  qui collecte des coordonnées de prospects doit identifier son éditeur (LCEN) et le
  responsable de traitement (RGPD) : c'est ce que ces deux pages font.
- **Page « Qui sommes-nous »** : relire le texte, fournir si souhaité une photo et une
  courte biographie (ancienneté, secteur habituel), à intégrer ensuite.
- **Relecture** de deux ou trois pages communes du Gard et de l'Hérault pour valider le ton
  des textes automatiques avant l'extension à la France.

## 5. Indicateurs à suivre dans la Search Console

| Indicateur | Où | Attendu |
|---|---|---|
| Pages indexées par sitemap `communes-30.xml` / `communes-34.xml` | Indexation > Sitemaps, puis Pages filtré par sitemap | Toutes les URLs envoyées « Indexées » sous 4 à 6 semaines |
| « Explorée, actuellement non indexée » et « Détectée, non indexée » | Indexation > Pages | En baisse continue sur `/prix-immobilier/` |
| « Exclue par la balise noindex » | Indexation > Pages | Égale aux communes sous le seuil (30/34) et aux pages `/en/prix-immobilier/` : normal |
| Impressions et clics sur `/prix-immobilier/` (fr) | Performances, filtre Page contient `/prix-immobilier/` et exclure `/en/` | Impressions stables puis croissantes ; position moyenne < 50 à 8 semaines |
| Requêtes « estimation immobilière {commune} » et « prix immobilier {commune} » | Performances, filtre Requête | Apparition des communes pilotes |
| Impressions des pages `/en/prix-immobilier/` | Performances, filtre Page contient `/en/prix-immobilier/` | Vers zéro |
| Signaux Web essentiels (mobile) | Expérience | URLs « Bonnes » (LCP < 2,5 s, CLS < 0,1, INP < 200 ms) |
| Résultats enrichis FAQ et fil d'Ariane | Améliorations | Sans erreur ; FAQ affichée seulement sur sites gouvernementaux et santé depuis 2023, le balisage reste utile |
| Statistiques d'exploration | Paramètres > Statistiques sur l'exploration | Moins de requêtes sur `/en/`, plus sur les communes pilotes |

Point de contrôle conseillé : à J+15 (indexation relancée), J+45 (positions), J+90 (décision
d'extension à la France).
