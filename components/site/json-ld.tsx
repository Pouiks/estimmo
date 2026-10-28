import { serialiserJsonLd } from "@/lib/seo/json-ld";

type Props = {
  /** Un objet schema.org, ou plusieurs (un seul <script> les contient). */
  data: object | object[];
};

/**
 * Balise `<script type="application/ld+json">` partagée par toutes les pages.
 * La sérialisation échappe « < » : un texte saisi dans l'admin (FAQ, surcharge
 * de traduction) ne peut pas fermer la balise.
 */
export function JsonLd({ data }: Props) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialiserJsonLd(data) }}
    />
  );
}
