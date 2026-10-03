'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { creerFicheBpm, supprimerFicheBpm } from '@/app/actions/bpm'
import type { FicheBpmResume } from '@/lib/data/bpm'
import { nomPatientAffiche } from '@/lib/bpm'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'
import { useToast } from '@/components/ui/toast-provider'
import { CLASSE_BOUTON_PRIMAIRE, CLASSE_FOCUS, Icone } from '@/components/entretien-ui'

function dateCourte(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Onglet « Fiches » d'un type d'entretien BPM : une fiche par patient et par
// bilan, ouverte en saisie pas à pas, imprimable à tout moment.
export function BpmFiches({
  typeEntretienId,
  fiches,
  peutEcrire = true,
}: {
  typeEntretienId: string
  fiches: FicheBpmResume[]
  peutEcrire?: boolean
}) {
  const router = useRouter()
  const toast = useToast()
  const [isPending, startTransition] = useTransition()
  const [aSupprimer, setASupprimer] = useState<FicheBpmResume | null>(null)

  function nouvelleFiche() {
    startTransition(async () => {
      try {
        const id = await creerFicheBpm(typeEntretienId)
        router.push(`/entretiens-pharmaceutiques/${typeEntretienId}/bpm/${id}`)
      } catch (err) {
        toast({ type: 'erreur', message: err instanceof Error ? err.message : 'Impossible de créer la fiche.' })
      }
    })
  }

  function supprimer(fiche: FicheBpmResume) {
    setASupprimer(null)
    startTransition(async () => {
      try {
        await supprimerFicheBpm(fiche.id, typeEntretienId)
        toast({ type: 'succes', message: 'Fiche supprimée.' })
      } catch (err) {
        toast({ type: 'erreur', message: err instanceof Error ? err.message : 'Suppression impossible.' })
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {peutEcrire && (
        <button type="button" onClick={nouvelleFiche} disabled={isPending} className={`${CLASSE_BOUTON_PRIMAIRE} min-h-14 text-[15px]`}>
          <Icone nom="plus" taille={18} />
          {isPending ? 'Création…' : 'Nouvelle fiche BPM'}
        </button>
      )}

      {fiches.length === 0 ? (
        <p className="rounded-[20px] bg-surface p-4 text-[13.5px] leading-relaxed text-muted shadow-card">
          Aucune fiche pour l’instant. Une fiche reprend le recueil d’informations, le questionnaire de Girerd et l’analyse des
          traitements du bilan partagé de médication, et s’imprime à la fin.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {fiches.map((f) => {
            const nom = nomPatientAffiche(f.patient_nom, f.patient_prenom)
            return (
              <li key={f.id} className="flex items-center gap-1 rounded-[20px] bg-surface p-2 pl-4 shadow-card">
                <Link
                  href={`/entretiens-pharmaceutiques/${typeEntretienId}/bpm/${f.id}`}
                  className={`flex min-h-12 min-w-0 flex-1 flex-col justify-center rounded-xl ${CLASSE_FOCUS}`}
                >
                  <span className="truncate text-[14.5px] font-semibold text-ink">{nom}</span>
                  <span className="text-[12.5px] text-muted">Bilan du {dateCourte(f.date_entretien)}</span>
                </Link>
                <Link
                  href={`/entretiens-pharmaceutiques/${typeEntretienId}/bpm/${f.id}/imprimer`}
                  aria-label={`Imprimer la fiche de ${nom}`}
                  title="Imprimer"
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-neutral-soft hover:text-ink ${CLASSE_FOCUS}`}
                >
                  <Icone nom="imprimante" taille={18} />
                </Link>
                {peutEcrire && (
                  <button
                    type="button"
                    onClick={() => setASupprimer(f)}
                    aria-label={`Supprimer la fiche de ${nom}`}
                    title="Supprimer"
                    className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-neutral-soft hover:text-ink ${CLASSE_FOCUS}`}
                  >
                    <Icone nom="corbeille" taille={18} />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <ModaleConfirmation
        ouvert={aSupprimer !== null}
        titre="Supprimer cette fiche ?"
        description={
          aSupprimer
            ? `La fiche de ${nomPatientAffiche(aSupprimer.patient_nom, aSupprimer.patient_prenom)} sera supprimée définitivement, avec toutes ses réponses.`
            : undefined
        }
        onConfirmer={() => aSupprimer && supprimer(aSupprimer)}
        onAnnuler={() => setASupprimer(null)}
      />
    </div>
  )
}
