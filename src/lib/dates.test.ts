import { describe, expect, it } from 'vitest'
import { getMonthGridDates, getWeekDates, toISODate } from './dates'

describe('toISODate', () => {
  it('formate en date locale avec zéros de remplissage', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(toISODate(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
})

describe('getWeekDates', () => {
  it('renvoie 7 jours du lundi au dimanche', () => {
    const semaine = getWeekDates(new Date(2026, 2, 11)) // mercredi 11 mars 2026
    expect(semaine).toHaveLength(7)
    expect(toISODate(semaine[0])).toBe('2026-03-09')
    expect(toISODate(semaine[6])).toBe('2026-03-15')
  })

  it('rattache un dimanche à la semaine qui se termine ce jour-là', () => {
    const semaine = getWeekDates(new Date(2026, 2, 15)) // dimanche
    expect(toISODate(semaine[0])).toBe('2026-03-09')
    expect(toISODate(semaine[6])).toBe('2026-03-15')
  })

  it('traverse un changement d\'année', () => {
    const semaine = getWeekDates(new Date(2026, 0, 1)) // jeudi 1er janvier 2026
    expect(toISODate(semaine[0])).toBe('2025-12-29')
    expect(toISODate(semaine[6])).toBe('2026-01-04')
  })
})

describe('getMonthGridDates', () => {
  it('produit une grille de semaines complètes qui contient tout le mois', () => {
    const grille = getMonthGridDates(new Date(2026, 1, 10))
    expect(grille.length % 7).toBe(0)
    const iso = grille.map(toISODate)
    expect(iso).toContain('2026-02-01')
    expect(iso).toContain('2026-02-28')
  })
})
