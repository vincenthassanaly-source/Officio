// Documents de référence du module TROD angine : catalogue des PDF officiels
// fournis avec l'application, et règles communes aux envois de l'équipe.

export type DocumentOfficiel = {
  // Fichier dans assets/trod-angine/documents/
  fichier: string
  // Nom affiché dans la section Documents
  nom: string
}

// Ordre d'affichage à l'ajout initial.
export const DOCUMENTS_OFFICIELS: DocumentOfficiel[] = [
  { fichier: 'bon-prise-en-charge-adulte.pdf', nom: 'Bon de prise en charge de l’angine – adulte' },
  { fichier: 'bon-prise-en-charge-enfant.pdf', nom: 'Bon de prise en charge de l’angine – enfant' },
  { fichier: 'compte-rendu-prise-en-charge.pdf', nom: 'Compte rendu de prise en charge du patient' },
  {
    fichier: 'has-fiche-memo-angine-antibiotherapie-adulte.pdf',
    nom: 'Fiche mémo HAS – Angine et antibiothérapie chez l’adulte',
  },
]

export const TYPE_PDF = 'application/pdf'

// Limite des envois depuis l'app : alignée sur bodySizeLimit des Server Actions
// (next.config.ts, 4 Mo). Le bucket accepte jusqu'à 10 Mo.
export const TAILLE_MAX_OCTETS = 4 * 1024 * 1024

export const LONGUEUR_MAX_NOM = 150

// Nom proposé par défaut pour un fichier : sans extension .pdf, tronqué.
export function nomDepuisFichier(nomFichier: string): string {
  return nomFichier.replace(/\.pdf$/i, '').replace(/[_]+/g, ' ').trim().slice(0, LONGUEUR_MAX_NOM)
}

// Segment de chemin Storage sûr (ASCII, sans espace ni séparateur).
export function nomStockageSur(nom: string): string {
  const base = nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\.pdf$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return `${base || 'document'}.pdf`
}

export function formaterTaille(octets: number | null): string {
  if (!octets) return ''
  if (octets < 1024) return `${octets} o`
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`
}
