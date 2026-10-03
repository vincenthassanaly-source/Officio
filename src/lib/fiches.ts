// Modèles de fiche stockés dans la table générique entretien_fiches (un modèle
// par type d'entretien : types_entretien.modele). Le BPM garde sa table
// dédiée bpm_fiches et n'apparaît donc pas ici.
//
// Chaque modèle fournit : la fiche vierge, la validation des données reçues, ce
// qu'il faut dénormaliser pour la liste (nom, prénom, date) et la duplication
// d'une fiche existante. Les actions serveur ne connaissent que cette
// interface : ajouter un modèle = ajouter une entrée ici (et l'autoriser dans
// la contrainte SQL de entretien_fiches.modele).

import {
  donneesOpioidesVides,
  dupliquerOpioides,
  normaliserOpioides,
  type DonneesOpioides,
} from '@/lib/opioides'

export type ModeleFiche = 'opioides'

export type EnteteListe = { nom: string; prenom: string; date: string }

type DefinitionModele = {
  vides: () => object
  normaliser: (brut: unknown) => object
  entete: (donnees: object) => EnteteListe
  dupliquer: (donnees: object) => object
}

const MODELES: Record<ModeleFiche, DefinitionModele> = {
  opioides: {
    vides: donneesOpioidesVides,
    normaliser: normaliserOpioides,
    entete: (d) => {
      const { patient } = d as DonneesOpioides
      return { nom: patient.nom, prenom: patient.prenom, date: patient.date }
    },
    dupliquer: (d) => dupliquerOpioides(d as DonneesOpioides),
  },
}

export function estModeleFiche(valeur: unknown): valeur is ModeleFiche {
  return typeof valeur === 'string' && valeur in MODELES
}

export function definitionModele(modele: ModeleFiche): DefinitionModele {
  return MODELES[modele]
}
