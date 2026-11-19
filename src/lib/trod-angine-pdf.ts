// Remplissage des PDF officiels de l'Assurance Maladie pour le TROD angine :
// le compte rendu (2 pages) et le bon de prise en charge des antibiotiques
// délivrés sans ordonnance (angine de l'enfant ou de l'adulte).
//
// Les PDF d'origine (assets/trod-angine/) servent de fond : on y écrit le
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
  ANTIBIOTIQUES,
  ageEnAnnees,
  blocsEffectifs,
  doseEnTexte,
  poidsEnKg,
  typeBonEffectif,
  type DonneesTrodAngine,
  type IdAntibiotique,
  type IdExclusion,
  type IdGravite,
} from '@/lib/trod-angine'

type Point = readonly [number, number]

const PX = 0.5
const ENCRE = rgb(0.05, 0.1, 0.35)

async function lireModele(nom: string): Promise<PDFDocument> {
  const octets = await readFile(join(process.cwd(), 'assets', 'trod-angine', nom))
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

// --- Compte rendu ---------------------------------------------------------------------------

const CR_NOM: Point = [152, 409]
const CR_PRENOM: Point = [775, 409]
const CR_AGE: Point = [140, 474]
const CR_MEDECIN: Point = [395, 541]
// Bord gauche des 15 cases du n° de sécurité sociale (largeur d'une case : 28 px).
const CR_SECU_X = [590, 629, 663, 702, 737, 776, 810, 849, 884, 918, 957, 991, 1025, 1064, 1099]
const CR_SECU_BASELINE = 469
const CR_SECU_LARGEUR = 28

// Centres des cases, page 1 : blocs 1 à 3 et molécules du bloc 1.
const CR_BLOC: Record<'b1' | 'b2' | 'b3', Point> = { b1: [159, 725], b2: [147, 1302], b3: [149, 1450] }
const CR_MOLECULE: Partial<Record<IdAntibiotique, Point>> = {
  amoxicilline: [102, 800],
  cefuroxime: [102, 937],
  cefpodoxime: [102, 1042],
  clarithromycine: [655, 803],
}
// Posologie cochée sous la molécule : adulte ou enfant.
const CR_POSOLOGIE: Partial<Record<IdAntibiotique, { adulte: Point; enfant?: Point }>> = {
  amoxicilline: { adulte: [150, 842], enfant: [150, 876] },
  cefuroxime: { adulte: [150, 982] },
  cefpodoxime: { adulte: [150, 1088], enfant: [150, 1142] },
  clarithromycine: { adulte: [706, 849], enfant: [706, 902] },
}

// Page 2 : blocs 4 et 5 et leurs critères.
const CR_BLOC_P2: Record<'b4' | 'b5', Point> = { b4: [126, 151], b5: [126, 713] }
const CR_EXCLUSION: Record<IdExclusion, Point> = {
  age: [68, 227],
  recueil: [68, 274],
  voyage: [68, 353],
  grossesse: [68, 424],
  evolution: [68, 461],
  eruption: [68, 498],
  insuffisance_renale: [68, 542],
  immunodepression: [635, 245],
  catheter: [635, 329],
  antibiotherapie: [635, 370],
  episode_recent: [635, 411],
  episodes_repetes: [635, 457],
  contre_indication: [635, 522],
}
const CR_GRAVITE: Record<IdGravite, Point> = {
  temperature: [68, 790],
  constantes: [68, 837],
  respiratoire: [68, 906],
  trismus: [635, 790],
  hypersialorrhee: [635, 827],
  cervicalgie: [635, 868],
}
const CR_DIVERS = { x: 60, premiereLigne: 1120, interligne: 23, largeur: 1070, lignesMax: 19, taille: 10.5 }

// Antibiotiques du bon absents du compte rendu : signalés dans « Points divers ».
function noteHorsCompteRendu(donnees: DonneesTrodAngine): string {
  const id = donnees.antibiotique
  if (!id || CR_MOLECULE[id]) return ''
  const bon = typeBonEffectif(donnees)
  const posologie = ANTIBIOTIQUES[id][bon]?.texte ?? ''
  return `Antibiotique délivré : ${ANTIBIOTIQUES[id].nom} ${posologie} (molécule absente de la liste ci-dessus).`
}

export async function genererCompteRendu(donnees: DonneesTrodAngine): Promise<Uint8Array> {
  const doc = await lireModele('compte-rendu.pdf')
  const police = await doc.embedFont(StandardFonts.Helvetica)
  const [p1, p2] = doc.getPages()
  const blocs = blocsEffectifs(donnees)
  const { patient } = donnees

  ecrire(p1, police, patient.nom, CR_NOM[0], CR_NOM[1])
  ecrire(p1, police, patient.prenom, CR_PRENOM[0], CR_PRENOM[1])
  ecrire(p1, police, patient.age ? `${patient.age} ans` : '', CR_AGE[0], CR_AGE[1])
  ecrire(p1, police, patient.medecin, CR_MEDECIN[0], CR_MEDECIN[1])

  for (let i = 0; i < CR_SECU_X.length; i++) {
    const chiffre = patient.secu[i]
    if (!chiffre) continue
    const largeur = police.widthOfTextAtSize(chiffre, 12) / PX
    ecrire(p1, police, chiffre, CR_SECU_X[i] + (CR_SECU_LARGEUR - largeur) / 2, CR_SECU_BASELINE, 12)
  }

  for (const id of ['b1', 'b2', 'b3'] as const) if (blocs[id]) cocher(p1, CR_BLOC[id])

  // Détail de l'antibiotique : seulement si le bloc 1 est coché.
  const id = donnees.antibiotique
  if (blocs.b1 && id) {
    const molecule = CR_MOLECULE[id]
    const posologie = CR_POSOLOGIE[id]
    if (molecule && posologie) {
      cocher(p1, molecule)
      const bon = typeBonEffectif(donnees)
      cocher(p1, bon === 'enfant' && posologie.enfant ? posologie.enfant : posologie.adulte, 4.5)
    }
  }

  for (const bloc of ['b4', 'b5'] as const) if (blocs[bloc]) cocher(p2, CR_BLOC_P2[bloc])
  for (const c of CRITERES_EXCLUSION) if (donnees.exclusions[c.id]) cocher(p2, CR_EXCLUSION[c.id])
  for (const s of SIGNES_GRAVITE) if (donnees.gravite[s.id]) cocher(p2, CR_GRAVITE[s.id])

  const divers = [noteHorsCompteRendu(donnees), donnees.points_divers.trim()].filter(Boolean).join('\n')
  const lignes = decouper(police, divers, CR_DIVERS.taille, CR_DIVERS.largeur).slice(0, CR_DIVERS.lignesMax)
  lignes.forEach((ligne, i) =>
    ecrire(p2, police, ligne, CR_DIVERS.x, CR_DIVERS.premiereLigne + i * CR_DIVERS.interligne, CR_DIVERS.taille)
  )

  return doc.save()
}

// --- Bon de prise en charge -----------------------------------------------------------------------

type DispositionBon = {
  date: Point
  nom: Point
  age: Point
  cases: Partial<Record<IdAntibiotique, Point>>
  // Où écrire la dose calculée (bon enfant), sous la ligne de l'antibiotique.
  doses: Partial<Record<IdAntibiotique, Point>>
}

const BON_ENFANT: DispositionBon = {
  date: [945, 436],
  nom: [445, 537],
  age: [335, 589],
  cases: {
    amoxicilline: [259, 685],
    cefpodoxime: [259, 899],
    azithromycine: [259, 1081],
    clarithromycine: [259, 1183],
    josamycine: [259, 1285],
  },
  doses: {
    amoxicilline: [286, 747],
    cefpodoxime: [286, 962],
    azithromycine: [286, 1112],
    clarithromycine: [286, 1214],
    josamycine: [286, 1316],
  },
}

const BON_ADULTE: DispositionBon = {
  date: [945, 418],
  nom: [445, 521],
  age: [335, 571],
  cases: {
    amoxicilline: [259, 666],
    cefuroxime: [259, 850],
    cefpodoxime: [259, 952],
    azithromycine: [259, 1104],
    clarithromycine: [259, 1206],
    josamycine: [259, 1308],
  },
  doses: {},
}

// Le PDF du bon compte 3 pages : enfant, cystite (hors périmètre), adulte. On
// ne garde que la page du bon utilisé.
export async function genererBon(donnees: DonneesTrodAngine): Promise<Uint8Array> {
  const doc = await lireModele('bon-de-prise-en-charge.pdf')
  const police = await doc.embedFont(StandardFonts.Helvetica)
  const italique = await doc.embedFont(StandardFonts.HelveticaOblique)
  const bon = typeBonEffectif(donnees)

  // Index 0 : enfant, 1 : cystite, 2 : adulte.
  const [enfant, , adulte] = doc.getPages()
  const page = bon === 'enfant' ? enfant : adulte
  const disposition = bon === 'enfant' ? BON_ENFANT : BON_ADULTE
  doc.removePage(bon === 'enfant' ? 2 : 0)
  doc.removePage(bon === 'enfant' ? 1 : 0)

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
    if (caseAntibiotique) cocher(page, caseAntibiotique, 3.4, 1.4)
    const emplacementDose = disposition.doses[id]
    const dose = doseEnTexte(donnees, id)
    if (emplacementDose && dose) ecrire(page, italique, dose, emplacementDose[0], emplacementDose[1], 9.5)
  }

  return doc.save()
}
