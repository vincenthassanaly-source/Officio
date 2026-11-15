// Primitives de squelette partagées par les loading.tsx (frontière Suspense
// de chaque route, voir src/app/(app)/*/loading.tsx).
//
// Composant serveur : aucun `use client` ici, un fallback de Suspense n'a
// aucun état ni interaction et n'a pas à embarquer de JS client. C'est aussi
// la raison pour laquelle ces primitives vivent dans ce fichier plutôt que
// dans les composants de liste correspondants (y compris VaccinsSquelette,
// ci-dessous : loading.tsx ne doit pas charger le JS de la liste).
//
// Les dimensions reprennent celles des vrais composants (hauteurs de cartes,
// arrondis, gouttières) : c'est tout l'intérêt d'un squelette de forme, il
// évite le saut visuel au moment où le contenu réel remplace les blocs.

const BLOC = 'bg-neutral-soft'

export function SqueletteTitre({ largeur = 'w-40' }: { largeur?: string }) {
  return <div className={`h-6 ${largeur} rounded-md ${BLOC}`} />
}

/** Rangée de filtres en pastilles (onglets de statut, filtres d'équipe…). */
export function SquelettePastilles({ nombre = 3 }: { nombre?: number }) {
  const largeurs = ['w-16', 'w-24', 'w-20', 'w-28', 'w-14']
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: nombre }, (_, i) => (
        <div key={i} className={`h-7 ${largeurs[i % largeurs.length]} rounded-full ${BLOC}`} />
      ))}
    </div>
  )
}

/** Champ de recherche ou de saisie pleine largeur. */
export function SqueletteChamp() {
  return <div className={`h-10 rounded-xl ${BLOC}`} />
}

/** Bandeau d'onglets segmenté (Cahier de liaison, agenda, huiles). */
export function SqueletteOnglets({ nombre = 2 }: { nombre?: number }) {
  return (
    <div className="flex gap-1 rounded-xl bg-track p-1">
      {Array.from({ length: nombre }, (_, i) => (
        <div key={i} className={`h-8 flex-1 rounded-lg ${BLOC}`} />
      ))}
    </div>
  )
}

/** Liste verticale de cartes, la forme la plus répandue de l'app. */
export function SqueletteCartes({ nombre = 4, hauteur = 'h-16' }: { nombre?: number; hauteur?: string }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: nombre }, (_, i) => (
        <div key={i} className={`${hauteur} rounded-[20px] ${BLOC}`} />
      ))}
    </div>
  )
}

/** Grille de tuiles carrées (tuiles de modules de l'accueil). */
export function SqueletteGrilleTuiles({ nombre = 8 }: { nombre?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {Array.from({ length: nombre }, (_, i) => (
        <div key={i} className={`h-[86px] rounded-[20px] ${BLOC}`} />
      ))}
    </div>
  )
}

/** Enveloppe commune : occupe la hauteur disponible et porte le pouls. */
export function SquelettePage({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-1 motion-safe:animate-pulse flex-col gap-3">
      <span className="sr-only">Chargement…</span>
      {children}
    </div>
  )
}

// Repli par défaut, conservé tel quel pour les routes dont la forme réelle
// est déjà proche d'une simple liste de cartes (carnet, fournisseurs, notes,
// suggestions, ruptures, CNO, documents, profil…). Les routes à fort écart de
// forme ont leur propre squelette : accueil, agenda, liaison, huiles
// essentielles, vaccins et chaussures (Lot 4 : grille de vignettes, pas une
// liste).
export function PageLoading() {
  return (
    <SquelettePage>
      <SqueletteTitre />
      <div className="h-24 rounded-2xl bg-neutral-soft" />
      <SqueletteCartes nombre={3} />
    </SquelettePage>
  )
}

function CarteVaccinSquelette() {
  return (
    <div className="flex flex-col rounded-[20px] bg-surface p-3.5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <div className="h-4 w-2/3 rounded-md bg-neutral-soft" />
        <div className="h-4 w-16 shrink-0 rounded-full bg-neutral-soft" />
      </div>
      <div className="mt-2.5 flex gap-1.5">
        <div className="h-[19px] w-20 rounded-full bg-neutral-soft" />
        <div className="h-[19px] w-24 rounded-full bg-neutral-soft" />
        <div className="h-[19px] w-14 rounded-full bg-neutral-soft" />
      </div>
    </div>
  )
}

// Skeleton dédié à /vaccins : reprend la forme réelle de la page (lien
// retour, titre text-2xl, pastilles de 44 px, champ, cartes repliées) pour
// éviter le saut visuel au chargement (voir src/app/(app)/vaccins/loading.tsx).
export function VaccinsSquelette() {
  return (
    <div role="status" aria-live="polite" className="flex flex-1 motion-safe:animate-pulse flex-col">
      <span className="sr-only">Chargement…</span>
      {/* Faux lien retour : mêmes dimensions que LienRetour. */}
      <div className="-ml-3 -mt-3 flex min-h-11 items-center px-3">
        <div className="h-4 w-16 rounded-md bg-neutral-soft" />
      </div>
      <div className="mb-4 h-8 w-28 rounded-md bg-neutral-soft" />
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex gap-1.5">
          <div className="h-11 w-20 rounded-full bg-neutral-soft" />
          <div className="h-11 w-28 rounded-full bg-neutral-soft" />
          <div className="h-11 w-32 rounded-full bg-neutral-soft" />
        </div>
        <div className="h-11 rounded-xl bg-neutral-soft" />
        <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <CarteVaccinSquelette key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
