/**
 * Suivi du formulaire côté navigateur : met en file les événements, les
 * dédoublonne (un champ texte n'est « renseigné » qu'une fois, une valeur
 * identique n'est pas renvoyée) et les expédie par lots.
 *
 * Aucune dépendance au DOM : le transport et l'horloge sont injectés, ce qui
 * permet de tester la logique dans Vitest. Le suivi ne doit jamais gêner le
 * parcours : toute erreur de transport est ignorée par l'appelant.
 */
import {
  CHAMPS,
  TAILLE_MAX_LOT,
  VALEUR_AUCUN,
  estChamp,
  type Appareil,
  type Champ,
  type Etape,
  type EvenementSuivi,
  type LotEvenements,
  type TypeChamp,
} from "./evenements";

export interface OptionsSuivi {
  sessionId: string;
  locale?: "fr" | "en";
  appareil?: Appareil;
  page?: string;
  /** Transport d'un lot (fetch keepalive dans le navigateur). */
  envoyer: (lot: LotEvenements) => void;
  /** Horloge (Date.now par défaut). */
  maintenant?: () => number;
  /** Délai de regroupement avant envoi, en ms (1 500 par défaut). */
  delaiMs?: number;
  planifier?: (fn: () => void, ms: number) => unknown;
  annuler?: (id: unknown) => void;
  /** Garde-fou : au-delà, les événements sont ignorés (300 par défaut). */
  maxEvenements?: number;
}

/**
 * Représentation transmise d'une valeur selon la nature du champ ;
 * null = rien à enregistrer (valeur vide ou effacée).
 */
export function serialiserValeur(type: TypeChamp, valeur: unknown): string | null {
  switch (type) {
    case "texte":
      if (valeur === null || valeur === undefined) return null;
      if (typeof valeur === "string") return valeur.trim() === "" ? null : "";
      return "";
    case "choix":
      return typeof valeur === "string" && valeur !== "" ? valeur : null;
    case "multi":
      if (!Array.isArray(valeur)) return null;
      return valeur.length === 0
        ? VALEUR_AUCUN
        : valeur.map(String).sort().join(",");
    case "bool":
      return typeof valeur === "boolean" ? (valeur ? "oui" : "non") : null;
  }
}

/** « adresse.libelle » → « adresse » (clés d'erreur imbriquées). */
export function champDeCleErreur(cle: string): Champ | null {
  const racine = cle.split(".")[0] ?? "";
  return estChamp(racine) ? racine : null;
}

export class SuiviFormulaire {
  private readonly file: EvenementSuivi[] = [];
  private readonly debut: number;
  private minuterie: unknown = null;
  private total = 0;
  private renseignes = new Set<Champ>();
  private focalises = new Set<Champ>();
  private dernieresValeurs = new Map<Champ, string>();

  constructor(private readonly options: OptionsSuivi) {
    this.debut = this.maintenant();
  }

  private maintenant(): number {
    return (this.options.maintenant ?? Date.now)();
  }

  private ecoule(): number {
    const ms = Math.round(this.maintenant() - this.debut);
    return Math.max(0, Math.min(2_000_000_000, ms));
  }

  private ajouter(evenement: Omit<EvenementSuivi, "t">) {
    if (this.total >= (this.options.maxEvenements ?? 300)) return;
    this.total++;
    this.file.push({ ...evenement, t: this.ecoule() });
    if (this.file.length >= TAILLE_MAX_LOT) {
      this.flush();
      return;
    }
    if (this.minuterie === null) {
      const planifier =
        this.options.planifier ??
        ((fn: () => void, ms: number) => setTimeout(fn, ms));
      this.minuterie = planifier(() => {
        this.minuterie = null;
        this.flush();
      }, this.options.delaiMs ?? 1500);
    }
  }

  /** Étape affichée (5 = résultat). */
  vue(etape: Etape) {
    this.ajouter({ etape, event: "view" });
  }

  /** Étape validée. */
  complete(etape: Etape) {
    this.ajouter({ etape, event: "complete" });
  }

  /** Estimation obtenue : soumission + affichage du résultat, envoi immédiat. */
  soumis() {
    this.ajouter({ etape: 4, event: "submit" });
    this.ajouter({ etape: 5, event: "view" });
    this.flush();
  }

  /** Premier focus d'un champ texte (attribut name de l'input). */
  focus(nom: string) {
    if (!estChamp(nom) || this.focalises.has(nom)) return;
    this.focalises.add(nom);
    this.ajouter({ etape: CHAMPS[nom].etape, event: "focus", champ: nom });
  }

  /** Changement de valeur d'un champ (appelé à chaque setField). */
  saisie(nom: string, valeur: unknown) {
    if (!estChamp(nom)) return;
    const definition = CHAMPS[nom];
    const serialisee = serialiserValeur(definition.type, valeur);
    if (serialisee === null) return;
    if (definition.type === "texte") {
      if (this.renseignes.has(nom)) return;
      this.renseignes.add(nom);
      this.ajouter({ etape: definition.etape, event: "saisie", champ: nom });
      return;
    }
    if (this.dernieresValeurs.get(nom) === serialisee) return;
    this.dernieresValeurs.set(nom, serialisee);
    this.ajouter({
      etape: definition.etape,
      event: "saisie",
      champ: nom,
      valeur: serialisee,
    });
  }

  /** Erreurs de validation affichées (clés du dictionnaire d'erreurs). */
  erreurs(etape: Etape, cles: string[]) {
    const champs = new Set<Champ>();
    for (const cle of cles) {
      const champ = champDeCleErreur(cle);
      if (champ) champs.add(champ);
    }
    for (const champ of champs) {
      this.ajouter({ etape, event: "erreur", champ });
    }
  }

  /** Bouton Retour depuis une étape. */
  retour(etape: Etape) {
    this.ajouter({ etape, event: "retour" });
  }

  /** Échec de l'appel /api/leads (statut HTTP ou « reseau »). */
  erreurApi(code: string) {
    this.ajouter({ etape: 4, event: "erreur_api", valeur: code.slice(0, 80) });
  }

  /** « Refaire une estimation » : nouveau parcours dans la même session. */
  recommencer() {
    this.ajouter({ etape: 5, event: "recommencer" });
    this.renseignes.clear();
    this.focalises.clear();
    this.dernieresValeurs.clear();
  }

  /** Page quittée sur une étape : envoi immédiat. */
  sortie(etape: Etape) {
    this.ajouter({ etape, event: "sortie" });
    this.flush();
  }

  /** Expédie tout ce qui est en file, par lots de TAILLE_MAX_LOT. */
  flush() {
    if (this.minuterie !== null) {
      const annuler =
        this.options.annuler ??
        ((id: unknown) => clearTimeout(id as ReturnType<typeof setTimeout>));
      annuler(this.minuterie);
      this.minuterie = null;
    }
    while (this.file.length > 0) {
      const evenements = this.file.splice(0, TAILLE_MAX_LOT);
      this.options.envoyer({
        sessionId: this.options.sessionId,
        locale: this.options.locale,
        appareil: this.options.appareil,
        page: this.options.page,
        evenements,
      });
    }
  }
}
