import { describe, expect, it } from "vitest";
import {
  controlesRestants,
  echeanceDemande,
  etatDemande,
  joursRestants,
} from "./demandes";
import { construireExport, resumeTexte, type LeadBrut } from "./export";
import { critereRecherche } from "./recherche";

describe("échéance de réponse (art. 12.3)", () => {
  it("un mois après réception", () => {
    expect(echeanceDemande("2026-11-13")).toBe("2026-12-13");
    expect(echeanceDemande("2026-12-13")).toBe("2027-01-13");
  });

  it("retombe sur le dernier jour du mois cible quand le jour n'existe pas", () => {
    expect(echeanceDemande("2026-01-31")).toBe("2026-02-28");
    expect(echeanceDemande("2028-01-31")).toBe("2028-02-29");
    expect(echeanceDemande("2026-08-31")).toBe("2026-09-30");
  });

  it("trois mois si la demande est prolongée", () => {
    expect(echeanceDemande("2026-11-13", true)).toBe("2027-02-13");
    expect(echeanceDemande("2026-11-30", true)).toBe("2027-02-28");
  });
});

describe("état d'une demande", () => {
  it("à traiter, en retard, traitée", () => {
    expect(etatDemande({ traitee_le: null, echeance: "2026-12-13" }, "2026-11-20")).toBe("a_traiter");
    expect(etatDemande({ traitee_le: null, echeance: "2026-12-13" }, "2026-12-13")).toBe("a_traiter");
    expect(etatDemande({ traitee_le: null, echeance: "2026-12-13" }, "2026-12-14")).toBe("en_retard");
    expect(etatDemande({ traitee_le: "2026-12-20T10:00:00Z", echeance: "2026-12-13" }, "2027-01-01")).toBe("traitee");
  });

  it("jours restants", () => {
    expect(joursRestants("2026-12-13", "2026-11-13")).toBe(30);
    expect(joursRestants("2026-12-13", "2026-12-15")).toBe(-2);
  });

  it("contrôles externes restants", () => {
    expect(controlesRestants(null)).toBe(4);
    expect(controlesRestants({ crm: true, boite_mail: true })).toBe(2);
    expect(controlesRestants({ crm: true, resend: true, boite_mail: true, exports: true })).toBe(0);
  });
});

describe("recherche d'un prospect", () => {
  it("vide → pas de filtre", () => {
    expect(critereRecherche("")).toEqual({ texte: "", filtre: null });
    expect(critereRecherche("   ")).toEqual({ texte: "", filtre: null });
    expect(critereRecherche(undefined).filtre).toBeNull();
  });

  it("texte → email, nom, prénom", () => {
    const { filtre } = critereRecherche("durand");
    expect(filtre).toBe("email.ilike.*durand*,nom.ilike.*durand*,prenom.ilike.*durand*");
  });

  it("téléphone normalisé en plus du texte", () => {
    expect(critereRecherche("+33 6 12 34 56 78").filtre).toContain("telephone.ilike.*0612345678*");
    expect(critereRecherche("06.12.34.56.78").filtre).toContain("telephone.ilike.*0612345678*");
    expect(critereRecherche("0033612345678").filtre).toContain("telephone.ilike.*0612345678*");
  });

  it("un email n'est pas pris pour un téléphone", () => {
    expect(critereRecherche("a@b.fr").filtre).not.toContain("telephone");
  });

  it("neutralise la syntaxe PostgREST", () => {
    const { filtre } = critereRecherche('x,email.eq.(y)*"');
    expect(filtre).toBe("email.ilike.*x email eq y*,nom.ilike.*x email eq y*,prenom.ilike.*x email eq y*");
  });
});

const LEAD: LeadBrut = {
  id: "11111111-1111-1111-1111-111111111111",
  created_at: "2026-11-09T19:44:42.611Z",
  prenom: "Layla",
  nom: "Duchenoy",
  email: "layla@example.com",
  telephone: "0612345678",
  projet: "vente",
  horizon: "moins_3_mois",
  type_bien: "appartement",
  adresse_libelle: "11 Rue Pierre Durand 92600 Asnières-sur-Seine",
  code_insee: "92004",
  surface: 45,
  pieces: 2,
  chambres: 1,
  etage: 3,
  surface_terrain: null,
  annee_construction: "1950_1975",
  exterieur: ["balcon"],
  atouts: [],
  etat_general: "bon",
  dpe: "D",
  consentement_rgpd: true,
  date_consentement: "2026-11-09T19:44:42.611Z",
  demande_rappel: false,
  demande_rappel_at: null,
  statut: "nouveau",
  score_lead: 72,
  notes: "Rappeler mardi",
  utm: { source: "google", medium: "cpc" },
  locale: "fr",
  estimation: { fourchetteBasse: 280000, mediane: 300000, fourchetteHaute: 320000 },
  estimation_manuelle: false,
  anonymise_le: null,
};

describe("export des données d'un prospect", () => {
  const exp = construireExport({
    leads: [{ ...LEAD, id: "2", created_at: "2026-11-09T19:47:00.000Z", projet: "location", estimation: { loyerBas: 900, loyerMedian: 1000, loyerHaut: 1100 } }, LEAD],
    envois: [
      { lead_id: LEAD.id, status: "sent", sent_at: "2026-11-09T19:45:00Z", created_at: "2026-11-09T19:44:50Z" },
      { lead_id: "autre", status: "sent", sent_at: null, created_at: "2026-11-09T19:44:50Z" },
    ],
    responsable: { nom: "Carenza Brown", email: "contact@example.com" },
    politiqueVersion: "2026-11-13",
    maintenant: new Date("2026-11-13T10:00:00Z"),
  });

  it("trie par date, retire les colonnes internes, ne garde que les envois des leads", () => {
    expect(exp.prospect).toEqual({ email: "layla@example.com", nombre_demandes: 2 });
    expect(exp.demandes.map((d) => d.id)).toEqual([LEAD.id, "2"]);
    expect(exp.demandes[0]).not.toHaveProperty("anonymise_le");
    expect(exp.demandes[0]).not.toHaveProperty("estimation_manuelle");
    expect(exp.demandes[0]).toHaveProperty("notes", "Rappeler mardi");
    expect(exp.transmissions_crm).toHaveLength(1);
  });

  it("résumé en français : toutes les données, estimation et transmission CRM", () => {
    const texte = resumeTexte(exp, "fr");
    expect(texte).toContain("Nombre de demandes d'estimation : 2");
    expect(texte).toContain("--- Demande 1 / 2 ---");
    expect(texte).toContain("Email : layla@example.com");
    expect(texte).toContain("Consentement : oui");
    expect(texte).toContain("Notes internes : Rappeler mardi");
    expect(texte).toContain("Source de la visite : source=google, medium=cpc");
    expect(texte).toMatch(/Estimation communiquée : 280\s?000\s€ - 300\s?000\s€ - 320\s?000\s€/);
    expect(texte).toContain("Transmission au CRM : oui");
    expect(texte).toMatch(/1\s?100\s€ \/ mois/);
    expect(texte).toContain("version 2026-11-13");
    expect(texte).not.toContain("Terrain");
  });

  it("résumé en anglais", () => {
    const texte = resumeTexte(exp, "en");
    expect(texte).toContain("Number of valuation requests: 2");
    expect(texte).toContain("Consent : yes");
    expect(texte).toContain("Sent to CRM: yes");
    expect(texte).toContain("Questions or erasure requests: contact@example.com");
  });
});
