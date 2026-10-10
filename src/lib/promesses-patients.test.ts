import { describe, expect, it } from 'vitest'
import {
  formaterTelephone,
  lienTelephone,
  lireQuantite,
  QUANTITE_MAX,
  validerPromesse,
  validerTelephone,
} from './promesses-patients'

describe('validerTelephone', () => {
  it('accepte un champ vide (facultatif)', () => {
    expect(validerTelephone('')).toBeNull()
    expect(validerTelephone('   ')).toBeNull()
  })

  it.each(['06 12 34 56 78', '06.12.34.56.78', '+33 6 12 34 56 78', '0033612345678', '+32 470 12 34 56'])(
    'accepte %s',
    (saisie) => {
      expect(validerTelephone(saisie)).toBeNull()
    },
  )

  it.each(['0612', '00 12 34 56 78', 'abc', '+0612345678'])('refuse %s', (saisie) => {
    expect(validerTelephone(saisie)).not.toBeNull()
  })
})

describe('formaterTelephone', () => {
  it('normalise un numéro français quelle que soit la saisie', () => {
    expect(formaterTelephone('+33 6 12 34 56 78')).toBe('06 12 34 56 78')
    expect(formaterTelephone('0033612345678')).toBe('06 12 34 56 78')
    expect(formaterTelephone('06.12.34.56.78')).toBe('06 12 34 56 78')
  })

  it('compacte un numéro international', () => {
    expect(formaterTelephone('+32 470 12 34 56')).toBe('+32470123456')
  })

  it('renvoie null si rien n\'est saisi', () => {
    expect(formaterTelephone('  ')).toBeNull()
  })
})

describe('lienTelephone', () => {
  it('retire les séparateurs', () => {
    expect(lienTelephone('06 12 34 56 78')).toBe('tel:0612345678')
  })
})

describe('lireQuantite', () => {
  it('vide = 1', () => {
    expect(lireQuantite('')).toBe(1)
  })

  it('accepte les entiers entre 1 et le max', () => {
    expect(lireQuantite('3')).toBe(3)
    expect(lireQuantite(String(QUANTITE_MAX))).toBe(QUANTITE_MAX)
  })

  it.each(['0', '-1', '1.5', 'abc', String(QUANTITE_MAX + 1)])('refuse %s', (saisie) => {
    expect(lireQuantite(saisie)).toBeNull()
  })
})

describe('validerPromesse', () => {
  const valide = { nom_medicament: 'Doliprane', quantite: '2', nom_patient: 'Dupont', telephone_patient: '' }

  it('ne renvoie aucune erreur pour une saisie valide', () => {
    expect(validerPromesse(valide)).toEqual({})
  })

  it('signale les champs obligatoires manquants', () => {
    const erreurs = validerPromesse({ ...valide, nom_medicament: ' ', nom_patient: '' })
    expect(erreurs.nom_medicament).toBeDefined()
    expect(erreurs.nom_patient).toBeDefined()
  })

  it('signale une quantité et un téléphone invalides', () => {
    const erreurs = validerPromesse({ ...valide, quantite: '0', telephone_patient: '12' })
    expect(erreurs.quantite).toBeDefined()
    expect(erreurs.telephone_patient).toBeDefined()
  })
})
