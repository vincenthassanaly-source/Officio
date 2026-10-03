# Rapport de session — Conditions d'éligibilité sur la page des entretiens (2026-10-03)

## Ce qui a été fait

Un encadré « Conditions d'éligibilité » en tête de la page de chaque type d'entretien, au-dessus des onglets,
mis en place pour le **BPM** et les **opioïdes**.

- **Affichage** : déplié par défaut, un tap sur le titre le replie (état non mémorisé), un critère par puce.
  Sans texte, aucune carte : les six autres types (AVK, AOD, asthme, anticancéreux oraux, femme enceinte,
  prévention) restent inchangés.
- **Modification** : crayon sur l'encadré, champ de texte sur place, un critère par ligne (les puces saisies à la
  main `-`, `•`, `*` sont retirées), Enregistrer / Annuler. Affichage immédiat, retour à l'ancien texte si
  l'envoi échoue. Modifiable par tout membre de l'officine (même règle que les items et les documents).
  Un texte vidé supprime l'encadré.
- **Ajouter un texte à un autre type** : un lien discret « Ajouter les conditions d'éligibilité » apparaît dans
  le **mode Édition** des types à script ; sur les types à fiche (BPM, opioïdes), il apparaît si leur texte a été
  supprimé.
- **Base** : [`migration-eligibilite-entretiens-2026-10-03.sql`](migration-eligibilite-entretiens-2026-10-03.sql), à
  exécuter dans l'éditeur SQL de Supabase (projet `officio`), en une transaction :
  - colonne `types_entretien.eligibilite` (texte, 2000 caractères au plus) ;
  - fonction `modifier_eligibilite_type_entretien()` sur le modèle de `renommer_type_entretien()` (réservée aux
    membres de l'officine du type) ; exécution retirée à `public` et `anon`, accordée à `authenticated` ;
  - textes de départ pour le BPM et les opioïdes (les deux officines).
- **Côté serveur** : le texte reçu est renormalisé et borné (15 critères, 2000 caractères) avant l'appel SQL.

## Textes de départ (à recouper)

Brouillon validé par Vincent. Sources : avenant 19 à la convention pharmaceutique et page USPO (BPM), Vidal
(opioïdes). Le site ameli.fr est bloqué depuis le conteneur : **les critères du BPM sont à recouper avec le
formulaire d'adhésion** de l'onglet Documents (les sources trouvées divergent sur les conditions d'ALD et de
75 ans, d'où la mention « depuis l'avenant 19 »).

- **BPM** : patient âgé de 65 ans ou plus (plus de condition d'ALD ni de seuil de 75 ans depuis l'avenant 19) ;
  patient polymédiqué : au moins 5 principes actifs prescrits ; traitement d'une durée d'au moins 6 mois.
- **Opioïdes** : patient adulte (plus de 18 ans) ; antalgique opioïde de palier II : tramadol, codéine,
  dihydrocodéine, poudre d'opium, nalbuphine ; au premier renouvellement : seconde délivrance dans les 12 mois
  suivant la première ; un seul entretien par patient sur une période de 12 mois.

À noter : la fiche opioïdes recommande d'évaluer le POMI avant chaque renouvellement, alors que l'entretien
conventionné n'est réalisable qu'une fois sur 12 mois. Les deux ne se contredisent pas (le POMI est une bonne
pratique, l'entretien est l'acte tarifé), mais l'encadré peut le préciser si l'équipe le souhaite.

## Vérifications

`tsc --noEmit` sans erreur, `eslint src` sans erreur (4 avertissements préexistants dans `switch-identite.tsx`),
`next build` réussi. Logique du texte testée (7 contrôles). Rendu vérifié sur une page de démonstration temporaire
(supprimée, non commitée) à 375 px : déplié, replié (carte pleine largeur, 56 px), édition, lien « Ajouter ».

Non vérifié : l'enregistrement réel (appel SQL connecté), faute de session Supabase dans le conteneur.

## Restauration

`drop function public.modifier_eligibilite_type_entretien(uuid, text) ;`
`alter table public.types_entretien drop column eligibilite ;`
