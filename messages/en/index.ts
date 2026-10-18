import type fr from "../fr";
import barometre from "./barometre.json";
import blog from "./blog.json";
import common from "./common.json";
import commune from "./commune.json";
import departement from "./departement.json";
import email from "./email.json";
import estimation from "./estimation.json";
import home from "./home.json";
import labels from "./labels.json";
import legal from "./legal.json";
import nav from "./nav.json";
import notFound from "./notFound.json";
import prix from "./prix.json";
import quartier from "./quartier.json";
import rappel from "./rappel.json";
import result from "./result.json";
import validation from "./validation.json";

/** Messages anglais : mêmes clés que le français (typage + messages.test.ts). */
const en = {
  barometre,
  blog,
  common,
  commune,
  departement,
  email,
  estimation,
  home,
  labels,
  legal,
  nav,
  notFound,
  prix,
  quartier,
  rappel,
  result,
  validation,
} satisfies typeof fr;

export default en;
