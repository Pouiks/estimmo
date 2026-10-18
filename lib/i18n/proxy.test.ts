import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { avecLangueNormalisee, proxyI18n } from "./proxy";

const CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36";
const GOOGLEBOT =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

function requete(
  chemin: string,
  headers: Record<string, string> = {}
): NextRequest {
  return new NextRequest(`https://estimmo-direct.com${chemin}`, {
    headers: { "user-agent": CHROME, ...headers },
  });
}

/** Chemin interne servi (header x-middleware-rewrite) ou null. */
function rewrite(res: Response): string | null {
  const url = res.headers.get("x-middleware-rewrite");
  return url ? new URL(url).pathname : null;
}

function redirection(res: Response): string | null {
  const url = res.headers.get("location");
  return url ? new URL(url).pathname : null;
}

describe("proxyI18n : négociation de la langue", () => {
  it("navigateur français : la racine est servie en français sans redirection", () => {
    const res = proxyI18n(
      requete("/", { "accept-language": "fr-FR,fr;q=0.9,en;q=0.5" })
    );
    expect(res.status).toBe(200);
    expect(rewrite(res)).toBe("/fr");
  });

  it("page profonde française : réécriture interne /fr/..., URL publique inchangée", () => {
    const res = proxyI18n(
      requete("/prix-immobilier/nice-06000", { "accept-language": "fr-FR" })
    );
    expect(res.status).toBe(200);
    expect(rewrite(res)).toBe("/fr/prix-immobilier/nice-06000");
  });

  it("navigateur anglais : redirection temporaire vers /en", () => {
    const res = proxyI18n(
      requete("/", { "accept-language": "en-US,en;q=0.9" })
    );
    expect(res.status).toBe(307);
    expect(redirection(res)).toBe("/en");
  });

  it("toute autre langue (allemand, espagnol...) bascule sur l'anglais", () => {
    expect(
      redirection(
        proxyI18n(requete("/estimation", { "accept-language": "de-DE,de;q=0.9" }))
      )
    ).toBe("/en/estimation");
    expect(
      redirection(proxyI18n(requete("/blog", { "accept-language": "es-ES" })))
    ).toBe("/en/blog");
  });

  it("le français en seconde position suffit à rester en français", () => {
    const res = proxyI18n(
      requete("/", { "accept-language": "en-US;q=0.8,fr-FR;q=0.9" })
    );
    expect(res.status).toBe(200);
    expect(rewrite(res)).toBe("/fr");
  });

  it("sans Accept-Language : français par défaut", () => {
    const res = proxyI18n(requete("/"));
    expect(res.status).toBe(200);
    expect(rewrite(res)).toBe("/fr");
  });

  it("le cookie NEXT_LOCALE prime sur Accept-Language", () => {
    const res = proxyI18n(
      requete("/", { "accept-language": "fr-FR", cookie: "NEXT_LOCALE=en" })
    );
    expect(res.status).toBe(307);
    expect(redirection(res)).toBe("/en");
  });

  it("/en/... est servi tel quel et mémorise la langue dans le cookie", () => {
    const res = proxyI18n(
      requete("/en/estimation", {
        "accept-language": "fr-FR",
        "sec-fetch-dest": "document",
      })
    );
    expect(res.status).toBe(200);
    expect(redirection(res)).toBeNull();
    expect(res.headers.get("set-cookie")).toMatch(/NEXT_LOCALE=en/);
  });

  it("/fr/... (préfixe superflu) redirige vers l'URL sans préfixe", () => {
    const res = proxyI18n(
      requete("/fr/estimation", { "accept-language": "fr-FR" })
    );
    expect(res.status).toBe(307);
    expect(redirection(res)).toBe("/estimation");
  });

  it("une langue inconnue dans l'URL n'est pas une locale : réécriture vers /fr/de/...", () => {
    const res = proxyI18n(
      requete("/de/estimation", { "accept-language": "fr-FR" })
    );
    expect(res.status).toBe(200);
    expect(rewrite(res)).toBe("/fr/de/estimation");
  });
});

describe("proxyI18n : robots", () => {
  it("Googlebot anglophone n'est jamais redirigé : il voit le français à la racine", () => {
    const res = proxyI18n(
      requete("/", {
        "user-agent": GOOGLEBOT,
        "accept-language": "en-US",
        "sec-fetch-dest": "document",
      })
    );
    expect(res.status).toBe(200);
    expect(rewrite(res)).toBe("/fr");
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("un robot avec un cookie NEXT_LOCALE=en reste en français à la racine", () => {
    const res = proxyI18n(
      requete("/", { "user-agent": GOOGLEBOT, cookie: "NEXT_LOCALE=en" })
    );
    expect(res.status).toBe(200);
    expect(rewrite(res)).toBe("/fr");
  });

  it("un robot qui demande /en/... l'obtient", () => {
    const res = proxyI18n(
      requete("/en/prix-immobilier/nice-06000", { "user-agent": GOOGLEBOT })
    );
    expect(res.status).toBe(200);
    expect(redirection(res)).toBeNull();
  });

  it("sans User-Agent : pas de négociation, français", () => {
    const req = new NextRequest("https://estimmo-direct.com/", {
      headers: { "accept-language": "en-US" },
    });
    const res = proxyI18n(req);
    expect(res.status).toBe(200);
    expect(rewrite(res)).toBe("/fr");
  });
});

describe("avecLangueNormalisee", () => {
  it("remplace Accept-Language par la locale retenue et conserve le reste", () => {
    const req = requete("/x", {
      "accept-language": "de-DE,de;q=0.9",
      cookie: "NEXT_LOCALE=fr",
      "x-forwarded-host": "estimmo-direct.com",
    });
    const copie = avecLangueNormalisee(req);
    expect(copie.headers.get("accept-language")).toBe("en");
    expect(copie.headers.get("cookie")).toBe("NEXT_LOCALE=fr");
    expect(copie.headers.get("x-forwarded-host")).toBe("estimmo-direct.com");
    expect(copie.nextUrl.pathname).toBe("/x");
  });
});
