// Fiche de l'entretien d'accompagnement « Opioïdes » : informations patient et
// prescription, règles de bon usage transmises à la délivrance, questionnaire
// POMI (Prescription Opioid Misuse Index) et conclusions. D'après la « Fiche
// entretien accompagnement opioïdes » de l'Assurance Maladie.
// Module pur (aucun import serveur ni React) : utilisé par la saisie, la page
// d'impression et les actions serveur, qui revalident toujours les données
// reçues avec normaliserOpioides().

import { dateDuJourIso } from '@/lib/bpm'

// --- Données ------------------------------------------------------------------

export type ReponsePomi = 'oui' | 'non' | null

export type PatientOpioides = {
  nom: string
  prenom: string
  age: string
  coordonnees: string
  date: string // AAAA-MM-JJ
  pharmacien: string
  medecin: string
  molecule: string
  posologie: string
  indication: string
}

export type CleTexteOpioides = 'conclusions' | 'alertes' | 'actions'

export type DonneesOpioides = {
  patient: PatientOpioides
  // Une case par règle de bon usage : true = abordé avec le patient.
  bon_usage: boolean[]
  pomi: ReponsePomi[]
  conclusions: string
  alertes: string
  actions: string
}

// --- Rappels réglementaires (affichés dans l'app, jamais imprimés) -------------------

// Les termes à mettre en évidence sont encadrés par `==` (« ==12 semaines== ») :
// l'écran de rappels les surligne (voir segmenterSurlignage). Aucun autre balisage.
export const RAPPELS_REGLEMENTAIRES: { titre: string; points: string[] }[] = [
  {
    titre: 'Durée de prescription',
    points: [
      'Depuis le ==15 avril 2020== : la durée maximale de prescription des spécialités à base de ==tramadol== par voie orale est limitée à ==12 semaines==. Au-delà de ==3 mois==, la poursuite d’un traitement à base de tramadol (voie orale) nécessite une nouvelle ordonnance.',
      'À partir du ==1er mars 2025==, ces restrictions s’appliquent aussi aux spécialités à base de ==codéine ou de dihydrocodéine==.',
      'De plus, les spécialités à base de ==tramadol, codéine ou dihydrocodéine== devront être prescrites sur des ==ordonnances sécurisées==.',
    ],
  },
  {
    titre: 'Vigilance lors de la prescription et de la délivrance du tramadol',
    points: [
      'Le tramadol est un antalgique opioïde indiqué uniquement dans le traitement des douleurs modérées à intenses ou sévères.',
      'Il doit être prescrit pendant la ==durée la plus courte possible==.',
      'Pour une douleur aiguë ou post-opératoire, la nécessité de poursuivre le traitement doit être réévaluée rapidement.',
      'Il n’est pas recommandé dans le traitement de la migraine.',
      'Le ==risque de convulsions== est majoré en cas de dépassement de la dose maximale recommandée.',
      'Pour éviter un syndrome de sevrage, la posologie doit être ==diminuée progressivement== avant l’arrêt du traitement.',
      'Il doit être délivré dans les ==plus petits conditionnements possibles==, adaptés à la prescription.',
    ],
  },
  {
    titre: 'Associations contenant du paracétamol',
    points: [
      'Une attention particulière doit être portée au risque de surdosage, notamment en intégrant les médicaments obtenus sans prescription. La dose totale quotidienne maximale de paracétamol ne doit pas excéder :',
      '==80 mg/kg/jour== chez l’enfant de moins de 37 kg',
      '==3 g par jour== chez l’enfant de 38 kg à 50 kg',
      '==4 g par jour== chez l’adulte et l’enfant de plus de 50 kg',
    ],
  },
]

export type SegmentTexte = { texte: string; surligne: boolean }

// Découpe un texte balisé par `==` en segments, surlignés ou non. Un marqueur
// sans fermant reste affiché tel quel : le texte n'est jamais perdu.
export function segmenterSurlignage(texte: string): SegmentTexte[] {
  return texte
    .split(/==(.+?)==/)
    .map((partie, i) => ({ texte: partie, surligne: i % 2 === 1 }))
    .filter((segment) => segment.texte !== '')
}

// --- Règles de bon usage ------------------------------------------------------------------

export const INTRO_BON_USAGE = 'Il est important lors de la délivrance des opioïdes :'

export const REGLES_BON_USAGE: string[] = [
  'D’insister sur l’importance du respect de la prescription (doses, voie d’administration, horaires de prise et durée de traitement) : ne pas augmenter les doses ou la fréquence des prises ni continuer le médicament opioïde au-delà de la durée prescrite sans avis médical.',
  'De rappeler au patient de prendre la dose minimale efficace.',
  'D’informer sur les effets indésirables les plus fréquents, les signes d’alerte précoces en cas de surdose, ainsi que sur le risque de dépression respiratoire.',
  'D’informer sur le risque de surdose en opioïdes.',
  'D’informer sur la nécessité d’être vigilant sur l’impact et les risques des opioïdes sur la vie quotidienne, notamment sur la conduite (voiture, deux-roues, etc.) ou l’utilisation de machines dangereuses.',
  'D’informer sur la démarche d’arrêt du traitement, la surveillance de l’apparition éventuelle des signes de sevrage lors de l’arrêt du traitement.',
  'De demander au patient et à son entourage de ne pas stocker de médicament opioïde, en rapportant les médicaments non utilisés en pharmacie.',
  'D’insister auprès du patient sur le fait de ne pas donner son traitement opioïde à une autre personne, même si les symptômes semblent identiques (risque possiblement mortel).',
  'D’évaluer ou identifier l’existence d’un besoin impérieux de consommer lors des renouvellements.',
]

// Aide-mémoire repliable sous certaines règles : ce qu'il faut repérer ou
// expliquer. Affiché à l'écran seulement (jamais imprimé), clé = position de la
// règle dans REGLES_BON_USAGE (0 = première).
export type AideBonUsage = {
  bouton: string
  blocs: { titre: string; texte: string; urgence?: string }[]
}

export const AIDES_BON_USAGE: Record<number, AideBonUsage> = {
  // D'informer sur les effets indésirables les plus fréquents, les signes d'alerte précoces en cas de surdose…
  2: {
    bouton: 'Voir les effets et les signes d’alerte',
    blocs: [
      {
        titre: 'Effets indésirables fréquents',
        texte: 'Somnolence, vertiges, nausées, vomissements, constipation, bouche sèche, démangeaisons, sueurs, maux de tête.',
      },
      {
        titre: 'Signes d’alerte précoces de surdose',
        texte:
          'Somnolence anormale ou difficulté à rester éveillé, confusion, pupilles très petites, respiration lente ou irrégulière, ronflements ou gargouillis, lèvres ou ongles bleutés.',
        urgence: 'Appeler le 15.',
      },
    ],
  },
  // D'informer sur le risque de surdose en opioïdes.
  3: {
    bouton: 'Voir les facteurs de risque',
    blocs: [
      {
        titre: 'Facteurs de risque de surdose',
        texte:
          'Dose supérieure à la prescription, prises trop rapprochées, association à l’alcool, aux benzodiazépines, aux somnifères ou à d’autres opioïdes ou sédatifs, insuffisance rénale ou hépatique, personne âgée.',
      },
    ],
  },
  // D'informer sur la démarche d'arrêt du traitement, … signes de sevrage lors de l'arrêt du traitement.
  5: {
    bouton: 'Voir les signes de sevrage',
    blocs: [
      {
        titre: 'Signes de sevrage à l’arrêt',
        texte:
          'Anxiété, irritabilité, agitation, insomnie, bâillements, sueurs, frissons, tremblements, nez qui coule, larmoiement, pupilles dilatées, nausées, vomissements, crampes abdominales, diarrhée, douleurs musculaires ou articulaires.',
      },
    ],
  },
  // D'évaluer ou identifier l'existence d'un besoin impérieux de consommer lors des renouvellements.
  8: {
    bouton: 'Voir des exemples',
    blocs: [
      {
        titre: 'Exemples de besoin impérieux de consommer',
        texte:
          'Envie irrépressible ou pensées envahissantes du médicament, anxiété à l’idée d’en manquer, demande de renouvellement avant la date prévue, prise plus forte ou plus fréquente que prescrit, prise pour le stress, le sommeil ou l’humeur plutôt que pour la douleur, ordonnance « perdue », plusieurs médecins ou pharmacies.',
      },
    ],
  },
}

// --- Questionnaire POMI ------------------------------------------------------------------------

export const QUESTIONS_POMI: string[] = [
  'Avez-vous déjà pris ce/ces médicament(s) anti-douleur en quantité PLUS importante, c’est-à-dire une quantité plus élevée que celle qui vous a été prescrite ?',
  'Avez-vous déjà pris ce/ces médicament(s) anti-douleur plus SOUVENT que prescrit(s) sur votre ordonnance, c’est-à-dire de réduire le délai entre deux prises ?',
  'Avez-vous déjà eu besoin de faire renouveler votre ordonnance de ce/ces médicament(s) anti-douleur plus tôt que prévu ?',
  'Un médecin vous a-t-il déjà dit que vous preniez trop de ce/ces médicament(s) anti-douleur ?',
  'Avez-vous déjà eu la sensation de planer ou ressenti un effet stimulant après avoir pris ce/ces médicament(s) anti-douleur ?',
]

// Seuil de la fiche : à partir de 2 réponses « Oui », risque actuel de mésusage.
export const SEUIL_POMI = 2

export type ResultatPomi = {
  repondues: number
  // Nombre de réponses « Oui », une par point. Utile dès qu'il est partiel :
  // 2 « Oui » suffisent déjà à atteindre le seuil.
  score: number
  complet: boolean
  risque: boolean
}

export function calculerPomi(reponses: ReponsePomi[]): ResultatPomi {
  const repondues = reponses.filter((r) => r !== null).length
  const score = reponses.filter((r) => r === 'oui').length
  return { repondues, score, complet: repondues === QUESTIONS_POMI.length, risque: score >= SEUIL_POMI }
}

// Texte proposé dans « Alertes » quand le seuil est atteint ; vide sinon.
export function texteAlertePomi(reponses: ReponsePomi[]): string {
  const { score, risque } = calculerPomi(reponses)
  if (!risque) return ''
  return `Score POMI : ${score}/${QUESTIONS_POMI.length}, risque actuel de mésusage des opioïdes. Alerter le médecin prescripteur et le médecin traitant via MSS.`
}

// Met à jour « Alertes » quand les réponses POMI changent, mais seulement si le
// champ est vide ou contient encore le dernier texte généré : un texte réécrit
// à la main n'est jamais écrasé.
export function mettreAJourAlerteAuto(avant: DonneesOpioides, pomiApres: ReponsePomi[]): string {
  const ancienAuto = texteAlertePomi(avant.pomi)
  const nouvelAuto = texteAlertePomi(pomiApres)
  if (avant.alertes.trim() === '' || avant.alertes === ancienAuto) return nouvelAuto
  return avant.alertes
}

// --- Champs de la fiche ---------------------------------------------------------------------------

export type ClePrescription = 'medecin' | 'molecule' | 'posologie' | 'indication'

export const CHAMPS_PRESCRIPTION: { cle: ClePrescription; intitule: string; aide?: string }[] = [
  { cle: 'medecin', intitule: 'Médecin prescripteur' },
  { cle: 'molecule', intitule: 'Molécule prescrite et dosage', aide: 'Ex. tramadol 50 mg, codéine 30 mg + paracétamol 500 mg' },
  { cle: 'posologie', intitule: 'Posologie et durée de traitement' },
  { cle: 'indication', intitule: 'Indication' },
]

export const CHAMPS_TEXTE: { cle: CleTexteOpioides; intitule: string; aide?: string }[] = [
  { cle: 'conclusions', intitule: 'Conclusions de l’entretien' },
  {
    cle: 'alertes',
    intitule: 'Alertes',
    aide: 'Un score POMI de 2 ou plus invite à alerter le médecin prescripteur et le médecin traitant via MSS.',
  },
  { cle: 'actions', intitule: 'Actions mises en place ou contacts donnés au patient' },
]

// --- Étapes du pas à pas -----------------------------------------------------------------------------

export type EtapeOpioides =
  | { type: 'rappels' }
  | { type: 'patient' }
  | { type: 'prescription'; cle: ClePrescription }
  | { type: 'bon_usage' }
  | { type: 'pomi'; index: number }
  | { type: 'texte'; cle: CleTexteOpioides }
  | { type: 'fin' }

export type SectionEtapesOpioides = { titre: string; etapes: EtapeOpioides[] }

// Ordre de la fiche papier ; « fin » n'appartient à aucune section.
export function construireSectionsOpioides(): SectionEtapesOpioides[] {
  return [
    { titre: 'Rappels', etapes: [{ type: 'rappels' }] },
    { titre: 'Patient', etapes: [{ type: 'patient' }] },
    { titre: 'Prescription', etapes: CHAMPS_PRESCRIPTION.map((c) => ({ type: 'prescription' as const, cle: c.cle })) },
    { titre: 'Règles de bon usage', etapes: [{ type: 'bon_usage' }] },
    { titre: 'Questionnaire POMI', etapes: QUESTIONS_POMI.map((_, index) => ({ type: 'pomi' as const, index })) },
    { titre: 'Conclusions', etapes: CHAMPS_TEXTE.map((c) => ({ type: 'texte' as const, cle: c.cle })) },
  ]
}

// « Renseignée » = au moins une réponse ; sert à la liste des sections et au
// résumé final, jamais à bloquer la saisie. L'écran de rappels n'a rien à saisir.
export function etapeOpioidesRenseignee(donnees: DonneesOpioides, etape: EtapeOpioides): boolean {
  switch (etape.type) {
    case 'rappels':
      return true
    case 'patient':
      return donnees.patient.nom.trim() !== '' || donnees.patient.prenom.trim() !== ''
    case 'prescription':
      return donnees.patient[etape.cle].trim() !== ''
    case 'bon_usage':
      return donnees.bon_usage.some(Boolean)
    case 'pomi':
      return donnees.pomi[etape.index] !== null
    case 'texte':
      return donnees[etape.cle].trim() !== ''
    case 'fin':
      return false
  }
}

// --- Création, duplication et validation -----------------------------------------------------------------

export function donneesOpioidesVides(): DonneesOpioides {
  return {
    patient: {
      nom: '',
      prenom: '',
      age: '',
      coordonnees: '',
      date: dateDuJourIso(),
      pharmacien: '',
      medecin: '',
      molecule: '',
      posologie: '',
      indication: '',
    },
    bon_usage: REGLES_BON_USAGE.map(() => false),
    pomi: QUESTIONS_POMI.map(() => null),
    conclusions: '',
    alertes: '',
    actions: '',
  }
}

// Nouvel entretien pour un patient déjà vu (renouvellement) : l'identité, la
// prescription et le pharmacien sont repris, tout ce qui relève de l'entretien
// (date, règles abordées, POMI, conclusions) repart de zéro.
export function dupliquerOpioides(source: DonneesOpioides): DonneesOpioides {
  const vide = donneesOpioidesVides()
  return { ...vide, patient: { ...source.patient, date: vide.patient.date } }
}

const MAX_COURT = 200
const MAX_LONG = 4000

function texte(valeur: unknown, max: number): string {
  return typeof valeur === 'string' ? valeur.slice(0, max) : ''
}

function objet(valeur: unknown): Record<string, unknown> {
  return valeur !== null && typeof valeur === 'object' && !Array.isArray(valeur)
    ? (valeur as Record<string, unknown>)
    : {}
}

// Reconstruit une fiche valide depuis n'importe quelle entrée (JSON de la base
// ou envoi du client) : champs inconnus ignorés, textes tronqués, structure
// toujours complète.
export function normaliserOpioides(brut: unknown): DonneesOpioides {
  const base = donneesOpioidesVides()
  const source = objet(brut)
  const p = objet(source.patient)
  const date = texte(p.date, 10)

  base.patient = {
    nom: texte(p.nom, MAX_COURT),
    prenom: texte(p.prenom, MAX_COURT),
    age: texte(p.age, 20),
    coordonnees: texte(p.coordonnees, 400),
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : base.patient.date,
    pharmacien: texte(p.pharmacien, MAX_COURT),
    medecin: texte(p.medecin, MAX_COURT),
    molecule: texte(p.molecule, MAX_COURT),
    posologie: texte(p.posologie, 400),
    indication: texte(p.indication, 400),
  }

  if (Array.isArray(source.bon_usage)) {
    const brutBonUsage = source.bon_usage
    base.bon_usage = REGLES_BON_USAGE.map((_, i) => brutBonUsage[i] === true)
  }

  if (Array.isArray(source.pomi)) {
    const brutPomi = source.pomi
    base.pomi = QUESTIONS_POMI.map((_, i) => {
      const r = brutPomi[i]
      return r === 'oui' || r === 'non' ? r : null
    })
  }

  base.conclusions = texte(source.conclusions, MAX_LONG)
  base.alertes = texte(source.alertes, MAX_LONG)
  base.actions = texte(source.actions, MAX_LONG)
  return base
}
