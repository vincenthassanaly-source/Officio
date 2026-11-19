import { notFound } from 'next/navigation'
import { getTrodAngineFiche } from '@/lib/data/trod-angine'
import { TrodAngineSaisie } from '@/components/trod-angine-saisie'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export const metadata = { title: 'TROD angine' }

// Saisie pas à pas d'un TROD angine. La saisie est un plein écran : la page ne
// rend rien d'autre.
export default async function TrodAngineSaisiePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const fiche = await getTrodAngineFiche(id)
  if (!fiche) notFound()

  return <TrodAngineSaisie ficheId={fiche.id} initial={fiche.donnees} />
}
