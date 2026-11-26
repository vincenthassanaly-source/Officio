import type { ReactNode } from 'react'
import {
  QUESTIONS_PREVENTION,
  actionsParTheme,
  calculerAge,
  trancheDepuisAge,
  type DonneesPrevention,
} from '@/lib/prevention'

// Plan personnalisé de prévention, en deux feuilles A4 : 1) le plan remis à la
// personne (objectifs prioritaires, actions retenues par thème), 2) le
// récapitulatif de ses réponses au bilan. Composant de présentation sans état,
// rendu côté serveur et imprimé par le navigateur. Pagination et noir sur blanc
// partagés avec les fiches BPM et Opioïdes (voir globals.css, .bpm-impression /
// .bpm-feuille).

function dateFr(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return ''
  const [a, m, j] = iso.split('-')
  return `${j}/${m}/${a}`
}

const CELLULE = 'border border-ink px-2 py-1.5 align-top print:py-1'
const TEXTE = 'whitespace-pre-wrap break-words'
const LIBELLE = `${CELLULE} bg-neutral-soft text-left text-[12.5px] font-semibold text-ink`

function Bloc({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="bpm-bloc mt-4">
      <h3 className="mb-1 text-[13px] font-bold uppercase text-ink">{titre}</h3>
      {children}
    </section>
  )
}

function Entete({ donnees, titre }: { donnees: DonneesPrevention; titre: string }) {
  const p = donnees.patient
  const nom = `${p.prenom} ${p.nom}`.trim()
  const age = calculerAge(p.naissance, p.date)
  return (
    <header className="mb-3 print:mb-2">
      <h2 className="text-[16px] font-bold uppercase text-ink">{titre}</h2>
      <table className="mt-2 w-full border-collapse">
        <tbody>
          <tr>
            <th scope="row" className={`${LIBELLE} w-[26%]`}>
              Nom et prénom
            </th>
            <td className={`${CELLULE} text-[13px] text-ink ${TEXTE}`}>{nom}</td>
            <th scope="row" className={`${LIBELLE} w-[20%]`}>
              Date du bilan
            </th>
            <td className={`${CELLULE} text-[13px] text-ink`}>{dateFr(p.date)}</td>
          </tr>
          <tr>
            <th scope="row" className={LIBELLE}>
              Date de naissance
            </th>
            <td className={`${CELLULE} text-[13px] text-ink`}>
              {dateFr(p.naissance)}
              {age !== null ? ` (${age} ans)` : ''}
            </td>
            <th scope="row" className={LIBELLE}>
              Pharmacien
            </th>
            <td className={`${CELLULE} text-[13px] text-ink ${TEXTE}`}>{p.pharmacien}</td>
          </tr>
        </tbody>
      </table>
    </header>
  )
}

export function PreventionImpression({ donnees }: { donnees: DonneesPrevention }) {
  const groupes = actionsParTheme(donnees.actions)
  const objectifs = donnees.objectifs.filter((o) => Object.values(o).some((v) => v.trim() !== ''))
  const tranche = trancheDepuisAge(calculerAge(donnees.patient.naissance, donnees.patient.date))
  const reponses = QUESTIONS_PREVENTION.map((q, i) => ({ ...q, ...donnees.reponses[i] })).filter(
    (r) => r.reponse.trim() !== '' || r.note.trim() !== ''
  )

  return (
    <div className="bpm-impression flex flex-col gap-4">
      <section aria-label="Plan personnalisé de prévention" className="bpm-feuille">
        <Entete donnees={donnees} titre="Mon plan personnalisé de prévention" />

        <Bloc titre="Mes objectifs prioritaires">
          {objectifs.length === 0 ? (
            <p className="text-[13px] text-ink">Aucun objectif renseigné.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {objectifs.map((o, i) => (
                <li key={i} className="bpm-ligne">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr>
                        <th scope="row" className={`${LIBELLE} w-[26%]`}>
                          Objectif {i + 1}
                        </th>
                        <td className={`${CELLULE} text-[13px] font-semibold text-ink ${TEXTE}`}>{o.objectif}</td>
                      </tr>
                      {o.obstacles.trim() !== '' && (
                        <tr>
                          <th scope="row" className={LIBELLE}>
                            Obstacles
                          </th>
                          <td className={`${CELLULE} text-[13px] text-ink ${TEXTE}`}>{o.obstacles}</td>
                        </tr>
                      )}
                      {o.actions.trim() !== '' && (
                        <tr>
                          <th scope="row" className={LIBELLE}>
                            Actions concrètes
                          </th>
                          <td className={`${CELLULE} text-[13px] text-ink ${TEXTE}`}>{o.actions}</td>
                        </tr>
                      )}
                      {o.ressources.trim() !== '' && (
                        <tr>
                          <th scope="row" className={LIBELLE}>
                            Ressources
                          </th>
                          <td className={`${CELLULE} text-[13px] text-ink ${TEXTE}`}>{o.ressources}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </li>
              ))}
            </ol>
          )}
        </Bloc>

        <Bloc titre="Les actions à mettre en place">
          {groupes.length === 0 ? (
            <p className="text-[13px] text-ink">Aucune action retenue.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {groupes.map((g) => (
                <div key={g.theme} className="bpm-ligne">
                  <h4 className="text-[13px] font-bold text-ink">{g.libelle}</h4>
                  <ul className="mt-0.5 flex flex-col gap-1">
                    {g.actions.map((a) => (
                      <li key={a.id} className="flex gap-2 text-[13px] leading-snug text-ink">
                        <span aria-hidden="true" className="mt-0.5 inline-block size-3.5 shrink-0 border-2 border-ink" />
                        <span className={TEXTE}>{a.texte}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Bloc>

        <footer className="mt-5 text-[12px] leading-snug text-ink print:text-[11.5px]">
          <p>
            Ce plan a été construit avec vous lors de votre bilan prévention
            {tranche ? ` (tranche d’âge ${tranche} ans)` : ''}. Il ne remplace pas un avis médical : en cas de symptôme ou
            de doute, consultez votre médecin.
          </p>
        </footer>
      </section>

      <section aria-label="Récapitulatif des réponses" className="bpm-feuille">
        <Entete donnees={donnees} titre="Bilan de prévention : récapitulatif des réponses" />
        {reponses.length === 0 ? (
          <p className="text-[13px] text-ink">Aucune réponse renseignée.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th scope="col" className={`${LIBELLE} w-[42%]`}>
                  Question
                </th>
                <th scope="col" className={LIBELLE}>
                  Réponse et notes
                </th>
              </tr>
            </thead>
            <tbody>
              {reponses.map((r) => (
                <tr key={r.texte} className="bpm-ligne">
                  <th scope="row" className={`${CELLULE} text-left text-[12.5px] font-normal text-ink`}>
                    <span className="block text-[12px] font-semibold uppercase print:text-[11.5px]">{r.section}</span>
                    {r.texte}
                  </th>
                  <td className={`${CELLULE} text-[13px] text-ink ${TEXTE}`}>
                    {r.reponse}
                    {r.note.trim() !== '' && <span className="mt-1 block text-[12px] italic">Note : {r.note}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
