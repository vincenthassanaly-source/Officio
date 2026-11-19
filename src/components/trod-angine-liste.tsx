'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { creerTrodAngine, supprimerTrodAngine } from '@/app/actions/trod-angine'
import type { TrodAngineResume } from '@/lib/data/trod-angine'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'
import { useToast } from '@/components/ui/toast-provider'
import { CLASSE_BOUTON_PRIMAIRE, CLASSE_FOCUS, Icone } from '@/components/entretien-ui'

function dateCourte(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function nomAffiche(f: TrodAngineResume): string {
  return `${f.patient_nom.trim()} ${f.patient_prenom.trim()}`.trim() || 'Patient sans nom'
}

const CLASSE_ACTION = `flex size-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-neutral-soft hover:text-ink ${CLASSE_FOCUS}`

// Liste des TROD angine de l'officine : un nouveau TROD ouvre la saisie pas à
// pas, une fiche existante se rouvre pour réimprimer les documents.
export function TrodAngineListe({ fiches }: { fiches: TrodAngineResume[] }) {
  const router = useRouter()
  const toast = useToast()
  const [isPending, startTransition] = useTransition()
  const [aSupprimer, setASupprimer] = useState<TrodAngineResume | null>(null)

  function nouveau() {
    startTransition(async () => {
      try {
        const id = await creerTrodAngine()
        router.push(`/trod-angine/${id}`)
      } catch (err) {
        toast({ type: 'erreur', message: err instanceof Error ? err.message : 'Impossible de créer la fiche.' })
      }
    })
  }

  function supprimer(fiche: TrodAngineResume) {
    setASupprimer(null)
    startTransition(async () => {
      try {
        await supprimerTrodAngine(fiche.id)
        toast({ type: 'succes', message: 'Fiche supprimée.' })
      } catch (err) {
        toast({ type: 'erreur', message: err instanceof Error ? err.message : 'Suppression impossible.' })
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={nouveau}
        disabled={isPending}
        className={`${CLASSE_BOUTON_PRIMAIRE} min-h-14 text-[15px]`}
      >
        <Icone nom="plus" taille={18} />
        {isPending ? 'Un instant…' : 'Nouveau TROD angine'}
      </button>

      {fiches.length === 0 ? (
        <p className="rounded-[20px] bg-surface p-4 text-[13.5px] leading-relaxed text-muted shadow-card">
          Aucun TROD pour l’instant. Le parcours vérifie les signes de gravité et les critères d’exclusion, note le
          résultat du TROD, propose l’antibiotique et sa dose, puis ouvre le compte rendu et le bon de prise en charge
          déjà remplis.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {fiches.map((f) => {
            const nom = nomAffiche(f)
            return (
              <li key={f.id} className="flex items-center gap-1 rounded-[20px] bg-surface p-2 pl-4 shadow-card">
                <Link
                  href={`/trod-angine/${f.id}`}
                  className={`flex min-h-12 min-w-0 flex-1 flex-col justify-center rounded-xl ${CLASSE_FOCUS}`}
                >
                  <span className="truncate text-[14.5px] font-semibold text-ink">{nom}</span>
                  <span className="text-[12.5px] text-muted">TROD du {dateCourte(f.date_entretien)}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setASupprimer(f)}
                  aria-label={`Supprimer le TROD de ${nom}`}
                  title="Supprimer"
                  className={CLASSE_ACTION}
                >
                  <Icone nom="corbeille" taille={18} />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <ModaleConfirmation
        ouvert={aSupprimer !== null}
        titre="Supprimer ce TROD ?"
        description={
          aSupprimer
            ? `Le TROD de ${nomAffiche(aSupprimer)} du ${dateCourte(aSupprimer.date_entretien)} sera supprimé définitivement, avec toutes ses réponses.`
            : undefined
        }
        onConfirmer={() => aSupprimer && supprimer(aSupprimer)}
        onAnnuler={() => setASupprimer(null)}
      />
    </div>
  )
}
