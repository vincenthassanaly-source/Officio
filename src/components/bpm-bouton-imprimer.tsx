'use client'

import { CLASSE_BOUTON_PRIMAIRE, Icone } from '@/components/entretien-ui'

// Déclenche la boîte d'impression du navigateur (« Enregistrer au format PDF »
// y est proposé aussi). Pas de bibliothèque de génération de PDF : même motif
// que le plan de posologie.
export function BoutonImprimerBpm() {
  return (
    <button type="button" onClick={() => window.print()} className={`${CLASSE_BOUTON_PRIMAIRE} min-h-12 print:hidden`}>
      <Icone nom="imprimante" taille={18} />
      Imprimer
    </button>
  )
}
