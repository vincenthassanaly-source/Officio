'use client'

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { enregistrerFicheBpm } from '@/app/actions/bpm'
import { creerEntreeJournal } from '@/app/actions/entretien-journal'
import { obtenirUrlDocumentEntretien } from '@/app/actions/entretiens'
import { ouvrirDocumentDansOnglet } from '@/lib/ouvrir-document-onglet'
import {
  CHAMPS_ANALYSE,
  QUESTION_PAR_CLE,
  QUESTIONS_GIRERD,
  calculerGirerd,
  construireSections,
  etapeRenseignee,
  ligneTraitementVide,
  libelleNiveau,
  mettreAJourObservanceAuto,
  nomPatientAffiche,
  texteObservanceGirerd,
  type CleAnalyse,
  type CleRecueil,
  type DocumentAdhesion,
  type DonneesBpm,
  type EnteteBpm,
  type EtapeBpm,
  type LigneTraitementBpm,
  type ReponseGirerd,
} from '@/lib/bpm'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'
import { useToast } from '@/components/ui/toast-provider'
import {
  CLASSE_BOUTON_PRIMAIRE,
  CLASSE_BOUTON_SECONDAIRE,
  CLASSE_CHAMP,
  CLASSE_FOCUS,
  Icone,
} from '@/components/entretien-ui'

const SELECTEUR_FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'

// Délai entre la dernière frappe et l'enregistrement : assez court pour ne rien
// perdre si l'écran se verrouille, assez long pour ne pas écrire à chaque lettre.
const DELAI_ENREGISTREMENT_MS = 700

const SECTIONS = construireSections()
const ETAPES: EtapeBpm[] = [...SECTIONS.flatMap((s) => s.etapes), { type: 'fin' }]
const SECTION_DE_ETAPE: number[] = SECTIONS.flatMap((s, i) => s.etapes.map(() => i))
const INDEX_PREMIERE_ETAPE_SECTION: number[] = SECTIONS.map((_, i) => SECTION_DE_ETAPE.indexOf(i))

type StatutEnregistrement = 'enregistre' | 'attente' | 'encours' | 'erreur'

function sabonnerSansChangement() {
  return () => {}
}

// Une question de la fiche se lit comme une question : « Vivez-vous ? ». Les
// intitulés qui se terminent par des points de suspension ou qui n'en sont pas
// (« Remarques complémentaires ») restent tels quels.
function titreQuestion(intitule: string): string {
  return intitule.endsWith('…') || intitule === 'Remarques complémentaires' ? intitule : `${intitule} ?`
}

function titreEtape(etape: EtapeBpm): string {
  switch (etape.type) {
    case 'adhesion':
      return 'Bulletin d’adhésion'
    case 'patient':
      return 'Le patient'
    case 'question':
      return titreQuestion(QUESTION_PAR_CLE[etape.cle].intitule)
    case 'traitements':
      return 'Les traitements du patient'
    case 'girerd':
      return QUESTIONS_GIRERD[etape.index]
    case 'girerd_autres':
      return 'Autres éléments'
    case 'analyse':
      return CHAMPS_ANALYSE.find((c) => c.cle === etape.cle)?.intitule ?? ''
    case 'fin':
      return 'Fiche terminée'
  }
}

// Saisie de la fiche BPM, un champ à la fois, en plein écran (même cadre que le
// pas à pas des autres entretiens). Tout est enregistré automatiquement ; passer
// une étape sans répondre n'est jamais bloqué (une question peut ne pas
// s'appliquer au patient).
export function BpmSaisie({
  ficheId,
  typeEntretienId,
  nomType,
  initial,
  documentAdhesion,
}: {
  ficheId: string
  typeEntretienId: string
  nomType: string
  initial: DonneesBpm
  // Bulletin d'adhésion du BPM (document de l'onglet Documents), null s'il n'y en a pas.
  documentAdhesion: DocumentAdhesion | null
}) {
  const router = useRouter()
  const toast = useToast()
  const monte = useSyncExternalStore(sabonnerSansChangement, () => true, () => false)

  const [donnees, setDonnees] = useState<DonneesBpm>(initial)
  // Une fiche déjà commencée (patient nommé) s'ouvre sur « Le patient » : le
  // bulletin d'adhésion se fait une fois, au tout début, pas à chaque ouverture.
  const [index, setIndex] = useState(() =>
    initial.entete.nom.trim() !== '' || initial.entete.prenom.trim() !== ''
      ? ETAPES.findIndex((e) => e.type === 'patient')
      : 0
  )
  const [statut, setStatut] = useState<StatutEnregistrement>('enregistre')
  const [sectionsOuvertes, setSectionsOuvertes] = useState(false)

  const idTitre = useId()
  const conteneurRef = useRef<HTMLDivElement>(null)
  const titreRef = useRef<HTMLHeadingElement>(null)

  // --- Enregistrement automatique -------------------------------------------
  // Les écritures sont chaînées : jamais deux envois en parallèle, et la
  // dernière version saisie part toujours en dernier.
  const donneesRef = useRef(donnees)
  const versionRef = useRef(0)
  const versionEnregistreeRef = useRef(0)
  const chaineRef = useRef<Promise<boolean>>(Promise.resolve(true))
  const minuteurRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
        await enregistrerFicheBpm(ficheId, donneesRef.current)
        versionEnregistreeRef.current = version
        setStatut(versionRef.current === version ? 'enregistre' : 'attente')
        return true
      } catch {
        setStatut('erreur')
        return false
      }
    })
    return chaineRef.current
  }, [ficheId])

  const modifier = useCallback(
    (transformer: (d: DonneesBpm) => DonneesBpm) => {
      const suivant = transformer(donneesRef.current)
      donneesRef.current = suivant
      versionRef.current += 1
      setDonnees(suivant)
      setStatut('attente')
      if (minuteurRef.current) clearTimeout(minuteurRef.current)
      minuteurRef.current = setTimeout(() => {
        void sauvegarder()
      }, DELAI_ENREGISTREMENT_MS)
    },
    [sauvegarder]
  )

  // Écran verrouillé ou onglet masqué : on envoie tout de suite ce qui attend.
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
  const premiere = index === 0

  useEffect(() => {
    titreRef.current?.focus()
    conteneurRef.current?.querySelector<HTMLElement>('[data-defilement]')?.scrollTo({ top: 0 })
  }, [index, monte])

  const progression = useMemo(
    () =>
      SECTIONS.map((s) => {
        const renseignees = s.etapes.filter((e) => etapeRenseignee(donnees, e)).length
        return { titre: s.titre, renseignees, total: s.etapes.length }
      }),
    [donnees]
  )

  function aller(cible: number) {
    setIndex(Math.min(Math.max(cible, 0), ETAPES.length - 1))
    void sauvegarder()
  }

  async function quitter(destination?: string) {
    const ok = await sauvegarder()
    if (!ok) {
      toast({ type: 'erreur', message: 'La fiche n’a pas pu être enregistrée. Réessayez avant de quitter.' })
      return
    }
    router.push(destination ?? `/entretiens-pharmaceutiques/${typeEntretienId}`)
  }

  function surKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      if (sectionsOuvertes) setSectionsOuvertes(false)
      else void quitter()
      return
    }

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

  // --- Mises à jour de la fiche ----------------------------------------------

  const changerEntete = (cle: keyof EnteteBpm, valeur: string) =>
    modifier((d) => ({ ...d, entete: { ...d.entete, [cle]: valeur } }))

  const changerRecueil = (cle: CleRecueil, valeur: string) =>
    modifier((d) => ({ ...d, recueil: { ...d.recueil, [cle]: valeur } }))

  const changerAnalyse = (cle: CleAnalyse, valeur: string) =>
    modifier((d) => ({ ...d, analyse: { ...d.analyse, [cle]: valeur } }))

  function repondreGirerd(position: number, reponse: ReponseGirerd) {
    modifier((d) => {
      const girerd = d.girerd.map((r, i) => (i === position ? reponse : r))
      return { ...d, girerd, analyse: mettreAJourObservanceAuto(d, girerd) }
    })
  }

  const nomPatient = nomPatientAffiche(donnees.entete.nom, donnees.entete.prenom)

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
      <header className="flex shrink-0 flex-col gap-2 border-b border-border bg-surface px-4 pb-3 pt-3 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-ink">{nomPatient}</p>
            <p className="truncate text-[12px] text-muted" title={nomType}>
              {estFin ? 'Fin de la fiche' : SECTIONS[sectionIndex].titre}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <IndicateurEnregistrement statut={statut} onReessayer={() => void sauvegarder()} />
            <button
              type="button"
              onClick={() => void quitter()}
              className={`flex min-h-11 items-center rounded-xl border border-border bg-surface px-3.5 text-[13px] font-semibold text-ink ${CLASSE_FOCUS}`}
            >
              Quitter
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSectionsOuvertes(true)}
            className={`-my-1.5 flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-2 text-[13px] font-semibold tabular-nums text-ink hover:bg-neutral-soft ${CLASSE_FOCUS}`}
            aria-label={`Sections de la fiche. ${estFin ? 'Fiche terminée' : `Étape ${index + 1} sur ${ETAPES.length - 1}`}`}
          >
            <Icone nom="script" taille={16} className="text-muted" />
            {estFin ? 'Terminé' : `${index + 1} / ${ETAPES.length - 1}`}
          </button>
          <div aria-hidden="true" className="flex min-w-0 flex-1 gap-1">
            {progression.map((p, i) => (
              <span
                key={p.titre}
                className={`h-2 min-w-0 flex-1 rounded-full ${
                  !estFin && i === sectionIndex ? 'bg-primary' : p.renseignees === p.total ? 'bg-green' : 'bg-track'
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      <p role="status" aria-live="polite" className="sr-only">
        {estFin ? 'Fin de la fiche.' : `Étape ${index + 1} sur ${ETAPES.length - 1} : ${titreEtape(etape)}`}
      </p>

      <div data-defilement className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <h2
            id={idTitre}
            ref={titreRef}
            tabIndex={-1}
            className="text-balance text-[20px] font-bold leading-snug text-ink focus:outline-none"
          >
            {titreEtape(etape)}
          </h2>

          {etape.type === 'adhesion' && <EtapeAdhesion document={documentAdhesion} />}

          {etape.type === 'patient' && <EtapePatient entete={donnees.entete} onChanger={changerEntete} />}

          {etape.type === 'question' && (
            <EtapeQuestion
              cle={etape.cle}
              valeur={donnees.recueil[etape.cle]}
              onChanger={(v) => changerRecueil(etape.cle, v)}
            />
          )}

          {etape.type === 'traitements' && (
            <EtapeTraitements
              lignes={donnees.traitements}
              onChanger={(traitements) => modifier((d) => ({ ...d, traitements }))}
            />
          )}

          {etape.type === 'girerd' && (
            <EtapeGirerd
              position={etape.index}
              reponse={donnees.girerd[etape.index]}
              onRepondre={(r) => repondreGirerd(etape.index, r)}
            />
          )}

          {etape.type === 'girerd_autres' && (
            <>
              <ResultatGirerdCarte reponses={donnees.girerd} />
              <ChampTexte
                label="Autres éléments"
                valeur={donnees.girerd_autres}
                onChanger={(v) => modifier((d) => ({ ...d, girerd_autres: v }))}
                masquerLabel
              />
            </>
          )}

          {etape.type === 'analyse' && (
            <EtapeAnalyse cle={etape.cle} donnees={donnees} onChanger={(v) => changerAnalyse(etape.cle, v)} />
          )}

          {etape.type === 'fin' && (
            <EtapeFin
              donnees={donnees}
              progression={progression}
              typeEntretienId={typeEntretienId}
              onImprimer={() => void quitter(`/entretiens-pharmaceutiques/${typeEntretienId}/bpm/${ficheId}/imprimer`)}
              onAller={(i) => aller(INDEX_PREMIERE_ETAPE_SECTION[i])}
            />
          )}
        </div>
      </div>

      <footer className="shrink-0 border-t border-border bg-surface px-4 py-3 sm:px-8">
        <div className="mx-auto flex w-full max-w-2xl gap-2">
          <button
            type="button"
            onClick={() => aller(index - 1)}
            disabled={premiere}
            className={`${CLASSE_BOUTON_SECONDAIRE} min-h-14 flex-1`}
          >
            Précédent
          </button>
          {estFin ? (
            <button type="button" onClick={() => void quitter()} className={`${CLASSE_BOUTON_PRIMAIRE} min-h-14 flex-1`}>
              Fermer
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

// --- Indicateur d'enregistrement ----------------------------------------------

export function IndicateurEnregistrement({
  statut,
  onReessayer,
}: {
  statut: StatutEnregistrement
  onReessayer: () => void
}) {
  if (statut === 'erreur') {
    return (
      <button
        type="button"
        onClick={onReessayer}
        className={`flex min-h-11 items-center rounded-xl bg-rec-soft px-3 text-[12.5px] font-bold text-rec ${CLASSE_FOCUS}`}
      >
        Non enregistré · Réessayer
      </button>
    )
  }
  return (
    <p role="status" className="flex items-center gap-1.5 text-[12.5px] font-semibold text-muted">
      {statut === 'enregistre' ? (
        <>
          <Icone nom="coche" taille={14} className="text-green" />
          Enregistré
        </>
      ) : (
        'Enregistrement…'
      )}
    </p>
  )
}

// --- Champs ----------------------------------------------------------------------

function Libelle({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-[13px] font-semibold text-muted">
      {children}
    </label>
  )
}

export function ChampLigne({
  label,
  valeur,
  onChanger,
  inputMode,
  autoComplete = 'off',
  type = 'text',
}: {
  label: string
  valeur: string
  onChanger: (v: string) => void
  inputMode?: 'numeric' | 'decimal' | 'text'
  autoComplete?: string
  type?: string
}) {
  const id = useId()
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Libelle htmlFor={id}>{label}</Libelle>
      <input
        id={id}
        type={type}
        value={valeur}
        inputMode={inputMode}
        autoComplete={autoComplete}
        onChange={(e) => onChanger(e.target.value)}
        className={CLASSE_CHAMP}
      />
    </div>
  )
}

export function ChampTexte({
  label,
  valeur,
  onChanger,
  masquerLabel = false,
}: {
  label: string
  valeur: string
  onChanger: (v: string) => void
  masquerLabel?: boolean
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={masquerLabel ? 'sr-only' : 'text-[13px] font-semibold text-muted'}>
        {label}
      </label>
      <textarea
        id={id}
        value={valeur}
        onChange={(e) => onChanger(e.target.value)}
        rows={6}
        className={`${CLASSE_CHAMP} min-h-36 resize-y leading-relaxed`}
      />
    </div>
  )
}

// --- Étapes ------------------------------------------------------------------------

// Première chose à faire : faire adhérer le patient au dispositif. Le bulletin
// (PDF de l'onglet Documents) s'ouvre dans un nouvel onglet pour être imprimé,
// rempli et signé. Aucune trace n'est gardée et rien ne bloque la suite : le
// patient peut avoir déjà adhéré.
function EtapeAdhesion({ document: bulletin }: { document: DocumentAdhesion | null }) {
  const toast = useToast()
  const [ouverture, setOuverture] = useState(false)

  async function ouvrir() {
    if (!bulletin) return
    setOuverture(true)
    const resultat = await ouvrirDocumentDansOnglet(() => obtenirUrlDocumentEntretien(bulletin.cheminStockage))
    setOuverture(false)
    if (!resultat.succes) toast({ type: 'erreur', message: resultat.message })
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13.5px] leading-snug text-muted">
        À faire en premier : le patient adhère au dispositif d’accompagnement des patients âgés polymédiqués. Si c’est déjà
        fait, passez à l’étape suivante.
      </p>

      <ol className="flex flex-col gap-2 rounded-[20px] bg-surface p-3.5 text-[13.5px] leading-snug text-ink shadow-card">
        {[
          'Imprimez le bulletin d’adhésion.',
          'Faites-le compléter en majuscules, au stylo à bille.',
          'Faites-le signer par le patient et par le pharmacien titulaire, avec le cachet de la pharmacie.',
          'Le patient et la pharmacie conservent chacun l’exemplaire original ; la pharmacie le tient à la disposition du contrôle médical.',
        ].map((consigne, i) => (
          <li key={consigne} className="flex gap-2.5">
            <span
              aria-hidden="true"
              className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[12px] font-bold tabular-nums text-primary"
            >
              {i + 1}
            </span>
            <span>{consigne}</span>
          </li>
        ))}
      </ol>

      {bulletin ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void ouvrir()}
            disabled={ouverture}
            className={`${CLASSE_BOUTON_PRIMAIRE} min-h-14 text-[15px]`}
          >
            <Icone nom="imprimante" taille={18} />
            {ouverture ? 'Ouverture…' : 'Ouvrir le bulletin pour l’imprimer'}
          </button>
          <p className="text-[12.5px] leading-snug text-muted">
            S’ouvre dans un nouvel onglet : imprimez-le depuis la visionneuse du navigateur. Document : {bulletin.nom}.
          </p>
        </div>
      ) : (
        <p className="rounded-xl bg-neutral-soft px-3 py-3 text-[13.5px] leading-snug text-ink">
          Aucun bulletin d’adhésion trouvé. Ajoutez le PDF dans l’onglet Documents de cet entretien et donnez-lui l’étiquette
          « adhésion » (ou un nom qui contient « adhésion »).
        </p>
      )}
    </div>
  )
}

function EtapePatient({
  entete,
  onChanger,
}: {
  entete: EnteteBpm
  onChanger: (cle: keyof EnteteBpm, valeur: string) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ChampLigne label="Nom" valeur={entete.nom} onChanger={(v) => onChanger('nom', v)} />
        <ChampLigne label="Prénom" valeur={entete.prenom} onChanger={(v) => onChanger('prenom', v)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ChampLigne label="Âge" valeur={entete.age} onChanger={(v) => onChanger('age', v)} inputMode="numeric" />
        <ChampLigne label="Poids (kg)" valeur={entete.poids} onChanger={(v) => onChanger('poids', v)} inputMode="decimal" />
      </div>
      <ChampLigne label="Date de l’entretien" type="date" valeur={entete.date} onChanger={(v) => onChanger('date', v)} />
      <ChampLigne label="Médecin traitant" valeur={entete.medecin} onChanger={(v) => onChanger('medecin', v)} />
      <ChampLigne label="Adresse" valeur={entete.adresse} onChanger={(v) => onChanger('adresse', v)} autoComplete="street-address" />
      <ChampLigne label="Pharmacien" valeur={entete.pharmacien} onChanger={(v) => onChanger('pharmacien', v)} />
    </div>
  )
}

const SEPARATEUR_REPONSES = '; '

function EtapeQuestion({
  cle,
  valeur,
  onChanger,
}: {
  cle: CleRecueil
  valeur: string
  onChanger: (v: string) => void
}) {
  const question = QUESTION_PAR_CLE[cle]
  const parties = valeur.split(SEPARATEUR_REPONSES).map((p) => p.trim())

  function basculer(reponse: string) {
    const gardees = valeur.split(SEPARATEUR_REPONSES).filter((p) => p.trim() !== '')
    const apres = parties.includes(reponse) ? gardees.filter((p) => p.trim() !== reponse) : [...gardees, reponse]
    onChanger(apres.join(SEPARATEUR_REPONSES))
  }

  return (
    <div className="flex flex-col gap-3">
      {question.pistes.length > 0 && (
        <ul className="flex flex-col gap-0.5 text-[13.5px] leading-snug text-muted">
          {question.pistes.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      {question.reponses && (
        <div role="group" aria-label="Réponses rapides" className="flex flex-wrap gap-2">
          {question.reponses.map((r) => {
            const active = parties.includes(r)
            return (
              <button
                key={r}
                type="button"
                aria-pressed={active}
                onClick={() => basculer(r)}
                className={`min-h-11 rounded-xl border px-3.5 text-[13.5px] font-semibold ${CLASSE_FOCUS} ${
                  active ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-surface text-ink'
                }`}
              >
                {r}
              </button>
            )
          })}
        </div>
      )}

      <ChampTexte label={`Réponse : ${question.intitule}`} valeur={valeur} onChanger={onChanger} masquerLabel />
    </div>
  )
}

function EtapeTraitements({
  lignes,
  onChanger,
}: {
  lignes: LigneTraitementBpm[]
  onChanger: (lignes: LigneTraitementBpm[]) => void
}) {
  const [aSupprimer, setASupprimer] = useState<string | null>(null)
  const [aFocaliser, setAFocaliser] = useState<string | null>(null)

  function ajouter() {
    const ligne = ligneTraitementVide()
    setAFocaliser(ligne.id)
    onChanger([...lignes, ligne])
  }

  function changer(id: string, cle: keyof Omit<LigneTraitementBpm, 'id'>, valeur: string) {
    onChanger(lignes.map((l) => (l.id === id ? { ...l, [cle]: valeur } : l)))
  }

  function demanderSuppression(ligne: LigneTraitementBpm) {
    const vide = Object.entries(ligne).every(([cle, v]) => cle === 'id' || v === '')
    if (vide) onChanger(lignes.filter((l) => l.id !== ligne.id))
    else setASupprimer(ligne.id)
  }

  const cible = lignes.find((l) => l.id === aSupprimer)

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13.5px] leading-snug text-muted">
        Tous les produits pris par le patient : prescrits, en libre accès, phytothérapie, compléments. Une carte par produit.
      </p>

      {lignes.length === 0 && (
        <p className="rounded-xl bg-neutral-soft px-3 py-3 text-[13.5px] text-ink">Aucun traitement saisi pour l’instant.</p>
      )}

      <ul className="flex flex-col gap-3">
        {lignes.map((ligne, i) => (
          <li key={ligne.id} className="rounded-[20px] bg-surface p-3.5 shadow-card">
            <CarteTraitement
              ligne={ligne}
              numero={i + 1}
              focaliser={aFocaliser === ligne.id}
              onChanger={(cle, v) => changer(ligne.id, cle, v)}
              onSupprimer={() => demanderSuppression(ligne)}
            />
          </li>
        ))}
      </ul>

      <button type="button" onClick={ajouter} className={`${CLASSE_BOUTON_SECONDAIRE} min-h-12`}>
        <Icone nom="plus" taille={16} />
        Ajouter un traitement
      </button>

      <ModaleConfirmation
        ouvert={cible !== undefined}
        titre="Supprimer ce traitement ?"
        description={cible?.produit ? `« ${cible.produit} » sera retiré de la fiche.` : 'Ce traitement sera retiré de la fiche.'}
        onConfirmer={() => {
          onChanger(lignes.filter((l) => l.id !== aSupprimer))
          setASupprimer(null)
        }}
        onAnnuler={() => setASupprimer(null)}
      />
    </div>
  )
}

const ORIGINES = ['Prescripteur', 'Automédication']

function CarteTraitement({
  ligne,
  numero,
  focaliser,
  onChanger,
  onSupprimer,
}: {
  ligne: LigneTraitementBpm
  numero: number
  focaliser: boolean
  onChanger: (cle: keyof Omit<LigneTraitementBpm, 'id'>, valeur: string) => void
  onSupprimer: () => void
}) {
  const idProduit = useId()
  const aDesDetails = Boolean(ligne.probleme_prise || ligne.probleme_observance || ligne.effets || ligne.origine)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Libelle htmlFor={idProduit}>Produit {numero}</Libelle>
          <input
            id={idProduit}
            value={ligne.produit}
            onChange={(e) => onChanger('produit', e.target.value)}
            autoFocus={focaliser}
            autoComplete="off"
            className={CLASSE_CHAMP}
          />
        </div>
        <button
          type="button"
          onClick={onSupprimer}
          aria-label={`Supprimer le traitement ${numero}${ligne.produit ? ` : ${ligne.produit}` : ''}`}
          className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-neutral-soft hover:text-ink ${CLASSE_FOCUS}`}
        >
          <Icone nom="corbeille" taille={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ChampLigne label="Dosage" valeur={ligne.dosage} onChanger={(v) => onChanger('dosage', v)} />
        <ChampLigne label="Forme" valeur={ligne.forme} onChanger={(v) => onChanger('forme', v)} />
      </div>
      <ChampLigne label="Fréquence / posologie" valeur={ligne.posologie} onChanger={(v) => onChanger('posologie', v)} />

      <details open={aDesDetails} className="group rounded-xl bg-bg">
        <summary
          className={`flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 text-[13.5px] font-semibold text-ink ${CLASSE_FOCUS}`}
        >
          Problèmes, effets indésirables, origine
          <Icone nom="chevron-bas" taille={16} className="text-muted motion-safe:transition-transform group-open:rotate-180" />
        </summary>
        <div className="flex flex-col gap-3 px-3 pb-3 pt-1">
          <ChampLigne
            label="Problème lié à la prise (forme galénique)"
            valeur={ligne.probleme_prise}
            onChanger={(v) => onChanger('probleme_prise', v)}
          />
          <ChampLigne
            label="Problème d’observance (oubli)"
            valeur={ligne.probleme_observance}
            onChanger={(v) => onChanger('probleme_observance', v)}
          />
          <ChampLigne label="Survenue d’effets indésirables" valeur={ligne.effets} onChanger={(v) => onChanger('effets', v)} />
          <div className="flex flex-col gap-1.5">
            <span id={`origine-${ligne.id}`} className="text-[13px] font-semibold text-muted">
              Origine de la prise
            </span>
            <div role="group" aria-labelledby={`origine-${ligne.id}`} className="flex flex-wrap gap-2">
              {ORIGINES.map((o) => (
                <button
                  key={o}
                  type="button"
                  aria-pressed={ligne.origine === o}
                  onClick={() => onChanger('origine', ligne.origine === o ? '' : o)}
                  className={`min-h-11 rounded-xl border px-3.5 text-[13.5px] font-semibold ${CLASSE_FOCUS} ${
                    ligne.origine === o ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-surface text-ink'
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>
        </div>
      </details>
    </div>
  )
}

function EtapeGirerd({
  position,
  reponse,
  onRepondre,
}: {
  position: number
  reponse: ReponseGirerd
  onRepondre: (r: ReponseGirerd) => void
}) {
  const choix: { valeur: Exclude<ReponseGirerd, null>; label: string }[] = [
    { valeur: 'oui', label: 'Oui' },
    { valeur: 'non', label: 'Non' },
  ]
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13.5px] text-muted">
        Question {position + 1} sur {QUESTIONS_GIRERD.length}. Chaque réponse « Non » vaut un point.
      </p>
      <div role="group" aria-label="Réponse du patient" className="grid grid-cols-2 gap-3">
        {choix.map((c) => {
          const actif = reponse === c.valeur
          return (
            <button
              key={c.valeur}
              type="button"
              aria-pressed={actif}
              // Un second tap retire la réponse : le patient peut se reprendre.
              onClick={() => onRepondre(actif ? null : c.valeur)}
              className={`min-h-20 rounded-2xl border-2 text-[18px] font-bold ${CLASSE_FOCUS} ${
                actif ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-surface text-ink'
              }`}
            >
              {c.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ResultatGirerdCarte({ reponses }: { reponses: ReponseGirerd[] }) {
  const { repondues, score, niveau } = calculerGirerd(reponses)

  if (score === null || niveau === null) {
    return (
      <p className="rounded-xl bg-neutral-soft px-3 py-3 text-[13.5px] text-ink">
        {repondues} réponse{repondues > 1 ? 's' : ''} sur {QUESTIONS_GIRERD.length} : le score s’affichera quand toutes les
        questions auront une réponse.
      </p>
    )
  }

  const teinte =
    niveau === 'bonne' ? 'bg-green-soft text-green' : niveau === 'faible' ? 'bg-accent-soft text-accent' : 'bg-rec-soft text-rec'

  return (
    <div className={`flex flex-col gap-0.5 rounded-2xl px-4 py-3 ${teinte}`}>
      <p className="font-heading text-[28px] font-bold leading-none tabular-nums">{score} / 6</p>
      <p className="text-[14px] font-bold">{libelleNiveau(niveau).replace(/^./, (c) => c.toUpperCase())}</p>
      <p className="text-[12.5px] text-ink">6 : bonne observance · 4 ou 5 : faible · 3 ou moins : non observance</p>
    </div>
  )
}

function EtapeAnalyse({
  cle,
  donnees,
  onChanger,
}: {
  cle: CleAnalyse
  donnees: DonneesBpm
  onChanger: (v: string) => void
}) {
  const champ = CHAMPS_ANALYSE.find((c) => c.cle === cle)!
  const auto = texteObservanceGirerd(donnees.girerd)
  const proposerScore = cle === 'observance' && auto !== '' && donnees.analyse.observance !== auto

  return (
    <div className="flex flex-col gap-3">
      {champ.pistes.map((p) => (
        <p key={p} className="text-[13.5px] leading-snug text-muted">
          {p}
        </p>
      ))}
      {cle === 'observance' && <ResultatGirerdCarte reponses={donnees.girerd} />}
      {proposerScore && (
        <button type="button" onClick={() => onChanger(auto)} className={`${CLASSE_BOUTON_SECONDAIRE} min-h-11 self-start`}>
          Remplacer par « {auto} »
        </button>
      )}
      <ChampTexte label={champ.intitule} valeur={donnees.analyse[cle]} onChanger={onChanger} masquerLabel />
    </div>
  )
}

function EtapeFin({
  donnees,
  progression,
  typeEntretienId,
  onImprimer,
  onAller,
}: {
  donnees: DonneesBpm
  progression: { titre: string; renseignees: number; total: number }[]
  typeEntretienId: string
  onImprimer: () => void
  onAller: (indexSection: number) => void
}) {
  const toast = useToast()
  const [enregistre, setEnregistre] = useState(false)
  const [isPending, startTransition] = useTransition()
  const nom = `${donnees.entete.nom.trim()} ${donnees.entete.prenom.trim()}`.trim()

  function ajouterAuJournal() {
    if (!nom) return
    const formData = new FormData()
    formData.set('type_entretien_id', typeEntretienId)
    formData.set('patient_nom', nom)
    formData.set('date_entretien', donnees.entete.date)
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
      <button type="button" onClick={onImprimer} className={`${CLASSE_BOUTON_PRIMAIRE} min-h-14 text-[15px]`}>
        <Icone nom="imprimante" taille={18} />
        Voir et imprimer le compte rendu
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
          Ajoute une ligne (patient, date, type d’entretien) au journal. Le contenu de la fiche n’y est pas copié.
        </p>
        <button
          type="button"
          onClick={ajouterAuJournal}
          disabled={isPending || enregistre || !nom}
          className={CLASSE_BOUTON_SECONDAIRE}
        >
          {enregistre ? 'Ajouté au journal' : isPending ? 'Enregistrement…' : 'Ajouter au journal'}
        </button>
        {!nom && <p className="text-[12px] text-muted">Renseignez le nom du patient pour l’ajouter au journal.</p>}
      </div>
    </div>
  )
}

// --- Liste des sections ----------------------------------------------------------------

export function ListeSections({
  progression,
  sectionCourante,
  onChoisir,
  onFermer,
}: {
  progression: { titre: string; renseignees: number; total: number }[]
  sectionCourante: number
  onChoisir: (index: number) => void
  onFermer: () => void
}) {
  const idTitre = useId()
  return (
    // Backdrop : le <div> englobant porte la fermeture, le panneau l'arrête
    // (variante « sheet avec conteneur englobant » de DESIGN.md).
    <div className="fixed inset-0 z-10 flex items-end bg-ink/40 sm:items-center sm:justify-center" onClick={onFermer}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitre}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85dvh] w-full flex-col rounded-t-[20px] bg-surface p-4 shadow-lg sm:max-w-md sm:rounded-[20px]"
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 id={idTitre} className="font-heading text-lg font-semibold text-ink">
            Sections de la fiche
          </h3>
          <button
            type="button"
            onClick={onFermer}
            className={`flex min-h-11 items-center rounded-xl px-3 text-[13px] font-semibold text-muted hover:bg-neutral-soft ${CLASSE_FOCUS}`}
          >
            Fermer
          </button>
        </div>
        <ul className="flex flex-col gap-1 overflow-y-auto">
          {progression.map((p, i) => (
            <li key={p.titre}>
              <button
                type="button"
                onClick={() => onChoisir(i)}
                aria-current={i === sectionCourante ? 'step' : undefined}
                className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-[14px] ${CLASSE_FOCUS} ${
                  i === sectionCourante ? 'bg-primary-soft font-bold text-primary' : 'text-ink hover:bg-neutral-soft'
                }`}
              >
                <span>{p.titre}</span>
                <span className="flex items-center gap-1.5 text-[13px] tabular-nums text-muted">
                  {p.renseignees === p.total && <Icone nom="coche" taille={14} className="text-green" />}
                  {p.renseignees} / {p.total}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
