import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { changerAge, changerAllergie, trodAngineVide, type DonneesTrodAngine } from '@/lib/trod-angine'
import { genererBon, genererCompteRendu, genererDossier } from '@/lib/trod-angine-pdf'

const IDENTITE = { nom_structure: 'Pharmacie du Centre', adresse: '1 rue de la Paix, 75002 Paris', numero_am: '751234567' }

function ficheAdultePositive(): DonneesTrodAngine {
  let d = changerAge(trodAngineVide(), '30')
  d = { ...d, patient: { ...d.patient, nom: 'Dupont', prenom: 'Léa', secu: '285057800612345' }, trod: 'positif', pharmacien: 'Dr Martin' }
  return changerAllergie(d, 'aucune')
}

async function pages(octets: Uint8Array): Promise<number> {
  return (await PDFDocument.load(octets)).getPageCount()
}

describe('génération des PDF', () => {
  it('compte rendu : 1 page tant qu’il n’y a rien à compléter (pas de score calculable)', async () => {
    expect(await pages(await genererCompteRendu({ ...trodAngineVide(), trod: 'negatif' }, IDENTITE))).toBe(1)
  })

  it('compte rendu : une page de compléments dès que le score est calculable ou qu’il y a des points divers', async () => {
    expect(await pages(await genererCompteRendu(ficheAdultePositive(), IDENTITE))).toBe(2)
    const avecNote = { ...trodAngineVide(), points_divers: 'Patient pressé.' }
    expect(await pages(await genererCompteRendu(avecNote, IDENTITE))).toBe(2)
  })

  it('bon adulte et bon enfant : 1 page chacun', async () => {
    expect(await pages(await genererBon(ficheAdultePositive(), IDENTITE))).toBe(1)
    let enfant = changerAge(trodAngineVide(), '8')
    enfant = { ...enfant, patient: { ...enfant.patient, poids: '25' }, trod: 'positif' }
    enfant = changerAllergie(enfant, 'aucune')
    expect(await pages(await genererBon(enfant, IDENTITE))).toBe(1)
  })

  it('dossier : compte rendu (+ compléments) + bon quand un antibiotique est délivré, compte rendu seul sinon', async () => {
    expect(await pages(await genererDossier(ficheAdultePositive(), IDENTITE))).toBe(3)
    expect(await pages(await genererDossier({ ...trodAngineVide(), trod: 'negatif' }, IDENTITE))).toBe(1)
  })
})
