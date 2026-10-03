import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTypeEntretien } from '@/lib/data/entretiens'
import { getFicheBpm } from '@/lib/data/bpm'
import { nomPatientAffiche } from '@/lib/bpm'
import { BpmImpression } from '@/components/bpm-impression'
import { BoutonImprimerBpm } from '@/components/bpm-bouton-imprimer'
import { LienRetour } from '@/components/lien-retour'
import { CLASSE_BOUTON_SECONDAIRE } from '@/components/entretien-ui'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// Compte rendu imprimable : tout ce qui n'est pas la fiche porte print:hidden,
// il ne reste dans le flux d'impression que les cinq feuilles (voir
// globals.css, .bpm-impression).
export default async function BpmImpressionPage({ params }: { params: Promise<{ id: string; ficheId: string }> }) {
  const { id, ficheId } = await params

  const [type, fiche] = await Promise.all([getTypeEntretien(id), getFicheBpm(ficheId)])
  if (!type || type.modele !== 'bpm' || !fiche || fiche.type_entretien_id !== type.id) notFound()

  const { entete } = fiche.donnees

  return (
    <>
      <div className="print:hidden">
        <LienRetour href={`/entretiens-pharmaceutiques/${type.id}`} />
        <h1 className="mb-1 mt-4 font-heading text-2xl text-ink text-balance">Compte rendu du bilan partagé</h1>
        <p className="mb-4 text-[13.5px] text-muted">{nomPatientAffiche(entete.nom, entete.prenom)}</p>
        <div className="mb-4 flex flex-wrap gap-2">
          <BoutonImprimerBpm />
          <Link
            href={`/entretiens-pharmaceutiques/${type.id}/bpm/${fiche.id}`}
            className={`${CLASSE_BOUTON_SECONDAIRE} min-h-12`}
          >
            Modifier la fiche
          </Link>
        </div>
        <p className="mb-4 text-[12.5px] leading-snug text-muted">
          Cinq feuilles A4 : recueil, traitements (en paysage), pratiques de prise, questionnaire de Girerd et analyse. Dans la
          boîte d’impression, choisissez « Enregistrer au format PDF » pour obtenir un fichier.
        </p>
      </div>
      <BpmImpression donnees={fiche.donnees} />
    </>
  )
}
