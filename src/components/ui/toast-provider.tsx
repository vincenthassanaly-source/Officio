'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'

export type TypeToast = 'succes' | 'erreur' | 'info'

type Toast = {
  id: number
  type: TypeToast
  message: string
  enSortie: boolean
  action?: ActionToast
}

// Action optionnelle (ex. « Annuler ») : un clic exécute `onClick` puis ferme
// le toast, sans appeler `onFermeture`.
export type ActionToast = { libelle: string; onClick: () => void }

type ParametresToast = {
  type: TypeToast
  message: string
  action?: ActionToast
  // Durée d'affichage en ms (sinon DUREE_PAR_TYPE).
  duree?: number
  // Appelé quand le toast disparaît SANS clic sur l'action : échéance,
  // bouton Fermer ou éviction par un toast plus récent.
  onFermeture?: () => void
}

type ToastContextValue = {
  toast: (parametres: ParametresToast) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

// Succès/info : assez long pour être lu sans traîner. Erreur : plus long,
// le temps de comprendre ce qui a échoué (le texte est souvent plus dense).
const DUREE_PAR_TYPE: Record<TypeToast, number> = {
  succes: 3500,
  info: 3500,
  erreur: 5000,
}

// Même durée que l'animation d'entrée (voir .toast-entree/.toast-sortie
// dans globals.css) : le toast reste monté le temps de jouer la sortie
// avant d'être retiré de la liste.
const DUREE_ANIMATION_SORTIE = 180

const STYLE_PAR_TYPE: Record<TypeToast, string> = {
  succes: 'bg-green-soft text-green',
  erreur: 'bg-rec-soft text-rec',
  info: 'bg-primary-soft text-primary',
}

const MAX_TOASTS = 3

let prochainId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const minuteursAutoFermeture = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const dureesRef = useRef<Map<number, number>>(new Map())
  // onFermeture en attente, par toast.
  const fermeturesRef = useRef<Map<number, () => void>>(new Map())

  const retirer = useCallback((id: number, declencherFermeture = true) => {
    const fermeture = fermeturesRef.current.get(id)
    fermeturesRef.current.delete(id)
    dureesRef.current.delete(id)
    if (declencherFermeture) fermeture?.()
    const minuteur = minuteursAutoFermeture.current.get(id)
    if (minuteur) {
      clearTimeout(minuteur)
      minuteursAutoFermeture.current.delete(id)
    }
    setToasts((t) => t.map((toast) => (toast.id === id ? { ...toast, enSortie: true } : toast)))
    setTimeout(() => {
      setToasts((t) => t.filter((toast) => toast.id !== id))
    }, DUREE_ANIMATION_SORTIE)
  }, [])

  const armer = useCallback(
    (id: number, type: TypeToast) => {
      const minuteur = setTimeout(() => retirer(id), dureesRef.current.get(id) ?? DUREE_PAR_TYPE[type])
      minuteursAutoFermeture.current.set(id, minuteur)
    },
    [retirer]
  )

  const toast = useCallback(
    ({ type, message, action, duree, onFermeture }: ParametresToast) => {
      const id = prochainId++
      if (duree !== undefined) dureesRef.current.set(id, duree)
      if (onFermeture) fermeturesRef.current.set(id, onFermeture)
      // Plafond à MAX_TOASTS : les plus anciens sont retirés en premier. Un
      // toast évincé déclenche son onFermeture (sinon une action différée
      // resterait en attente sans que personne ne puisse plus l'annuler).
      setToasts((t) => {
        const suite = [...t, { id, type, message, enSortie: false, action }]
        const evinces = suite.slice(0, -MAX_TOASTS)
        if (evinces.length) {
          queueMicrotask(() =>
            evinces.forEach((e) => {
              const minuteur = minuteursAutoFermeture.current.get(e.id)
              if (minuteur) clearTimeout(minuteur)
              minuteursAutoFermeture.current.delete(e.id)
              const f = fermeturesRef.current.get(e.id)
              fermeturesRef.current.delete(e.id)
              dureesRef.current.delete(e.id)
              f?.()
            })
          )
        }
        return suite.slice(-MAX_TOASTS)
      })
      armer(id, type)
    },
    [armer]
  )

  // Pause du minuteur tant que le toast est survolé ou a le focus (le temps
  // de le lire), relancé à la fin avec la durée complète.
  const suspendre = useCallback((id: number) => {
    const minuteur = minuteursAutoFermeture.current.get(id)
    if (minuteur) {
      clearTimeout(minuteur)
      minuteursAutoFermeture.current.delete(id)
    }
  }, [])

  const reprendre = useCallback(
    (id: number, type: TypeToast) => {
      if (!minuteursAutoFermeture.current.has(id)) armer(id, type)
    },
    [armer]
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--hauteur-bottom-nav)+0.75rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:items-end lg:px-0"
      >
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            toast={t}
            onFermer={() => retirer(t.id)}
            onAction={() => {
              t.action?.onClick()
              retirer(t.id, false)
            }}
            onSuspendre={() => suspendre(t.id)}
            onReprendre={() => reprendre(t.id, t.type)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({
  toast,
  onFermer,
  onAction,
  onSuspendre,
  onReprendre,
}: {
  toast: Toast
  onFermer: () => void
  onAction: () => void
  onSuspendre: () => void
  onReprendre: () => void
}) {
  return (
    <div
      onMouseEnter={onSuspendre}
      onMouseLeave={onReprendre}
      onFocus={onSuspendre}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) onReprendre()
      }}
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-2xl px-4 py-3 shadow-card motion-reduce:animate-none ${
        toast.enSortie ? 'toast-sortie' : 'toast-entree'
      } ${STYLE_PAR_TYPE[toast.type]}`}
    >
      <p className="min-w-0 flex-1 wrap-anywhere text-[13.5px] font-medium leading-snug">{toast.message}</p>
      {toast.action && (
        // Cible 44 px comme le bouton Fermer ; marge négative = padding
        // vertical du conteneur pour ne pas épaissir la carte.
        <button
          type="button"
          onClick={onAction}
          className="-my-3 flex min-h-11 shrink-0 items-center rounded-full px-3 text-[13.5px] font-bold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          {toast.action.libelle}
        </button>
      )}
      <button
        type="button"
        onClick={onFermer}
        aria-label="Fermer"
        // Cible tactile 44 px sans agrandir la carte : marges négatives
        // égales au padding du conteneur (px-4 py-3 ci-dessus), même
        // principe que LienRetour (voir son commentaire).
        className="-my-3 -mr-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-current opacity-70 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast doit être utilisé à l’intérieur d’un ToastProvider')
  return ctx.toast
}
