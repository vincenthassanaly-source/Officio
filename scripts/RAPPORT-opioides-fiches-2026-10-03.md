# Rapport de session — Fiches « Opioïdes » saisies pas à pas et imprimables (2026-10-03)

## Ce qui a été fait

Même principe que le BPM ([`RAPPORT-bpm-fiches-2026-10-03.md`](RAPPORT-bpm-fiches-2026-10-03.md)) : le script
« Entretien opioïdes » (24 étapes cochables) est remplacé par la fiche pharmacien « Accompagnement opioïdes »
de l'Assurance Maladie, saisie dans l'app et imprimable.

- **Base** : [`migration-opioides-fiches-2026-10-03.sql`](migration-opioides-fiches-2026-10-03.sql), à exécuter dans
  l'éditeur SQL de Supabase (projet `officio`), en une transaction.
  - `types_entretien.modele` accepte `'opioides'` (en plus de `'bpm'`) ; les types dont le nom commence par
    « Entretien opio » sont marqués.
  - Table **générique** `entretien_fiches` (modèle, nom, prénom, date, données JSON), RLS par
    `est_membre(officine_id)`, aucune policy anonyme. Prévue pour les futurs types à fiche : un nouveau modèle
    s'ajoute dans `lib/fiches.ts` et dans la contrainte `entretien_fiches_modele_valeurs`. Le BPM reste sur sa
    table `bpm_fiches` (les fiches déjà saisies ne sont pas touchées).
  - Ancien script copié dans `entretien_items_sauvegarde_opioides_20261003` avant suppression ; la facturation
    n'est pas touchée.
- **Écran de l'entretien** : l'onglet « Script » devient « Fiches » pour les types à fiche. Liste avec
  « Nouvelle fiche opioïdes », « Nouvel entretien » (copie l'identité, la prescription et le pharmacien d'une
  fiche existante, vide le reste : un patient revient à chaque renouvellement), imprimer, supprimer.
- **Saisie pas à pas** (`opioides-saisie.tsx`) : 15 écrans — rappels réglementaires (non imprimés), patient
  (nom, prénom, âge, coordonnées, date, pharmacien), prescription (médecin, molécule et dosage, posologie et
  durée, indication), 9 règles de bon usage à cocher sur un écran, POMI une question par écran, conclusions,
  alertes, actions. « Suivant » n'est jamais bloqué.
- **POMI** : chaque « Oui » vaut un point ; à 2 ou plus, alerte « risque actuel de mésusage » et le champ
  « Alertes » est prérempli (alerter le médecin prescripteur et le médecin traitant via MSS). Un texte réécrit
  à la main n'est jamais écrasé ; le texte se met à jour ou se retire si les réponses changent.
- **Impression** (`opioides-impression.tsx`) : deux feuilles A4 (identité et bon usage ; POMI et conclusions),
  noir sur blanc, cases dessinées, réponses POMI entourées, `window.print()`. Les rappels réglementaires ne sont
  pas imprimés. Les règles d'impression sont celles du BPM (`.bpm-impression`, `.bpm-feuille`).
- **Enregistrement automatique** : hook `lib/use-enregistrement-auto.ts` (même mécanique que le BPM : pause de
  frappe, changement d'étape, écran masqué, sortie ; écritures chaînées). Le BPM garde sa copie : non refactoré
  ici pour ne pas risquer une régression sur un écran non testé en réel — à unifier plus tard.
- **Sécurité des données** : la fiche reçue du client est reconstruite côté serveur par le validateur du modèle
  lu en base (pas fourni par le client) ; l'officine vient du type d'entretien lu sous RLS.

## Vérifications

`tsc --noEmit` sans erreur, `eslint src` sans erreur (4 avertissements préexistants dans `switch-identite.tsx`),
`next build` réussi. Logique pure testée (16 contrôles : seuil et alerte POMI, préremplissage, validation,
duplication, 15 étapes). Rendu vérifié sur une page de démonstration temporaire (supprimée, non commitée) : saisie
à 375 px sans défilement horizontal, PDF A4 de 2 pages.

Non vérifié : le parcours réel connecté (création, duplication, enregistrement, suppression), faute de session
Supabase dans le conteneur. À essayer une fois la migration appliquée.

## À savoir

- **Données de santé** : mêmes réserves que le BPM (données nominatives, hébergement non certifié HDS à notre
  connaissance). Une fiche se supprime depuis la liste (suppression définitive).
- **Pas de MSS ni de DMP.** Le titre de la fiche officielle mentionne le DMP ; l'app n'y dépose rien et n'envoie
  aucun message : l'alerte est un texte à reporter.
- **Saisie manuelle** : l'en-tête n'est pas relié à une fiche patient.
- **Avant la migration**, le code est sans effet (le type opioïdes garde son script) : aucun risque à le déployer
  avant ou après.

## Restauration

`insert into entretien_items select * from entretien_items_sauvegarde_opioides_20261003 ;`
puis `update types_entretien set modele = null where modele = 'opioides' ;`.
