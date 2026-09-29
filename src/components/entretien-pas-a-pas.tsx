'use client'

import { useEffect, useId, useRef, useState, useTransition, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { creerEntreeJournal } from '@/app/actions/entretien-journal'
import type { ItemEntretien } from '@/lib/data/entretiens'
import { LigneItem } from '@/components/entretien-ligne-item'
import {
  CLASSE_BOUTON_PRIMAIRE,
  CLASSE_BOUTON_SECONDAIRE,
  CLASSE_CHAMP,
  CLASSE_FOCUS,
  Icone,
} from '@/components/entretien-ui'
import {
  CLE_GROUPE_GENERAL,
  compterCoches,
  groupeTermine,
  type GroupeScript,
} from '@/components/entretien-script-etat'
import { useToast } from '@/components/ui/toast-provider'

const SELECTEUR_FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Date locale du jour au format AAAA-MM-JJ (celui de <input type="date">).
function dateDuJour(): string {
  const d = new Date()
  const mois = String(d.getMonth() + 1).padStart(2, '0')
  const jour = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mois}-${jour}`
}

// Mode pas à pas : une phase du script à la fois, en plein écran, pour suivre
// l'entretien en direct. L'état coché est celui du mode Entretien (porté par
// EntretienDetail, en mémoire uniquement) : la vue liste et le pas à pas
// restent synchronisés. « Suivant » n'est jamais bloqué : un item non
// applicable au patient ne doit pas empêcher d'avancer.
export function EntretienPasAPas({
  groupes,
  coches,
  onChangerCoches,
  typeEntretienId,
  nomType,
  onQuitter,
}: {
  groupes: GroupeScript[]
  coches: ReadonlySet<string>
  onChangerCoches: (coches: ReadonlySet<string>) => void
  typeEntretienId: string
  nomType: string
  onQuitter: () => void
}) {
  const [index, setIndex] = useState(() => {
    const premier = groupes.findIndex((g) => !groupeTermine(g, coches))
    return premier < 0 ? 0 : premier
  })
  const [ecranFin, setEcranFin] = useState(false)
  const [patientNom, setPatientNom] = useState('')
  const [dateEntretien, setDateEntretien] = useState(dateDuJour)
  const [enregistre, setEnregistre] = useState(false)
  const [isPending, startTransition] = useTransition()
  const toast = useToast()

  const idTitre = useId()
  const idNom = useId()
  const idDate = useId()
  const conteneurRef = useRef<HTMLDivElement>(null)
  const titreRef = useRef<HTMLHeadingElement>(null)

  const groupe = groupes[index]
  const derniere = index === groupes.length - 1
  const total = groupes.reduce((n, g) => n + g.items.length, 0)
  const items: ItemEntretien[] = groupes.flatMap((g) => g.items)
  const nbCoches = compterCoches(items, coches)
  const nbNonCochesPhase = groupe ? groupe.items.length - compterCoches(groupe.items, coches) : 0
  const titrePhase = groupe
    ? groupes.length === 1 && groupe.cle === CLE_GROUPE_GENERAL
      ? 'Script de l’entretien'
      : groupe.titre
    : ''

  // Plein écran : la page derrière ne défile pas ; le focus va sur le titre de
  // la phase à chaque changement d'écran (lecteur d'écran et clavier).
  useEffect(() => {
    const precedent = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = precedent
    }
  }, [])

  useEffect(() => {
    titreRef.current?.focus()
    conteneurRef.current?.querySelector<HTMLElement>('[data-defilement]')?.scrollTo({ top: 0 })
  }, [index, ecranFin])

  function basculerItem(item: ItemEntretien) {
    const apres = new Set(coches)
    if (apres.has(item.id)) apres.delete(item.id)
    else apres.add(item.id)
    onChangerCoches(apres)
  }

  function suivant() {
    if (derniere) setEcranFin(true)
    else setIndex(index + 1)
  }

  function precedent() {
    if (ecranFin) setEcranFin(false)
    else if (index > 0) setIndex(index - 1)
  }

  function surKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      onQuitter()
      return
    }

    if (e.key === 'Tab') {
      // Piège à focus : Tab et Maj+Tab restent dans le plein écran.
      const focusables = Array.from(conteneurRef.current?.querySelectorAll<HTMLElement>(SELECTEUR_FOCUSABLE) ?? [])
      if (focusables.length === 0) return
      const premier = focusables[0]
      const dernier = focusables[focusables.length - 1]
      const actif = document.activeElement
      if (e.shiftKey && (actif === premier || actif === titreRef.current)) {
        e.preventDefault()
        dernier.focus()
      } else if (!e.shiftKey && actif === dernier) {
        e.preventDefault()
        premier.focus()
      }
      return
    }

    // Flèches : changer de phase, sauf dans un champ de saisie (curseur de
    // texte, date) où elles gardent leur rôle.
    const cible = e.target as HTMLElement
    if (cible.tagName === 'INPUT' && (cible as HTMLInputElement).type !== 'checkbox') return
    if (cible.tagName === 'TEXTAREA' || cible.tagName === 'SELECT') return
    if (e.key === 'ArrowRight' && !ecranFin) {
      e.preventDefault()
      suivant()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      precedent()
    }
  }

  function enregistrerAuJournal() {
    const nom = patientNom.trim()
    if (!nom || !dateEntretien) return
    const formData = new FormData()
    formData.set('type_entretien_id', typeEntretienId)
    formData.set('patient_nom', nom)
    formData.set('date_entretien', dateEntretien)
    startTransition(async () => {
      try {
        await creerEntreeJournal(formData)
        setEnregistre(true)
        toast({ type: 'succes', message: 'Entretien ajouté au journal.' })
      } catch (err) {
        toast({ type: 'erreur', message: err instanceof Error ? err.message : 'Échec de l’enregistrement.' })
      }
    })
  }

  if (!groupe) return null

  const contenu = (
    <div
      ref={conteneurRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={idTitre}
      onKeyDown={surKeyDown}
      className="fixed inset-0 z-50 flex flex-col bg-bg"
    >
      <header className="flex shrink-0 flex-col gap-2 border-b border-border bg-surface px-4 pb-3 pt-3 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-[13px] font-semibold text-muted">{nomType}</p>
          <button
            type="button"
            onClick={onQuitter}
            className={`flex min-h-11 shrink-0 items-center rounded-xl border border-border bg-surface px-3.5 text-[13px] font-semibold text-ink ${CLASSE_FOCUS}`}
          >
            Quitter
          </button>
        </div>
        <div className="flex items-center gap-3">
          <p className="shrink-0 text-[13px] font-semibold tabular-nums text-ink">
            {ecranFin ? 'Terminé' : `Phase ${index + 1} / ${groupes.length}`}
          </p>
          <div aria-hidden="true" className="flex min-w-0 flex-1 gap-1">
            {groupes.map((g, i) => (
              <span
                key={g.cle}
                className={`h-2 min-w-0 flex-1 rounded-full ${
                  groupeTermine(g, coches) ? 'bg-green' : !ecranFin && i === index ? 'bg-primary' : 'bg-track'
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      <p role="status" aria-live="polite" className="sr-only">
        {ecranFin ? 'Fin du script.' : `Phase ${index + 1} sur ${groupes.length} : ${titrePhase}`}
      </p>

      <div data-defilement className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-8">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
          {!ecranFin ? (
            <>
              <h2
                id={idTitre}
                ref={titreRef}
                tabIndex={-1}
                className="text-[20px] font-bold leading-snug text-ink focus:outline-none"
              >
                {titrePhase}
              </h2>
              <ul className="flex flex-col gap-2">
                {groupe.items.map((item) => (
                  <li key={item.id}>
                    <LigneItem item={item} coche={coches.has(item.id)} onBasculer={() => basculerItem(item)} />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <h2
                id={idTitre}
                ref={titreRef}
                tabIndex={-1}
                className="text-[20px] font-bold leading-snug text-ink focus:outline-none"
              >
                Entretien terminé
              </h2>
              <p
                className={`flex items-center gap-2 rounded-xl px-3 py-3 text-sm text-ink ${
                  nbCoches === total ? 'bg-green-soft' : 'bg-neutral-soft'
                }`}
              >
                {nbCoches === total && <Icone nom="coche" taille={18} className="text-green" />}
                {nbCoches} / {total} étapes cochées.
              </p>
              {nbCoches < total && (
                <p className="text-[13px] leading-relaxed text-muted">
                  {total - nbCoches} étape{total - nbCoches > 1 ? 's' : ''} non cochée
                  {total - nbCoches > 1 ? 's' : ''} : vous pouvez revenir en arrière pour les compléter.
                </p>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  enregistrerAuJournal()
                }}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3.5"
              >
                <h3 className="text-[15px] font-bold text-ink">Enregistrer dans le journal</h3>
                <p className="text-[13px] leading-relaxed text-muted">
                  Seuls le nom du patient, la date et le type d’entretien ({nomType}) sont conservés.
                </p>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={idNom} className="text-[13px] font-semibold text-muted">
                    Nom du patient
                  </label>
                  <input
                    id={idNom}
                    value={patientNom}
                    onChange={(e) => setPatientNom(e.target.value)}
                    autoComplete="off"
                    disabled={enregistre}
                    className={CLASSE_CHAMP}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={idDate} className="text-[13px] font-semibold text-muted">
                    Date de l’entretien
                  </label>
                  <input
                    id={idDate}
                    type="date"
                    value={dateEntretien}
                    onChange={(e) => setDateEntretien(e.target.value)}
                    disabled={enregistre}
                    className={CLASSE_CHAMP}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isPending || enregistre || !patientNom.trim() || !dateEntretien}
                  className={CLASSE_BOUTON_PRIMAIRE}
                >
                  {enregistre ? 'Enregistré' : isPending ? 'Enregistrement…' : 'Enregistrer dans le journal'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <footer className="shrink-0 border-t border-border bg-surface px-4 py-3 sm:px-8">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
          {!ecranFin && nbNonCochesPhase > 0 && (
            <p className="text-[13px] text-muted">
              {nbNonCochesPhase} étape{nbNonCochesPhase > 1 ? 's' : ''} non cochée{nbNonCochesPhase > 1 ? 's' : ''} dans
              cette phase : vous pouvez continuer.
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={precedent}
              disabled={!ecranFin && index === 0}
              className={`${CLASSE_BOUTON_SECONDAIRE} min-h-14 flex-1`}
            >
              Précédent
            </button>
            {ecranFin ? (
              <button type="button" onClick={onQuitter} className={`${CLASSE_BOUTON_PRIMAIRE} min-h-14 flex-1`}>
                Fermer
              </button>
            ) : (
              <button type="button" onClick={suivant} className={`${CLASSE_BOUTON_PRIMAIRE} min-h-14 flex-1`}>
                {derniere ? 'Terminer' : 'Suivant'}
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  )

  return createPortal(contenu, document.body)
}
