'use client'

import { useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { enregistrerTrodAngine } from '@/app/actions/trod-angine'
import {
  ANTIBIOTIQUES,
  BLOCS,
  CRITERES_EXCLUSION,
  ETAPES_TROD,
  LIBELLES_ALLERGIE,
  SIGNES_GRAVITE,
  antibiotiquesProposes,
  basculerBloc,
  blocsEffectifs,
  blocsProposes,
  bonDisponible,
  changerAge,
  changerAllergie,
  changerBon,
  changerMesure,
  doseEnTexte,
  nombreCriteresExclusion,
  nombreSignesGravite,
  poidsEnKg,
  typeBonEffectif,
  ageEnAnnees,
  type Allergie,
  type DonneesTrodAngine,
  type IdAntibiotique,
  type IdExclusion,
  type IdGravite,
  type MesuresTrod,
  type PatientTrod,
  type ResultatTrod,
  type TypeBon,
} from '@/lib/trod-angine'
import { useEnregistrementAuto } from '@/lib/use-enregistrement-auto'
import { useFermerAvecRetour } from '@/lib/use-fermer-avec-retour'
import { useEcranAllume } from '@/lib/use-ecran-allume'
import { ouvrirDocumentDansOnglet } from '@/lib/ouvrir-document-onglet'
import { useToast } from '@/components/ui/toast-provider'
import { ChampLigne, ChampTexte, IndicateurEnregistrement } from '@/components/bpm-saisie'
import { CLASSE_BOUTON_PRIMAIRE, CLASSE_BOUTON_SECONDAIRE, CLASSE_FOCUS, Icone } from '@/components/entretien-ui'

const SELECTEUR_FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'

const INDEX_DOCUMENTS = ETAPES_TROD.length - 1

function sabonnerSansChangement() {
  return () => {}
}

// Saisie du TROD angine, un écran à la fois, en plein écran (même cadre que les
// fiches opioïdes et BPM). Tout est enregistré automatiquement ; passer un écran
// sans répondre n'est jamais bloqué : les réponses pré-cochent le compte rendu,
// que le pharmacien corrige à la dernière étape.
export function TrodAngineSaisie({ ficheId, initial }: { ficheId: string; initial: DonneesTrodAngine }) {
  const router = useRouter()
  const toast = useToast()
  const monte = useSyncExternalStore(sabonnerSansChangement, () => true, () => false)

  const [index, setIndex] = useState(0)
  const [sortie, setSortie] = useState(false)

  // Écran gardé allumé : la fiche est remplie face au patient.
  useEcranAllume(true)

  const { donnees, statut, modifier, sauvegarder } = useEnregistrementAuto<DonneesTrodAngine>(initial, (d) =>
    enregistrerTrodAngine(ficheId, d)
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

  const etape = ETAPES_TROD[index]
  const estDerniere = index === ETAPES_TROD.length - 1

  useEffect(() => {
    titreRef.current?.focus()
    conteneurRef.current?.querySelector<HTMLElement>('[data-defilement]')?.scrollTo({ top: 0 })
  }, [index, monte])

  function aller(cible: number) {
    setIndex(Math.min(Math.max(cible, 0), ETAPES_TROD.length - 1))
    void sauvegarder()
  }

  const signalerNavigation = useFermerAvecRetour(true, () => {
    if (document.querySelectorAll('[aria-modal="true"]').length > 1) return
    void quitter()
  })

  async function quitter() {
    if (sortie) return
    setSortie(true)
    const ok = await sauvegarder()
    if (!ok) {
      setSortie(false)
      toast({ type: 'erreur', message: 'La fiche n’a pas pu être enregistrée. Réessayez avant de quitter.' })
      return
    }
    signalerNavigation()
    router.push('/trod-angine')
  }

  function surKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Tab') return
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

  // --- Mises à jour de la fiche -------------------------------------------------

  function changerPatient(cle: keyof PatientTrod, valeur: string) {
    if (cle === 'age') return modifier((d) => changerAge(d, valeur))
    const propre =
      cle === 'secu'
        ? valeur.replace(/\D/g, '').slice(0, 15)
        : cle === 'poids'
          ? valeur.replace(/[^\d.,]/g, '').slice(0, 6)
          : valeur
    modifier((d) => ({ ...d, patient: { ...d.patient, [cle]: propre } }))
  }

  const changerLaMesure = (cle: keyof MesuresTrod, valeur: string) =>
    modifier((d) => changerMesure(d, cle, valeur.replace(/[^\d.,]/g, '').slice(0, 6)))

  const basculerGravite = (id: IdGravite) =>
    modifier((d) => ({ ...d, gravite: { ...d.gravite, [id]: !d.gravite[id] } }))

  const basculerExclusion = (id: IdExclusion) =>
    modifier((d) => ({ ...d, exclusions: { ...d.exclusions, [id]: !d.exclusions[id] } }))

  async function ouvrirPdf(chemin: 'compte-rendu' | 'bon') {
    const resultat = await ouvrirDocumentDansOnglet(async () => {
      const ok = await sauvegarder()
      if (!ok) throw new Error('La fiche n’a pas pu être enregistrée : le document ne peut pas être généré.')
      return `/trod-angine/${ficheId}/${chemin}`
    })
    if (!resultat.succes) toast({ type: 'erreur', message: resultat.message })
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
      <header className="shrink-0 border-b border-border bg-surface px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-8">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-ink">{nomPatient}</p>
              <p className="truncate text-[12px] text-muted">TROD angine</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <IndicateurEnregistrement statut={statut} onReessayer={() => void sauvegarder()} />
              <button
                type="button"
                onClick={() => void quitter()}
                disabled={sortie}
                className={`flex min-h-11 items-center rounded-xl border border-border bg-surface px-3.5 text-[13px] font-semibold text-ink disabled:opacity-60 ${CLASSE_FOCUS}`}
              >
                {sortie ? 'Enregistrement…' : 'Quitter'}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="shrink-0 text-[13px] font-semibold tabular-nums text-ink">
              {index + 1} / {ETAPES_TROD.length}
            </p>
            <div aria-hidden="true" className="flex min-w-0 flex-1 gap-1">
              {ETAPES_TROD.map((e, i) => (
                <span
                  key={e.id}
                  className={`h-2 min-w-0 flex-1 rounded-full ${i === index ? 'bg-primary' : i < index ? 'bg-green' : 'bg-track'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      <p role="status" aria-live="polite" className="sr-only">
        Étape {index + 1} sur {ETAPES_TROD.length} : {etape.titre}
      </p>

      <div data-defilement className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <h2
            id={idTitre}
            ref={titreRef}
            tabIndex={-1}
            className="text-balance text-[20px] font-bold leading-snug text-ink focus:outline-none"
          >
            {etape.titre}
          </h2>

          {etape.id === 'patient' && <EtapePatient patient={donnees.patient} onChanger={changerPatient} />}

          {etape.id === 'gravite' && (
            <EtapeGravite
              donnees={donnees}
              onMesure={changerLaMesure}
              onBasculer={basculerGravite}
              onAllerDocuments={() => aller(INDEX_DOCUMENTS)}
            />
          )}

          {etape.id === 'exclusions' && (
            <EtapeExclusions
              donnees={donnees}
              onBasculer={basculerExclusion}
              onAllerDocuments={() => aller(INDEX_DOCUMENTS)}
            />
          )}

          {etape.id === 'trod' && (
            <EtapeTrod donnees={donnees} onChoisir={(trod) => modifier((d) => ({ ...d, trod }))} />
          )}

          {etape.id === 'antibiotique' && (
            <EtapeAntibiotique
              donnees={donnees}
              onAllergie={(a) => modifier((d) => changerAllergie(d, a))}
              onBon={(b) => modifier((d) => changerBon(d, b))}
              onAntibiotique={(antibiotique) => modifier((d) => ({ ...d, antibiotique }))}
            />
          )}

          {etape.id === 'documents' && (
            <EtapeDocuments
              donnees={donnees}
              onBasculerBloc={(id) => modifier((d) => basculerBloc(d, id))}
              onPointsDivers={(v) => modifier((d) => ({ ...d, points_divers: v }))}
              onChangerPatient={changerPatient}
              onOuvrir={(chemin) => void ouvrirPdf(chemin)}
            />
          )}
        </div>
      </div>

      <footer className="shrink-0 border-t border-border bg-surface px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-8">
        <div className="mx-auto flex w-full max-w-2xl gap-2">
          <button
            type="button"
            onClick={() => aller(index - 1)}
            disabled={index === 0}
            className={`${CLASSE_BOUTON_SECONDAIRE} min-h-14 flex-1`}
          >
            Précédent
          </button>
          {estDerniere ? (
            <button
              type="button"
              onClick={() => void quitter()}
              disabled={sortie}
              className={`${CLASSE_BOUTON_PRIMAIRE} min-h-14 flex-1`}
            >
              {sortie ? 'Enregistrement…' : 'Terminer'}
            </button>
          ) : (
            <button type="button" onClick={() => aller(index + 1)} className={`${CLASSE_BOUTON_PRIMAIRE} min-h-14 flex-1`}>
              Suivant
            </button>
          )}
        </div>
      </footer>
    </div>
  )

  return createPortal(contenu, document.body)
}

// --- Briques ---------------------------------------------------------------------------------

function Bandeau({ ton, children }: { ton: 'alerte' | 'info' | 'ok'; children: ReactNode }) {
  const classes =
    ton === 'alerte'
      ? 'bg-rec-soft text-ink border-rec'
      : ton === 'ok'
        ? 'bg-green-soft text-ink border-green'
        : 'bg-primary-soft text-ink border-primary'
  return (
    <div role="status" className={`rounded-2xl border-l-4 px-4 py-3 text-[13.5px] leading-snug ${classes}`}>
      {children}
    </div>
  )
}

function LigneCase({
  libelle,
  coche,
  onBasculer,
  detail,
}: {
  libelle: string
  coche: boolean
  onBasculer: () => void
  detail?: string
}) {
  return (
    <li className={`rounded-2xl shadow-card ${coche ? 'bg-primary-soft' : 'bg-surface'}`}>
      <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl px-3.5 py-3 text-[13.5px] leading-snug text-ink motion-safe:transition-colors motion-safe:active:bg-neutral-soft">
        <input
          type="checkbox"
          checked={coche}
          onChange={onBasculer}
          className={`mt-0.5 size-5 shrink-0 accent-primary ${CLASSE_FOCUS}`}
        />
        <span>
          {libelle}
          {detail && <span className="mt-0.5 block text-[12.5px] text-muted">{detail}</span>}
        </span>
      </label>
    </li>
  )
}

function LigneChoix({
  nom,
  libelle,
  detail,
  coche,
  onChoisir,
  info,
}: {
  nom: string
  libelle: string
  detail?: string
  coche: boolean
  onChoisir: () => void
  info?: string | null
}) {
  return (
    <li className={`rounded-2xl shadow-card ${coche ? 'bg-primary-soft' : 'bg-surface'}`}>
      <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl px-3.5 py-3 text-[13.5px] leading-snug text-ink motion-safe:transition-colors motion-safe:active:bg-neutral-soft">
        <input
          type="radio"
          name={nom}
          checked={coche}
          onChange={onChoisir}
          className={`mt-0.5 size-5 shrink-0 accent-primary ${CLASSE_FOCUS}`}
        />
        <span>
          <span className="font-semibold">{libelle}</span>
          {detail && <span className="mt-0.5 block text-muted">{detail}</span>}
          {info && <span className="mt-1 block font-semibold text-primary-dark">{info}</span>}
        </span>
      </label>
    </li>
  )
}

// --- Étapes ------------------------------------------------------------------------------------

function EtapePatient({
  patient,
  onChanger,
}: {
  patient: PatientTrod
  onChanger: (cle: keyof PatientTrod, valeur: string) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ChampLigne label="Nom" valeur={patient.nom} onChanger={(v) => onChanger('nom', v)} autoComplete="off" />
        <ChampLigne label="Prénom" valeur={patient.prenom} onChanger={(v) => onChanger('prenom', v)} autoComplete="off" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ChampLigne label="Âge (ans)" valeur={patient.age} onChanger={(v) => onChanger('age', v)} inputMode="numeric" />
        <ChampLigne label="Poids (kg)" valeur={patient.poids} onChanger={(v) => onChanger('poids', v)} inputMode="decimal" />
      </div>
      <p className="-mt-1 text-[12.5px] leading-snug text-muted">
        Le poids sert à calculer la dose de l’antibiotique chez l’enfant. L’âge coche « âge &lt; 10 ans » parmi les
        critères d’exclusion.
      </p>
      <ChampLigne
        label="N° de Sécurité sociale (15 chiffres)"
        valeur={patient.secu}
        onChanger={(v) => onChanger('secu', v)}
        inputMode="numeric"
      />
      <ChampLigne label="Médecin traitant" valeur={patient.medecin} onChanger={(v) => onChanger('medecin', v)} />
      <ChampLigne label="Date" type="date" valeur={patient.date} onChanger={(v) => onChanger('date', v)} />
    </div>
  )
}

function EtapeGravite({
  donnees,
  onMesure,
  onBasculer,
  onAllerDocuments,
}: {
  donnees: DonneesTrodAngine
  onMesure: (cle: keyof MesuresTrod, valeur: string) => void
  onBasculer: (id: IdGravite) => void
  onAllerDocuments: () => void
}) {
  const nb = nombreSignesGravite(donnees)
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13.5px] leading-snug text-muted">
        Mesurez, puis cochez ce que vous constatez. Les mesures hors seuil cochent les signes correspondants.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ChampLigne label="T° (°C)" valeur={donnees.mesures.temperature} onChanger={(v) => onMesure('temperature', v)} inputMode="decimal" />
        <ChampLigne label="PAS (mmHg)" valeur={donnees.mesures.pas} onChanger={(v) => onMesure('pas', v)} inputMode="numeric" />
        <ChampLigne label="FC (/min)" valeur={donnees.mesures.fc} onChanger={(v) => onMesure('fc', v)} inputMode="numeric" />
        <ChampLigne label="FR (/min)" valeur={donnees.mesures.fr} onChanger={(v) => onMesure('fr', v)} inputMode="numeric" />
      </div>
      <ul className="flex flex-col gap-2">
        {SIGNES_GRAVITE.map((s) => (
          <LigneCase key={s.id} libelle={s.libelle} coche={donnees.gravite[s.id]} onBasculer={() => onBasculer(s.id)} />
        ))}
      </ul>
      {nb > 0 ? (
        <Bandeau ton="alerte">
          <p className="font-bold">Signe de gravité : orienter le patient vers un médecin en urgence.</p>
          <p className="mt-1">Le bloc 5 du compte rendu sera coché. Vous pouvez passer directement aux documents.</p>
          <button
            type="button"
            onClick={onAllerDocuments}
            className={`${CLASSE_BOUTON_SECONDAIRE} mt-2 min-h-11`}
          >
            Aller au compte rendu
          </button>
        </Bandeau>
      ) : (
        <p className="text-[13px] font-semibold text-muted">Aucun signe de gravité coché.</p>
      )}
    </div>
  )
}

function EtapeExclusions({
  donnees,
  onBasculer,
  onAllerDocuments,
}: {
  donnees: DonneesTrodAngine
  onBasculer: (id: IdExclusion) => void
  onAllerDocuments: () => void
}) {
  const nb = nombreCriteresExclusion(donnees)
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13.5px] leading-snug text-muted">
        Un seul critère suffit à écarter la prise en charge en officine. L’âge saisi a déjà coché ou non le premier.
      </p>
      <ul className="flex flex-col gap-2">
        {CRITERES_EXCLUSION.map((c) => (
          <LigneCase key={c.id} libelle={c.libelle} coche={donnees.exclusions[c.id]} onBasculer={() => onBasculer(c.id)} />
        ))}
      </ul>
      {nb > 0 ? (
        <Bandeau ton="alerte">
          <p className="font-bold">
            {nb} critère{nb > 1 ? 's' : ''} d’exclusion : conseiller de consulter son médecin traitant dans les 24 h.
          </p>
          <p className="mt-1">Le bloc 4 du compte rendu sera coché, sans antibiotique délivré.</p>
          <button type="button" onClick={onAllerDocuments} className={`${CLASSE_BOUTON_SECONDAIRE} mt-2 min-h-11`}>
            Aller au compte rendu
          </button>
        </Bandeau>
      ) : (
        <p className="text-[13px] font-semibold text-muted">Aucun critère d’exclusion coché.</p>
      )}
    </div>
  )
}

function EtapeTrod({ donnees, onChoisir }: { donnees: DonneesTrodAngine; onChoisir: (r: ResultatTrod) => void }) {
  const bloque = nombreSignesGravite(donnees) > 0 || nombreCriteresExclusion(donnees) > 0
  return (
    <div className="flex flex-col gap-4">
      {bloque && (
        <Bandeau ton="alerte">
          Un signe de gravité ou un critère d’exclusion est coché : le patient ne relève pas de la prise en charge en
          officine. Si vous avez tout de même réalisé le TROD, notez son résultat.
        </Bandeau>
      )}
      <ul className="flex flex-col gap-2">
        <LigneChoix
          nom="trod"
          libelle="TROD positif"
          detail="Un antibiotique pourra être délivré (étape suivante)."
          coche={donnees.trod === 'positif'}
          onChoisir={() => onChoisir('positif')}
        />
        <LigneChoix
          nom="trod"
          libelle="TROD négatif"
          detail="Simple traitement symptomatique, avec conseil de consulter si les symptômes persistent."
          coche={donnees.trod === 'negatif'}
          onChoisir={() => onChoisir('negatif')}
        />
      </ul>
      {donnees.trod === 'negatif' && (
        <Bandeau ton="info">
          Les blocs 2 et 3 du compte rendu seront cochés : traitement symptomatique, et consulter un médecin en cas de
          persistance des symptômes &gt; 72 h, d’aggravation ou de nouveaux symptômes.
        </Bandeau>
      )}
    </div>
  )
}

const OPTIONS_ALLERGIE: Allergie[] = ['aucune', 'penicillines', 'betalactamines']

function EtapeAntibiotique({
  donnees,
  onAllergie,
  onBon,
  onAntibiotique,
}: {
  donnees: DonneesTrodAngine
  onAllergie: (a: Allergie) => void
  onBon: (b: TypeBon | null) => void
  onAntibiotique: (id: IdAntibiotique) => void
}) {
  if (donnees.trod !== 'positif') {
    return (
      <Bandeau ton="info">
        {donnees.trod === 'negatif'
          ? 'TROD négatif : aucun antibiotique à délivrer.'
          : 'Renseignez le résultat du TROD à l’étape précédente : un antibiotique n’est proposé qu’après un TROD positif.'}
      </Bandeau>
    )
  }

  const bon = typeBonEffectif(donnees)
  const age = ageEnAnnees(donnees)
  const proposes = donnees.allergie ? antibiotiquesProposes(donnees.allergie, bon) : []
  const poidsManquant = bon === 'enfant' && poidsEnKg(donnees) === null

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2" aria-labelledby="titre-allergie">
        <h3 id="titre-allergie" className="text-[14.5px] font-bold text-ink">
          Allergie ou contre-indication
        </h3>
        <ul className="flex flex-col gap-2">
          {OPTIONS_ALLERGIE.map((a) => (
            <LigneChoix
              key={a}
              nom="allergie"
              libelle={LIBELLES_ALLERGIE[a]}
              coche={donnees.allergie === a}
              onChoisir={() => onAllergie(a)}
            />
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="titre-bon">
        <h3 id="titre-bon" className="text-[14.5px] font-bold text-ink">
          Bon de prise en charge
        </h3>
        <ul className="flex flex-col gap-2">
          <LigneChoix
            nom="bon"
            libelle={`Selon l’âge : bon ${bon === 'enfant' ? 'enfant' : 'adulte'}`}
            detail={age === null ? 'Âge non renseigné : bon adulte par défaut.' : undefined}
            coche={donnees.bon === null}
            onChoisir={() => onBon(null)}
          />
          <LigneChoix nom="bon" libelle="Bon enfant (dose au poids)" coche={donnees.bon === 'enfant'} onChoisir={() => onBon('enfant')} />
          <LigneChoix nom="bon" libelle="Bon adulte" coche={donnees.bon === 'adulte'} onChoisir={() => onBon('adulte')} />
        </ul>
      </section>

      {donnees.allergie && (
        <section className="flex flex-col gap-2" aria-labelledby="titre-molecule">
          <h3 id="titre-molecule" className="text-[14.5px] font-bold text-ink">
            Antibiotique à délivrer
          </h3>
          {poidsManquant && (
            <Bandeau ton="alerte">Poids non renseigné : la dose ne peut pas être calculée. Revenez à la première étape.</Bandeau>
          )}
          <ul className="flex flex-col gap-2">
            {proposes.map((id) => (
              <LigneChoix
                key={id}
                nom="antibiotique"
                libelle={ANTIBIOTIQUES[id].nom}
                detail={ANTIBIOTIQUES[id][bon]?.texte}
                info={doseEnTexte(donnees, id)}
                coche={donnees.antibiotique === id}
                onChoisir={() => onAntibiotique(id)}
              />
            ))}
          </ul>
          <p className="text-[12.5px] leading-snug text-muted">
            Les doses calculées appliquent les mg/kg du bon : à vérifier avant de délivrer. Azithromycine et josamycine
            figurent sur le bon mais pas sur le compte rendu : elles y seront notées dans « Points divers ».
          </p>
        </section>
      )}
    </div>
  )
}

function EtapeDocuments({
  donnees,
  onBasculerBloc,
  onPointsDivers,
  onChangerPatient,
  onOuvrir,
}: {
  donnees: DonneesTrodAngine
  onBasculerBloc: (id: (typeof BLOCS)[number]['id']) => void
  onPointsDivers: (v: string) => void
  onChangerPatient: (cle: keyof PatientTrod, valeur: string) => void
  onOuvrir: (chemin: 'compte-rendu' | 'bon') => void
}) {
  const effectifs = blocsEffectifs(donnees)
  const proposes = blocsProposes(donnees)
  const bon = bonDisponible(donnees)
  const secuIncomplet = donnees.patient.secu.length > 0 && donnees.patient.secu.length < 15

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13.5px] leading-snug text-muted">
        Les blocs du compte rendu sont cochés d’après vos réponses. Corrigez-les si besoin, puis ouvrez les documents.
      </p>

      <ul className="flex flex-col gap-2">
        {BLOCS.map((b) => (
          <LigneCase
            key={b.id}
            libelle={`${b.numero}. ${b.libelle}`}
            coche={effectifs[b.id]}
            onBasculer={() => onBasculerBloc(b.id)}
            detail={effectifs[b.id] !== proposes[b.id] ? 'Corrigé à la main' : undefined}
          />
        ))}
      </ul>

      <ChampTexte label="Points divers" valeur={donnees.points_divers} onChanger={onPointsDivers} />

      {(donnees.patient.secu.length === 0 || secuIncomplet) && (
        <div className="flex flex-col gap-2">
          <Bandeau ton="info">
            {secuIncomplet
              ? 'N° de Sécurité sociale incomplet : il compte 15 chiffres.'
              : 'N° de Sécurité sociale non renseigné : les cases du compte rendu resteront vides.'}
          </Bandeau>
          <ChampLigne
            label="N° de Sécurité sociale (15 chiffres)"
            valeur={donnees.patient.secu}
            onChanger={(v) => onChangerPatient('secu', v)}
            inputMode="numeric"
          />
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-[20px] bg-surface p-4 shadow-card">
        <h3 className="text-[14.5px] font-bold text-ink">Documents remplis (PDF)</h3>
        <button type="button" onClick={() => onOuvrir('compte-rendu')} className={`${CLASSE_BOUTON_PRIMAIRE} min-h-14`}>
          <Icone nom="fichier" taille={18} />
          Ouvrir le compte rendu
        </button>
        <button
          type="button"
          onClick={() => onOuvrir('bon')}
          disabled={!bon}
          className={`${CLASSE_BOUTON_SECONDAIRE} min-h-14`}
        >
          <Icone nom="fichier" taille={18} />
          Ouvrir le bon de prise en charge
        </button>
        {!bon && (
          <p className="text-[12.5px] leading-snug text-muted">
            Le bon n’est disponible que si un antibiotique est délivré (bloc 1 coché et antibiotique choisi).
          </p>
        )}
        <p className="text-[12.5px] leading-snug text-muted">
          Le tampon de l’officine et la signature restent à apposer à la main sur le bon. Imprimez ou enregistrez le
          PDF depuis le lecteur.
        </p>
      </div>
    </div>
  )
}
