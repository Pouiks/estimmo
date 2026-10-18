import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { proxyI18n } from "@/lib/i18n/proxy";

/**
 * Deux rôles :
 * 1. /admin/* : rafraîchit la session Supabase et redirige vers /admin/login
 *    si non connecté (le rôle admin est vérifié dans le layout protégé).
 *    L'admin reste en français, hors du segment [locale].
 * 2. Le reste du site : routage i18n (voir lib/i18n/proxy.ts).
 */
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    return protegerAdmin(request);
  }
  return proxyI18n(request);
}

async function protegerAdmin(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT : getUser() valide le JWT auprès de Supabase (pas getSession()).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/admin/login";

  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/leads";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

/**
 * Tout sauf les API, les internes Next/Vercel et les fichiers (point dans
 * le chemin : sitemap.xml, robots.txt, icon.svg, images...).
 * Next exige un littéral ici (analyse statique). Testé par
 * lib/i18n/matcher.test.ts : une erreur d'échappement rend le proxy
 * silencieusement inactif (le site tomberait en 404 hors racine).
 */
export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
