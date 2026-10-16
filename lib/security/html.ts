/**
 * Échappement HTML minimal pour les valeurs saisies par le prospect et
 * injectées dans les emails (gabarits en chaînes de caractères).
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
