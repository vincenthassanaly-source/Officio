# Rapport de session — Scripts d’entretien réécrits pour le pas à pas (2026-09-29)

## Ce qui a été fait

- Les scripts (section `methodologie`) des 8 types d’entretien de **Pharmacie Rome Village** ont été
  réécrits : phases par moment de l’entretien, étapes courtes, typées (question, explication, alerte).
- La section `facturation` n’a pas été touchée (comptes identiques avant/après).
- Migration : [`migration-scripts-entretiens-pas-a-pas-2026-09-29.sql`](migration-scripts-entretiens-pas-a-pas-2026-09-29.sql),
  appliquée via `apply_migration` (nom `scripts_entretiens_pas_a_pas`), en une transaction.
- L’ancien contenu (112 lignes) est conservé dans la table `entretien_items_sauvegarde_20260929`
  (RLS activée, aucune policy). Restauration : voir l’en-tête du fichier SQL.
- La seconde officine n’avait aucun item : elle n’a pas été modifiée.

## Résultat par type (étapes / phases / questions / explications / alertes)

| Type | Étapes | Phases | Q | E | A |
|---|---|---|---|---|---|
| Entretien AVK | 41 | 10 | 15 | 12 | 5 |
| Entretien AOD | 28 | 10 | 11 | 8 | 1 |
| Entretien asthme | 27 | 8 | 10 | 6 | 1 |
| Anticancéreux oraux | 21 | 6 | 9 | 4 | 1 |
| Bilan partagé de médication | 45 | 11 | 27 | 4 | 3 |
| Femme enceinte | 12 | 5 | 3 | 2 | 1 |
| Opioïdes | 24 | 6 | 8 | 7 | 4 |
| Bilan de prévention | 18 | 6 | 12 | 1 | 0 |

Pour les types à plusieurs rendez-vous (AVK, AOD, asthme, anticancéreux, BPM), les phases sont
préfixées par le rendez-vous (« Évaluation · … », « Thème · … », « Entretien 1 · … »).

## Sources réellement lues

Les fiches ont été lues dans le bucket privé `entretiens` (documents déjà importés dans l’app),
`ameli.fr` étant bloqué par le réseau de la session.

| Type | Source |
|---|---|
| AVK | Grille « AVK – Entretien d’évaluation » (Assurance Maladie) ; Carnet AVK, juin 2023 (ANSM, Fédération française de cardiologie, Cespharm) |
| AOD | Fiche « AOD – Entretien d’évaluation » (Assurance Maladie) |
| Asthme | Fiche « Asthme – Entretien d’évaluation » (Assurance Maladie) + anciens items du dépôt |
| Anticancéreux oraux | Fiche « Entretien initial » (exemple capécitabine, Assurance Maladie) ; trame de l’avenant 21 |
| BPM | Fiches recueil d’information, analyse des traitements et entretien-conseil (Assurance Maladie), questionnaire de Girerd |
| Femme enceinte | Mémo pharmacien « Accompagnement femme enceinte » (Assurance Maladie, juillet 2026) |
| Opioïdes | Fiche pharmacien « Accompagnement opioïdes » (Assurance Maladie), questionnaire POMI |
| Bilan de prévention | Auto-questionnaire « Mon bilan prévention » 45-50 ans et livret de présentation |

## Points à valider par le pharmacien

Contenu **moins solidement sourcé** (les fiches d’évaluation officielles ne couvrent que le 1er
entretien) :

- **AOD, asthme** : les phases « Thème · … » (observance, surveillance, effets, technique
  d’inhalation, facteurs déclencheurs) reprennent les thèmes officiels, mais les questions sont
  rédigées ici. Aucun guide thématique Assurance Maladie n’était dans les documents importés.
- **Anticancéreux oraux** : les règles propres à une molécule (moment de prise, oubli, effets)
  renvoient à la fiche de la molécule ; seule la trame commune a été écrite.
- **Bilan de prévention** : trame générale par thématique ; utiliser l’auto-questionnaire de la
  tranche d’âge (18-25, 45-50, 60-65, 70-75 ans).
- **BPM** : la phase « Analyse (hors patient) » n’est pas un temps d’entretien ; elle peut être
  sautée pendant le pas à pas.
- Ce contrôle de cohérence ne remplace pas une relecture clinique.

## Sécurité

La clé `service_role` Supabase a été communiquée dans la conversation pour lire les PDF. Elle n’est
écrite dans aucun fichier ni commit. **Recommandé : la régénérer** (Supabase, Project Settings, API)
puis mettre à jour `SUPABASE_SERVICE_ROLE_KEY` dans Vercel.

## Reste à faire

Le mode pas à pas (une phase à la fois, plein écran, Suivant/Précédent, raccourcis clavier, écran de
fin vers le journal) n’est pas encore codé : il attend la validation du plan.
