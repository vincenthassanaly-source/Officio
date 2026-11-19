# Rapport de session — Module « TROD angine » (2026-11-19)

## Ce qui a été fait

Un module séparé **TROD angine** (tuile sur l'accueil, entrée du panneau « Plus », route `/trod-angine`) qui
guide la prise en charge de l'angine à l'officine et **remplit les vrais PDF de l'Assurance Maladie** :

- le **compte rendu** « prise en charge à l'officine de l'angine » (2 pages), toujours produit ;
- le **bon de prise en charge** des antibiotiques délivrés sans ordonnance (page enfant ou adulte), produit
  seulement si un antibiotique est délivré. La page « cystite » du PDF n'est pas utilisée.

Les PDF d'origine sont dans `assets/trod-angine/` ; l'app y écrit le texte et dessine les croix (`pdf-lib`).
Le cadre du tampon et de la signature du bon reste vide (tampon physique).

## Parcours (6 écrans, enregistrement automatique, jamais bloquant)

1. **Patient** : nom, prénom, âge, poids, n° de sécu (15 chiffres), médecin traitant, date.
2. **Signes de gravité** (bloc 5) : T°, PAS, FC, FR saisies ; une mesure hors seuil coche le signe correspondant.
3. **Critères d'exclusion** (bloc 4) : 13 critères ; l'âge < 10 ans est coché d'après l'âge saisi.
4. **Résultat du TROD** : positif / négatif.
5. **Antibiotique** : allergie → molécules du bon, bon enfant / adulte (d'après l'âge, modifiable), dose calculée.
6. **Compte rendu et bon** : les 5 blocs pré-cochés (corrigeables), points divers, ouverture des deux PDF.

Pré-cochage : bloc 1 = TROD positif + antibiotique ; bloc 2 = TROD négatif ; bloc 3 = TROD renseigné ;
bloc 4 = au moins un critère ; bloc 5 = au moins un signe. Une correction manuelle l'emporte toujours.

## Fichiers

- Logique pure : `src/lib/trod-angine.ts` (+ `trod-angine.test.ts`, 18 tests).
- PDF : `src/lib/trod-angine-pdf.ts` (coordonnées relevées à 144 dpi), `trod-angine-fichier.ts` (nom de fichier).
- Données : `src/lib/data/trod-angine.ts`, `src/app/actions/trod-angine.ts`.
- Pages : `src/app/(app)/trod-angine/` (liste, saisie `[id]`, routes PDF `[id]/compte-rendu` et `[id]/bon`).
- UI : `src/components/trod-angine-liste.tsx`, `trod-angine-saisie.tsx`.
- Base : [`migration-trod-angine-2026-11-19.sql`](migration-trod-angine-2026-11-19.sql) (table `trod_angine_fiches`,
  RLS `est_membre`, pas de policy anonyme). **Non appliquée.**
- `next.config.ts` : `outputFileTracingIncludes` pour les PDF modèles, `no-store` sur `/trod-angine`.

## Points cliniques à valider par le pharmacien

- **Bon enfant / adulte** : seuil par défaut **15 ans** (`AGE_BON_ADULTE`), modifiable écran par écran. Le protocole
  ne le précise pas dans les documents fournis.
- **Doses** : mg/kg/j × poids, plafonnées à 2 g/j (amoxicilline) et 200 mg/j (cefpodoxime) comme sur le bon. Pour
  azithromycine, clarithromycine et josamycine, le bon ne plafonne pas : la dose est calculée telle quelle et
  signalée « > dose adulte, à vérifier » au-delà de la dose adulte du bon adulte.
- **Josamycine enfant** : le bon dit « 50 mg/kg/j en 1 prise » alors que l'adulte est en 2 prises. Recopié tel quel.
- **Azithromycine et josamycine** figurent sur le bon mais pas sur le compte rendu : elles sont notées dans
  « Points divers » du compte rendu.
- Aucun score de Mac Isaac/Centor (absent des documents).

## Vérifications

`tsc --noEmit`, `eslint` sur les fichiers touchés, `vitest` (55 tests) et `next build` passent. Rendu des PDF
vérifié visuellement sur des fiches de test (enfant, adulte, tous critères cochés, josamycine) : cases et textes
alignés sur les deux PDF.

**Non vérifié** : le parcours réel connecté (création, enregistrement, ouverture des PDF depuis l'écran), faute de
session Supabase dans le conteneur et de migration appliquée.

## À faire avant mise en ligne

1. Appliquer la migration SQL (éditeur SQL Supabase, projet `officio`) : sans elle, créer un TROD échoue.
2. Essayer un parcours complet sur téléphone (en particulier l'ouverture des PDF dans un nouvel onglet).
3. Données de santé nominatives (n° de sécu, poids, réponses) : mêmes réserves HDS que le BPM et les opioïdes.
