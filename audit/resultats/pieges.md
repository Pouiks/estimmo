# Reproduction du calcul d'estimation - audit/fixtures/pieges.csv

- 15 lignes, 8 mutations, ventes du 2023-02-03 au 2026-06-23
- Généré le 2026-11-11 16:17 ; date de calcul : 2026-11-11
- Logique importée du site : scripts/dvf-clean.ts (nettoyage), lib/estimation/vente.ts, stats.ts, ajustements.ts ; SQL et arrondis d'import reproduits dans ce script.

## A. Tri des mutations par le nettoyage du site (scripts/dvf-clean.ts)

| Statut | Mutations |
|---|---:|
| retenue par le site | 3 |
| plusieurs logements (après dédoublonnage) | 2 |
| valeur hors 5 000 € – 10 M€ | 1 |
| local commercial/industriel dans la mutation | 1 |
| nature ≠ Vente | 1 |

## B. Prix au m² de la zone, avant tout ajustement

### Filtres du site (Vente, 1 logement, pas de commerce, 8-500 m², 5 k€-10 M€, 200-25 000 €/m², coordonnées)

| Périmètre | Ventes | Moyenne €/m² | Médiane €/m² |
|---|---:|---:|---:|
| maisons, toute la période | 1 | 2 500 | 2 500 |
| maisons, 12 derniers mois (depuis le 2025-06-23) | 1 | 2 500 | 2 500 |
| appartements, toute la période | 2 | 1 909 | 1 909 |
| appartements, 12 derniers mois (depuis le 2025-06-23) | 2 | 1 909 | 1 909 |

### Filtres de référence (Vente, 1 logement, pas de commerce, 300-3 500 €/m²)

| Périmètre | Ventes | Moyenne €/m² | Médiane €/m² |
|---|---:|---:|---:|
| maisons, toute la période | 1 | 2 500 | 2 500 |
| maisons, 12 derniers mois (depuis le 2025-06-23) | 1 | 2 500 | 2 500 |
| appartements, toute la période | 2 | 1 909 | 1 909 |
| appartements, 12 derniers mois (depuis le 2025-06-23) | 2 | 1 909 | 1 909 |

### Mutations classées différemment par les deux filtres

Aucune différence entre les deux filtres.

### Surface Carrez des lots vs surface réelle bâtie (appartements retenus)

2 appartements ont une surface Carrez renseignée : ratio Carrez / surface_reelle_bati médian **0.958** (Q1 0.952, Q3 0.964). Le site compare la surface Carrez saisie par le prospect à `surface_reelle_bati` et ne lit jamais `lotN_surface_carrez`.

## C. Reproduction du moteur du site pour un bien donné

- Bien : appartement de 60 m² au point 43.348067, 3.217067
- Date de calcul : 2026-11-11 → ventes depuis le **2024-05-11** (30 mois, repository.ts:25-29)
- Surface des comparables : **42 à 78 m²** (×0,7 / ×1,3 puis ceil/floor, SQL lignes 56-57)
- Candidats ≤ 3 000 m : 2 ; ≤ 400 m : 2 ; ≤ 800 m : 2 ; ≤ 1500 m : 2 ; ≤ 3000 m : 2

**Aucun palier n'atteint 8 comparables dans ce fichier → le site basculerait en estimation manuelle** (si le fichier ne couvre qu'une section, la vraie base contient le reste de la commune : voir audit/comparables-base.ts).

## D. Toutes les mutations du fichier

| id_mutation | Date | Adresse | Lignes | Locaux (type/surface/pièces) | Dép. | Prix | Site | Référence |
|---|---|---|---:|---|---:|---:|---|---|
| TEST-LIGNES-IDENTIQUES | 2023-02-03 | 43 RUE DU TOUAT | 4 | A19/1, A19/1, A19/1 | 1 | 110 825 | ❌ plusieurs logements (après dédoublonnage) | ❌ prix/m² hors 300 – 3 500 (5 833) |
| TEST-PRIX-DERISOIRE | 2023-12-21 | 51 AV MARECHAL FOCH | 2 | A39/1 | 1 | 1 200 | ❌ valeur hors 5 000 € – 10 M€ | ❌ prix/m² hors 300 – 3 500 (31) |
| TEST-COMMERCE | 2025-05-05 | 5 RUE DU COMMERCE | 2 | A70/3 +1 commerce |  | 300 000 | ❌ local commercial/industriel dans la mutation | ❌ local commercial |
| TEST-VEFA | 2025-09-01 | 7 RUE NEUVE | 1 | A65/3 |  | 210 000 | ❌ nature ≠ Vente | ❌ nature ≠ Vente |
| TEST-MAISON-GARAGE | 2025-11-15 | 12 RUE DES JARDINS | 2 | M100/4 | 1 | 250 000 | ✅ 2 500 €/m² | ✅ 2 500 €/m² |
| TEST-SIMPLE-BIS | 2026-02-10 | 11 RUE SIMPLE | 1 | A55/2 |  | 100 000 | ✅ 1 818 €/m² | ✅ 1 818 €/m² |
| TEST-SIMPLE | 2026-03-10 | 10 RUE SIMPLE | 1 | A60/3 |  | 120 000 | ✅ 2 000 €/m² | ✅ 2 000 €/m² |
| TEST-MULTI-LOTS | 2026-06-23 | 31 AV MARECHAL FOCH | 2 | A40/2, A60/3 |  | 45 000 | ❌ plusieurs logements (après dédoublonnage) | ❌ plusieurs logements (lots n° 1, 2) |
