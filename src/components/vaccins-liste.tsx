'use client'

import { useId, useMemo, useState } from 'react'
import type { StatutVaccin, Vaccin } from '@/lib/data/vaccins'
import { formatDateCourte } from '@/lib/dates'
import { IconVaccin } from '@/components/nav-icons'
import { normaliser } from '@/lib/normaliser'

const BADGES_STATUT: Record<StatutVaccin, { label: string; className: string }> = {
  obligatoire: { label: 'Obligatoire', className: 'bg-primary-soft text-primary' },
  'recommandé': { label: 'Recommandé', className: 'bg-accent-soft text-accent' },
}

type FiltreStatut = StatutVaccin | 'tous'

const FILTRES: { value: FiltreStatut; label: string }[] = [
  { value: 'tous', label: 'Tous' },
  { value: 'obligatoire', label: 'Obligatoire' },
  { value: 'recommandé', label: 'Recommandé' },
]

// Repère la sous-chaîne correspondant à `rechercheNormalisee` dans `texte` en
// comparant sur la version normalisée (accents/casse ignorés, cf.
// normaliser()), puis surligne la portion équivalente du texte ORIGINAL.
// Fiable pour du texte français : normaliser() ne change jamais la longueur
// des caractères qu'on utilise ici (é/è/à/ç -> 1 caractère ASCII, pas de
// ligature), donc les indices trouvés dans la version normalisée
// s'appliquent tels quels au texte d'origine.
function surligner(texte: string, rechercheNormalisee: string): React.ReactNode {
  if (!rechercheNormalisee) return texte
  const index = normaliser(texte).indexOf(rechercheNormalisee)
  if (index === -1) return texte

  const fin = index + rechercheNormalisee.length
  return (
    <>
      {texte.slice(0, index)}
      <mark className="rounded-sm bg-accent-soft px-0.5 font-bold text-ink">{texte.slice(index, fin)}</mark>
      {texte.slice(fin)}
    </>
  )
}

function IconLoupe({ className }: { className?: string }) {
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
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function IconCroix({ className }: { className?: string }) {
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
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  )
}

function IconChevron({ className }: { className?: string }) {
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
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function IconCalendrier({ className }: { className?: string }) {
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
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M3 9.5h18" />
      <path d="M8 2.5v4M16 2.5v4" />
    </svg>
  )
}

function IconPrescripteur({ className }: { className?: string }) {
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
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.2-4 4-6 7.5-6s6.3 2 7.5 6" />
    </svg>
  )
}

// Remplace le glyphe « € » dans la pastille Remboursement (icônes dessinées en trait, cf. DESIGN.md).
function IconEuro({ className }: { className?: string }) {
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
      <path d="M18 6.5A7 7 0 1 0 18 17.5" />
      <path d="M4 10h10M4 14h10" />
    </svg>
  )
}

function IconAlerte({ className }: { className?: string }) {
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
      <path d="M12 3 2 20h20L12 3Z" />
      <path d="M12 10v4" />
      <path d="M12 17.5h.01" />
    </svg>
  )
}

const CLASSE_FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

function LigneInfo({
  icone,
  label,
  texte,
  classesIcone,
}: {
  icone: React.ReactNode
  label: string
  texte: string
  classesIcone: string
}) {
  return (
    <div className="flex gap-2.5 py-2 first:pt-0 last:pb-0">
      <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${classesIcone}`}>
        {icone}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-bold uppercase tracking-wide text-muted">{label}</div>
        <p className="mt-0.5 text-pretty text-[13px] leading-relaxed text-ink">{texte}</p>
      </div>
    </div>
  )
}

function CarteVaccin({ v, rechercheNormalisee }: { v: Vaccin; rechercheNormalisee: string }) {
  const [ouvert, setOuvert] = useState(false)
  const idDetails = useId()
  const badge = BADGES_STATUT[v.statut]

  return (
    <div className="flex flex-col rounded-[20px] bg-surface shadow-card p-3.5">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        aria-controls={idDetails}
        className={`-m-1 flex min-h-11 items-center justify-between gap-2 rounded-xl p-1 text-left ${CLASSE_FOCUS}`}
      >
        <div className="min-w-0 flex-1 text-balance text-[14.5px] font-semibold text-ink">
          {surligner(v.nom_commercial, rechercheNormalisee)}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[12px] font-bold ${badge.className}`}>{badge.label}</span>
          <IconChevron
            className={`h-4 w-4 text-muted motion-safe:transition-transform motion-safe:duration-200 ${ouvert ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {v.valences.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {v.valences.map((valence) => (
            <span
              key={valence}
              className="rounded-full bg-neutral-soft px-2 py-0.5 text-[12px] font-medium text-muted"
            >
              {surligner(valence, rechercheNormalisee)}
            </span>
          ))}
        </div>
      )}

      <div
        id={idDetails}
        inert={!ouvert}
        className={`grid motion-safe:transition-[grid-template-rows] motion-safe:duration-200 motion-safe:ease-out ${ouvert ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
         <div className="mt-2.5">
          <div className="flex flex-col divide-y divide-border pt-2.5">
            <LigneInfo
              icone={<IconCalendrier className="h-3.5 w-3.5" />}
              label="Schéma vaccinal"
              texte={v.schema_vaccinal}
              classesIcone="bg-primary-soft text-primary"
            />
            <LigneInfo
              icone={<IconPrescripteur className="h-3.5 w-3.5" />}
              label="Conditions de prescription"
              texte={v.conditions_prescription}
              classesIcone="bg-accent-soft text-accent"
            />
            <LigneInfo
              icone={<IconEuro className="h-3.5 w-3.5" />}
              label="Remboursement"
              texte={v.remboursement}
              classesIcone="bg-neutral-soft text-muted"
            />
          </div>

          {v.cas_particuliers && (
            <div className="mt-2.5 rounded-xl bg-rec-soft px-3 py-2">
              <div className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-rec">
                <IconAlerte className="h-3 w-3" />
                Cas particuliers
              </div>
              <p className="mt-0.5 text-pretty text-[12.5px] leading-relaxed text-ink">{v.cas_particuliers}</p>
            </div>
          )}

          <div className="mt-2.5 text-[12px] text-muted">
            {v.source} · MAJ {formatDateCourte(v.date_maj)}
          </div>
         </div>
        </div>
      </div>
    </div>
  )
}

function EtatVide({ message, onEffacer }: { message: string; onEffacer?: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-soft text-muted">
        <IconVaccin className="h-6 w-6" />
      </div>
      <p className="max-w-[220px] text-sm text-muted">{message}</p>
      {onEffacer && (
        <button
          type="button"
          onClick={onEffacer}
          className={`min-h-11 rounded-xl border border-border px-4 text-[13px] font-semibold text-primary ${CLASSE_FOCUS}`}
        >
          Effacer les filtres
        </button>
      )}
    </div>
  )
}

export function VaccinsListe({ vaccins }: { vaccins: Vaccin[] }) {
  const [recherche, setRecherche] = useState('')
  const [filtreStatut, setFiltreStatut] = useState<FiltreStatut>('tous')

  const rechercheNormalisee = normaliser(recherche.trim())

  const comptes = useMemo(() => {
    const c: Record<FiltreStatut, number> = { tous: vaccins.length, obligatoire: 0, 'recommandé': 0 }
    vaccins.forEach((v) => {
      c[v.statut] += 1
    })
    return c
  }, [vaccins])

  const visibles = useMemo(() => {
    return vaccins
      .filter((v) => filtreStatut === 'tous' || v.statut === filtreStatut)
      .filter(
        (v) =>
          !rechercheNormalisee ||
          normaliser(v.nom_commercial).includes(rechercheNormalisee) ||
          v.valences.some((valence) => normaliser(valence).includes(rechercheNormalisee))
      )
  }, [vaccins, rechercheNormalisee, filtreStatut])

  return (
    <div className="flex flex-1 flex-col gap-3">
      {/* Marge compensée : l'anneau de focus des filtres n'est pas rogné par le défilement horizontal. */}
      <div className="-m-1 flex gap-1.5 overflow-x-auto p-1">
        {FILTRES.map((f) => (
          <button
            type="button"
            key={f.value}
            onClick={() => setFiltreStatut(f.value)}
            aria-pressed={filtreStatut === f.value}
            className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold ${CLASSE_FOCUS} ${
              filtreStatut === f.value
                ? 'border-primary bg-primary text-white'
                : 'border-border bg-surface text-muted'
            }`}
          >
            {f.label}
            <span
              className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[12px] font-bold tabular-nums ${
                filtreStatut === f.value ? 'bg-white/20 text-white' : 'bg-neutral-soft text-muted'
              }`}
            >
              {comptes[f.value]}
            </span>
          </button>
        ))}
      </div>

      <div className="relative">
        <IconLoupe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Nom du vaccin ou maladie…"
          aria-label="Rechercher un vaccin par nom commercial ou indication"
          className={`w-full rounded-xl border border-champ-bord bg-bg py-2.5 pl-9 pr-9 text-[16px] text-ink focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary`}
        />
        {recherche.length > 0 && (
          <button
            type="button"
            onClick={() => setRecherche('')}
            aria-label="Effacer la recherche"
            className={`absolute -right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center ${CLASSE_FOCUS}`}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-soft text-muted">
              <IconCroix className="h-3 w-3" />
            </span>
          </button>
        )}
      </div>

      {vaccins.length === 0 && <EtatVide message="Aucun vaccin référencé pour le moment." />}

      {vaccins.length > 0 && visibles.length === 0 && (
        <EtatVide
          message="Aucun vaccin ne correspond à cette recherche."
          onEffacer={() => {
            setRecherche('')
            setFiltreStatut('tous')
          }}
        />
      )}

      {vaccins.length > 0 && (
        <p role="status" className="sr-only">
          {visibles.length === 0
            ? 'Aucun vaccin'
            : `${visibles.length} vaccin${visibles.length > 1 ? 's' : ''} affiché${visibles.length > 1 ? 's' : ''}`}
        </p>
      )}

      <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-3">
        {visibles.map((v) => (
          <CarteVaccin key={v.id} v={v} rechercheNormalisee={rechercheNormalisee} />
        ))}
      </div>
    </div>
  )
}
