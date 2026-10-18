import { notFound } from "next/navigation";

/**
 * Attrape tout chemin inconnu sous une locale (ex. /en/inconnu, ou /xyz
 * réécrit en /fr/xyz par le proxy) et affiche la 404 traduite.
 */
export default function CatchAllPage() {
  notFound();
}
