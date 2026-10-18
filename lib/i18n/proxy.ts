import createMiddleware from "next-intl/middleware";
import { NextRequest, type NextResponse } from "next/server";
import { localePreferee } from "./negociation";
import { estRobot } from "./robots";
import { routing } from "./routing";

/** Visiteurs : cookie NEXT_LOCALE, puis Accept-Language normalisé. */
const pourVisiteurs = createMiddleware(routing);

/**
 * Robots d'indexation et outils d'audit : aucune négociation (ni cookie, ni
 * Accept-Language). La racine est servie en français, /en/... en anglais,
 * sans redirection ni Set-Cookie.
 */
const pourRobots = createMiddleware({
  ...routing,
  localeDetection: false,
  localeCookie: false,
});

/**
 * next-intl ne connaît que fr et en : un navigateur allemand retomberait sur
 * le français. On remplace donc Accept-Language par la locale voulue
 * (fr si la langue principale est le français, en sinon) avant de lui
 * confier le routage ; le cookie NEXT_LOCALE garde la priorité.
 */
export function avecLangueNormalisee(request: NextRequest): NextRequest {
  const headers = new Headers(request.headers);
  headers.set("accept-language", localePreferee(headers.get("accept-language")));
  return new NextRequest(request.url, { headers, method: request.method });
}

/**
 * Routage i18n du site public :
 * - /x      : rewrite interne /fr/x (navigateur fr, cookie fr, robots)
 * - /x      : 307 vers /en/x si la langue du navigateur n'est pas le français
 * - /en/x   : servi tel quel, cookie NEXT_LOCALE=en
 * - /fr/x   : 307 vers /x (préfixe superflu)
 */
export function proxyI18n(request: NextRequest): NextResponse {
  if (estRobot(request.headers.get("user-agent"))) return pourRobots(request);
  return pourVisiteurs(avecLangueNormalisee(request));
}
