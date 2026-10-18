/**
 * Sous-ensemble de namespaces à transmettre à un NextIntlClientProvider
 * (évite d'embarquer tous les messages dans le bundle client).
 */
export function pick<T extends object, K extends keyof T>(
  objet: T,
  cles: readonly K[]
): Pick<T, K> {
  const resultat = {} as Pick<T, K>;
  for (const cle of cles) {
    if (cle in objet) resultat[cle] = objet[cle];
  }
  return resultat;
}
