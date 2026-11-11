# Reproduction du calcul d'estimation - audit/data/34032-000PX.json

- 367 lignes, 149 mutations, ventes du 2021-07-05 au 2026-06-25
- Généré le 2026-11-11 16:04 ; date de calcul : 2026-11-11
- Logique importée du site : scripts/dvf-clean.ts (nettoyage), lib/estimation/vente.ts, stats.ts, ajustements.ts ; SQL et arrondis d'import reproduits dans ce script.

## A. Tri des mutations par le nettoyage du site (scripts/dvf-clean.ts)

| Statut | Mutations |
|---|---:|
| retenue par le site | 93 |
| plusieurs logements (après dédoublonnage) | 31 |
| local commercial/industriel dans la mutation | 17 |
| aucun logement (parcelle, dépendance seule…) | 5 |
| valeur hors 5 000 € – 10 M€ | 2 |
| prix/m² hors 200 – 25 000 € | 1 |

## B. Prix au m² de la zone, avant tout ajustement

### Filtres du site (Vente, 1 logement, pas de commerce, 8-500 m², 5 k€-10 M€, 200-25 000 €/m², coordonnées)

| Périmètre | Ventes | Moyenne €/m² | Médiane €/m² |
|---|---:|---:|---:|
| maisons, toute la période | 47 | 1 419 | 1 295 |
| maisons, 12 derniers mois (depuis le 2025-06-25) | 14 | 1 834 | 1 824 |
| maisons, ventes réellement en base (≤ 2025-12-30) | 39 | 1 343 | 1 188 |
| appartements, toute la période | 46 | 1 434 | 1 160 |
| appartements, 12 derniers mois (depuis le 2025-06-25) | 6 | 1 158 | 1 236 |
| appartements, ventes réellement en base (≤ 2025-12-30) | 41 | 1 471 | 1 154 |

### Filtres de référence (Vente, 1 logement, pas de commerce, 300-3 500 €/m²)

| Périmètre | Ventes | Moyenne €/m² | Médiane €/m² |
|---|---:|---:|---:|
| maisons, toute la période | 46 | 1 443 | 1 310 |
| maisons, 12 derniers mois (depuis le 2025-06-25) | 14 | 1 834 | 1 824 |
| maisons, ventes réellement en base (≤ 2025-12-30) | 38 | 1 370 | 1 208 |
| appartements, toute la période | 42 | 1 151 | 1 144 |
| appartements, 12 derniers mois (depuis le 2025-06-25) | 6 | 1 158 | 1 236 |
| appartements, ventes réellement en base (≤ 2025-12-30) | 37 | 1 154 | 1 143 |

### Mutations classées différemment par les deux filtres

| id_mutation | Date | Prix | Locaux | Site | Référence | Pourquoi |
|---|---|---:|---|---|---|---|
| 2023-467606 | 2023-01-13 | 20 000 | M67/4 | ✅ | ❌ | le site garde tout ce qui est entre 200 et 25 000 €/m² ; ici 299 €/m² |
| 2023-468209 | 2023-02-03 | 110 825 | A19/1, A19/1, A19/1 | ✅ | ❌ | le site garde tout ce qui est entre 200 et 25 000 €/m² ; ici 5 833 €/m² (3 lignes de logement identiques sans numéro de lot, fusionnées en une seule : prix total attribué à un seul logement) ; 1 dépendance(s) dont le prix est inclus |
| 2023-468488 | 2023-02-16 | 105 000 | A38/2, A38/2 | ✅ | ❌ | le site garde tout ce qui est entre 200 et 25 000 €/m² ; ici 2 763 €/m² (2 logements identiques mais lots n° 52 et 53 : fusionnés en un seul par le site, prix total attribué à un seul logement) ; 5 dépendance(s) dont le prix est inclus |
| 2024-425674 | 2024-04-22 | 110 000 | A30/1, A30/1, A30/1 | ✅ | ❌ | le site garde tout ce qui est entre 200 et 25 000 €/m² ; ici 3 667 €/m² (3 lignes de logement identiques sans numéro de lot, fusionnées en une seule : prix total attribué à un seul logement) ; 1 dépendance(s) dont le prix est inclus |
| 2024-431226 | 2024-09-26 | 117 900 | A22/1, A22/1, A22/1 | ✅ | ❌ | le site garde tout ce qui est entre 200 et 25 000 €/m² ; ici 5 359 €/m² (3 lignes de logement identiques sans numéro de lot, fusionnées en une seule : prix total attribué à un seul logement) ; 1 dépendance(s) dont le prix est inclus |

### Surface Carrez des lots vs surface réelle bâtie (appartements retenus)

26 appartements ont une surface Carrez renseignée : ratio Carrez / surface_reelle_bati médian **1.026** (Q1 0.964, Q3 1.271). Le site compare la surface Carrez saisie par le prospect à `surface_reelle_bati` et ne lit jamais `lotN_surface_carrez`.

## C. Reproduction du moteur du site pour un bien donné

- Bien : appartement de 41 m² au point 43.347153, 3.215103
- Date de calcul : 2026-11-11 → ventes depuis le **2024-05-11** (30 mois, repository.ts:25-29) et jusqu'au 2025-12-30 (contenu de la base)
- Surface des comparables : **29 à 53 m²** (×0,7 / ×1,3 puis ceil/floor, SQL lignes 56-57)
- Candidats ≤ 3 000 m : 10 ; ≤ 400 m : 10 ; ≤ 800 m : 10 ; ≤ 1500 m : 10 ; ≤ 3000 m : 10

**Palier retenu : rayon 400 m** (premier palier avec ≥ 8 ventes, vente.ts:41-58) - 10 comparables

| id_mutation | Date | Adresse | Prix | Surface | €/m² | Distance | Poids | Cumul poids |
|---|---|---|---:|---:|---:|---:|---:|---:|
| 2024-432810 | 2024-11-29 | 35 AV MARECHAL FOCH | 15 000 | 48 | 313 | 97 m | 0.309 | 0.309 |
| 2025-467413 | 2025-02-07 | 34B RUE DU TOUAT | 28 000 | 50 | 560 | 114 m | 0.325 | 0.634 |
| 2024-429271 | 2024-08-22 | 49 AV MARECHAL FOCH | 38 000 | 38 | 1 000 | 80 m | 0.287 | 0.922 |
| 2025-469394 | 2025-03-31 | 116 RUE CASIMIR PERET | 57 000 | 50 | 1 140 | 59 m | 0.361 | 1.283 |
| 2025-467719 | 2025-02-05 | 27B RUE DU TOUAT | 40 000 | 34 | 1 176 | 113 m | 0.325 | 1.608 |
| 2025-471194 | 2025-05-21 | 116 RUE CASIMIR PERET | 60 350 | 50 | 1 207 | 59 m | 0.381 | 1.989 ← médiane |
| 2025-468051 | 2025-02-07 | 41 AV MARECHAL FOCH | 53 000 | 42 | 1 262 | 94 m | 0.331 | 2.321 |
| 2025-476150 | 2025-10-24 | 2 PL DU ONZE NOVEMBRE | 52 250 | 40 | 1 306 | 71 m | 0.456 | 2.776 |
| 2024-429572 | 2024-08-26 | 51 AV MARECHAL FOCH | 58 000 | 41 | 1 415 | 78 m | 0.289 | 3.065 |
| 2024-432390 | 2024-11-12 | 3 RUE GAYON | 80 000 | 52 | 1 538 | 63 m | 0.314 | 3.379 |

**Calcul à la main (formules de lib/estimation/vente.ts:89-119)**

1. Poids d'une vente = 1/(1+distance_km) × 1/(1+ancienneté_mois/12) ; poids total = 3.379, moitié = 1.689.
2. Médiane pondérée = première valeur (prix croissants) dont le cumul des poids atteint la moitié → **prixM2Zone = 1 207 €/m²** (médiane simple non pondérée : 1 192 ; moyenne simple : 1 092).
3. Ajustements (somme plafonnée ±25 %) = 0 % → prixM2Ajuste = 1 207 × 1.00 = **1 207 €/m²**.
4. Médiane du bien = 1 207 × 41 m² = 49 487 € → arrondi au millier : **49 000 €**.
5. Dispersion = (Q3 − Q1) / prixM2Zone = (1 295 − 1 035) / 1 207 = 0.216 → fourchette = clamp(0.216 × 40, 5, 10) = **±9 %**.
6. Fourchette : **45 000 € – 54 000 €**, confiance **moyenne** (haute si ≥ 15 ventes et rayon ≤ 800 m ; moyenne si ≥ 8 en rayon ; faible sinon).

```json
{
  "projet": "vente",
  "fourchetteBasse": 45000,
  "mediane": 49000,
  "fourchetteHaute": 54000,
  "prixM2Zone": 1207,
  "prixM2Ajuste": 1207,
  "nbComparables": 10,
  "rayonM": 400,
  "palier": "rayon",
  "confiance": "moyenne",
  "ajustementPct": 0,
  "fourchettePct": 9
}
```

## D. Toutes les mutations du fichier

| id_mutation | Date | Adresse | Lignes | Locaux (type/surface/pièces) | Dép. | Prix | Site | Référence |
|---|---|---|---:|---|---:|---:|---|---|
| 2021-308086 | 2021-07-05 | 80 RUE CASIMIR PERET | 1 | M25/2 |  | 56 000 | ✅ 2 240 €/m² | ✅ 2 240 €/m² |
| 2021-309550 | 2021-08-06 | 31 AV MARECHAL FOCH | 3 | A40/2, A60/3, A45/2 |  | 125 000 | ❌ plusieurs logements (après dédoublonnage) | ❌ plusieurs logements |
| 2021-310666 | 2021-09-13 | 41 AV MARECHAL FOCH | 1 |  +1 commerce |  | 50 000 | ❌ local commercial/industriel dans la mutation | ❌ local commercial |
| 2021-311294 | 2021-09-20 | 84 RUE CASIMIR PERET | 4 | A42/3, A42/2, A42/3 | 1 | 113 000 | ❌ plusieurs logements (après dédoublonnage) | ❌ plusieurs logements |
| 2021-310941 | 2021-09-23 | 39 AV MARECHAL FOCH | 1 |  +1 commerce |  | 48 000 | ❌ local commercial/industriel dans la mutation | ❌ local commercial |
| 2021-311391 | 2021-09-27 | 108 RUE CASIMIR PERET | 4 | A23/1, A28/1 | 2 | 77 000 | ❌ plusieurs logements (après dédoublonnage) | ❌ plusieurs logements |
| 2021-311525 | 2021-10-04 | 30 AV MARECHAL FOCH | 1 |  +1 commerce |  | 40 000 | ❌ local commercial/industriel dans la mutation | ❌ local commercial |
| 2021-311394 | 2021-10-05 | 30 PL SAINT APHRODISE | 10 | A62/3, A54/3, A62/3, A62/3, A70/5 | 5 | 386 000 | ❌ plusieurs logements (après dédoublonnage) | ❌ plusieurs logements |
| 2021-311630 | 2021-10-08 | 77 RUE CASIMIR PERET | 9 | A51/2, A45/3, A43/3, A48/2, A43/2 | 4 | 306 450 | ❌ plusieurs logements (après dédoublonnage) | ❌ plusieurs logements |
| 2021-312907 | 2021-10-20 | 65 AV MARECHAL FOCH | 5 | A60/3, A39/3, A70/3, A31/2 +1 commerce |  | 277 650 | ❌ local commercial/industriel dans la mutation | ❌ local commercial |
| 2021-313313 | 2021-10-22 | 6 BD DE STRASBOURG | 2 | A37/1 | 1 | 40 500 | ✅ 1 095 €/m² | ✅ 1 095 €/m² |
| 2021-313340 | 2021-10-22 | 6 BD DE STRASBOURG | 2 | A40/2 | 1 | 40 500 | ✅ 1 013 €/m² | ✅ 1 013 €/m² |
| 2021-313357 | 2021-10-22 | 6 BD DE STRASBOURG | 3 | A38/1, A35/1 | 1 | 81 000 | ❌ plusieurs logements (après dédoublonnage) | ❌ plusieurs logements |
| 2021-312792 | 2021-10-25 | 41 AV MARECHAL FOCH | 1 | A41/2 |  | 41 500 | ✅ 1 012 €/m² | ✅ 1 012 €/m² |
| 2021-313389 | 2021-10-29 | 16 RUE DE LA FAIENCE | 7 | A18/2, A45/2, A40/2, A20/2 | 3 | 171 200 | ❌ plusieurs logements (après dédoublonnage) | ❌ plusieurs logements |
| 2021-313363 | 2021-11-09 | 3 AV ALBERT 1ER | 2 |  +1 commerce |  | 35 000 | ❌ local commercial/industriel dans la mutation | ❌ local commercial |
| 2021-313636 | 2021-11-09 | 51 AV MARECHAL FOCH | 1 |  +1 commerce |  | 30 000 | ❌ local commercial/industriel dans la mutation | ❌ local commercial |
| 2021-313648 | 2021-11-29 | 49 AV MARECHAL FOCH | 1 | A38/1 |  | 43 000 | ✅ 1 132 €/m² | ✅ 1 132 €/m² |
| 2021-314279 | 2021-12-02 | 19 RUE GAYON | 4 | A46/2, A42/2, A46/2 | 1 | 170 000 | ❌ plusieurs logements (après dédoublonnage) | ❌ plusieurs logements |
| 2021-314803 | 2021-12-06 | 73 RUE CASIMIR PERET | 4 | A28/1, A28/1, A28/1, A35/1 |  | 133 000 | ❌ plusieurs logements (après dédoublonnage) | ❌ plusieurs logements |
| 2021-314984 | 2021-12-13 | 81 RUE CASIMIR PERET | 1 | A88/3 |  | 37 000 | ✅ 420 €/m² | ✅ 420 €/m² |
| 2021-314944 | 2021-12-14 | 3 AV ALBERT 1ER | 9 | A22/2, A57/3, A36/2, A19/1, A58/3, A43/2, A27/1 | 1 | 310 000 | ❌ plusieurs logements (après dédoublonnage) | ❌ plusieurs logements |
| 2021-315376 | 2021-12-22 | 46 PL SAINT APHRODISE | 1 | M46/4 |  | 37 000 | ✅ 804 €/m² | ✅ 804 €/m² |
| 2021-315092 | 2021-12-23 | 14 RUE MALBEC | 5 | A60/3, A60/3 | 3 | 107 850 | ✅ 1 798 €/m² | ✅ 1 798 €/m² |
| 2021-315965 | 2021-12-27 | 30 AV MARECHAL FOCH | 1 | A52/2 |  | 41 000 | ✅ 788 €/m² | ✅ 788 €/m² |
| 2022-572937 | 2022-01-04 | 25 RUE PUITS DE LA COURTE | 1 | M47/2 |  | 50 400 | ✅ 1 072 €/m² | ✅ 1 072 €/m² |
| 2022-572521 | 2022-01-07 | 31B RUE DU TOUAT | 3 | A61/2 | 2 | 108 531 | ✅ 1 779 €/m² | ✅ 1 779 €/m² |
| 2022-572841 | 2022-01-18 | 118 RUE CASIMIR PERET | 1 | A32/1 |  | 44 860 | ✅ 1 402 €/m² | ✅ 1 402 €/m² |
| 2022-573283 | 2022-01-19 | 21 RUE MALBEC | 1 | M100/4 |  | 19 000 | ❌ prix/m² hors 200 – 25 000 € | ❌ prix/m² hors 300 – 3 500 (190) |
| 2022-573696 | 2022-01-31 | 1 IMP CARLES | 7 | A41/2, A50/3, A50/3 +1 commerce | 2 | 80 000 | ❌ local commercial/industriel dans la mutation | ❌ local commercial |
| 2022-573813 | 2022-02-01 | 10 RUE DE LA FAIENCE | 2 | M52/3 |  | 130 000 | ✅ 2 500 €/m² | ✅ 2 500 €/m² |
| 2022-574134 | 2022-02-10 | 9 RUE ERMENGAUD | 1 | M53/3 |  | 80 500 | ✅ 1 519 €/m² | ✅ 1 519 €/m² |
| 2022-575594 | 2022-03-02 | 17 PL SAINT APHRODISE | 5 | A55/2, A55/2, A35/2, A20/1, A55/2 |  | 300 000 | ❌ plusieurs logements (après dédoublonnage) | ❌ plusieurs logements |
| 2022-574434 | 2022-03-04 | 105 RUE CASIMIR PERET | 1 | A67/4 |  | 42 000 | ✅ 627 €/m² | ✅ 627 €/m² |
| 2022-577427 | 2022-04-20 | 4 RUE DE LA FAIENCE | 1 | M85/5 |  | 99 750 | ✅ 1 174 €/m² | ✅ 1 174 €/m² |
| 2022-577112 | 2022-04-30 | 102 RUE CASIMIR PERET | 5 | A31/1, A28/1 | 3 | 105 000 | ❌ plusieurs logements (après dédoublonnage) | ❌ plusieurs logements |
| 2022-578098 | 2022-05-20 | 77 AV MARECHAL FOCH | 1 |  +1 commerce |  | 45 000 | ❌ local commercial/industriel dans la mutation | ❌ local commercial |
| 2022-579651 | 2022-06-07 | 38 PL SAINT APHRODISE | 4 | A50/2, A15/1, A27/2, A46/2 |  | 145 000 | ❌ plusieurs logements (après dédoublonnage) | ❌ plusieurs logements |
| 2022-579213 | 2022-06-14 | 110 RUE CASIMIR PERET | 2 | A77/3 | 1 | 67 670 | ✅ 879 €/m² | ✅ 879 €/m² |
| 2022-580284 | 2022-06-28 | 53 AV MARECHAL FOCH | 2 | A59/3, A13/0 |  | 100 750 | ❌ plusieurs logements (après dédoublonnage) | ❌ plusieurs logements |
| 2022-580627 | 2022-06-29 | 2 RUE ERMENGAUD | 1 | M50/3 |  | 41 000 | ✅ 820 €/m² | ✅ 820 €/m² |
| 2022-580699 | 2022-06-29 | 36 PL SAINT APHRODISE | 1 | M30/4 |  | 55 000 | ✅ 1 833 €/m² | ✅ 1 833 €/m² |
| 2022-581758 | 2022-07-27 | 6 RUE ERMENGAUD | 1 | M90/4 |  | 50 000 | ✅ 556 €/m² | ✅ 556 €/m² |
| 2022-582568 | 2022-08-23 | 47 AV MARECHAL FOCH | 1 | A31/3 |  | 35 150 | ✅ 1 134 €/m² | ✅ 1 134 €/m² |
| 2022-583711 | 2022-09-12 | 110 RUE CASIMIR PERET | 1 | – | 1 | 10 000 | ❌ aucun logement (parcelle, dépendance seule…) | ❌ aucun logement |
| 2022-583704 | 2022-09-14 | 22T RUE ERMENGAUD | 3 | M57/3 | 1 | 70 000 | ✅ 1 228 €/m² | ✅ 1 228 €/m² |
| 2022-583344 | 2022-09-15 | 9001 RUE DU TOUAT | 1 | – | 1 | 235 000 | ❌ aucun logement (parcelle, dépendance seule…) | ❌ aucun logement |
| 2022-584994 | 2022-10-11 | 5 AV ALBERT 1ER | 3 | M160/6, A26/1 |  | 200 000 | ❌ plusieurs logements (après dédoublonnage) | ❌ plusieurs logements |
| 2022-585389 | 2022-10-26 | 27 RUE PUITS DE LA COURTE | 1 | M37/2 |  | 18 239 | ✅ 493 €/m² | ✅ 493 €/m² |
| 2022-585526 | 2022-11-02 | 34 RUE DU TOUAT | 2 | A50/2 | 1 | 35 500 | ✅ 710 €/m² | ✅ 710 €/m² |
| 2022-586452 | 2022-11-23 | 7 RUE MALBEC | 1 | M50/1 |  | 106 000 | ✅ 2 120 €/m² | ✅ 2 120 €/m² |
| 2022-587814 | 2022-12-12 | 1 IMP CARLES | 7 | A41/2, A50/3, A50/3 +1 commerce | 2 | 145 000 | ❌ local commercial/industriel dans la mutation | ❌ local commercial |
| 2022-588043 | 2022-12-19 | 51 AV MARECHAL FOCH | 1 |  +1 commerce |  | 82 900 | ❌ local commercial/industriel dans la mutation | ❌ local commercial |
| 2023-467606 | 2023-01-13 | 85 RUE CASIMIR PERET | 1 | M67/4 |  | 20 000 | ✅ 299 €/m² | ❌ prix/m² hors 300 – 3 500 (299) |
| 2023-468165 | 2023-02-03 | 32 RUE DU TOUAT | 8 | A46/2, A46/2, A46/2, A46/2 +1 commerce | 3 | 142 000 | ❌ local commercial/industriel dans la mutation | ❌ local commercial |
| 2023-468209 | 2023-02-03 | 43B RUE DU TOUAT | 4 | A19/1, A19/1, A19/1 | 1 | 110 825 | ✅ 5 833 €/m² | ❌ prix/m² hors 300 – 3 500 (5 833) |
| 2023-468457 | 2023-02-03 | 82 RUE CASIMIR PERET | 5 | A26/2, A35/2, A35/2, A18/2, A35/2 |  | 175 000 | ❌ plusieurs logements (après dédoublonnage) | ❌ plusieurs logements |
| 2023-468239 | 2023-02-08 | 47 AV MARECHAL FOCH | 1 | A39/2 |  | 44 650 | ✅ 1 145 €/m² | ✅ 1 145 €/m² |
| 2023-469140 | 2023-02-13 | 29 RUE DU TOUAT | 4 | A37/2, A54/2, A54/2, A54/2 |  | 172 000 | ❌ plusieurs logements (après dédoublonnage) | ❌ plusieurs logements |
| 2023-468488 | 2023-02-16 | 7T BD D'ANGLETERRE | 7 | A38/2, A38/2 | 5 | 105 000 | ✅ 2 763 €/m² | ❌ plusieurs logements (lots n° 52, 53) |
| 2023-469159 | 2023-02-28 | 1 RUE MALBEC | 4 | A26/2, A42/3, A42/3, A39/2 |  | 120 000 | ❌ plusieurs logements (après dédoublonnage) | ❌ plusieurs logements |
| 2023-469521 | 2023-03-09 | 47 AV MARECHAL FOCH | 1 | A38/2 |  | 53 000 | ✅ 1 395 €/m² | ✅ 1 395 €/m² |
| 2023-470815 | 2023-03-13 | 19 RUE ERMENGAUD | 1 | M48/3 |  | 47 000 | ✅ 979 €/m² | ✅ 979 €/m² |
| 2023-470612 | 2023-03-20 | 29 RUE PUITS DE LA COURTE | 1 | M70/3 |  | 166 801 | ✅ 2 383 €/m² | ✅ 2 383 €/m² |
| 2023-470193 | 2023-03-29 | 1 RUE MALBEC | 4 | A26/2, A42/3, A42/3, A39/2 |  | 151 000 | ❌ plusieurs logements (après dédoublonnage) | ❌ plusieurs logements |
| 2023-471391 | 2023-04-26 | 19 RUE MALBEC | 1 | M52/3 |  | 57 000 | ✅ 1 096 €/m² | ✅ 1 096 €/m² |
| 2023-471866 | 2023-04-28 | 44 RUE DU TOUAT | 1 | A40/3 |  | 30 000 | ✅ 750 €/m² | ✅ 750 €/m² |
| 2023-472319 | 2023-05-16 | 53 AV MARECHAL FOCH | 1 |  +1 commerce |  | 61 000 | ❌ local commercial/industriel dans la mutation | ❌ local commercial |
| 2023-475113 | 2023-07-28 | 3 RUE GAYON | 4 | A52/3 | 2 | 60 000 | ✅ 1 154 €/m² | ✅ 1 154 €/m² |
| 2023-475296 | 2023-08-02 | 44 RUE DU TOUAT | 2 | A40/2 | 1 | 34 000 | ✅ 850 €/m² | ✅ 850 €/m² |
| 2023-474841 | 2023-08-03 | 71B RUE CASIMIR PERET | 1 | M48/3 |  | 55 000 | ✅ 1 146 €/m² | ✅ 1 146 €/m² |
| 2023-475861 | 2023-09-06 | 12 RUE ERMENGAUD | 1 | M70/4 |  | 70 000 | ✅ 1 000 €/m² | ✅ 1 000 €/m² |
| 2023-476754 | 2023-09-29 | 37B RUE DU TOUAT | 1 | M55/4 |  | 36 000 | ✅ 655 €/m² | ✅ 655 €/m² |
| 2023-477200 | 2023-10-09 | 40 RUE DU TOUAT | 2 | A25/1, A18/1 |  | 15 000 | ❌ plusieurs logements (après dédoublonnage) | ❌ plusieurs logements |
| 2023-477533 | 2023-10-12 | 1 RUE DU BON PASTEUR | 1 | M92/4 |  | 119 100 | ✅ 1 295 €/m² | ✅ 1 295 €/m² |
| 2023-477341 | 2023-10-13 | 105 RUE CASIMIR PERET | 1 | – | 1 | 5 000 | ❌ aucun logement (parcelle, dépendance seule…) | ❌ aucun logement |
| 2023-478529 | 2023-11-02 | 12 RUE PUITS DE LA COURTE | 1 | M65/3 |  | 20 000 | ✅ 308 €/m² | ✅ 308 €/m² |
| 2023-477963 | 2023-11-03 | 24 RUE MALBEC | 4 | A65/2, A65/3 | 2 | 152 500 | ❌ plusieurs logements (après dédoublonnage) | ❌ plusieurs logements |
| 2023-478167 | 2023-11-10 | 39 RUE DU TOUAT | 4 | A30/1, A30/1, A30/1 | 1 | 47 000 | ✅ 1 567 €/m² | ✅ 1 567 €/m² |
| 2023-478697 | 2023-11-22 | 9 RUE PUITS DE LA COURTE | 1 | M95/5 |  | 86 642 | ✅ 912 €/m² | ✅ 912 €/m² |
| 2023-479993 | 2023-12-13 | 47 AV MARECHAL FOCH | 1 | A42/2 |  | 38 000 | ✅ 905 €/m² | ✅ 905 €/m² |
| 2023-479461 | 2023-12-14 | 85 RUE CASIMIR PERET | 1 | M67/4 |  | 30 000 | ✅ 448 €/m² | ✅ 448 €/m² |
| 2023-480003 | 2023-12-18 | 24 PL SAINT APHRODISE | 1 | M85/5 |  | 90 000 | ✅ 1 059 €/m² | ✅ 1 059 €/m² |
| 2023-479822 | 2023-12-21 | 51 AV MARECHAL FOCH | 2 | A39/1 | 1 | 1 200 | ❌ valeur hors 5 000 € – 10 M€ | ❌ prix/m² hors 300 – 3 500 (31) |
| 2023-479823 | 2023-12-21 | 51 AV MARECHAL FOCH | 2 | A41/2 | 1 | 2 500 | ❌ valeur hors 5 000 € – 10 M€ | ❌ prix/m² hors 300 – 3 500 (61) |
| 2024-423084 | 2024-01-04 | 27 RUE MALBEC | 5 | A16/1, A32/1, A15/1 | 2 | 60 000 | ❌ plusieurs logements (après dédoublonnage) | ❌ plusieurs logements |
| 2024-423275 | 2024-01-12 | 105 RUE CASIMIR PERET | 1 | – | 1 | 5 000 | ❌ aucun logement (parcelle, dépendance seule…) | ❌ aucun logement |
| 2024-422996 | 2024-01-19 | 6 PL SAINT APHRODISE | 1 | A70/4 |  | 80 000 | ✅ 1 143 €/m² | ✅ 1 143 €/m² |
| 2024-424611 | 2024-02-29 | 22 PL SAINT APHRODISE | 1 | A46/3 |  | 61 810 | ✅ 1 344 €/m² | ✅ 1 344 €/m² |
| 2024-424353 | 2024-03-01 | 77 AV MARECHAL FOCH | 2 | A55/3 | 1 | 86 024 | ✅ 1 564 €/m² | ✅ 1 564 €/m² |
| 2024-424678 | 2024-03-18 | 7B RUE ERMENGAUD | 1 | M52/4 |  | 22 500 | ✅ 433 €/m² | ✅ 433 €/m² |
| 2024-425417 | 2024-04-04 | 28 PL SAINT APHRODISE | 1 | M60/3 |  | 60 000 | ✅ 1 000 €/m² | ✅ 1 000 €/m² |
| 2024-425674 | 2024-04-22 | 39 RUE DU TOUAT | 4 | A30/1, A30/1, A30/1 | 1 | 110 000 | ✅ 3 667 €/m² | ❌ prix/m² hors 300 – 3 500 (3 667) |
| 2024-426328 | 2024-04-30 | 118 RUE CASIMIR PERET | 2 | A23/1 | 1 | 47 500 | ✅ 2 065 €/m² | ✅ 2 065 €/m² |
| 2024-426589 | 2024-05-17 | 73 AV MARECHAL FOCH | 10 | A40/2, A40/2, A40/2, A40/2 +1 commerce | 4 | 227 400 | ❌ local commercial/industriel dans la mutation | ❌ local commercial |
| 2024-426898 | 2024-05-24 | 11 RUE ERMENGAUD | 1 | A77/3 |  | 59 000 | ✅ 766 €/m² | ✅ 766 €/m² |
| 2024-427108 | 2024-05-28 | 110 RUE CASIMIR PERET | 3 | A77/3 | 2 | 123 500 | ✅ 1 604 €/m² | ✅ 1 604 €/m² |
| 2024-429010 | 2024-07-26 | 4 RUE DU BON PASTEUR | 5 | A55/4, A55/3, A55/2 | 2 | 240 400 | ❌ plusieurs logements (après dédoublonnage) | ❌ plusieurs logements |
| 2024-429498 | 2024-08-20 | 11 RUE GAYON | 3 | A35/1, A30/1, A35/1 |  | 112 000 | ❌ plusieurs logements (après dédoublonnage) | ❌ plusieurs logements |
| 2024-429271 | 2024-08-22 | 49 AV MARECHAL FOCH | 2 | A38/2 | 1 | 38 000 | ✅ 1 000 €/m² | ✅ 1 000 €/m² |
| 2024-429572 | 2024-08-26 | 51 AV MARECHAL FOCH | 1 | A41/2 |  | 58 000 | ✅ 1 415 €/m² | ✅ 1 415 €/m² |
| 2024-430222 | 2024-09-12 | 30 RUE MALBEC | 1 | M60/3 |  | 96 000 | ✅ 1 600 €/m² | ✅ 1 600 €/m² |
| 2024-430436 | 2024-09-19 | 10 RUE ERMENGAUD | 4 | A30/1, A15/1, A30/1, A30/1 |  | 136 880 | ❌ plusieurs logements (après dédoublonnage) | ❌ plusieurs logements |
| 2024-431226 | 2024-09-26 | 8 RUE PUITS DE LA COURTE | 4 | A22/1, A22/1, A22/1 | 1 | 117 900 | ✅ 5 359 €/m² | ❌ prix/m² hors 300 – 3 500 (5 359) |
| 2024-431188 | 2024-10-02 | 34 PL SAINT APHRODISE | 1 | M32/2 |  | 60 000 | ✅ 1 875 €/m² | ✅ 1 875 €/m² |
| 2024-432390 | 2024-11-12 | 3 RUE GAYON | 4 | A52/3 | 2 | 80 000 | ✅ 1 538 €/m² | ✅ 1 538 €/m² |
| 2024-432626 | 2024-11-21 | 6 RUE DE LA FAIENCE | 1 | M60/4 |  | 109 450 | ✅ 1 824 €/m² | ✅ 1 824 €/m² |
| 2024-432810 | 2024-11-29 | 35 AV MARECHAL FOCH | 5 | A48/2 | 4 | 15 000 | ✅ 313 €/m² | ✅ 313 €/m² |
| 2025-467094 | 2025-01-14 | 14 RUE DE LA FAIENCE | 1 | M80/4 |  | 95 000 | ✅ 1 188 €/m² | ✅ 1 188 €/m² |
| 2025-467719 | 2025-02-05 | 27B RUE DU TOUAT | 2 | A34/2 | 1 | 40 000 | ✅ 1 176 €/m² | ✅ 1 176 €/m² |
| 2025-467413 | 2025-02-07 | 34B RUE DU TOUAT | 1 | A50/2 |  | 28 000 | ✅ 560 €/m² | ✅ 560 €/m² |
| 2025-468051 | 2025-02-07 | 41 AV MARECHAL FOCH | 1 | A42/2 |  | 53 000 | ✅ 1 262 €/m² | ✅ 1 262 €/m² |
| 2025-468620 | 2025-03-11 | 37B RUE DU TOUAT | 1 | M55/4 |  | 77 000 | ✅ 1 400 €/m² | ✅ 1 400 €/m² |
| 2025-469394 | 2025-03-31 | 116 RUE CASIMIR PERET | 1 | A50/2 |  | 57 000 | ✅ 1 140 €/m² | ✅ 1 140 €/m² |
| 2025-469553 | 2025-04-03 | 34 PL SAINT APHRODISE | 1 | M32/2 |  | 72 500 | ✅ 2 266 €/m² | ✅ 2 266 €/m² |
| 2025-469764 | 2025-04-07 | 71B RUE CASIMIR PERET | 1 | M48/3 |  | 72 000 | ✅ 1 500 €/m² | ✅ 1 500 €/m² |
| 2025-470153 | 2025-04-07 | 53 AV MARECHAL FOCH | 2 | A13/1, A55/3 |  | 76 210 | ❌ plusieurs logements (après dédoublonnage) | ❌ plusieurs logements |
| 2025-470319 | 2025-04-25 | 95 RUE CASIMIR PERET | 1 | A19/1 |  | 32 800 | ✅ 1 726 €/m² | ✅ 1 726 €/m² |
| 2025-469897 | 2025-04-28 | 16 RUE MALBEC | 4 | A50/1, A50/2 | 2 | 145 200 | ❌ plusieurs logements (après dédoublonnage) | ❌ plusieurs logements |
| 2025-471330 | 2025-05-19 | 81 RUE CASIMIR PERET | 14 | A55/1, A30/2, A39/2, A88/3, A45/3, A65/2, A69/2 +3 commerce | 4 | 410 000 | ❌ local commercial/industriel dans la mutation | ❌ local commercial |
| 2025-471194 | 2025-05-21 | 116 RUE CASIMIR PERET | 1 | A50/3 |  | 60 350 | ✅ 1 207 €/m² | ✅ 1 207 €/m² |
| 2025-472533 | 2025-07-07 | 34 PL SAINT APHRODISE | 1 | M32/2 |  | 86 500 | ✅ 2 703 €/m² | ✅ 2 703 €/m² |
| 2025-473587 | 2025-07-21 | 41 AV MARECHAL FOCH | 1 |  +1 commerce |  | 67 000 | ❌ local commercial/industriel dans la mutation | ❌ local commercial |
| 2025-472993 | 2025-07-28 | 8 RUE DE LA FAIENCE | 1 | M79/4 |  | 150 000 | ✅ 1 899 €/m² | ✅ 1 899 €/m² |
| 2025-474457 | 2025-09-04 | 39T RUE DU TOUAT | 1 | M55/3 |  | 45 000 | ✅ 818 €/m² | ✅ 818 €/m² |
| 2025-474789 | 2025-09-23 | 36 PL SAINT APHRODISE | 1 | M30/4 |  | 65 000 | ✅ 2 167 €/m² | ✅ 2 167 €/m² |
| 2025-475080 | 2025-09-24 | 19 RUE ERMENGAUD | 1 | M48/3 |  | 71 000 | ✅ 1 479 €/m² | ✅ 1 479 €/m² |
| 2025-475964 | 2025-10-14 | 29 AV MARECHAL FOCH | 11 | A62/3, A60/2, A62/2 +1 commerce | 7 | 220 000 | ❌ local commercial/industriel dans la mutation | ❌ local commercial |
| 2025-476150 | 2025-10-24 | 2 PL DU ONZE NOVEMBRE | 1 | A40/2 |  | 52 250 | ✅ 1 306 €/m² | ✅ 1 306 €/m² |
| 2025-477118 | 2025-12-05 | 73 RUE CASIMIR PERET | 4 | A28/1, A28/1, A28/1, A35/1 |  | 152 000 | ❌ plusieurs logements (après dédoublonnage) | ❌ plusieurs logements |
| 2025-477518 | 2025-12-11 | 4 RUE ERMENGAUD | 1 | M50/2 |  | 114 000 | ✅ 2 280 €/m² | ✅ 2 280 €/m² |
| 2025-477707 | 2025-12-11 | 18 RUE DE LA FAIENCE | 2 | M80/3 +1 commerce |  | 199 000 | ❌ local commercial/industriel dans la mutation | ❌ local commercial |
| 2025-478072 | 2025-12-31 | 13B RUE GAYON | 1 | M60/3 |  | 105 000 | ✅ 1 750 €/m² | ✅ 1 750 €/m² |
| 2026-204849 | 2026-01-09 | 116 RUE CASIMIR PERET | 1 | A50/3 |  | 72 500 | ✅ 1 450 €/m² | ✅ 1 450 €/m² |
| 2026-205193 | 2026-01-20 | 6 PL SAINT APHRODISE | 3 | A110/4 | 2 | 63 000 | ✅ 573 €/m² | ✅ 573 €/m² |
| 2026-205725 | 2026-02-19 | 7 BD D'ANGLETERRE | 6 | A67/3, A56/3, A67/3, A41/2 | 1 | 231 800 | ❌ plusieurs logements (après dédoublonnage) | ❌ plusieurs logements |
| 2026-205933 | 2026-02-19 | 22 RUE ERMENGAUD | 2 | – | 1 | 50 000 | ❌ aucun logement (parcelle, dépendance seule…) | ❌ aucun logement |
| 2026-205921 | 2026-02-24 | 9B RUE ERMENGAUD | 1 | M23/2 |  | 55 600 | ✅ 2 417 €/m² | ✅ 2 417 €/m² |
| 2026-206163 | 2026-02-27 | 67 AV MARECHAL FOCH | 1 | A54/3 |  | 63 000 | ✅ 1 167 €/m² | ✅ 1 167 €/m² |
| 2026-206464 | 2026-03-24 | 7 BD D'ANGLETERRE | 1 | M68/3 |  | 64 000 | ✅ 941 €/m² | ✅ 941 €/m² |
| 2026-206941 | 2026-03-26 | 53 AV MARECHAL FOCH | 1 | A69/3 |  | 74 300 | ✅ 1 077 €/m² | ✅ 1 077 €/m² |
| 2026-207069 | 2026-04-01 | 10 RUE DE LA FAIENCE | 1 | M53/2 |  | 87 000 | ✅ 1 642 €/m² | ✅ 1 642 €/m² |
| 2026-207682 | 2026-04-09 | 80 RUE CASIMIR PERET | 1 | M25/2 |  | 59 000 | ✅ 2 360 €/m² | ✅ 2 360 €/m² |
| 2026-207333 | 2026-04-17 | 91 RUE CASIMIR PERET | 1 | M65/3 |  | 65 100 | ✅ 1 002 €/m² | ✅ 1 002 €/m² |
| 2026-207588 | 2026-04-24 | 23 PL SAINT APHRODISE | 4 | A46/1, A70/3 | 2 | 130 000 | ❌ plusieurs logements (après dédoublonnage) | ❌ plusieurs logements |
| 2026-208204 | 2026-05-07 | 24 PL SAINT APHRODISE | 1 | M85/5 |  | 112 595 | ✅ 1 325 €/m² | ✅ 1 325 €/m² |
| 2026-209193 | 2026-06-16 | 4 IMP CARLES | 2 | M56/3 |  | 162 000 | ✅ 2 893 €/m² | ✅ 2 893 €/m² |
| 2026-209859 | 2026-06-23 | 31 AV MARECHAL FOCH | 2 | A40/2, A60/3 |  | 45 000 | ❌ plusieurs logements (après dédoublonnage) | ❌ plusieurs logements |
| 2026-209432 | 2026-06-25 | 110 RUE CASIMIR PERET | 1 | A79/3 |  | 108 755 | ✅ 1 377 €/m² | ✅ 1 377 €/m² |
