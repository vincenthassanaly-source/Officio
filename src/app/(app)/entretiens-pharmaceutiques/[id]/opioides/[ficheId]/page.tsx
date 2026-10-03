import { notFound } from 'next/navigation'
import { getTypeEntretien } from '@/lib/data/entretiens'
import { getFicheEntretien } from '@/lib/data/entretien-fiches'
import type { DonneesOpioides } from '@/lib/opioides'
import { OpioidesSaisie } from '@/components/opioides-saisie'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// Saisie pas à pas d'une fiche « Opioïdes ». La saisie est un plein écran : la
// page ne rend rien d'autre.
export default async function OpioidesSaisiePage({ params }: { params: Promise<{ id: string; ficheId: string }> }) {
  const { id, ficheId } = await params

  const [type, fiche] = await Promise.all([getTypeEntretien(id), getFicheEntretien(ficheId)])
  // La fiche doit appartenir au type de l'URL et avoir le bon modèle : pas de lecture croisée par id.
  if (!type || type.modele !== 'opioides' || !fiche || fiche.modele !== 'opioides' || fiche.type_entretien_id !== type.id) {
    notFound()
  }

  return (
    <OpioidesSaisie
      ficheId={fiche.id}
      typeEntretienId={type.id}
      nomType={type.nom}
      initial={fiche.donnees as DonneesOpioides}
    />
  )
}
