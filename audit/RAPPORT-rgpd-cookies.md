# Rapport - RGPD, cookies et consentement

Site : estimmo-direct.com · Audit du 12/11/2026, en lecture seule (aucune modification de
code) · Version auditée : 3.5.1 · Prochaine phase : bannière cookies maison, Google Tag
Manager (GTM-ND26WF6G), suivi des sources (UTM) et module RGPD dans l'admin (export des
données d'un prospect, effacement ou anonymisation sur demande reçue par mail).

Ce rapport dit ce qui existe, ce qui manque au regard du RGPD et des recommandations CNIL,
et ce qu'il faudra construire, lot par lot. Les décisions à prendre avant de coder sont
regroupées en fin de document (§ 7).

## 1. Ce qui existe

### 1.1 Données personnelles traitées

| Où | Données | Base légale | Durée annoncée | Durée réelle |
|---|---|---|---|---|
| `leads` | prénom, nom, email, téléphone, adresse du bien (libellé, code INSEE, lat/lon), caractéristiques du bien, estimation, score, statut, **notes libres de l'admin**, UTM, langue, `consentement_rgpd` + `date_consentement` (horodatée **côté serveur**, `app/api/leads/route.ts:87`), `demande_rappel` + date | Consentement (case obligatoire, texte du brief, lien vers la politique) | 3 ans après le dernier contact | **Illimitée** : aucune purge n'existe |
| `crm_sync_queue.payload` | copie complète du lead (contact + bien + estimation) pour le webhook CRM | idem | idem | Suit la suppression du lead (`on delete cascade`), mais **pas une anonymisation** |
| `form_events` | id de session aléatoire, étape, champ, valeur (champs à choix seulement), langue, appareil, chemin de page sans query, durée | Intérêt légitime (mesure sans cookie, aucun identifiant) | non définie | Illimitée |
| Emails Resend | email prospect (estimation + lien « être rappelé » signé HMAC), notification agent en FR avec **toutes les coordonnées** | Consentement | non définie | Resend conserve le contenu des envois selon ses réglages ; boîte mail de Carenza non bornée |
| CRM externe | payload ci-dessus via `CRM_WEBHOOK_URL` (pas configuré à ce jour) | Consentement | - | Hors de notre contrôle ; `deleteLead` prévient que le CRM n'est **pas informé** |
| Logs Vercel | `app/api/geocode/route.ts:62` journalise **l'adresse saisie** (`q="…"`) à chaque relais Photon ; `[email:simulation]` journalise l'email du prospect (dev seulement) | - | - | Rétention des logs Vercel (courte, plan Pro) |
| Limitation de débit | IP en mémoire d'instance (`lib/security/rate-limit.ts`) | Intérêt légitime (sécurité) | - | Éphémère, jamais écrite |
| Supabase Auth, `profiles` | compte admin (Carenza) | Contrat | - | - |

Ce qui est correct : consentement explicite, non précoché, horodaté serveur ; `demande_rappel`
tracé et daté ; aucune IP stockée ; analytics du formulaire sans donnée personnelle (adresse,
email, téléphone, nom, surface ne transmettent que « renseigné ») ; export CSV admin protégé
contre l'injection de formules ; mutations DVF jamais exposées individuellement ; Supabase en
eu-west-1 (Irlande) ; valeurs saisies échappées dans les emails.

### 1.2 Cookies et stockage local

| Nom | Posé par | Durée | Finalité | Consentement |
|---|---|---|---|---|
| `NEXT_LOCALE` | `lib/i18n/routing.ts` | 1 an | langue choisie | Exempté (préférence d'interface) |
| `sb-…-auth-token` | Supabase, admin seulement | session | authentification | Exempté |
| `estimmo_sans_suivi` | `proxy.ts`, navigateurs ayant ouvert l'admin | 1 an | exclure le propriétaire des statistiques | Exempté (technique) |
| Vercel Analytics, Speed Insights | `app/[locale]/layout.tsx` | aucun cookie | audience | Exempté (sans cookie ni empreinte) |
| UTM | mémoire du composant formulaire | page courante | source du lead | Aucun stockage |

**Aujourd'hui, aucune bannière n'est requise** (le brief le prévoyait ainsi). Elle devient
obligatoire **dès que GTM charge GA4 ou tout autre tag** : GA4 n'est pas exemptable par la
CNIL, même configuré en « mesure d'audience ».

### 1.3 Pages légales et information des personnes

- `/politique-confidentialite` (`messages/fr/legal.json`, EN à parité) : responsable,
  données, finalités, destinataires (Supabase, Vercel, Resend, CRM), conservation 3 ans,
  droits avec email de contact, cookies. En `noindex`. Il manque : la liste nominative des
  cookies et leur durée, GTM/GA4 (et Google comme destinataire), les transferts hors UE
  (Vercel et Resend sont américains ; Google aussi), le délai de réponse (1 mois), le droit
  à la portabilité et les directives post mortem (art. 85 loi Informatique et Libertés), la
  mention de la mesure sans cookie du formulaire, la **date de version** de la politique,
  et l'adresse postale du responsable (vide dans `SITE.agent`).
- `/mentions-legales` : identité légale vide (`reseau`, `rsac`, `siren`, `adresse`,
  `cartePro` dans `lib/config.ts`), déjà listé dans AGENTS.md. Hébergeur et directrice de
  la publication présents.
- Case de consentement du formulaire : texte imposé par le brief, lien vers la politique,
  non précochée. Conforme.
- Pied de page : liens Mentions légales et Politique de confidentialité. Pas de lien
  « Gérer mes cookies » (normal tant qu'il n'y a pas de bannière).

### 1.4 Ce que l'admin permet déjà pour les droits des personnes

- Fiche lead : statut, notes, **suppression définitive** avec confirmation
  (`components/admin/lead-menu.tsx`, `deleteLead`), rejeu CRM.
- Export CSV de la **liste** filtrée (statut, projet, score), 20 colonnes dont les notes.
- Il n'existe **ni recherche par email, téléphone ou nom** (la liste ne filtre que par
  statut, projet et score), **ni export individuel**, **ni anonymisation**, **ni journal des
  demandes**, **ni purge**. `leads.updated_at` n'est pas maintenu (le trigger
  `set_updated_at` n'est posé que sur `articles`) : la notion de « dernier contact » n'est
  pas calculable aujourd'hui.

## 2. Écarts à corriger

Classement : **A** = non-conformité actuelle ou dès le lot GTM ; **B** = obligation à mécaniser
avant qu'elle ne devienne un problème ; **C** = amélioration.

| # | Écart | Classe | Référence | Correction |
|---|---|---|---|---|
| E1 | Aucune purge : la politique promet 3 ans après le dernier contact, rien ne l'applique, et « dernier contact » n'est pas tracé | B (premiers leads de juillet 2026 → échéance 2029) | RGPD art. 5.1.e, 13.2.a | Lot 2 : colonne `dernier_contact_le` + purge planifiée (§ 4.5) |
| E2 | Effacement incomplet : `deleteLead` ne touche ni le CRM, ni Resend, ni la boîte mail ; aucune trace de la demande ni de la réponse | A | art. 17, 12.3 (réponse sous 1 mois), 5.2 (responsabilité) | Lot 2 : anonymisation + journal + liste de contrôle des sous-traitants (§ 4.3, 4.4) |
| E3 | Pas d'export des données d'une personne (droit d'accès et portabilité) | A | art. 15, 20 | Lot 2 (§ 4.2) |
| E4 | Pas de recherche d'un prospect par email/téléphone dans l'admin : impossible de traiter une demande reçue par mail sans parcourir la liste | A | art. 12 | Lot 2 (§ 4.1) |
| E5 | Politique de confidentialité incomplète (voir § 1.3) et sans section cookies détaillée | A dès GTM | art. 13, délibération CNIL 2020-091 | Lot 1 (§ 3.6) |
| E6 | Bannière et consentement absents : non conforme dès le premier tag GTM | A dès GTM | art. 82 loi I&L, lignes directrices CNIL cookies 2020 | Lot 1 (§ 3) |
| E7 | Adresse saisie journalisée par `/api/geocode` (`q="…"`) : donnée indirectement identifiante dans les logs | C | art. 5.1.c (minimisation) | Lot 1 : journaliser la longueur et la source, pas la valeur |
| E8 | Registre des traitements inexistant (prospection régulière = traitement non occasionnel, donc pas d'exemption TPE) | B | art. 30 | Document (§ 5), pas de code |
| E9 | Pas d'archivage des accords de sous-traitance (DPA) Supabase, Vercel, Resend, Google | B | art. 28, 44-46 (transferts, Data Privacy Framework) | Document (§ 5) |
| E10 | Identité légale vide dans les mentions légales et la politique | A | LCEN art. 6-III, loi Hoguet | Carenza complète `SITE.agent` |
| E11 | `form_events` sans durée de conservation | C | art. 5.1.e | Lot 2 : purge à 25 mois (même borne que l'audience Google) |
| E12 | Notes libres de l'admin exportées et conservées sans cadre | C | art. 5.1.c, 9 (données sensibles interdites) | Consigne à Carenza + anonymisation des notes (§ 4.3) |
| E13 | Pas de lien de désinscription dans l'email prospect | C (un seul email transactionnel, recontact consenti) | art. 21 ; L34-5 CPCE si envois en série | À prévoir seulement si une séquence d'emails est ajoutée un jour |
| E14 | Réglages GA4 non définis (Signals, rétention, partage de données, personnalisation des annonces) | A dès GTM | lignes directrices CNIL | Liste de contrôle § 3.5 |

## 3. Lot 1 : bannière maison, consentement, GTM, politique cookies

Règles CNIL à respecter, traduites en exigences de code. Chaque ligne devra avoir son test.

### 3.1 Avant le choix

- **Aucun tag avant le consentement** : `gtm.js` n'est pas chargé tant que la catégorie
  « mesure d'audience » n'est pas acceptée. Pas d'iframe `<noscript>` GTM (elle chargerait
  sans consentement). Pas de chargement en mode « avancé » du Consent Mode : la CNIL
  considère que les pings sans cookie restent soumis au consentement.
- **Consent Mode v2** quand même : un `gtag('consent','default', { ad_storage: 'denied',
  analytics_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' })`
  poussé dans le `dataLayer` avant tout, puis `update` au choix. Ainsi un tag ajouté plus
  tard dans le conteneur par Carenza respecte le refus par défaut.
- Continuer à naviguer, scroller ou fermer la bannière **n'est pas** un consentement.

### 3.2 La bannière

- Bandeau bas, non bloquant, aux couleurs du site (#2E90E5), rendu **côté client après
  hydratation** (pas de contenu de bannière dans le HTML servi aux robots, pas de CLS,
  pas d'impact LCP). Jamais sur l'admin (hors `[locale]`), jamais si `NEXT_PUBLIC_GTM_ID`
  est absent (dev, previews Vercel).
- Trois actions de même poids visuel : **Tout accepter**, **Tout refuser**, **Personnaliser**.
  Refuser doit être aussi simple qu'accepter (un clic, même taille, même contraste).
- Contenu minimal : finalités en une phrase par catégorie, identité du responsable, lien
  vers la politique cookies. Textes fr/en dans `messages/<locale>/cookies.json`,
  reformulables par Carenza via `/admin/traductions`.
- Catégories : **Nécessaires** (toujours actifs, non désactivables : `NEXT_LOCALE`,
  `estimmo_consent`), **Mesure d'audience** (GA4 via GTM), **Marketing** (Google Ads,
  Meta… seulement si le conteneur en contient ; sinon la catégorie n'est pas affichée).
  « Personnaliser » = un interrupteur par catégorie + Enregistrer.
- Accessibilité : `role="dialog"`, `aria-labelledby`, focus géré, clavier, lisible par
  lecteur d'écran. Ne masque pas le formulaire du hero sur mobile (hauteur bornée).

### 3.3 Mémorisation et retrait

- Cookie **`estimmo_consent`**, 1er partie, valeur JSON `{ v, date, id, mesure, marketing }` :
  `v` = version de la politique cookies (constante, à incrémenter à chaque changement de
  finalité → la bannière est redemandée), `id` = identifiant aléatoire du consentement,
  durée **6 mois** (recommandation CNIL ; refus et acceptation mémorisés aussi longtemps).
  Cookie exempté de consentement (il stocke le choix).
- Lien **« Gérer mes cookies »** dans le pied de page, qui rouvre le panneau avec l'état
  courant. Retrait = `consent update denied` + suppression des cookies Google du domaine
  (`_ga`, `_ga_*`, `_gid`, `_gcl_*`) + rechargement du choix. Retirer doit être aussi
  facile que donner.
- Expiration → la bannière réapparaît.

### 3.4 Preuve du consentement

- Table **`consentements_cookies`** : `id` (celui du cookie), `date`, `version`,
  `locale`, `mesure`, `marketing`, `origine` (`banniere` | `panneau`). **Ni IP, ni
  user-agent, ni lien avec un lead.** Écrite via une route `/api/consentement` (rate
  limitée comme `/api/track`). Conservation : 13 mois après l'enregistrement, purge dans
  le même cron que le lot 2.
- Admin : tuile `/admin/rgpd` « Consentements » = taux acceptation / refus / partiel par
  jour et par langue, et recherche par `id` pour fournir une preuve.

### 3.5 GTM et GA4

- `NEXT_PUBLIC_GTM_ID` en variable d'environnement (absent = rien ne charge), sur le modèle
  de `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`. Composant client `components/site/gtm.tsx`
  (`next/script`, `afterInteractive`) monté dans `app/[locale]/layout.tsx` et rendu
  seulement après consentement.
- `dataLayer` : jamais d'email, téléphone, nom ou adresse. Événements utiles :
  `estimation_etape` (étape 1-4), `lead_envoye` (projet, type de bien, tranche de score,
  manuelle oui/non), `rappel_demande`. Les UTM sont lus nativement par GA4.
- Liste de contrôle du compte GA4 (Carenza ou nous, avec son accès) : Google Signals
  désactivé, personnalisation des annonces désactivée, rétention 14 mois, pas de partage de
  données avec Google, aucune collecte de « données utilisateur fournies », conteneur GTM
  avec un déclencheur « consentement accordé » sur chaque tag (ceinture et bretelles).
- Préciser la **liste des tags** du conteneur avant de coder (§ 7).

### 3.6 Textes

- Politique de confidentialité : compléter (§ 1.3), ajouter une **section Cookies** avec
  un tableau nom / émetteur / finalité / durée / catégorie, les transferts hors UE (Vercel,
  Resend, Google : clauses contractuelles types et Data Privacy Framework), Google Ireland
  comme destinataire, la date de version. Garder le `noindex`.
- Ancre `/politique-confidentialite#cookies` ciblée par la bannière.
- Journalisation : retirer la valeur de `q` du log de `/api/geocode` (E7).

Livrables du lot : composant bannière + panneau, cookie et hook de consentement, composant
GTM, route et table `consentements_cookies`, textes fr/en, lien pied de page, politique
mise à jour, tests (aucun script sans consentement, refus = aucun cookie Google, retrait
efface, expiration redemande, changement de version redemande, admin et dev sans bannière),
entrée `CHANGELOG.md` **3.6.0**, variable dans `.env.example` et Vercel.

## 4. Lot 2 : module RGPD dans l'admin

Cas d'usage de référence : Carenza reçoit un mail « supprimez mes données » ou « envoyez-moi
ce que vous avez sur moi ». Elle doit pouvoir, en moins de deux minutes : retrouver la
personne, exporter, effacer ou anonymiser, et garder la trace de ce qu'elle a fait, avec
l'échéance du mois.

### 4.1 Retrouver une personne

- Champ de **recherche** sur `/admin/leads` : email, téléphone (normalisé via
  `normaliserTelephone`), nom. Un prospect peut avoir **plusieurs leads** (plusieurs
  estimations) : le résultat les regroupe par email, et les actions des § 4.2-4.3 portent
  sur tous.
- Vérification d'identité raisonnable : on répond **à l'adresse email enregistrée** ; si la
  demande vient d'une autre adresse, on demande confirmation depuis l'adresse connue. Pas de
  pièce d'identité (disproportionné selon la CNIL).

### 4.2 Export des données (accès, portabilité)

- Bouton **« Exporter ses données »** sur la fiche (et sur le groupe par email) → archive
  avec : `donnees.json` (toutes les colonnes du ou des leads, payload CRM, statut d'envoi
  CRM, dates de consentement et de rappel), `donnees.csv` (Excel) et `resume.txt` lisible,
  prêt à coller dans la réponse mail, en français ou en anglais selon `leads.locale`.
  Notes internes et score : à trancher (D5).
- L'export crée automatiquement une entrée dans le journal (§ 4.4).

### 4.3 Effacement et anonymisation

Deux actions distinctes, les deux disponibles :

- **Anonymiser** (recommandé par défaut) : conserve la ligne pour les statistiques
  (nombre de leads, taux d'estimations manuelles, sources, baromètre) en retirant tout ce
  qui identifie : prénom, nom, email, téléphone, `adresse_libelle`, `notes` → null ;
  `lat`/`lon` arrondis au centre de la commune (ou null) ; `code_insee`, bien, estimation,
  statut, UTM, langue, dates conservés ; `anonymise_le` renseigné. Même traitement sur
  `crm_sync_queue.payload` (bloc `contact` et `adresse` vidés). Une ligne anonymisée ne
  s'affiche plus comme un lead actif (fiche en lecture seule, badge « anonymisé »), n'est
  plus exportée en CSV nominatif et ne reçoit plus d'email.
- **Supprimer** : l'existant (`deleteLead`, cascade sur la file CRM), désormais journalisé.
- Dans les deux cas, l'action affiche une **liste de contrôle** des copies hors base que
  l'admin doit traiter à la main et cocher : CRM externe (pas d'API d'effacement par
  webhook), journal d'envois Resend (ou régler la rétention à zéro dans Resend), emails de
  notification dans la boîte de Carenza, éventuel export CSV téléchargé. Le journal garde
  ces cases.
- **Liste d'opposition** (optionnelle, D3) : empreinte salée de l'email (`sha256`), 3 ans,
  consultée par `/api/leads` : une nouvelle demande d'estimation de cette personne est
  acceptée (elle est à l'initiative) mais le lead est marqué « ne pas recontacter » et
  aucune notification commerciale n'est envoyée. Répond à l'opposition à la prospection
  (art. 21) sans garder l'email en clair.

### 4.4 Journal des demandes (`demandes_rgpd`)

- Colonnes : `type` (accès, rectification, effacement, anonymisation, opposition,
  portabilité, limitation), `recue_le`, `demandeur` (email), `leads` (uuid[]), `echeance`
  (= reçue + 1 mois, prolongeable de 2 mois si complexe, art. 12.3), `traitee_le`,
  `action` (export, anonymisation, suppression, refus motivé), `reponse_envoyee` (bool),
  `controles` (jsonb des cases cochées § 4.3), `notes`.
- Page **`/admin/rgpd`** : demandes en cours avec les échéances dépassées en rouge, saisie
  manuelle d'une demande (reçue par mail ou téléphone), historique. Les actions des § 4.2
  et 4.3 créent l'entrée automatiquement ; l'admin complète « réponse envoyée ».
- Le journal est lui-même une donnée personnelle (email du demandeur) : conservation 5 ans
  (prescription), puis purge.

### 4.5 Durées de conservation mécanisées

- `leads.dernier_contact_le` : posé à la création, mis à jour par tout changement de
  statut, note, demande de rappel, rejeu CRM (trigger SQL, pas de code applicatif à
  oublier). Les leads existants prennent `greatest(created_at, demande_rappel_at)`.
- Cron quotidien `/api/cron/rgpd` (protégé par `CRON_SECRET`, ajouté à `vercel.json`) :
  anonymise les leads dont `dernier_contact_le` < aujourd'hui − 3 ans (les statuts
  `mandat_simple`/`mandat_exclusif` deviennent des clients : durée contractuelle différente,
  exclus de la purge automatique, D4) ; supprime `form_events` > 25 mois,
  `consentements_cookies` > 13 mois, `demandes_rgpd` > 5 ans. Chaque passage écrit une
  ligne de synthèse visible dans `/admin/rgpd`.
- `/admin/rgpd` affiche « N leads seront anonymisés dans les 30 prochains jours » avec la
  liste, pour permettre une relance avant.

### 4.6 Paramétrage et textes

- Rien dans la base pour GTM (variable d'environnement). La version de la politique est
  une constante de code (`lib/rgpd/politique.ts`), changée avec le texte.
- Consigne affichée au-dessus du champ Notes : « pas de donnée sensible (santé, situation
  familiale, religion…) » (E12).

Livrables du lot : migration (`demandes_rgpd`, `oppositions` éventuelle, colonnes
`anonymise_le` et `dernier_contact_le` + trigger, fonction SQL d'anonymisation en une
transaction), recherche, export, actions anonymiser/supprimer journalisées, page
`/admin/rgpd`, cron, tests (anonymisation complète y compris payload CRM, lead multiple,
échéances, purge n'anonymise pas les clients, opposition), entrée `CHANGELOG.md` **3.7.0**.

## 5. Documents hors code (à produire par ou avec Carenza)

1. **Registre des traitements** (modèle CNIL simplifié), trois fiches : estimation et
   prospection (leads), mesure d'audience (cookies/GA4 + analytics sans cookie), gestion de
   l'admin. Peut être tenu dans `audit/` ou chez Carenza ; pas une page de l'app.
2. **Accords de sous-traitance** à accepter et archiver : Supabase (DPA dans le tableau de
   bord), Vercel (DPA), Resend (DPA), Google (Ads Data Processing Terms / GA4). Transferts
   États-Unis couverts par le Data Privacy Framework pour Vercel, Resend et Google : à citer.
3. **Identité légale** dans `lib/config.ts` (réseau, RSAC, SIREN, adresse, carte pro).
4. **Procédure de réponse** : deux modèles de mail (fr/en) pour accès et effacement, délai
   d'un mois, vérification par l'adresse connue, et l'habitude de supprimer les mails de
   notification une fois le lead traité dans l'admin.
5. **Réglages Resend** : rétention des contenus d'emails au minimum.
6. **Réglages GA4** (§ 3.5) une fois le compte créé.

## 6. Lot 3 : sources et UTM (rappel, déjà cadré)

Hors périmètre RGPD strict mais lié : mémoriser `utm_*`, `document.referrer` et la page
d'entrée en `sessionStorage` à l'échelle du site (meurt avec l'onglet, pas un cookie, à
citer dans la politique), colonne et filtre « Source » dans `/admin/leads`, tuile « Leads par
source / campagne » dans `/admin/stats`, événement `lead_envoye` dans le `dataLayer`.
Entrée **3.8.0**.

## 7. Décisions à prendre avant de coder

| # | Question | Proposition |
|---|---|---|
| D1 | Quels tags dans le conteneur GTM-ND26WF6G (GA4 seul ? Google Ads ? Meta ?) | Conditionne la catégorie « Marketing » et le tableau des cookies. GA4 seul = deux catégories |
| D2 | Action par défaut sur demande d'effacement : anonymiser ou supprimer ? | Anonymiser (garde les statistiques, satisfait l'art. 17) ; supprimer reste disponible |
| D3 | Liste d'opposition par empreinte d'email ? | Oui, 3 ans, sans email en clair |
| D4 | Durée de conservation : 3 ans après dernier contact confirmée ? Clients (mandat) exclus de la purge ? | Oui et oui ; les clients relèvent du dossier de transaction (durée légale 5 à 10 ans), hors ESTIMMO |
| D5 | L'export d'accès inclut-il les notes internes et le score ? | Oui pour les notes (ce sont des données sur la personne, art. 15), le score aussi avec une phrase d'explication ; à valider avec Carenza qui écrit les notes |
| D6 | Adresse de contact RGPD : carenza.brown@iadfrance.fr (déjà dans la politique) ? | Oui ; une adresse dédiée n'est pas obligatoire |
| D7 | Les textes de la politique sont réécrits par nous puis relus par Carenza ? | Oui, version fr puis en ; date de version affichée |

Ordre proposé : lot 1 (3.6.0) → lot 2 (3.7.0) → lot 3 (3.8.0). Le lot 1 démarre dès D1 et
D7 ; le lot 2 n'a besoin que de D2 à D5 et peut suivre immédiatement.
