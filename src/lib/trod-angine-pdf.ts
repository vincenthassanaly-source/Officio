// Remplissage des PDF officiels pour le TROD angine : le compte rendu de prise
// en charge (1 page) et le bon de prise en charge des antibiotiques délivrés
// sans ordonnance (angine de l'enfant ou de l'adulte, un fichier chacun).
//
// Les PDF d'origine (assets/trod-angine/documents/) servent de fond : on y écrit le
// texte et on y dessine les croix, sans rien recréer. Les positions sont
// relevées sur un rendu à 144 dpi (1 px = 0,5 pt), origine en haut à gauche, d'où
// les constantes en pixels. Le cadre du tampon et de la signature du bon reste
// vide : le pharmacien y appose son tampon.
//
// Module serveur : lit les fichiers modèles sur le disque (voir
// outputFileTracingIncludes dans next.config.ts).

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import {
  CRITERES_EXCLUSION,
  SIGNES_GRAVITE,
  ageEnAnnees,
  blocsEffectifs,
  bonDisponible,
  doseEnTexte,
  poidsEnKg,
  texteMacIsaac,
  typeBonEffectif,
  type DonneesTrodAngine,
  type IdAntibiotique,
  type IdExclusion,
  type IdGravite,
  type IdentiteOfficine,
} from '@/lib/trod-angine'

type Point = readonly [number, number]

const PX = 0.5
const ENCRE = rgb(0.05, 0.1, 0.35)

async function lireModele(nom: string): Promise<PDFDocument> {
  const octets = await readFile(join(process.cwd(), 'assets', 'trod-angine', 'documents', nom))
  return PDFDocument.load(octets)
}

// Texte sans les caractères que la police standard ne sait pas écrire.
function sur(police: PDFFont, texte: string): string {
  let sortie = ''
  for (const c of texte.replace(/[\r\n\t]+/g, ' ')) {
    try {
      police.encodeText(c)
      sortie += c
    } catch {
      sortie += '?'
    }
  }
  return sortie
}

function ecrire(page: PDFPage, police: PDFFont, texte: string, x: number, baseline: number, taille = 11) {
  if (!texte) return
  page.drawText(sur(police, texte), {
    x: x * PX,
    y: page.getHeight() - baseline * PX,
    size: taille,
    font: police,
    color: ENCRE,
  })
}

// Croix dans une case dont on donne le centre.
function cocher(page: PDFPage, [cx, cy]: Point, demi = 5.5, epaisseur = 1.7) {
  const x = cx * PX
  const y = page.getHeight() - cy * PX
  const trait = { thickness: epaisseur, color: ENCRE }
  page.drawLine({ start: { x: x - demi, y: y - demi }, end: { x: x + demi, y: y + demi }, ...trait })
  page.drawLine({ start: { x: x - demi, y: y + demi }, end: { x: x + demi, y: y - demi }, ...trait })
}

function dateFrancaise(iso: string): string {
  const [a, m, j] = iso.split('-')
  return a && m && j ? `${j}/${m}/${a}` : iso
}

// Découpe un texte en lignes qui tiennent dans une largeur (en px de page).
function decouper(police: PDFFont, texte: string, taille: number, largeurPx: number): string[] {
  const lignes: string[] = []
  for (const paragraphe of texte.split(/\r?\n/)) {
    let ligne = ''
    for (const mot of paragraphe.split(' ')) {
      const essai = ligne ? `${ligne} ${mot}` : mot
      if (police.widthOfTextAtSize(sur(police, essai), taille) > largeurPx * PX && ligne) {
        lignes.push(ligne)
        ligne = mot
      } else {
        ligne = essai
      }
    }
    lignes.push(ligne)
  }
  return lignes
}

// --- Utilitaires de texte ---------------------------------------------------------------------

// Écrit un texte sur une seule ligne, en réduisant la taille jusqu'à ce qu'il
// tienne dans la largeur disponible (en px de page).
function ecrireAjuste(
  page: PDFPage,
  police: PDFFont,
  texte: string,
  x: number,
  baseline: number,
  largeurPx: number,
  taille = 11,
  tailleMin = 6.5
) {
  if (!texte) return
  let t = taille
  while (t > tailleMin && police.widthOfTextAtSize(sur(police, texte), t) > largeurPx * PX) t -= 0.5
  ecrire(page, police, texte, x, baseline, t)
}

// N° de sécurité sociale en groupes lisibles (sexe, année, mois, département, commune, ordre, clé).
function formaterSecu(secu: string): string {
  const coupes = [1, 2, 2, 2, 3, 3, 2]
  const groupes: string[] = []
  let i = 0
  for (const n of coupes) {
    if (i >= secu.length) break
    groupes.push(secu.slice(i, i + n))
    i += n
  }
  return groupes.join(' ')
}

// --- Compte rendu ---------------------------------------------------------------------------

// Le compte rendu est un formulaire PDF : ses cases sont des champs, dessinés par
// dessus le contenu de la page, donc une croix tracée dessous resterait cachée.
// On aplatit le formulaire en premier (les champs deviennent du contenu de page),
// puis on trace les croix et les textes par dessus.

const CR_NOM_PRENOM: Point = [250, 177]
const CR_AGE: Point = [146, 217]
const CR_SECU: Point = [312, 257]
const CR_MEDECIN: Point = [535, 297]
const CR_DATE: Point = [806, 177]
const CR_STRUCTURE: Point = [806, 217]
const CR_PHARMACIEN: Point = [806, 257]
const CR_LARGEUR_DROITE = 305

// Centres des cases : blocs 1 à 5 et molécules du bloc 1 (une case par molécule,
// la ligne couvre les posologies adulte et enfant).
const CR_BLOC: Record<'b1' | 'b2' | 'b3' | 'b4' | 'b5', Point> = {
  b1: [84, 373],
  b2: [84, 713],
  b3: [84, 763],
  b4: [84, 842],
  b5: [84, 1338],
}
const CR_MOLECULE: Record<IdAntibiotique, Point> = {
  amoxicilline: [121, 433],
  cefuroxime: [121, 522],
  cefpodoxime: [121, 574],
  clarithromycine: [743, 434],
}
const CR_EXCLUSION: Record<IdExclusion, Point> = {
  recueil: [121, 909],
  age: [121, 944],
  eruption: [121, 980],
  evolution: [121, 1015],
  voyage: [121, 1051],
  grossesse: [121, 1107],
  immunodepression: [121, 1143],
  insuffisance_renale: [121, 1202],
  antibiotherapie: [121, 1266],
  episode_recent: [743, 912],
  episodes_repetes: [743, 969],
  contre_indication: [743, 1046],
  catheter: [743, 1181],
  doute: [743, 1217],
}
const CR_GRAVITE: Record<IdGravite, Point> = {
  temperature: [121, 1405],
  constantes: [121, 1440],
  respiratoire: [121, 1526],
  trismus: [121, 1562],
  hypersialorrhee: [121, 1598],
  cervicalgie: [743, 1404],
  endobuccal: [743, 1463],
}

// Le compte rendu n'a pas de zone libre : le score de Mac Isaac, la précision de
// l'examen endo-buccal et les points divers vont sur une page de compléments,
// ajoutée seulement s'il y a quelque chose à y écrire.
function complements(donnees: DonneesTrodAngine): string[] {
  const lignes: string[] = []
  const score = texteMacIsaac(donnees)
  if (score) lignes.push(score)
  const precision = donnees.gravite_precision.trim()
  if (donnees.gravite.endobuccal && precision) lignes.push(`Examen endo-buccal : ${precision}`)
  const divers = donnees.points_divers.trim()
  if (divers) lignes.push('Points divers :', divers)
  return lignes
}

function ajouterPageComplements(doc: PDFDocument, police: PDFFont, gras: PDFFont, donnees: DonneesTrodAngine) {
  const lignes = complements(donnees)
  if (lignes.length === 0) return
  const page = doc.addPage([595.276, 841.89])
  const { nom, prenom, date } = donnees.patient
  const identite = [`${nom.toUpperCase()} ${prenom}`.trim(), dateFrancaise(date)].filter(Boolean).join(' – ')
  page.drawText('Compléments au compte rendu de prise en charge', {
    x: 48,
    y: 790,
    size: 14,
    font: gras,
    color: ENCRE,
  })
  if (identite) page.drawText(sur(gras, identite), { x: 48, y: 770, size: 10.5, font: police, color: ENCRE })
  let y = 735
  for (const ligne of lignes) {
    for (const morceau of decouper(police, ligne, 11, 1010)) {
      if (y < 60) return
      page.drawText(sur(police, morceau), { x: 48, y, size: 11, font: police, color: ENCRE })
      y -= 17
    }
    y -= 5
  }
}

export async function genererCompteRendu(donnees: DonneesTrodAngine, identite: IdentiteOfficine): Promise<Uint8Array> {
  const doc = await lireModele('compte-rendu-prise-en-charge.pdf')
  const police = await doc.embedFont(StandardFonts.Helvetica)
  const gras = await doc.embedFont(StandardFonts.HelveticaBold)
  doc.getForm().flatten()
  const [page] = doc.getPages()
  const blocs = blocsEffectifs(donnees)
  const { patient } = donnees

  ecrireAjuste(page, police, `${patient.nom.toUpperCase()} ${patient.prenom}`.trim(), CR_NOM_PRENOM[0], CR_NOM_PRENOM[1], 420)
  ecrire(page, police, patient.age ? `${patient.age} ans` : '', CR_AGE[0], CR_AGE[1])
  ecrire(page, police, formaterSecu(patient.secu), CR_SECU[0], CR_SECU[1], 12)
  ecrireAjuste(page, police, patient.medecin, CR_MEDECIN[0], CR_MEDECIN[1], 560)
  ecrire(page, police, dateFrancaise(patient.date), CR_DATE[0], CR_DATE[1])
  // Structure sur deux lignes (la case est étroite) : nom, puis adresse et n° AM.
  const detailStructure = [identite.adresse, identite.numero_am && `n° AM ${identite.numero_am}`].filter(Boolean).join(' – ')
  ecrireAjuste(page, police, identite.nom_structure, CR_STRUCTURE[0], CR_STRUCTURE[1] - 8, CR_LARGEUR_DROITE, 9, 6)
  ecrireAjuste(page, police, detailStructure, CR_STRUCTURE[0], CR_STRUCTURE[1] + 8, CR_LARGEUR_DROITE, 8, 5.5)
  ecrireAjuste(page, police, donnees.pharmacien, CR_PHARMACIEN[0], CR_PHARMACIEN[1], CR_LARGEUR_DROITE)

  for (const id of ['b1', 'b2', 'b3', 'b4', 'b5'] as const) if (blocs[id]) cocher(page, CR_BLOC[id], 5)

  // Molécule cochée seulement si le bloc 1 l'est : l'adulte et l'enfant partagent la même case.
  if (blocs.b1 && donnees.antibiotique) cocher(page, CR_MOLECULE[donnees.antibiotique], 5)

  for (const c of CRITERES_EXCLUSION) if (donnees.exclusions[c.id]) cocher(page, CR_EXCLUSION[c.id], 5)
  for (const s of SIGNES_GRAVITE) if (donnees.gravite[s.id]) cocher(page, CR_GRAVITE[s.id], 5)

  ajouterPageComplements(doc, police, gras, donnees)
  return doc.save()
}

// --- Bon de prise en charge -----------------------------------------------------------------------

type DispositionBon = {
  fichier: string
  date: Point
  nom: Point
  age: Point
  // Premier baseline du tampon (nom du pharmacien, structure, adresse, n° AM) et interligne.
  tampon: Point
  cases: Partial<Record<IdAntibiotique, Point>>
  // Où écrire la dose calculée (bon enfant), sous la ligne de l'antibiotique.
  doses: Partial<Record<IdAntibiotique, Point>>
}

const BON_ENFANT: DispositionBon = {
  fichier: 'bon-prise-en-charge-enfant.pdf',
  date: [945, 437],
  nom: [445, 539],
  age: [335, 589],
  tampon: [142, 322],
  cases: { amoxicilline: [259, 682], cefpodoxime: [259, 897], clarithromycine: [259, 1080] },
  doses: { amoxicilline: [286, 747], cefpodoxime: [286, 962], clarithromycine: [286, 1112] },
}

const BON_ADULTE: DispositionBon = {
  fichier: 'bon-prise-en-charge-adulte.pdf',
  date: [945, 419],
  nom: [445, 521],
  age: [335, 571],
  tampon: [142, 326],
  cases: {
    amoxicilline: [259, 664],
    cefuroxime: [259, 848],
    cefpodoxime: [259, 950],
    clarithromycine: [259, 1102],
  },
  doses: {},
}

export async function genererBon(donnees: DonneesTrodAngine, identite: IdentiteOfficine): Promise<Uint8Array> {
  const bon = typeBonEffectif(donnees)
  const disposition = bon === 'enfant' ? BON_ENFANT : BON_ADULTE
  const doc = await lireModele(disposition.fichier)
  const police = await doc.embedFont(StandardFonts.Helvetica)
  const italique = await doc.embedFont(StandardFonts.HelveticaOblique)
  const [page] = doc.getPages()

  // Tampon : pharmacien, structure, adresse, n° AM (la signature reste à la main).
  const lignesTampon = [
    donnees.pharmacien && `Pharmacien : ${donnees.pharmacien}`,
    identite.nom_structure,
    identite.adresse,
    identite.numero_am && `N° AM : ${identite.numero_am}`,
  ].filter(Boolean) as string[]
  lignesTampon.forEach((ligne, i) =>
    ecrireAjuste(page, police, ligne, disposition.tampon[0], disposition.tampon[1] + i * 26, 700, 11)
  )

  const { patient } = donnees
  ecrire(page, police, dateFrancaise(patient.date), disposition.date[0], disposition.date[1])
  ecrire(page, police, `${patient.nom.toUpperCase()} ${patient.prenom}`.trim(), disposition.nom[0], disposition.nom[1])

  const age = ageEnAnnees(donnees)
  const poids = poidsEnKg(donnees)
  const ageTexte = age === null ? '' : `${age} ans`
  const ageEtPoids =
    bon === 'enfant' && poids !== null ? `${ageTexte} - ${String(poids).replace('.', ',')} kg` : ageTexte
  ecrire(page, police, ageEtPoids, disposition.age[0], disposition.age[1])

  const id = donnees.antibiotique
  if (id) {
    const caseAntibiotique = disposition.cases[id]
    if (caseAntibiotique) cocher(page, caseAntibiotique, 5.5, 1.6)
    const emplacementDose = disposition.doses[id]
    const dose = doseEnTexte(donnees, id)
    if (emplacementDose && dose) ecrire(page, italique, dose, emplacementDose[0], emplacementDose[1], 9.5)
  }

  return doc.save()
}

// --- Dossier (compte rendu + bon) -------------------------------------------------------------------

// Un seul PDF avec le compte rendu puis, si un antibiotique est délivré, le bon.
export async function genererDossier(donnees: DonneesTrodAngine, identite: IdentiteOfficine): Promise<Uint8Array> {
  const dossier = await PDFDocument.create()
  const sources = [await genererCompteRendu(donnees, identite)]
  if (bonDisponible(donnees)) sources.push(await genererBon(donnees, identite))
  for (const octets of sources) {
    const source = await PDFDocument.load(octets)
    const pages = await dossier.copyPages(source, source.getPageIndices())
    for (const page of pages) dossier.addPage(page)
  }
  return dossier.save()
}
