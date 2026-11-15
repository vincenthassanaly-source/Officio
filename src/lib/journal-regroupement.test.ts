import { describe, expect, it } from 'vitest'
import type { EntreeJournal } from '@/lib/data/journal-activite'
import { regrouperParJour } from './journal-regroupement'

const entree = (id: string, created_at: string) => ({ id, created_at }) as EntreeJournal

describe('regrouperParJour', () => {
  it('regroupe par jour civil Europe/Paris, quel que soit le fuseau du processus', () => {
    // 23h30 UTC le 10 juin = 01h30 le 11 juin à Paris : même jour que 08h00 UTC le 11.
    const groupes = regrouperParJour([
      entree('a', '2026-06-11T08:00:00Z'),
      entree('b', '2026-06-10T23:30:00Z'),
      entree('c', '2026-06-10T10:00:00Z'),
    ])
    expect(groupes.map((g) => g.entrees.map((e) => e.id))).toEqual([['a', 'b'], ['c']])
    expect(groupes.map((g) => g.cle)).toEqual(['2026-06-11', '2026-06-10'])
  })
})
