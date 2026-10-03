# Rapport de session — Aides en bleu et surlignage dans la fiche opioïdes (2026-10-03)

## Ce qui a été fait

Deux améliorations de lecture dans la saisie pas à pas de la fiche « Opioïdes » (écran uniquement : le compte rendu
imprimé ne change pas).

- **Aides en bleu sous quatre règles de bon usage** : un bouton repliable (« Voir les effets et les signes
  d'alerte », « Voir les facteurs de risque », « Voir les signes de sevrage », « Voir des exemples ») ouvre, d'un
  tap, un encadré en indigo sur fond indigo pâle. Fermé par défaut, non mémorisé. Le bouton est hors de la case :
  l'ouvrir ne coche ni ne décoche la règle. Sur une règle cochée (carte déjà indigo pâle), l'encadré passe sur
  fond blanc pour rester visible.
  - **Règle 3** (effets indésirables et signes d'alerte de surdose) : effets fréquents ; signes d'alerte précoces
    de surdose, avec « Appeler le 15. ».
  - **Règle 4** (risque de surdose) : facteurs de risque.
  - **Règle 6** (démarche d'arrêt) : signes de sevrage.
  - **Règle 9** (besoin impérieux de consommer) : exemples.
- **Surlignage des termes importants sur l'écran des rappels réglementaires** : 15 termes en jaune de surligneur
  (le rouge reste réservé à l'alerte) — dates et durées (15 avril 2020, 12 semaines, 3 mois, 1er mars 2025),
  molécules concernées (tramadol ; codéine ou dihydrocodéine), ordonnances sécurisées, durée la plus courte
  possible, risque de convulsions, diminuée progressivement, plus petits conditionnements possibles, doses
  maximales de paracétamol (80 mg/kg/jour, 3 g par jour, 4 g par jour).
- **Fixe dans le code** (choix de Vincent) : textes, termes surlignés et règles dans `lib/opioides.ts` ; une mise
  à jour passe par un développement. **Aucune migration SQL.**
- Technique : les termes sont balisés `==terme==` dans les données et rendus en `<mark>` ; un marqueur sans
  fermant reste affiché tel quel. Convention documentée dans `DESIGN.md`.

## Sources des textes

Brouillon validé par Vincent. Signes de surdose et de sevrage : notices ANSM et Vidal (somnolence, pupilles
contractées, respiration lente ou irrégulière, lèvres ou ongles bleutés ; bâillements, anxiété, sueurs,
larmoiement, nez qui coule, diarrhée, douleurs articulaires…). Effets indésirables fréquents : notices des
opioïdes de palier II. **Besoin impérieux de consommer : aucune source directe** (l'article Vidal de référence
renvoie au POMI sans énumérer de signes) ; exemples rédigés d'après les critères classiques d'addictologie, à
valider cliniquement.

## Vérifications

`tsc --noEmit` sans erreur, `eslint src` sans erreur (4 avertissements préexistants dans `switch-identite.tsx`),
`next build` réussi. Logique testée (11 contrôles : découpage du surlignage, marqueur orphelin, aucun texte perdu,
marqueurs appariés, 15 termes, aides sous les règles 3, 4, 6 et 9). Rendu vérifié à 375 px sur une page de
démonstration temporaire (supprimée, non commitée) : surlignages des trois blocs de rappels, aides fermées puis
ouvertes, case de la règle inchangée à l'ouverture, aide lisible sur une carte cochée, pas de défilement
horizontal.

## À savoir

- La règle 5 (conduite) n'a pas d'aide ; elle peut en recevoir une (somnolence, ralentissement des réflexes…).
- L'urgence « Appeler le 15. » est en bleu, comme le reste de l'aide, à la demande de Vincent.
