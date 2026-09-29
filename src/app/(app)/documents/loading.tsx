import {
  SqueletteCartes,
  SquelettePage,
  SquelettePastilles,
  SqueletteTitre,
} from '@/components/page-loading'

// Forme réelle de la page : titre, rangée de filtres par catégorie (pastilles
// de 44 px de haut, bouton d'ajout rond à droite), puis la liste de cartes.
export default function Loading() {
  return (
    <SquelettePage>
      <SqueletteTitre largeur="w-36" />
      <div className="flex items-center gap-2">
        <div className="flex-1 overflow-hidden">
          <SquelettePastilles nombre={4} />
        </div>
        <div className="h-8 w-8 shrink-0 rounded-full bg-neutral-soft" />
      </div>
      <SqueletteCartes nombre={4} hauteur="h-[72px]" />
    </SquelettePage>
  )
}
