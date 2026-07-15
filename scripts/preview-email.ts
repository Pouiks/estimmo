/**
 * Génère un aperçu HTML des emails prospect (vente / location / manuelle)
 * dans un dossier temporaire, sans passer par le fournisseur d'email.
 * Usage : pnpm email:preview
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { renderEmailProspect } from "../lib/email/template";
import type { LeadPayload } from "../lib/leads/schema";
import type {
  EstimationLocation,
  EstimationVente,
} from "../lib/estimation/types";

const leadBase: LeadPayload = {
  projet: "vente",
  horizon: "moins_3_mois",
  typeBien: "appartement",
  adresse: {
    libelle: "12 Avenue de la République, 06300 Nice",
    codeInsee: "06088",
    codePostal: "06300",
    lat: 43.706,
    lon: 7.283,
  },
  surface: 62,
  pieces: 3,
  chambres: 2,
  etage: 2,
  ascenseur: true,
  surfaceTerrain: null,
  anneeConstruction: "1950_1975",
  exterieur: ["balcon"],
  stationnement: "aucun",
  etatGeneral: "bon",
  ageCuisine: "5_10",
  ageSdb: "10_20",
  dpe: "D",
  atouts: ["lumineux"],
  prenom: "Sophie",
  nom: "Martin",
  email: "sophie.martin@example.com",
  telephone: "0612345678",
  consentement: true,
};

const estimationVente: EstimationVente = {
  projet: "vente",
  fourchetteBasse: 224000,
  mediane: 263000,
  fourchetteHaute: 303000,
  prixM2Zone: 4206,
  prixM2Ajuste: 4248,
  nbComparables: 211,
  rayonM: 400,
  palier: "rayon",
  confiance: "haute",
  ajustementPct: 1,
  fourchettePct: 10,
};

const estimationLocation: EstimationLocation = {
  projet: "location",
  loyerBas: 850,
  loyerMedian: 940,
  loyerHaut: 1040,
  loyerM2Zone: 20.9,
  typologie: "t3_plus",
  millesime: 2025,
  ajustementPct: 0,
  confiance: "indicative",
  dpeAlerte: null,
};

const cas = [
  { nom: "vente", lead: leadBase, estimation: estimationVente },
  {
    nom: "location",
    lead: { ...leadBase, projet: "location" as const, horizon: null },
    estimation: estimationLocation,
  },
  {
    nom: "manuelle",
    lead: {
      ...leadBase,
      prenom: "Karim",
      adresse: { ...leadBase.adresse, libelle: "1 Place Kléber, 67000 Strasbourg", codeInsee: "67482" },
    },
    estimation: null,
  },
];

const outDir = path.join(tmpdir(), "estimmo-email-preview");
mkdirSync(outDir, { recursive: true });

for (const c of cas) {
  const { subject, html } = renderEmailProspect({
    lead: c.lead,
    estimation: c.estimation,
  });
  const file = path.join(outDir, `email-${c.nom}.html`);
  writeFileSync(file, html, "utf8");
  console.log(`[${c.nom}] « ${subject} »\n  → ${file}`);
}

console.log(`\nOuvre ces fichiers dans un navigateur pour voir le rendu.`);
