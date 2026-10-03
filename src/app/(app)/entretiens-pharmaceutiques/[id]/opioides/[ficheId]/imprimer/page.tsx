import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTypeEntretien } from '@/lib/data/entretiens'
import { getFicheEntretien } from '@/lib/data/entretien-fiches'
import type { DonneesOpioides } from '@/lib/opioides'
import { OpioidesImpression } from '@/components/opioides-impression'
import { BoutonImprimerBpm } from '@/components/bpm-bouton-imprimer'
import { LienRetour } from '@/components/lien-retour'
import { CLASSE_BOUTON_SECONDAIRE } from '@/components/entretien-ui'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// Compte rendu imprimable : tout ce qui n'est pas la fiche porte print:hidden.
export default async function OpioidesImpressionPage({ params }: { params: Promise<{ id: string; ficheId: string }> }) {
  const { id, ficheId } = await params

  const [type, fiche] = await Promise.all([getTypeEntretien(id), getFicheEntretien(ficheId)])
  if (!type || type.modele !== 'opioides' || !fiche || fiche.modele !== 'opioides' || fiche.type_entretien_id !== type.id) {
    notFound()
  }

  const donnees = fiche.donnees as DonneesOpioides
  const nom = `${donnees.patient.nom} ${donnees.patient.prenom}`.trim() || 'Patient sans nom'

  return (
    <>
      <div className="print:hidden">
        <LienRetour href={`/entretiens-pharmaceutiques/${type.id}`} />
        <h1 className="mb-1 mt-4 font-heading text-2xl text-ink text-balance">Compte rendu de l’entretien opioïdes</h1>
        <p className="mb-4 text-[13.5px] text-muted">{nom}</p>
        <div className="mb-4 flex flex-wrap gap-2">
          <BoutonImprimerBpm />
          <Link
            href={`/entretiens-pharmaceutiques/${type.id}/opioides/${fiche.id}`}
            className={`${CLASSE_BOUTON_SECONDAIRE} min-h-12`}
          >
            Modifier la fiche
          </Link>
        </div>
        <p className="mb-4 text-[12.5px] leading-snug text-muted">
          Deux feuilles A4 : identité et règles de bon usage, puis POMI et conclusions. Dans la boîte d’impression, choisissez « Enregistrer au format
          PDF » pour obtenir un fichier.
        </p>
      </div>
      <OpioidesImpression donnees={donnees} />
    </>
  )
}
