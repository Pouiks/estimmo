/**
 * Mise en forme des agrégats SQL (fonction analytics_formulaire) pour la
 * page /admin/analytics : entonnoir, champs par étape, réponses, série
 * journalière et segments. Fonctions pures, testées.
 */
import {
  CHAMPS,
  ETAPES_FORMULAIRE,
  champsDeEtape,
  type Champ,
} from "./evenements";
import {
  LIBELLES_APPAREILS,
  LIBELLES_CHAMPS,
  LIBELLES_ETAPES,
  LIBELLES_LANGUES,
  libelleValeur,
} from "./libelles";

/** Résultat brut de `select analytics_formulaire(...)`. */
export interface AnalyticsBrut {
  sessions: number;
  /** Sessions ayant touché ou renseigné au moins un champ. */
  engagees: number;
  soumissions: number;
  duree_mediane_ms: number | null;
  etapes: {
    etape: number;
    vues: number;
    completees: number;
    retours: number;
    erreurs: number;
    sessions_erreur: number;
    sorties: number;
    abandons: number;
    duree_mediane_ms: number | null;
  }[];
  champs: {
    step: number;
    champ: string;
    touches: number;
    renseignes: number;
    erreurs: number;
    sessions_erreur: number;
  }[];
  derniers: { step: number; champ: string | null; n: number }[];
  valeurs: { champ: string; valeur: string; n: number }[];
  jours: { jour: string; sessions: number; soumissions: number }[];
  segments: {
    dimension: string;
    valeur: string;
    sessions: number;
    soumissions: number;
  }[];
}

export interface PeriodeAnalytics {
  depuis: Date;
  jusqua: Date;
}

export interface LigneEntonnoir {
  etape: 1 | 2 | 3 | 4;
  libelle: string;
  vues: number;
  completees: number;
  /** Sessions dont cette étape est la dernière affichée (non soumises). */
  abandons: number;
  /** Parmi les abandons, sessions n'ayant touché aucun champ de l'étape. */
  abandonsSansInteraction: number;
  /** abandons / vues, en % (null sans vue). */
  tauxAbandon: number | null;
  /** vues / sessions, en %. */
  partSessions: number | null;
  dureeMediane: string | null;
  retours: number;
  erreurs: number;
  sessionsErreur: number;
}

export interface LigneChamp {
  champ: Champ;
  libelle: string;
  touches: number;
  renseignes: number;
  erreurs: number;
  sessionsErreur: number;
  /** Abandons dont ce champ est le dernier touché. */
  abandonsApres: number;
}

export interface EtapeChamps {
  etape: 1 | 2 | 3 | 4;
  libelle: string;
  abandons: number;
  abandonsSansInteraction: number;
  champs: LigneChamp[];
}

export interface Reponse {
  champ: Champ;
  libelle: string;
  total: number;
  valeurs: { valeur: string; libelle: string; n: number; part: number }[];
}

export interface Jour {
  jour: string;
  libelle: string;
  sessions: number;
  soumissions: number;
}

export interface Segment {
  valeur: string;
  libelle: string;
  sessions: number;
  soumissions: number;
  taux: number | null;
}

export interface AnalyticsFormulaire {
  kpis: {
    sessions: number;
    engagees: number;
    /** engagees / sessions, en %. */
    tauxEngagement: number | null;
    soumissions: number;
    /** soumissions / sessions, en %. */
    tauxConversion: number | null;
    /** soumissions / engagees, en %. */
    tauxConversionEngagees: number | null;
    dureeMediane: string | null;
    /**
     * Étape qui perd le plus de sessions parmi celles qui remplissaient le
     * formulaire : à l'étape 1, les affichages sans aucune interaction ne
     * comptent pas (null sans abandon).
     */
    etapeCritique: 1 | 2 | 3 | 4 | null;
  };
  entonnoir: LigneEntonnoir[];
  etapes: EtapeChamps[];
  reponses: Reponse[];
  jours: Jour[];
  segments: { appareil: Segment[]; locale: Segment[]; page: Segment[] };
}

/** part / total en % entier ; null si total nul. */
export function pourcentage(part: number, total: number): number | null {
  if (!(total > 0)) return null;
  return Math.round((part / total) * 100);
}

/** 45 000 → « 45 s », 83 000 → « 1 min 23 s », 3 720 000 → « 1 h 02 min ». */
export function formaterDuree(ms: number | null | undefined): string | null {
  if (ms === null || ms === undefined || !Number.isFinite(ms) || ms < 0) {
    return null;
  }
  const secondes = Math.round(ms / 1000);
  if (secondes < 60) return `${secondes} s`;
  const minutes = Math.floor(secondes / 60);
  if (minutes < 60) {
    const reste = secondes % 60;
    return reste === 0 ? `${minutes} min` : `${minutes} min ${reste} s`;
  }
  const heures = Math.floor(minutes / 60);
  return `${heures} h ${String(minutes % 60).padStart(2, "0")} min`;
}

const PARTIES_PARIS = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Paris",
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function partiesParis(date: Date) {
  const parties: Record<string, number> = {};
  for (const p of PARTIES_PARIS.formatToParts(date)) {
    if (p.type !== "literal") parties[p.type] = Number(p.value);
  }
  return parties;
}

/** Date civile à Paris, au format « aaaa-mm-jj ». */
export function jourParis(date: Date): string {
  const p = partiesParis(date);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Minuit (heure de Paris) du jour civil parisien contenant `date`. */
export function debutJourParis(date: Date): Date {
  const p = partiesParis(date);
  const memeHeureEnUtc = Date.UTC(
    p.year,
    p.month - 1,
    p.day,
    p.hour,
    p.minute,
    p.second
  );
  const decalage = memeHeureEnUtc - date.getTime();
  return new Date(Date.UTC(p.year, p.month - 1, p.day) - decalage);
}

/** Jours civils parisiens de `depuis` à `jusqua` inclus (« aaaa-mm-jj »). */
export function joursEntre(depuis: Date, jusqua: Date): string[] {
  const jours: string[] = [];
  const fin = jourParis(jusqua);
  // Pas de 24 h depuis midi : insensible aux changements d'heure.
  let curseur = debutJourParis(depuis).getTime() + 12 * 3600_000;
  for (let i = 0; i < 400; i++) {
    const jour = jourParis(new Date(curseur));
    if (jour > fin) break;
    jours.push(jour);
    curseur += 24 * 3600_000;
  }
  return jours;
}

const FORMAT_JOUR = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** « 2026-10-31 » → « 31 oct. ». */
export function formaterJour(jour: string): string {
  return FORMAT_JOUR.format(new Date(`${jour}T00:00:00Z`));
}

function libelleSegment(dimension: string, valeur: string): string {
  if (dimension === "appareil") return LIBELLES_APPAREILS[valeur] ?? valeur;
  if (dimension === "locale") return LIBELLES_LANGUES[valeur] ?? valeur;
  return valeur === "inconnu" ? "Inconnue" : valeur;
}

function segmentsDe(brut: AnalyticsBrut, dimension: string): Segment[] {
  return brut.segments
    .filter((s) => s.dimension === dimension)
    .map((s) => ({
      valeur: s.valeur,
      libelle: libelleSegment(dimension, s.valeur),
      sessions: s.sessions,
      soumissions: s.soumissions,
      taux: pourcentage(s.soumissions, s.sessions),
    }))
    .sort((a, b) => b.sessions - a.sessions);
}

export function preparerAnalytics(
  brut: AnalyticsBrut,
  periode: PeriodeAnalytics
): AnalyticsFormulaire {
  const sessions = brut.sessions ?? 0;
  const engagees = brut.engagees ?? 0;
  const soumissions = brut.soumissions ?? 0;

  const sansInteraction = (etape: number) =>
    brut.derniers.find((d) => d.step === etape && d.champ === null)?.n ?? 0;

  const entonnoir: LigneEntonnoir[] = ETAPES_FORMULAIRE.map((etape) => {
    const e = brut.etapes.find((x) => x.etape === etape);
    const vues = e?.vues ?? 0;
    const abandons = e?.abandons ?? 0;
    return {
      etape,
      libelle: LIBELLES_ETAPES[etape],
      vues,
      completees: e?.completees ?? 0,
      abandons,
      abandonsSansInteraction: Math.min(abandons, sansInteraction(etape)),
      tauxAbandon: pourcentage(abandons, vues),
      partSessions: pourcentage(vues, sessions),
      dureeMediane: formaterDuree(e?.duree_mediane_ms),
      retours: e?.retours ?? 0,
      erreurs: e?.erreurs ?? 0,
      sessionsErreur: e?.sessions_erreur ?? 0,
    };
  });

  // Abandons « réels » : à l'étape 1, un affichage sans aucune interaction
  // n'est pas un abandon du formulaire (la page d'accueil l'embarque).
  const abandonsReels = (l: LigneEntonnoir) =>
    l.etape === 1 ? l.abandons - l.abandonsSansInteraction : l.abandons;
  let etapeCritique: 1 | 2 | 3 | 4 | null = null;
  for (const ligne of entonnoir) {
    if (
      abandonsReels(ligne) > 0 &&
      (etapeCritique === null ||
        abandonsReels(ligne) > abandonsReels(entonnoir[etapeCritique - 1]))
    ) {
      etapeCritique = ligne.etape;
    }
  }

  const etapes: EtapeChamps[] = ETAPES_FORMULAIRE.map((etape) => {
    const champs: LigneChamp[] = champsDeEtape(etape).map((champ) => {
      const c = brut.champs.find((x) => x.step === etape && x.champ === champ);
      const dernier = brut.derniers.find(
        (d) => d.step === etape && d.champ === champ
      );
      return {
        champ,
        libelle: LIBELLES_CHAMPS[champ],
        touches: c?.touches ?? 0,
        renseignes: c?.renseignes ?? 0,
        erreurs: c?.erreurs ?? 0,
        sessionsErreur: c?.sessions_erreur ?? 0,
        abandonsApres: dernier?.n ?? 0,
      };
    });
    return {
      etape,
      libelle: LIBELLES_ETAPES[etape],
      abandons: entonnoir[etape - 1].abandons,
      abandonsSansInteraction: entonnoir[etape - 1].abandonsSansInteraction,
      champs,
    };
  });

  const reponses: Reponse[] = [];
  for (const champ of Object.keys(CHAMPS) as Champ[]) {
    const type = CHAMPS[champ].type;
    if (type !== "choix" && type !== "multi") continue;
    const lignes = brut.valeurs.filter((v) => v.champ === champ);
    if (lignes.length === 0) continue;
    // Sessions ayant répondu : pour un champ multiple, une session peut
    // compter dans plusieurs valeurs ; la part est rapportée aux réponses.
    const total = lignes.reduce((somme, v) => somme + v.n, 0);
    reponses.push({
      champ,
      libelle: LIBELLES_CHAMPS[champ],
      total,
      valeurs: lignes
        .map((v) => ({
          valeur: v.valeur,
          libelle: libelleValeur(champ, v.valeur),
          n: v.n,
          part: pourcentage(v.n, total) ?? 0,
        }))
        .sort((a, b) => b.n - a.n),
    });
  }

  const parJour = new Map(brut.jours.map((j) => [j.jour, j]));
  const jours: Jour[] = joursEntre(periode.depuis, periode.jusqua).map(
    (jour) => ({
      jour,
      libelle: formaterJour(jour),
      sessions: parJour.get(jour)?.sessions ?? 0,
      soumissions: parJour.get(jour)?.soumissions ?? 0,
    })
  );

  return {
    kpis: {
      sessions,
      engagees,
      tauxEngagement: pourcentage(engagees, sessions),
      soumissions,
      tauxConversion: pourcentage(soumissions, sessions),
      tauxConversionEngagees: pourcentage(soumissions, engagees),
      dureeMediane: formaterDuree(brut.duree_mediane_ms),
      etapeCritique,
    },
    entonnoir,
    etapes,
    reponses,
    jours,
    segments: {
      appareil: segmentsDe(brut, "appareil"),
      locale: segmentsDe(brut, "locale"),
      page: segmentsDe(brut, "page"),
    },
  };
}
