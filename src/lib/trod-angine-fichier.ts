import type { DonneesTrodAngine } from '@/lib/trod-angine'

// Nom de fichier PDF sûr (ASCII, sans espace) : préfixe, nom du patient, date.
export function nomFichierPdf(prefixe: string, donnees: DonneesTrodAngine): string {
  const nom = `${donnees.patient.nom}-${donnees.patient.prenom}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return [prefixe, nom, donnees.patient.date].filter(Boolean).join('-') + '.pdf'
}
