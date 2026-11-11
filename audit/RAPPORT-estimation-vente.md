# Audit du calcul d'estimation de vente - ESTIMMO

Date : 11 novembre 2026. Audit en lecture seule : ce rapport décrit l'état **1.0.0** du
calcul (sorties dans `audit/resultats/1.0.0/`). Les propositions P1, P3 et P4 ont été
validées puis appliquées le même jour (version **2.0.0**, voir `CHANGELOG.md`) ; les
autres restent en attente. Scripts : voir `audit/README.md`.

## 1. Résumé

Le calcul est **conforme à la méthode annoncée dans ses grandes lignes** (comparables DVF
du quartier, même type, surface ×0,7-1,3, médiane pondérée par distance et ancienneté,
ajustements plafonnés, fourchette selon la dispersion) et il est **reproductible à la
main** : le script `audit/reproduire-estimation.ts` retrouve les chiffres de référence
de Virgile à l'unité près (46 maisons à 1 443 / 1 310 €/m², 42 appartements à
1 151 / 1 144 €/m², 14 maisons à 1 834 €/m² et 6 appartements à 1 158 €/m² sur 12 mois).

Trois points pèsent réellement sur le prix affiché :

1. **Lots identiques fusionnés** : quand une mutation contient plusieurs logements de
   même type, même surface et même nombre de pièces, le nettoyage n'en garde qu'un et
   lui attribue le prix total. Dans la section 000PX, 4 des 46 appartements retenus par
   le site sont dans ce cas (prix au m² doublé ou triplé : 2 763, 3 667, 5 359 et
   5 833 €/m² pour un marché à 1 150 €/m²).
2. **Fenêtre de 30 mois comptée depuis aujourd'hui, pas depuis la dernière vente
   connue** : la base s'arrête au 31/12/2025 et le site ne charge que 3 millésimes.
   Le 11/11/2026, la fenêtre réellement utilisée va du 11/05/2024 au 31/12/2025, soit
   19,5 mois et non 30. Au point de référence, cela fait 68 comparables au lieu de 104
   et une médiane de 1 476 au lieu de 1 424 €/m² (+3,5 %).
3. **Surface Carrez saisie contre surface réelle bâtie en base** : pour un appartement,
   le prospect saisit sa surface Carrez, les comparables sont filtrés sur
   `surface_reelle_bati` et le prix au m² obtenu est multiplié par la surface Carrez.
   Les deux surfaces diffèrent couramment de plusieurs pourcents (ratio médian 1,026,
   quartiles 0,964 et 1,271 dans la section).

Le reste (dépendances incluses dans le prix, absence d'écrêtage au calcul, fourchette
plafonnée à ±10 %, géocodage non contrôlé) est détaillé en section 6, avec des
propositions en section 7. **Rien n'a été modifié : les corrections attendent validation.**

## 2. Flux de calcul, de l'adresse saisie au prix affiché

```
Prospect (formulaire, components/estimation/estimation-form.tsx)
  │
  ├─ Adresse ─► autocomplétion IGN Géoplateforme (client)
  │             app/api/geocode/route.ts:9,59-78  → label, codeInsee, codePostal, lat, lon
  │             (score et type du résultat ignorés : un centroïde de rue ou de commune passe)
  ├─ Surface (Carrez si appartement, habitable si maison), pièces, étage, ascenseur…
  └─ État, cuisine, SDB, DPE, extérieur, stationnement, atouts
  │
  ▼  POST /api/leads  (app/api/leads/route.ts)
  ├─ validation Zod lib/leads/schema.ts (lat/lon/INSEE pris tels quels, surface 8-800 m²)
  ├─ zone non couverte (57, 67, 68, 976) ? → estimation manuelle   lib/estimation/zones.ts:6
  ├─ dernier_etage déduit si étage ≥ étages de l'immeuble           route.ts:91-101
  │
  ▼  fetchComparables  (lib/estimation/repository.ts:31-78)
  │   p_date_min = aujourd'hui − 30 mois (:25-29) ; surface ×0,7 / ×1,3 (:41-42)
  │   1) find_comparables_radius(lat, lon, type, surface, date, 3 000 m)
  │   2) si < 8 : find_comparables_commune ; 3) si < 8 : find_comparables_departement
  │
  ▼  SQL  (supabase/migrations/20261016130000_dvf_index_filtres.sql:22-139)
  │   table dvf_mutations (format compact : date, prix_m2, surface, type A/M, insee, lat/lon e6)
  │   type = A/M · surface ≥ ceil(min) et ≤ floor(max) · date ≥ p_date_min · st_dwithin
  │   tri par distance · limit 5000
  │
  ▼  estimerVente  (lib/estimation/vente.ts:79-121)
  │   palier : 400 m → 800 m → 1 500 m → 3 000 m → commune → département, premier à ≥ 8 (:38-59)
  │   prixM2Zone = médiane pondérée, poids = 1/(1+km) × 1/(1+mois/12)          (:61-65, :89-94)
  │   ajustement = somme des coefficients plafonnée ±25 %  (ajustements.ts:46-75)
  │   prixM2Ajuste = prixM2Zone × (1 + ajustement) ; médiane = prixM2Ajuste × surface (:96-98)
  │   fourchette ± clamp(IQR/prixM2Zone × 40, 5, 10) %, arrondis au millier     (:104-111)
  │   confiance : haute (≥ 15 et ≤ 800 m), moyenne (≥ 8 en rayon), faible          (:67-73)
  │
  ▼  leads.estimation (jsonb)  →  components/estimation/resultat.tsx
      affiche fourchette basse / médiane / haute, prixM2Ajuste, « N ventes comparables »
      (le rayon n'est pas affiché ; l'email affiche prixM2Zone et le rayon : lib/email/template.ts:140-146)
```

En amont, **les données DVF ne sont jamais appelées en direct**. Elles sont importées
deux fois par an (`scripts/import-dvf.ts`, GitHub Action `.github/workflows/import-dvf.yml:7`,
20 avril et 20 octobre) depuis les fichiers geo-dvf d'Etalab, nettoyées par
`scripts/dvf-clean.ts`, puis stockées sans identifiant de mutation, sans prix total et
sans section cadastrale.

## 3. Réponses aux 14 questions

| # | Question | Réponse | Preuve |
|---|---|---|---|
| 1 | Source DVF | Fichiers geo-dvf d'Etalab `https://files.data.gouv.fr/geo-dvf/latest/csv/<année>/departements/<dept>.csv.gz`, **données figées** en base, import semestriel des 3 derniers millésimes détectés (requête HEAD). Le 11/11/2026 la base contient 2 290 975 ventes du **01/01/2023 au 31/12/2025** (millésimes 2023-2025). Le fichier 2026 n'existe pas encore chez Etalab (404 vérifié), alors que l'explorateur DVF de la DGFiP sert déjà des ventes jusqu'au 25/06/2026. | `scripts/import-dvf.ts:35`, `:83-96`, `.github/workflows/import-dvf.yml:7` ; base : `audit/resultats/base-appartement-41.md` |
| 2 | Périmètre géographique | Rayon autour du point géocodé : **400 → 800 → 1 500 → 3 000 m**, puis **commune entière** (code INSEE), puis **département** (préfixe INSEE). Pas de section cadastrale, d'IRIS ni de code postal. Élargissement automatique tant qu'un palier n'atteint pas 8 ventes. Une seule requête SQL à 3 000 m ; les paliers 400-1 500 m sont filtrés en mémoire sur son résultat. | `lib/estimation/vente.ts:24-25,38-59` ; `repository.ts:46-75` ; SQL `:22-66,68-102,104-139` |
| 3 | Fenêtre de temps | **30 mois avant la date du jour** (`setMonth(−30)`), pas avant la dernière date DVF disponible. Fenêtre utile le 11/11/2026 : 11/05/2024 → 31/12/2025, soit 19,5 mois. Elle rétrécit jusqu'à la prochaine publication. | `repository.ts:25-29,43` ; `vente.ts:26` |
| 4 | Filtre de surface / pièces | Surface **×0,7 à ×1,3** de la surface saisie, bornes arrondies à l'entier (`ceil` / `floor`) ; pour 41 m² : 29 à 53 m². **Aucun filtre sur le nombre de pièces** (la colonne n'est même pas stockée). | `repository.ts:41-42` ; SQL `:56-57` ; table compacte `20261016120000_dvf_compact.sql:21-31` |
| 5 | Unité de calcul | Par **id_mutation à l'import** : lignes regroupées, nature/date/valeur prises sur la première ligne, dédoublonnage par clé `type|surface|pièces`. Une ligne par mutation en base ; l'id n'est pas conservé. | `scripts/dvf-clean.ts:93-110,124-128` ; `import-dvf.ts:102-122` |
| 6 | Multi-lots et ventes mixtes | Mutation avec **plusieurs logements de caractéristiques différentes → exclue** (`multi_logements`). Mutation avec un **local commercial/industriel → exclue**. Mais plusieurs logements **identiques** (même type, surface, pièces, lots distincts) sont **fusionnés en un seul** et gardés avec le prix total : prix au m² multiplié par le nombre de lots. Les surfaces ne sont jamais sommées. | `dvf-clean.ts:117-122,126-128,150-152` ; exemples section 5 |
| 7 | Dépendances, lignes sans type_local | Ignorées, sans invalider la mutation. Le prix de la cave/du garage **reste dans la valeur foncière** et gonfle le prix au m² du logement. | `dvf-clean.ts:113,115` |
| 8 | nature_mutation | **« Vente » uniquement** (VEFA, échange, adjudication, expropriation exclus), à l'import seulement : la colonne n'existe pas en base. | `dvf-clean.ts:149` |
| 9 | Valeurs aberrantes | **Bornes fixes à l'import** : valeur 5 000 € - 10 M€, surface 8-500 m², **200-25 000 €/m²**, coordonnées obligatoires. **Aucun écrêtage au moment du calcul** (ni percentile, ni IQR) ; l'IQR ne sert qu'à régler la largeur de la fourchette. | `dvf-clean.ts:157-168` ; `vente.ts:104-105` |
| 10 | Statistique | **Médiane pondérée** (première valeur triée dont le cumul des poids atteint la moitié, sans interpolation), poids = 1/(1+distance_km) × 1/(1+ancienneté_mois/12). Aucune moyenne, aucune pondération par surface. | `stats.ts:7-21` ; `vente.ts:61-65,89-94` |
| 11 | Minimum de comparables | **8**. En dessous à tous les paliers (y compris département) : `null` → `estimation_manuelle = true`, écran « analyse personnalisée », pas de chiffre. | `vente.ts:25,45,84-85` ; `route.ts:146-152` |
| 12 | Ajustements | Coefficients **additionnés** puis somme **plafonnée à ±25 %**, appliquée une fois : `× (1 + total)`. État : à rénover −15 %, à rafraîchir −7 %, bon 0, refait à neuf +8 %. Cuisine et SDB (chacune) : < 5 ans +3 %, 5-10 ans 0, 10-20 ans −2 %, > 20 ans −4 %. DPE : A/B +5 %, C/D 0, E −4 %, F −8 %, G −12 %, « ne sait pas » 0. Appartement : RDC −5 % ; sinon dernier étage **avec** ascenseur +5 % ; sinon étage ≥ 2 **sans** ascenseur −3 % (une seule branche). Extérieur : balcon +3 %, terrasse +5 %, jardin +6 %, **non cumulés** (max). Stationnement : place +2 %, garage/box +4 %. Ignorés : vue, lumineux, calme, traversant, année de construction, terrain, pièces. | `ajustements.ts:14-75` |
| 13 | Fourchette | Symétrique : médiane × (1 ± p), avec p = clamp(IQR(prix/m² des comparables, non pondéré) / prixM2Zone × 40, **5 %, 10 %**), arrondie au millier. Le brief prévoyait 6-15 % (décision client du 15/07/2026). Dans un centre ancien, l'IQR relatif dépasse presque toujours 25 % → la fourchette est en pratique figée à ±10 %. | `vente.ts:100-111` ; `starter.md:204` |
| 14 | Surface | Prix = prixM2Ajuste × **surface saisie** : libellée « surface Carrez » pour un appartement, « surface habitable » pour une maison (stockée `surface_type`). Les comparables sont filtrés sur **`surface_reelle_bati`** de DVF ; `lotN_surface_carrez` n'est jamais lu. | `components/estimation/step-bien.tsx:29` ; `route.ts:180` ; `dvf-clean.ts:16-30` |

## 4. Résultat réel du site au point de référence (base de production, lecture seule)

Point : centroïde de la section 000PX (43,347125 ; 3,215228), date de calcul 11/11/2026,
sans ajustement (`audit/comparables-base.ts`, sorties dans `audit/resultats/base-*.md`).

| Bien | Comparables (palier) | prixM2Zone | Médiane simple | Moyenne | Min / max | Fourchette affichée | Confiance |
|---|---|---:|---:|---:|---|---|---|
| Appartement 41 m² | 68 à 400 m (220 à 800 m, 508 à 3 km) | **1 433 €/m²** | 1 476 | 1 655 | 313 / 7 513 | 53 000 - **59 000** - 65 000 € (±10 %) | haute |
| Maison 55 m² | 29 à 400 m | **1 500 €/m²** | 1 500 | 1 590 | 500 / 4 706 | 74 000 - **83 000** - 91 000 € (±10 %) | haute |

Les comparables retenus sont ceux du 11/05/2024 au 31/12/2025 (24 ventes de 2024, 44 de
2025 pour l'appartement). Ils débordent largement de la section : le rayon de 400 m couvre
les rues voisines, ce qui explique l'écart avec les chiffres « section seule » ci-dessous.

## 5. Reproduction sur l'export de la section 000PX (367 lignes, 149 mutations, 07/2021 → 06/2026)

Source : API de l'explorateur DVF (`app.dvf.etalab.gouv.fr/api/mutations3/34032/000PX`),
identique au fichier de référence (mêmes comptes, mêmes dates). Sorties complètes :
`audit/resultats/34032-000PX-appartement-41.md` et `-maison-55.md`.

### 5.1 Tri par le nettoyage du site

| Statut (dvf-clean.ts) | Mutations |
|---|---:|
| retenue | 93 |
| plusieurs logements différents | 31 |
| local commercial/industriel | 17 |
| aucun logement (parcelle ou dépendance seule) | 5 |
| valeur < 5 000 € (2023-479822 à 1 200 €, 2023-479823 à 2 500 €) | 2 |
| prix/m² < 200 € (2022-573283, maison 100 m² à 19 000 €) | 1 |

### 5.2 Prix au m² avant ajustement : site contre référence

| Périmètre | Filtres du site | Référence (Virgile) | Écart |
|---|---|---|---|
| Maisons, toute la période | 47 ventes, moy. 1 419, méd. 1 295 | **46 ventes, moy. 1 443, méd. 1 310** | 1 vente : 2023-467606 (67 m² pour 20 000 € = 299 €/m², sous la borne 300 de la référence, au-dessus de la borne 200 du site) |
| Appartements, toute la période | 46 ventes, moy. 1 434, méd. 1 160 | **42 ventes, moy. 1 151, méd. 1 144** | 4 ventes à prix multiplié (ci-dessous) : la moyenne du site est gonflée de +25 %, la médiane de +1,4 % |
| Maisons, 12 derniers mois | 14 ventes, 1 834 | **14 ventes, 1 834** | aucun |
| Appartements, 12 derniers mois | 6 ventes, 1 158 | **6 ventes, 1 158** | aucun |

Les chiffres de référence sont retrouvés exactement dès que l'on applique deux règles :
bornes 300-3 500 €/m² et « deux lots numérotés différemment sont deux logements ».

### 5.3 Les mutations classées différemment, et pourquoi

| id_mutation | Date | Lignes de logement | Prix | Site | Référence | Explication |
|---|---|---|---:|---|---|---|
| **2023-468488** | 16/02/2023 | 2 × appartement 38 m² / 2 p., **lots n° 52 et 53**, + 5 dépendances | 105 000 € | retenue à **2 763 €/m²** | exclue (2 logements) | Deux appartements distincts fusionnés par la clé `type|surface|pièces` ; le vrai prix est d'environ 1 382 €/m² par logement, moins les 5 dépendances. C'est l'appartement d'écart entre 43 et 42. |
| **2023-468209** | 03/02/2023 | 3 × appartement 19 m² / 1 p. (sans n° de lot) + 1 dépendance | 110 825 € | retenue à **5 833 €/m²** | exclue (> 3 500) | Trois lignes identiques réduites à une : 110 825 € attribués à 19 m². Si ce sont 3 studios, le prix réel est ≈ 1 944 €/m². |
| **2024-431226** | 26/09/2024 | 3 × appartement 22 m² / 1 p. + 1 dépendance | 117 900 € | retenue à **5 359 €/m²** | exclue (> 3 500) | Même mécanisme (≈ 1 786 €/m² si 3 lots). |
| **2024-425674** | 22/04/2024 | 3 × appartement 30 m² / 1 p. + 1 dépendance | 110 000 € | retenue à **3 667 €/m²** | exclue (> 3 500) | Même mécanisme (≈ 1 222 €/m² si 3 lots). Même parcelle que 2023-478167 (3 × 30 m² pour 47 000 €, gardée par les deux filtres à 1 567 €/m²). |
| 2023-467606 | 13/01/2023 | maison 67 m² | 20 000 € | retenue à 299 €/m² | exclue (< 300) | Simple effet de borne ; prix probablement partiel (part indivise, nue-propriété). |
| 2026-209859 | 23/06/2026 | appartements 40 m² et 60 m² | 45 000 € | exclue (multi) | exclue | Piège neutralisé : surfaces différentes → `multi_logements`. |
| 2023-479822 | 21/12/2023 | appartement 39 m² + dépendance | 1 200 € | exclue (valeur) | exclue | Piège neutralisé par la borne 5 000 € (avant même la borne €/m²). |

### 5.4 Le moteur rejoué sur la section seule (appartement 41 m², 11/11/2026, ventes ≤ 31/12/2025)

10 comparables à moins de 400 m (toutes dans la section), palier 400 m, médiane pondérée
**1 207 €/m²**, dispersion 0,216 → ±9 %, estimation **45 000 - 49 000 - 54 000 €**,
confiance moyenne. Le tableau nominatif (id_mutation, date, adresse, prix, surface, €/m²,
distance, poids, cumul des poids jusqu'à la médiane) est dans
`audit/resultats/34032-000PX-appartement-41.md`, section C. Pour une maison de 55 m², la
section seule ne fournit que 7 ventes dans la fenêtre : le site basculerait en manuelle
s'il ne disposait pas du reste de la commune (29 ventes réelles à 400 m).

Pourquoi 1 207 €/m² sur la section et 1 433 €/m² en base : la base ajoute 58 ventes des
rues voisines, dont des valeurs jusqu'à 7 513 €/m² (même origine probable : lots
fusionnés) qui tirent la médiane pondérée d'un rang vers le haut.

## 6. Bugs et choix discutables, classés par impact sur le prix

### Impact fort

**F1. Lots identiques fusionnés en un seul logement** - `scripts/dvf-clean.ts:124-128`.
La clé de dédoublonnage `type|surface|pièces` est pensée pour les lignes répétées par
parcelle, mais elle confond aussi des lots distincts. Exemple : 2023-468488, deux
appartements de 38 m² (lots 52 et 53) vendus 105 000 € → stocké à 2 763 €/m² au lieu de
≈ 1 382. Dans la section, 4 appartements sur 46 (9 %) sont dans ce cas, de 2,4 à 5 fois
le prix du marché. Avec 8 à 15 comparables, une seule de ces valeurs décale la médiane
pondérée d'un rang ; dans le calcul réel à 400 m, le maximum retenu est 7 513 €/m².

**F2. Fenêtre « 30 mois » comptée depuis aujourd'hui, sur une base de 3 millésimes** -
`lib/estimation/repository.ts:25-29`, `scripts/import-dvf.ts:83-96`. DVF est publié avec
6 à 10 mois de retard (dernière vente en base : 31/12/2025 ; Etalab n'a pas encore produit
le fichier 2026). Le 11/11/2026, le site compare avec 19,5 mois de ventes, pas 30, et la
page d'accueil annonce « ventes de moins de 30 mois ». Mesure au point de référence :
68 comparables au lieu de 104 si la fenêtre était ancrée sur la dernière vente connue,
médiane 1 476 contre 1 424 €/m² (+3,5 %). L'effet varie avec le calendrier : fenêtre la
plus courte juste avant chaque publication, et un prospect ne voit jamais les ventes des
6 à 10 derniers mois alors que la DGFiP les diffuse déjà.

**F3. Surface Carrez saisie contre surface réelle bâtie** - `app/api/leads/route.ts:180`,
`components/estimation/step-bien.tsx:29`, `dvf-clean.ts:16-30`. Le prix au m² DVF est
calculé sur `surface_reelle_bati` (surface au sol des pièces, sans règle de hauteur), puis
multiplié par la surface Carrez du prospect. Les deux surfaces diffèrent couramment de
3 à 10 % (section : ratio médian 1,026, quartiles 0,964 et 1,271 sur 26 appartements).
Pour un appartement de 41 m² Carrez dont la surface réelle est 44 m², le filtre de
comparables (29-53) et le prix final (×41) sont biaisés dans le même sens. Classé fort
parce que systématique sur tous les appartements, même si l'ordre de grandeur est de
quelques pourcents.

### Impact moyen

**M1. Dépendances incluses dans le prix** - `dvf-clean.ts:115`. La ligne « Dépendance »
est ignorée mais la valeur foncière reste celle de l'ensemble. 22 des 93 mutations
retenues dans la section comportent au moins une dépendance. Exemple : 2022-572521,
appartement 61 m² + 2 dépendances pour 108 531 € → 1 779 €/m² ; avec deux garages à
10 000 € chacun, le logement seul vaut ≈ 1 451 €/m² (−18 %). Le biais est à la hausse
et plus fort sur les petits prix.

**M2. Aucun écrêtage au moment du calcul** - `vente.ts:89-105`. Les seules bornes sont
celles de l'import (200-25 000 €/m²). Au point de référence, les comparables vont de
313 €/m² (2024-432810 : 48 m² + 4 dépendances pour 15 000 €, probablement une part
indivise) à 7 513 €/m². La médiane pondérée résiste, mais la fourchette (IQR) sature à
±10 % et la moyenne affichée dans les statistiques de commune est faussée.

**M3. Géocodage non contrôlé** - `app/api/geocode/route.ts:71-78`, `lib/leads/schema.ts:24-32`.
Le type (`housenumber`, `street`, `municipality`) et le score IGN ne sont ni conservés
ni vérifiés ; le serveur prend lat/lon du client tels quels. Un prospect qui valide
« Béziers » ou « Rue du Touat » est estimé au centroïde de la commune ou de la rue, avec
un rayon de 400 m autour d'un point qui n'est pas son logement.

**M4. Fourchette figée à ±10 % par le plafond** - `vente.ts:105`. Dès que l'IQR relatif
dépasse 25 % (cas général en centre ancien : 52 % au point de référence), la fourchette
affiche ±10 % quelle que soit la dispersion réelle. Décision client actée (15/07/2026),
mais l'écran laisse croire à une précision que les données n'ont pas ; l'explication
« fourchette large » ne s'affiche qu'à partir de 9 %.

### Impact faible

**f1. Tolérance de surface légèrement plus étroite que ±30 %** : surface stockée arrondie
à l'entier (`import-dvf.ts:115`) et bornes `ceil`/`floor` (SQL :56-57) → 29-53 au lieu de
28,7-53,3 pour 41 m². Négligeable.

**f2. `limit 5000`** (SQL :65) : atteint à Paris centre (5 000 lignes exactement à 3 km
pour un appartement de 50 m²). Sans effet sur les paliers 400-800 m car les lignes sont
triées par distance ; seul le palier 3 000 m est tronqué, et il n'est jamais retenu dans
ces zones.

**f3. IQR non pondéré divisé par une médiane pondérée** (`vente.ts:104`) : incohérence
de définition, sans effet notable vu le plafond de M4.

**f4. Formulaire jusqu'à 800 m², import jusqu'à 500 m²** (`schema.ts:66`, `dvf-clean.ts:160`) :
au-delà de ≈ 385 m² (500/1,3), peu ou pas de comparables → estimation manuelle.

**f5. Paliers commune et département** : aucune limite de distance mais pondération par
distance conservée, confiance toujours « faible ». Cohérent, mais le rayon n'est pas
affiché à l'écran (le brief le demandait, `starter.md:253`) et l'écran montre
`prixM2Ajuste` quand l'email montre `prixM2Zone` : deux « prix au m² » différents pour le
même prospect.

**f6. Pas d'identifiant de mutation ni de clé primaire en base** (`20261016120000_dvf_compact.sql:21-31`) :
impossible d'auditer une estimation depuis la base, et rien n'empêche un doublon si deux
imports se chevauchent hors de la purge par millésime.

**f7. Pas de filtre sur le nombre de pièces** : un T1 de 41 m² est comparé à des T2 de
41 m². Choix défendable (le prix suit la surface), à signaler car le brief parle de
« surface proche » sans mentionner les pièces.

**f8. Première ligne de la mutation** (`dvf-clean.ts:95-102`) : nature, date et valeur
sont lues sur la première ligne rencontrée ; dans DVF elles sont identiques pour toutes
les lignes d'une mutation, donc sans effet aujourd'hui.

## 7. Propositions de correction (non appliquées)

Niveau de version selon les règles du `CHANGELOG.md` : **majeur** quand les chiffres
affichés aux prospects changent (réimport ou nouvelle formule), **mineur** pour une
fonctionnalité sans changement des résultats, **correctif** pour un défaut isolé.

| # | Proposition | Fichiers | Effet attendu | Version |
|---|---|---|---|---|
| P1 (F1) | Dédoublonner par `type|surface|pièces|lot1_numero|id_parcelle` ; si plusieurs logements identiques subsistent (lots distincts ou `nombre_lots` ≥ 2 sur une seule ligne logement), classer `multi_logements`. Ajouter le cas au test. Réimport complet (3 millésimes, ≈ 1 h) puis `refresh_communes_stats`. | `scripts/dvf-clean.ts`, `dvf-clean.test.ts` | Retire les prix doublés/triplés (4 des 46 appartements de la section) ; baisse légère des médianes en centre ancien. | majeur |
| P2 (F2) | Ancrer la fenêtre sur la dernière vente connue : `p_date_min = max(date_mutation) − 30 mois` (valeur lue une fois et mise en cache, comme `refresh_communes_stats`), ou calculer la fenêtre côté SQL. Afficher sur le résultat « ventes du JJ/MM/AAAA au JJ/MM/AAAA ». En parallèle : vérifier chaque mois la disponibilité du millésime courant chez Etalab (le cron du 20/10 n'a rien trouvé) et envisager l'import du fichier DGFiP brut quand geo-dvf est en retard. | `lib/estimation/repository.ts`, SQL, `resultat.tsx`, workflow | 30 mois réels (104 comparables au lieu de 68 au point de référence) ; promesse de la page d'accueil tenue. | majeur |
| P3 (F3) | À l'import, pour un appartement à lot unique avec `lot1_surface_carrez` > 0, stocker la surface Carrez (ou les deux surfaces) et comparer Carrez à Carrez ; sinon conserver `surface_reelle_bati` et le signaler. | `dvf-clean.ts`, `import-dvf.ts`, migration (+2 octets/ligne) | Supprime le biais Carrez/réelle sur les appartements ; nécessite réimport. | majeur |
| P4 (M1) | Exclure les mutations comportant ≥ 2 dépendances (garage + cave = prix significatif), garder celles à 1 dépendance (cave courante). Variante plus stricte : exclure dès 1 dépendance pour les appartements < 40 m². | `dvf-clean.ts` | Réduit le biais à la hausse sur les petits logements. | majeur |
| P5 (M2) | Écrêtage au calcul : retirer les comparables hors [Q1 − 1,5 × IQR ; Q3 + 1,5 × IQR] quand n ≥ 12, puis recalculer médiane pondérée et fourchette. Journaliser le nombre d'écartés. | `lib/estimation/vente.ts`, tests | Médiane et fourchette moins sensibles aux ventes atypiques ; sans réimport. | majeur |
| P6 (M3) | Conserver `type` et `score` de l'IGN ; n'accepter qu'un `housenumber` (ou `street` avec avertissement) ; revérifier côté serveur que lat/lon tombent dans la commune du code INSEE. | `app/api/geocode/route.ts`, `schema.ts`, `address-autocomplete.tsx` | Évite les estimations au centroïde d'une commune. | mineur |
| P7 (M4) | Soit relever le plafond à 15 % (retour au brief, décision client), soit afficher la dispersion réelle (« les ventes vont de X à Y €/m² ») à côté de la fourchette. | `vente.ts`, `resultat.tsx`, messages | Transparence ; pas de changement de médiane. | majeur si plafond, mineur si affichage |
| P8 (f5) | Afficher le rayon et le palier sur l'écran résultat ; unifier `prixM2Zone` / `prixM2Ajuste` entre écran et email (afficher les deux, libellés). | `resultat.tsx`, `lib/email/template.ts`, messages | Cohérence écran/email, conformité au brief. | correctif |
| P9 (f6) | Stocker un identifiant de mutation (`id_mutation` texte ou hash 8 octets) avec index unique. | migration, `import-dvf.ts` | +≈ 18 Mo ; traçabilité et protection contre les doublons. | mineur |
| P10 (f3, f7) | IQR pondéré (ou documenter le choix) ; option de filtre ±1 pièce si n reste ≥ 8. | `vente.ts` | Marginal. | mineur |

Ordre conseillé : P1 + P3 + P4 dans un même réimport (un seul passage sur les 3
millésimes), puis P2 et P5 (code seul), puis P6-P8. Chaque lot = une version du
`CHANGELOG.md` avec les chiffres « avant / après » au point de référence
(`audit/comparables-base.ts` sert de banc de mesure).

## 8. Ce qui n'a pas pu être vérifié ici

- Le déploiement Vercel exécute le même code que le dépôt local (`main` est synchronisé
  avec `origin/main`, mais la version déployée n'a pas été interrogée).
- Le contenu exact de la table en production a été lu en SELECT (dates, comptes,
  fonctions `find_comparables_*`) ; le comportement du géocodage IGN en production n'a
  pas été testé (il dépend du service externe).
- La distance est reproduite par la formule de haversine (sphère) ; PostGIS utilise le
  sphéroïde WGS84. Écart inférieur à 0,5 %, sans effet sur les sélections observées.
- Les surfaces Carrez de DVF sont renseignées pour 26 des 46 appartements retenus de la
  section seulement ; le ratio donné est indicatif.
