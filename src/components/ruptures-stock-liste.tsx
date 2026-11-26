'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { ajouterRuptureStock, supprimerRuptureStock } from '@/app/actions/ruptures-stock'
import type { RuptureStock } from '@/lib/data/ruptures-stock'
import { useToast } from '@/components/ui/toast-provider'
import { useRetraitAnime } from '@/lib/use-retrait-anime'
import { useRetraitDiffere } from '@/lib/use-retrait-differe'
import { vibrer } from '@/lib/haptics'
import { CHAMP_CLASS } from '@/components/ui/champ'
import { IconRupturesStock } from '@/components/nav-icons'

function EtatVide({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-soft text-muted" aria-hidden="true">
        <IconRupturesStock className="h-6 w-6" />
      </div>
      <p className="max-w-[220px] text-sm text-muted">{message}</p>
    </div>
  )
}

export function RupturesStockListe({ ruptures }: { ruptures: RuptureStock[] }) {
  const [nomProduit, setNomProduit] = useState('')
  const [isPending, startTransition] = useTransition()
  const toast = useToast()
  const [rupturesOptimistes, retirerOptimiste] = useOptimistic(ruptures, (etat, id: string) =>
    etat.filter((r) => r.id !== id)
  )
  const { estEnSortie, retirerApresAnimation } = useRetraitAnime()
  const { idsMasques, differer } = useRetraitDiffere({
    supprimer: supprimerRuptureStock,
    retirerOptimiste,
    demarrerTransition: startTransition,
    messageErreur: 'Échec de la mise à jour de la rupture de stock.',
  })
  const visibles = rupturesOptimistes.filter((r) => !idsMasques.has(r.id))

  return (
    <div className="flex flex-1 flex-col gap-3">
      <form
        action={(formData) => {
          // Bouton jamais `disabled` (il garderait le focus perdu après
          // l'envoi) : la garde est ici, l'état passe par aria-disabled.
          if (isPending || !nomProduit.trim()) return
          startTransition(async () => {
            try {
              await ajouterRuptureStock(formData)
              setNomProduit('')
              toast({ type: 'succes', message: 'Rupture de stock signalée.' })
            } catch (err) {
              toast({
                type: 'erreur',
                message: err instanceof Error ? err.message : "Échec de l'ajout de la rupture de stock.",
              })
            }
          })
        }}
        className="flex items-center gap-2"
      >
        <input
          name="nom_produit"
          value={nomProduit}
          onChange={(e) => setNomProduit(e.target.value)}
          placeholder="Nom du produit en rupture…"
          aria-label="Nom du produit en rupture"
          enterKeyHint="done"
          className={`min-w-0 flex-1 ${CHAMP_CLASS}`}
        />
        <button
          type="submit"
          aria-disabled={isPending || !nomProduit.trim() || undefined}
          aria-busy={isPending || undefined}
          className="min-h-11 shrink-0 rounded-xl bg-primary px-4 text-[13px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-disabled:opacity-50"
        >
          Ajouter
        </button>
      </form>

      {visibles.length === 0 && (
        <EtatVide message="Aucune rupture de stock en cours." />
      )}

      {visibles.length > 0 && (
        <div className="flex flex-col gap-2">
          {visibles.map((r) => (
            <label
              key={r.id}
              className={`flex items-center gap-3 rounded-2xl bg-surface shadow-card p-3.5 ${
                estEnSortie(r.id) ? 'item-sortie' : 'item-entree'
              }`}
            >
              <input
                type="checkbox"
                onChange={() => {
                  vibrer()
                  retirerApresAnimation(r.id, () => differer(r.id, r.nom_produit))
                }}
                aria-label={`${r.nom_produit} de nouveau disponible`}
                className="h-5 w-5 shrink-0 accent-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              />
              <span className="line-clamp-2 min-w-0 flex-1 break-words text-[13.5px] font-medium text-ink">{r.nom_produit}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
