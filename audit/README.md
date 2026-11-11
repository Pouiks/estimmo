# Audit du calcul d'estimation de vente

Dossier indépendant du code de production : rien ici n'est importé par le site.
Les scripts **importent** les fonctions du site (nettoyage DVF, moteur) pour
rejouer exactement sa logique ; seules les fonctions SQL et les arrondis de
l'import sont reproduits en TypeScript (ils ne sont pas importables).

| Fichier | Rôle |
|---|---|
| `RAPPORT-estimation-vente.md` | Rapport d'audit : flux de calcul, 14 questions, écarts, bugs classés, propositions |
| `reproduire-estimation.ts` | Rejoue le nettoyage et le moteur sur un export DVF (CSV geo-dvf, CSV ou JSON de l'explorateur DVF) |
| `comparables-base.ts` | Ce que le site calcule réellement : lit la base de production (SELECT seulement) avec les mêmes fonctions SQL que `/api/leads`, puis applique le moteur |
| `fixtures/pieges.csv` | Jeu synthétique de 8 mutations (vente simple, 2 lots, prix dérisoire, lignes identiques, commerce, VEFA, maison + garage) |
| `resultats/` | Sorties de référence commitées pour le cas Béziers 34032 000PX (11/11/2026) |
| `data/`, `sorties/` | Téléchargements et sorties horodatées (ignorés par git) |

## Commandes

```bash
# 1. Télécharger la section cadastrale de référence (explorateur DVF, données 07/2021 → 06/2026)
node --import tsx audit/reproduire-estimation.ts --telecharger 34032/000PX

# 2. Rejouer le nettoyage, les statistiques de zone et le moteur sur ce fichier
node --import tsx audit/reproduire-estimation.ts --json audit/data/34032-000PX.json \
  --type appartement --surface 41 --date-ref 2026-11-11 --date-max 2025-12-31

# Même chose depuis un export CSV (geo-dvf « , » ou explorateur « ; », détection automatique)
node --import tsx audit/reproduire-estimation.ts --csv mon-export.csv --section 000PX --type maison --surface 55

# 3. Résultat réel du site depuis la base (lecture seule, SUPABASE_DB_URL dans .env.local)
node --env-file-if-exists=.env.local --import tsx audit/comparables-base.ts \
  --lat 43.347125 --lon 3.215228 --insee 34032 --type appartement --surface 41 --date-ref 2026-11-11

# Contrôle rapide sans données : les pièges doivent sortir avec le statut attendu (voir ci-dessous)
node --import tsx audit/reproduire-estimation.ts --csv audit/fixtures/pieges.csv --type appartement --surface 60
```

Options du bien pour rejouer les ajustements : `--etat a_renover|a_rafraichir|bon|refait_neuf`,
`--dpe A..G`, `--etage 2`, `--ascenseur oui|non`, `--dernier-etage`,
`--exterieur balcon,terrasse,jardin`, `--stationnement aucun|place|garage_box`,
`--cuisine` et `--sdb` (`moins_5|5_10|10_20|plus_20`). Sans option : résultat « avant ajustements ».

`--date-max` limite les ventes à celles réellement présentes en base (le 11/11/2026 :
dernière vente du 31/12/2025). `--date-ref` fixe le « aujourd'hui » du calcul (fenêtre de 30 mois).

## Ce que le script affiche

- **A.** Tri des mutations par le nettoyage du site, avec le motif d'exclusion.
- **B.** Prix au m² de la zone par type (nombre, moyenne, médiane ; toute la période,
  12 derniers mois, ventes présentes en base) avec les filtres du site puis avec les
  filtres de référence (1 logement, pas de commerce, 300-3 500 €/m²), et la liste des
  mutations classées différemment avec l'explication.
- **C.** Reproduction du moteur pour un bien : comparables retenus (id_mutation, date,
  adresse, prix, surface, €/m², distance, poids), palier, médiane pondérée, ajustements,
  fourchette, confiance, et le calcul à la main étape par étape.
- **D.** Toutes les mutations du fichier avec leur statut dans les deux filtres.

## Résultat attendu sur `fixtures/pieges.csv`

| Mutation | Site | Référence |
|---|---|---|
| TEST-SIMPLE, TEST-SIMPLE-BIS | retenues (2 000 et 1 818 €/m²) | retenues |
| TEST-MULTI-LOTS (40 m² + 60 m² pour 45 000 €) | exclue : plusieurs logements | exclue |
| TEST-PRIX-DERISOIRE (39 m² pour 1 200 €) | exclue : valeur < 5 000 € | exclue : 31 €/m² |
| TEST-LIGNES-IDENTIQUES (3 × 19 m² pour 110 825 €) | exclue : plusieurs logements (en 1.0.0 : **retenue à 5 833 €/m²**, lignes fusionnées) | exclue : > 3 500 €/m² |
| TEST-COMMERCE | exclue : local commercial | exclue |
| TEST-VEFA | exclue : nature ≠ Vente | exclue |
| TEST-MAISON-GARAGE (maison + 1 dépendance) | retenue à 2 500 €/m² (prix du garage inclus ; à partir de 2 dépendances la mutation est exclue) | retenue |

Les sorties de `resultats/1.0.0/` ont été produites avec les règles d'avant la version
2.0.0 (11/11/2026) ; celles de `resultats/` avec les règles courantes. Le rapport
d'audit décrit l'état 1.0.0.

## Limites

- La base compacte (`dvf_mutations`) ne conserve ni `id_mutation`, ni adresse, ni prix
  total, ni section cadastrale : la liste nominative des comparables n'est possible que
  depuis un export (script 1). Le script 2 donne les chiffres réels du site mais des
  comparables anonymes.
- Un export limité à une section ne reproduit pas le résultat du site : le rayon de
  400 m déborde de la section et la base contient toute la commune (68 comparables
  réels contre 10 dans la section pour un appartement de 41 m²).
- Distance : haversine (sphère) au lieu de `st_distance` sur sphéroïde WGS84 ; écart
  inférieur à 0,5 %, sans effet sur la sélection sauf vente exactement en limite de rayon.

## Versions 2.1.0 et 3.0.0 (11/11/2026)

- 2.1.0 : frais de notaire estimés sous le résultat (`lib/estimation/frais-notaire.ts`).
- 3.0.0 : fenêtre de 30 mois ancrée sur la dernière vente connue (`dvf_meta`, migration
  `20261111120000`) et écrêtage des prix atypiques dès 12 comparables (`ecarterAtypiques`).
  `comparables-base.ts` lit la date d'ancrage en base (`--derniere-vente AAAA-MM-JJ` pour
  la forcer) ; `reproduire-estimation.ts` ancre la fenêtre sur `--date-max`. Sorties
  2.0.0 conservées dans `resultats/2.0.0/`.
