import { SqueletteCartes, SqueletteOnglets, SquelettePage, SqueletteTitre } from '@/components/page-loading'

// Forme réelle de la fiche d'un type d'entretien : titre, onglets puis cartes
// (script, facturation, documents).
export default function Loading() {
  return (
    <SquelettePage>
      <SqueletteTitre largeur="w-56" />
      <SqueletteOnglets nombre={3} />
      <SqueletteCartes nombre={4} />
    </SquelettePage>
  )
}
