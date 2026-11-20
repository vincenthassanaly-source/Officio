import { genererDossier } from '@/lib/trod-angine-pdf'
import { reponsePdf } from '@/lib/trod-angine-reponse'

export const dynamic = 'force-dynamic'

// Dossier de facturation en un seul PDF : compte rendu puis, si un antibiotique est
// délivré, bon de prise en charge.
export async function GET(requete: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return reponsePdf(requete, id, 'dossier-angine', (fiche, identite) => genererDossier(fiche.donnees, identite))
}
