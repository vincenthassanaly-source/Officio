// Conditions d'éligibilité d'un type d'entretien (types_entretien.eligibilite) :
// un texte libre, un critère par ligne. Module pur partagé par l'encadré
// (client) et l'action serveur, qui revalide toujours ce qu'elle reçoit.

export const MAX_CRITERES_ELIGIBILITE = 15
export const MAX_LONGUEUR_ELIGIBILITE = 2000

// Une puce saisie à la main (« - », « • », « * ») en début de ligne est retirée :
// chaque ligne devient de toute façon une puce à l'affichage.
const PUCE_EN_DEBUT = /^\s*[-•*–]\s+/

// Les lignes non vides du texte, sans puce saisie à la main.
export function lignesEligibilite(texte: string): string[] {
  return texte
    .split(/\r?\n/)
    .map((ligne) => ligne.replace(PUCE_EN_DEBUT, '').trim())
    .filter((ligne) => ligne !== '')
}

// Forme enregistrée : une ligne par critère, sans lignes vides ni puces. Une
// chaîne vide signifie « pas de conditions » (l'encadré disparaît).
export function normaliserEligibilite(brut: string): string {
  return lignesEligibilite(brut).join('\n')
}

// Message d'erreur si le texte normalisé dépasse les limites, sinon null.
export function erreurEligibilite(normalise: string): string | null {
  if (lignesEligibilite(normalise).length > MAX_CRITERES_ELIGIBILITE || normalise.length > MAX_LONGUEUR_ELIGIBILITE) {
    return `Texte trop long : ${MAX_CRITERES_ELIGIBILITE} critères et ${MAX_LONGUEUR_ELIGIBILITE} caractères au plus.`
  }
  return null
}
