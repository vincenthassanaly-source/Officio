// Fiche « Bilan de prévention » : identité, réponses aux 12 questions du script
// (texte libre + note), thèmes à travailler, actions du plan personnalisé et
// objectifs prioritaires. Alimente le plan de prévention imprimé en fin
// d'entretien.
// Module pur (aucun import serveur ni React) : utilisé par la saisie, la page
// d'impression et les actions serveur, qui revalident toujours les données
// reçues avec normaliserPrevention().

import { dateDuJourIso } from '@/lib/bpm'

// --- Questions (reprises du script « Bilan de prévention ») ----------------------

export type QuestionPrevention = { section: string; texte: string }

export const QUESTIONS_PREVENTION: QuestionPrevention[] = [
  { section: 'Situation et antécédents', texte: 'Avez-vous des enfants à la maison ? Aidez-vous un proche ? Pouvez-vous compter sur quelqu’un en cas de besoin ?' },
  { section: 'Situation et antécédents', texte: 'Vos conditions de vie ou de travail sont-elles difficiles ou pénibles ?' },
  {
    section: 'Situation et antécédents',
    texte:
      'Avez-vous ou avez-vous eu une maladie ou un facteur de risque (hypertension, diabète, cholestérol, maladie cardiovasculaire, cancer, maladie respiratoire) ? Y a-t-il des maladies connues dans votre famille proche ?',
  },
  { section: 'Situation et antécédents', texte: 'Suivez-vous un traitement ? Quand a eu lieu votre dernière prise de sang ?' },
  { section: 'Activité physique et alimentation', texte: 'Combien de fois par semaine faites-vous au moins 30 minutes d’activité physique ?' },
  { section: 'Activité physique et alimentation', texte: 'Combien de temps passez-vous assis(e) par jour, et devant un écran hors travail ?' },
  {
    section: 'Activité physique et alimentation',
    texte: 'Combien de portions de fruits et légumes mangez-vous par jour ? À quelle fréquence mangez-vous des aliments gras, sucrés ou salés ?',
  },
  {
    section: 'Activité physique et alimentation',
    texte:
      'Avez-vous constaté une variation de poids récente, des gonflements des jambes, une toux fréquente, un essoufflement, des pauses respiratoires la nuit ?',
  },
  { section: 'Vaccins et dépistages', texte: 'Êtes-vous à jour de vos vaccins et rappels ? Avez-vous votre carnet ?' },
  {
    section: 'Vaccins et dépistages',
    texte: 'Avez-vous réalisé les dépistages recommandés pour votre âge (cancer colorectal, sein, col de l’utérus) ?',
  },
  {
    section: 'Vaccins et dépistages',
    texte: 'Concernant la santé sexuelle, êtes-vous dans une situation qui justifie un dépistage ou une protection ?',
  },
  { section: 'Addictions', texte: 'Consommez-vous du tabac, de l’alcool ou d’autres substances ? À quelle fréquence ?' },
]

// Consigne affichée au pharmacien en tête de la section « Addictions » (script).
export const CONSIGNE_ADDICTIONS =
  'Repérer les consommations à risque et proposer, si la personne le souhaite, un accompagnement ou une orientation.'

// --- Thèmes et tranches d'âge ----------------------------------------------------

export type ThemePrevention =
  | 'suivi_medical'
  | 'activite'
  | 'alimentation'
  | 'vaccins'
  | 'depistages'
  | 'sante_sexuelle'
  | 'addictions'

export const THEMES_PREVENTION: { cle: ThemePrevention; libelle: string }[] = [
  { cle: 'suivi_medical', libelle: 'Suivi médical et traitements' },
  { cle: 'activite', libelle: 'Activité physique et sédentarité' },
  { cle: 'alimentation', libelle: 'Alimentation' },
  { cle: 'vaccins', libelle: 'Vaccins' },
  { cle: 'depistages', libelle: 'Dépistages' },
  { cle: 'sante_sexuelle', libelle: 'Santé sexuelle' },
  { cle: 'addictions', libelle: 'Addictions (tabac, alcool, autres)' },
]

// Thème des actions saisies librement par le pharmacien.
export const THEME_LIBRE = 'libre'
export type ThemeAction = ThemePrevention | typeof THEME_LIBRE

const CLES_THEMES = new Set<string>(THEMES_PREVENTION.map((t) => t.cle))

export function libelleTheme(theme: ThemeAction): string {
  return theme === THEME_LIBRE ? 'Autres actions' : (THEMES_PREVENTION.find((t) => t.cle === theme)?.libelle ?? '')
}

// Tranches d'âge de « Mon bilan prévention » (Assurance Maladie).
export type TranchePrevention = '18-25' | '45-50' | '60-65' | '70-75'

export const TRANCHES_PREVENTION: TranchePrevention[] = ['18-25', '45-50', '60-65', '70-75']

// Âge en années révolues à la date du bilan ; null si l'une des dates est invalide
// ou si le bilan précède la naissance.
export function calculerAge(naissanceIso: string, bilanIso: string): number | null {
  const n = /^(\d{4})-(\d{2})-(\d{2})$/.exec(naissanceIso)
  const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(bilanIso)
  if (!n || !b) return null
  const [an, mn, jn] = [Number(n[1]), Number(n[2]), Number(n[3])]
  const [ab, mb, jb] = [Number(b[1]), Number(b[2]), Number(b[3])]
  let age = ab - an
  if (mb < mn || (mb === mn && jb < jn)) age -= 1
  return age >= 0 && age < 130 ? age : null
}

export function trancheDepuisAge(age: number | null): TranchePrevention | null {
  if (age === null) return null
  for (const tranche of TRANCHES_PREVENTION) {
    const [min, max] = tranche.split('-').map(Number)
    if (age >= min && age <= max) return tranche
  }
  return null
}

// --- Actions suggérées (à valider par le pharmacien) --------------------------------

export type ActionSuggeree = {
  id: string
  theme: ThemePrevention
  texte: string
  // Absent : valable pour toutes les tranches d'âge.
  tranches?: TranchePrevention[]
}

// Trame établie d'après les repères publics (Assurance Maladie / « Mon bilan
// prévention », Santé publique France, HAS, calendrier vaccinal). Elle sert de
// point de départ : chaque action est proposée, jamais imposée, et reste
// modifiable avant impression. À relire et valider par le pharmacien titulaire
// avant mise en service.
export const ACTIONS_SUGGEREES: ActionSuggeree[] = [
  // Suivi médical
  { id: 'suivi-medecin', theme: 'suivi_medical', texte: 'En parler à votre médecin traitant lors de votre prochaine consultation.' },
  { id: 'suivi-bilan-sanguin', theme: 'suivi_medical', texte: 'Faire le point avec votre médecin sur les examens de suivi (tension, glycémie, cholestérol).', tranches: ['45-50', '60-65', '70-75'] },
  { id: 'suivi-traitements', theme: 'suivi_medical', texte: 'Faire le point sur vos traitements avec votre pharmacien (bilan de médication si besoin).', tranches: ['60-65', '70-75'] },
  { id: 'suivi-vue-audition', theme: 'suivi_medical', texte: 'Faire contrôler votre vue et votre audition.', tranches: ['60-65', '70-75'] },
  { id: 'suivi-chutes', theme: 'suivi_medical', texte: 'Prévenir les chutes : aménager le logement, garder une activité physique adaptée, en parler à votre médecin.', tranches: ['70-75'] },
  { id: 'suivi-dentiste', theme: 'suivi_medical', texte: 'Consulter un chirurgien-dentiste au moins une fois par an.' },
  // Activité physique
  { id: 'activite-150', theme: 'activite', texte: 'Viser au moins 30 minutes d’activité physique modérée (marche rapide, vélo…) 5 jours par semaine.' },
  { id: 'activite-pauses', theme: 'activite', texte: 'Limiter le temps assis : se lever et bouger quelques minutes toutes les heures.' },
  { id: 'activite-ecrans', theme: 'activite', texte: 'Limiter le temps passé devant les écrans en dehors du travail.', tranches: ['18-25', '45-50'] },
  { id: 'activite-equilibre', theme: 'activite', texte: 'Pratiquer des exercices d’équilibre et de renforcement musculaire (2 fois par semaine).', tranches: ['60-65', '70-75'] },
  // Alimentation
  { id: 'alim-fruits-legumes', theme: 'alimentation', texte: 'Manger au moins 5 fruits et légumes par jour.' },
  { id: 'alim-gras-sucre-sel', theme: 'alimentation', texte: 'Réduire les produits gras, sucrés, salés et ultra-transformés.' },
  { id: 'alim-fibres', theme: 'alimentation', texte: 'Privilégier les légumes secs, les céréales complètes et le poisson.' },
  { id: 'alim-denutrition', theme: 'alimentation', texte: 'Veiller à un apport suffisant en protéines et en calcium, et peser régulièrement pour repérer une perte de poids.', tranches: ['70-75'] },
  // Vaccins
  { id: 'vaccins-carnet', theme: 'vaccins', texte: 'Vérifier votre carnet de vaccination et faire les rappels manquants avec votre médecin ou votre pharmacien.' },
  { id: 'vaccins-dtp', theme: 'vaccins', texte: 'Rappel diphtérie-tétanos-poliomyélite : à 25, 45 et 65 ans, puis tous les 10 ans à partir de 65 ans.' },
  { id: 'vaccins-jeunes', theme: 'vaccins', texte: 'Vérifier les vaccins ROR (rougeole), HPV et méningocoques, avec rattrapage si besoin.', tranches: ['18-25'] },
  { id: 'vaccins-grippe-covid', theme: 'vaccins', texte: 'Vaccination annuelle contre la grippe et la Covid-19 (à l’automne).', tranches: ['60-65', '70-75'] },
  { id: 'vaccins-pneumocoque-zona', theme: 'vaccins', texte: 'Demander conseil sur les vaccins contre le pneumocoque et le zona.', tranches: ['60-65', '70-75'] },
  // Dépistages
  { id: 'depist-colorectal', theme: 'depistages', texte: 'Cancer colorectal : test à faire chez soi tous les 2 ans, de 50 à 74 ans.', tranches: ['45-50', '60-65', '70-75'] },
  { id: 'depist-sein', theme: 'depistages', texte: 'Cancer du sein : mammographie tous les 2 ans, de 50 à 74 ans.', tranches: ['45-50', '60-65', '70-75'] },
  { id: 'depist-col', theme: 'depistages', texte: 'Cancer du col de l’utérus : dépistage régulier de 25 à 65 ans (frottis puis test HPV, selon l’âge).', tranches: ['18-25', '45-50', '60-65'] },
  { id: 'depist-ist', theme: 'depistages', texte: 'Dépistage du VIH et des infections sexuellement transmissibles : en parler à votre médecin ou vous rendre dans un centre de dépistage.', tranches: ['18-25'] },
  // Santé sexuelle
  { id: 'sexuelle-protection', theme: 'sante_sexuelle', texte: 'Se protéger : préservatif, contraception adaptée, dépistage en cas de nouveau partenaire.' },
  { id: 'sexuelle-contraception', theme: 'sante_sexuelle', texte: 'Faire le point sur votre contraception avec un professionnel de santé.', tranches: ['18-25', '45-50'] },
  // Addictions
  { id: 'addic-tabac', theme: 'addictions', texte: 'Arrêter de fumer : être accompagné par Tabac info service (39 89) ou votre pharmacien ; des substituts nicotiniques peuvent être pris en charge.' },
  { id: 'addic-alcool', theme: 'addictions', texte: 'Alcool : pas plus de 2 verres par jour, pas plus de 10 par semaine, et des jours sans alcool.' },
  { id: 'addic-autres', theme: 'addictions', texte: 'Consommation d’autres substances : en parler sans crainte à votre médecin ou appeler Drogues info service (0 800 23 13 13).' },
]

// Actions proposées pour les thèmes cochés, filtrées par tranche d'âge quand
// elle est connue. Hors tranche (ou date de naissance absente), seules les
// actions valables pour tous les âges sont proposées.
export function suggestionsPourThemes(themes: ThemePrevention[], tranche: TranchePrevention | null): ActionSuggeree[] {
  return ACTIONS_SUGGEREES.filter(
    (a) => themes.includes(a.theme) && (a.tranches === undefined || (tranche !== null && a.tranches.includes(tranche)))
  )
}

// --- Données ------------------------------------------------------------------

export type PatientPrevention = {
  nom: string
  prenom: string
  naissance: string // AAAA-MM-JJ
  date: string // AAAA-MM-JJ : date du bilan
  pharmacien: string
}

export type ReponsePrevention = { reponse: string; note: string }

export type ActionPlan = { id: string; theme: ThemeAction; texte: string }

export type ObjectifPrevention = { objectif: string; obstacles: string; actions: string; ressources: string }

export const NB_OBJECTIFS = 3

export type DonneesPrevention = {
  patient: PatientPrevention
  reponses: ReponsePrevention[]
  themes: ThemePrevention[]
  actions: ActionPlan[]
  objectifs: ObjectifPrevention[]
}

export type EtapePrevention =
  | { type: 'patient' }
  | { type: 'question'; index: number }
  | { type: 'themes' }
  | { type: 'actions' }
  | { type: 'objectif'; index: number }
  | { type: 'fin' }

export type SectionPrevention = { titre: string; etapes: EtapePrevention[] }

export function construireSectionsPrevention(): SectionPrevention[] {
  const sections: SectionPrevention[] = [{ titre: 'La personne', etapes: [{ type: 'patient' }] }]
  QUESTIONS_PREVENTION.forEach((q, index) => {
    const derniere = sections[sections.length - 1]
    if (derniere.titre === q.section) derniere.etapes.push({ type: 'question', index })
    else sections.push({ titre: q.section, etapes: [{ type: 'question', index }] })
  })
  sections.push({
    titre: 'Plan personnalisé',
    etapes: [
      { type: 'themes' },
      { type: 'actions' },
      ...Array.from({ length: NB_OBJECTIFS }, (_, index) => ({ type: 'objectif' as const, index })),
    ],
  })
  return sections
}

export function donneesPreventionVides(): DonneesPrevention {
  return {
    patient: { nom: '', prenom: '', naissance: '', date: dateDuJourIso(), pharmacien: '' },
    reponses: QUESTIONS_PREVENTION.map(() => ({ reponse: '', note: '' })),
    themes: [],
    actions: [],
    objectifs: Array.from({ length: NB_OBJECTIFS }, () => ({ objectif: '', obstacles: '', actions: '', ressources: '' })),
  }
}

// Nouveau bilan pour une personne déjà vue : on garde son identité, tout le
// reste repart de zéro.
export function dupliquerPrevention(source: DonneesPrevention): DonneesPrevention {
  const vide = donneesPreventionVides()
  return { ...vide, patient: { ...source.patient, date: vide.patient.date } }
}

export function etapePreventionRenseignee(donnees: DonneesPrevention, etape: EtapePrevention): boolean {
  switch (etape.type) {
    case 'patient':
      return donnees.patient.nom.trim() !== '' && donnees.patient.naissance !== ''
    case 'question': {
      const r = donnees.reponses[etape.index]
      return r.reponse.trim() !== '' || r.note.trim() !== ''
    }
    case 'themes':
      return donnees.themes.length > 0
    case 'actions':
      return donnees.actions.length > 0
    case 'objectif':
      return Object.values(donnees.objectifs[etape.index]).some((v) => v.trim() !== '')
    case 'fin':
      return true
  }
}

// --- Validation -----------------------------------------------------------------

const MAX_COURT = 200
const MAX_REPONSE = 2000
const MAX_ACTIONS = 40

function texte(valeur: unknown, max: number): string {
  return typeof valeur === 'string' ? valeur.slice(0, max) : ''
}

function objet(valeur: unknown): Record<string, unknown> {
  return valeur !== null && typeof valeur === 'object' && !Array.isArray(valeur)
    ? (valeur as Record<string, unknown>)
    : {}
}

function dateIso(valeur: unknown): string {
  const v = texte(valeur, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : ''
}

// Reconstruit une fiche valide depuis n'importe quelle entrée (JSON de la base
// ou envoi du client) : champs inconnus ignorés, textes tronqués, structure
// toujours complète.
export function normaliserPrevention(brut: unknown): DonneesPrevention {
  const base = donneesPreventionVides()
  const source = objet(brut)
  const p = objet(source.patient)

  base.patient = {
    nom: texte(p.nom, MAX_COURT),
    prenom: texte(p.prenom, MAX_COURT),
    naissance: dateIso(p.naissance),
    date: dateIso(p.date) || base.patient.date,
    pharmacien: texte(p.pharmacien, MAX_COURT),
  }

  if (Array.isArray(source.reponses)) {
    const reponses = source.reponses
    base.reponses = QUESTIONS_PREVENTION.map((_, i) => {
      const r = objet(reponses[i])
      return { reponse: texte(r.reponse, MAX_REPONSE), note: texte(r.note, MAX_REPONSE) }
    })
  }

  if (Array.isArray(source.themes)) {
    const themes = source.themes.filter((t): t is ThemePrevention => typeof t === 'string' && CLES_THEMES.has(t))
    base.themes = THEMES_PREVENTION.map((t) => t.cle).filter((cle) => themes.includes(cle))
  }

  if (Array.isArray(source.actions)) {
    const vus = new Set<string>()
    for (const brutAction of source.actions.slice(0, MAX_ACTIONS)) {
      const a = objet(brutAction)
      const id = texte(a.id, 60)
      const theme = a.theme === THEME_LIBRE || (typeof a.theme === 'string' && CLES_THEMES.has(a.theme)) ? (a.theme as ThemeAction) : null
      const t = texte(a.texte, 600)
      if (!id || vus.has(id) || theme === null || t.trim() === '') continue
      vus.add(id)
      base.actions.push({ id, theme, texte: t })
    }
  }

  if (Array.isArray(source.objectifs)) {
    const objectifs = source.objectifs
    base.objectifs = base.objectifs.map((_, i) => {
      const o = objet(objectifs[i])
      return {
        objectif: texte(o.objectif, MAX_REPONSE),
        obstacles: texte(o.obstacles, MAX_REPONSE),
        actions: texte(o.actions, MAX_REPONSE),
        ressources: texte(o.ressources, MAX_REPONSE),
      }
    })
  }

  return base
}

export function nouvelIdActionLibre(): string {
  return `libre-${Math.random().toString(36).slice(2, 10)}`
}

// Actions retenues regroupées par thème (ordre des thèmes, actions libres à la fin).
export function actionsParTheme(actions: ActionPlan[]): { theme: ThemeAction; libelle: string; actions: ActionPlan[] }[] {
  const ordre: ThemeAction[] = [...THEMES_PREVENTION.map((t) => t.cle), THEME_LIBRE]
  return ordre
    .map((theme) => ({ theme, libelle: libelleTheme(theme), actions: actions.filter((a) => a.theme === theme) }))
    .filter((g) => g.actions.length > 0)
}
