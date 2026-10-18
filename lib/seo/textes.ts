/**
 * Textes des pages communes - plusieurs structures de phrases choisies de
 * façon déterministe (hash du code INSEE) pour éviter le duplicate content
 * massif entre les ~35 000 pages. Les phrases vivent dans
 * messages/<locale>/commune.json (namespace `commune`) ; ce module ne fait
 * que choisir la variante et passer les valeurs.
 */
import type { useTranslations } from "next-intl";
import type { CommuneStats, LoyersCommuneRow } from "./communes";

/** Traducteur du namespace `commune` (useTranslations / getTranslations). */
export type TraducteurCommune = ReturnType<typeof useTranslations<"commune">>;

export function variante(codeInsee: string, nb: number): number {
  let hash = 0;
  for (const c of codeInsee) hash = (hash * 31 + c.charCodeAt(0)) % 997;
  return hash % nb;
}

const INTROS = ["intro.v0", "intro.v1", "intro.v2"] as const;
const STABLES = ["evolution.stableV0", "evolution.stableV1"] as const;
const TENDANCES = ["evolution.tendanceV0", "evolution.tendanceV1"] as const;

/** « 4 500 €/m² pour un appartement et 6 200 €/m² pour une maison » */
export function prixTexte(stats: CommuneStats, t: TraducteurCommune): string | null {
  const appart = stats.prix_m2_median_appartement;
  const maison = stats.prix_m2_median_maison;
  if (appart && maison) return t("prix.deux", { appart, maison });
  if (appart) return t("prix.appart", { appart });
  if (maison) return t("prix.maison", { maison });
  return null;
}

export function introCommune(stats: CommuneStats, t: TraducteurCommune): string {
  const nom = stats.nom_commune;
  const prix = prixTexte(stats, t);
  if (!prix) return t("intro.sansVentes", { nom });
  const cle = INTROS[variante(stats.code_insee, INTROS.length)];
  return t(cle, { nom, prix, ventes: stats.nb_ventes_12m });
}

/** « +3,2 % » ; `na` = libellé « n.d. » traduit (common.na). */
export function formatEvo(
  evo: number | null,
  t: TraducteurCommune,
  na: string
): string {
  if (evo === null) return na;
  return t("evolution.valeur", { evo: Number(evo) });
}

export function evolutionTexte(
  stats: CommuneStats,
  t: TraducteurCommune,
  na: string
): string | null {
  const brut = stats.evolution_1an_pct;
  if (brut === null || stats.nb_ventes_12m < 10) return null;
  const evoNum = Number(brut);
  const nom = stats.nom_commune;
  const evo = formatEvo(evoNum, t, na);
  const v = variante(stats.code_insee, 2);

  if (Math.abs(evoNum) < 0.5) return t(STABLES[v], { nom, evo });
  return t(TENDANCES[v], { nom, evo, hausse: String(evoNum > 0) });
}

export interface FaqEntry {
  question: string;
  reponse: string;
}

export function faqCommune(
  stats: CommuneStats,
  loyers: LoyersCommuneRow | null,
  annee: number,
  t: TraducteurCommune
): FaqEntry[] {
  const nom = stats.nom_commune;
  const faq: FaqEntry[] = [];

  if (stats.prix_m2_median_appartement) {
    faq.push({
      question: t("faq.appart.question", { nom, annee: String(annee) }),
      reponse: t("faq.appart.reponse", { nom, prix: stats.prix_m2_median_appartement }),
    });
  }
  if (stats.prix_m2_median_maison) {
    faq.push({
      question: t("faq.maison.question", { nom }),
      reponse: t("faq.maison.reponse", { nom, prix: stats.prix_m2_median_maison }),
    });
  }
  if (loyers?.loyer_m2_appartement) {
    const loyerT2 = Math.round(
      (loyers.loyer_m2_appt_t1_t2 ?? loyers.loyer_m2_appartement) * 45
    );
    faq.push({
      question: t("faq.loyer.question", { nom }),
      reponse: t("faq.loyer.reponse", {
        nom,
        loyerM2: loyers.loyer_m2_appartement,
        millesime: String(loyers.millesime),
        loyerT2,
      }),
    });
  }
  faq.push({
    question: t("faq.estimer.question", { nom }),
    reponse: t("faq.estimer.reponse"),
  });

  return faq.slice(0, 4);
}
