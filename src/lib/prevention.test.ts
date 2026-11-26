import { describe, expect, it } from 'vitest'
import {
  ACTIONS_SUGGEREES,
  QUESTIONS_PREVENTION,
  actionsParTheme,
  calculerAge,
  construireSectionsPrevention,
  donneesPreventionVides,
  normaliserPrevention,
  suggestionsPourThemes,
  trancheDepuisAge,
} from '@/lib/prevention'

describe('calculerAge', () => {
  it('compte les années révolues à la date du bilan', () => {
    expect(calculerAge('1975-04-02', '2026-04-01')).toBe(50)
    expect(calculerAge('1975-04-02', '2026-04-02')).toBe(51)
  })
  it('renvoie null pour des dates invalides ou incohérentes', () => {
    expect(calculerAge('', '2026-04-02')).toBeNull()
    expect(calculerAge('2030-01-01', '2026-04-02')).toBeNull()
  })
})

describe('trancheDepuisAge', () => {
  it('reconnaît les 4 tranches du bilan et leurs bornes', () => {
    expect(trancheDepuisAge(18)).toBe('18-25')
    expect(trancheDepuisAge(25)).toBe('18-25')
    expect(trancheDepuisAge(45)).toBe('45-50')
    expect(trancheDepuisAge(50)).toBe('45-50')
    expect(trancheDepuisAge(60)).toBe('60-65')
    expect(trancheDepuisAge(75)).toBe('70-75')
  })
  it('renvoie null hors tranche', () => {
    expect(trancheDepuisAge(17)).toBeNull()
    expect(trancheDepuisAge(30)).toBeNull()
    expect(trancheDepuisAge(76)).toBeNull()
    expect(trancheDepuisAge(null)).toBeNull()
  })
})

describe('suggestionsPourThemes', () => {
  it('ne propose que les thèmes cochés', () => {
    const s = suggestionsPourThemes(['vaccins'], '60-65')
    expect(s.length).toBeGreaterThan(0)
    expect(s.every((a) => a.theme === 'vaccins')).toBe(true)
  })
  it('filtre par tranche d’âge', () => {
    const ids = suggestionsPourThemes(['depistages'], '18-25').map((a) => a.id)
    expect(ids).toContain('depist-ist')
    expect(ids).not.toContain('depist-colorectal')
  })
  it('hors tranche ou âge inconnu : seulement les actions valables pour tous', () => {
    for (const tranche of [null] as const) {
      const s = suggestionsPourThemes(['depistages', 'vaccins'], tranche)
      expect(s.every((a) => a.tranches === undefined)).toBe(true)
    }
  })
  it('aucun thème : aucune suggestion', () => {
    expect(suggestionsPourThemes([], '45-50')).toEqual([])
  })
  it('les identifiants du catalogue sont uniques', () => {
    const ids = ACTIONS_SUGGEREES.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('construireSectionsPrevention', () => {
  it('couvre les 12 questions une seule fois', () => {
    const questions = construireSectionsPrevention()
      .flatMap((s) => s.etapes)
      .filter((e) => e.type === 'question')
    expect(questions).toHaveLength(QUESTIONS_PREVENTION.length)
  })
})

describe('normaliserPrevention', () => {
  it('reconstruit une fiche complète depuis une entrée vide ou invalide', () => {
    for (const brut of [null, undefined, 'x', 12, [], {}]) {
      const d = normaliserPrevention(brut)
      expect(d.reponses).toHaveLength(QUESTIONS_PREVENTION.length)
      expect(d.objectifs).toHaveLength(3)
      expect(d.actions).toEqual([])
    }
  })
  it('tronque les textes, ignore les thèmes inconnus et les actions invalides', () => {
    const d = normaliserPrevention({
      patient: { nom: 'x'.repeat(500), naissance: 'pas une date', date: '2026-11-26' },
      themes: ['vaccins', 'inconnu', 'activite', 'vaccins'],
      actions: [
        { id: 'a', theme: 'vaccins', texte: 'ok' },
        { id: 'a', theme: 'vaccins', texte: 'doublon' },
        { id: 'b', theme: 'inconnu', texte: 'thème invalide' },
        { id: 'c', theme: 'libre', texte: '   ' },
        { id: 'd', theme: 'libre', texte: 'libre ok' },
      ],
      reponses: [{ reponse: 'r', note: 'n', extra: 1 }],
    })
    expect(d.patient.nom).toHaveLength(200)
    expect(d.patient.naissance).toBe('')
    expect(d.themes).toEqual(['activite', 'vaccins'])
    expect(d.actions.map((a) => a.id)).toEqual(['a', 'd'])
    expect(d.reponses[0]).toEqual({ reponse: 'r', note: 'n' })
    expect(d.reponses[1]).toEqual({ reponse: '', note: '' })
  })
  it('est stable : normaliser deux fois donne le même résultat', () => {
    const vide = donneesPreventionVides()
    expect(normaliserPrevention(normaliserPrevention(vide))).toEqual(normaliserPrevention(vide))
  })
})

describe('actionsParTheme', () => {
  it('regroupe par thème avec les actions libres à la fin', () => {
    const g = actionsParTheme([
      { id: '1', theme: 'libre', texte: 'a' },
      { id: '2', theme: 'vaccins', texte: 'b' },
      { id: '3', theme: 'activite', texte: 'c' },
    ])
    expect(g.map((x) => x.theme)).toEqual(['activite', 'vaccins', 'libre'])
  })
})
