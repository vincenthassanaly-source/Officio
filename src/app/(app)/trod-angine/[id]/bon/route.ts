import { getTrodAngineFiche } from '@/lib/data/trod-angine'
import { bonDisponible } from '@/lib/trod-angine'
import { genererBon } from '@/lib/trod-angine-pdf'
import { nomFichierPdf } from '@/lib/trod-angine-fichier'

export const dynamic = 'force-dynamic'

// Bon de prise en charge des antibiotiques délivrés sans ordonnance, rempli, au
// format PDF (page enfant ou adulte selon la fiche). Sans antibiotique délivré,
// il n'y a pas de bon. Lecture sous RLS, comme le compte rendu.
export async function GET(_requete: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const fiche = await getTrodAngineFiche(id)
  if (!fiche) return new Response('Fiche introuvable.', { status: 404 })
  if (!bonDisponible(fiche.donnees)) {
    return new Response('Aucun antibiotique délivré : pas de bon de prise en charge.', { status: 409 })
  }

  const pdf = await genererBon(fiche.donnees)

  return new Response(Buffer.from(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${nomFichierPdf('bon-prise-en-charge-angine', fiche.donnees)}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
