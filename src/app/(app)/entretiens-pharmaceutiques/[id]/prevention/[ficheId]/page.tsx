import { notFound } from 'next/navigation'
import { getTypeEntretien } from '@/lib/data/entretiens'
import { getFicheEntretien } from '@/lib/data/entretien-fiches'
import type { DonneesPrevention } from '@/lib/prevention'
import { PreventionSaisie } from '@/components/prevention-saisie'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export const metadata = { title: 'Bilan de prévention' }

// Saisie pas à pas d'un bilan de prévention. La saisie est un plein écran : la
// page ne rend rien d'autre.
export default async function PreventionSaisiePage({ params }: { params: Promise<{ id: string; ficheId: string }> }) {
  const { id, ficheId } = await params

  const [type, fiche] = await Promise.all([getTypeEntretien(id), getFicheEntretien(ficheId)])
  // La fiche doit appartenir au type de l'URL et avoir le bon modèle : pas de lecture croisée par id.
  if (!type || type.modele !== 'prevention' || !fiche || fiche.modele !== 'prevention' || fiche.type_entretien_id !== type.id) {
    notFound()
  }

  return (
    <PreventionSaisie
      ficheId={fiche.id}
      typeEntretienId={type.id}
      nomType={type.nom}
      initial={fiche.donnees as DonneesPrevention}
    />
  )
}
