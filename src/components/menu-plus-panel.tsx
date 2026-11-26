'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MODULES_SECONDAIRES, deriveDirectionNav } from '@/lib/nav-items'
import { useFermerAvecRetour } from '@/lib/use-fermer-avec-retour'
import { usePiegeFocus } from '@/lib/use-piege-focus'
import { demarrerNavigation } from '@/lib/navigation-en-cours'

/**
 * Panneau remontant du bas listant les modules secondaires (accessibles
 * seulement depuis les tuiles de l'accueil sur mobile, plus Carnet) — même
 * pattern visuel que ModaleConfirmation : fixed inset-0 + fond noir semi-
 * transparent, contenu ancré en bas sur mobile. Même traitement d'accessi-
 * bilité que ModaleConfirmation (piège à focus, verrouillage du scroll,
 * retour du focus au déclencheur), voir son commentaire pour le détail.
 */
export function MenuPlusPanel({ ouvert, onFermer }: { ouvert: boolean; onFermer: () => void }) {
  const pathname = usePathname()
  const signalerNavigation = useFermerAvecRetour(ouvert, onFermer)
  const panneauRef = useRef<HTMLDivElement>(null)

  usePiegeFocus(ouvert, panneauRef)

  if (!ouvert) return null

  return (
    <div
      className="overlay-entree fixed inset-0 z-50 flex items-end justify-center overscroll-contain bg-black/40 sm:items-center"
      onClick={onFermer}
    >
      <div
        ref={panneauRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="menu-plus-panel-titre"
        onClick={(e) => e.stopPropagation()}
        className="panneau-entree flex max-h-[92dvh] w-full flex-col gap-3 overflow-y-auto overscroll-contain rounded-t-[20px] bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-card sm:max-h-[80dvh] sm:w-96 sm:rounded-[20px]"
      >
        {/* Titre de sheet en font-heading text-lg, comme la sheet du FAB
            (DESIGN.md, Typography). Bouton Fermer explicite : sans lui, la
            sheet ne se refermait qu'au tap sur le fond, à Échap ou au
            retour physique — aucun de ces gestes n'est annoncé par un
            lecteur d'écran. Cercle visible de 36 px, cible de 44 px via
            -m-1 + p-1 (même motif que la cloche de notifications). */}
        <div className="flex items-center justify-between gap-2">
          <h2 id="menu-plus-panel-titre" className="font-heading text-lg font-semibold text-ink">
            Autres modules
          </h2>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer"
            className="-m-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full p-1 text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-soft">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {MODULES_SECONDAIRES.map((module) => {
            const Icone = module.icone
            const direction = deriveDirectionNav(pathname, module.href)
            return (
              <Link
                key={module.href}
                href={module.href}
                onClick={() => {
                  // Signal visuel immédiat au tap (voir IndicateurNavigation
                  // dans layout.tsx), même mécanisme que bottom-nav.tsx.
                  demarrerNavigation(module.href)
                  signalerNavigation()
                  onFermer()
                }}
                // Sens du slide de page-view-transition.tsx (voir
                // deriveDirectionNav) : les modules secondaires partagent
                // tous l'ordinal de Carnet/Plus, donc "avance" depuis
                // n'importe quel autre onglet de la bottom nav.
                transitionTypes={direction ? [direction] : undefined}
                className="flex flex-col gap-3.5 rounded-[20px] bg-surface p-3.5 shadow-card hover:bg-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <div
                  aria-hidden="true"
                  className={`flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(155deg,rgba(255,255,255,.45),rgba(255,255,255,0)_60%)] ${module.couleurFond} ${module.couleurTexte}`}
                >
                  <Icone className="h-[18px] w-[18px]" />
                </div>
                <div className="text-[13.5px] font-semibold text-ink">{module.label}</div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
