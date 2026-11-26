'use client'

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { enregistrerFicheEntretien } from '@/app/actions/entretien-fiches'
import { creerEntreeJournal } from '@/app/actions/entretien-journal'
import {
  CONSIGNE_ADDICTIONS,
  NB_OBJECTIFS,
  QUESTIONS_PREVENTION,
  THEMES_PREVENTION,
  THEME_LIBRE,
  calculerAge,
  construireSectionsPrevention,
  etapePreventionRenseignee,
  libelleTheme,
  nouvelIdActionLibre,
  suggestionsPourThemes,
  trancheDepuisAge,
  type ActionPlan,
  type DonneesPrevention,
  type EtapePrevention,
  type ObjectifPrevention,
  type PatientPrevention,
  type ThemePrevention,
  type TranchePrevention,
} from '@/lib/prevention'
import { useEnregistrementAuto } from '@/lib/use-enregistrement-auto'
import { useToast } from '@/components/ui/toast-provider'
import { useFermerAvecRetour } from '@/lib/use-fermer-avec-retour'
import { useEcranAllume } from '@/lib/use-ecran-allume'
import { ChampLigne, IndicateurEnregistrement, ListeSections } from '@/components/bpm-saisie'
import {
  CLASSE_BOUTON_PRIMAIRE,
  CLASSE_BOUTON_SECONDAIRE,
  CLASSE_CHAMP,
  CLASSE_FOCUS,
  Icone,
} from '@/components/entretien-ui'

const SELECTEUR_FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'

const SECTIONS = construireSectionsPrevention()
const ETAPES: EtapePrevention[] = [...SECTIONS.flatMap((s) => s.etapes), { type: 'fin' }]
const SECTION_DE_ETAPE: number[] = SECTIONS.flatMap((s, i) => s.etapes.map(() => i))
const INDEX_PREMIERE_ETAPE_SECTION: number[] = SECTIONS.map((_, i) => SECTION_DE_ETAPE.indexOf(i))

function sabonnerSansChangement() {
  return () => {}
}

function titreEtape(etape: EtapePrevention): string {
  switch (etape.type) {
    case 'patient':
      return 'La personne'
    case 'question':
      return QUESTIONS_PREVENTION[etape.index].texte
    case 'themes':
      return 'Thèmes à travailler'
    case 'actions':
      return 'Actions du plan'
    case 'objectif':
      return `Objectif prioritaire ${etape.index + 1}`
    case 'fin':
      return 'Bilan terminé'
  }
}

// Saisie du bilan de prévention, un écran à la fois, en plein écran (même cadre
// que la fiche Opioïdes). Tout est enregistré automatiquement ; passer une
// étape sans répondre n'est jamais bloqué.
export function PreventionSaisie({
  ficheId,
  typeEntretienId,
  nomType,
  initial,
}: {
  ficheId: string
  typeEntretienId: string
  nomType: string
  initial: DonneesPrevention
}) {
  const router = useRouter()
  const toast = useToast()
  const monte = useSyncExternalStore(sabonnerSansChangement, () => true, () => false)

  const [index, setIndex] = useState(0)
  const [sectionsOuvertes, setSectionsOuvertes] = useState(false)
  const [sortie, setSortie] = useState<'quitter' | 'imprimer' | null>(null)

  // Écran gardé allumé : le bilan est mené face à la personne.
  useEcranAllume(true)

  const { donnees, statut, modifier, sauvegarder } = useEnregistrementAuto<DonneesPrevention>(initial, (d) =>
    enregistrerFicheEntretien(ficheId, d)
  )

  const idTitre = useId()
  const conteneurRef = useRef<HTMLDivElement>(null)
  const titreRef = useRef<HTMLHeadingElement>(null)

  // Plein écran : la page derrière ne défile pas.
  useEffect(() => {
    const precedent = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = precedent
    }
  }, [])

  const etape = ETAPES[index]
  const sectionIndex = SECTION_DE_ETAPE[index] ?? SECTIONS.length - 1
  const estFin = etape.type === 'fin'

  useEffect(() => {
    titreRef.current?.focus()
    conteneurRef.current?.querySelector<HTMLElement>('[data-defilement]')?.scrollTo({ top: 0 })
  }, [index, monte])

  const progression = useMemo(
    () =>
      SECTIONS.map((s) => {
        const renseignees = s.etapes.filter((e) => etapePreventionRenseignee(donnees, e)).length
        return { titre: s.titre, renseignees, total: s.etapes.length }
      }),
    [donnees]
  )

  const age = calculerAge(donnees.patient.naissance, donnees.patient.date)
  const tranche = trancheDepuisAge(age)

  function aller(cible: number) {
    setIndex(Math.min(Math.max(cible, 0), ETAPES.length - 1))
    void sauvegarder()
  }

  const signalerNavigation = useFermerAvecRetour(true, () => {
    if (document.querySelectorAll('[aria-modal="true"]').length > 1) return
    void quitter()
  })

  async function quitter(destination?: string) {
    if (sortie) return
    setSortie(destination ? 'imprimer' : 'quitter')
    const ok = await sauvegarder()
    if (!ok) {
      setSortie(null)
      toast({ type: 'erreur', message: 'Le bilan n’a pas pu être enregistré. Réessayez avant de quitter.' })
      return
    }
    signalerNavigation()
    router.push(destination ?? `/entretiens-pharmaceutiques/${typeEntretienId}`)
  }

  function surKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Tab') {
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
    }
  }

  // --- Mises à jour du bilan -------------------------------------------------

  const changerPatient = (cle: keyof PatientPrevention, valeur: string) =>
    modifier((d) => ({ ...d, patient: { ...d.patient, [cle]: valeur } }))

  const changerReponse = (position: number, cle: 'reponse' | 'note', valeur: string) =>
    modifier((d) => ({
      ...d,
      reponses: d.reponses.map((r, i) => (i === position ? { ...r, [cle]: valeur } : r)),
    }))

  const basculerTheme = (theme: ThemePrevention) =>
    modifier((d) => ({
      ...d,
      themes: THEMES_PREVENTION.map((t) => t.cle).filter((cle) => (cle === theme ? !d.themes.includes(cle) : d.themes.includes(cle))),
    }))

  const ajouterAction = (action: ActionPlan) =>
    modifier((d) => (d.actions.some((a) => a.id === action.id) ? d : { ...d, actions: [...d.actions, action] }))

  const modifierAction = (id: string, texte: string) =>
    modifier((d) => ({ ...d, actions: d.actions.map((a) => (a.id === id ? { ...a, texte } : a)) }))

  const retirerAction = (id: string) => modifier((d) => ({ ...d, actions: d.actions.filter((a) => a.id !== id) }))

  const changerObjectif = (position: number, cle: keyof ObjectifPrevention, valeur: string) =>
    modifier((d) => ({
      ...d,
      objectifs: d.objectifs.map((o, i) => (i === position ? { ...o, [cle]: valeur } : o)),
    }))

  const nomPatient = `${donnees.patient.nom} ${donnees.patient.prenom}`.trim() || 'Personne sans nom'

  if (!monte) return null

  const contenu = (
    <div
      ref={conteneurRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={idTitre}
      onKeyDown={surKeyDown}
      className="fixed inset-0 z-50 flex flex-col bg-bg"
    >
      <header inert={sectionsOuvertes} className="shrink-0 border-b border-border bg-surface px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-8">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-ink" title={nomType}>{nomPatient}</p>
              <p className="truncate text-[12px] text-muted">{estFin ? 'Fin du bilan' : SECTIONS[sectionIndex].titre}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <IndicateurEnregistrement statut={statut} onReessayer={() => void sauvegarder()} />
              <button
                type="button"
                onClick={() => void quitter()}
                aria-disabled={sortie !== null}
                className={`flex min-h-11 items-center rounded-xl border border-border bg-surface px-3.5 text-[13px] font-semibold text-ink aria-disabled:opacity-60 ${CLASSE_FOCUS}`}
              >
                {sortie === 'quitter' ? 'Enregistrement…' : 'Quitter'}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSectionsOuvertes(true)}
              className={`-my-1.5 flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-2 text-[13px] font-semibold tabular-nums text-ink hover:bg-neutral-soft ${CLASSE_FOCUS}`}
              aria-label={`Sections du bilan. ${estFin ? 'Bilan terminé' : `Étape ${index + 1} sur ${ETAPES.length - 1}`}`}
            >
              <Icone nom="script" taille={16} className="text-muted" />
              {estFin ? 'Terminé' : `${index + 1} / ${ETAPES.length - 1}`}
            </button>
            {/* Une barre par section, cliquable : la zone de clic fait 44 px de haut
                et occupe toute la largeur de sa part (les barres se touchent par leur
                zone, pas par leur trait) ; le trait, lui, reste fin. */}
            <div role="group" aria-label="Aller à une section" className="-mx-0.5 flex min-w-0 flex-1">
              {progression.map((p, i) => {
                const courante = !estFin && i === sectionIndex
                return (
                  <button
                    key={p.titre}
                    type="button"
                    onClick={() => aller(INDEX_PREMIERE_ETAPE_SECTION[i])}
                    aria-current={courante ? 'step' : undefined}
                    aria-label={`${p.titre} : ${p.renseignees} étape${p.renseignees > 1 ? 's' : ''} renseignée${p.renseignees > 1 ? 's' : ''} sur ${p.total}`}
                    title={p.titre}
                    className={`group -my-2 flex min-h-11 min-w-0 flex-1 items-center rounded-lg px-0.5 ${CLASSE_FOCUS}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-2 w-full rounded-full motion-safe:transition-[height,background-color] motion-safe:duration-150 group-hover:h-3 group-active:h-3 ${
                        courante ? 'bg-primary' : p.renseignees === p.total ? 'bg-green' : 'bg-track'
                      }`}
                    />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </header>

      <p inert={sectionsOuvertes} role="status" aria-live="polite" className="sr-only">
        {estFin ? 'Fin du bilan.' : `Étape ${index + 1} sur ${ETAPES.length - 1} : ${titreEtape(etape)}`}
      </p>

      <div data-defilement inert={sectionsOuvertes} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <h2
            id={idTitre}
            ref={titreRef}
            tabIndex={-1}
            className="text-balance text-[20px] font-bold leading-snug text-ink focus:outline-none"
          >
            {titreEtape(etape)}
          </h2>

          {etape.type === 'patient' && (
            <EtapePatient patient={donnees.patient} age={age} tranche={tranche} onChanger={changerPatient} />
          )}

          {etape.type === 'question' && (
            <EtapeQuestion
              index={etape.index}
              reponse={donnees.reponses[etape.index]}
              onChanger={(cle, valeur) => changerReponse(etape.index, cle, valeur)}
            />
          )}

          {etape.type === 'themes' && <EtapeThemes themes={donnees.themes} onBasculer={basculerTheme} />}

          {etape.type === 'actions' && (
            <EtapeActions
              themes={donnees.themes}
              actions={donnees.actions}
              age={age}
              tranche={tranche}
              aNaissance={donnees.patient.naissance !== ''}
              onAjouter={ajouterAction}
              onModifier={modifierAction}
              onRetirer={retirerAction}
            />
          )}

          {etape.type === 'objectif' && (
            <EtapeObjectif
              index={etape.index}
              objectif={donnees.objectifs[etape.index]}
              onChanger={(cle, valeur) => changerObjectif(etape.index, cle, valeur)}
            />
          )}

          {etape.type === 'fin' && (
            <EtapeFin
              donnees={donnees}
              progression={progression}
              typeEntretienId={typeEntretienId}
              ouvertureEnCours={sortie !== null}
              imprimerEnCours={sortie === 'imprimer'}
              onImprimer={() =>
                void quitter(`/entretiens-pharmaceutiques/${typeEntretienId}/prevention/${ficheId}/imprimer`)
              }
              onAller={(i) => aller(INDEX_PREMIERE_ETAPE_SECTION[i])}
            />
          )}
        </div>
      </div>

      <footer inert={sectionsOuvertes} className="shrink-0 border-t border-border bg-surface px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-8">
        <div className="mx-auto flex w-full max-w-2xl gap-2">
          <button
            type="button"
            onClick={() => aller(index - 1)}
            disabled={index === 0}
            className={`${CLASSE_BOUTON_SECONDAIRE} min-h-14 flex-1`}
          >
            Précédent
          </button>
          {estFin ? (
            <button
              type="button"
              onClick={() => void quitter()}
              aria-disabled={sortie !== null}
              className={`${CLASSE_BOUTON_PRIMAIRE} min-h-14 flex-1 aria-disabled:opacity-50`}
            >
              {sortie === 'quitter' ? 'Enregistrement…' : 'Fermer'}
            </button>
          ) : (
            <button type="button" onClick={() => aller(index + 1)} className={`${CLASSE_BOUTON_PRIMAIRE} min-h-14 flex-1`}>
              {index === ETAPES.length - 2 ? 'Terminer' : 'Suivant'}
            </button>
          )}
        </div>
      </footer>

      {sectionsOuvertes && (
        <ListeSections
          progression={progression}
          sectionCourante={estFin ? -1 : sectionIndex}
          onChoisir={(i) => {
            aller(INDEX_PREMIERE_ETAPE_SECTION[i])
            setSectionsOuvertes(false)
          }}
          onFermer={() => setSectionsOuvertes(false)}
        />
      )}
    </div>
  )

  return createPortal(contenu, document.body)
}

// --- Champs ----------------------------------------------------------------------

function ChampZone({
  label,
  valeur,
  onChanger,
  lignes = 4,
}: {
  label: string
  valeur: string
  onChanger: (v: string) => void
  lignes?: number
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-muted">
        {label}
      </label>
      <textarea
        id={id}
        value={valeur}
        onChange={(e) => onChanger(e.target.value)}
        rows={lignes}
        className={`${CLASSE_CHAMP} resize-y leading-relaxed`}
      />
    </div>
  )
}

// --- Étapes --------------------------------------------------------------------------

function EtapePatient({
  patient,
  age,
  tranche,
  onChanger,
}: {
  patient: PatientPrevention
  age: number | null
  tranche: TranchePrevention | null
  onChanger: (cle: keyof PatientPrevention, valeur: string) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13.5px] leading-snug text-muted">
        Prévoir 30 à 45 minutes dans l’espace de confidentialité. La date de naissance sert à proposer les vaccins et dépistages de la bonne tranche d’âge.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ChampLigne label="Nom" valeur={patient.nom} onChanger={(v) => onChanger('nom', v)} autoComplete="family-name" />
        <ChampLigne label="Prénom" valeur={patient.prenom} onChanger={(v) => onChanger('prenom', v)} autoComplete="given-name" />
      </div>
      <ChampLigne label="Date de naissance" type="date" valeur={patient.naissance} onChanger={(v) => onChanger('naissance', v)} autoComplete="bday" />
      <p role="status" className="rounded-xl bg-neutral-soft px-3 py-2.5 text-[13px] text-ink">
        {age === null
          ? 'Renseignez la date de naissance pour connaître la tranche d’âge.'
          : tranche
            ? `${age} ans · tranche d’âge du bilan : ${tranche} ans. Utiliser l’auto-questionnaire de cette tranche.`
            : `${age} ans · hors des tranches du bilan (18-25, 45-50, 60-65, 70-75 ans).`}
      </p>
      <ChampLigne label="Date du bilan" type="date" valeur={patient.date} onChanger={(v) => onChanger('date', v)} />
      <ChampLigne label="Pharmacien" valeur={patient.pharmacien} onChanger={(v) => onChanger('pharmacien', v)} />
    </div>
  )
}

function EtapeQuestion({
  index,
  reponse,
  onChanger,
}: {
  index: number
  reponse: { reponse: string; note: string }
  onChanger: (cle: 'reponse' | 'note', valeur: string) => void
}) {
  const question = QUESTIONS_PREVENTION[index]
  const estAddictions = question.section === 'Addictions'
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12.5px] font-semibold text-muted">
        {question.section} · question {index + 1} sur {QUESTIONS_PREVENTION.length}
      </p>
      {estAddictions && (
        <p className="rounded-xl bg-primary-soft px-3 py-2.5 text-[13px] leading-snug text-primary-dark">{CONSIGNE_ADDICTIONS}</p>
      )}
      <ChampZone label="Réponse de la personne" valeur={reponse.reponse} onChanger={(v) => onChanger('reponse', v)} lignes={5} />
      <ChampZone label="Note du pharmacien (facultatif)" valeur={reponse.note} onChanger={(v) => onChanger('note', v)} lignes={2} />
    </div>
  )
}

function EtapeThemes({
  themes,
  onBasculer,
}: {
  themes: ThemePrevention[]
  onBasculer: (theme: ThemePrevention) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13.5px] leading-snug text-muted">
        Cochez les thèmes que la personne souhaite ou doit travailler. Des actions adaptées à sa tranche d’âge vous seront proposées à l’étape suivante.
      </p>
      <ul className="flex flex-col gap-2">
        {THEMES_PREVENTION.map((t) => {
          const coche = themes.includes(t.cle)
          return (
            <li key={t.cle} className={`rounded-2xl shadow-card ${coche ? 'bg-primary-soft' : 'bg-surface'}`}>
              <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl px-3.5 py-3 text-[14px] leading-snug text-ink motion-safe:transition-colors motion-safe:active:bg-neutral-soft">
                <input
                  type="checkbox"
                  checked={coche}
                  onChange={() => onBasculer(t.cle)}
                  className={`size-5 shrink-0 accent-primary ${CLASSE_FOCUS}`}
                />
                <span>{t.libelle}</span>
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function EtapeActions({
  themes,
  actions,
  age,
  tranche,
  aNaissance,
  onAjouter,
  onModifier,
  onRetirer,
}: {
  themes: ThemePrevention[]
  actions: ActionPlan[]
  age: number | null
  tranche: TranchePrevention | null
  aNaissance: boolean
  onAjouter: (action: ActionPlan) => void
  onModifier: (id: string, texte: string) => void
  onRetirer: (id: string) => void
}) {
  const suggestions = suggestionsPourThemes(themes, tranche).filter((s) => !actions.some((a) => a.id === s.id))

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13.5px] leading-snug text-muted">
        {themes.length === 0
          ? 'Aucun thème coché : revenez à l’étape précédente pour obtenir des suggestions, ou ajoutez vos propres actions.'
          : aNaissance && age !== null && !tranche
            ? `Suggestions valables pour tous les âges (${age} ans, hors tranches du bilan). Ajoutez vos propres actions si besoin.`
            : 'Suggestions selon les thèmes cochés et la tranche d’âge, à valider par vous. Ajoutez celles qui conviennent : vous pourrez les modifier avant impression.'}
      </p>

      {suggestions.length > 0 && (
        <section aria-label="Actions suggérées" className="flex flex-col gap-2">
          <h3 className="text-[14.5px] font-bold text-ink">Suggestions</h3>
          <ul className="flex flex-col gap-2">
            {suggestions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onAjouter({ id: s.id, theme: s.theme, texte: s.texte })}
                  className={`flex min-h-12 w-full items-start gap-3 rounded-2xl bg-surface px-3.5 py-3 text-left text-[13.5px] leading-snug text-ink shadow-card motion-safe:transition-colors motion-safe:active:bg-neutral-soft ${CLASSE_FOCUS}`}
                >
                  <Icone nom="plus" taille={18} className="mt-0.5 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block text-[12px] font-semibold text-muted">{libelleTheme(s.theme)}</span>
                    {s.texte}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Actions retenues" className="flex flex-col gap-2">
        <h3 className="text-[14.5px] font-bold text-ink">
          Actions retenues <span className="font-semibold tabular-nums text-muted">({actions.length})</span>
        </h3>
        {actions.length === 0 ? (
          <p className="rounded-xl bg-neutral-soft px-3 py-2.5 text-[13px] text-muted">Aucune action retenue pour l’instant.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {actions.map((a) => (
              <li key={a.id} className="flex flex-col gap-1.5 rounded-2xl bg-surface p-3 shadow-card">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-semibold text-muted">{libelleTheme(a.theme)}</p>
                  <button
                    type="button"
                    onClick={() => onRetirer(a.id)}
                    aria-label={`Retirer l’action : ${a.texte.slice(0, 60)}`}
                    className={`-mr-1 flex size-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-neutral-soft hover:text-ink ${CLASSE_FOCUS}`}
                  >
                    <Icone nom="corbeille" taille={18} />
                  </button>
                </div>
                <textarea
                  aria-label="Texte de l’action"
                  value={a.texte}
                  onChange={(e) => onModifier(a.id, e.target.value)}
                  rows={3}
                  className={`${CLASSE_CHAMP} resize-y leading-relaxed`}
                />
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => onAjouter({ id: nouvelIdActionLibre(), theme: THEME_LIBRE, texte: 'Nouvelle action' })}
          className={`${CLASSE_BOUTON_SECONDAIRE} min-h-12 self-start`}
        >
          <Icone nom="plus" taille={18} />
          Ajouter une action
        </button>
      </section>
    </div>
  )
}

function EtapeObjectif({
  index,
  objectif,
  onChanger,
}: {
  index: number
  objectif: ObjectifPrevention
  onChanger: (cle: keyof ObjectifPrevention, valeur: string) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13.5px] leading-snug text-muted">
        {index === 0
          ? `Construisez avec la personne 1 à ${NB_OBJECTIFS} objectifs prioritaires.`
          : 'Objectif facultatif : laissez vide s’il n’y en a pas d’autre.'}
      </p>
      <ChampZone label="Objectif" valeur={objectif.objectif} onChanger={(v) => onChanger('objectif', v)} lignes={2} />
      <ChampZone label="Obstacles" valeur={objectif.obstacles} onChanger={(v) => onChanger('obstacles', v)} lignes={3} />
      <ChampZone label="Actions concrètes" valeur={objectif.actions} onChanger={(v) => onChanger('actions', v)} lignes={3} />
      <ChampZone
        label="Ressources et professionnels à consulter"
        valeur={objectif.ressources}
        onChanger={(v) => onChanger('ressources', v)}
        lignes={3}
      />
    </div>
  )
}

function EtapeFin({
  donnees,
  progression,
  typeEntretienId,
  ouvertureEnCours,
  imprimerEnCours,
  onImprimer,
  onAller,
}: {
  donnees: DonneesPrevention
  progression: { titre: string; renseignees: number; total: number }[]
  typeEntretienId: string
  ouvertureEnCours: boolean
  imprimerEnCours: boolean
  onImprimer: () => void
  onAller: (indexSection: number) => void
}) {
  const toast = useToast()
  const [enregistre, setEnregistre] = useState(false)
  const [isPending, startTransition] = useTransition()
  const idAideJournal = useId()
  const nom = `${donnees.patient.nom.trim()} ${donnees.patient.prenom.trim()}`.trim()

  function ajouterAuJournal() {
    if (!nom || isPending || enregistre) return
    const formData = new FormData()
    formData.set('type_entretien_id', typeEntretienId)
    formData.set('patient_nom', nom)
    formData.set('date_entretien', donnees.patient.date)
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

  const incompletes = progression.map((p, i) => ({ ...p, i })).filter((p) => p.renseignees < p.total)

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onImprimer}
        aria-disabled={ouvertureEnCours}
        className={`${CLASSE_BOUTON_PRIMAIRE} min-h-14 text-[15px] aria-disabled:opacity-50`}
      >
        <Icone nom="imprimante" taille={18} />
        {imprimerEnCours ? 'Ouverture…' : 'Voir et imprimer le plan de prévention'}
      </button>

      {incompletes.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-[13.5px] text-muted">
            Sections avec des réponses manquantes. Une question peut ne pas s’appliquer : vous pouvez imprimer quand même.
          </p>
          <ul className="flex flex-col gap-1.5">
            {incompletes.map((p) => (
              <li key={p.titre}>
                <button
                  type="button"
                  onClick={() => onAller(p.i)}
                  className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl bg-surface px-3.5 text-left text-[13.5px] text-ink shadow-card ${CLASSE_FOCUS}`}
                >
                  <span className="font-semibold">{p.titre}</span>
                  <span className="tabular-nums text-muted">
                    {p.renseignees} / {p.total}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="flex items-center gap-2 rounded-xl bg-green-soft px-3 py-3 text-[13.5px] text-ink">
          <Icone nom="coche" taille={18} className="text-green" />
          Toutes les sections sont renseignées.
        </p>
      )}

      <div className="flex flex-col gap-2 rounded-2xl bg-surface p-3.5 shadow-card">
        <h3 className="text-[15px] font-bold text-ink">Journal des entretiens</h3>
        <p className="text-[13px] leading-relaxed text-muted">
          Ajoutez une ligne (personne, date, type d’entretien) au journal. Le contenu du bilan n’y est pas copié.
        </p>
        <button
          type="button"
          onClick={ajouterAuJournal}
          aria-disabled={isPending || enregistre || !nom}
          aria-describedby={nom ? undefined : idAideJournal}
          className={`${CLASSE_BOUTON_SECONDAIRE} aria-disabled:opacity-50`}
        >
          {enregistre ? 'Ajouté au journal' : isPending ? 'Enregistrement…' : 'Ajouter au journal'}
        </button>
        {!nom && <p id={idAideJournal} className="text-[12px] text-muted">Renseignez le nom de la personne pour l’ajouter au journal.</p>}
      </div>
    </div>
  )
}
