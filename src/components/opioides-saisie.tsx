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
  CHAMPS_PRESCRIPTION,
  CHAMPS_TEXTE,
  AIDES_BON_USAGE,
  INTRO_BON_USAGE,
  QUESTIONS_POMI,
  RAPPELS_REGLEMENTAIRES,
  REGLES_BON_USAGE,
  SEUIL_POMI,
  calculerPomi,
  construireSectionsOpioides,
  etapeOpioidesRenseignee,
  mettreAJourAlerteAuto,
  segmenterSurlignage,
  texteAlertePomi,
  type AideBonUsage,
  type CleTexteOpioides,
  type ClePrescription,
  type DonneesOpioides,
  type EtapeOpioides,
  type PatientOpioides,
  type ReponsePomi,
} from '@/lib/opioides'
import { useEnregistrementAuto } from '@/lib/use-enregistrement-auto'
import { useToast } from '@/components/ui/toast-provider'
import { ChampLigne, ChampTexte, IndicateurEnregistrement, ListeSections } from '@/components/bpm-saisie'
import {
  CLASSE_BOUTON_PRIMAIRE,
  CLASSE_BOUTON_SECONDAIRE,
  CLASSE_FOCUS,
  Icone,
} from '@/components/entretien-ui'

const SELECTEUR_FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'

const SECTIONS = construireSectionsOpioides()
const ETAPES: EtapeOpioides[] = [...SECTIONS.flatMap((s) => s.etapes), { type: 'fin' }]
const SECTION_DE_ETAPE: number[] = SECTIONS.flatMap((s, i) => s.etapes.map(() => i))
const INDEX_PREMIERE_ETAPE_SECTION: number[] = SECTIONS.map((_, i) => SECTION_DE_ETAPE.indexOf(i))

function sabonnerSansChangement() {
  return () => {}
}

function titreEtape(etape: EtapeOpioides): string {
  switch (etape.type) {
    case 'rappels':
      return 'Rappels réglementaires'
    case 'patient':
      return 'Le patient'
    case 'prescription':
      return CHAMPS_PRESCRIPTION.find((c) => c.cle === etape.cle)?.intitule ?? ''
    case 'bon_usage':
      return 'Règles de bon usage'
    case 'pomi':
      return QUESTIONS_POMI[etape.index]
    case 'texte':
      return CHAMPS_TEXTE.find((c) => c.cle === etape.cle)?.intitule ?? ''
    case 'fin':
      return 'Fiche terminée'
  }
}

// Saisie de la fiche « Opioïdes », un écran à la fois, en plein écran (même
// cadre que la fiche BPM). Tout est enregistré automatiquement ; passer une
// étape sans répondre n'est jamais bloqué.
export function OpioidesSaisie({
  ficheId,
  typeEntretienId,
  nomType,
  initial,
}: {
  ficheId: string
  typeEntretienId: string
  nomType: string
  initial: DonneesOpioides
}) {
  const router = useRouter()
  const toast = useToast()
  const monte = useSyncExternalStore(sabonnerSansChangement, () => true, () => false)

  const [index, setIndex] = useState(0)
  const [sectionsOuvertes, setSectionsOuvertes] = useState(false)

  const { donnees, statut, modifier, sauvegarder } = useEnregistrementAuto<DonneesOpioides>(initial, (d) =>
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
        const renseignees = s.etapes.filter((e) => etapeOpioidesRenseignee(donnees, e)).length
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

  const changerPatient = (cle: keyof PatientOpioides, valeur: string) =>
    modifier((d) => ({ ...d, patient: { ...d.patient, [cle]: valeur } }))

  const changerTexte = (cle: CleTexteOpioides, valeur: string) => modifier((d) => ({ ...d, [cle]: valeur }))

  const basculerRegle = (position: number) =>
    modifier((d) => ({ ...d, bon_usage: d.bon_usage.map((v, i) => (i === position ? !v : v)) }))

  function repondrePomi(position: number, reponse: ReponsePomi) {
    modifier((d) => {
      const pomi = d.pomi.map((r, i) => (i === position ? reponse : r))
      return { ...d, pomi, alertes: mettreAJourAlerteAuto(d, pomi) }
    })
  }

  const nomPatient = `${donnees.patient.nom} ${donnees.patient.prenom}`.trim() || 'Patient sans nom'

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

          {etape.type === 'rappels' && <EtapeRappels />}

          {etape.type === 'patient' && <EtapePatient patient={donnees.patient} onChanger={changerPatient} />}

          {etape.type === 'prescription' && (
            <EtapePrescription
              cle={etape.cle}
              valeur={donnees.patient[etape.cle]}
              onChanger={(v) => changerPatient(etape.cle, v)}
            />
          )}

          {etape.type === 'bon_usage' && <EtapeBonUsage coches={donnees.bon_usage} onBasculer={basculerRegle} />}

          {etape.type === 'pomi' && (
            <EtapePomi
              position={etape.index}
              reponse={donnees.pomi[etape.index]}
              pomi={donnees.pomi}
              onRepondre={(r) => repondrePomi(etape.index, r)}
            />
          )}

          {etape.type === 'texte' && (
            <EtapeTexte cle={etape.cle} donnees={donnees} onChanger={(v) => changerTexte(etape.cle, v)} />
          )}

          {etape.type === 'fin' && (
            <EtapeFin
              donnees={donnees}
              progression={progression}
              typeEntretienId={typeEntretienId}
              onImprimer={() =>
                void quitter(`/entretiens-pharmaceutiques/${typeEntretienId}/opioides/${ficheId}/imprimer`)
              }
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
            disabled={index === 0}
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

// --- Étapes --------------------------------------------------------------------------

function EtapeRappels() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13.5px] leading-snug text-muted">
        À relire avant l’entretien. Ces rappels ne sont pas repris sur le compte rendu.
      </p>
      {RAPPELS_REGLEMENTAIRES.map((bloc) => (
        <section key={bloc.titre} className="rounded-[20px] bg-surface p-3.5 shadow-card">
          <h3 className="mb-2 text-[14.5px] font-bold text-ink">{bloc.titre}</h3>
          <ul className="flex flex-col gap-2 text-[13.5px] leading-snug text-ink">
            {bloc.points.map((p) => (
              <li key={p} className="flex gap-2.5">
                <span aria-hidden="true" className="mt-[7px] size-1.5 shrink-0 rounded-full bg-primary" />
                <span>
                  {segmenterSurlignage(p).map((segment, i) =>
                    segment.surligne ? (
                      <mark key={i} className="rounded-sm bg-accent-soft px-0.5 font-semibold text-ink">
                        {segment.texte}
                      </mark>
                    ) : (
                      segment.texte
                    )
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function EtapePatient({
  patient,
  onChanger,
}: {
  patient: PatientOpioides
  onChanger: (cle: keyof PatientOpioides, valeur: string) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ChampLigne label="Nom" valeur={patient.nom} onChanger={(v) => onChanger('nom', v)} />
        <ChampLigne label="Prénom" valeur={patient.prenom} onChanger={(v) => onChanger('prenom', v)} />
      </div>
      <ChampLigne label="Âge" valeur={patient.age} onChanger={(v) => onChanger('age', v)} inputMode="numeric" />
      <ChampLigne
        label="Coordonnées"
        valeur={patient.coordonnees}
        onChanger={(v) => onChanger('coordonnees', v)}
        autoComplete="street-address"
      />
      <ChampLigne label="Date de l’entretien" type="date" valeur={patient.date} onChanger={(v) => onChanger('date', v)} />
      <ChampLigne label="Pharmacien" valeur={patient.pharmacien} onChanger={(v) => onChanger('pharmacien', v)} />
    </div>
  )
}

function EtapePrescription({
  cle,
  valeur,
  onChanger,
}: {
  cle: ClePrescription
  valeur: string
  onChanger: (v: string) => void
}) {
  const champ = CHAMPS_PRESCRIPTION.find((c) => c.cle === cle)!
  return (
    <div className="flex flex-col gap-3">
      {champ.aide && <p className="text-[13.5px] leading-snug text-muted">{champ.aide}</p>}
      <ChampTexte label={champ.intitule} valeur={valeur} onChanger={onChanger} masquerLabel />
    </div>
  )
}

function EtapeBonUsage({ coches, onBasculer }: { coches: boolean[]; onBasculer: (position: number) => void }) {
  const nb = coches.filter(Boolean).length
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13.5px] leading-snug text-muted">
        {INTRO_BON_USAGE} Cochez ce qui a été abordé avec le patient.
      </p>
      <ul className="flex flex-col gap-2">
        {REGLES_BON_USAGE.map((regle, i) => (
          <li
            key={regle}
            className={`rounded-2xl shadow-card ${coches[i] ? 'bg-primary-soft' : 'bg-surface'}`}
          >
            <label className="flex min-h-12 cursor-pointer items-start gap-3 px-3.5 py-3 text-[13.5px] leading-snug text-ink">
              <input
                type="checkbox"
                checked={coches[i]}
                onChange={() => onBasculer(i)}
                className="mt-0.5 size-5 shrink-0 accent-primary"
              />
              <span>{regle}</span>
            </label>
            {AIDES_BON_USAGE[i] && <AideRegle aide={AIDES_BON_USAGE[i]} carteCochee={coches[i]} />}
          </li>
        ))}
      </ul>
      <p className="text-[13px] font-semibold tabular-nums text-muted">
        {nb} / {REGLES_BON_USAGE.length} règles abordées
      </p>
    </div>
  )
}

// Aide-mémoire sous une règle : fermé par défaut, ouvert d'un tap. Hors du
// <label> de la règle : l'ouvrir ne coche ni ne décoche la règle.
function AideRegle({ aide, carteCochee }: { aide: AideBonUsage; carteCochee: boolean }) {
  const [ouvert, setOuvert] = useState(false)
  const idCorps = useId()

  return (
    <div className="px-2 pb-2">
      <button
        type="button"
        aria-expanded={ouvert}
        aria-controls={idCorps}
        onClick={() => setOuvert(!ouvert)}
        className={`flex min-h-11 w-full items-center gap-2 rounded-xl px-2.5 text-left text-[13px] font-semibold text-primary hover:bg-primary-soft ${CLASSE_FOCUS}`}
      >
        <Icone nom="explication" taille={16} />
        <span className="min-w-0 flex-1">{ouvert ? 'Masquer' : aide.bouton}</span>
        <Icone nom="chevron-bas" taille={16} className={`motion-safe:transition-transform ${ouvert ? 'rotate-180' : ''}`} />
      </button>
      {ouvert && (
        // Fond blanc sur une carte cochée (déjà indigo pâle), indigo pâle sinon : l'encadré se détache toujours.
        <div
          id={idCorps}
          className={`mt-1 flex flex-col gap-2.5 rounded-xl px-3 py-2.5 text-primary-dark ${carteCochee ? 'bg-surface' : 'bg-primary-soft'}`}
        >
          {aide.blocs.map((bloc) => (
            <p key={bloc.titre} className="text-[13px] leading-snug">
              <span className="block font-bold">{bloc.titre}</span>
              {bloc.texte}
              {bloc.urgence && <span className="mt-0.5 block font-bold">{bloc.urgence}</span>}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

function ResultatPomiCarte({ pomi }: { pomi: ReponsePomi[] }) {
  const { repondues, score, complet, risque } = calculerPomi(pomi)

  if (risque) {
    return (
      <div className="flex flex-col gap-0.5 rounded-2xl bg-rec-soft px-4 py-3 text-rec">
        <p className="font-heading text-[28px] font-bold leading-none tabular-nums">
          {score} / {QUESTIONS_POMI.length}
        </p>
        <p className="text-[14px] font-bold">Seuil atteint : risque actuel de mésusage</p>
        <p className="text-[12.5px] text-ink">Alerter le médecin prescripteur et le médecin traitant via MSS.</p>
      </div>
    )
  }

  if (!complet) {
    return (
      <p className="rounded-xl bg-neutral-soft px-3 py-3 text-[13.5px] text-ink">
        {repondues} réponse{repondues > 1 ? 's' : ''} sur {QUESTIONS_POMI.length}. Score actuel : {score}. Un score de{' '}
        {SEUIL_POMI} ou plus suggère un risque actuel de mésusage.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-0.5 rounded-2xl bg-green-soft px-4 py-3 text-green">
      <p className="font-heading text-[28px] font-bold leading-none tabular-nums">
        {score} / {QUESTIONS_POMI.length}
      </p>
      <p className="text-[14px] font-bold">Sous le seuil de {SEUIL_POMI}</p>
    </div>
  )
}

function EtapePomi({
  position,
  reponse,
  pomi,
  onRepondre,
}: {
  position: number
  reponse: ReponsePomi
  pomi: ReponsePomi[]
  onRepondre: (r: ReponsePomi) => void
}) {
  const choix: { valeur: Exclude<ReponsePomi, null>; label: string }[] = [
    { valeur: 'oui', label: 'Oui' },
    { valeur: 'non', label: 'Non' },
  ]
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13.5px] text-muted">
        Question {position + 1} sur {QUESTIONS_POMI.length}. Chaque réponse « Oui » vaut un point. À poser avant chaque
        renouvellement.
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
      <ResultatPomiCarte pomi={pomi} />
    </div>
  )
}

function EtapeTexte({
  cle,
  donnees,
  onChanger,
}: {
  cle: CleTexteOpioides
  donnees: DonneesOpioides
  onChanger: (v: string) => void
}) {
  const champ = CHAMPS_TEXTE.find((c) => c.cle === cle)!
  const auto = texteAlertePomi(donnees.pomi)
  const proposerAlerte = cle === 'alertes' && auto !== '' && donnees.alertes !== auto

  return (
    <div className="flex flex-col gap-3">
      {champ.aide && <p className="text-[13.5px] leading-snug text-muted">{champ.aide}</p>}
      {cle === 'alertes' && <ResultatPomiCarte pomi={donnees.pomi} />}
      {proposerAlerte && (
        <button type="button" onClick={() => onChanger(auto)} className={`${CLASSE_BOUTON_SECONDAIRE} min-h-11 self-start text-left`}>
          Remplacer par l’alerte proposée
        </button>
      )}
      <ChampTexte label={champ.intitule} valeur={donnees[cle]} onChanger={onChanger} masquerLabel />
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
  donnees: DonneesOpioides
  progression: { titre: string; renseignees: number; total: number }[]
  typeEntretienId: string
  onImprimer: () => void
  onAller: (indexSection: number) => void
}) {
  const toast = useToast()
  const [enregistre, setEnregistre] = useState(false)
  const [isPending, startTransition] = useTransition()
  const nom = `${donnees.patient.nom.trim()} ${donnees.patient.prenom.trim()}`.trim()

  function ajouterAuJournal() {
    if (!nom) return
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
