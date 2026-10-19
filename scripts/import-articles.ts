/**
 * Importe les articles éditoriaux (JSON) dans la table articles et les
 * programme : un article tous les N jours à heure fixe, dans l'ordre du fichier.
 *
 * Usage :
 *   pnpm import:articles [--fichier content/blog/articles.json]
 *     [--debut 2026-10-20] [--intervalle 2] [--heure 07:00]
 *     [--replanifier] [--brouillon] [--programmer] [--dry-run]
 *
 * Idempotent (clé : slug). Une réimportation met à jour le contenu sans
 * toucher au statut ni à la date choisis depuis l'admin ; --replanifier
 * recalcule les dates des articles pas encore en ligne.
 * --debut : par défaut la plus petite date publishedAt du fichier.
 * --brouillon : les NOUVEAUX articles sont créés en brouillon (dates calculées
 *   quand même) ; --programmer les passe ensuite tous en publié, chacun à sa
 *   date (programmé tant qu'elle n'est pas atteinte).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { controlerArticles, versLigne } from "../lib/blog/import";
import { datePublication } from "../lib/blog/planning";
import { getDbClient } from "./util";

const { values: opts } = parseArgs({
  options: {
    fichier: { type: "string", default: "content/blog/articles.json" },
    debut: { type: "string" },
    intervalle: { type: "string", default: "2" },
    heure: { type: "string", default: "07:00" },
    replanifier: { type: "boolean", default: false },
    brouillon: { type: "boolean", default: false },
    programmer: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
  },
});

const COLONNES_CONTENU = [
  "lang", "titre", "meta_title", "meta_description", "extrait", "categorie",
  "auteur", "temps_lecture", "contenu_html", "image_cover", "image_cover_alt",
  "image_cover_largeur", "image_cover_hauteur", "faq", "articles_lies",
  "mot_cle_principal", "mots_cles_secondaires", "points_cles", "images",
] as const;
const JSONB = new Set(["faq", "images"]);

async function main() {
  const brut = JSON.parse(readFileSync(path.resolve(opts.fichier), "utf8"));
  const { articles, erreurs, avertissements } = controlerArticles(brut);

  for (const a of avertissements) console.warn(`  ⚠ ${a}`);
  if (erreurs.length > 0) {
    for (const e of erreurs) console.error(`  ✗ ${e}`);
    console.error(`\n${erreurs.length} erreur(s) : rien n'a été importé.`);
    process.exit(1);
  }

  const intervalle = Number(opts.intervalle);
  if (!Number.isInteger(intervalle) || intervalle < 0) throw new Error("--intervalle invalide");
  if (!/^\d{2}:\d{2}$/.test(opts.heure)) throw new Error("--heure attendue au format HH:MM");
  const debut = opts.debut ?? articles.map((a) => a.publishedAt).sort()[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(debut ?? "")) throw new Error("--debut attendu au format AAAA-MM-JJ");

  const plan = articles.map((a, index) => ({
    article: a,
    date: datePublication({ debut, intervalleJours: intervalle, heure: opts.heure, index }),
  }));

  console.log(`${articles.length} article(s) valides - début ${debut}, tous les ${intervalle} j à ${opts.heure} (Paris)\n`);
  if (opts["dry-run"]) {
    for (const { article, date } of plan) {
      console.log(`  ${date.toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}  [${article.category}]  ${article.slug}`);
    }
    console.log("\n--dry-run : aucune écriture.");
    return;
  }

  const client = getDbClient();
  await client.connect();
  const bilan = { crees: 0, modifies: 0, inchanges: 0, replanifies: 0, programmes: 0 };
  try {
    await client.query("begin");
    for (const { article, date } of plan) {
      const ligne = versLigne(article) as Record<string, unknown>;
      const valeurs = COLONNES_CONTENU.map((c) =>
        JSONB.has(c) ? JSON.stringify(ligne[c]) : ligne[c]
      );
      const params = COLONNES_CONTENU.map((c, i) => `$${i + 2}${JSONB.has(c) ? "::jsonb" : ""}`);
      const n = COLONNES_CONTENU.length;

      // Insertion (programmée ou brouillon) ; sinon mise à jour du contenu
      // seulement s'il a changé (updated_at = dateModified reste juste).
      const res = await client.query<{ cree: boolean }>(
        `insert into articles (slug, ${COLONNES_CONTENU.join(", ")}, statut, published_at)
         values ($1, ${params.join(", ")}, $${n + 2}, $${n + 3})
         on conflict (slug) do update set
           ${COLONNES_CONTENU.map((c) => `${c} = excluded.${c}`).join(",\n           ")}
         where (${COLONNES_CONTENU.map((c) => `articles.${c}`).join(", ")})
           is distinct from (${COLONNES_CONTENU.map((c) => `excluded.${c}`).join(", ")})
         returning (xmax = 0) as cree`,
        [article.slug, ...valeurs, opts.brouillon ? "brouillon" : "publie", date.toISOString()]
      );
      if (res.rowCount === 0) bilan.inchanges++;
      else if (res.rows[0].cree) bilan.crees++;
      else bilan.modifies++;

      if (opts.replanifier) {
        const r = await client.query(
          `update articles set published_at = $2, diffuse_le = null
           where slug = $1 and (published_at is null or published_at > now())`,
          [article.slug, date.toISOString()]
        );
        bilan.replanifies += r.rowCount ?? 0;
      }

      if (opts.programmer) {
        const r = await client.query(
          `update articles set statut = 'publie', diffuse_le = null
           where slug = $1 and statut = 'brouillon' and published_at is not null`,
          [article.slug]
        );
        bilan.programmes += r.rowCount ?? 0;
      }
    }
    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    await client.end();
  }

  console.log(
    `Créés : ${bilan.crees} · modifiés : ${bilan.modifies} · inchangés : ${bilan.inchanges}` +
      (opts.replanifier ? ` · replanifiés : ${bilan.replanifies}` : "") +
      (opts.programmer ? ` · programmés : ${bilan.programmes}` : "")
  );
  console.log("Calendrier et publication : /admin/blog");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
