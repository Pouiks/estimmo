# Changelog - ESTIMMO

Toutes les modifications notables du site sont consignées ici, de la plus récente à la
plus ancienne. Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
numéros de version selon [SemVer](https://semver.org/lang/fr/).

## Règles de version

Une version s'écrit **MAJEUR.MINEUR.CORRECTIF** (ex. 2.1.3).

| Niveau | Quand | Exemples |
|---|---|---|
| **Majeur** (X.0.0) | Le changement modifie les chiffres vus par les prospects (méthode de calcul, règles de nettoyage DVF, réimport avec nouvelles règles) ou casse une compatibilité (schéma de base, format d'API, URLs). Il faut prévenir le client avant de déployer. | nouvelle règle de dédoublonnage DVF, fenêtre de comparables changée, suppression d'une colonne |
| **Mineur** (x.Y.0) | Nouvelle fonctionnalité ou amélioration qui ne change pas les résultats existants. | nouvel écran admin, nouvel affichage sur le résultat, nouvelle langue |
| **Correctif** (x.y.Z) | Correction d'un défaut, sans nouvelle fonctionnalité ni changement de méthode. | texte erroné, lien cassé, erreur d'affichage |
| **Correctif critique** | Correctif publié en urgence : faille de sécurité, résultat faux en production, site indisponible. Même numérotation qu'un correctif, entrée marquée **[critique]** avec l'heure de mise en production. | fuite de données, estimation à zéro |

Chaque version comporte au plus cinq rubriques : **Ajouté**, **Modifié**, **Corrigé**,
**Supprimé**, **Sécurité**. Chaque ligne dit **quoi**, **pourquoi** et **l'effet visible**
(pour le prospect, le client ou l'admin). Les changements de méthode de calcul donnent
les chiffres **avant / après** sur le point de référence de l'audit (Béziers, section
34032 000PX, `audit/comparables-base.ts`).

`package.json` porte le numéro de la dernière version publiée ; il est mis à jour dans
le même commit que l'entrée du changelog.

## [Non publié]

- Phase 6 du chantier SEO (performance), mesurée le 12/11/2026 en prod sur
  `/prix-immobilier/la-calmette-30190` (Lighthouse 12, mobile simulé) : performance 95,
  LCP 1,3 s, CLS 0, TBT 190 ms, poids 424 Ko ; aucun script bloquant, polices préchargées.
  Seul reste 26 Ko de JavaScript inutilisé dans le bundle partagé du formulaire : aucun
  correctif engagé, le formulaire doit rester visible sans défilement. À remesurer sur le
  terrain (Search Console → Signaux Web essentiels) une fois les pages réindexées.
- Propositions restantes de l'audit du calcul : P6 (contrôle du géocodage), P7 (fourchette),
  P8 (rayon à l'écran), P9 (identifiant de mutation), P10.

## [3.5.2] - 2026-11-12

### Corrigé
- **Comparaison avec les voisines faussée par les très petites communes** : après l'import,
  La Calmette ressortait « 34 % plus chère » que ses voisines parce que Dions (3 ventes,
  1 182 €/m²) et La Rouvière (5 ventes) entraient dans la médiane. Une voisine est maintenant
  comparée avec la même exigence que la commune : médiane 12 mois si au moins 10 ventes par
  an, sinon médiane 3 ans si au moins 30 ventes sur 3 ans, sinon exclue de la comparaison
  (elle reste dans les liens). Note explicative sous le tableau.

## [3.5.1] - 2026-11-12

### Corrigé
- **`--depts 30,34` ignoré sous PowerShell** : PowerShell transmet « 30 34 » (virgule
  remplacée par un espace) et les scripts `import:dvf:annuel` et `import:dvf` cherchaient un
  département « 30 34 » inexistant (« fichier absent » sur tous les millésimes, 0 ligne).
  Les listes de départements et de millésimes acceptent maintenant virgules et espaces.

## [3.5.0] - 2026-11-12

Phase 7 du chantier SEO : confiance et crédibilité.

### Ajouté
- **Page « Qui sommes-nous »** (`/qui-sommes-nous`, fr/en, indexable, sitemap) : la
  conseillère, son statut, ses coordonnées, les engagements (gratuit, données
  vérifiables, confidentialité, honoraires annoncés), la zone couverte ; fiche
  `RealEstateAgent` et fil d'Ariane en JSON-LD.
- **Page « Méthodologie »** (`/methodologie`, fr/en, indexable, sitemap) : sources (DVF,
  ANIL, INSEE, IGN/Photon), règles de nettoyage des ventes, calcul des prix par commune
  (médiane 12 mois ancrée sur la dernière vente publiée, 36 mois sous 10 ventes, seuil de
  qualité), méthode d'estimation d'un bien (paliers, 8 comparables, fenêtre 30 mois,
  écrêtage dès 12 ventes, médiane pondérée, ajustements ±25 %, fourchette, confiance),
  limites. Les nombres sont injectés depuis les constantes du moteur
  (`lib/estimation/vente.ts`, `scripts/dvf-clean.ts`, `lib/seo/indexation.ts`) : la page
  ne peut pas diverger du code.
- **Liens** vers ces deux pages depuis chaque page commune (bloc « Sources et mise à
  jour ») et depuis le pied de page de tout le site.
- **Mentions légales** : directrice de la publication, statut, et lignes réseau, RSAC,
  SIREN, adresse professionnelle, carte professionnelle affichées dès qu'elles sont
  renseignées dans `lib/config.ts` (`SITE.agent.reseau`, `rsac`, `siren`, `adresse`,
  `cartePro`, vides pour l'instant : **à compléter par la cliente**). La politique de
  confidentialité existait déjà (responsable, données, finalités, destinataires,
  conservation, droits, cookies) ; les deux pages restent en noindex.

## [3.4.0] - 2026-11-12

Phase 5 du chantier SEO : maillage interne.

### Ajouté
- **Pages région** `/prix-immobilier/region/<slug>` (18 régions, `lib/seo/regions.ts`,
  namespace `region`) listant leurs départements avec le nombre de communes, et les
  autres régions. Arborescence complète : accueil > prix immobilier > région >
  département > commune, reflétée dans les fils d'Ariane (visibles et JSON-LD) des
  pages département et commune. Les pages région sont dans `/sitemaps/pages.xml` (fr/en).
- **« Communes voisines de {Commune} »** : le bloc de liens du bas de page renvoie
  vers les 10 communes les plus proches à vol d'oiseau avec leur distance (données de
  la phase 2) ; sans ces données, les 8 communes les plus actives du département, comme
  avant. Le tableau de comparaison (5 plus proches) lie aussi chaque commune.
- **`pnpm seo:verif`** (`scripts/seo-verif.ts`) : contrôle de bout en bout sur le site
  déployé, par département : chaque commune est liée depuis sa page département (aucune
  orpheline, 3 clics depuis l'accueil : accueil → prix immobilier → département →
  commune), sitemap du département = communes indexables en base, et pour un
  échantillon de communes : 200 sans redirection, canonical auto-référent, noindex
  cohérent avec le seuil, H1 unique, aucun hreflang, formulaire présent, JSON-LD
  attendus, version anglaise en noindex. Code de sortie 1 en cas d'échec.
- Le hub `/prix-immobilier` liste les régions au-dessus des départements.

## [3.3.0] - 2026-11-12

Phase 4 du chantier SEO : version anglaise des pages communes.

### Modifié
- **Pages communes `/en/prix-immobilier/…` en `noindex, follow`** et retirées des sitemaps
  (`communes-<dept>.xml` ne liste plus que les URLs françaises). Elles restent
  accessibles (sélecteur de langue, liens) et transmettent leurs liens. Motif : copie
  traduite de la page française, elles ressortaient sur des requêtes françaises quand la
  version française sortait de l'index, et diluaient le crawl sur 69 832 URLs.
- **Hreflang retirés des pages communes** (français comme anglais) : un hreflang vers une
  page noindex est ignoré par Google et rend les signaux incohérents ; chaque page commune
  garde un canonical auto-référent. L'accueil, les pages principales, les départements et
  le blog restent indexables en anglais avec leurs hreflang fr/en/x-default.

## [3.2.0] - 2026-11-12

Phase 3 du chantier SEO : optimisation on-page des pages communes.

### Modifié
- **Title et H1 au format cible** : « Estimation immobilière {Commune} ({CP}) : prix au
  m² {année} » (environ 60 caractères, sans le suffixe « | ESTIMMO » sur ces pages pour
  tenir la longueur), H1 identique ; hiérarchie H2 (sections) / H3 (questions de la
  FAQ) inchangée. La meta description (prix médian + appel à l'estimation) date de 3.0.2.
- **Formulaire d'estimation dans le haut de page** : le tunnel complet (le même que
  l'accueil) est affiché juste sous le H1 sur mobile et en colonne de droite sur
  ordinateur, donc visible sans défilement. La recherche d'adresse est limitée à la
  commune de la page (`citycode` IGN, filtre après résolution pour Photon) avec un
  placeholder « Numéro et rue à {Commune} ». Le bloc d'appel à l'action du bas renvoie
  au formulaire (`#estimation`) au lieu de la page /estimation.
- **JSON-LD** : fiche `RealEstateAgent` (marque, conseillère, service d'estimation
  gratuit, zone desservie = la commune) ajoutée sur chaque page commune, construite par
  le même code que l'accueil (`jsonLdAgentImmobilier`, testé) ; `BreadcrumbList`,
  `FAQPage` et `Dataset` conservés. Validé : JSON bien formé (`serialiserJsonLd`),
  types et propriétés schema.org attendus par Google (name, url, telephone, priceRange,
  mainEntity Question/Answer, itemListElement).
- Texte du bloc d'appel à l'action réécrit (gratuit, immédiat, conseillère locale).

## [3.1.0] - 2026-11-12

Phase 2 du chantier SEO : chaque page commune porte des informations propres à la
commune (plus seulement un gabarit où le nom change). Déployé d'abord sur le **Gard (30)
et l'Hérault (34)** (`DEPARTEMENTS_PILOTES`, `lib/seo/indexation.ts`), extension à la
France après validation. Deux actions à lancer par le client, dans l'ordre :
`pnpm db:migrate` (migration `20261112110000_communes_contexte.sql`), puis les imports
`pnpm import:geo`, `pnpm import:insee` (France entière, quelques minutes) et
`pnpm import:dvf:annuel -- --depts 30,34` (millésimes 2021 à 2025, ~10 min). Sans eux
le site fonctionne : les nouvelles sections n'apparaissent que là où les données existent.

### Ajouté
- **Données de contexte** (migration `20261112110000`) : tables `communes_geo` (centre
  et population, geo.api.gouv.fr), `communes_insee` (logements, résidences principales,
  propriétaires occupants, maisons/appartements, recensement INSEE 2022),
  `communes_stats_annuelles` (médiane et volume par commune, année civile et type de
  bien, DVF 2021 → 2025, agrégés à l'import sans stocker les mutations : plan Supabase
  gratuit préservé), `departements_stats` (médianes départementales) ; colonnes
  `nb_ventes_36m` et médianes sur 36 mois dans `communes_stats` ; fonction
  `commune_contexte()` (tout le contexte en un appel, dont les 10 communes les plus
  proches à vol d'oiseau parmi celles qui ont une page). Scripts `scripts/import-geo.ts`,
  `scripts/import-insee.ts` (zip INSEE lu avec fflate), `scripts/import-dvf-annuel.ts`
  (mêmes règles de nettoyage que l'import principal).
- **Nouvelles sections de la page commune** (`lib/seo/analyse.ts` → faits,
  `lib/seo/textes.ts` → phrases) : « Le marché en chiffres » (volume de ventes faible /
  moyen / fort, tendance sur un an, évolution longue depuis la première année fiable) ;
  « Prix au m² par année » (tableau appartements / maisons, ventes par année) ;
  « {Commune} face aux communes voisines » (phrase et tableau : 5 communes les plus
  proches avec distance, prix médian du type de bien dominant et ventes, ligne du
  département ; plus chère / moins chère / dans la moyenne avec l'écart en %) ;
  « {Commune} en bref » (habitants, propriétaires occupants, part de maisons, parc
  dominé par la maison, l'appartement ou mixte) ; « Sources et mise à jour » (date de la
  dernière vente DVF publiée, millésime INSEE et ANIL, date de mise à jour des chiffres).
  Toutes les phrases dépendent des chiffres et existent en deux tournures choisies par
  commune ; 3 variantes d'introduction × 2 de tendance × 2 de volume × 2 de comparaison.
- **FAQ de 3 à 5 questions chiffrées** : prix appartement, prix maison, « Les prix
  montent-ils ? » (évolution 1 an et longue), « Plus chère que les voisines ? », loyer,
  comment estimer ; balisage FAQPage identique au visible. `Dataset` JSON-LD porte
  `dateModified`.
- **Seuil de qualité** (`regimeCommune`) : dans les départements pilotes, une page est
  indexable si elle a un prix médian et au moins 10 ventes sur 12 mois, ou au moins 30
  ventes sur 36 mois (elle affiche alors les médianes sur 3 ans, étiquetées comme
  telles, intro, tuiles et FAQ adaptées). Sinon : `noindex, follow`, hors sitemap,
  toujours accessible et liée depuis la page département. Gard : 142 communes sur 350
  indexables par la règle 12 mois, Hérault : 168 sur 341 ; la règle 36 mois en ajoute
  (chiffre exact après `pnpm db:migrate`). Hors pilotes : rien ne change.
- 51 tests unitaires (analyse, seuil, textes conditionnels, FAQ, médiane des scripts).

### Modifié
- Les textes d'origine (intro, tuiles, FAQ prix) disent explicitement la fenêtre
  (12 mois ou 3 ans) ; les pages sans contexte importé gardent leur rendu précédent.
- `GABARIT_COMMUNE_MODIFIE_LE` avancé au 12/11/2026 12:00 (lastmod des sitemaps).

## [3.0.2] - 2026-11-12

Phase 1 du chantier SEO des pages communes (audit du 11/11/2026 : pages indexées puis
désindexées par Google, version anglaise ressortant sur des requêtes françaises).
Correctifs techniques, France entière. Migration `20261112100000_communes_stats_modifie_le.sql`
à appliquer par `pnpm db:migrate` ; sans elle le site fonctionne mais le sitemap garde
l'ancienne date uniforme.

### Corrigé
- **Meta description des communes sans appartement** : une commune n'ayant que des
  ventes de maisons (la majorité des communes rurales, ex. La Calmette à 2 764 €/m²)
  affichait « loyers de référence ANIL… » sans aucun prix. La description donne
  maintenant le prix médian maison et/ou appartement, puis l'appel à l'estimation
  gratuite ; les communes sans aucune vente gardent la description « loyers ».
- **Tuile « Évolution sur 1 an » masquée sous 10 ventes** (`evolutionAffichable`,
  `SEUIL_EVOLUTION`) : +15,2 % calculé sur 15 ventes était affiché comme un signal.
  Même seuil que le texte d'évolution ; en dessous, la tuile affiche « n.d. ».
- **Robots Google sans « bot » dans leur nom** (Google-InspectionTool, GoogleOther,
  Mediapartners…) recevaient la redirection de langue 307 vers `/en/` dès qu'ils
  annonçaient un Accept-Language anglais ; ils sont maintenant reconnus comme robots
  et voient la page française à la racine, comme Googlebot.

### Modifié
- **lastmod réel dans les sitemaps** : nouvelle colonne `communes_stats.contenu_modifie_le`,
  changée par `refresh_communes_stats()` seulement quand les chiffres de la commune
  changent (fusion au lieu de vider la table). Le lastmod publié est le plus récent entre
  cette date et la date du gabarit (`GABARIT_COMMUNE_MODIFIE_LE`, à avancer à chaque
  changement du gabarit). Avant : la même heure de recalcul sur les 69 832 URLs, changée
  à chaque import, que Google finit par ignorer.
- **Sitemaps des communes découpés par département** : `/sitemaps/communes-<dept>.xml`
  (ex. `communes-30.xml`, `communes-2a.xml`), quelques centaines d'URLs chacun, listés
  dans l'index `/sitemap.xml` ; les anciens `communes-1.xml` et `communes-2.xml`
  (40 000 URLs, 23 Mo) répondent 404. Permet de suivre l'indexation département par
  département dans la Search Console.

## [3.0.1] - 2026-11-11 **[critique]**

Correctif publié en urgence le 11/11/2026 au soir : la recherche d'adresse du formulaire
(premier geste du tunnel) ne proposait plus rien depuis la panne totale du géocodeur de
l'IGN (data.geopf.fr en 504 sur tous ses points d'entrée). Le code du site n'était pas en
cause ; il n'avait aucun service de secours.

### Ajouté
- **Relais automatique de géocodage** (`lib/geo/geocodage.ts`) : Géoplateforme IGN
  d'abord ; si elle échoue (erreur ou délai de 5 s), Photon (komoot, base
  OpenStreetMap) prend le relais. Photon ne renvoie pas de code INSEE : il est retrouvé
  dans notre table `communes_ref` par code postal et nom de commune (`lib/geo/communes.ts`,
  arrondissements de Paris, Lyon et Marseille compris). Une réponse vide d'un fournisseur
  qui fonctionne reste une vraie réponse (adresse inconnue), sans relais. Effet : le
  prospect obtient des adresses même quand l'IGN est en panne ; la réponse indique la
  `source` utilisée et un avertissement est journalisé pour chaque relais.
- **Message explicite** sous le champ d'adresse quand aucun fournisseur ne répond
  (« service momentanément indisponible, réessayez ou appelez-nous »), au lieu d'un
  silence qui laissait croire à une adresse inconnue.
- Paramètre `citycode` sur `/api/geocode` (filtre IGN, filtre après résolution pour
  Photon) : préparé pour le formulaire des pages communes.
- 15 tests unitaires sur la conversion des réponses, la résolution INSEE et l'ordre des relais.

## [3.0.0] - 2026-11-11

Version **majeure** : les comparables changent pour toutes les estimations de vente
(fenêtre de dates et écrêtage), donc les prix affichés peuvent bouger. Propositions P2
et P5 de l'audit, validées par le client. Migration appliquée le 11/11/2026 par `pnpm db:migrate`
(migration `20261111120000_dvf_derniere_vente.sql`, table `dvf_meta` + fonction
`dvf_derniere_vente()`). Sans elle, le site resterait fonctionnel mais garderait l'ancienne
fenêtre (30 mois avant la date du jour) sans afficher les dates.

### Modifié
- **Fenêtre de 30 mois ancrée sur la dernière vente connue** (P2,
  `lib/estimation/repository.ts`). Avant : « ventes de moins de 30 mois » comptées
  depuis le jour de la demande, alors que DVF est publié avec 6 à 10 mois de retard ;
  le 11/11/2026 le site ne regardait en réalité que 19,5 mois (11/05/2024 → 31/12/2025).
  Après : 30 mois avant la dernière vente présente en base (01/07/2023 → 31/12/2025),
  ce qui tient la promesse de la page d'accueil quelle que soit la date. La date de
  référence est posée par l'import dans `dvf_meta` et lue en cache 1 h. Le poids par
  ancienneté reste compté depuis aujourd'hui (une vente plus vieille pèse toujours moins).
  Effet : plus de comparables partout (93 au lieu de 66 pour l'appartement de référence),
  donc moins de bascules en estimation manuelle et moins de paliers élargis.
- **Écrêtage des prix atypiques avant le calcul** (P5, `lib/estimation/vente.ts`,
  `ecarterAtypiques`). Avant : aucune protection au calcul, seules les bornes fixes de
  l'import (200 à 25 000 €/m²) ; une part indivise à 313 €/m² ou un lot à 7 513 €/m²
  entraient dans la médiane et gonflaient la fourchette. Après : dès 12 comparables,
  les ventes hors [Q1 − 1,5 × IQR ; Q3 + 1,5 × IQR] sont écartées ; en dessous de 12,
  rien ne change. Effet : la médiane pondérée et la fourchette sont calculées sur des
  ventes homogènes ; le nombre de ventes écartées est affiché.

### Ajouté
- Sur l'écran résultat (fr et en) : « Basé sur N ventes comparables enregistrées entre
  le JJ/MM/AAAA et le JJ/MM/AAAA (k ventes au prix atypique écartées) » : le prospect
  voit la période réelle des ventes utilisées (demande du brief, `starter.md:253`).
- `EstimationVente` : `nbEcartes`, `ventesDu`, `ventesAu` (stockés dans
  `leads.estimation`, sans changement du payload CRM ni de l'email).
- `pnpm import:dvf` met à jour `dvf_meta.derniere_vente` à chaque import.
- Tests : écrêtage (seuil 12, règle de Tukey), fenêtre reportée, fixtures mises à jour.

### Mesure avant / après (point de référence, 11/11/2026)

| Mesure | 2.0.0 | 3.0.0 |
|---|---|---|
| Fenêtre interrogée | 11/05/2024 → 31/12/2025 (19,5 mois) | 01/07/2023 → 31/12/2025 (30 mois) |
| Appartement 41 m² Carrez | 66 comparables, 1 439 €/m², max 7 513, 53 000 - 59 000 - 65 000 € | 93 comparables dont 5 écartés (2 835 à 7 513 €/m²), 1 414 €/m², max 2 412, **52 000 - 58 000 - 64 000 €** |
| Maison 55 m² | 28 comparables, 1 500 €/m², 74 000 - 83 000 - 91 000 € | 42 comparables, 0 écarté, 1 479 €/m², **73 000 - 81 000 - 89 000 €** |

Sorties détaillées : `audit/resultats/base-*.md` (3.0.0) et `audit/resultats/2.0.0/`.

## [2.1.0] - 2026-11-11

Version **mineure** : nouvel affichage sous l'estimation de vente, sans changement du
prix estimé ni du calcul.

### Ajouté
- **Frais de notaire estimés** sous la fourchette de vente (écran résultat, fr et en).
  Pourquoi : le prix estimé est un prix d'acte hors frais d'acquisition (comme les
  valeurs DVF) et rien ne le disait ; les prospects demandent couramment l'ordre de
  grandeur des frais. Comment : fourchette couvrante calculée par
  `lib/estimation/frais-notaire.ts` (droits de mutation 4,5 à 5 % selon le
  département + frais d'assiette + taxe communale, émoluments du notaire au barème
  par tranches TTC, contribution de sécurité immobilière 0,10 %, débours 800 à
  1 400 €), bas sur la fourchette basse, haut sur la fourchette haute, arrondis à la
  centaine vers l'extérieur. Effet visible : une ligne « Frais de notaire estimés* :
  entre X et Y, soit environ 7 à 8 % du prix, à la charge de l'acquéreur, non compris
  dans l'estimation », suivie de la note d'astérisque qui précise que seul le notaire
  peut établir le montant réel et que l'information n'a pas de valeur contractuelle.
  Pas d'affichage en location ni en estimation manuelle ; l'email n'est pas modifié.
- Tests du barème (émoluments par tranches, droits à 4,5 et 5 %, fourchette couvrante).

## [2.0.0] - 2026-11-11

Version **majeure** : les prix au m² affichés aux prospects changent, parce que les
ventes DVF servant de comparables ont été renettoyées puis **réimportées** (France
entière, millésimes 2023-2025) avec trois règles corrigées à la suite de l'audit
(`audit/RAPPORT-estimation-vente.md`, propositions P1, P3 et P4 validées par le client).
Le moteur de calcul (`lib/estimation`) et les fonctions SQL sont inchangés : seule la
matière première change.

### Modifié
- **Lots identiques = logements distincts** (P1, `scripts/dvf-clean.ts`). Avant : une
  mutation contenant plusieurs logements de même type, surface et nombre de pièces
  était réduite à un seul logement avec le prix total, d'où des prix au m² doublés ou
  triplés (Béziers 2023-468488 : deux appartements de 38 m², lots 52 et 53, vendus
  105 000 € → 2 763 €/m² au lieu de ≈ 1 382). Après : deux numéros de lot différents,
  ou deux lignes strictement identiques sur la même parcelle, comptent pour deux
  logements et la mutation est exclue comme « multi-logements ». Une ligne répétée
  sur plusieurs parcelles ou natures de culture reste un simple doublon.
  Effet : les ventes en bloc ne tirent plus les médianes vers le haut ; dans la section
  de référence, 4 des 46 appartements (prix de 2 763 à 5 833 €/m²) disparaissent.
- **Deux dépendances ou plus = mutation exclue** (P4). Avant : caves et parkings
  vendus avec le logement étaient ignorés, mais leur prix restait dans la valeur
  foncière et gonflait le prix au m² (Béziers 2022-572521 : 61 m² + 2 dépendances
  pour 108 531 € → 1 779 €/m², ≈ 1 450 sans les deux garages). Après : une seule
  dépendance est tolérée (cave courante), au-delà la vente n'est plus un comparable.
  Effet : environ un appartement sur cinq et une maison sur quinze sortent des
  comparables (Hérault 2025 : 4 391 mutations) ; moins de comparables, mais moins
  biaisés à la hausse. Dans les zones peu denses, le palier retenu peut s'élargir.
- **Surface Carrez pour les appartements** (P3). Avant : le prospect saisit sa surface
  Carrez, mais les comparables étaient filtrés et tarifés sur la surface réelle bâtie du
  cadastre. Après : quand DVF fournit la surface Carrez du lot et qu'elle est cohérente
  (entre 0,5 et 1,5 fois la surface réelle), c'est elle qui est stockée comme surface
  et sert au prix au m². Sinon la surface réelle est conservée (`surface_source`).
  Effet : 58 % des appartements de Béziers passent en Carrez (ratio médian 1,00, donc
  peu de changement en moyenne, mais les écarts de 5 à 20 % sur certains lots
  disparaissent). Hérault 2025 : 5 413 appartements sur 15 892 ventes gardées.
- Mesure avant / après au point de référence (Béziers, section 000PX, 11/11/2026,
  `audit/comparables-base.ts`) : voir le tableau en fin d'entrée.

### Ajouté
- Motif d'exclusion `dependances` et compteur « dont surface Carrez » dans le bilan de
  `pnpm import:dvf` ; constantes `MAX_DEPENDANCES`, `RATIO_CARREZ_MIN/MAX`.
- Tests : lots distincts, lignes identiques, doublons par parcelle et nature de culture,
  dépendances, surface Carrez (plausible, additionnée, incohérente, maison, bornes).
- `audit/resultats/1.0.0/` conserve les sorties d'avant cette version.

### Mesure avant / après (point de référence)

| Mesure | 1.0.0 | 2.0.0 |
|---|---|---|
| Appartement 41 m² Carrez | 68 comparables à 400 m, 1 433 €/m², min 313 / max 7 513, 53 000 - 59 000 - 65 000 € | 66 comparables, 1 439 €/m², min 571 / max 7 513, **53 000 - 59 000 - 65 000 €** (inchangé) |
| Maison 55 m² | 29 comparables à 400 m, 1 500 €/m², max 4 706, 74 000 - 83 000 - 91 000 € | 28 comparables, 1 500 €/m², max 2 769, **74 000 - 83 000 - 91 000 €** (inchangé) |
| Hérault 2025 en base | 20 367 ventes (11 540 appartements) | 15 892 ventes |
| France, 3 millésimes | 2 290 975 ventes | 1 721 982 ventes (−25 %), dont 438 097 appartements en surface Carrez ; 561 047 mutations exclues pour dépendances, 131 422 pour multi-logements |

Au point de référence, la médiane est robuste : le prix affiché ne bouge pas, mais les
extrêmes des comparables se resserrent (plus de vente à 313 €/m² avec quatre
dépendances, plafond maison 2 769 au lieu de 4 706 €/m²). L'effet est plus marqué là
où les comparables sont peu nombreux. Import exécuté le 11/11/2026 en 7,2 min
(`audit/sorties/import-2.0.0.log`).

## [1.1.0] - 2026-11-11

### Ajouté
- **Audit du calcul d'estimation de vente** (`audit/`) : rapport complet
  (`audit/RAPPORT-estimation-vente.md`), script qui rejoue la logique du site sur un
  export DVF (`audit/reproduire-estimation.ts`), script qui lit le résultat réel depuis
  la base en lecture seule (`audit/comparables-base.ts`), jeu de pièges
  (`audit/fixtures/pieges.csv`) et sorties de référence (`audit/resultats/`).
  Pourquoi : vérifier que l'estimation est correcte et reproductible à la main.
  Effet visible : aucun pour les prospects, **aucune modification du calcul** dans cette
  version ; les corrections proposées (section 7 du rapport) sont appliquées version
  par version après validation (P1, P3, P4 en 2.0.0 ; P2, P5 à P10 en attente).
- Ce fichier `CHANGELOG.md` et ses règles de version.

## [1.0.0] - 2026-11-11

Version de référence : état de la production (www.estimmo-direct.com) au moment de la
création de ce changelog. Résumé de ce qui est en ligne, pour servir de point de départ ;
le détail historique est dans `AGENTS.md` et l'historique git.

### En production
- Estimation de **vente** par comparables DVF (France entière, 3 millésimes, format
  compact) : rayons 400 → 3 000 m puis commune et département, médiane pondérée par
  distance et ancienneté, ajustements plafonnés ±25 %, fourchette ±5 à 10 %.
- Estimation de **location** à partir des loyers de référence ANIL par commune.
- Tunnel d'estimation en 4 étapes, création de lead, emails Resend (prospect dans sa
  langue, agent en français), file de synchronisation CRM avec rappels.
- Administration : leads, blog bilingue (articles, médias, programmation), surcharges
  de traductions, analytics du formulaire, statistiques.
- SEO : ~35 000 pages communes, baromètre, pages départements, sitemaps, JSON-LD.
- Site bilingue français / anglais (next-intl), français à la racine, anglais sous `/en`.
- Livraison initiale le 14/07/2026 ; i18n le 18/10/2026 ; blog bilingue le 29/10/2026 ;
  analytics du formulaire le 01/11/2026 ; publication des versions anglaises depuis la
  liste et suppression de leads le 01/11/2026 (derniers commits avant ce changelog).
