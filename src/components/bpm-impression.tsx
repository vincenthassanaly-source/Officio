import type { ReactNode } from 'react'
import {
  CHAMPS_ANALYSE,
  COLONNES_TRAITEMENTS,
  QUESTIONS_GIRERD,
  QUESTIONS_RECUEIL,
  calculerGirerd,
  libelleNiveau,
  type DonneesBpm,
  type QuestionRecueil,
  type SectionRecueil,
} from '@/lib/bpm'

// Compte rendu du BPM : reprise de la fiche papier USPO, page pour page
// (recueil 1/4, traitements 2/4, recueil 3/4, Girerd 4/4, analyse). Composant
// de présentation sans état : rendu côté serveur, imprimé par le navigateur.
// Les règles de pagination et le noir sur blanc vivent dans globals.css
// (.bpm-impression, .bpm-feuille).

const LIGNES_MINIMUM_TRAITEMENTS = 11

const TITRE_SECTION_IMPRIME: Record<SectionRecueil, string> = {
  'Habitudes de vie': 'Habitudes de vie',
  'État physiologique': 'État physiologique',
  Autres: 'Autres',
  Généralités: 'Généralités',
  'Autres traitements': 'Autres traitements',
  Modifications: 'Modifications',
  'Effet des traitements': 'Effet des traitements',
  'Prise des médicaments': 'Comment se passe la prise de vos médicaments',
}

function dateFr(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return ''
  const [a, m, j] = iso.split('-')
  return `${j}/${m}/${a}`
}

const CELLULE = 'border border-ink px-2 py-1.5 align-top print:py-1'
const TEXTE = 'whitespace-pre-wrap break-words'

function EnTete({ titre, sujet }: { titre: string; sujet: string }) {
  return (
    <header className="mb-3 print:mb-2">
      <p className="text-[12px] font-bold leading-tight text-ink">
        Guide d’accompagnement des patients
        <br />
        Le bilan partagé de médication chez le patient âgé polymédiqué
      </p>
      <div className="mt-2 flex items-baseline justify-between gap-4">
        <h2 className="text-[15px] font-semibold uppercase text-ink">{titre}</h2>
        <p className="text-[15px] font-semibold uppercase text-ink">{sujet}</p>
      </div>
    </header>
  )
}

function Feuille({
  children,
  paysage = false,
  libelle,
}: {
  children: ReactNode
  paysage?: boolean
  libelle: string
}) {
  return (
    <section aria-label={libelle} className={`bpm-feuille ${paysage ? 'bpm-feuille-paysage' : ''}`}>
      {children}
    </section>
  )
}

function CaseEntete({ libelle, valeur, className = '' }: { libelle: string; valeur: string; className?: string }) {
  return (
    <td className={`${CELLULE} ${className}`}>
      <span className="text-[11px] uppercase text-ink">{libelle}</span>
      <span className={`block min-h-5 text-[13px] font-semibold text-ink ${TEXTE}`}>{valeur}</span>
    </td>
  )
}

function ligneQuestion(q: QuestionRecueil, reponse: string) {
  return (
    <tr key={q.cle} className="bpm-ligne">
      <td className={`${CELLULE} w-[44%] text-[12.5px] leading-snug text-ink print:text-[11.5px]`}>
        <span className="font-semibold">{q.intitule}</span>
        {q.pistes.map((p) => (
          <span key={p} className="block text-[11.5px] print:text-[10.5px]">
            {p}
          </span>
        ))}
      </td>
      <td
        className={`${CELLULE} ${q.cle === 'remarques' ? 'h-28 print:h-20' : 'h-12 print:h-7'} text-[13px] text-ink print:text-[12px] ${TEXTE}`}
      >
        {reponse}
      </td>
    </tr>
  )
}

function TableauQuestions({ sections, donnees }: { sections: SectionRecueil[]; donnees: DonneesBpm }) {
  return (
    <table className="w-full border-collapse">
      <tbody>
        {sections.map((section) => (
          <SectionLignes key={section} section={section} donnees={donnees} />
        ))}
      </tbody>
    </table>
  )
}

function SectionLignes({ section, donnees }: { section: SectionRecueil; donnees: DonneesBpm }) {
  return (
    <>
      <tr className="bpm-ligne">
        <th scope="colgroup" colSpan={2} className={`${CELLULE} bg-neutral-soft text-left text-[12.5px] font-bold uppercase text-ink`}>
          {TITRE_SECTION_IMPRIME[section]}
        </th>
      </tr>
      {QUESTIONS_RECUEIL.filter((q) => q.section === section).map((q) => ligneQuestion(q, donnees.recueil[q.cle]))}
    </>
  )
}

function FeuilleRecueil1({ donnees }: { donnees: DonneesBpm }) {
  const e = donnees.entete
  return (
    <Feuille libelle="Fiche de recueil des informations, page 1 sur 4 : le patient">
      <EnTete titre="Fiche de recueil des informations (1/4)" sujet="Le patient" />
      <table className="mb-4 w-full border-collapse">
        <tbody>
          <tr>
            <CaseEntete libelle="Nom" valeur={e.nom} className="w-1/2" />
            <CaseEntete libelle="Prénom" valeur={e.prenom} />
          </tr>
          <tr>
            <CaseEntete libelle="Date" valeur={dateFr(e.date)} />
            <CaseEntete libelle="Médecin traitant" valeur={e.medecin} />
          </tr>
          <tr>
            <CaseEntete libelle="Âge" valeur={e.age} />
            <CaseEntete libelle="Poids" valeur={e.poids ? `${e.poids} kg` : ''} />
          </tr>
          <tr>
            <td colSpan={2} className={CELLULE}>
              <span className="text-[11px] uppercase text-ink">Adresse</span>
              <span className={`block min-h-5 text-[13px] font-semibold text-ink ${TEXTE}`}>{e.adresse}</span>
            </td>
          </tr>
        </tbody>
      </table>
      <TableauQuestions sections={['Habitudes de vie', 'État physiologique', 'Autres']} donnees={donnees} />
    </Feuille>
  )
}

function FeuilleTraitements({ donnees }: { donnees: DonneesBpm }) {
  const e = donnees.entete
  const lignes = donnees.traitements
  const vides = Math.max(0, LIGNES_MINIMUM_TRAITEMENTS - lignes.length)
  return (
    <Feuille paysage libelle="Fiche de recueil des informations, page 2 sur 4 : les traitements">
      <EnTete titre="Fiche de recueil des informations (2/4)" sujet="Les traitements" />
      <table className="mb-4 w-full border-collapse">
        <tbody>
          <tr>
            <CaseEntete libelle="Nom" valeur={e.nom} className="w-[40%]" />
            <CaseEntete libelle="Prénom" valeur={e.prenom} className="w-[40%]" />
            <CaseEntete libelle="Date" valeur={dateFr(e.date)} />
          </tr>
        </tbody>
      </table>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {COLONNES_TRAITEMENTS.map((c) => (
              <th key={c.cle} scope="col" className={`${CELLULE} text-center text-[11.5px] font-semibold uppercase text-ink`}>
                {c.intitule}
                {c.precision && <span className="block text-[10.5px] font-normal normal-case">{c.precision}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l.id} className="bpm-ligne">
              {COLONNES_TRAITEMENTS.map((c) => (
                <td key={c.cle} className={`${CELLULE} h-9 text-[12px] text-ink ${TEXTE}`}>
                  {l[c.cle]}
                </td>
              ))}
            </tr>
          ))}
          {Array.from({ length: vides }, (_, i) => (
            <tr key={`vide-${i}`} className="bpm-ligne" aria-hidden="true">
              {COLONNES_TRAITEMENTS.map((c) => (
                <td key={c.cle} className={`${CELLULE} h-9`} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Feuille>
  )
}

function FeuilleRecueil3({ donnees }: { donnees: DonneesBpm }) {
  const e = donnees.entete
  return (
    <Feuille libelle="Fiche de recueil des informations, page 3 sur 4 : les traitements, pratiques de prise">
      <EnTete titre="Fiche de recueil des informations (3/4)" sujet="Les traitements" />
      <table className="mb-4 w-full border-collapse">
        <tbody>
          <tr>
            <CaseEntete libelle="Nom" valeur={e.nom} className="w-[40%]" />
            <CaseEntete libelle="Prénom" valeur={e.prenom} className="w-[40%]" />
            <CaseEntete libelle="Date" valeur={dateFr(e.date)} />
          </tr>
        </tbody>
      </table>
      <TableauQuestions
        sections={['Généralités', 'Autres traitements', 'Modifications', 'Effet des traitements', 'Prise des médicaments']}
        donnees={donnees}
      />
    </Feuille>
  )
}

function FeuilleGirerd({ donnees }: { donnees: DonneesBpm }) {
  const e = donnees.entete
  const { score, niveau } = calculerGirerd(donnees.girerd)
  return (
    <Feuille libelle="Fiche de recueil des informations, page 4 sur 4 : questionnaire de Girerd">
      <EnTete titre="Fiche de recueil des informations (4/4)" sujet="Les traitements" />
      <h3 className="mb-3 text-center text-[14px] font-semibold uppercase text-ink">
        Évaluation de l’observance
        <br />
        Questionnaire de Girerd
      </h3>
      <table className="mb-4 w-full border-collapse">
        <tbody>
          <tr>
            <CaseEntete libelle="Nom" valeur={e.nom} className="w-[40%]" />
            <CaseEntete libelle="Prénom" valeur={e.prenom} className="w-[40%]" />
            <CaseEntete libelle="Date" valeur={dateFr(e.date)} />
          </tr>
        </tbody>
      </table>

      <p className="mb-2 text-[14px] font-bold text-ink">Comment se passe la prise de vos médicaments</p>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th scope="col" className={`${CELLULE} text-left text-[12px] font-semibold text-ink`}>
              <span className="sr-only">Question</span>
            </th>
            <th scope="col" className={`${CELLULE} w-24 text-center text-[12px] font-bold text-ink`}>
              Oui
            </th>
            <th scope="col" className={`${CELLULE} w-24 text-center text-[12px] font-bold text-ink`}>
              Non
            </th>
          </tr>
        </thead>
        <tbody>
          {QUESTIONS_GIRERD.map((question, i) => {
            const reponse = donnees.girerd[i]
            return (
              <tr key={question} className="bpm-ligne">
                <td className={`${CELLULE} text-[12.5px] text-ink`}>{question}</td>
                <td className={`${CELLULE} text-center text-[13px] text-ink`}>
                  <MarqueReponse valeur="0" choisie={reponse === 'oui'} />
                </td>
                <td className={`${CELLULE} text-center text-[13px] text-ink`}>
                  <MarqueReponse valeur="1" choisie={reponse === 'non'} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="mt-3 text-[12px] leading-snug text-ink">
        <p>Chaque réponse négative vaut un point. L’observance est appréciée comme suit :</p>
        <ul className="ml-5 list-disc">
          <li>Bonne observance : score = 6</li>
          <li>Faible observance : score = 4 ou 5</li>
          <li>Non observance : score inférieur ou égal à 3</li>
        </ul>
        <p className="mt-2 text-[14px] font-bold">
          {score === null || niveau === null
            ? 'Score : questionnaire incomplet'
            : `Score : ${score} / 6, ${libelleNiveau(niveau)}`}
        </p>
      </div>

      <p className="mt-4 text-[12.5px] font-semibold text-ink underline">Autres éléments :</p>
      <p className={`mt-1 min-h-24 text-[13px] text-ink ${TEXTE}`}>{donnees.girerd_autres}</p>
    </Feuille>
  )
}

// Les cases 0 / 1 de la fiche papier : celle qui correspond à la réponse est
// entourée (et annoncée aux lecteurs d'écran).
function MarqueReponse({ valeur, choisie }: { valeur: string; choisie: boolean }) {
  return (
    <span className={choisie ? 'bpm-case-choisie' : undefined}>
      {valeur}
      {choisie && <span className="sr-only"> (réponse donnée)</span>}
    </span>
  )
}

function FeuilleAnalyse({ donnees }: { donnees: DonneesBpm }) {
  const e = donnees.entete
  return (
    <Feuille libelle="Analyse des traitements">
      <header className="mb-3 print:mb-2">
        <p className="text-[12px] font-bold leading-tight text-ink">
          Guide d’accompagnement des patients
          <br />
          Le bilan partagé de médication chez le patient âgé polymédiqué
        </p>
        <h2 className="mt-2 text-[15px] font-semibold uppercase text-ink">Analyse des traitements</h2>
      </header>
      <table className="mb-5 w-full border-collapse">
        <tbody>
          <tr>
            <CaseEntete libelle="Nom" valeur={e.nom} className="w-1/2" />
            <CaseEntete libelle="Prénom" valeur={e.prenom} />
          </tr>
          <tr>
            <CaseEntete libelle="Médecin traitant" valeur={e.medecin} />
            <CaseEntete libelle="Pharmacien" valeur={e.pharmacien} />
          </tr>
          <tr>
            <CaseEntete libelle="Date" valeur={dateFr(e.date)} />
            <CaseEntete libelle="Âge · Poids" valeur={[e.age && `${e.age} ans`, e.poids && `${e.poids} kg`].filter(Boolean).join(' · ')} />
          </tr>
          <tr>
            <td colSpan={2} className={CELLULE}>
              <span className="text-[11px] uppercase text-ink">Adresse</span>
              <span className={`block min-h-5 text-[13px] font-semibold text-ink ${TEXTE}`}>{e.adresse}</span>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="flex flex-col gap-6">
        {CHAMPS_ANALYSE.map((c) => (
          <section key={c.cle} className="bpm-bloc">
            <h3 className="text-[13px] font-bold text-ink">{c.intitule}</h3>
            {c.pistes.map((p) => (
              <p key={p} className="text-[11.5px] text-ink">
                {p}
              </p>
            ))}
            <p className={`mt-1 min-h-28 text-[13px] leading-relaxed text-ink ${TEXTE}`}>{donnees.analyse[c.cle]}</p>
          </section>
        ))}
      </div>
    </Feuille>
  )
}

export function BpmImpression({ donnees }: { donnees: DonneesBpm }) {
  return (
    <div className="bpm-impression flex flex-col gap-4">
      <FeuilleRecueil1 donnees={donnees} />
      <FeuilleTraitements donnees={donnees} />
      <FeuilleRecueil3 donnees={donnees} />
      <FeuilleGirerd donnees={donnees} />
      <FeuilleAnalyse donnees={donnees} />
    </div>
  )
}
