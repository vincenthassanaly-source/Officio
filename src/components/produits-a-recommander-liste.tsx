'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { ajouterProduitARecommander, supprimerProduitARecommander } from '@/app/actions/produits-a-recommander'
import type { ProduitARecommander } from '@/lib/data/produits-a-recommander'
import { useRetraitAnime } from '@/lib/use-retrait-anime'
import { useRetraitDiffere } from '@/lib/use-retrait-differe'
import { useToast } from '@/components/ui/toast-provider'
import { vibrer } from '@/lib/haptics'
import { CHAMP_CLASS } from '@/components/ui/champ'

// Icône propre à ce module (pas de tuile de nav dédiée à distinguer de
// IconRupturesStock, voir la liste voisine sur la même page).
function IconRecommande({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 8h12l-1.3 11.2a2 2 0 0 1-2 1.8H9.3a2 2 0 0 1-2-1.8L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  )
}

function EtatVide({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-soft text-muted" aria-hidden="true">
        <IconRecommande className="h-6 w-6" />
      </div>
      <p className="max-w-[220px] text-sm text-muted">{message}</p>
    </div>
  )
}

export function ProduitsARecommanderListe({ produits }: { produits: ProduitARecommander[] }) {
  const [nomProduit, setNomProduit] = useState('')
  const [isPending, startTransition] = useTransition()
  const toast = useToast()
  const [produitsOptimistes, retirerOptimiste] = useOptimistic(produits, (etat, id: string) =>
    etat.filter((p) => p.id !== id)
  )
  const { estEnSortie, retirerApresAnimation } = useRetraitAnime()
  const { idsMasques, differer } = useRetraitDiffere({
    supprimer: supprimerProduitARecommander,
    retirerOptimiste,
    demarrerTransition: startTransition,
    messageErreur: 'Échec de la suppression du produit.',
  })
  const visibles = produitsOptimistes.filter((p) => !idsMasques.has(p.id))

  return (
    <div className="flex flex-1 flex-col gap-3">
      <form
        action={(formData) => {
          // Bouton jamais `disabled` (il garderait le focus perdu après
          // l'envoi) : la garde est ici, l'état passe par aria-disabled.
          if (isPending || !nomProduit.trim()) return
          startTransition(async () => {
            try {
              await ajouterProduitARecommander(formData)
              setNomProduit('')
            } catch (err) {
              toast({
                type: 'erreur',
                message: err instanceof Error ? err.message : "Échec de l'ajout du produit.",
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
          placeholder="Produit à recommander…"
          aria-label="Nom du produit à recommander"
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
        <EtatVide message="Aucun produit à recommander pour l’instant." />
      )}

      {visibles.length > 0 && (
        <div className="flex flex-col gap-2">
          {visibles.map((p) => (
            <label
              key={p.id}
              className={`flex items-center gap-3 rounded-2xl bg-surface shadow-card p-3.5 ${
                estEnSortie(p.id) ? 'item-sortie' : 'item-entree'
              }`}
            >
              <input
                type="checkbox"
                onChange={() => {
                  vibrer()
                  retirerApresAnimation(p.id, () => differer(p.id, p.nom_produit))
                }}
                aria-label={`${p.nom_produit} recommandé ou reçu`}
                className="h-5 w-5 shrink-0 accent-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              />
              <span className="line-clamp-2 min-w-0 flex-1 break-words text-[13.5px] font-medium text-ink">{p.nom_produit}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
