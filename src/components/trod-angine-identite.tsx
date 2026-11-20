'use client'

import { useState, useTransition } from 'react'
import { enregistrerIdentiteTrodAngine } from '@/app/actions/trod-angine'
import type { IdentiteOfficine } from '@/lib/trod-angine'
import { useToast } from '@/components/ui/toast-provider'
import { CLASSE_BOUTON_PRIMAIRE, CLASSE_CHAMP, CLASSE_FOCUS, Icone } from '@/components/entretien-ui'

const CHAMPS: { cle: keyof IdentiteOfficine; label: string; max: number; autoComplete?: string }[] = [
  { cle: 'nom_structure', label: 'Nom de la structure', max: 150 },
  { cle: 'adresse', label: 'Adresse', max: 250 },
  { cle: 'numero_am', label: 'Numéro AM', max: 40 },
]

// Identité de l'officine imprimée sur le compte rendu et le bon : saisie une fois,
// partagée par toute l'équipe. Repliée dès qu'elle est renseignée.
export function TrodAngineIdentite({ identite }: { identite: IdentiteOfficine }) {
  const toast = useToast()
  const [isPending, startTransition] = useTransition()
  const renseignee = Boolean(identite.nom_structure || identite.adresse || identite.numero_am)
  const [ouvert, setOuvert] = useState(!renseignee)
  const [valeurs, setValeurs] = useState<IdentiteOfficine>(identite)

  function enregistrer() {
    startTransition(async () => {
      try {
        await enregistrerIdentiteTrodAngine(valeurs)
        setOuvert(false)
        toast({ type: 'succes', message: 'Identité de l’officine enregistrée.' })
      } catch (err) {
        toast({ type: 'erreur', message: err instanceof Error ? err.message : 'Enregistrement impossible.' })
      }
    })
  }

  return (
    <section aria-labelledby="trod-identite-titre" className="mb-4 rounded-[20px] bg-surface p-3 shadow-card">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
        aria-controls="trod-identite-formulaire"
        className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-xl text-left ${CLASSE_FOCUS}`}
      >
        <span className="min-w-0">
          <span id="trod-identite-titre" className="block text-[14.5px] font-semibold text-ink">
            Identité de l’officine
          </span>
          <span className="block truncate text-[12.5px] text-muted">
            {renseignee
              ? [identite.nom_structure, identite.numero_am && `AM ${identite.numero_am}`].filter(Boolean).join(' · ')
              : 'À renseigner : préremplit le compte rendu et le bon.'}
          </span>
        </span>
        <Icone nom={ouvert ? 'haut' : 'bas'} taille={18} className="shrink-0 text-muted" />
      </button>

      {ouvert && (
        <form
          id="trod-identite-formulaire"
          className="mt-3 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            enregistrer()
          }}
        >
          {CHAMPS.map((c) => (
            <label key={c.cle} className="flex flex-col gap-1">
              <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">{c.label}</span>
              <input
                value={valeurs[c.cle]}
                maxLength={c.max}
                onChange={(e) => setValeurs((v) => ({ ...v, [c.cle]: e.target.value }))}
                autoComplete="off"
                className={CLASSE_CHAMP}
              />
            </label>
          ))}
          <p className="text-[12.5px] leading-snug text-muted">
            Le nom du pharmacien se saisit sur chaque fiche. Le tampon et la signature restent à apposer à la main.
          </p>
          <button type="submit" disabled={isPending} className={CLASSE_BOUTON_PRIMAIRE}>
            {isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      )}
    </section>
  )
}
