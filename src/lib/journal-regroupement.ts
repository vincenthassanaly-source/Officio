import type { EntreeJournal } from '@/lib/data/journal-activite'
import { cleJourParis, formatSeparateurJour } from '@/lib/dates'

export type GroupeJour = { cle: string; label: string; entrees: EntreeJournal[] }

// Regroupe une liste déjà triée created_at desc par jour civil (fuseau
// Europe/Paris, comme les étiquettes), en réutilisant formatSeparateurJour
// (Aujourd'hui / Hier / date) pour l'étiquette de chaque groupe.
export function regrouperParJour(entrees: EntreeJournal[]): GroupeJour[] {
  const groupes: GroupeJour[] = []
  for (const entree of entrees) {
    const cle = cleJourParis(new Date(entree.created_at))
    const dernier = groupes[groupes.length - 1]
    if (dernier && dernier.cle === cle) {
      dernier.entrees.push(entree)
    } else {
      groupes.push({ cle, label: formatSeparateurJour(entree.created_at), entrees: [entree] })
    }
  }
  return groupes
}
