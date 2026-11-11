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

Rien pour l'instant. Propositions restantes de l'audit : P6 (contrôle du géocodage),
P7 (fourchette), P8 (rayon à l'écran), P9 (identifiant de mutation), P10.

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
