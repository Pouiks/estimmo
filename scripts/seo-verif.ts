/**
 * Vérification de bout en bout des pages communes (SEO) sur un site déployé.
 *
 * Pour un échantillon de communes par département (tirées de la base), la
 * page française est téléchargée et contrôlée : code 200 sans redirection,
 * canonical auto-référent absolu, meta robots cohérente avec le seuil de
 * qualité (lib/seo/indexation.ts), H1 unique, aucun hreflang, présence dans
 * le sitemap du département si et seulement si la page est indexable, lien
 * depuis la page département (aucune page orpheline), version anglaise en
 * noindex. Les pages région et département sont contrôlées au passage.
 *
 * Usage :
 *   pnpm seo:verif                                   # prod, 30 et 34, 12 communes/département
 *   pnpm seo:verif -- --site http://localhost:3123 --base http://localhost:3000 --depts 30 --n 5
 * `--base` : origine attendue des canonicals et des URLs du sitemap (SITE.url
 * du serveur contrôlé) quand elle diffère de l'adresse interrogée.
 * Sort avec le code 1 si un contrôle échoue (utilisable en CI ou après déploiement).
 */
import { estIndexable, type StatsIndexation } from "../lib/seo/indexation";
import { hrefDepartement } from "../lib/seo/departements";
import { hrefRegion, regionDuDepartement } from "../lib/seo/regions";
import { getDbClient, parseArgs } from "./util";

interface Commune extends StatsIndexation {
  slug: string;
  nom_commune: string;
}

interface Controle {
  page: string;
  ok: boolean;
  detail: string;
}

const UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

async function page(url: string): Promise<{ status: number; html: string; redirige: boolean }> {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "manual" });
  const redirige = res.status >= 300 && res.status < 400;
  return { status: res.status, html: redirige ? "" : await res.text(), redirige };
}

function balise(html: string, regex: RegExp): string | null {
  const m = regex.exec(html);
  return m ? m[1] : null;
}

async function verifierCommune(
  site: string,
  base: string,
  c: Commune,
  sitemap: string
): Promise<Controle[]> {
  const chemin = `/prix-immobilier/${c.slug}`;
  const url = `${site}${chemin}`;
  const urlCanonique = `${base}${chemin}`;
  const controles: Controle[] = [];
  const { status, html, redirige } = await page(url);
  const indexable = estIndexable(c);
  const ok = (nom: string, cond: boolean, detail = "") =>
    controles.push({ page: `${chemin} · ${nom}`, ok: cond, detail });

  ok("200 sans redirection", status === 200 && !redirige, `status ${status}`);
  if (status !== 200) return controles;

  const canonical = balise(html, /<link rel="canonical" href="([^"]+)"/);
  ok("canonical auto-référent", canonical === urlCanonique, canonical ?? "absent");
  const robots = balise(html, /<meta name="robots" content="([^"]+)"/);
  ok(
    indexable ? "indexable (pas de noindex)" : "noindex, follow (seuil de qualité)",
    indexable ? robots === null : robots === "noindex, follow",
    `robots=${robots ?? "aucun"} ventes12m=${c.nb_ventes_12m} ventes36m=${c.nb_ventes_36m ?? "?"}`
  );
  ok("un seul H1", (html.match(/<h1[\s>]/g) ?? []).length === 1);
  ok("aucun hreflang", !/<link rel="alternate" hrefLang=/i.test(html));
  ok("fil d'Ariane vers le département", html.includes(`href="${hrefDepartement(c.departement)}"`));
  ok("formulaire d'estimation présent", html.includes('name="adresse"'));
  ok("JSON-LD RealEstateAgent + FAQPage + BreadcrumbList",
    html.includes('"@type":"RealEstateAgent"') && html.includes('"@type":"FAQPage"') && html.includes('"@type":"BreadcrumbList"'));
  ok(
    indexable ? "présente dans le sitemap du département" : "absente du sitemap",
    sitemap.includes(`<loc>${urlCanonique}</loc>`) === indexable
  );

  const en = await page(`${site}/en${chemin}`);
  const robotsEn = balise(en.html, /<meta name="robots" content="([^"]+)"/);
  ok("version anglaise en noindex, follow", en.status === 200 && robotsEn === "noindex, follow", `status ${en.status} robots=${robotsEn ?? "aucun"}`);
  return controles;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const site = String(args.get("site") ?? "https://www.estimmo-direct.com").replace(/\/+$/, "");
  const base = String(args.get("base") ?? site).replace(/\/+$/, "");
  const depts = String(args.get("depts") ?? "30,34").split(",").map((d) => d.trim().toUpperCase());
  const n = Number(args.get("n") ?? 12);

  const client = getDbClient();
  await client.connect();
  const controles: Controle[] = [];
  try {
    for (const dept of depts) {
      // Échantillon réparti : les plus actives, des moyennes, des petites.
      // Colonnes 36 mois présentes seulement après la migration 20261112110000.
      const { rows: colonnes } = await client.query<{ column_name: string }>(
        `select column_name from information_schema.columns
         where table_schema = 'public' and table_name = 'communes_stats'`
      );
      const avec36m = colonnes.some((c) => c.column_name === "nb_ventes_36m");
      const { rows } = await client.query<Commune>(
        `select slug, nom_commune, departement, nb_ventes_12m,
                prix_m2_median_appartement, prix_m2_median_maison
                ${avec36m ? ", nb_ventes_36m, prix_m2_median_36m_appartement, prix_m2_median_36m_maison" : ""}
         from communes_stats where departement = $1
         order by nb_ventes_12m desc`,
        [dept]
      );
      const pas = Math.max(1, Math.floor(rows.length / n));
      const echantillon = rows.filter((_, i) => i % pas === 0).slice(0, n);
      const sitemap = await (await fetch(`${site}/sitemaps/communes-${dept.toLowerCase()}.xml`)).text();
      const dansSitemap = (sitemap.match(/<url>/g) ?? []).length;
      const attendus = rows.filter(estIndexable).length;
      controles.push({
        page: `sitemap communes-${dept.toLowerCase()}.xml`,
        ok: dansSitemap === attendus,
        detail: `${dansSitemap} URLs, ${attendus} communes indexables en base`,
      });

      const deptPage = await page(`${site}${hrefDepartement(dept)}`);
      controles.push({ page: hrefDepartement(dept), ok: deptPage.status === 200, detail: `status ${deptPage.status}` });
      const orphelines = rows.filter((c) => !deptPage.html.includes(`href="/prix-immobilier/${c.slug}"`));
      controles.push({
        page: `${hrefDepartement(dept)} · aucune commune orpheline`,
        ok: orphelines.length === 0,
        detail: orphelines.length ? `${orphelines.length} absentes : ${orphelines.slice(0, 5).map((c) => c.slug).join(", ")}` : `${rows.length} communes liées`,
      });
      const region = regionDuDepartement(dept);
      if (region) {
        const regionPage = await page(`${site}${hrefRegion(region)}`);
        controles.push({
          page: `${hrefRegion(region)} · lie le département`,
          ok: regionPage.status === 200 && regionPage.html.includes(`href="${hrefDepartement(dept)}"`),
          detail: `status ${regionPage.status}`,
        });
      }

      for (const c of echantillon) controles.push(...(await verifierCommune(site, base, c, sitemap)));
    }
  } finally {
    await client.end();
  }

  const echecs = controles.filter((c) => !c.ok);
  for (const c of controles) {
    if (!c.ok || args.has("verbose")) console.log(`${c.ok ? "OK " : "KO "} ${c.page}${c.detail ? ` (${c.detail})` : ""}`);
  }
  console.log(`\n${controles.length - echecs.length}/${controles.length} contrôles réussis sur ${site}`);
  if (echecs.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
