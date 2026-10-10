import { describe, expect, it } from 'vitest'
import { initialesDepuisNom } from './initiales'
import { normaliser } from './recherche-texte'

describe('normaliser', () => {
  it('retire les accents et met en minuscules', () => {
    expect(normaliser('Élodie Noël Çà')).toBe('elodie noel ca')
  })
})

describe('initialesDepuisNom', () => {
  it('prend les deux premières initiales en majuscules', () => {
    expect(initialesDepuisNom('marie dupont martin')).toBe('MD')
  })

  it('gère un seul mot et les espaces superflus', () => {
    expect(initialesDepuisNom('  paul  ')).toBe('P')
  })

  it('renvoie ? pour un nom vide', () => {
    expect(initialesDepuisNom('   ')).toBe('?')
  })
})
