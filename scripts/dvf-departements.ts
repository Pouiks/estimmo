// Départements couverts par DVF. Absents : 57 (Moselle), 67 (Bas-Rhin),
// 68 (Haut-Rhin) - Livre foncier d'Alsace-Moselle - et 976 (Mayotte).
// Module sans effet de bord : importable par les scripts d'import comme par les tests.
export const DVF_DEPARTEMENTS: string[] = [
  ...Array.from({ length: 19 }, (_, i) => String(i + 1).padStart(2, "0")),
  "2A",
  "2B",
  ...Array.from({ length: 75 }, (_, i) => String(i + 21)),
  "971",
  "972",
  "973",
  "974",
].filter((d) => !["57", "67", "68"].includes(d));
