import { getOfficineActive } from '@/lib/data/officine-active'
import { getTrodAngineFiches } from '@/lib/data/trod-angine'
import { getTrodAngineDocuments } from '@/lib/data/trod-angine-documents'
import { TrodAngineListe } from '@/components/trod-angine-liste'
import { getTrodAngineIdentite } from '@/lib/data/trod-angine-identite'
import { TrodAngineDocuments } from '@/components/trod-angine-documents'
import { TrodAngineIdentite } from '@/components/trod-angine-identite'
import { LienRetour } from '@/components/lien-retour'

// Fiches modifiées par plusieurs membres de l'équipe : même fraîcheur immédiate
// que les autres écritures collectives.
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export const metadata = { title: 'TROD angine' }

export default async function TrodAnginePage() {
  const officine = await getOfficineActive()
  if (!officine) return null

  const [fiches, documents, identite] = await Promise.all([
    getTrodAngineFiches(officine.officine_id),
    getTrodAngineDocuments(officine.officine_id),
    getTrodAngineIdentite(officine.officine_id),
  ])

  return (
    <>
      <LienRetour />
      <h1 className="mb-1 font-heading text-2xl text-ink">TROD angine</h1>
      <p className="mb-4 text-[13.5px] leading-snug text-muted">
        Prise en charge de l’angine à l’officine : le parcours calcule le score de Mac Isaac, remplit le compte rendu et le
        bon de prise en charge, à éditer, télécharger ou imprimer pour la facturation.
      </p>
      <TrodAngineIdentite key={JSON.stringify(identite)} identite={identite} />
      <TrodAngineListe fiches={fiches} />
      <TrodAngineDocuments documents={documents} />
    </>
  )
}
