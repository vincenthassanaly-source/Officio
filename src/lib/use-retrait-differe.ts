'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from '@/components/ui/toast-provider'

export const DELAI_ANNULATION_MS = 5000

type Options = {
  // Action de suppression serveur existante, appelée telle quelle à l'échéance.
  supprimer: (id: string) => Promise<unknown>
  // Retrait optimiste (useOptimistic) joué pendant l'appel serveur.
  retirerOptimiste: (id: string) => void
  demarrerTransition: (fn: () => Promise<void>) => void
  messageErreur: string
}

// Retrait « annulable » : la ligne est masquée tout de suite mais la
// suppression serveur n'a lieu qu'à la fermeture du toast « Annuler »
// (échéance 5 s — minuteur suspendu au survol par le toast —, bouton
// Fermer ou éviction). Les suppressions en attente sont exécutées
// immédiatement au démontage et quand la page passe en arrière-plan.
export function useRetraitDiffere({ supprimer, retirerOptimiste, demarrerTransition, messageErreur }: Options) {
  const toast = useToast()
  const [idsMasques, setIdsMasques] = useState<ReadonlySet<string>>(() => new Set())
  const enAttente = useRef(new Set<string>())
  const options = useRef({ supprimer, retirerOptimiste, demarrerTransition, messageErreur, toast })
  useEffect(() => {
    options.current = { supprimer, retirerOptimiste, demarrerTransition, messageErreur, toast }
  })

  const demasquer = useCallback((id: string) => {
    setIdsMasques((p) => {
      const n = new Set(p)
      n.delete(id)
      return n
    })
  }, [])

  const executer = useCallback(
    (id: string, monte: boolean) => {
      if (!enAttente.current.delete(id)) return
      const o = options.current
      const appel = async () => {
        try {
          await o.supprimer(id)
        } catch (err) {
          o.toast({ type: 'erreur', message: err instanceof Error ? err.message : o.messageErreur })
        }
      }
      if (monte) {
        o.demarrerTransition(async () => {
          o.retirerOptimiste(id)
          demasquer(id)
          await appel()
        })
      } else {
        void appel()
      }
    },
    [demasquer]
  )

  useEffect(() => {
    const attente = enAttente.current
    const flush = () => [...attente].forEach((id) => executer(id, true))
    const surVisibilite = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', surVisibilite)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', surVisibilite)
      window.removeEventListener('pagehide', flush)
      ;[...attente].forEach((id) => executer(id, false))
    }
  }, [executer])

  const differer = useCallback(
    (id: string, nom: string) => {
      enAttente.current.add(id)
      setIdsMasques((p) => new Set(p).add(id))
      options.current.toast({
        type: 'info',
        message: `« ${nom} » retiré`,
        duree: DELAI_ANNULATION_MS,
        action: {
          libelle: 'Annuler',
          onClick: () => {
            if (enAttente.current.delete(id)) demasquer(id)
          },
        },
        onFermeture: () => executer(id, true),
      })
    },
    [demasquer, executer]
  )

  return { idsMasques, differer }
}
