// Icône de l'app : aplat indigo plein cadre + « O » blanc centré, sans coins
// arrondis (l'OS applique son propre masque : cercle Android, squircle iOS).
// Rendu par satori (next/og) en JSX : aucun binaire à maintenir, toutes les
// tailles (favicon, apple-touch, manifest 192/512) viennent du même code.

// = --color-primary (oklch(52% 0.19 275)) converti en sRGB (voir manifest.ts).
const COULEUR_PRIMAIRE = '#4E56D3'

// Diamètre du « O » en part du côté : ~66 % de la zone ; en variante
// maskable, 66 % des 80 % centraux (zone de sécurité Android).
const PART_O = 0.66
const PART_O_MASKABLE = PART_O * 0.8
// Épaisseur du trait, en part du diamètre (graisse bold de la pastille « O »
// du header mobile, officine-switcher.tsx).
const PART_TRAIT = 0.17

export function AppIconMark({ size, maskable = false }: { size: number; maskable?: boolean }) {
  const diametre = Math.round(size * (maskable ? PART_O_MASKABLE : PART_O))
  const trait = Math.max(2, Math.round(diametre * PART_TRAIT))
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: COULEUR_PRIMAIRE,
      }}
    >
      <div
        style={{
          width: diametre,
          height: diametre,
          borderRadius: '50%',
          border: `${trait}px solid #FFFFFF`,
        }}
      />
    </div>
  )
}
