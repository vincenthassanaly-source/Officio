'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { chargerPageJournal } from '@/app/actions/journal-activite'
import type { EntreeJournal, ModuleJournal, PageJournalActivite } from '@/lib/data/journal-activite'
import type { MembreEquipe } from '@/lib/data/equipe'
import { formatDateRelative } from '@/lib/dates'
import { regrouperParJour } from '@/lib/journal-regroupement'
import { COULEUR_PAR_DEFAUT } from '@/lib/avatar-couleur'
import type { CouleurAvatar } from '@/lib/data/couleurs-membres'
import { useToast } from '@/components/ui/toast-provider'
import { CHAMP_CLASS } from '@/components/ui/champ'

const MEMBRE_TOUS = 'tous'

export function JournalActivite({
  pageInitiale,
  modules,
  membres,
  couleurs,
}: {
  pageInitiale: PageJournalActivite
  modules: { value: ModuleJournal; label: string }[]
  membres: MembreEquipe[]
  couleurs: Map<string, CouleurAvatar>
}) {
  const router = useRouter()
  const [entrees, setEntrees] = useState(pageInitiale.entrees)
  const [curseurSuivant, setCurseurSuivant] = useState(pageInitiale.curseurSuivant)
  const [modulesSelectionnes, setModulesSelectionnes] = useState<Set<ModuleJournal>>(new Set())
  const [membreSelectionne, setMembreSelectionne] = useState(MEMBRE_TOUS)
  const [isPending, startTransition] = useTransition()
  const [rechargementFiltres, setRechargementFiltres] = useState(false)
  const toast = useToast()
  // Compteur de requête : une réponse qui n'est plus la dernière lancée est ignorée.
  const requeteRef = useRef(0)

  // `rechargementFiltres` distingue un changement de filtre (la liste
  // affichée devient périmée, il faut le montrer) d'un « Charger plus » (la
  // liste reste valide, seul le bouton attend). Sans ça, le même isPending
  // aurait grisé toute la liste dans les deux cas.
  function recharger(modulesActifs: Set<ModuleJournal>, membreActif: string) {
    const requete = ++requeteRef.current
    setRechargementFiltres(true)
    startTransition(async () => {
      try {
        const page = await chargerPageJournal({
          module: modulesActifs.size > 0 ? Array.from(modulesActifs) : undefined,
          profilId: membreActif !== MEMBRE_TOUS ? membreActif : undefined,
        })
        if (requete !== requeteRef.current) return
        setEntrees(page.entrees)
        setCurseurSuivant(page.curseurSuivant)
        setRechargementFiltres(false)
      } catch {
        if (requete !== requeteRef.current) return
        setRechargementFiltres(false)
        toast({ type: 'erreur', message: "Impossible de charger l'activité. Réessaie." })
      }
    })
  }

  function toggleModule(module: ModuleJournal) {
    const suivant = new Set(modulesSelectionnes)
    if (suivant.has(module)) suivant.delete(module)
    else suivant.add(module)
    setModulesSelectionnes(suivant)
    recharger(suivant, membreSelectionne)
  }

  function changerMembre(profilId: string) {
    setMembreSelectionne(profilId)
    recharger(modulesSelectionnes, profilId)
  }

  function chargerPlus() {
    if (!curseurSuivant) return
    const requete = ++requeteRef.current
    startTransition(async () => {
      try {
        const page = await chargerPageJournal({
          module: modulesSelectionnes.size > 0 ? Array.from(modulesSelectionnes) : undefined,
          profilId: membreSelectionne !== MEMBRE_TOUS ? membreSelectionne : undefined,
          curseurAvant: curseurSuivant,
        })
        if (requete !== requeteRef.current) return
        setEntrees((prev) => [...prev, ...page.entrees])
        setCurseurSuivant(page.curseurSuivant)
      } catch {
        if (requete !== requeteRef.current) return
        toast({ type: 'erreur', message: "Impossible de charger l'activité. Réessaie." })
      }
    })
  }

  // Ramène la pastille active dans la vue de la rangée défilante.
  const rangeeRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const rangee = rangeeRef.current
    const actif = rangee?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!rangee || !actif) return
    const cible = actif.offsetLeft - (rangee.clientWidth - actif.offsetWidth) / 2
    rangee.scrollTo({ left: Math.max(0, cible), behavior: 'smooth' })
  }, [modulesSelectionnes])

  const groupes = useMemo(() => regrouperParJour(entrees), [entrees])

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* py-1 compensé par -my-1 sur le conteneur qui défile (règle de la
          compensation négative) : l'anneau de focus des pastilles n'est plus
          rogné en haut/bas par l'overflow. */}
      <div
        ref={rangeeRef}
        role="group"
        aria-label="Filtrer par module"
        className="-my-1 flex snap-x gap-1.5 overflow-x-auto py-1 pl-0.5 pr-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,#000_calc(100%-28px),transparent)]"
      >
        {modules.map((m) => {
          const actif = modulesSelectionnes.has(m.value)
          return (
            <button
              type="button"
              key={m.value}
              onClick={() => toggleModule(m.value)}
              aria-pressed={actif}
              className={`flex min-h-11 shrink-0 snap-start items-center rounded-full border px-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                actif ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-muted'
              }`}
            >
              {m.label}
            </button>
          )
        })}
      </div>

      {membres.length > 0 && (
        <>
          <label htmlFor="membre-journal-activite" className="sr-only">
            Filtrer par membre de l&rsquo;équipe
          </label>
          <select
            id="membre-journal-activite"
            value={membreSelectionne}
            onChange={(e) => changerMembre(e.target.value)}
            className={`w-full max-w-xs ${CHAMP_CLASS}`}
          >
            <option value={MEMBRE_TOUS}>Toute l&rsquo;équipe</option>
            {membres.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nom_complet}
              </option>
            ))}
          </select>
        </>
      )}

      {entrees.length === 0 ? (
        <p aria-busy={rechargementFiltres} className="py-8 text-center text-[13px] text-muted">
          {rechargementFiltres
            ? 'Chargement…'
            : modulesSelectionnes.size > 0 || membreSelectionne !== MEMBRE_TOUS
              ? 'Aucune activité ne correspond à ces filtres.'
              : 'Aucune activité pour le moment.'}
        </p>
      ) : (
        <div
          aria-busy={rechargementFiltres}
          className={`flex flex-col gap-5 transition-opacity duration-200 ${
            rechargementFiltres ? 'opacity-40' : 'opacity-100'
          }`}
        >
          {groupes.map((groupe) => (
            <div key={groupe.cle} className="flex flex-col gap-2">
              <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted">{groupe.label}</h2>
              <div className="flex flex-col gap-2">
                {groupe.entrees.map((entree) => (
                  <EntreeJournalItem
                    key={entree.id}
                    entree={entree}
                    couleur={
                      entree.auteur ? (couleurs.get(entree.auteur.id) ?? COULEUR_PAR_DEFAUT) : COULEUR_PAR_DEFAUT
                    }
                    onOuvrir={() => entree.url && router.push(entree.url)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {curseurSuivant && (
        // aria-disabled + garde plutôt que `disabled` : le bouton garde le
        // focus clavier pendant le chargement de la page suivante.
        <button
          type="button"
          aria-disabled={isPending}
          aria-busy={isPending}
          onClick={() => {
            if (!isPending) chargerPlus()
          }}
          className="min-h-11 self-center rounded-full border border-border bg-surface px-4 py-2 text-[13px] font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-disabled:opacity-60"
        >
          {isPending ? 'Chargement…' : 'Charger plus'}
        </button>
      )}
    </div>
  )
}

function EntreeJournalItem({
  entree,
  couleur,
  onOuvrir,
}: {
  entree: EntreeJournal
  couleur: CouleurAvatar
  onOuvrir: () => void
}) {
  const contenu = (
    <>
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${couleur.fond} ${couleur.texte}`}
      >
        {entree.auteur?.initiales ?? '·'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 wrap-anywhere text-[13.5px] font-semibold text-ink">{entree.titre}</p>
        <p className="text-[12px] text-muted">{formatDateRelative(entree.created_at)}</p>
      </div>
    </>
  )

  if (!entree.url) {
    return (
      <div className="flex min-h-11 items-center gap-3 rounded-2xl border border-border bg-surface p-3">{contenu}</div>
    )
  }

  return (
    <button
      type="button"
      onClick={onOuvrir}
      className="flex min-h-11 items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {contenu}
    </button>
  )
}
