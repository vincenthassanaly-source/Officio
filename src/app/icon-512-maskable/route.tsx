import { ImageResponse } from 'next/og'
import { AppIconMark } from '@/lib/app-icon'

const size = { width: 512, height: 512 }

// Variante `purpose: 'maskable'` : motif réduit aux 80 % centraux, fond plein
// cadre que l'OS découpe (cercle, squircle…) sans liseré.
export async function GET() {
  return new ImageResponse(<AppIconMark size={size.width} maskable />, { ...size })
}
