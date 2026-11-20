import { genererCompteRendu } from '@/lib/trod-angine-pdf'
import { reponsePdf } from '@/lib/trod-angine-reponse'

export const dynamic = 'force-dynamic'

// Compte rendu de prise en charge rempli, au format PDF. Aperçu par défaut,
// téléchargement avec ?telecharger=1.
export async function GET(requete: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return reponsePdf(requete, id, 'compte-rendu-angine', (fiche, identite) =>
    genererCompteRendu(fiche.donnees, identite)
  )
}
