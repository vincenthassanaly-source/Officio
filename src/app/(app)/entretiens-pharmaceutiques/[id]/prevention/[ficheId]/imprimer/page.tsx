import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTypeEntretien } from '@/lib/data/entretiens'
import { getFicheEntretien } from '@/lib/data/entretien-fiches'
import type { DonneesPrevention } from '@/lib/prevention'
import { PreventionImpression } from '@/components/prevention-impression'
import { BoutonImprimerBpm } from '@/components/bpm-bouton-imprimer'
import { LienRetour } from '@/components/lien-retour'
import { CLASSE_BOUTON_SECONDAIRE } from '@/components/entretien-ui'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// Plan imprimable : tout ce qui n'est pas la fiche porte print:hidden.
export default async function PreventionImpressionPage({ params }: { params: Promise<{ id: string; ficheId: string }> }) {
  const { id, ficheId } = await params

  const [type, fiche] = await Promise.all([getTypeEntretien(id), getFicheEntretien(ficheId)])
  if (!type || type.modele !== 'prevention' || !fiche || fiche.modele !== 'prevention' || fiche.type_entretien_id !== type.id) {
    notFound()
  }

  const donnees = fiche.donnees as DonneesPrevention
  const nom = `${donnees.patient.nom} ${donnees.patient.prenom}`.trim() || 'Personne sans nom'

  return (
    <>
      <div className="print:hidden">
        <LienRetour href={`/entretiens-pharmaceutiques/${type.id}`} />
        <h1 className="mb-1 mt-4 font-heading text-2xl text-ink text-balance">Plan personnalisé de prévention</h1>
        <p className="mb-4 text-[13.5px] text-muted">{nom}</p>
        <div className="mb-4 flex flex-wrap gap-2">
          <BoutonImprimerBpm />
          <Link
            href={`/entretiens-pharmaceutiques/${type.id}/prevention/${fiche.id}`}
            className={`${CLASSE_BOUTON_SECONDAIRE} min-h-12`}
          >
            Modifier le bilan
          </Link>
        </div>
        <p className="mb-4 text-[12.5px] leading-snug text-muted">
          Deux feuilles A4 : le plan remis à la personne (objectifs et actions), puis le récapitulatif de ses réponses. Dans la boîte d’impression, choisissez « Enregistrer au format
          PDF » pour obtenir un fichier.
        </p>
      </div>
      <PreventionImpression donnees={donnees} />
    </>
  )
}
