import Link from 'next/link'
import type { ComponentType } from 'react'

type Props = {
  href: string
  Icone: ComponentType<{ className?: string }>
  // Paire de classes `bg-*-soft text-*` de la pastille d'icône (voir DESIGN.md).
  couleur: string
  titre: string
  // Sous-titre chiffré. Absent : la tuile garde sa hauteur avec un espace insécable.
  detail?: string
  // Le chargement de la donnée a échoué : texte explicite plutôt qu'un tiret muet.
  indisponible?: boolean
}

// Tuile d'accès à un module sur l'accueil : pastille d'icône, titre, sous-titre.
export function TuileModule({ href, Icone, couleur, titre, detail, indisponible }: Props) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-3.5 rounded-[20px] bg-surface p-3.5 shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(155deg,rgba(255,255,255,.45),rgba(255,255,255,0)_60%)] ${couleur}`}
      >
        <Icone className="h-[18px] w-[18px]" />
      </div>
      <div>
        <div className="text-[13.5px] font-semibold text-ink">{titre}</div>
        <div className="mt-0.5 text-[12px] text-muted">{indisponible ? 'Indisponible' : (detail ?? ' ')}</div>
      </div>
    </Link>
  )
}
