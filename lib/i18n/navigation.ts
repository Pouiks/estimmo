import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Navigation localisée : à utiliser partout dans app/[locale] et dans les
 * composants du site à la place de next/link et next/navigation.
 * Link ajoute /en si besoin ; usePathname renvoie le chemin sans préfixe
 * (évite le hydration mismatch derrière le rewrite / vers /fr).
 */
export const {
  Link,
  redirect,
  permanentRedirect,
  usePathname,
  useRouter,
  getPathname,
} = createNavigation(routing);
