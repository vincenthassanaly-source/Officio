'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type StatutEnregistrement = 'enregistre' | 'attente' | 'encours' | 'erreur'

// Délai entre la dernière frappe et l'enregistrement : assez court pour ne rien
// perdre si l'écran se verrouille, assez long pour ne pas écrire à chaque lettre.
const DELAI_MS = 700

// Enregistrement automatique d'une fiche saisie champ par champ.
//
// - modifier(transformer) applique le changement tout de suite à l'écran et
//   programme l'enregistrement après une courte pause de frappe.
// - sauvegarder() envoie immédiatement ce qui attend (changement d'étape,
//   sortie) et renvoie true si tout est enregistré.
// - Les écritures sont chaînées : jamais deux envois en parallèle, et la
//   dernière version saisie part toujours en dernier.
// - Écran verrouillé ou onglet masqué : envoi immédiat. Le démontage de la
//   page envoie aussi ce qui reste.
export function useEnregistrementAuto<D>(
  initial: D,
  enregistrer: (donnees: D) => Promise<unknown>
): {
  donnees: D
  statut: StatutEnregistrement
  modifier: (transformer: (d: D) => D) => void
  sauvegarder: () => Promise<boolean>
} {
  const [donnees, setDonnees] = useState<D>(initial)
  const [statut, setStatut] = useState<StatutEnregistrement>('enregistre')

  const donneesRef = useRef(donnees)
  const versionRef = useRef(0)
  const versionEnregistreeRef = useRef(0)
  const chaineRef = useRef<Promise<boolean>>(Promise.resolve(true))
  const minuteurRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const enregistrerRef = useRef(enregistrer)

  useEffect(() => {
    enregistrerRef.current = enregistrer
  }, [enregistrer])

  const sauvegarder = useCallback((): Promise<boolean> => {
    if (minuteurRef.current) {
      clearTimeout(minuteurRef.current)
      minuteurRef.current = null
    }
    chaineRef.current = chaineRef.current.then(async () => {
      const version = versionRef.current
      if (versionEnregistreeRef.current >= version) return true
      setStatut('encours')
      try {
        await enregistrerRef.current(donneesRef.current)
        versionEnregistreeRef.current = version
        setStatut(versionRef.current === version ? 'enregistre' : 'attente')
        return true
      } catch {
        setStatut('erreur')
        return false
      }
    })
    return chaineRef.current
  }, [])

  const modifier = useCallback(
    (transformer: (d: D) => D) => {
      const suivant = transformer(donneesRef.current)
      donneesRef.current = suivant
      versionRef.current += 1
      setDonnees(suivant)
      setStatut('attente')
      if (minuteurRef.current) clearTimeout(minuteurRef.current)
      minuteurRef.current = setTimeout(() => {
        void sauvegarder()
      }, DELAI_MS)
    },
    [sauvegarder]
  )

  useEffect(() => {
    function surVisibilite() {
      if (document.visibilityState === 'hidden') void sauvegarder()
    }
    document.addEventListener('visibilitychange', surVisibilite)
    return () => {
      document.removeEventListener('visibilitychange', surVisibilite)
      void sauvegarder()
    }
  }, [sauvegarder])

  return { donnees, statut, modifier, sauvegarder }
}
