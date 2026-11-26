'use client'

import { useRef, useState, useSyncExternalStore, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { modifierTache } from '@/app/actions/taches'
import { ChampPhoto } from '@/components/champ-photo'
import type { Tache } from '@/lib/data/taches'
import type { MembreEquipe } from '@/lib/data/equipe'
import { useToast } from '@/components/ui/toast-provider'
import { useFermerAvecRetour } from '@/lib/use-fermer-avec-retour'
import { usePiegeFocus } from '@/lib/use-piege-focus'
import { CHAMP_CLASS } from '@/components/ui/champ'

// Remplace le glyphe « × » du bouton de fermeture.
function IconFermer({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

// Abonnement vide : rien à écouter, sert seulement de moyen idiomatique
// (useSyncExternalStore) pour détecter le montage côté client sans
// déclencher de setState synchrone dans un effet (interdit par le lint
// react-hooks/set-state-in-effect). getServerSnapshot renvoie false — rien
// n'est rendu côté serveur — et getSnapshot renvoie true dès l'hydratation.
function sabonnerSansChangement() {
  return () => {}
}

// Extraite de taches-list.tsx dans son propre fichier pour être chargée via
// next/dynamic (voir les 4 appelants : taches-list.tsx, accueil-dashboard.tsx,
// agenda-vue-globale.tsx, agenda-vue-globale-mois.tsx) — jamais visible au
// premier rendu de ces pages (montée seulement au clic sur une tâche), mais
// embarque ChampPhoto (compression d'image) inconditionnellement dans le
// JS initial tant qu'elle restait un export statique du module.
export default function ModaleEditionTache({
  tache,
  equipe,
  profilActuelId,
  onFerme,
  onBasculerStatut,
}: {
  tache: Tache
  equipe: MembreEquipe[]
  profilActuelId: string
  onFerme: () => void
  // Fourni par l'appelant, qui détient l'état optimiste de sa propre liste de
  // tâches (TachesList, AccueilDashboard, les deux vues globales d'agenda) :
  // la modale se contente de déléguer puis de se fermer, sans attendre le
  // serveur. Requis plutôt qu'optionnel pour qu'un futur appelant ne puisse
  // pas retomber silencieusement sur une bascule non optimiste.
  onBasculerStatut: (tache: Tache) => void
}) {
  const [photo, setPhoto] = useState<File | null>(null)
  // Distinct de `photo === null` au repos (aucun changement) : mis à true
  // uniquement si l'utilisateur retire explicitement la photo actuelle sans
  // en choisir une nouvelle. Voir le commentaire sur ChampPhoto.
  const [photoSupprimee, setPhotoSupprimee] = useState(false)
  const [isPending, startTransition] = useTransition()
  const toast = useToast()
  // Rendu via un portail vers document.body (voir le createPortal plus bas) :
  // échappe systématiquement à un ancêtre CSS avec transform actif (ex.
  // .agenda-glisse-* dans agenda.tsx, dont le fill-mode `both` maintient
  // translateX(0) en permanence), qui sinon devient le référentiel de
  // positionnement de ce `fixed inset-0` au lieu du viewport — la modale se
  // retrouverait confinée dans ce petit conteneur. document.body n'existe
  // pas côté serveur : monté seulement après hydratation pour éviter un
  // mismatch SSR/hydratation (voir sabonnerSansChangement plus haut).
  const monte = useSyncExternalStore(sabonnerSansChangement, () => true, () => false)

  // Toujours montée seulement quand ouverte (voir {tacheEnEdition && <ModaleEditionTache .../>}
  // chez les appelants) : `ouvert` vaut donc toujours true tant que ce
  // composant existe, et le démontage déclenche le nettoyage du hook.
  useFermerAvecRetour(true, onFerme)
  // Piège à focus, verrouillage du scroll et retour du focus au déclencheur
  // à la fermeture : aria-modal annonçait une modale sans que Tab reste
  // dedans (audit impeccable 2026-09-25).
  const formulaireRef = useRef<HTMLFormElement>(null)
  usePiegeFocus(true, formulaireRef)

  if (!monte) return null

  return createPortal(
    // Fond non focusable porteur du clic de fermeture, rôle dialog sur la
    // boîte elle-même (motif « Sheet/modale avec conteneur englobant » de
    // DESIGN.md) : le lecteur d'écran annonce la boîte, pas tout l'écran.
    <div
      className="overlay-entree fixed inset-0 z-50 flex items-end justify-center overscroll-contain bg-black/40 sm:items-center"
      onClick={onFerme}
    >
      <form
        ref={formulaireRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modale-edition-tache-titre"
        onClick={(e) => e.stopPropagation()}
        action={(formData) => {
          if (photo) formData.set('photo', photo)
          if (photoSupprimee) formData.set('photo_supprimee', 'true')
          startTransition(async () => {
            try {
              await modifierTache(tache.id, formData)
              onFerme()
              toast({ type: 'succes', message: 'Tâche modifiée.' })
            } catch (err) {
              toast({
                type: 'erreur',
                message: err instanceof Error ? err.message : 'Échec de la modification de la tâche.',
              })
            }
          })
        }}
        // pb : sur mobile la sheet touche le bas de l'écran, la safe-area
        // (barre de geste) recouvrait le dernier bouton — même motif que
        // ModaleConfirmation.
        className="panneau-entree flex max-h-[85dvh] w-full flex-col gap-2 overflow-y-auto overscroll-contain rounded-t-[20px] bg-surface shadow-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:w-96 sm:rounded-[20px] sm:pb-4"
      >
        {/* Titre de sheet en font-heading text-lg et bouton Fermer rond de
            36 px visibles (cible 44 px), comme MenuPlusPanel. */}
        <div className="mb-1 flex items-center justify-between gap-2">
          <h2 id="modale-edition-tache-titre" className="font-heading text-lg font-semibold text-ink">
            Modifier la tâche
          </h2>
          <button
            type="button"
            onClick={onFerme}
            aria-label="Fermer sans enregistrer"
            className="-m-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full p-1 text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-soft">
              <IconFermer className="h-4 w-4" />
            </span>
          </button>
        </div>
        {tache.createur && (
          <p className="text-xs text-muted">
            Créée par {tache.createur.id === profilActuelId ? 'moi' : tache.createur.nom_complet}
          </p>
        )}
        <textarea
          name="titre"
          required
          defaultValue={tache.titre}
          placeholder="Titre de la tâche"
          aria-label="Titre de la tâche"
          className={`min-h-24 max-h-48 resize-none overflow-y-auto ${CHAMP_CLASS}`}
        />
        <select
          name="assigne_id"
          defaultValue={tache.assigne?.id ?? ''}
          aria-label="Assigner à"
          className={CHAMP_CLASS}
        >
          <option value="">Non assignée (toute l&rsquo;équipe)</option>
          {equipe.map((m) => (
            <option key={m.id} value={m.id}>
              {m.id === profilActuelId ? 'Moi' : m.nom_complet}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            type="date"
            name="echeance"
            defaultValue={tache.echeance ?? ''}
            aria-label="Date d'échéance"
            className={`min-w-0 flex-1 ${CHAMP_CLASS}`}
          />
          <input
            type="time"
            name="echeance_heure"
            defaultValue={tache.echeance_heure?.slice(0, 5) ?? ''}
            aria-label="Heure d'échéance"
            className={`w-28 ${CHAMP_CLASS}`}
          />
        </div>
        <ChampPhoto
          photoInitiale={tache.photoUrl}
          onChange={(fichier) => {
            setPhoto(fichier)
            setPhotoSupprimee(fichier === null)
          }}
        />
        {/* Lecture seule : l'enregistrement d'un vocal n'est pour l'instant
            possible qu'à la création (voir le formulaire plus haut dans ce
            fichier) — pas de remplacement/retrait ici, contrairement à la
            photo. */}
        {tache.audioUrl && <audio controls src={tache.audioUrl} className="h-9 w-full" />}
        {/* aria-disabled + garde plutôt que `disabled` pendant l'envoi : un
            bouton désactivé perd le focus, qui sortirait alors du piège à
            focus de la modale. */}
        <button
          type="submit"
          aria-disabled={isPending}
          aria-busy={isPending}
          onClick={(e) => {
            if (isPending) e.preventDefault()
          }}
          className="mt-1 min-h-11 rounded-xl bg-primary py-2.5 text-[13.5px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-disabled:opacity-60"
        >
          {isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {/* Fermeture immédiate, sans attendre le serveur : l'appelant applique
            la bascule en optimiste sur sa liste, la tâche est donc déjà dans
            son nouvel état derrière la modale. Le toast de succès disparaît
            avec l'attente qu'il confirmait ; seule une erreur reste signalée,
            par l'appelant. */}
        <button
          type="button"
          aria-disabled={isPending}
          onClick={() => {
            if (isPending) return
            onBasculerStatut(tache)
            onFerme()
          }}
          className="min-h-11 rounded-xl border border-border py-2.5 text-[13.5px] font-semibold text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-disabled:opacity-60"
        >
          {tache.statut === 'fait' ? 'Marquer à faire' : 'Marquer comme faite'}
        </button>
      </form>
    </div>,
    document.body
  )
}
