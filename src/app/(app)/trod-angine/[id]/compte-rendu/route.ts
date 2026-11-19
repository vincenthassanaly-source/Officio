import { getTrodAngineFiche } from '@/lib/data/trod-angine'
import { genererCompteRendu } from '@/lib/trod-angine-pdf'
import { nomFichierPdf } from '@/lib/trod-angine-fichier'

export const dynamic = 'force-dynamic'

// Compte rendu « prise en charge à l'officine de l'angine » rempli, au format
// PDF. La fiche est lue sous RLS avec la session de l'utilisateur : une fiche
// d'une autre officine (ou sans session) donne un 404.
export async function GET(_requete: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const fiche = await getTrodAngineFiche(id)
  if (!fiche) return new Response('Fiche introuvable.', { status: 404 })

  const pdf = await genererCompteRendu(fiche.donnees)

  return new Response(Buffer.from(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${nomFichierPdf('compte-rendu-angine', fiche.donnees)}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
