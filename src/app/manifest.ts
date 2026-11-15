import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    lang: 'fr',
    scope: '/',
    orientation: 'portrait',
    name: 'Officio — Pharmacie Rome Village',
    short_name: 'Officio',
    description: "Le compagnon numérique de l'officine",
    start_url: '/',
    display: 'standalone',
    // = --color-bg (oklch(98% 0.004 260)) converti en sRGB.
    background_color: '#F7F8FB',
    // = --color-primary (oklch(52% 0.19 275)) converti en sRGB.
    theme_color: '#4E56D3',
    icons: [
      { src: '/icon-192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512-maskable', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
