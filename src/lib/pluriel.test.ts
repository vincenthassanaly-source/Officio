import { describe, expect, it } from 'vitest'
import { pluriel } from './pluriel'

describe('pluriel', () => {
  it('met le singulier pour 0 et 1', () => {
    expect(pluriel(0, 'note')).toBe('0 note')
    expect(pluriel(1, 'note')).toBe('1 note')
  })

  it('ajoute un « s » par défaut à partir de 2', () => {
    expect(pluriel(2, 'note')).toBe('2 notes')
  })

  it('accepte une forme plurielle irrégulière', () => {
    expect(pluriel(1, 'nouveau message', 'nouveaux messages')).toBe('1 nouveau message')
    expect(pluriel(5, 'nouveau message', 'nouveaux messages')).toBe('5 nouveaux messages')
  })
})
