import {
  parse,
  TYPE,
  type MessageFormatElement,
} from "@formatjs/icu-messageformat-parser";

/**
 * Analyse ICU d'un message (arguments typés et balises). Sert au test de
 * parité fr/en et à la validation des surcharges saisies dans l'admin : une
 * surcharge doit garder exactement les mêmes arguments que le message
 * d'origine, sinon le rendu casserait (argument manquant) ou perdrait une
 * donnée.
 */
export type TypeArgument = "texte" | "nombre" | "select" | "date";

export interface SignatureIcu {
  args: Record<string, TypeArgument>;
  tags: string[];
}

/** Lève une erreur si la syntaxe ICU est invalide. */
export function signatureIcu(message: string): SignatureIcu {
  const args: Record<string, TypeArgument> = {};
  const tags = new Set<string>();
  const visiter = (elements: MessageFormatElement[]) => {
    for (const el of elements) {
      switch (el.type) {
        case TYPE.argument:
          args[el.value] ??= "texte";
          break;
        case TYPE.number:
          args[el.value] = "nombre";
          break;
        case TYPE.date:
        case TYPE.time:
          args[el.value] = "date";
          break;
        case TYPE.plural:
          args[el.value] = "nombre";
          for (const option of Object.values(el.options)) visiter(option.value);
          break;
        case TYPE.select:
          args[el.value] = "select";
          for (const option of Object.values(el.options)) visiter(option.value);
          break;
        case TYPE.tag:
          tags.add(el.value);
          visiter(el.children);
          break;
        default:
          break; // literal, pound
      }
    }
  };
  visiter(parse(message));
  return { args, tags: [...tags].sort() };
}

/** Noms d'arguments et balises d'un message, pour affichage (« {nom}, <strong> »). */
export function placeholdersIcu(message: string): string[] {
  try {
    const { args, tags } = signatureIcu(message);
    return [
      ...Object.keys(args).map((a) => `{${a}}`),
      ...tags.map((t) => `<${t}>`),
    ];
  } catch {
    return [];
  }
}

/**
 * Valide une surcharge par rapport au message d'origine.
 * Retourne un message d'erreur (français, destiné à l'admin) ou null.
 */
export function validerSurcharge(defaut: string, valeur: string): string | null {
  if (!valeur.trim()) return "Le texte ne peut pas être vide.";

  let signature: SignatureIcu;
  try {
    signature = signatureIcu(valeur);
  } catch (err) {
    return `Syntaxe ICU invalide : ${(err as Error).message}`;
  }
  const reference = signatureIcu(defaut);

  const manquants = Object.keys(reference.args).filter((a) => !(a in signature.args));
  const inconnus = Object.keys(signature.args).filter((a) => !(a in reference.args));
  const typesDifferents = Object.keys(reference.args).filter(
    (a) => a in signature.args && signature.args[a] !== reference.args[a]
  );
  const balisesManquantes = reference.tags.filter((t) => !signature.tags.includes(t));
  const balisesInconnues = signature.tags.filter((t) => !reference.tags.includes(t));

  const erreurs: string[] = [];
  if (manquants.length) erreurs.push(`argument(s) manquant(s) : ${manquants.map((a) => `{${a}}`).join(", ")}`);
  if (inconnus.length) erreurs.push(`argument(s) inconnu(s) : ${inconnus.map((a) => `{${a}}`).join(", ")}`);
  if (typesDifferents.length) erreurs.push(`type différent pour : ${typesDifferents.map((a) => `{${a}}`).join(", ")}`);
  if (balisesManquantes.length) erreurs.push(`balise(s) manquante(s) : ${balisesManquantes.map((t) => `<${t}>`).join(", ")}`);
  if (balisesInconnues.length) erreurs.push(`balise(s) inconnue(s) : ${balisesInconnues.map((t) => `<${t}>`).join(", ")}`);

  return erreurs.length ? `Le texte doit conserver les mêmes éléments que l'original - ${erreurs.join(" ; ")}.` : null;
}
