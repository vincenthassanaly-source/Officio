import { notFound } from 'next/navigation'
import { getTypeEntretien, getDocumentsEntretien } from '@/lib/data/entretiens'
import { getFicheBpm } from '@/lib/data/bpm'
import { choisirDocumentAdhesion } from '@/lib/bpm'
import { BpmSaisie } from '@/components/bpm-saisie'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// Saisie pas à pas d'une fiche BPM. La saisie est un plein écran : la page ne
// rend rien d'autre (pas de titre ni de lien de retour sous le plein écran).
export default async function BpmSaisiePage({ params }: { params: Promise<{ id: string; ficheId: string }> }) {
  const { id, ficheId } = await params

  const [type, fiche, documents] = await Promise.all([
    getTypeEntretien(id),
    getFicheBpm(ficheId),
    getDocumentsEntretien(id),
  ])
  // La fiche doit appartenir au type de l'URL : pas de lecture croisée par id.
  if (!type || type.modele !== 'bpm' || !fiche || fiche.type_entretien_id !== type.id) notFound()

  return (
    <BpmSaisie
      ficheId={fiche.id}
      typeEntretienId={type.id}
      nomType={type.nom}
      initial={fiche.donnees}
      documentAdhesion={choisirDocumentAdhesion(documents)}
    />
  )
}
