import { SqueletteCartes, SqueletteOnglets, SquelettePage, SqueletteTitre } from '@/components/page-loading'

// L'agenda est la route dont la forme s'éloignait le plus du PageLoading
// générique : navigation de période, deux bandeaux d'onglets (semaine/mois
// puis vue globale/planning), bande des jours de la semaine, puis les
// sections de la journée. Le squelette ne s'affiche qu'au premier chargement
// — les changements de semaine/mois sont préchargés (voir agenda.tsx) — mais
// c'est justement le moment où le saut visuel se voyait le plus.
export default function Loading() {
  return (
    <SquelettePage>
      <div className="flex items-center justify-between gap-2">
        <div className="h-8 w-8 rounded-lg bg-neutral-soft" />
        <SqueletteTitre largeur="w-36" />
        <div className="h-8 w-8 rounded-lg bg-neutral-soft" />
      </div>

      <SqueletteOnglets />
      <SqueletteOnglets />

      {/* Bande des 7 jours de la semaine : même grille que
          agenda-vue-globale.tsx (grid-cols-7 gap-1, rounded-2xl). L'ancienne
          rangée de 7 blocs fixes de 44 px + gap-2 (356 px) débordait de la
          zone de contenu à 360 px. */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="h-[68px] min-w-0 rounded-2xl bg-neutral-soft" />
        ))}
      </div>

      <div className="mt-1">
        <SqueletteCartes nombre={3} hauteur="h-20" />
      </div>
    </SquelettePage>
  )
}
