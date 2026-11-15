'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MODULES_SECONDAIRES, NAV_ITEMS, estLienActif } from '@/lib/nav-items'
import { demarrerNavigation } from '@/lib/navigation-en-cours'
import { OfficineSwitcher } from '@/components/officine-switcher'
import { SwitchIdentite } from '@/components/switch-identite'
import { NotificationsCloche } from '@/components/notifications-cloche'
import { IconAccueil, IconAgenda, IconCarnet, IconDocuments, IconLiaison } from '@/components/nav-icons'
import { signOut } from '@/app/actions/auth'
import type { Adhesion } from '@/lib/data/adhesions'
import type { CouleurAvatar } from '@/lib/data/couleurs-membres'

const ICONES: Record<string, React.ComponentType<{ className?: string }>> = {
  '/': IconAccueil,
  '/liaison': IconLiaison,
  '/agenda': IconAgenda,
  '/documents': IconDocuments,
  '/carnet': IconCarnet,
}

// Source unique : NAV_ITEMS (entrées principales) + MODULES_SECONDAIRES (section
// « Modules »), comme la bottom nav et le panneau « Plus » mobiles. Les modules
// déjà présents dans les entrées principales (Carnet) ne sont pas répétés.
const HREFS_PRINCIPAUX = new Set(NAV_ITEMS.map((item) => item.href))
const MODULES = MODULES_SECONDAIRES.filter((m) => !HREFS_PRINCIPAUX.has(m.href))

const CLASSE_LIEN =
  'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

function classeLien(actif: boolean, poids: 'font-semibold' | 'font-medium' = 'font-semibold') {
  return `${CLASSE_LIEN} ${poids} ${actif ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-neutral-soft hover:text-ink'}`
}

export function SidebarNav({
  adhesions,
  officineActiveId,
  profilActuel,
  couleurProfilActuel,
}: {
  adhesions: Adhesion[]
  officineActiveId: string
  profilActuel: { id: string; nom_complet: string; initiales: string } | null
  couleurProfilActuel: CouleurAvatar
}) {
  const pathname = usePathname()
  const navRef = useRef<HTMLElement>(null)

  // La liste des modules défile dans la sidebar : amène le lien actif dans la
  // zone visible (sinon /vaccins, /notes… resteraient hors champ sur écran bas).
  useEffect(() => {
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' })
  }, [pathname])

  return (
    <aside className="hidden shrink-0 flex-col border-r border-border bg-surface px-4 py-6 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-60 lg:overflow-y-auto print:hidden">
      <div className="flex items-start gap-2">
        <OfficineSwitcher adhesions={adhesions} officineActiveId={officineActiveId} />
        <NotificationsCloche />
      </div>

      <nav ref={navRef} aria-label="Navigation principale" className="mt-6 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const actif = estLienActif(item.href, pathname)
          const Icone = ICONES[item.href]
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={actif ? 'page' : undefined}
              onClick={() => demarrerNavigation(item.href)}
              // Prefetch par défaut, y compris sur /, /liaison et /agenda : ces pages sont
              // dynamiques avec un loading.tsx, donc Next ne préchauffe que le squelette
              // (staleTimes.dynamic à 0) et les données restent chargées à chaque tap.
              className={classeLien(actif)}
            >
              <Icone className="h-[18px] w-[18px] shrink-0" />
              {item.label}
            </Link>
          )
        })}

        <p className="mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-muted">Modules</p>
        {MODULES.map(({ href, label, icone: Icone }) => {
          const actif = estLienActif(href, pathname)
          return (
            <Link
              key={href}
              href={href}
              prefetch={href === '/activite' ? false : undefined}
              aria-current={actif ? 'page' : undefined}
              onClick={() => demarrerNavigation(href)}
              className={classeLien(actif, 'font-medium')}
            >
              <Icone className="h-[18px] w-[18px] shrink-0" />
              <span className="leading-snug">{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-2 flex shrink-0 flex-col gap-1 border-t border-border pt-4">
        {profilActuel && (
          <SwitchIdentite
            profilActuelId={profilActuel.id}
            nomComplet={profilActuel.nom_complet}
            initiales={profilActuel.initiales}
            couleurProfilActuel={couleurProfilActuel}
          />
        )}
        <Link
          href="/inviter"
          aria-current={estLienActif('/inviter', pathname) ? 'page' : undefined}
          onClick={() => demarrerNavigation('/inviter')}
          className={classeLien(estLienActif('/inviter', pathname))}
        >
          Mon équipe
        </Link>
        <Link
          href="/profil"
          aria-current={estLienActif('/profil', pathname) ? 'page' : undefined}
          onClick={() => demarrerNavigation('/profil')}
          className={classeLien(estLienActif('/profil', pathname))}
        >
          Profil
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-3 text-left text-sm font-semibold text-muted hover:bg-neutral-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Se déconnecter
          </button>
        </form>
      </div>
    </aside>
  )
}
