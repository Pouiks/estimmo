# Prompts des images du blog

84 images (3 par article), classées par date de publication : produire en priorité
celles des prochains articles. Généré depuis `content/blog/articles.json` : chaque
prompt tient compte de l'article, de la section où l'image apparaît et de sa légende.

## Mode d'emploi

- **Prompts en anglais**, utilisables dans Midjourney, DALL-E, Firefly, Imagen,
  Ideogram… Le paramètre final `--ar` est propre à Midjourney : ailleurs, le supprimer
  et choisir le format paysage correspondant.
- **Charte commune** (déjà incluse dans chaque prompt) : photo éditoriale réaliste, 35 mm,
  lumière naturelle douce, tons neutres chauds avec touches de bleu discrètes, France
  crédible, aucun visage reconnaissable, aucun texte ni logo.
- **Contrôler avant de garder** : pas de texte parasite (panneaux, documents), pas de
  détail non français (prises, boîtes aux lettres, voitures), mains et objets cohérents.
- **Export** : WebP, moins de 200 Ko, aux dimensions exactes ci-dessous, au chemin
  indiqué (dossier `public/`). Puis `pnpm blog:images`, commit, push.

| Image | Dimensions | Ratio |
|---|---|---|
| `cover.webp` | 1200 × 630 | 1,91:1 (en-tête, vignette /blog, partage réseaux sociaux) |
| `image-1.webp`, `image-2.webp` | 1200 × 800 | 3:2 (dans le corps de l'article) |

---

## 1. Quels critères influencent la valeur d'un bien immobilier ?

_en ligne depuis le 19/10/2026_ · mot-clé : critères valeur bien immobilier

### Couverture

- **Fichier** : `public/images/blog/criteres-valeur-bien-immobilier/cover.webp` - 1200 × 630, ratio 1,91:1
- **Usage** : en-tête de l'article et vignette
- **Texte alternatif (déjà publié)** : Maison ancienne en pierre dans un bourg français, critères de valeur d'un bien immobilier

```text
Wide 1.91:1 landscape, subject centered with breathing room on the sides so it survives a square crop: an old limestone house with weathered painted wooden shutters, a slate roof and a small front garden behind a low stone wall, on a quiet street of a French market town in the Périgord, three-quarter view, climbing rose by the door, no people. Realistic editorial photography, full-frame 35 mm camera, soft late-afternoon natural light, warm neutral tones with discreet touches of blue in the shutters and sky, moderate depth of field, sober and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 191:100
```

### Image 1

- **Fichier** : `public/images/blog/criteres-valeur-bien-immobilier/image-1.webp` - 1200 × 800, ratio 3:2
- **Section** : L'emplacement : le critère que vous ne pouvez pas changer
- **Légende affichée** : Dans une même commune, l'écart de prix se joue souvent à la rue : calme, nuisances et trajet à pied vers l'école comptent autant que l'adresse.
- **Texte alternatif (déjà publié)** : Rue résidentielle calme d'une ville française bordée de maisons avec jardinets

```text
3:2 landscape. A calm tree-lined residential street in a mid-sized French town such as Angers, 1930s semi-detached houses in brick and cream render with small front gardens and wrought-iron gates, plane trees along a wide pavement, a small parked French hatchback, a school building glimpsed at the end of the street within walking distance, no traffic, no people. Realistic editorial photography, full-frame 35 mm camera, soft morning natural light, warm neutral tones with discreet touches of blue in a painted gate and the sky, moderate depth of field, sober and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

### Image 2

- **Fichier** : `public/images/blog/criteres-valeur-bien-immobilier/image-2.webp` - 1200 × 800, ratio 3:2
- **Section** : La performance énergétique, le critère de valeur qui a le plus bougé
- **Légende affichée** : Selon les notaires, une maison classée F ou G se vendait en 2021 jusqu'à 20 % moins cher qu'une maison classée D, avec de forts écarts entre régions.
- **Texte alternatif (déjà publié)** : Artisan posant une fenêtre double vitrage lors de la rénovation énergétique d'une maison

```text
3:2 landscape. A craftsman seen from behind, face not visible, fitting a new white double-glazed window into the thick stone wall of an old French village house under energy renovation, wood-fibre insulation panels stacked against the wall, a spirit level and cordless drill on a trestle, fine dust floating in the light, blue work trousers. Realistic editorial photography, full-frame 35 mm camera, soft natural daylight through the opening, warm neutral tones with discreet touches of blue in the workwear, moderate depth of field, sober and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

---

## 2. Comment faire estimer sa maison gratuitement, et par qui ?

_publication le jeudi 22 octobre_ · mot-clé : estimer sa maison gratuitement

### Couverture

- **Fichier** : `public/images/blog/estimer-maison-gratuitement/cover.webp` - 1200 × 630, ratio 1,91:1
- **Usage** : en-tête de l'article et vignette
- **Texte alternatif (déjà publié)** : Propriétaire consultant les ventes immobilières de son quartier pour estimer sa maison gratuitement

```text
Wide 1.91:1 landscape, subject centered with breathing room on the sides so it survives a square crop: a homeowner's hands resting on an open laptop displaying a neighbourhood map dotted with coloured sale markers, on a solid oak kitchen table in a French house, a blue ceramic coffee cup and a few out-of-focus papers beside it, face out of frame, screen without legible labels. Realistic editorial photography, full-frame 35 mm camera, soft morning natural light from a side window, warm neutral tones with discreet touches of blue, moderate depth of field, sober and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 191:100
```

### Image 1

- **Fichier** : `public/images/blog/estimer-maison-gratuitement/image-1.webp` - 1200 × 800, ratio 3:2
- **Section** : Les données publiques : ce que l'État vous montre
- **Légende affichée** : La base DVF publie les prix de vente réels des cinq dernières années, partout sauf en Alsace, en Moselle et à Mayotte.
- **Texte alternatif (déjà publié)** : Carte des ventes immobilières par parcelle affichée sur un écran d'ordinateur

```text
3:2 landscape. A desktop computer monitor on a home-office desk in a French apartment, the screen seen slightly from the side showing a cadastral map of land parcels in pastel colours with small round markers for recorded property sales, no legible labels or numbers, a hand on the mouse at the edge of the frame, blurred bookshelf and a window over grey zinc rooftops behind. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with discreet touches of blue in the map, moderate depth of field, sober and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

### Image 2

- **Fichier** : `public/images/blog/estimer-maison-gratuitement/image-2.webp` - 1200 × 800, ratio 3:2
- **Section** : L'avis de valeur d'un agent immobilier : gratuit, et pourquoi
- **Légende affichée** : Un avis de valeur sérieux repose sur une visite complète, combles et sous-sol compris, et sur une liste de ventes comparables récentes.
- **Texte alternatif (déjà publié)** : Conseillère immobilière mesurant une pièce lors de la visite d'estimation d'une maison

```text
3:2 landscape. A female real estate advisor seen in profile at mid-distance, face turned away and softly out of focus, aiming a laser distance meter across the living room of a lived-in French family house, a notebook in her other hand, terracotta tile floor, stone fireplace, a wooden staircase leading up toward the attic, family furniture around. Realistic editorial photography, full-frame 35 mm camera, soft natural window light, warm neutral tones with discreet touches of blue in her jacket, moderate depth of field, sober and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

---

## 3. Pourquoi faire appel à un professionnel pour l'estimation immobilière de son bien ?

_publication le samedi 24 octobre_ · mot-clé : professionnel estimation immobilière

### Couverture

- **Fichier** : `public/images/blog/pourquoi-professionnel-estimation-immobiliere/cover.webp` - 1200 × 630, ratio 1,91:1
- **Usage** : en-tête de l'article et vignette
- **Texte alternatif (déjà publié)** : Conseillère immobilière et propriétaire échangeant sur l'estimation d'une maison à la table du salon

```text
Wide 1.91:1 landscape, subject centered with breathing room on the sides so it survives a square crop: tight framing on two pairs of hands across a living-room table in a French house, a real estate advisor pointing with a pen at a floor plan of the property while the homeowner holds a printed sheet, documents seen at an angle and blurred, a blue folder and a cup of tea nearby, faces out of frame. Realistic editorial photography, full-frame 35 mm camera, warm soft natural light, warm neutral tones with discreet touches of blue, moderate depth of field, sober and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 191:100
```

### Image 1

- **Fichier** : `public/images/blog/pourquoi-professionnel-estimation-immobiliere/image-1.webp` - 1200 × 800, ratio 3:2
- **Section** : Ce que coûte une erreur de prix
- **Légende affichée** : Fin du troisième trimestre 2026, un bien restait en moyenne 101 jours en vente, et un prix trop ambitieux allonge encore ce délai.
- **Texte alternatif (déjà publié)** : Panneau à vendre accroché au portail d'une maison française en périphérie de ville

```text
3:2 landscape. A plain generic for-sale panel, slightly faded by weeks of sun and rain, tied to the grey metal gate of a 1990s French subdivision house on the edge of town, cream rendered facade, terracotta tile roof, closed roller shutters on one window, a trimmed laurel hedge, quiet street, no people, the panel blank with no lettering. Realistic editorial photography, full-frame 35 mm camera, soft overcast natural light under a pale grey sky, warm neutral tones with discreet touches of blue in the panel border, moderate depth of field, sober and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

### Image 2

- **Fichier** : `public/images/blog/pourquoi-professionnel-estimation-immobiliere/image-2.webp` - 1200 × 800, ratio 3:2
- **Section** : Comment un professionnel construit son estimation immobilière
- **Légende affichée** : Pour une résidence principale, la comparaison avec les ventes récentes du secteur reste la base, ajustée ensuite selon l'état et les atouts du bien.
- **Texte alternatif (déjà publié)** : Dossier de ventes comparables et plan de maison annotés pour une estimation immobilière

```text
3:2 landscape. Top-down view of a wooden desk laid out for a property valuation: an annotated house floor plan with pencil marks, a printed table of recent comparable sales with several lines highlighted, a calculator, a pen and a pencil, all writing rendered as illegible soft lines, a pair of glasses at the corner. Realistic editorial photography, full-frame 35 mm camera, soft natural daylight, warm neutral tones with discreet touches of blue in the highlighter strokes and a folder, moderate depth of field, sober and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

---

## 4. Faire estimer sa maison sans la vendre : pourquoi et comment ?

_publication le lundi 26 octobre_ · mot-clé : estimer sa maison sans la vendre

### Couverture

- **Fichier** : `public/images/blog/estimer-maison-sans-vendre/cover.webp` - 1200 × 630, ratio 1,91:1
- **Usage** : en-tête de l'article et vignette
- **Texte alternatif (déjà publié)** : Maison familiale française vue du jardin, estimée sans projet de vente

```text
Wide 1.91:1 landscape, subject centered with breathing room on the sides so it survives a square crop: a 1980s French family house with a light ochre rendered facade and a red tile roof seen from its back garden, a terrace with wooden garden furniture, a tidy lawn and a fruit tree, a lived-in peaceful home with no for-sale sign, no people. Realistic editorial photography, full-frame 35 mm camera, soft golden evening natural light, warm neutral tones with discreet touches of blue in a cushion and the shutters, moderate depth of field, sober and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 191:100
```

### Image 1

- **Fichier** : `public/images/blog/estimer-maison-sans-vendre/image-1.webp` - 1200 × 800, ratio 3:2
- **Section** : Succession et donation : la valeur déclarée a des conséquences fiscales
- **Légende affichée** : La valeur déclarée dans la succession devient le prix d'acquisition retenu pour calculer la plus-value si le bien hérité est revendu.
- **Texte alternatif (déjà publié)** : Documents de succession et clés de maison posés sur le bureau d'une étude notariale

```text
3:2 landscape. Close view of a polished wooden desk in a traditional French notary office: a closed succession file in a cardboard folder with an elastic strap, a ring of old house keys and a fountain pen in the foreground, papers seen at an angle with no legible writing, blurred shelves of bound legal volumes behind, no people. Realistic editorial photography, full-frame 35 mm camera, soft muted natural window light, warm neutral tones with discreet touches of blue in the folder strap, moderate depth of field, sober and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

### Image 2

- **Fichier** : `public/images/blog/estimer-maison-sans-vendre/image-2.webp` - 1200 × 800, ratio 3:2
- **Section** : Financer un projet : prêt relais, rachat de crédit, achat
- **Légende affichée** : La banque finance en général un prêt relais à hauteur de 60 à 80 % de la valeur estimée, sur la base d'une estimation de moins de trois mois.
- **Texte alternatif (déjà publié)** : Couple étudiant une simulation de prêt relais avec un conseiller bancaire

```text
3:2 landscape. A couple in their forties seen from three-quarter behind, faces turned away, sitting at a desk opposite a bank advisor whose face is out of frame, in a bright, sober office of a French bank branch, a bridging loan simulation printout lying at an angle, a calculator and a pen on the desk, a glass partition and blurred street behind. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with discreet touches of blue in a chair and a folder, moderate depth of field, sober and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

---

## 5. Simulateur en ligne ou agent immobilier : quelle méthode d'estimation choisir ?

_publication le mercredi 28 octobre_ · mot-clé : simulateur en ligne ou agent immobilier

### Couverture

- **Fichier** : `public/images/blog/simulateur-en-ligne-ou-agent-immobilier/cover.webp` - 1200 × 630, ratio 1,91:1
- **Usage** : en-tête de l'article et vignette
- **Texte alternatif (déjà publié)** : Simulateur en ligne sur tablette à côté de l'avis de valeur d'un agent immobilier

```text
Wide 1.91:1 landscape, subject centered with breathing room on the sides so it survives a square crop: on the dining table of a Haussmann-style Parisian apartment, a tablet displaying a simple price-range bar chart lies side by side with a bound printed valuation report, keys and reading glasses between them, herringbone parquet and a tall window softly blurred behind, no people, no legible figures. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with discreet touches of blue in the chart and report cover, moderate depth of field, sober and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 191:100
```

### Image 1

- **Fichier** : `public/images/blog/simulateur-en-ligne-ou-agent-immobilier/image-1.webp` - 1200 × 800, ratio 3:2
- **Section** : Simulateur en ligne ou agent immobilier : le comparatif
- **Légende affichée** : Ni le simulateur ni l'avis de valeur d'un agent n'ont de valeur juridique : en cas de litige ou de succession conflictuelle, mieux vaut un expert ou un notaire.
- **Texte alternatif (déjà publié)** : Agent immobilier consultant une estimation sur tablette pendant la visite d'un appartement

```text
3:2 landscape. A real estate agent seen in profile at mid-distance, face turned toward the room and not identifiable, holding a tablet with a blurred estimation screen while looking up to compare it with the space, in the bright living room of an old apartment in Lyon with oak parquet, ceiling mouldings, a marble fireplace and tall French windows. Realistic editorial photography, full-frame 35 mm camera, soft natural daylight, warm neutral tones with discreet touches of blue in the agent's shirt, moderate depth of field, sober and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

### Image 2

- **Fichier** : `public/images/blog/simulateur-en-ligne-ou-agent-immobilier/image-2.webp` - 1200 × 800, ratio 3:2
- **Section** : Quand le simulateur suffit, et quand il ne suffit pas
- **Légende affichée** : Une estimation en ligne suffit pour suivre son patrimoine, mais la visite devient indispensable dès qu'il faut fixer un prix de mise en vente.
- **Texte alternatif (déjà publié)** : Propriétaire suivant l'évolution de la valeur de son appartement sur une tablette

```text
3:2 landscape. Over-the-shoulder view of a person relaxing on a linen sofa in a recent French apartment, holding a tablet that shows a gently rising price trend curve without legible figures, a mug on the armrest, a balcony window with a metal railing and potted plants behind, face not visible, calm routine check rather than a sale. Realistic editorial photography, full-frame 35 mm camera, soft late-afternoon natural light, warm neutral tones with discreet touches of blue in the curve and a cushion, moderate depth of field, sober and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

---

## 6. Comment estimer un bien immobilier loué ?

_publication le vendredi 30 octobre_ · mot-clé : estimer un bien immobilier loué

### Couverture

- **Fichier** : `public/images/blog/estimer-bien-immobilier-loue/cover.webp` - 1200 × 630, ratio 1,91:1
- **Usage** : en-tête de l'article et vignette
- **Texte alternatif (déjà publié)** : Façade d'immeuble résidentiel en ville, pour estimer un bien immobilier loué

```text
Wide 1.91:1 landscape, subject centered with breathing room on the sides so it survives a square crop: the facade of a French residential apartment building in pale stone with wrought-iron balconies, several with potted plants, a folded bicycle or drying linen showing homes occupied by tenants, one balcony with a blue parasol, seen from the street slightly from below, no people. Realistic editorial photography, full-frame 35 mm camera, soft morning natural light, warm neutral tones with discreet touches of blue in the parasol and sky, moderate depth of field, sober and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 191:100
```

### Image 1

- **Fichier** : `public/images/blog/estimer-bien-immobilier-loue/image-1.webp` - 1200 × 800, ratio 3:2
- **Section** : Pourquoi un bien occupé ne vaut pas le prix d'un bien libre
- **Légende affichée** : L'acquéreur d'un logement occupé reprend le bail en l'état, avec son loyer et sa date d'échéance, et ne peut donc pas y emménager rapidement.
- **Texte alternatif (déjà publié)** : Séjour meublé et habité d'un deux-pièces occupé par un locataire

```text
3:2 landscape. View from the doorway into the lived-in living room of a small French two-room rental apartment: a grey sofa with a throw, a bookshelf of paperbacks, houseplants, a small round table with a cup, a jacket on a chair, a white panel radiator under a window with a Juliet balcony, everyday belongings showing a tenant at home, no people. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with discreet touches of blue in a cushion and a vase, moderate depth of field, sober and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

### Image 2

- **Fichier** : `public/images/blog/estimer-bien-immobilier-loue/image-2.webp` - 1200 × 800, ratio 3:2
- **Section** : Vendre occupé ou attendre le départ du locataire ?
- **Légende affichée** : Le congé pour vendre doit parvenir au locataire au moins six mois avant l'échéance du bail vide, et il vaut offre de vente à son profit.
- **Texte alternatif (déjà publié)** : Lettre recommandée de congé pour vente posée sur un bail d'habitation

```text
3:2 landscape. Close-up on a wooden desk: a French registered-mail envelope with its pale acknowledgment-of-receipt card lying on a printed residential lease contract, both seen at a slant so no writing is legible, a pen and folded reading glasses beside them, a house key nearby, no people. Realistic editorial photography, full-frame 35 mm camera, soft natural window light, warm neutral tones with discreet touches of blue in the pen and envelope edge, moderate depth of field with the background falling away, sober and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

---

## 7. Comment estimer un local commercial ou un bien immobilier professionnel ?

_publication le dimanche 1 novembre_ · mot-clé : estimer un local commercial

### Couverture

- **Fichier** : `public/images/blog/estimer-local-commercial-bien-professionnel/cover.webp` - 1200 × 630, ratio 1,91:1
- **Usage** : en-tête de l'article et vignette
- **Texte alternatif (déjà publié)** : Vitrine d'un local commercial en rez-de-chaussée dans une rue commerçante de centre-ville

```text
Wide 1.91:1 landscape, subject centered with breathing room on the sides so it survives a square crop: the ground-floor shop front of an independent boutique in an old limestone building on a pedestrian street of a French town centre such as Bordeaux, large display window in a painted wooden frame, blank sign band without lettering, apartments with wrought-iron balconies above, distant passers-by blurred. Realistic editorial photography, full-frame 35 mm camera, soft morning natural light, warm neutral tones with discreet touches of blue in the painted shop frame, moderate depth of field, sober and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 191:100
```

### Image 1

- **Fichier** : `public/images/blog/estimer-local-commercial-bien-professionnel/image-1.webp` - 1200 × 800, ratio 3:2
- **Section** : Méthode 1 : estimer un local commercial par le rendement
- **Légende affichée** : Le taux de capitalisation dépend d'abord de l'emplacement : autour de 4 à 6 % en centre-ville recherché, de 7 à 10 % en périphérie.
- **Texte alternatif (déjà publié)** : Enfilade de boutiques en rez-de-chaussée sur une rue commerçante de centre-ville

```text
3:2 landscape. Street-level perspective down a busy, well-kept shopping street in a French town centre, a long row of ground-floor shops beneath four-storey old stone and rendered buildings, varied storefronts and canvas awnings with no identifiable brands or lettering, stone paving, a few blurred silhouettes in the distance, prime retail location feel. Realistic editorial photography, full-frame 35 mm camera, soft late-morning natural light, warm neutral tones with discreet touches of blue in an awning and the sky, moderate depth of field, sober and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

### Image 2

- **Fichier** : `public/images/blog/estimer-local-commercial-bien-professionnel/image-2.webp` - 1200 × 800, ratio 3:2
- **Section** : Bureaux, cabinets, ateliers : les spécificités du bien professionnel
- **Légende affichée** : Loué par bail professionnel, sans droit au renouvellement ni indemnité d'éviction, un cabinet libéral offre un revenu moins sécurisé qu'un commerce.
- **Texte alternatif (déjà publié)** : Cabinet de profession libérale avec salle d'attente dans un immeuble de bureaux

```text
3:2 landscape. The sober waiting room of a liberal profession practice in an office building in a French city: a row of simple chairs, a large green plant, a low table with blurred magazines, light wooden floor, a half-open office door revealing a desk and a bookshelf, no people, no nameplate or readable sign. Realistic editorial photography, full-frame 35 mm camera, soft natural light from a tall window, warm neutral tones with discreet touches of blue in the chair upholstery, moderate depth of field, sober and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

---

## 8. Vendre sans agence ou avec un professionnel : avantages et inconvénients

_publication le mardi 3 novembre_ · mot-clé : vendre sans agence

### Couverture

- **Fichier** : `public/images/blog/vendre-sans-agence-ou-avec-professionnel/cover.webp` - 1200 × 630, ratio 1,91:1
- **Usage** : en-tête de l'article et vignette
- **Texte alternatif (déjà publié)** : Propriétaire devant sa maison française en vente, hésitant entre vendre seul ou avec une agence

```text
A homeowner seen from behind stands on the gravel driveway of a traditional French detached house in a quiet stone village, light lime-rendered walls, soft blue painted wooden shutters, terracotta roof tiles, a small tidy garden with lavender; one hand in a pocket, pausing as if weighing whether to sell alone or with a professional. Wide 1.91:1 landscape, subject centered with breathing room on the sides so it survives a square crop. Realistic editorial photography, full-frame 35mm camera, soft late-afternoon natural light, warm neutral tones with the discreet blue of the shutters, moderate depth of field, sober and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 191:100
```

### Image 1

- **Fichier** : `public/images/blog/vendre-sans-agence-ou-avec-professionnel/image-1.webp` - 1200 × 800, ratio 3:2
- **Section** : Vendre sans agence : ce que vous devrez faire vous-même
- **Légende affichée** : Le dossier de diagnostics doit être annexé à la promesse : mieux vaut le réunir avant même de publier l'annonce.
- **Texte alternatif (déjà publié)** : Propriétaire triant les diagnostics immobiliers et documents de vente sur la table de sa cuisine

```text
Three-quarter overhead view of a homeowner's hands sorting a pile of property diagnostic reports, an energy performance booklet and a folded floor plan on a worn oak kitchen table in a French home, gathering the sale file before listing; an open laptop, a ceramic coffee cup and a blue cardboard folder nearby, terracotta floor tiles and a window behind. Papers blurred or seen at an angle, no face. 3:2 landscape. Realistic editorial photography, full-frame 35mm camera, soft morning natural light, warm neutral tones with a discreet touch of blue, moderate depth of field, sober and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

### Image 2

- **Fichier** : `public/images/blog/vendre-sans-agence-ou-avec-professionnel/image-2.webp` - 1200 × 800, ratio 3:2
- **Section** : Ce qu'apporte un professionnel, au-delà de l'annonce
- **Légende affichée** : Sous la loi Hoguet, l'agent n'est rémunéré qu'une fois la vente conclue, en pratique à la signature de l'acte définitif.
- **Texte alternatif (déjà publié)** : Conseillère immobilière faisant visiter un séjour lumineux à un couple d'acheteurs

```text
During a house viewing, a female real estate advisor guides a couple of buyers through the bright living room of a French house, all three seen from behind or in soft three-quarter view, the advisor gesturing toward tall French windows with old brass espagnolette handles; oak parquet, plain white walls, sober furniture, a pale blue linen cushion on the sofa. Faces never visible. 3:2 landscape. Realistic editorial photography, full-frame 35mm camera, soft natural daylight, warm neutral tones with a discreet touch of blue, moderate depth of field, calm professional and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

---

## 9. Comment choisir une agence immobilière pour vendre son bien ?

_publication le jeudi 5 novembre_ · mot-clé : choisir une agence immobilière pour vendre

### Couverture

- **Fichier** : `public/images/blog/choisir-agence-immobiliere-vendre/cover.webp` - 1200 × 630, ratio 1,91:1
- **Usage** : en-tête de l'article et vignette
- **Texte alternatif (déjà publié)** : Propriétaire recevant une conseillère immobilière dans son salon pour choisir l'agence qui vendra son bien

```text
In the living room of a Haussmann-era Parisian apartment, a homeowner receives a female real estate advisor: both seated around a low coffee table with a few documents and a tablet, the homeowner seen from behind over the shoulder, the advisor in softly blurred profile, attentive and serious; ornate moldings, marble fireplace, herringbone parquet, a muted blue velvet armchair. Wide 1.91:1 landscape, subject centered with breathing room on the sides so it survives a square crop. Realistic editorial photography, full-frame 35mm camera, soft natural window light, warm neutral tones with a discreet touch of blue, moderate depth of field, cordial and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 191:100
```

### Image 1

- **Fichier** : `public/images/blog/choisir-agence-immobiliere-vendre/image-1.webp` - 1200 × 800, ratio 3:2
- **Section** : Juger l'estimation, pas le chiffre
- **Légende affichée** : Un avis de valeur sérieux s'appuie sur des ventes conclues et datées du secteur, pas sur des biens encore en vente.
- **Texte alternatif (déjà publié)** : Vendeur comparant plusieurs avis de valeur d'agences immobilières posés sur une table

```text
Overhead flat view of a light wooden dining table where a seller compares three different agency property valuation reports laid side by side, each with small blurred comparison tables and photos of sold homes; a hand points at a figure on one page, a blue pen and a calculator beside them, a French home interior hinted at the edges. All text blurred and unreadable, no face. 3:2 landscape. Realistic editorial photography, full-frame 35mm camera, soft natural light, warm neutral tones with a discreet touch of blue, moderate depth of field, focused and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

### Image 2

- **Fichier** : `public/images/blog/choisir-agence-immobiliere-vendre/image-2.webp` - 1200 × 800, ratio 3:2
- **Section** : Regarder comment l'agence vend déjà
- **Légende affichée** : Le barème doit être affiché TTC en vitrine et préciser qui paie : c'est l'un des défauts les plus relevés par la DGCCRF.
- **Texte alternatif (déjà publié)** : Vitrine d'une agence immobilière dans une rue commerçante d'une ville française

```text
Street-level view of a small real estate agency shop window on a cobbled pedestrian street in a French town center, pale limestone facades and wrought-iron balconies above; behind the glass, rows of property listing sheets with house photos and a small printed fee schedule card, all text unreadable; a plain unbranded fascia, a blurred passerby walking past. 3:2 landscape. Realistic editorial photography, full-frame 35mm camera, soft daytime natural light, warm neutral tones with a discreet touch of blue in a window frame, moderate depth of field, sober and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

---

## 10. Agence traditionnelle ou mandataire immobilier : que choisir pour vendre ?

_publication le samedi 7 novembre_ · mot-clé : agence traditionnelle ou mandataire immobilier

### Couverture

- **Fichier** : `public/images/blog/agence-traditionnelle-ou-mandataire-immobilier/cover.webp` - 1200 × 630, ratio 1,91:1
- **Usage** : en-tête de l'article et vignette
- **Texte alternatif (déjà publié)** : Conseiller immobilier faisant visiter une maison française à un couple qui compare agence et mandataire

```text
At the open front door of a typical French house, a real estate advisor welcomes a couple for a viewing, the three people seen from behind and in soft three-quarter view, faces hidden; a painted blue wooden door, an entrance hall with old patterned cement floor tiles, a stone threshold and potted geranium. Wide 1.91:1 landscape, subject centered with breathing room on the sides so it survives a square crop. Realistic editorial photography, full-frame 35mm camera, soft warm natural light, warm neutral tones with the discreet blue of the door, moderate depth of field, welcoming and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 191:100
```

### Image 1

- **Fichier** : `public/images/blog/agence-traditionnelle-ou-mandataire-immobilier/image-1.webp` - 1200 × 800, ratio 3:2
- **Section** : Deux statuts différents, une même loi
- **Légende affichée** : Une agence est dirigée par le titulaire de la carte « Transactions », délivrée par la CCI et à renouveler tous les trois ans.
- **Texte alternatif (déjà publié)** : Agence immobilière traditionnelle avec vitrine au rez-de-chaussée d'un immeuble en pierre

```text
Frontal view of a neighborhood real estate agency occupying the ground floor of a French cut-stone apartment building, large lit shop window displaying neat rows of property listings, a plain blank fascia with no readable name, a closed wooden carriage door next to it, empty sidewalk with a few distant blurred silhouettes. The image conveys an established storefront agency. 3:2 landscape. Realistic editorial photography, full-frame 35mm camera, soft early-evening natural light at blue hour, warm neutral tones with discreet blue in the dusk sky, moderate depth of field, sober and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

### Image 2

- **Fichier** : `public/images/blog/agence-traditionnelle-ou-mandataire-immobilier/image-2.webp` - 1200 × 800, ratio 3:2
- **Section** : Les vérifications à faire, quel que soit le modèle
- **Légende affichée** : Signé à domicile, un mandat doit prévoir 14 jours de rétractation et un formulaire dédié, que l'on traite avec une agence ou un mandataire.
- **Texte alternatif (déjà publié)** : Vendeur relisant un mandat de vente avec un conseiller indépendant dans son salon

```text
Close-up at a living room table in a modest French home: the hands of a seller and an independent real estate advisor leaning over a multi-page sales mandate, one hand holding a pen above the page, a separate detachable withdrawal form lying beside the contract, reading glasses and a blue ceramic mug nearby. Papers blurred or seen at an angle, no face visible. 3:2 landscape. Realistic editorial photography, full-frame 35mm camera, soft natural daylight from the side, warm neutral tones with a discreet touch of blue, moderate depth of field, careful and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

---

## 11. Mandat simple ou mandat exclusif : lequel choisir pour vendre ?

_publication le lundi 9 novembre_ · mot-clé : mandat simple ou mandat exclusif

### Couverture

- **Fichier** : `public/images/blog/mandat-simple-ou-mandat-exclusif/cover.webp` - 1200 × 630, ratio 1,91:1
- **Usage** : en-tête de l'article et vignette
- **Texte alternatif (déjà publié)** : Propriétaire relisant un mandat de vente immobilière avant de choisir entre mandat simple et exclusif

```text
Close-up of a homeowner's hands holding a single page of a real estate sales mandate above a warm wooden table, rereading it before choosing; a pen lying beside it, a set of house keys with a blue leather key tag and a cup of coffee softly blurred behind. No face. Wide 1.91:1 landscape, subject centered with breathing room on the sides so it survives a square crop. Realistic editorial photography, full-frame 35mm camera, soft natural side light from a French window, warm neutral tones with a discreet touch of blue, moderate depth of field, calm and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 191:100
```

### Image 1

- **Fichier** : `public/images/blog/mandat-simple-ou-mandat-exclusif/image-1.webp` - 1200 × 800, ratio 3:2
- **Section** : Le mandat simple : liberté apparente, dispersion réelle
- **Légende affichée** : Confié à trois agences, un même bien peut s'afficher à trois prix différents sur les portails, ce qui invite l'acheteur à négocier.
- **Texte alternatif (déjà publié)** : Acheteur consultant sur son ordinateur plusieurs annonces du même appartement à vendre

```text
Over-the-shoulder view of a person seen from behind at a desk in a Parisian apartment, browsing a property website on a laptop: the screen shows a grid of listings where the same bright living room appears three times in slightly different photos, suggesting one apartment listed by several agencies at different prices; all text unreadable; a desk lamp glowing, zinc rooftops through the window at dusk. 3:2 landscape. Realistic editorial photography, full-frame 35mm camera, soft evening light, warm neutral tones with a discreet touch of blue from the twilight sky, moderate depth of field, sober and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

### Image 2

- **Fichier** : `public/images/blog/mandat-simple-ou-mandat-exclusif/image-2.webp` - 1200 × 800, ratio 3:2
- **Section** : Sortir d'un mandat exclusif : la règle des trois mois
- **Légende affichée** : Une fois les trois premiers mois écoulés, un recommandé avec quinze jours de préavis suffit pour mettre fin à l'exclusivité.
- **Texte alternatif (déjà publié)** : Lettre recommandée avec accusé de réception posée sur un contrat de mandat exclusif

```text
Tight still life on a light desk: a French registered letter envelope with its small attached acknowledgment-of-receipt card resting on top of an exclusive sales mandate, next to a desk calendar with a blue spiral binding and a few days softly marked, a fountain pen across the corner. Envelope markings and papers blurred, nothing readable. The image evokes ending an exclusivity after three months with fifteen days notice. 3:2 landscape. Realistic editorial photography, full-frame 35mm camera, soft neutral natural light, warm neutral tones with a discreet touch of blue, moderate depth of field, orderly and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

---

## 12. Honoraires d'agence immobilière : comment sont-ils calculés et justifiés ?

_publication le mercredi 11 novembre_ · mot-clé : honoraires d'agence immobilière

### Couverture

- **Fichier** : `public/images/blog/honoraires-agence-immobiliere-calcul/cover.webp` - 1200 × 630, ratio 1,91:1
- **Usage** : en-tête de l'article et vignette
- **Texte alternatif (déjà publié)** : Calcul des honoraires d'agence immobilière avec calculatrice, mandat et clés de maison

```text
Still life on a desk in a bright French apartment: a hand typing on a large calculator next to a real estate sales mandate, a pen and a set of house keys, the composition clearly centered on the calculation of agency fees; a blue notebook and a small plant softly blurred in the background. Papers unreadable, no face. Wide 1.91:1 landscape, subject centered with breathing room on the sides so it survives a square crop. Realistic editorial photography, full-frame 35mm camera, soft natural daylight, warm neutral tones with a discreet touch of blue, moderate depth of field, sober and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 191:100
```

### Image 1

- **Fichier** : `public/images/blog/honoraires-agence-immobiliere-calcul/image-1.webp` - 1200 × 800, ratio 3:2
- **Section** : Honoraires d'agence immobilière : comment le montant est calculé
- **Légende affichée** : Selon que les tranches du barème se cumulent ou non, la commission sur une maison à 300 000 € peut varier de 4 000 €.
- **Texte alternatif (déjà publié)** : Propriétaire calculant les honoraires d'agence selon un barème à tranches sur un bloc-notes

```text
Close-up of a homeowner's hand holding a pencil over a paper notepad filled with blurred handwritten figures arranged in stepped columns, as if testing a tiered agency fee scale for a house sale; a calculator and a printed fee schedule lie beside it on a French kitchen table with checkered linen and a blue enamel coffee pot. All writing blurred and unreadable, no face. 3:2 landscape. Realistic editorial photography, full-frame 35mm camera, soft natural daylight, warm neutral tones with a discreet touch of blue, moderate depth of field, focused and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

### Image 2

- **Fichier** : `public/images/blog/honoraires-agence-immobiliere-calcul/image-2.webp` - 1200 × 800, ratio 3:2
- **Section** : Que paie-t-on avec ces honoraires ?
- **Légende affichée** : Reportage photo, visites qualifiées et dossier complet font partie de ce qu'une commission moyenne de 5,78 % TTC doit couvrir.
- **Texte alternatif (déjà publié)** : Photographe immobilier réalisant le reportage d'un séjour lumineux avant la mise en vente

```text
A real estate photographer seen from behind frames a living room with a full-frame camera on a tripod, carrying out the professional photo shoot before a sale; old French apartment with herringbone parquet, ornate ceiling moldings, tall double windows flooding the room with light, sober staged furniture and a pale blue throw on the sofa. Face never visible. 3:2 landscape. Realistic editorial photography, full-frame 35mm camera, abundant soft natural light, warm neutral tones with a discreet touch of blue, moderate depth of field, professional and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

---

## 13. Combien de temps pour vendre une maison en 2026 ?

_publication le vendredi 13 novembre_ · mot-clé : combien de temps pour vendre une maison

### Couverture

- **Fichier** : `public/images/blog/combien-de-temps-vendre-maison/cover.webp` - 1200 × 630, ratio 1,91:1
- **Usage** : en-tête de l'article et vignette
- **Texte alternatif (déjà publié)** : Maison individuelle française avec jardin mise en vente, illustrant le délai de vente en 2026

```text
A 1980s French detached house in a quiet suburban subdivision seen from the street: beige render, terracotta tile roof, wooden shutters, a front garden with a trimmed hedge and a low white metal gate, fallen autumn leaves on the lawn and path, evoking the months a sale takes. No sign, no people. Wide 1.91:1 landscape, subject centered with breathing room on the sides so it survives a square crop. Realistic editorial photography, full-frame 35mm camera, soft golden autumn natural light, warm neutral tones with discreet blue in a clear sky, moderate depth of field, peaceful and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 191:100
```

### Image 1

- **Fichier** : `public/images/blog/combien-de-temps-vendre-maison/image-1.webp` - 1200 × 800, ratio 3:2
- **Section** : Entre compromis et acte : pourquoi trois mois environ
- **Légende affichée** : Rétractation de dix jours, condition de prêt et réponse de la mairie expliquent l'essentiel des trois mois entre compromis et acte.
- **Texte alternatif (déjà publié)** : Signature d'un compromis de vente de maison dans l'étude d'un notaire

```text
Close-up on the desk of a French notary office: the hands of sellers and buyers signing a preliminary sale agreement, a thick bound file, a fountain pen, a leather desk blotter in deep blue, dark polished wood furniture and shelves of archive boxes softly blurred behind. Documents seen at an angle, no readable text, no faces. 3:2 landscape. Realistic editorial photography, full-frame 35mm camera, soft natural light through a tall window, warm neutral tones with a discreet touch of blue, moderate depth of field, formal and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

### Image 2

- **Fichier** : `public/images/blog/combien-de-temps-vendre-maison/image-2.webp` - 1200 × 800, ratio 3:2
- **Section** : Ce qui allonge le délai de vente d'une maison
- **Légende affichée** : Les maisons anciennes ont perdu 1,3 % en un an : une estimation de 2021 ou 2022 conduit presque toujours à un prix trop haut.
- **Texte alternatif (déjà publié)** : Grande maison ancienne en vente depuis plusieurs mois dans un bourg rural français

```text
A large old stone longère in a rural French village, on the market for several months: faded blue wooden shutters half closed, grass grown slightly too high, a weathered wooden gate and a quiet lane in front, no sign visible, a sense of waiting for buyers. No people. 3:2 landscape, slightly off-center composition. Realistic editorial photography, full-frame 35mm camera, soft diffuse light under a pale grey sky, warm neutral tones with the discreet faded blue of the shutters, moderate depth of field, calm and sober mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

---

## 14. Quand revendre son appartement sans perdre d'argent ?

_publication le dimanche 15 novembre_ · mot-clé : revendre son appartement sans perdre d'argent

### Couverture

- **Fichier** : `public/images/blog/quand-revendre-appartement-sans-perdre-argent/cover.webp` - 1200 × 630, ratio 1,91:1
- **Usage** : en-tête de l'article et vignette
- **Texte alternatif (déjà publié)** : Séjour lumineux d'un appartement ancien français avant sa revente par son propriétaire

```text
The bright living room of an old French apartment ready for resale, empty of people: herringbone oak parquet, ornate moldings, tall French windows opening onto a continuous wrought-iron balcony, sober furniture, a tidy coffee table with a single blue ceramic vase, a few neatly stacked folders on a sideboard. Clear central focus on the window light. Wide 1.91:1 landscape, subject centered with breathing room on the sides so it survives a square crop. Realistic editorial photography, full-frame 35mm camera, soft morning natural light, warm neutral tones with a discreet touch of blue, moderate depth of field, clear orderly and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 191:100
```

### Image 1

- **Fichier** : `public/images/blog/quand-revendre-appartement-sans-perdre-argent/image-1.webp` - 1200 × 800, ratio 3:2
- **Section** : Le capital remboursé : le facteur que l'on sous-estime
- **Légende affichée** : Sur 230 000 € empruntés à 3,5 % sur 25 ans, environ 6 000 € de capital seulement sont remboursés la première année.
- **Texte alternatif (déjà publié)** : Tableau d'amortissement de prêt immobilier imprimé avec une calculatrice sur un bureau

```text
Close-up of a printed mortgage amortization schedule with long blurred columns of figures, lying on a wooden desk in a French apartment, a calculator, a highlighter and a pair of blue-framed reading glasses resting on it, one line partly highlighted to suggest checking the capital repaid after a few years. All figures unreadable, no people. 3:2 landscape. Realistic editorial photography, full-frame 35mm camera, soft late-afternoon natural light raking across the paper, warm neutral tones with a discreet touch of blue, moderate depth of field, thoughtful and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

### Image 2

- **Fichier** : `public/images/blog/quand-revendre-appartement-sans-perdre-argent/image-2.webp` - 1200 × 800, ratio 3:2
- **Section** : Les pièges propres à la copropriété
- **Légende affichée** : Les appels de fonds d'un ravalement exigibles avant l'acte restent à la charge du vendeur, sauf répartition négociée dans le compromis.
- **Texte alternatif (déjà publié)** : Immeuble de copropriété en ravalement de façade avec échafaudage dans une ville française

```text
An old French city-center apartment building with cream stone facade and wrought-iron balconies, partially covered with scaffolding and white protective netting during a facade renovation voted by the co-owners, seen from the street at a slight low angle, neighboring buildings with grey zinc roofs, no people in close-up. 3:2 landscape. Realistic editorial photography, full-frame 35mm camera, soft natural daylight, warm neutral tones with discreet blue in a clear sky, moderate depth of field, sober and reassuring mood, no oversaturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

---

## 15. Revendre avant 5 ans : pourquoi dit-on qu'il ne faut pas le faire ?

_publication le mardi 17 novembre_ · mot-clé : revendre avant 5 ans

### Couverture

- **Fichier** : `public/images/blog/revendre-avant-5-ans/cover.webp` - 1200 × 630, ratio 1,91:1
- **Usage** : en-tête de l'article et vignette
- **Texte alternatif (déjà publié)** : Façade d'une maison de ville française avec un panneau à vendre au portail

```text
Street-level view of a narrow French townhouse in pale limestone in a quiet small-town street, tall wooden shutters, a small black wrought iron gate with a blank, unmarked for-sale panel hung on it, a few geraniums on the sill, late afternoon light raking the facade, suggesting an owner weighing whether to sell early. Wide 1.91:1 landscape, subject centered with breathing room on the sides so it survives a square crop. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with discreet touches of blue (pale blue shutters), moderate depth of field, sober and reassuring mood, no excessive saturation. No text, no letters, no logos, no watermarks, no brand names. --ar 191:100
```

### Image 1

- **Fichier** : `public/images/blog/revendre-avant-5-ans/image-1.webp` - 1200 × 800, ratio 3:2
- **Section** : Le calcul année par année sur un exemple
- **Légende affichée** : Sur un achat à 300 000 €, frais de notaire et de crédit dépassent 25 000 € avant même la première mensualité.
- **Texte alternatif (déjà publié)** : Tableau d'amortissement de prêt immobilier et calculatrice posés sur une table de cuisine

```text
Overhead view of a worn oak kitchen table in a French apartment: a printed loan amortization schedule with dense blurred columns, a simple calculator, a ballpoint pen, a separate stack of notary fee papers seen at an angle, a cup of coffee, window light from the side, quiet studious atmosphere about the upfront cost of buying. 3:2 landscape composition. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with discreet touches of blue (a blue ceramic coffee cup), moderate depth of field, sober and reassuring mood, no excessive saturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

### Image 2

- **Fichier** : `public/images/blog/revendre-avant-5-ans/image-2.webp` - 1200 × 800, ratio 3:2
- **Section** : Quand la règle des 5 ans ne s'applique pas
- **Légende affichée** : En cas de mutation, de licenciement ou de décès, la banque ne peut pas facturer d'indemnités de remboursement anticipé liées à la vente.
- **Texte alternatif (déjà publié)** : Cartons de déménagement empilés dans le séjour d'un appartement français ancien

```text
Half-emptied living room of an old Parisian Haussmann-style apartment, herringbone parquet, ornate cornice, tall French windows with wrought iron guardrail, closed cardboard moving boxes stacked near the window, a rolled rug, a blurred silhouette seen from behind carrying a box in the doorway, morning light, evoking an unplanned move for a job transfer. 3:2 landscape composition. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with discreet touches of blue (a blue tape roll on a box), moderate depth of field, sober and reassuring mood, no excessive saturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

---

## 16. Est-ce le bon moment pour vendre sa maison en 2026 ?

_publication le jeudi 19 novembre_ · mot-clé : bon moment pour vendre sa maison

### Couverture

- **Fichier** : `public/images/blog/bon-moment-vendre-maison-2026/cover.webp` - 1200 × 630, ratio 1,91:1
- **Usage** : en-tête de l'article et vignette
- **Texte alternatif (déjà publié)** : Maison individuelle française avec jardin en automne, prête à être mise en vente

```text
Wide street view of a typical French suburban pavilion with light ochre render, terracotta Roman tile roof and painted shutters, front garden behind a trimmed hedge, autumn leaves on the lawn, a small unbadged European hatchback in the driveway, clear October sky, golden light, the house looking ready to be put on the market. Wide 1.91:1 landscape, subject centered with breathing room on the sides so it survives a square crop. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with discreet touches of blue (a clear blue sky and shutters), moderate depth of field, sober and reassuring mood, no excessive saturation. No text, no letters, no logos, no watermarks, no brand names. --ar 191:100
```

### Image 1

- **Fichier** : `public/images/blog/bon-moment-vendre-maison-2026/image-1.webp` - 1200 × 800, ratio 3:2
- **Section** : Pourquoi les taux pèsent sur le prix de votre maison
- **Légende affichée** : Quand le taux passe de 3,4 % à 4 %, un ménage qui rembourse 1 000 € par mois sur vingt ans perd environ 9 000 € de budget.
- **Texte alternatif (déjà publié)** : Couple étudiant une simulation de crédit immobilier avec un conseiller bancaire

```text
Inside a sober French bank branch office, a couple seen from three-quarter back seated at a desk facing an advisor whose face is cropped out of frame, the advisor's hand pointing at a loan simulation printout with blurred figures, a monitor turned away, light wood and grey furniture, neutral daylight, conveying reduced borrowing capacity as rates rise. 3:2 landscape composition. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with discreet touches of blue (a blue folder on the desk), moderate depth of field, sober and reassuring mood, no excessive saturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

### Image 2

- **Fichier** : `public/images/blog/bon-moment-vendre-maison-2026/image-2.webp` - 1200 × 800, ratio 3:2
- **Section** : Le calendrier dans l'année : printemps ou automne ?
- **Légende affichée** : À l'automne, les acheteurs encore en recherche ont souvent un projet mûr, face à moins de maisons concurrentes en vente.
- **Texte alternatif (déjà publié)** : Jardin d'une maison française en automne avec arbres aux feuilles dorées

```text
Back garden of a French house in late October, neatly mowed lawn, an old apple tree with yellow leaves, a stone-slab terrace with a metal bistro table and two chairs, low raking evening sun through the branches, a few fallen apples, calm and welcoming, showing a house that still presents well in autumn. 3:2 landscape composition. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with discreet touches of blue (a blue-grey painted garden chair), moderate depth of field, sober and reassuring mood, no excessive saturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

---

## 17. Comment rédiger une annonce immobilière efficace ?

_publication le samedi 21 novembre_ · mot-clé : rédiger une annonce immobilière

### Couverture

- **Fichier** : `public/images/blog/rediger-annonce-immobiliere-efficace/cover.webp` - 1200 × 630, ratio 1,91:1
- **Usage** : en-tête de l'article et vignette
- **Texte alternatif (déjà publié)** : Personne rédigeant une annonce immobilière sur un ordinateur portable dans un séjour

```text
Close-up of hands typing on a laptop on a wooden living room table in a bright French apartment, screen angled away and unreadable, an open notebook with blurred handwritten notes and a printed floor plan beside it, a pencil, softly blurred background of a sofa and tall window, focused writing atmosphere. Wide 1.91:1 landscape, subject centered with breathing room on the sides so it survives a square crop. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with discreet touches of blue (a blue notebook cover), moderate depth of field, sober and reassuring mood, no excessive saturation. No text, no letters, no logos, no watermarks, no brand names. --ar 191:100
```

### Image 1

- **Fichier** : `public/images/blog/rediger-annonce-immobiliere-efficace/image-1.webp` - 1200 × 800, ratio 3:2
- **Section** : Le titre et la première photo font le tri à votre place
- **Légende affichée** : Sur un portail, l'acheteur décide de cliquer à partir d'une vignette, d'un prix et de quelques mots seulement.
- **Texte alternatif (déjà publié)** : Smartphone affichant une liste d'annonces immobilières avec vignettes photo

```text
Tight shot of a hand holding a smartphone, the screen showing a scrolling list of house listing cards with photo thumbnails of French homes and blurred unreadable lines, thumb mid-scroll, background a softly blurred linen sofa and cushion, warm evening lamp light, capturing the split-second choice of which listing to open. 3:2 landscape composition. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with discreet touches of blue (a blue cushion in the background), moderate depth of field, sober and reassuring mood, no excessive saturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

### Image 2

- **Fichier** : `public/images/blog/rediger-annonce-immobiliere-efficace/image-2.webp` - 1200 × 800, ratio 3:2
- **Section** : Photos et visuels retouchés : ce qui a changé en 2026
- **Légende affichée** : Lumière du jour, volets relevés, appareil à hauteur de poitrine : douze à vingt clichés bien faits suffisent.
- **Texte alternatif (déjà publié)** : Appareil photo sur trépied dans un séjour lumineux aux volets ouverts

```text
A DSLR camera on a tripod in the foreground, seen from behind at chest height, framing a tidy, bright French living room with light oak parquet, tall windows wide open and shutters folded back, no personal clutter, a single plant, abundant daylight, illustrating careful listing photography. 3:2 landscape composition. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with discreet touches of blue (shutters painted pale blue), moderate depth of field, sober and reassuring mood, no excessive saturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

---

## 18. Home staging : comment valoriser son bien pour vendre plus rapidement ?

_publication le lundi 23 novembre_ · mot-clé : home staging

### Couverture

- **Fichier** : `public/images/blog/home-staging-valoriser-bien/cover.webp` - 1200 × 630, ratio 1,91:1
- **Usage** : en-tête de l'article et vignette
- **Texte alternatif (déjà publié)** : Séjour épuré et lumineux préparé en home staging avant la vente d'une maison

```text
Decluttered, depersonalized living room of a French house staged for sale: a light linen sofa facing a tall window, folded throw, one large green plant, a clear low coffee table, bare white walls, oak floor, nothing personal, soft natural light, airy and easy to project oneself into, clearly readable as a thumbnail. Wide 1.91:1 landscape, subject centered with breathing room on the sides so it survives a square crop. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with discreet touches of blue (a soft blue throw blanket), moderate depth of field, sober and reassuring mood, no excessive saturation. No text, no letters, no logos, no watermarks, no brand names. --ar 191:100
```

### Image 1

- **Fichier** : `public/images/blog/home-staging-valoriser-bien/image-1.webp` - 1200 × 800, ratio 3:2
- **Section** : Les pièces qui comptent, par ordre de priorité
- **Légende affichée** : Séjour, cuisine et chambre principale ouvrent l'annonce : ce sont les trois pièces à préparer en premier.
- **Texte alternatif (déjà publié)** : Cuisine aux plans de travail dégagés et propres, préparée pour les visites

```text
A simple, slightly dated but spotless French kitchen, beige tiled splashback, laminate worktops almost entirely clear except a bowl of fresh fruit, appliances put away, gleaming sink, a small window with side light, an orderly kitchen ready for viewings and listing photos. 3:2 landscape composition. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with discreet touches of blue (a blue tea towel on the oven handle), moderate depth of field, sober and reassuring mood, no excessive saturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

### Image 2

- **Fichier** : `public/images/blog/home-staging-valoriser-bien/image-2.webp` - 1200 × 800, ratio 3:2
- **Section** : Les travaux : où s'arrêter
- **Légende affichée** : Repeindre les murs marqués coûte peu ; pour une cuisine ou une salle de bains, un devis d'artisan à montrer suffit.
- **Texte alternatif (déjà publié)** : Rouleau de peinture blanche sur un mur fraîchement repeint dans une pièce vide

```text
Empty bedroom in a French house with a freshly repainted off-white wall, a paint roller resting on a tray of white paint on a canvas drop cloth on the floor, masking tape on the skirting board, a closed paint tin, soft daylight, showing an inexpensive visible fix rather than heavy renovation. 3:2 landscape composition. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with discreet touches of blue (blue masking tape), moderate depth of field, sober and reassuring mood, no excessive saturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

---

## 19. Maison qui ne se vend pas : quelles erreurs éviter ?

_publication le mercredi 25 novembre_ · mot-clé : maison qui ne se vend pas

### Couverture

- **Fichier** : `public/images/blog/maison-qui-ne-se-vend-pas-erreurs/cover.webp` - 1200 × 630, ratio 1,91:1
- **Usage** : en-tête de l'article et vignette
- **Texte alternatif (déjà publié)** : Maison française avec un panneau à vendre défraîchi, en vente depuis plusieurs mois

```text
Medium street shot of a French detached house in a residential lotissement, cream render, closed roller shutters, a slightly sun-faded blank for-sale panel tied to the green wire fence, some fallen leaves on the path, grey autumn sky, a quiet waiting mood without drama, house clearly readable in the center. Wide 1.91:1 landscape, subject centered with breathing room on the sides so it survives a square crop. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with discreet touches of blue (faded blue-grey shutters), moderate depth of field, sober and reassuring mood, no excessive saturation. No text, no letters, no logos, no watermarks, no brand names. --ar 191:100
```

### Image 1

- **Fichier** : `public/images/blog/maison-qui-ne-se-vend-pas-erreurs/image-1.webp` - 1200 × 800, ratio 3:2
- **Section** : Erreur n° 1 : un prix fixé sur ce que l'on espère
- **Légende affichée** : Un prix calé sur ses propres besoins plutôt que sur les ventes comparables bloque la plupart des dossiers.
- **Texte alternatif (déjà publié)** : Propriétaire comparant des annonces de maisons et des prix de vente sur papier

```text
Close view of a dining table where an owner's hands, face out of frame, compare several printed house listing sheets with blurred photos and highlighted price zones, a pen, a mug, a desk lamp casting warm pooled light in the evening, a thoughtful mood about setting price against comparable sales. 3:2 landscape composition. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with discreet touches of blue (a blue highlighter), moderate depth of field, sober and reassuring mood, no excessive saturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

### Image 2

- **Fichier** : `public/images/blog/maison-qui-ne-se-vend-pas-erreurs/image-2.webp` - 1200 × 800, ratio 3:2
- **Section** : Erreur n° 5 : des visites qui ne convertissent pas
- **Légende affichée** : Deux ou trois remarques identiques recueillies après les visites désignent presque toujours ce qui bloque la vente.
- **Texte alternatif (déjà publié)** : Visiteurs découvrant le séjour d'une maison lors d'une visite immobilière

```text
A couple seen from behind stepping into the living room of a French house during a viewing, pausing and looking around, a female estate agent slightly behind and out of focus holding a folder, faces not visible, furnished room with tall windows, natural light, capturing the on-site impression that decides an offer. 3:2 landscape composition. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with discreet touches of blue (the agent's blue folder), moderate depth of field, sober and reassuring mood, no excessive saturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

---

## 20. Comment gérer plusieurs offres d'achat sur son bien immobilier ?

_publication le vendredi 27 novembre_ · mot-clé : gérer plusieurs offres d'achat

### Couverture

- **Fichier** : `public/images/blog/gerer-plusieurs-offres-achat/cover.webp` - 1200 × 630, ratio 1,91:1
- **Usage** : en-tête de l'article et vignette
- **Texte alternatif (déjà publié)** : Vendeur examinant plusieurs offres d'achat écrites pour son bien immobilier

```text
Three handwritten purchase offer letters laid side by side on a wooden table, seen at a low angle so writing stays blurred, reading glasses and a fountain pen between them, a seller's hands resting on the middle one, face out of frame, calm natural light, a serious moment of choice, layout simple and readable at thumbnail size. Wide 1.91:1 landscape, subject centered with breathing room on the sides so it survives a square crop. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with discreet touches of blue (a blue pen), moderate depth of field, sober and reassuring mood, no excessive saturation. No text, no letters, no logos, no watermarks, no brand names. --ar 191:100
```

### Image 1

- **Fichier** : `public/images/blog/gerer-plusieurs-offres-achat/image-1.webp` - 1200 × 800, ratio 3:2
- **Section** : Comparer plusieurs offres d'achat : le prix n'est qu'une ligne
- **Légende affichée** : Une offre plus élevée appuyée sur une simple simulation de prêt peut coûter bien plus qu'elle ne rapporte si elle échoue.
- **Texte alternatif (déjà publié)** : Offres d'achat et justificatifs de financement classés sur une table pour comparaison

```text
Overhead view of three open cardboard document folders on a desk, each holding a purchase offer and bank financing letters with blurred lines, a different colored sticky note on each folder, a yellow highlighter, a paperclip pile, soft diffuse light, a methodical comparison beyond the price line. 3:2 landscape composition. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with discreet touches of blue (one blue sticky note), moderate depth of field, sober and reassuring mood, no excessive saturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

### Image 2

- **Fichier** : `public/images/blog/gerer-plusieurs-offres-achat/image-2.webp` - 1200 × 800, ratio 3:2
- **Section** : Gérer plusieurs offres d'achat : répondre proprement à chacun
- **Légende affichée** : Une fois l'avant-contrat signé, l'acquéreur garde dix jours pour se rétracter : ne fermez pas trop vite les autres pistes.
- **Texte alternatif (déjà publié)** : Signature d'un avant-contrat de vente immobilière dans une étude notariale

```text
Close-up of a hand signing a preliminary sale contract with a fountain pen on a polished wooden desk in a traditional French notary office, open legal folder, document seen at an angle so nothing is readable, a brass desk lamp and leather blotter, faces out of frame, warm light. 3:2 landscape composition. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with discreet touches of blue (a blue ink fountain pen), moderate depth of field, sober and reassuring mood, no excessive saturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

---

## 21. Quels diagnostics immobiliers sont obligatoires pour vendre en 2026 ?

_publication le dimanche 29 novembre_ · mot-clé : diagnostics immobiliers obligatoires

### Couverture

- **Fichier** : `public/images/blog/diagnostics-immobiliers-obligatoires-vente-2026/cover.webp` - 1200 × 630, ratio 1,91:1
- **Usage** : en-tête de l'article et vignette
- **Texte alternatif (déjà publié)** : Diagnostiqueur immobilier réalisant les diagnostics obligatoires dans une maison avant la vente

```text
A property diagnostician seen from behind, tablet in hand, inspecting the living room of an old French stone house with exposed beams, terracotta tile floor and a cast-iron radiator, a laser distance meter on the table, natural light, professional and calm, clearly readable figure centered in the frame. Wide 1.91:1 landscape, subject centered with breathing room on the sides so it survives a square crop. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with discreet touches of blue (the inspector's blue work jacket), moderate depth of field, sober and reassuring mood, no excessive saturation. No text, no letters, no logos, no watermarks, no brand names. --ar 191:100
```

### Image 1

- **Fichier** : `public/images/blog/diagnostics-immobiliers-obligatoires-vente-2026/image-1.webp` - 1200 × 800, ratio 3:2
- **Section** : Le dossier de diagnostic technique : le principe
- **Légende affichée** : Hormis l'état des risques, que le vendeur peut remplir lui-même, chaque diagnostic exige un professionnel certifié.
- **Texte alternatif (déjà publié)** : Diagnostiqueur contrôlant le tableau électrique d'une maison lors d'un diagnostic

```text
Tight close-up of a certified technician's gloved hands holding an electrical tester against an old domestic French electrical panel with circuit breakers and a grey meter, in a whitewashed cellier utility room, overhead ceiling light, faces out of frame, conveying a professional diagnostic. 3:2 landscape composition. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with discreet touches of blue (a blue tester body), moderate depth of field, sober and reassuring mood, no excessive saturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

### Image 2

- **Fichier** : `public/images/blog/diagnostics-immobiliers-obligatoires-vente-2026/image-2.webp` - 1200 × 800, ratio 3:2
- **Section** : État des risques : la nouvelle carte des argiles
- **Légende affichée** : Depuis juillet 2026, la carte des argiles classe 55 % de la métropole en exposition moyenne ou forte.
- **Texte alternatif (déjà publié)** : Fissure en escalier sur la façade d'une maison liée au retrait-gonflement des argiles

```text
Rendered facade of a French single-storey house showing a stair-step crack running diagonally from the corner of a window down the wall, dry, cracked clay soil at the foot of the wall, a small flowerbed, low raking summer light highlighting the fissure, documentary and calm, illustrating clay shrink-swell risk. 3:2 landscape composition. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with discreet touches of blue (a pale blue window shutter), moderate depth of field, sober and reassuring mood, no excessive saturation. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

---

## 22. Peut-on vendre une maison avec des travaux non déclarés ?

_publication le mardi 1 décembre_ · mot-clé : vendre maison travaux non déclarés

### Couverture

- **Fichier** : `public/images/blog/vendre-maison-travaux-non-declares/cover.webp` - 1200 × 630, ratio 1,91:1
- **Usage** : en-tête de l'article et vignette
- **Texte alternatif (déjà publié)** : Maison française avec véranda ajoutée, un cas typique de travaux non déclarés avant une vente

```text
A typical 1980s French suburban pavillon in a provincial housing estate, pale rendered walls, mechanical terracotta roof tiles, with an aluminium-framed glass veranda visibly added onto the side, slightly different in style from the original house, neat lawn and low hedge in front. Wide 1.91:1 landscape, house centered with breathing room on the sides so it survives a square crop, eye-level view, late afternoon light. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with a discreet touch of blue in the clear sky and veranda reflections, moderate depth of field, sober and reassuring mood, no excessive saturation. No people. No text, no letters, no logos, no watermarks, no brand names. --ar 191:100
```

### Image 1

- **Fichier** : `public/images/blog/vendre-maison-travaux-non-declares/image-1.webp` - 1200 × 800, ratio 3:2
- **Section** : Le volet fiscal : la taxe foncière à rattraper
- **Légende affichée** : Les piscines sont les constructions les plus souvent repérées par l'analyse des images aériennes, avec un rappel de taxe foncière qui peut couvrir plusieurs années.
- **Texte alternatif (déjà publié)** : Vue aérienne d'un lotissement français avec plusieurs piscines privées dans les jardins

```text
High oblique aerial drone view over a residential subdivision in southern France, near Montpellier or Toulouse, rows of pavillons with Roman terracotta tile roofs, fenced private gardens, olive trees and cypress hedges, several rectangular and kidney-shaped turquoise swimming pools clearly visible in the backyards, the kind of detail spotted by tax authorities on aerial imagery. 3:2 landscape, pools distributed across the frame, midday sun with short shadows. Realistic editorial photography, full-frame 35 mm sensor, soft natural light, warm neutral tones with the pools as the discreet blue accents, moderate depth of field, sober and reassuring look, no excessive saturation. No visible people. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

### Image 2

- **Fichier** : `public/images/blog/vendre-maison-travaux-non-declares/image-2.webp` - 1200 × 800, ratio 3:2
- **Section** : Vendre une maison avec des travaux non déclarés : ce qui se passe chez le notaire
- **Légende affichée** : Le notaire compare l'état réel du bien aux autorisations obtenues : déclarer clairement l'irrégularité dans l'acte protège mieux le vendeur que le silence.
- **Texte alternatif (déjà publié)** : Plans de maison, permis de construire et documents d'urbanisme posés sur un bureau de notaire

```text
Top-down close shot of an old oak desk in a French notary office, unfolded architectural house plans showing a floor layout, a beige cardboard urban planning file, a stapled building permit form and a cadastral extract seen at an angle and out of focus, a fountain pen resting across the plans. 3:2 landscape, documents filling the frame diagonally, window light from the left. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with a discreet touch of blue from a cardboard folder, moderate depth of field, sober and reassuring look, no excessive saturation. No faces. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

---

## 23. Acheter une maison avant de vendre la sienne : quelles solutions ?

_publication le jeudi 3 décembre_ · mot-clé : acheter avant de vendre

### Couverture

- **Fichier** : `public/images/blog/acheter-avant-de-vendre-solutions/cover.webp` - 1200 × 630, ratio 1,91:1
- **Usage** : en-tête de l'article et vignette
- **Texte alternatif (déjà publié)** : Maison française avec panneau à vendre, propriétaires préparant l'achat d'un nouveau logement

```text
A French detached house in light stone render with grey slate-style roof and blue-grey painted shutters, open wrought-iron gate, a blank white for-sale panel hung on the low garden fence, and in the soft blurred foreground a hand holding a ring of keys. Wide 1.91:1 landscape, house and sign centered with breathing room on the sides so it survives a square crop, early morning light, optimistic mood. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with discreet blue on the shutters, moderate depth of field, sober and reassuring, no excessive saturation. No faces. No text, no letters, no logos, no watermarks, no brand names. --ar 191:100
```

### Image 1

- **Fichier** : `public/images/blog/acheter-avant-de-vendre-solutions/image-1.webp` - 1200 × 800, ratio 3:2
- **Section** : Le prêt relais : la solution la plus courante pour acheter avant de vendre
- **Légende affichée** : La banque avance en général 50 à 80 % de la valeur estimée du bien à vendre, moins le capital restant dû : une estimation crédible conditionne donc le montant obtenu.
- **Texte alternatif (déjà publié)** : Couple en rendez-vous avec un conseiller bancaire pour étudier un prêt relais

```text
Inside a sober French bank branch office, a couple seen from behind, shoulders and hair only, seated across a light wood desk from a bank advisor whose face is cropped out of frame, loan simulation papers blurred on the desk, a calculator, a pen and a closed folder. 3:2 landscape, over-the-shoulder framing on the paperwork between them. Realistic editorial photography, full-frame 35 mm camera, soft natural window light, warm neutral tones with a discreet touch of blue in the advisor's folder, moderate depth of field, sober and reassuring, no excessive saturation. No recognizable faces, no readable documents. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

### Image 2

- **Fichier** : `public/images/blog/acheter-avant-de-vendre-solutions/image-2.webp` - 1200 × 800, ratio 3:2
- **Section** : Vendre d'abord, puis acheter : l'option sans crédit relais
- **Légende affichée** : Rester quelques semaines dans les lieux après la vente se négocie dès l'offre, avec une convention qui fixe une date de départ et une pénalité de retard.
- **Texte alternatif (déjà publié)** : Cartons de déménagement empilés dans le salon d'une maison qui vient d'être vendue

```text
Living room of a French house in the middle of a move, sealed brown cardboard moving boxes stacked beside tall French windows with white wooden frames, oak herringbone parquet, nearly bare walls showing pale marks where frames used to hang, the household still living there for a few final weeks. 3:2 landscape, boxes in the left third, window light flooding in. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with a discreet blue accent from a roll of packing tape, moderate depth of field, calm transitional mood, no excessive saturation. No people. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

---

## 24. Frais de notaire : qui les paie et comment sont-ils calculés ?

_publication le samedi 5 décembre_ · mot-clé : frais de notaire

### Couverture

- **Fichier** : `public/images/blog/frais-de-notaire-calcul/cover.webp` - 1200 × 630, ratio 1,91:1
- **Usage** : en-tête de l'article et vignette
- **Texte alternatif (déjà publié)** : Bureau de notaire avec acte de vente, calculatrice et clés pour estimer les frais d'achat

```text
Close view of a French notary's walnut desk with a thick bound property sale deed lying open and out of focus, a calculator beside it, a black fountain pen and a ring of house keys placed on top. Wide 1.91:1 landscape, objects grouped centrally with breathing room on the sides so it survives a square crop. Realistic editorial photography, full-frame 35 mm camera, soft warm natural light, warm neutral tones with a discreet blue key tag, moderate depth of field, serious and reassuring mood, no excessive saturation. No faces, no readable writing. No text, no letters, no logos, no watermarks, no brand names. --ar 191:100
```

### Image 1

- **Fichier** : `public/images/blog/frais-de-notaire-calcul/image-1.webp` - 1200 × 800, ratio 3:2
- **Section** : Qui paie les frais de notaire ?
- **Légende affichée** : C'est l'acheteur qui règle les frais d'acquisition le jour de l'acte, soit environ 23 000 € à financer en plus du prix pour un bien ancien à 300 000 €.
- **Texte alternatif (déjà publié)** : Signature de l'acte de vente chez le notaire par un acquéreur

```text
Tight shot of a buyer's hand signing the final page of an authentic property deed on a notary's desk in France, ballpoint pen pressed on paper, the document viewed at a low angle so the writing is blurred, and a second person in a dark suit softly out of focus across the desk, face outside the frame. 3:2 landscape, hand in the left third. Realistic editorial photography, full-frame 35 mm camera, soft natural window light, warm neutral tones with a discreet blue shirt cuff, moderate depth of field, sober and reassuring, no excessive saturation. No recognizable faces, no readable text on paper. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

### Image 2

- **Fichier** : `public/images/blog/frais-de-notaire-calcul/image-2.webp` - 1200 × 800, ratio 3:2
- **Section** : Les frais de notaire dans le neuf
- **Légende affichée** : Dans le neuf, la taxe de publicité foncière réduite remplace les droits de mutation : les frais tombent autour de 2 à 3 % du prix, contre 7 à 8 % dans l'ancien.
- **Texte alternatif (déjà publié)** : Petite résidence neuve avec balcons dans une ville française

```text
A small newly built residence in a French town, four storeys, light cream render with timber cladding accents, glass and metal balconies, flat roof, ground-floor bike shelter, freshly planted young trees and lawn strips still visibly new, a Renault parked along the street, a modern new-build apartment just delivered to its first owners. 3:2 landscape, three-quarter view from the pavement, morning light. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with discreet blue from the clear sky and window reflections, moderate depth of field, sober and reassuring, no excessive saturation. No people. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

---

## 25. Impôt sur la plus-value immobilière : calcul et exonérations en 2026

_publication le lundi 7 décembre_ · mot-clé : impôt sur la plus-value immobilière

### Couverture

- **Fichier** : `public/images/blog/impot-plus-value-immobiliere/cover.webp` - 1200 × 630, ratio 1,91:1
- **Usage** : en-tête de l'article et vignette
- **Texte alternatif (déjà publié)** : Maison de vacances en pierre en France, résidence secondaire concernée par l'impôt sur la plus-value

```text
A French stone holiday house in a village of the Dordogne, honey-coloured limestone walls, old brown tile roof, painted blue wooden shutters, a small terrace with a wooden table under a vine pergola and a lavender-edged garden, clearly a second home now being sold. Wide 1.91:1 landscape, house centered with breathing room on the sides so it survives a square crop, golden summer light at the end of the day. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with the blue shutters as the discreet accent, moderate depth of field, sober and reassuring mood, no excessive saturation. No people. No text, no letters, no logos, no watermarks, no brand names. --ar 191:100
```

### Image 1

- **Fichier** : `public/images/blog/impot-plus-value-immobiliere/image-1.webp` - 1200 × 800, ratio 3:2
- **Section** : Calculer la plus-value brute : le prix d'achat se corrige
- **Légende affichée** : Après cinq ans de détention, le forfait travaux de 15 % du prix d'achat dépasse souvent le total des factures conservées.
- **Texte alternatif (déjà publié)** : Factures de travaux et dossier de rénovation rangés pour calculer une plus-value immobilière

```text
Close shot of an open ring binder full of craftsmen's invoices and receipts kept over the years, papers seen at an angle and blurred, resting on a dust-covered trestle table in a French house under renovation, next to a yellow tape measure, a glazed ceramic tile sample and a carpenter's pencil, bare plaster walls and a stepladder softly blurred behind. 3:2 landscape, binder in the foreground right. Realistic editorial photography, full-frame 35 mm camera, soft natural light from a window, warm neutral tones with a discreet blue binder divider, moderate depth of field, sober and reassuring, no excessive saturation. No people, no readable documents. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

### Image 2

- **Fichier** : `public/images/blog/impot-plus-value-immobiliere/image-2.webp` - 1200 × 800, ratio 3:2
- **Section** : Les abattements pour durée de détention
- **Légende affichée** : Après 22 ans de détention, l'impôt sur le revenu disparaît, mais il faut attendre 30 ans pour échapper aussi aux prélèvements sociaux.
- **Texte alternatif (déjà publié)** : Ancienne maison familiale entourée de son jardin, détenue depuis de longues années

```text
An old French family house in grey granite stone in Brittany, weathered slate roof patched with moss, ivy climbing one gable wall, a large old oak tree spreading over a rambling garden, a moss-covered stone wall and wooden gate, the feeling of a home owned for decades and passed through generations. 3:2 landscape, house slightly off-center with the tree framing it, warm autumn light with fallen leaves. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with discreet faded blue paint on the gate, moderate depth of field, sober and reassuring, no excessive saturation. No people. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

---

## 26. Comment trouver une maison à vendre sans agence ?

_publication le mercredi 9 décembre_ · mot-clé : maison à vendre sans agence

### Couverture

- **Fichier** : `public/images/blog/trouver-maison-a-vendre-sans-agence/cover.webp` - 1200 × 630, ratio 1,91:1
- **Usage** : en-tête de l'article et vignette
- **Texte alternatif (déjà publié)** : Maison de campagne française avec jardin, mise en vente directement par son propriétaire

```text
A traditional French longère in the countryside of Normandy or the Loire, long low stone house with a slate roof, a walled garden behind an old painted iron gate, a simple blank handmade for-sale board tied to the gate as if put up by the owner himself, fields and hedgerows behind. Wide 1.91:1 landscape, house and gate centered with breathing room on the sides so it survives a square crop, fresh spring light. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with a discreet blue painted gate, moderate depth of field, calm authentic mood, sober and reassuring, no excessive saturation. No people. No text, no letters, no logos, no watermarks, no brand names. --ar 191:100
```

### Image 1

- **Fichier** : `public/images/blog/trouver-maison-a-vendre-sans-agence/image-1.webp` - 1200 × 800, ratio 3:2
- **Section** : Le terrain : bouche-à-oreille et prospection directe
- **Légende affichée** : Dans un village, la boulangerie, le café ou la mairie apprennent souvent qu'une maison va se vendre avant qu'elle ne soit publiée nulle part.
- **Texte alternatif (déjà publié)** : Rue de village français avec maisons anciennes et commerces de proximité

```text
Main street of a small French village in the morning, old stone houses with shutters, a bakery with baguettes in the window and a café terrace with a few bistro chairs at street level, the town hall with its tricolour flag in the distance, two or three passers-by seen from behind far away, where news of a house for sale travels by word of mouth. 3:2 landscape, street perspective. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with discreet blue shutters, moderate depth of field, sober and reassuring local life atmosphere, no excessive saturation. No faces, no readable shop signs. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

### Image 2

- **Fichier** : `public/images/blog/trouver-maison-a-vendre-sans-agence/image-2.webp` - 1200 × 800, ratio 3:2
- **Section** : Maison à vendre sans agence : vérifier le prix
- **Légende affichée** : Comparer avec les ventes réellement signées évite que l'économie de commission soit absorbée par un prix de départ trop élevé.
- **Texte alternatif (déjà publié)** : Acheteur comparant des prix de vente sur un plan cadastral avant de faire une offre

```text
Top-down close shot of a home buyer's hands annotating a printed cadastral parcel map with a pencil, circling a few neighbouring parcels to compare with actual recorded sales, an open notebook with blurred figures and a calculator beside it, on a light wooden kitchen table in a French house, a coffee cup at the edge. 3:2 landscape, map filling the center. Realistic editorial photography, full-frame 35 mm camera, soft natural window light, warm neutral tones with a discreet blue pencil and notebook cover, moderate depth of field, sober and reassuring, no excessive saturation. No faces, no readable text or numbers. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

---

## 27. Quels sont les meilleurs sites immobiliers pour acheter ou vendre en France ?

_publication le vendredi 11 décembre_ · mot-clé : meilleurs sites immobiliers

### Couverture

- **Fichier** : `public/images/blog/meilleurs-sites-immobiliers-france/cover.webp` - 1200 × 630, ratio 1,91:1
- **Usage** : en-tête de l'article et vignette
- **Texte alternatif (déjà publié)** : Personne consultant des annonces immobilières sur smartphone dans un appartement français

```text
Hands holding a smartphone in the foreground, the screen showing a deliberately blurred generic grid of house and apartment photos with no recognizable app interface, symbolising browsing property listings online, and behind it a softly blurred Haussmann-style Parisian living room with tall windows, moulded ceiling, marble fireplace and herringbone parquet. Wide 1.91:1 landscape, phone centered with breathing room on the sides so it survives a square crop. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with a discreet blue cushion on the sofa, moderate depth of field, sober and reassuring, no excessive saturation. No faces. No text, no letters, no logos, no watermarks, no brand names. --ar 191:100
```

### Image 1

- **Fichier** : `public/images/blog/meilleurs-sites-immobiliers-france/image-1.webp` - 1200 × 800, ratio 3:2
- **Section** : Pour acheter : combiner trois sources
- **Légende affichée** : Aucun portail ne couvre tout le marché : un même bien peut apparaître trois fois via plusieurs agences, ou n'exister que sur un site de particuliers.
- **Texte alternatif (déjà publié)** : Acheteur comparant des annonces de maisons sur un ordinateur portable et un téléphone

```text
Low coffee table in a French apartment living room in the evening, an open laptop and a smartphone side by side, both screens showing blurred generic photos of houses with no recognizable website interface, the same house apparently appearing on both, an open notebook with a pen and handwritten blurred notes, only a person's hands visible typing on the laptop. 3:2 landscape, three-quarter view from the side. Realistic editorial photography, full-frame 35 mm camera, warm evening lamp light mixed with soft natural dusk light, warm neutral tones with a discreet blue notebook, moderate depth of field, sober and reassuring, no excessive saturation. No faces, no readable screens. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

### Image 2

- **Fichier** : `public/images/blog/meilleurs-sites-immobiliers-france/image-2.webp` - 1200 × 800, ratio 3:2
- **Section** : Pour vendre : la diffusion ne fait pas tout
- **Légende affichée** : Une annonce aux photos sombres perd des visites sur n'importe quel portail : la qualité des images pèse davantage que le choix du site.
- **Texte alternatif (déjà publié)** : Salon lumineux et rangé photographié pour une annonce immobilière

```text
Bright, tidy, depersonalized living room of a French house prepared for listing photos, light linen sofa, oak floor, white walls, large French windows opening onto a garden, a few plants, no clutter, seen wide-angle at eye level, with a camera on a tripod softly blurred in the foreground, showing that bright, well-shot images matter more than the website chosen. 3:2 landscape. Realistic editorial photography, full-frame 35 mm camera, abundant soft natural daylight, warm neutral tones with a discreet blue throw cushion, moderate depth of field, sober and reassuring, no excessive saturation. No people. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

---

## 28. Comment comparer les prix immobiliers et connaître les ventes réalisées ?

_publication le dimanche 13 décembre_ · mot-clé : comparer les prix immobiliers

### Couverture

- **Fichier** : `public/images/blog/comparer-prix-immobiliers-ventes-realisees/cover.webp` - 1200 × 630, ratio 1,91:1
- **Usage** : en-tête de l'article et vignette
- **Texte alternatif (déjà publié)** : Rue de maisons françaises dans un bourg, pour comparer les prix des ventes réalisées

```text
A residential street in a small French bourg, a row of similar detached and semi-detached houses in pale render and stone with tiled roofs, low walls and gates, receding in perspective along the pavement, inviting comparison between neighbouring homes, a Peugeot parked in a driveway. Wide 1.91:1 landscape, street vanishing point centered with breathing room on the sides so it survives a square crop, late morning light. Realistic editorial photography, full-frame 35 mm camera, soft natural light, warm neutral tones with discreet touches of blue on a few shutters and the sky, moderate depth of field, sober and reassuring, no excessive saturation. No people. No text, no letters, no logos, no watermarks, no brand names. --ar 191:100
```

### Image 1

- **Fichier** : `public/images/blog/comparer-prix-immobiliers-ventes-realisees/image-1.webp` - 1200 × 800, ratio 3:2
- **Section** : DVF, la base publique des ventes réalisées
- **Légende affichée** : Mise à jour en avril et en octobre, la base DVF ne garde que cinq années de ventes et ne couvre ni l'Alsace, ni la Moselle, ni Mayotte.
- **Texte alternatif (déjà publié)** : Plan cadastral imprimé montrant les parcelles d'un quartier résidentiel

```text
Top-down view of a printed French cadastral plan of a residential neighbourhood spread on a wooden table, thin parcel outlines and grey house footprints clearly visible, a few parcels highlighted with a translucent marker to locate recent recorded sales, a highlighter and reading glasses resting on the corner, papers slightly curled. 3:2 landscape, map filling the frame at a slight angle. Realistic editorial photography, full-frame 35 mm camera, soft natural window light, warm neutral tones with a discreet blue highlighter, moderate depth of field, sober and reassuring, no excessive saturation. No people, no readable labels or numbers. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```

### Image 2

- **Fichier** : `public/images/blog/comparer-prix-immobiliers-ventes-realisees/image-2.webp` - 1200 × 800, ratio 3:2
- **Section** : Les limites des données, et comment les compenser
- **Légende affichée** : À surface égale dans une même rue, l'état, le DPE ou le garage peuvent justifier jusqu'à 20 % d'écart de prix, ce qu'aucune base ne mesure.
- **Texte alternatif (déjà publié)** : Deux maisons voisines de même taille, l'une rénovée et l'autre à rafraîchir

```text
Two neighbouring French houses of the same size and shape side by side on a quiet street, the one on the left freshly renovated with clean cream render, new white windows and smart blue-grey shutters, the one on the right with cracked, greyish render, faded peeling wooden shutters and an old garage door, illustrating how condition creates a large price gap. 3:2 landscape, frontal straight-on view, both facades equally framed. Realistic editorial photography, full-frame 35 mm camera, soft diffuse daylight, warm neutral tones with the renovated blue-grey shutters as the discreet accent, moderate depth of field, sober and reassuring, no excessive saturation. No people. No text, no letters, no logos, no watermarks, no brand names. --ar 3:2
```
