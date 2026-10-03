import type { ReactNode } from 'react'
import {
  CHAMPS_TEXTE,
  QUESTIONS_POMI,
  REGLES_BON_USAGE,
  SEUIL_POMI,
  calculerPomi,
  type DonneesOpioides,
} from '@/lib/opioides'

// Compte rendu de l'entretien « Opioïdes » : reprise de la fiche de
// l'Assurance Maladie sans ses textes de rappel (identité et prescription,
// règles de bon usage abordées, POMI, conclusions). Composant de présentation
// sans état, rendu côté serveur et imprimé par le navigateur. Les règles de
// pagination et le noir sur blanc sont partagés avec la fiche BPM (voir
// globals.css, .bpm-impression / .bpm-feuille).

function dateFr(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return ''
  const [a, m, j] = iso.split('-')
  return `${j}/${m}/${a}`
}

const CELLULE = 'border border-ink px-2 py-1.5 align-top print:py-1'
const TEXTE = 'whitespace-pre-wrap break-words'

function Ligne({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <tr className="bpm-ligne">
      <th scope="row" className={`${CELLULE} w-[34%] bg-neutral-soft text-left text-[12.5px] font-semibold text-ink`}>
        {libelle}
      </th>
      <td className={`${CELLULE} min-h-8 text-[13px] text-ink ${TEXTE}`}>{valeur}</td>
    </tr>
  )
}

function Bloc({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="bpm-bloc mt-4">
      <h3 className="mb-1 text-[13px] font-bold uppercase text-ink">{titre}</h3>
      {children}
    </section>
  )
}

// Case de la liste « bon usage » : dessinée (pas de glyphe), cochée = abordé.
function CaseAbordee({ abordee }: { abordee: boolean }) {
  return (
    <span aria-hidden="true" className="inline-flex size-4 shrink-0 items-center justify-center border-2 border-ink align-middle">
      {abordee && (
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="4">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
    </span>
  )
}

function MarqueReponse({ valeur, choisie }: { valeur: string; choisie: boolean }) {
  return (
    <span className={choisie ? 'bpm-case-choisie' : undefined}>
      {valeur}
      {choisie && <span className="sr-only"> (réponse donnée)</span>}
    </span>
  )
}

export function OpioidesImpression({ donnees }: { donnees: DonneesOpioides }) {
  const p = donnees.patient
  const { score, complet, risque } = calculerPomi(donnees.pomi)
  const abordees = donnees.bon_usage.filter(Boolean).length

  return (
    <div className="bpm-impression flex flex-col gap-4">
      <section aria-label="Fiche entretien accompagnement opioïdes" className="bpm-feuille">
        <header className="mb-3 print:mb-2">
          <h2 className="text-[16px] font-bold uppercase text-ink">Fiche entretien accompagnement « Opioïdes »</h2>
          <p className="text-[11.5px] text-ink">D’après la fiche pharmacien de l’Assurance Maladie.</p>
        </header>

        <table className="w-full border-collapse">
          <caption className="mb-1 text-left text-[13px] font-bold uppercase text-ink">Informations patient</caption>
          <tbody>
            <Ligne libelle="Nom" valeur={p.nom} />
            <Ligne libelle="Prénom" valeur={p.prenom} />
            <Ligne libelle="Âge" valeur={p.age ? `${p.age} ans` : ''} />
            <Ligne libelle="Coordonnées" valeur={p.coordonnees} />
            <Ligne libelle="Médecin prescripteur" valeur={p.medecin} />
            <Ligne libelle="Molécule prescrite et dosage" valeur={p.molecule} />
            <Ligne libelle="Posologie et durée de traitement" valeur={p.posologie} />
            <Ligne libelle="Indication" valeur={p.indication} />
            <Ligne libelle="Pharmacien" valeur={p.pharmacien} />
            <Ligne libelle="Date de l’entretien" valeur={dateFr(p.date)} />
          </tbody>
        </table>

        <Bloc titre="Règles de bon usage transmises à la délivrance">
          <ul className="flex flex-col">
            {REGLES_BON_USAGE.map((regle, i) => (
              <li key={regle} className="bpm-ligne flex items-start gap-2 border-b border-ink py-1 text-[11.5px] leading-snug text-ink">
                <CaseAbordee abordee={donnees.bon_usage[i]} />
                <span>
                  {regle}
                  <span className="sr-only">{donnees.bon_usage[i] ? ' (abordée)' : ' (non abordée)'}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[11.5px] text-ink">
            {abordees} règle{abordees > 1 ? 's' : ''} abordée{abordees > 1 ? 's' : ''} sur {REGLES_BON_USAGE.length}.
          </p>
        </Bloc>

        <Bloc titre="Évaluation du risque de mésusage : questionnaire POMI">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th scope="col" className={`${CELLULE} text-left text-[11.5px] font-semibold text-ink`}>
                  <span className="sr-only">Question</span>
                </th>
                <th scope="col" className={`${CELLULE} w-16 text-center text-[11.5px] font-bold text-ink`}>
                  Oui
                </th>
                <th scope="col" className={`${CELLULE} w-16 text-center text-[11.5px] font-bold text-ink`}>
                  Non
                </th>
              </tr>
            </thead>
            <tbody>
              {QUESTIONS_POMI.map((question, i) => (
                <tr key={question} className="bpm-ligne">
                  <td className={`${CELLULE} text-[11.5px] leading-snug text-ink`}>
                    {i + 1}. {question}
                  </td>
                  <td className={`${CELLULE} text-center text-[12.5px] text-ink`}>
                    <MarqueReponse valeur="Oui" choisie={donnees.pomi[i] === 'oui'} />
                  </td>
                  <td className={`${CELLULE} text-center text-[12.5px] text-ink`}>
                    <MarqueReponse valeur="Non" choisie={donnees.pomi[i] === 'non'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1.5 text-[13px] font-bold text-ink">
            Score : {score} / {QUESTIONS_POMI.length}
            {risque
              ? `, seuil de ${SEUIL_POMI} atteint : risque actuel de mésusage`
              : complet
                ? `, sous le seuil de ${SEUIL_POMI}`
                : ', questionnaire incomplet'}
          </p>
        </Bloc>

        {CHAMPS_TEXTE.map((c) => (
          <Bloc key={c.cle} titre={c.intitule}>
            <p className={`min-h-16 border border-ink px-2 py-1.5 text-[13px] leading-relaxed text-ink ${TEXTE}`}>
              {donnees[c.cle]}
            </p>
          </Bloc>
        ))}
      </section>
    </div>
  )
}
