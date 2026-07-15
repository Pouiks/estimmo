/**
 * Insère des articles de blog de démarrage en BROUILLON (à relire et publier
 * depuis /admin/blog). Idempotent : un slug déjà présent n'est pas réécrit.
 * Usage : pnpm seed:articles
 */
import { getDbClient } from "./util";

// ----- Mini-builders TipTap ------------------------------------------------
type Node = Record<string, unknown>;

const t = (text: string): Node => ({ type: "text", text });
const b = (text: string): Node => ({
  type: "text",
  marks: [{ type: "bold" }],
  text,
});
const p = (...content: Node[]): Node => ({ type: "paragraph", content });
const h2 = (text: string): Node => ({
  type: "heading",
  attrs: { level: 2 },
  content: [t(text)],
});
const li = (...content: Node[]): Node => ({
  type: "listItem",
  content: [{ type: "paragraph", content }],
});
const ul = (...items: Node[]): Node => ({ type: "bulletList", content: items });
const doc = (...content: Node[]): Node => ({ type: "doc", content });

// ----- Articles -------------------------------------------------------------
interface Seed {
  slug: string;
  titre: string;
  meta: string;
  contenu: Node;
}

const articles: Seed[] = [
  {
    slug: "combien-coute-vendre-bien-immobilier",
    titre: "Combien coûte réellement la vente d'un bien immobilier ?",
    meta: "Diagnostics, honoraires d'agence, plus-value, mainlevée : le détail des frais à prévoir quand on vend un logement, et qui paie quoi.",
    contenu: doc(
      p(
        t(
          "On parle beaucoup des frais de notaire de l'acheteur, rarement des frais du vendeur. Ils existent pourtant, et les anticiper évite les mauvaises surprises au moment de signer. Voici le panorama complet."
        )
      ),
      h2("Les diagnostics obligatoires"),
      p(
        t(
          "Le dossier de diagnostic technique (DDT) est à la charge du vendeur : DPE, amiante, plomb, électricité, gaz, état des risques, assainissement selon les cas. Comptez généralement "
        ),
        b("entre 200 et 600 euros"),
        t(
          " selon la taille du bien et le nombre de diagnostics requis. Le DPE est valable 10 ans, les autres ont des durées de validité variables : vérifiez les vôtres avant de commander un pack complet."
        )
      ),
      h2("Les honoraires d'agence"),
      p(
        t(
          "Ils sont libres et varient fortement d'une agence à l'autre. Deux points à regarder de près : le taux, bien sûr, mais surtout ce qu'il inclut réellement (photos professionnelles, diffusion, visites qualifiées, négociation, suivi jusqu'à l'acte). Un mandat exclusif est souvent négocié à un taux plus bas qu'un mandat simple, car l'agence sécurise son travail."
        )
      ),
      p(
        t("Chez ESTIMMO, les honoraires démarrent "),
        b("à partir de 3 % en mandat exclusif"),
        t(", contre un minimum de 6 % en mandat simple.")
      ),
      h2("L'impôt sur la plus-value"),
      p(
        t("Bonne nouvelle : la vente de votre "),
        b("résidence principale est totalement exonérée"),
        t(
          ". Pour une résidence secondaire ou un bien locatif, la plus-value est imposée (impôt sur le revenu et prélèvements sociaux), avec des abattements progressifs selon la durée de détention : exonération d'impôt au bout de 22 ans, et des prélèvements sociaux au bout de 30 ans."
        )
      ),
      h2("Les frais annexes souvent oubliés"),
      ul(
        li(
          b("Mainlevée d'hypothèque"),
          t(
            " si votre crédit courait encore : quelques centaines d'euros d'acte notarié."
          )
        ),
        li(
          b("Indemnité de remboursement anticipé"),
          t(
            " du prêt : souvent 6 mois d'intérêts, plafonnée à 3 % du capital restant dû. Parfois négociable ou déjà supprimée dans votre contrat."
          )
        ),
        li(
          b("Pré-état daté et état daté"),
          t(" en copropriété, facturés par le syndic.")
        ),
        li(
          b("Travaux et home staging"),
          t(
            " éventuels : un rafraîchissement bien ciblé se récupère souvent dans le prix de vente."
          )
        )
      ),
      h2("Le vrai coût caché : un prix mal positionné"),
      p(
        t(
          "Le poste le plus coûteux d'une vente n'apparaît sur aucune facture : c'est un prix de départ trop haut. Un bien surestimé s'installe dans les annonces, les acheteurs le voient vieillir et négocient d'autant plus fort. Commencez par une "
        ),
        b("estimation fondée sur les ventes réelles de votre quartier"),
        t(
          ", puis affinez avec un avis de valeur sur place : c'est gratuit et cela évite les six mois de commercialisation perdus."
        )
      )
    ),
  },
  {
    slug: "dpe-vente-location-ce-qui-change",
    titre: "DPE : ce qui change pour vendre ou louer votre logement",
    meta: "Interdictions de location des passoires thermiques, audit énergétique obligatoire, impact sur le prix : le point complet sur le DPE.",
    contenu: doc(
      p(
        t(
          "Le diagnostic de performance énergétique est devenu un élément central de toute transaction immobilière. Il conditionne le droit de louer, influence le prix de vente et déclenche parfois des obligations supplémentaires. Voici l'essentiel à connaître."
        )
      ),
      h2("Location : le calendrier des interdictions"),
      ul(
        li(
          b("Classe G"),
          t(" : location interdite depuis le 1er janvier 2025.")
        ),
        li(b("Classe F"), t(" : interdiction au 1er janvier 2028.")),
        li(b("Classe E"), t(" : interdiction au 1er janvier 2034."))
      ),
      p(
        t(
          "Concrètement, un logement classé G ne peut plus faire l'objet d'un nouveau bail. Pour les propriétaires bailleurs concernés, deux options : rénover, ou vendre."
        )
      ),
      h2("Vente : l'audit énergétique obligatoire"),
      p(
        t(
          "Pour la vente d'une maison ou d'un immeuble en monopropriété classé F ou G, un "
        ),
        b("audit énergétique réglementaire"),
        t(
          " doit être remis à l'acheteur, en plus du DPE. Il est également requis pour les biens classés E depuis 2025. L'audit propose des scénarios de travaux chiffrés : c'est un document que les acheteurs utilisent pour négocier, autant le connaître avant eux."
        )
      ),
      h2("Quel impact sur le prix ?"),
      p(
        t(
          "Les études sur les ventes réelles convergent : à bien comparable, une étiquette F ou G se paie par une décote sensible, tandis qu'une étiquette A ou B se valorise. Notre moteur d'estimation intègre cet effet : "
        ),
        b("un DPE G pèse jusqu'à -12 % sur le prix au m²"),
        t(", quand un A ou B apporte un bonus de l'ordre de +5 %.")
      ),
      h2("Passoire thermique : rénover ou vendre ?"),
      p(
        t(
          "Tout dépend du coût des travaux rapporté à la valeur du bien et du marché locatif local. Un studio G en zone tendue peut justifier une rénovation rapidement rentabilisée ; une grande maison F isolée au fioul, beaucoup moins. Avant de décider, chiffrez les deux scénarios : valeur actuelle en l'état, valeur après travaux, aides mobilisables."
        )
      ),
      p(
        t("Première étape dans les deux cas : "),
        b("connaître la valeur actuelle de votre bien"),
        t(
          ". L'estimation en ligne vous donne une fourchette immédiate fondée sur les ventes de votre quartier, DPE compris."
        )
      )
    ),
  },
  {
    slug: "estimation-en-ligne-ou-avis-de-valeur",
    titre: "Estimation en ligne ou avis de valeur : laquelle croire ?",
    meta: "Fourchette statistique immédiate ou expertise sur place : ce que vaut vraiment chaque méthode d'estimation, et comment les combiner.",
    contenu: doc(
      p(
        t(
          "Vous avez obtenu une fourchette en ligne en deux minutes, et un agent vous propose un avis de valeur sur place. Les deux chiffres seront-ils identiques ? Probablement pas, et c'est normal : les deux méthodes ne mesurent pas la même chose."
        )
      ),
      h2("Ce que fait bien l'estimation en ligne"),
      p(
        t("Un bon estimateur en ligne s'appuie sur les "),
        b("ventes réellement enregistrées par l'État (base DVF)"),
        t(
          " : même type de bien, surface comparable, transactions récentes autour de votre adresse. Il en tire un prix au m² de marché, ajusté selon l'état, le DPE ou l'étage que vous déclarez. C'est rapide, objectif, et fondé sur des prix signés chez le notaire plutôt que sur des annonces optimistes."
        )
      ),
      h2("Ce qu'elle ne peut pas voir"),
      ul(
        li(t("La vue exacte, l'exposition réelle, le vis-à-vis.")),
        li(t("La qualité de l'agencement et des matériaux.")),
        li(
          t(
            "L'état de la copropriété : charges, travaux votés, procédures en cours."
          )
        ),
        li(
          t(
            "Le micro-marché de votre rue, parfois différent de celui du quartier."
          )
        )
      ),
      h2("Ce qu'apporte l'avis de valeur"),
      p(
        t(
          "Réalisé sur place par un professionnel qui connaît les ventes locales, il intègre tout ce qui précède et débouche sur un "
        ),
        b("prix de commercialisation"),
        t(
          " : celui auquel votre bien doit être présenté pour vendre dans de bonnes conditions et un délai raisonnable. C'est aussi un document utile face aux acheteurs pour justifier le prix."
        )
      ),
      h2("La bonne méthode : les deux, dans cet ordre"),
      p(
        t("Commencez en ligne pour obtenir une "),
        b("fourchette objective et gratuite"),
        t(
          ", sans pression commerciale. Si le résultat confirme votre projet, faites-le affiner sur place. Chez ESTIMMO, l'avis de valeur qui suit l'estimation en ligne est offert et sans engagement : vous gardez la main à chaque étape."
        )
      )
    ),
  },
  {
    slug: "7-erreurs-vente-immobiliere",
    titre: "Les 7 erreurs qui font perdre de l'argent en vendant",
    meta: "Prix de départ trop haut, photos ratées, diagnostics tardifs : les erreurs classiques des vendeurs et comment les éviter.",
    contenu: doc(
      p(
        t(
          "Vendre un bien, la plupart d'entre nous ne le fait que deux ou trois fois dans une vie. Les acheteurs, eux, comparent des dizaines d'annonces chaque semaine. Voici les erreurs qui coûtent le plus cher, constatées sur le terrain."
        )
      ),
      h2("1. Surestimer le prix de départ"),
      p(
        t(
          "L'erreur la plus fréquente et la plus coûteuse. Les trois premières semaines concentrent l'essentiel des contacts : un prix trop haut les gaspille. Le bien s'installe, puis il faut baisser, souvent en dessous du juste prix initial. Partez des "
        ),
        b("ventes réelles de votre quartier"),
        t(", pas du prix d'achat majoré de vos souvenirs de travaux.")
      ),
      h2("2. Négliger photos et lumière"),
      p(
        t(
          "L'annonce se joue en une seconde de défilement. Rangez, dépersonnalisez, ouvrez les volets, et faites faire des photos professionnelles : c'est l'investissement au meilleur rendement de toute la vente."
        )
      ),
      h2("3. Commander les diagnostics au dernier moment"),
      p(
        t(
          "Un DPE défavorable découvert après la mise en vente, et c'est toute la stratégie de prix à revoir, parfois une promesse qui capote. Diagnostiquez avant d'afficher le prix."
        )
      ),
      h2("4. Cacher les défauts"),
      p(
        t(
          "Servitude, dégât des eaux ancien, travaux votés en copropriété : tout finit par se savoir, au mieux en négociation, au pire devant le notaire. Annoncer soi-même un défaut, chiffrage en main, désamorce la négociation."
        )
      ),
      h2("5. Mal choisir entre les mandats"),
      p(
        t(
          "Multiplier les agences en mandat simple semble augmenter les chances ; en pratique, le bien apparaît partout à des prix parfois différents, et plus personne ne se bat pour lui. Un "
        ),
        b("mandat exclusif à honoraires réduits"),
        t(
          " avec un engagement de moyens écrit donne souvent un meilleur résultat net vendeur."
        )
      ),
      h2("6. Être présent pendant les visites"),
      p(
        t(
          "Les acheteurs ont besoin de se projeter et de parler librement. Laissez le professionnel conduire la visite et recueillir les objections à chaud."
        )
      ),
      h2("7. Choisir l'offre la plus haute sans vérifier le financement"),
      p(
        t(
          "Une offre à 100 % de crédit sans apport ni simulation bancaire vaut moins qu'une offre légèrement inférieure mais solide. Trois mois perdus sur un refus de prêt coûtent souvent plus cher que l'écart entre les deux offres."
        )
      ),
      p(
        t("Le point de départ de tout : "),
        b("un prix juste, fondé sur des données réelles"),
        t(
          ". Estimez votre bien gratuitement en ligne, puis faites affiner le résultat sur place."
        )
      )
    ),
  },
];

async function main() {
  const client = getDbClient();
  await client.connect();
  try {
    for (const a of articles) {
      const res = await client.query(
        `insert into articles (slug, titre, meta_description, contenu, statut)
         values ($1, $2, $3, $4, 'brouillon')
         on conflict (slug) do nothing`,
        [a.slug, a.titre, a.meta, JSON.stringify(a.contenu)]
      );
      console.log(
        `${res.rowCount === 1 ? "insere " : "existe deja"} : ${a.slug}`
      );
    }
    const { rows } = await client.query(
      "select count(*)::int as n from articles"
    );
    console.log(`Total articles en base : ${rows[0].n}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
