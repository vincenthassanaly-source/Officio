// Fiche du bilan partagé de médication (BPM) : recueil d'informations,
// questionnaire de Girerd et analyse des traitements, d'après la fiche papier
// USPO « Le bilan partagé de médication chez le patient âgé polymédiqué ».
// Module pur (aucun import serveur ni React) : utilisé à la fois par la saisie
// (client), l'impression et les actions serveur, qui revalident toujours les
// données reçues avec normaliserDonnees().

// --- Données ----------------------------------------------------------------

export type ReponseGirerd = 'oui' | 'non' | null

export type EnteteBpm = {
  nom: string
  prenom: string
  date: string // AAAA-MM-JJ
  medecin: string
  age: string
  poids: string
  adresse: string
  pharmacien: string
}

export type LigneTraitementBpm = {
  id: string
  produit: string
  dosage: string
  forme: string
  posologie: string
  probleme_prise: string
  probleme_observance: string
  effets: string
  origine: string
}

export type CleRecueil =
  | 'logement'
  | 'aide'
  | 'alimentation'
  | 'regime'
  | 'consommations'
  | 'renal_hepatique'
  | 'problemes'
  | 'allergies'
  | 'remarques'
  | 'utilite'
  | 'frequence'
  | 'autres_produits'
  | 'antibiotiques'
  | 'modifications'
  | 'effets_ressentis'
  | 'effets_indesirables'
  | 'suivi_particulier'
  | 'moment_rappels'
  | 'fin_de_mois'
  | 'oublis'
  | 'grande_quantite'
  | 'preparation'
  | 'aide_prise'
  | 'difficultes'
  | 'souhait_aide'

export type CleAnalyse = 'observance' | 'recommandations' | 'alertes_ruptures' | 'alertes_entourage'

export type DonneesBpm = {
  entete: EnteteBpm
  recueil: Record<CleRecueil, string>
  traitements: LigneTraitementBpm[]
  girerd: ReponseGirerd[]
  girerd_autres: string
  analyse: Record<CleAnalyse, string>
}

// --- Questions du recueil (pages 1 et 3 de la fiche) --------------------------

export type SectionRecueil =
  | 'Habitudes de vie'
  | 'État physiologique'
  | 'Autres'
  | 'Généralités'
  | 'Autres traitements'
  | 'Modifications'
  | 'Effet des traitements'
  | 'Prise des médicaments'

export type QuestionRecueil = {
  cle: CleRecueil
  section: SectionRecueil
  // Intitulé tel qu'il figure sur la fiche papier (impression comprise).
  intitule: string
  // Pistes de la fiche, sous la question : rappels pour le pharmacien.
  pistes: string[]
  // Réponses rapides : un tap les ajoute au champ.
  reponses?: string[]
}

export const QUESTIONS_RECUEIL: QuestionRecueil[] = [
  {
    cle: 'logement',
    section: 'Habitudes de vie',
    intitule: 'Vivez-vous',
    pistes: ['Seul(e) à votre domicile', 'Accompagné(e)', 'Ou en institution'],
    reponses: ['Seul(e) à domicile', 'Accompagné(e)', 'En institution'],
  },
  {
    cle: 'aide',
    section: 'Habitudes de vie',
    intitule: 'Quelqu’un vous aide-t-il au quotidien',
    pistes: ['Si oui, qui'],
    reponses: ['Non', 'Conjoint(e)', 'Enfant', 'Aide à domicile', 'Infirmier(ère)'],
  },
  {
    cle: 'alimentation',
    section: 'Habitudes de vie',
    intitule: 'Quelles sont vos habitudes alimentaires',
    pistes: ['Combien de repas et quand'],
  },
  {
    cle: 'regime',
    section: 'Habitudes de vie',
    intitule: 'Suivez-vous un régime alimentaire particulier',
    pistes: ['Sans sel', 'Autres'],
    reponses: ['Non', 'Sans sel', 'Diabétique'],
  },
  {
    cle: 'consommations',
    section: 'Habitudes de vie',
    intitule: 'Consommez-vous certains produits',
    pistes: ['Comme de l’alcool', 'Du pamplemousse', 'Autres'],
    reponses: ['Non', 'Alcool', 'Pamplemousse', 'Tabac'],
  },
  {
    cle: 'renal_hepatique',
    section: 'État physiologique',
    intitule: 'Avez-vous une maladie rénale ou hépatique',
    pistes: ['Insuffisance rénale, hépatique', 'Ou tout autre antécédent identifié'],
    reponses: ['Non', 'Insuffisance rénale', 'Insuffisance hépatique'],
  },
  {
    cle: 'problemes',
    section: 'État physiologique',
    intitule: 'Avez-vous des problèmes de…',
    pistes: ['Déglutition', 'Vision', 'Douleurs articulaires', 'Autres'],
    reponses: ['Aucun', 'Déglutition', 'Vision', 'Douleurs articulaires'],
  },
  {
    cle: 'allergies',
    section: 'Autres',
    intitule: 'Souffrez-vous d’allergies',
    pistes: ['Avez-vous un carnet par exemple'],
    reponses: ['Non', 'A un carnet d’allergies'],
  },
  {
    cle: 'remarques',
    section: 'Autres',
    intitule: 'Remarques complémentaires',
    pistes: [],
  },
  {
    cle: 'utilite',
    section: 'Généralités',
    intitule: 'Savez-vous à quoi servent ces médicaments',
    pistes: [],
    reponses: ['Oui, pour tous', 'Pour certains', 'Non'],
  },
  {
    cle: 'frequence',
    section: 'Généralités',
    intitule: 'À quelle fréquence et quand prenez-vous vos médicaments',
    pistes: [],
  },
  {
    cle: 'autres_produits',
    section: 'Autres traitements',
    intitule: 'Prenez-vous d’autres produits par vous-même',
    pistes: [
      'Aromathérapie, phytothérapie',
      'Médicaments en libre accès ou sans ordonnance',
      'Crèmes, oligoéléments, vitamines',
      'Collyre, inhalations',
      'Compléments alimentaires, dispositifs médicaux…',
    ],
    reponses: ['Non', 'Phytothérapie', 'Compléments alimentaires', 'Médicaments sans ordonnance'],
  },
  {
    cle: 'antibiotiques',
    section: 'Autres traitements',
    intitule: 'Avez-vous pris des antibiotiques récemment',
    pistes: [],
    reponses: ['Non', 'Oui'],
  },
  {
    cle: 'modifications',
    section: 'Modifications',
    intitule: 'Avez-vous récemment arrêté ou modifié un traitement prescrit, et pourquoi',
    pistes: [],
    reponses: ['Non'],
  },
  {
    cle: 'effets_ressentis',
    section: 'Effet des traitements',
    intitule: 'Ressentez-vous des effets particuliers liés à la prise de vos médicaments',
    pistes: ['Somnolence, douleurs articulaires'],
    reponses: ['Non', 'Somnolence', 'Douleurs articulaires'],
  },
  {
    cle: 'effets_indesirables',
    section: 'Effet des traitements',
    intitule: 'Avez-vous déjà ressenti des effets indésirables liés à vos médicaments',
    pistes: ['Si oui, comment luttez-vous contre ceux-ci'],
    reponses: ['Non'],
  },
  {
    cle: 'suivi_particulier',
    section: 'Effet des traitements',
    intitule: 'Prenez-vous un médicament qui nécessite un suivi particulier',
    pistes: ['Antidiabétique, anticoagulant…'],
    reponses: ['Non', 'Anticoagulant', 'Antidiabétique'],
  },
  {
    cle: 'moment_rappels',
    section: 'Prise des médicaments',
    intitule: 'À quel moment de la journée prenez-vous vos médicaments',
    pistes: ['Avez-vous des rappels'],
  },
  {
    cle: 'fin_de_mois',
    section: 'Prise des médicaments',
    intitule: 'Vous reste-t-il des médicaments à la fin du mois',
    pistes: ['Et pour d’autres au contraire êtes-vous toujours en rupture'],
    reponses: ['Non', 'Il m’en reste', 'Toujours en rupture'],
  },
  {
    cle: 'oublis',
    section: 'Prise des médicaments',
    intitule: 'Avez-vous tendance à oublier certains de vos médicaments',
    pistes: [],
    reponses: ['Non', 'Oui, parfois', 'Oui, souvent'],
  },
  {
    cle: 'grande_quantite',
    section: 'Prise des médicaments',
    intitule: 'Avez-vous certains médicaments en grande quantité chez vous',
    pistes: [],
    reponses: ['Non', 'Oui'],
  },
  {
    cle: 'preparation',
    section: 'Prise des médicaments',
    intitule: 'Vos médicaments sont-ils préparés par vous ou par quelqu’un d’autre',
    pistes: [],
    reponses: ['Par le patient', 'Par un proche', 'Par un infirmier', 'Pilulier préparé à la pharmacie'],
  },
  {
    cle: 'aide_prise',
    section: 'Prise des médicaments',
    intitule: 'Êtes-vous aidé(e) dans la prise de vos médicaments',
    pistes: [],
    reponses: ['Non', 'Oui'],
  },
  {
    cle: 'difficultes',
    section: 'Prise des médicaments',
    intitule: 'Avez-vous des difficultés à prendre vos médicaments',
    pistes: ['Sécheresse buccale, gélules trop grosses…'],
    reponses: ['Non', 'Gélules trop grosses', 'Sécheresse buccale'],
  },
  {
    cle: 'souhait_aide',
    section: 'Prise des médicaments',
    intitule: 'Souhaitez-vous être aidé(e) dans la prise de vos médicaments',
    pistes: [],
    reponses: ['Non', 'Oui'],
  },
]

export const QUESTION_PAR_CLE = Object.fromEntries(QUESTIONS_RECUEIL.map((q) => [q.cle, q])) as Record<
  CleRecueil,
  QuestionRecueil
>

// --- Girerd (page 4) ---------------------------------------------------------

export const QUESTIONS_GIRERD: string[] = [
  'Ce matin avez-vous oublié de prendre votre médicament ?',
  'Depuis la dernière consultation avez-vous été en panne de médicament ?',
  'Vous est-il arrivé de prendre votre traitement avec retard par rapport à l’heure habituelle ?',
  'Vous est-il arrivé de ne pas prendre votre traitement parce que, certains jours, votre mémoire vous fait défaut ?',
  'Vous est-il arrivé de ne pas prendre votre traitement parce que, certains jours, vous avez l’impression que votre traitement vous fait plus de mal que de bien ?',
  'Pensez-vous que vous avez trop de comprimés à prendre ?',
]

export type NiveauObservance = 'bonne' | 'faible' | 'non'

export type ResultatGirerd = {
  // Nombre de réponses données (sur 6).
  repondues: number
  // Chaque réponse négative (NON) vaut un point. null tant que tout n'est pas répondu.
  score: number | null
  niveau: NiveauObservance | null
}

const LIBELLE_NIVEAU: Record<NiveauObservance, string> = {
  bonne: 'bonne observance',
  faible: 'faible observance',
  non: 'non observance',
}

export function libelleNiveau(niveau: NiveauObservance): string {
  return LIBELLE_NIVEAU[niveau]
}

export function calculerGirerd(reponses: ReponseGirerd[]): ResultatGirerd {
  const repondues = reponses.filter((r) => r !== null).length
  if (repondues < QUESTIONS_GIRERD.length) return { repondues, score: null, niveau: null }
  const score = reponses.filter((r) => r === 'non').length
  const niveau: NiveauObservance = score === 6 ? 'bonne' : score >= 4 ? 'faible' : 'non'
  return { repondues, score, niveau }
}

// Texte proposé dans le champ « Observance » de l'analyse. Le pharmacien peut
// le réécrire : voir mettreAJourObservanceAuto().
export function texteObservanceGirerd(reponses: ReponseGirerd[]): string {
  const { score, niveau } = calculerGirerd(reponses)
  if (score === null || niveau === null) return ''
  return `Score de Girerd : ${score}/6, ${LIBELLE_NIVEAU[niveau]}.`
}

// Met à jour le champ Observance quand les réponses de Girerd changent, mais
// seulement s'il est vide ou s'il contient encore le dernier texte généré : un
// texte réécrit à la main n'est jamais écrasé.
export function mettreAJourObservanceAuto(
  avant: DonneesBpm,
  girerdApres: ReponseGirerd[]
): Record<CleAnalyse, string> {
  const ancienAuto = texteObservanceGirerd(avant.girerd)
  const nouvelAuto = texteObservanceGirerd(girerdApres)
  const actuel = avant.analyse.observance
  if (actuel.trim() === '' || actuel === ancienAuto) {
    return { ...avant.analyse, observance: nouvelAuto }
  }
  return avant.analyse
}

// --- Fiche d'analyse (page 6) --------------------------------------------------

export const CHAMPS_ANALYSE: { cle: CleAnalyse; intitule: string; pistes: string[] }[] = [
  {
    cle: 'observance',
    intitule: 'Observance',
    pistes: ['Score de Girerd : bonne observance, mauvaise observance ou non observance à détailler selon les traitements concernés'],
  },
  { cle: 'recommandations', intitule: 'Recommandations générales liées à l’état du patient', pistes: [] },
  { cle: 'alertes_ruptures', intitule: 'Alertes liées aux ruptures de soins', pistes: [] },
  { cle: 'alertes_entourage', intitule: 'Alertes vis-à-vis de l’entourage', pistes: [] },
]

// --- Colonnes du tableau des traitements (page 2) ------------------------------

export const COLONNES_TRAITEMENTS: { cle: keyof Omit<LigneTraitementBpm, 'id'>; intitule: string; precision?: string }[] = [
  { cle: 'produit', intitule: 'Produit pris par le patient' },
  { cle: 'dosage', intitule: 'Dosage' },
  { cle: 'forme', intitule: 'Forme' },
  { cle: 'posologie', intitule: 'Fréquence / posologie' },
  { cle: 'probleme_prise', intitule: 'Problème lié à la prise', precision: 'forme galénique' },
  { cle: 'probleme_observance', intitule: 'Problème d’observance', precision: 'oubli' },
  { cle: 'effets', intitule: 'Survenue d’effets indésirables' },
  { cle: 'origine', intitule: 'Origine de la prise', precision: 'prescripteur ou automédication' },
]

// --- Étapes du pas à pas --------------------------------------------------------

export type EtapeBpm =
  | { type: 'adhesion' }
  | { type: 'patient' }
  | { type: 'question'; cle: CleRecueil }
  | { type: 'traitements' }
  | { type: 'girerd'; index: number }
  | { type: 'girerd_autres' }
  | { type: 'analyse'; cle: CleAnalyse }
  | { type: 'fin' }

export type SectionEtapes = { titre: string; etapes: EtapeBpm[] }

// Ordre de la fiche papier. L'étape « fin » n'appartient à aucune section.
export function construireSections(): SectionEtapes[] {
  const sections: SectionEtapes[] = [
    { titre: 'Adhésion', etapes: [{ type: 'adhesion' }] },
    { titre: 'Patient', etapes: [{ type: 'patient' }] },
  ]

  const ajouterRecueil = (titre: SectionRecueil) => {
    sections.push({
      titre,
      etapes: QUESTIONS_RECUEIL.filter((q) => q.section === titre).map((q) => ({
        type: 'question' as const,
        cle: q.cle,
      })),
    })
  }

  ajouterRecueil('Habitudes de vie')
  ajouterRecueil('État physiologique')
  ajouterRecueil('Autres')
  sections.push({ titre: 'Traitements', etapes: [{ type: 'traitements' }] })
  ajouterRecueil('Généralités')
  ajouterRecueil('Autres traitements')
  ajouterRecueil('Modifications')
  ajouterRecueil('Effet des traitements')
  ajouterRecueil('Prise des médicaments')
  sections.push({
    titre: 'Questionnaire de Girerd',
    etapes: [
      ...QUESTIONS_GIRERD.map((_, index) => ({ type: 'girerd' as const, index })),
      { type: 'girerd_autres' as const },
    ],
  })
  sections.push({
    titre: 'Analyse des traitements',
    etapes: CHAMPS_ANALYSE.map((c) => ({ type: 'analyse' as const, cle: c.cle })),
  })

  return sections
}

export function cleEtape(etape: EtapeBpm): string {
  switch (etape.type) {
    case 'question':
    case 'analyse':
      return `${etape.type}:${etape.cle}`
    case 'girerd':
      return `girerd:${etape.index}`
    default:
      return etape.type
  }
}

// Une étape est « renseignée » quand elle contient au moins une réponse : sert
// à la liste des sections et au résumé final, jamais à bloquer la saisie.
export function etapeRenseignee(donnees: DonneesBpm, etape: EtapeBpm): boolean {
  switch (etape.type) {
    case 'adhesion':
      // Rien à saisir : l'écran propose d'imprimer le bulletin d'adhésion.
      return true
    case 'patient':
      return donnees.entete.nom.trim() !== '' || donnees.entete.prenom.trim() !== ''
    case 'question':
      return donnees.recueil[etape.cle].trim() !== ''
    case 'traitements':
      return donnees.traitements.some((t) => t.produit.trim() !== '')
    case 'girerd':
      return donnees.girerd[etape.index] !== null
    case 'girerd_autres':
      return donnees.girerd_autres.trim() !== ''
    case 'analyse':
      return donnees.analyse[etape.cle].trim() !== ''
    case 'fin':
      return false
  }
}

// --- Bulletin d'adhésion --------------------------------------------------------------

export type DocumentAdhesion = { nom: string; cheminStockage: string }

function sansAccentsMinuscules(valeur: string): string {
  return valeur.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

// Le bulletin d'adhésion proposé au début d'une fiche est un document de
// l'onglet Documents du type d'entretien : celui dont l'étiquette (tag) contient
// « adhésion », à défaut celui dont le nom la contient. Accents et casse sont
// ignorés. Remplacer le PDF ou étiqueter un autre document suffit donc à changer
// de bulletin, sans développement. Avec plusieurs candidats, le plus récent.
export function choisirDocumentAdhesion(
  documents: { nom: string; tag: string | null; chemin_stockage: string; created_at: string }[]
): DocumentAdhesion | null {
  const contientAdhesion = (valeur: string | null) => valeur !== null && sansAccentsMinuscules(valeur).includes('adhesion')
  const recents = [...documents].sort((a, b) => b.created_at.localeCompare(a.created_at))
  const choisi = recents.find((d) => contientAdhesion(d.tag)) ?? recents.find((d) => contientAdhesion(d.nom))
  return choisi ? { nom: choisi.nom, cheminStockage: choisi.chemin_stockage } : null
}

// --- Création et validation ---------------------------------------------------------

export function dateDuJourIso(): string {
  const d = new Date()
  const mois = String(d.getMonth() + 1).padStart(2, '0')
  const jour = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mois}-${jour}`
}

export function nouvelIdLigne(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function ligneTraitementVide(): LigneTraitementBpm {
  return {
    id: nouvelIdLigne(),
    produit: '',
    dosage: '',
    forme: '',
    posologie: '',
    probleme_prise: '',
    probleme_observance: '',
    effets: '',
    origine: '',
  }
}

export function donneesBpmVides(): DonneesBpm {
  return {
    entete: { nom: '', prenom: '', date: dateDuJourIso(), medecin: '', age: '', poids: '', adresse: '', pharmacien: '' },
    recueil: Object.fromEntries(QUESTIONS_RECUEIL.map((q) => [q.cle, ''])) as Record<CleRecueil, string>,
    traitements: [],
    girerd: QUESTIONS_GIRERD.map(() => null),
    girerd_autres: '',
    analyse: { observance: '', recommandations: '', alertes_ruptures: '', alertes_entourage: '' },
  }
}

const MAX_COURT = 200
const MAX_LONG = 4000
const MAX_LIGNES_TRAITEMENTS = 40

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
// toujours complète. Aucune donnée non reconnue n'atteint la base.
export function normaliserDonnees(brut: unknown): DonneesBpm {
  const base = donneesBpmVides()
  const source = objet(brut)

  const entete = objet(source.entete)
  const date = texte(entete.date, 10)
  base.entete = {
    nom: texte(entete.nom, MAX_COURT),
    prenom: texte(entete.prenom, MAX_COURT),
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : base.entete.date,
    medecin: texte(entete.medecin, MAX_COURT),
    age: texte(entete.age, 20),
    poids: texte(entete.poids, 20),
    adresse: texte(entete.adresse, 400),
    pharmacien: texte(entete.pharmacien, MAX_COURT),
  }

  const recueil = objet(source.recueil)
  for (const q of QUESTIONS_RECUEIL) base.recueil[q.cle] = texte(recueil[q.cle], MAX_LONG)

  if (Array.isArray(source.traitements)) {
    base.traitements = source.traitements.slice(0, MAX_LIGNES_TRAITEMENTS).map((ligneBrute) => {
      const l = objet(ligneBrute)
      return {
        id: texte(l.id, 20) || nouvelIdLigne(),
        produit: texte(l.produit, MAX_COURT),
        dosage: texte(l.dosage, 60),
        forme: texte(l.forme, 60),
        posologie: texte(l.posologie, MAX_COURT),
        probleme_prise: texte(l.probleme_prise, 400),
        probleme_observance: texte(l.probleme_observance, 400),
        effets: texte(l.effets, 400),
        origine: texte(l.origine, 100),
      }
    })
  }

  if (Array.isArray(source.girerd)) {
    const brutGirerd = source.girerd
    base.girerd = QUESTIONS_GIRERD.map((_, i) => {
      const r = brutGirerd[i]
      return r === 'oui' || r === 'non' ? r : null
    })
  }
  base.girerd_autres = texte(source.girerd_autres, MAX_LONG)

  const analyse = objet(source.analyse)
  base.analyse = {
    observance: texte(analyse.observance, MAX_LONG),
    recommandations: texte(analyse.recommandations, MAX_LONG),
    alertes_ruptures: texte(analyse.alertes_ruptures, MAX_LONG),
    alertes_entourage: texte(analyse.alertes_entourage, MAX_LONG),
  }

  return base
}

// « Dupont Marie » pour les listes ; « Patient sans nom » tant que l'en-tête est vide.
export function nomPatientAffiche(nom: string, prenom: string): string {
  const complet = `${nom.trim()} ${prenom.trim()}`.trim()
  return complet || 'Patient sans nom'
}
