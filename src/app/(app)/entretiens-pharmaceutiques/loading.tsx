import { SqueletteCartes, SqueletteOnglets, SquelettePage, SqueletteTitre } from '@/components/page-loading'

// Forme réelle de la page : titre, deux onglets (Types, Journal) puis la liste
// de cartes des types d'entretien.
export default function Loading() {
  return (
    <SquelettePage>
      <SqueletteTitre largeur="w-64" />
      <SqueletteOnglets nombre={2} />
      <SqueletteCartes nombre={4} />
    </SquelettePage>
  )
}
