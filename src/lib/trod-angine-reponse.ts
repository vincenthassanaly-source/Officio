import { getTrodAngineFiche, type TrodAngineFiche } from '@/lib/data/trod-angine'
import { getTrodAngineIdentite } from '@/lib/data/trod-angine-identite'
import { nomFichierPdf } from '@/lib/trod-angine-fichier'
import type { IdentiteOfficine } from '@/lib/trod-angine'

// Réponse PDF commune aux routes du TROD : fiche lue sous RLS (404 si elle
// appartient à une autre officine ou sans session), identité de l'officine,
// puis ouverture dans le navigateur ou, avec ?telecharger=1, téléchargement.
export async function reponsePdf(
  requete: Request,
  id: string,
  prefixe: string,
  generer: (fiche: TrodAngineFiche, identite: IdentiteOfficine) => Promise<Uint8Array | Response>
): Promise<Response> {
  const fiche = await getTrodAngineFiche(id)
  if (!fiche) return new Response('Fiche introuvable.', { status: 404 })

  const identite = await getTrodAngineIdentite(fiche.officine_id)
  const pdf = await generer(fiche, identite)
  if (pdf instanceof Response) return pdf

  const telecharger = new URL(requete.url).searchParams.get('telecharger') === '1'
  return new Response(Buffer.from(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${telecharger ? 'attachment' : 'inline'}; filename="${nomFichierPdf(prefixe, fiche.donnees)}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
