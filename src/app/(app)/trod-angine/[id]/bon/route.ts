import { bonDisponible } from '@/lib/trod-angine'
import { genererBon } from '@/lib/trod-angine-pdf'
import { reponsePdf } from '@/lib/trod-angine-reponse'

export const dynamic = 'force-dynamic'

// Bon de prise en charge des antibiotiques délivrés sans ordonnance, rempli (page
// enfant ou adulte selon la fiche). Sans antibiotique délivré, il n'y a pas de bon.
export async function GET(requete: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return reponsePdf(requete, id, 'bon-prise-en-charge-angine', (fiche, identite) => {
    if (!bonDisponible(fiche.donnees)) {
      return Promise.resolve(new Response('Aucun antibiotique délivré : pas de bon de prise en charge.', { status: 409 }))
    }
    return genererBon(fiche.donnees, identite)
  })
}
