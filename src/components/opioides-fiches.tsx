'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { creerFicheEntretien, dupliquerFicheEntretien, supprimerFicheEntretien } from '@/app/actions/entretien-fiches'
import type { FicheEntretienResume } from '@/lib/data/entretien-fiches'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'
import { useToast } from '@/components/ui/toast-provider'
import { CLASSE_BOUTON_PRIMAIRE, CLASSE_FOCUS, Icone } from '@/components/entretien-ui'

function dateCourte(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function nomAffiche(f: FicheEntretienResume): string {
  return `${f.patient_nom.trim()} ${f.patient_prenom.trim()}`.trim() || 'Patient sans nom'
}

const CLASSE_ACTION = `flex size-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-neutral-soft hover:text-ink ${CLASSE_FOCUS}`

// Onglet « Fiches » d'un type d'entretien « Opioïdes » : une fiche par entretien
// (un patient revient à chaque renouvellement : « Nouvel entretien » copie
// l'identité et la prescription d'une fiche existante), ouverte en saisie pas à
// pas, imprimable à tout moment.
export function OpioidesFiches({
  typeEntretienId,
  fiches,
}: {
  typeEntretienId: string
  fiches: FicheEntretienResume[]
}) {
  const router = useRouter()
  const toast = useToast()
  const [isPending, startTransition] = useTransition()
  const [aSupprimer, setASupprimer] = useState<FicheEntretienResume | null>(null)
  const base = `/entretiens-pharmaceutiques/${typeEntretienId}/opioides`

  function ouvrirApres(action: () => Promise<string>, messageErreur: string) {
    startTransition(async () => {
      try {
        const id = await action()
        router.push(`${base}/${id}`)
      } catch (err) {
        toast({ type: 'erreur', message: err instanceof Error ? err.message : messageErreur })
      }
    })
  }

  function supprimer(fiche: FicheEntretienResume) {
    setASupprimer(null)
    startTransition(async () => {
      try {
        await supprimerFicheEntretien(fiche.id, typeEntretienId)
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
        onClick={() => ouvrirApres(() => creerFicheEntretien(typeEntretienId), 'Impossible de créer la fiche.')}
        disabled={isPending}
        className={`${CLASSE_BOUTON_PRIMAIRE} min-h-14 text-[15px]`}
      >
        <Icone nom="plus" taille={18} />
        {isPending ? 'Un instant…' : 'Nouvelle fiche opioïdes'}
      </button>

      {fiches.length === 0 ? (
        <p className="rounded-[20px] bg-surface p-4 text-[13.5px] leading-relaxed text-muted shadow-card">
          Aucune fiche pour l’instant. Une fiche reprend l’identité et la prescription du patient, les règles de bon usage
          abordées, le questionnaire POMI et les conclusions de l’entretien, et s’imprime à la fin.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {fiches.map((f) => {
            const nom = nomAffiche(f)
            return (
              <li key={f.id} className="flex items-center gap-1 rounded-[20px] bg-surface p-2 pl-4 shadow-card">
                <Link href={`${base}/${f.id}`} className={`flex min-h-12 min-w-0 flex-1 flex-col justify-center rounded-xl ${CLASSE_FOCUS}`}>
                  <span className="truncate text-[14.5px] font-semibold text-ink">{nom}</span>
                  <span className="text-[12.5px] text-muted">Entretien du {dateCourte(f.date_entretien)}</span>
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    ouvrirApres(() => dupliquerFicheEntretien(f.id), 'Impossible de créer le nouvel entretien.')
                  }
                  disabled={isPending}
                  aria-label={`Nouvel entretien pour ${nom}`}
                  title="Nouvel entretien (copie l’identité et la prescription)"
                  className={`${CLASSE_ACTION} disabled:opacity-50`}
                >
                  <Icone nom="plus" taille={18} />
                </button>
                <Link href={`${base}/${f.id}/imprimer`} aria-label={`Imprimer la fiche de ${nom}`} title="Imprimer" className={CLASSE_ACTION}>
                  <Icone nom="imprimante" taille={18} />
                </Link>
                <button
                  type="button"
                  onClick={() => setASupprimer(f)}
                  aria-label={`Supprimer la fiche de ${nom}`}
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
        titre="Supprimer cette fiche ?"
        description={
          aSupprimer
            ? `La fiche de ${nomAffiche(aSupprimer)} du ${dateCourte(aSupprimer.date_entretien)} sera supprimée définitivement, avec toutes ses réponses.`
            : undefined
        }
        onConfirmer={() => aSupprimer && supprimer(aSupprimer)}
        onAnnuler={() => setASupprimer(null)}
      />
    </div>
  )
}
