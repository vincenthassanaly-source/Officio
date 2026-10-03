'use client'

import { useId, useOptimistic, useState, useTransition } from 'react'
import { modifierEligibiliteTypeEntretien } from '@/app/actions/entretiens'
import { MAX_LONGUEUR_ELIGIBILITE, erreurEligibilite, lignesEligibilite, normaliserEligibilite } from '@/lib/eligibilite'
import { useToast } from '@/components/ui/toast-provider'
import {
  CLASSE_BOUTON_PRIMAIRE,
  CLASSE_BOUTON_SECONDAIRE,
  CLASSE_CHAMP,
  CLASSE_FOCUS,
  Icone,
} from '@/components/entretien-ui'

// Encadré « Conditions d'éligibilité » en tête de la page d'un type d'entretien :
// qui peut en bénéficier (âge, traitements, molécules…). Texte libre stocké sur
// le type d'entretien, un critère par ligne ; modifiable par tout membre de
// l'officine, sur place. Sans texte, rien n'est affiché — sauf, pour les types
// qui n'en ont pas encore, un lien discret « Ajouter » quand `peutAjouter`
// (mode Édition) permet d'en créer un.
export function EntretienEligibilite({
  typeEntretienId,
  texte,
  peutAjouter,
}: {
  typeEntretienId: string
  texte: string | null
  peutAjouter: boolean
}) {
  const toast = useToast()
  const [texteAffiche, setTexteAffiche] = useOptimistic(texte)
  // Déplié par défaut ; replier est un geste ponctuel, non mémorisé.
  const [ouvert, setOuvert] = useState(true)
  const [enEdition, setEnEdition] = useState(false)
  const [brouillon, setBrouillon] = useState('')
  const [isPending, startTransition] = useTransition()

  const idTitre = useId()
  const idCorps = useId()
  const idChamp = useId()

  function commencer() {
    setBrouillon(texteAffiche ?? '')
    setOuvert(true)
    setEnEdition(true)
  }

  function enregistrer() {
    const normalise = normaliserEligibilite(brouillon)
    const erreur = erreurEligibilite(normalise)
    if (erreur) {
      toast({ type: 'erreur', message: erreur })
      return
    }

    startTransition(async () => {
      // Affichage immédiat ; revenu à l'ancien texte automatiquement si l'envoi échoue.
      setTexteAffiche(normalise === '' ? null : normalise)
      try {
        await modifierEligibiliteTypeEntretien(typeEntretienId, normalise)
        setEnEdition(false)
        toast({ type: 'succes', message: 'Conditions d’éligibilité enregistrées.' })
      } catch (err) {
        toast({ type: 'erreur', message: err instanceof Error ? err.message : 'Échec de l’enregistrement.' })
      }
    })
  }

  if (enEdition) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          enregistrer()
        }}
        className="flex flex-col gap-2.5 rounded-[20px] bg-surface p-3.5 shadow-card"
      >
        <label htmlFor={idChamp} className="text-[14.5px] font-bold text-ink">
          Conditions d’éligibilité
        </label>
        <p className="text-[13px] leading-snug text-muted">Un critère par ligne : chaque ligne devient une puce.</p>
        <textarea
          id={idChamp}
          value={brouillon}
          onChange={(e) => setBrouillon(e.target.value)}
          rows={6}
          maxLength={MAX_LONGUEUR_ELIGIBILITE + 200}
          autoFocus
          className={`${CLASSE_CHAMP} min-h-36 resize-y leading-relaxed`}
        />
        <div className="flex gap-2">
          <button type="button" onClick={() => setEnEdition(false)} disabled={isPending} className={`${CLASSE_BOUTON_SECONDAIRE} flex-1`}>
            Annuler
          </button>
          <button type="submit" disabled={isPending} className={`${CLASSE_BOUTON_PRIMAIRE} flex-1`}>
            {isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    )
  }

  if (texteAffiche === null) {
    if (!peutAjouter) return null
    return (
      <button type="button" onClick={commencer} className={`${CLASSE_BOUTON_SECONDAIRE} min-h-11 self-start text-[13px]`}>
        <Icone nom="plus" taille={16} />
        Ajouter les conditions d’éligibilité
      </button>
    )
  }

  const criteres = lignesEligibilite(texteAffiche)

  return (
    <section aria-labelledby={idTitre} className="rounded-[20px] bg-surface shadow-card">
      <div className="flex items-center gap-1 p-1.5">
        <h2 id={idTitre} className="min-w-0 flex-1">
          <button
            type="button"
            aria-expanded={ouvert}
            aria-controls={idCorps}
            onClick={() => setOuvert(!ouvert)}
            className={`flex min-h-11 w-full items-center gap-2 rounded-xl px-2.5 text-left text-[14.5px] font-bold text-ink ${CLASSE_FOCUS}`}
          >
            <Icone nom="explication" taille={18} className="text-primary" />
            <span className="min-w-0 flex-1">Conditions d’éligibilité</span>
            <Icone
              nom="chevron-bas"
              taille={16}
              className={`text-muted motion-safe:transition-transform ${ouvert ? 'rotate-180' : ''}`}
            />
          </button>
        </h2>
        <button
          type="button"
          onClick={commencer}
          aria-label="Modifier les conditions d’éligibilité"
          title="Modifier"
          className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-neutral-soft hover:text-ink ${CLASSE_FOCUS}`}
        >
          <Icone nom="crayon" taille={18} />
        </button>
      </div>
      {ouvert && (
        <ul id={idCorps} className="flex flex-col gap-2 px-4 pb-4 pt-1 text-[13.5px] leading-snug text-ink">
          {criteres.map((critere) => (
            <li key={critere} className="flex gap-2.5">
              <span aria-hidden="true" className="mt-[7px] size-1.5 shrink-0 rounded-full bg-primary" />
              <span>{critere}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
