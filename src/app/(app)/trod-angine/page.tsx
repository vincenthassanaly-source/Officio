import { getOfficineActive } from '@/lib/data/officine-active'
import { getTrodAngineFiches } from '@/lib/data/trod-angine'
import { TrodAngineListe } from '@/components/trod-angine-liste'
import { LienRetour } from '@/components/lien-retour'

// Fiches modifiées par plusieurs membres de l'équipe : même fraîcheur immédiate
// que les autres écritures collectives.
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export const metadata = { title: 'TROD angine' }

export default async function TrodAnginePage() {
  const officine = await getOfficineActive()
  if (!officine) return null

  const fiches = await getTrodAngineFiches(officine.officine_id)

  return (
    <>
      <LienRetour />
      <h1 className="mb-1 font-heading text-2xl text-ink">TROD angine</h1>
      <p className="mb-4 text-[13.5px] leading-snug text-muted">
        Prise en charge de l’angine à l’officine : le parcours remplit le compte rendu et le bon de prise en charge de
        l’Assurance Maladie.
      </p>
      <TrodAngineListe fiches={fiches} />
    </>
  )
}
