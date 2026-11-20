// Fiche « TROD angine » : prise en charge à l'officine de l'angine, d'après le
// compte rendu de l'Assurance Maladie (5 blocs à cocher) et le bon de prise en
// charge des antibiotiques délivrés sans ordonnance (angine de l'enfant /
// de l'adulte).
//
// Logique pure, sans React ni accès réseau : données de la fiche, validation de
// ce qui arrive du client (normaliserTrodAngine), pré-cochage des blocs d'après
// les réponses, choix et dose de l'antibiotique. Les PDF remplis sont produits
// côté serveur par trod-angine-pdf.ts à partir de ces données.

import { dateDuJourIso } from '@/lib/bpm'

// --- Libellés officiels ----------------------------------------------------------

export type IdGravite =
  | 'temperature'
  | 'constantes'
  | 'respiratoire'
  | 'trismus'
  | 'hypersialorrhee'
  | 'cervicalgie'
  | 'endobuccal'

// Bloc 5 du compte rendu : symptômes de gravité, prise en charge médicale immédiate.
export const SIGNES_GRAVITE: { id: IdGravite; libelle: string }[] = [
  { id: 'temperature', libelle: 'Température mesurée > 39,5 °C' },
  {
    id: 'constantes',
    libelle:
      'Pression artérielle systolique < 90 mmHg, ou fréquence cardiaque > 110/min, ou fréquence respiratoire > 20/min',
  },
  { id: 'respiratoire', libelle: 'Difficulté respiratoire ou pour parler' },
  { id: 'trismus', libelle: 'Trismus (limitation de l’ouverture buccale)' },
  { id: 'hypersialorrhee', libelle: 'Hypersialorrhée' },
  { id: 'cervicalgie', libelle: 'Cervicalgie ou torticolis limitant les mouvements de la tête' },
  {
    id: 'endobuccal',
    libelle:
      'Examen endo-buccal anormal : angine ulcéreuse ou ulcéro-nécrotique, vésiculeuse, pseudo-membraneuse, hypertrophie unilatérale des amygdales, déviation médiane de l’amygdale, déviation de la luette du côté sain, autre…',
  },
]

export type IdExclusion =
  | 'age'
  | 'recueil'
  | 'voyage'
  | 'grossesse'
  | 'evolution'
  | 'eruption'
  | 'insuffisance_renale'
  | 'immunodepression'
  | 'catheter'
  | 'antibiotherapie'
  | 'episode_recent'
  | 'episodes_repetes'
  | 'contre_indication'
  | 'doute'

// Bloc 4 du compte rendu : critères ne permettant pas la prise en charge en officine.
export const CRITERES_EXCLUSION: { id: IdExclusion; libelle: string }[] = [
  { id: 'age', libelle: 'Âge < 10 ans' },
  {
    id: 'recueil',
    libelle:
      'Recueil insuffisant des informations médicales : non-maîtrise de la langue française, réponses inadaptées en l’absence de dossier médical disponible',
  },
  {
    id: 'voyage',
    libelle:
      'Retour de voyage en pays tropical depuis 2 à 5 jours et vaccination anti diphtérique non à jour / non renseignée',
  },
  { id: 'grossesse', libelle: 'Grossesse en cours ou non exclue' },
  { id: 'evolution', libelle: 'Évolution des symptômes depuis plus de 8 jours' },
  { id: 'eruption', libelle: 'Apparition d’une éruption cutanée chez cet enfant' },
  {
    id: 'insuffisance_renale',
    libelle:
      'Notion d’insuffisance rénale sévère rapportée par le patient (DFG < 30 ml/mn/1,73 m² selon CKD-EPI)',
  },
  {
    id: 'immunodepression',
    libelle:
      'Immunodépression ou risque d’immunodépression dus à une pathologie (VIH) ou à un médicament (corticothérapie au long cours, immunosuppresseurs, chimiothérapie, métimazole ou dérivé prescrit pour hyperthyroïdie)',
  },
  { id: 'catheter', libelle: 'Port d’un cathéter veineux implanté' },
  { id: 'antibiotherapie', libelle: 'Antibiothérapie déjà en cours pour une autre raison' },
  { id: 'episode_recent', libelle: 'Épisode similaire dans les 15 jours précédents' },
  {
    id: 'episodes_repetes',
    libelle: 'Deux autres épisodes d’odynophagie depuis 6 mois sans avoir consulté de médecin',
  },
  {
    id: 'contre_indication',
    libelle:
      'Contre-indication à l’utilisation de l’amoxicilline, du céfuroxime, du cefpodoxime, de l’azithromycine ou de la clarithromycine, conformément au RCP',
  },
  { id: 'doute', libelle: 'Doute du pharmacien' },
]

export type IdBloc = 'b1' | 'b2' | 'b3' | 'b4' | 'b5'

export const BLOCS: { id: IdBloc; numero: number; libelle: string }[] = [
  { id: 'b1', numero: 1, libelle: 'Traitement antibiotique délivré suite à un TROD positif' },
  { id: 'b2', numero: 2, libelle: 'Conseil d’un simple traitement symptomatique suite à un TROD négatif' },
  {
    id: 'b3',
    numero: 3,
    libelle:
      'Conseil de consulter rapidement un médecin en cas de persistance des symptômes > 72 h, d’aggravation ou de nouveaux symptômes',
  },
  { id: 'b4', numero: 4, libelle: 'Conseil de consulter son médecin traitant dans les 24 h (critère d’exclusion)' },
  { id: 'b5', numero: 5, libelle: 'Adressé à un médecin en urgence (signe de gravité)' },
]

// --- Antibiotiques -----------------------------------------------------------------

export type IdAntibiotique = 'amoxicilline' | 'cefuroxime' | 'cefpodoxime' | 'clarithromycine'

export type TypeBon = 'enfant' | 'adulte'
export type Allergie = 'aucune' | 'penicillines' | 'betalactamines'

// Âge à partir duquel le bon « adulte » est proposé par défaut. Le pharmacien
// peut toujours choisir l'autre bon : seuil de confort, pas une règle du protocole.
export const AGE_BON_ADULTE = 15

type PosologieEnfant = {
  mgParKgJour: number
  prises: number
  duree: number
  // Plafond journalier imprimé sur le bon (amoxicilline, cefpodoxime).
  plafondJour?: number
}

type DefinitionAntibiotique = {
  nom: string
  // Posologie adulte imprimée sur le bon adulte / le compte rendu.
  adulte?: { texte: string; mgParJour: number }
  enfant?: PosologieEnfant & { texte: string }
}

// Posologies recopiées du bon de prise en charge (angine de l'enfant / de
// l'adulte, version 2024 : amoxicilline, céfuroxime, cefpodoxime, clarithromycine) : toute modification doit suivre le document officiel.
export const ANTIBIOTIQUES: Record<IdAntibiotique, DefinitionAntibiotique> = {
  amoxicilline: {
    nom: 'Amoxicilline',
    adulte: { texte: '2 g par jour en 2 prises pendant 6 jours', mgParJour: 2000 },
    enfant: {
      mgParKgJour: 50,
      prises: 2,
      duree: 6,
      plafondJour: 2000,
      texte: '50 mg/kg/j en 2 prises par jour par voie orale, sans dépasser 2 g par jour, pendant 6 jours',
    },
  },
  cefuroxime: {
    nom: 'Céfuroxime axétil',
    adulte: { texte: '500 mg par jour en 2 prises par jour par voie orale pendant 4 jours', mgParJour: 500 },
  },
  cefpodoxime: {
    nom: 'Cefpodoxime proxétil',
    adulte: { texte: '200 mg par jour en 2 prises par jour par voie orale pendant 5 jours', mgParJour: 200 },
    enfant: {
      mgParKgJour: 8,
      prises: 2,
      duree: 5,
      plafondJour: 200,
      texte: '8 mg/kg/j en 2 prises par jour par voie orale, sans dépasser la dose adulte de 200 mg par jour, pendant 5 jours',
    },
  },
  clarithromycine: {
    nom: 'Clarithromycine',
    adulte: { texte: '500 mg par jour en 2 prises orales par jour pendant 5 jours', mgParJour: 500 },
    enfant: {
      mgParKgJour: 15,
      prises: 2,
      duree: 5,
      texte: '15 mg/kg/j en 2 prises orales par jour pendant 5 jours',
    },
  },
}

export const LIBELLES_ALLERGIE: Record<Allergie, string> = {
  aucune: 'Pas d’allergie aux bêtalactamines',
  penicillines: 'Allergie aux pénicillines, sans contre-indication aux céphalosporines',
  betalactamines: 'Contre-indication aux bêtalactamines',
}

const ANTIBIOTIQUES_PAR_ALLERGIE: Record<Allergie, IdAntibiotique[]> = {
  aucune: ['amoxicilline'],
  penicillines: ['cefuroxime', 'cefpodoxime'],
  betalactamines: ['clarithromycine'],
}

// Choix proposé d'office quand l'allergie est renseignée (le pharmacien change à son gré).
const ANTIBIOTIQUE_PAR_DEFAUT: Record<Allergie, IdAntibiotique> = {
  aucune: 'amoxicilline',
  penicillines: 'cefpodoxime',
  betalactamines: 'clarithromycine',
}

// Antibiotiques que le bon propose pour cette allergie et ce public (le
// céfuroxime n'existe que sur le bon adulte).
export function antibiotiquesProposes(allergie: Allergie, bon: TypeBon): IdAntibiotique[] {
  return ANTIBIOTIQUES_PAR_ALLERGIE[allergie].filter((id) => ANTIBIOTIQUES[id][bon] !== undefined)
}

// --- Données -------------------------------------------------------------------------

export type PatientTrod = {
  nom: string
  prenom: string
  age: string
  poids: string
  secu: string
  medecin: string
  date: string // AAAA-MM-JJ
}

export type MesuresTrod = { temperature: string; pas: string; fc: string; fr: string }

export type ResultatTrod = 'positif' | 'negatif' | null

// Score de Mac Isaac (fiche mémo HAS) : 4 critères à 1 point + point d'âge.
export type IdCritereMacIsaac = 'temperature' | 'sans_toux' | 'adenopathie' | 'amygdales'

export const CRITERES_MAC_ISAAC: { id: IdCritereMacIsaac; libelle: string }[] = [
  { id: 'temperature', libelle: 'Température > 38 °C' },
  { id: 'sans_toux', libelle: 'Absence de toux' },
  { id: 'adenopathie', libelle: 'Adénopathie(s) cervicale(s) antérieure(s) douloureuse(s)' },
  { id: 'amygdales', libelle: 'Augmentation de volume ou exsudat amygdalien' },
]

export type MacIsaac = {
  criteres: Record<IdCritereMacIsaac, boolean>
  // Point d'âge saisi à la main : la fiche HAS ne le donne ni sous 15 ans ni de
  // façon explicite à 45 ans pile. Utilisé seulement sous 15 ans.
  age_manuel: 0 | 1 | null
}

export type DonneesTrodAngine = {
  patient: PatientTrod
  mesures: MesuresTrod
  macisaac: MacIsaac
  gravite: Record<IdGravite, boolean>
  // Précision de l'examen endo-buccal (« autre… »), reportée en compléments.
  gravite_precision: string
  exclusions: Record<IdExclusion, boolean>
  trod: ResultatTrod
  allergie: Allergie | null
  // null : bon choisi d'après l'âge.
  bon: TypeBon | null
  antibiotique: IdAntibiotique | null
  // Corrections manuelles des 5 blocs du compte rendu (absent : valeur proposée).
  blocs: Partial<Record<IdBloc, boolean>>
  points_divers: string
  // Nom du pharmacien (compte rendu et bon), saisi sur chaque fiche.
  pharmacien: string
}

const MAX_COURT = 120
const MAX_LONG = 2000

export function trodAngineVide(): DonneesTrodAngine {
  return {
    patient: { nom: '', prenom: '', age: '', poids: '', secu: '', medecin: '', date: dateDuJourIso() },
    mesures: { temperature: '', pas: '', fc: '', fr: '' },
    macisaac: {
      criteres: Object.fromEntries(CRITERES_MAC_ISAAC.map((c) => [c.id, false])) as Record<IdCritereMacIsaac, boolean>,
      age_manuel: null,
    },
    gravite_precision: '',
    gravite: Object.fromEntries(SIGNES_GRAVITE.map((s) => [s.id, false])) as Record<IdGravite, boolean>,
    exclusions: Object.fromEntries(CRITERES_EXCLUSION.map((c) => [c.id, false])) as Record<IdExclusion, boolean>,
    trod: null,
    allergie: null,
    bon: null,
    antibiotique: null,
    blocs: {},
    points_divers: '',
    pharmacien: '',
  }
}

function objet(valeur: unknown): Record<string, unknown> {
  return valeur !== null && typeof valeur === 'object' && !Array.isArray(valeur)
    ? (valeur as Record<string, unknown>)
    : {}
}

function texte(valeur: unknown, max: number): string {
  return typeof valeur === 'string' ? valeur.slice(0, max) : ''
}

function choix<T extends string>(valeur: unknown, valides: readonly T[]): T | null {
  return typeof valeur === 'string' && (valides as readonly string[]).includes(valeur) ? (valeur as T) : null
}

// Reconstruit une fiche valide depuis n'importe quelle entrée (JSON de la base
// ou envoi du client) : champs inconnus ignorés, textes tronqués, structure
// toujours complète.
export function normaliserTrodAngine(brut: unknown): DonneesTrodAngine {
  const base = trodAngineVide()
  const source = objet(brut)
  const p = objet(source.patient)
  const date = texte(p.date, 10)

  base.patient = {
    nom: texte(p.nom, MAX_COURT),
    prenom: texte(p.prenom, MAX_COURT),
    age: texte(p.age, 20).replace(/\D/g, '').slice(0, 3),
    poids: texte(p.poids, 6),
    secu: texte(p.secu, 40).replace(/\D/g, '').slice(0, 15),
    medecin: texte(p.medecin, MAX_COURT),
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : base.patient.date,
  }

  const m = objet(source.mesures)
  base.mesures = {
    temperature: texte(m.temperature, 6),
    pas: texte(m.pas, 4),
    fc: texte(m.fc, 4),
    fr: texte(m.fr, 4),
  }

  const mi = objet(source.macisaac)
  const critMi = objet(mi.criteres)
  for (const c of CRITERES_MAC_ISAAC) base.macisaac.criteres[c.id] = critMi[c.id] === true
  base.macisaac.age_manuel = mi.age_manuel === 0 || mi.age_manuel === 1 ? mi.age_manuel : null
  base.gravite_precision = texte(source.gravite_precision, 300)

  const g = objet(source.gravite)
  for (const s of SIGNES_GRAVITE) base.gravite[s.id] = g[s.id] === true
  const e = objet(source.exclusions)
  for (const c of CRITERES_EXCLUSION) base.exclusions[c.id] = e[c.id] === true

  base.trod = choix(source.trod, ['positif', 'negatif'] as const)
  base.allergie = choix(source.allergie, ['aucune', 'penicillines', 'betalactamines'] as const)
  base.bon = choix(source.bon, ['enfant', 'adulte'] as const)
  base.antibiotique = choix(source.antibiotique, Object.keys(ANTIBIOTIQUES) as IdAntibiotique[])

  const b = objet(source.blocs)
  for (const bloc of BLOCS) if (typeof b[bloc.id] === 'boolean') base.blocs[bloc.id] = b[bloc.id] as boolean

  base.points_divers = texte(source.points_divers, MAX_LONG)
  base.pharmacien = texte(source.pharmacien, MAX_COURT)
  return base
}

// --- Nombres saisis ---------------------------------------------------------------------

function nombre(saisie: string): number | null {
  const brut = saisie.trim().replace(',', '.')
  if (brut === '') return null
  const n = Number(brut)
  return Number.isFinite(n) ? n : null
}

export function ageEnAnnees(donnees: DonneesTrodAngine): number | null {
  const n = nombre(donnees.patient.age)
  return n !== null && n >= 0 && n <= 120 ? Math.floor(n) : null
}

export function poidsEnKg(donnees: DonneesTrodAngine): number | null {
  const n = nombre(donnees.patient.poids)
  return n !== null && n >= 3 && n <= 200 ? n : null
}

// --- Pré-cochage d'après les réponses -------------------------------------------------

// Âge saisi : coche (ou décoche) « âge < 10 ans ». Une correction manuelle
// ultérieure de la case est conservée tant que l'âge n'est pas ressaisi.
export function changerAge(donnees: DonneesTrodAngine, age: string): DonneesTrodAngine {
  const suivant: DonneesTrodAngine = {
    ...donnees,
    patient: { ...donnees.patient, age: age.replace(/\D/g, '').slice(0, 3) },
  }
  const annees = ageEnAnnees(suivant)
  if (annees === null) return suivant
  return { ...suivant, exclusions: { ...suivant.exclusions, age: annees < 10 } }
}

// Mesure saisie : coche (ou décoche) les signes de gravité correspondants quand
// la mesure est exploitable. Une mesure vide ne touche à rien.
export function changerMesure(
  donnees: DonneesTrodAngine,
  cle: keyof MesuresTrod,
  valeur: string
): DonneesTrodAngine {
  const mesures = { ...donnees.mesures, [cle]: valeur }
  const gravite = { ...donnees.gravite }

  const temperature = nombre(mesures.temperature)
  if (temperature !== null) gravite.temperature = temperature > 39.5

  const pas = nombre(mesures.pas)
  const fc = nombre(mesures.fc)
  const fr = nombre(mesures.fr)
  if (pas !== null || fc !== null || fr !== null) {
    gravite.constantes = (pas !== null && pas < 90) || (fc !== null && fc > 110) || (fr !== null && fr > 20)
  }

  return { ...donnees, mesures, gravite }
}

export function nombreSignesGravite(donnees: DonneesTrodAngine): number {
  return SIGNES_GRAVITE.filter((s) => donnees.gravite[s.id]).length
}

export function nombreCriteresExclusion(donnees: DonneesTrodAngine): number {
  return CRITERES_EXCLUSION.filter((c) => donnees.exclusions[c.id]).length
}

// Bon à utiliser : celui choisi à la main, sinon d'après l'âge. Âge inconnu :
// bon adulte (l'écran invite alors à préciser).
export function typeBonEffectif(donnees: DonneesTrodAngine): TypeBon {
  if (donnees.bon) return donnees.bon
  const age = ageEnAnnees(donnees)
  return age !== null && age < AGE_BON_ADULTE ? 'enfant' : 'adulte'
}

// Choix de l'allergie : propose l'antibiotique correspondant si le choix actuel
// n'est plus possible.
export function changerAllergie(donnees: DonneesTrodAngine, allergie: Allergie): DonneesTrodAngine {
  const bon = typeBonEffectif(donnees)
  const proposes = antibiotiquesProposes(allergie, bon)
  const garde = donnees.antibiotique !== null && proposes.includes(donnees.antibiotique)
  return { ...donnees, allergie, antibiotique: garde ? donnees.antibiotique : defautPour(allergie, bon) }
}

function defautPour(allergie: Allergie, bon: TypeBon): IdAntibiotique | null {
  const voulu = ANTIBIOTIQUE_PAR_DEFAUT[allergie]
  const proposes = antibiotiquesProposes(allergie, bon)
  return proposes.includes(voulu) ? voulu : (proposes[0] ?? null)
}

// Changement de bon : l'antibiotique choisi est revu si le nouveau bon ne le propose pas.
export function changerBon(donnees: DonneesTrodAngine, bon: TypeBon | null): DonneesTrodAngine {
  const suivant = { ...donnees, bon }
  if (donnees.allergie === null) return suivant
  const effectif = typeBonEffectif(suivant)
  const proposes = antibiotiquesProposes(donnees.allergie, effectif)
  if (donnees.antibiotique !== null && proposes.includes(donnees.antibiotique)) return suivant
  return { ...suivant, antibiotique: defautPour(donnees.allergie, effectif) }
}

// --- Score de Mac Isaac ---------------------------------------------------------------------

// Point d'âge : 15 à 44 ans = 0, 45 ans et plus = −1 (la fiche écrit « > 45 »
// mais ne couvre pas 45 ; on le range avec les plus de 45). Sous 15 ans, la
// fiche est muette : valeur choisie à la main, null tant qu'elle ne l'est pas.
export function pointAgeMacIsaac(donnees: DonneesTrodAngine): number | null {
  const age = ageEnAnnees(donnees)
  if (age === null) return null
  if (age >= 45) return -1
  if (age >= 15) return 0
  return donnees.macisaac.age_manuel
}

// Le point d'âge doit être saisi à la main (âge sous 15 ans renseigné).
export function pointAgeManuelRequis(donnees: DonneesTrodAngine): boolean {
  const age = ageEnAnnees(donnees)
  return age !== null && age < 15
}

export function scoreMacIsaac(donnees: DonneesTrodAngine): number | null {
  const age = pointAgeMacIsaac(donnees)
  if (age === null) return null
  const criteres = CRITERES_MAC_ISAAC.filter((c) => donnees.macisaac.criteres[c.id]).length
  return criteres + age
}

export type IndicationMacIsaac = 'trod_indique' | 'pas_antibiotique' | null

// Score ≥ 2 : TROD indiqué ; < 2 : pas d'antibiotique selon la HAS.
export function indicationMacIsaac(donnees: DonneesTrodAngine): IndicationMacIsaac {
  const score = scoreMacIsaac(donnees)
  if (score === null) return null
  return score >= 2 ? 'trod_indique' : 'pas_antibiotique'
}

// Ligne reportée dans les compléments du compte rendu. Vide tant que le score
// n'est pas calculable (âge manquant, ou point d'âge sous 15 ans non choisi).
export function texteMacIsaac(donnees: DonneesTrodAngine): string {
  const score = scoreMacIsaac(donnees)
  if (score === null) return ''
  const cochees = CRITERES_MAC_ISAAC.filter((c) => donnees.macisaac.criteres[c.id]).map((c) => c.libelle)
  const age = pointAgeMacIsaac(donnees) as number
  const detail = [...cochees, `âge ${age > 0 ? '+' : ''}${age}`].join(' ; ')
  return `Score de Mac Isaac : ${score} (${detail}).`
}

// --- Blocs du compte rendu ----------------------------------------------------------------

// Valeur proposée pour chaque bloc d'après les réponses, avant corrections manuelles.
export function blocsProposes(donnees: DonneesTrodAngine): Record<IdBloc, boolean> {
  return {
    b1: donnees.trod === 'positif' && donnees.antibiotique !== null,
    b2: donnees.trod === 'negatif',
    b3: donnees.trod !== null,
    b4: nombreCriteresExclusion(donnees) > 0,
    b5: nombreSignesGravite(donnees) > 0,
  }
}

// Valeur finale de chaque bloc : la correction manuelle quand il y en a une.
export function blocsEffectifs(donnees: DonneesTrodAngine): Record<IdBloc, boolean> {
  const proposes = blocsProposes(donnees)
  return {
    b1: donnees.blocs.b1 ?? proposes.b1,
    b2: donnees.blocs.b2 ?? proposes.b2,
    b3: donnees.blocs.b3 ?? proposes.b3,
    b4: donnees.blocs.b4 ?? proposes.b4,
    b5: donnees.blocs.b5 ?? proposes.b5,
  }
}

export function basculerBloc(donnees: DonneesTrodAngine, bloc: IdBloc): DonneesTrodAngine {
  const courant = blocsEffectifs(donnees)[bloc]
  return { ...donnees, blocs: { ...donnees.blocs, [bloc]: !courant } }
}

// Le bon n'a de sens que si un antibiotique est délivré (bloc 1 coché).
export function bonDisponible(donnees: DonneesTrodAngine): boolean {
  return blocsEffectifs(donnees).b1 && donnees.antibiotique !== null
}

// --- Doses --------------------------------------------------------------------------------------

export type DoseEnfant = {
  parJour: number
  parPrise: number
  prises: number
  duree: number
  plafonne: boolean
  // Dose adulte du même antibiotique dépassée (sans plafond imprimé sur le bon) : à vérifier.
  depasseAdulte: boolean
}

// Dose par kg × poids, plafonnée quand le bon le prévoit. Null si l'antibiotique
// n'a pas de posologie enfant ou si le poids n'est pas exploitable.
export function calculerDoseEnfant(id: IdAntibiotique, poids: number | null): DoseEnfant | null {
  const def = ANTIBIOTIQUES[id]
  if (!def.enfant || poids === null) return null
  const { mgParKgJour, prises, duree, plafondJour } = def.enfant
  const brute = mgParKgJour * poids
  const plafonne = plafondJour !== undefined && brute > plafondJour
  const parJour = Math.round(plafonne ? (plafondJour as number) : brute)
  const adulte = def.adulte?.mgParJour
  return {
    parJour,
    parPrise: Math.round(parJour / prises),
    prises,
    duree,
    plafonne,
    depasseAdulte: plafondJour === undefined && adulte !== undefined && parJour > adulte,
  }
}

function milliers(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

// Phrase de dose écrite sur le bon enfant, sous la case cochée.
export function texteDoseEnfant(poids: number, dose: DoseEnfant): string {
  const prises = dose.prises === 1 ? '1 prise par jour' : `${dose.prises} prises par jour`
  const poidsTexte = String(poids).replace('.', ',')
  const parPrise = dose.prises === 1 ? '' : `, soit ${milliers(dose.parPrise)} mg par prise`
  const note = dose.plafonne ? ' (plafond atteint)' : dose.depasseAdulte ? ' (> dose adulte, à vérifier)' : ''
  return `Poids ${poidsTexte} kg : ${milliers(dose.parJour)} mg/j en ${prises}${parPrise}, ${dose.duree} jours${note}`
}

// Phrase de dose pour l'écran et le bon, ou null si elle n'est pas calculable.
export function doseEnTexte(donnees: DonneesTrodAngine, id: IdAntibiotique): string | null {
  if (typeBonEffectif(donnees) !== 'enfant') return null
  const poids = poidsEnKg(donnees)
  const dose = calculerDoseEnfant(id, poids)
  return dose && poids !== null ? texteDoseEnfant(poids, dose) : null
}

// --- Liste ----------------------------------------------------------------------------------------

export function enteteTrodAngine(donnees: DonneesTrodAngine): { nom: string; prenom: string; date: string } {
  return { nom: donnees.patient.nom, prenom: donnees.patient.prenom, date: donnees.patient.date }
}

// --- Étapes de saisie -------------------------------------------------------------------------------

export type EtapeTrod = 'patient' | 'macisaac' | 'gravite' | 'exclusions' | 'trod' | 'antibiotique' | 'documents'

export const ETAPES_TROD: { id: EtapeTrod; titre: string }[] = [
  { id: 'patient', titre: 'Le patient' },
  { id: 'macisaac', titre: 'Score de Mac Isaac' },
  { id: 'gravite', titre: 'Signes de gravité' },
  { id: 'exclusions', titre: 'Critères d’exclusion' },
  { id: 'trod', titre: 'Résultat du TROD' },
  { id: 'antibiotique', titre: 'Antibiotique' },
  { id: 'documents', titre: 'Compte rendu et bon' },
]

// --- Identité de l'officine -----------------------------------------------------------------------

// Imprimée sur le compte rendu et le bon (tampon) ; saisie une fois par officine.
export type IdentiteOfficine = { nom_structure: string; adresse: string; numero_am: string }

export const IDENTITE_VIDE: IdentiteOfficine = { nom_structure: '', adresse: '', numero_am: '' }

export function normaliserIdentite(brut: unknown): IdentiteOfficine {
  const source = objet(brut)
  return {
    nom_structure: texte(source.nom_structure, 150).trim(),
    adresse: texte(source.adresse, 250).trim(),
    numero_am: texte(source.numero_am, 40).trim(),
  }
}
