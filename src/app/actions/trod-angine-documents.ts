'use server'

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'
import {
  DOCUMENTS_OFFICIELS,
  LONGUEUR_MAX_NOM,
  TAILLE_MAX_OCTETS,
  TYPE_PDF,
  nomDepuisFichier,
  nomStockageSur,
} from '@/lib/trod-angine-documents'

const BUCKET = 'trod-angine'
const CHEMIN_MODULE = '/trod-angine'

// Dépose un PDF dans le bucket puis enregistre sa ligne ; si la ligne échoue,
// l'objet est retiré (même séquence que ajouterDocument). L'officine vient de la
// session, jamais du client ; la RLS (est_membre) fait foi.
async function deposer(
  officineId: string,
  profilId: string,
  nom: string,
  contenu: Blob | ArrayBuffer | Uint8Array,
  taille: number
) {
  const supabase = await createClient()
  const chemin = `${officineId}/${crypto.randomUUID()}-${nomStockageSur(nom)}`

  const { error: erreurUpload } = await supabase.storage.from(BUCKET).upload(chemin, contenu, { contentType: TYPE_PDF })
  if (erreurUpload) throw new Error(erreurUpload.message)

  const { error: erreurInsert } = await supabase.from('trod_angine_documents').insert({
    officine_id: officineId,
    nom,
    chemin_stockage: chemin,
    taille_octets: taille,
    ajoute_par_id: profilId,
  })

  if (erreurInsert) {
    await supabase.storage.from(BUCKET).remove([chemin])
    throw new Error(erreurInsert.message)
  }
}

export async function ajouterTrodAngineDocument(formData: FormData) {
  const fichier = formData.get('fichier')
  const nomSaisi = String(formData.get('nom') ?? '').trim()

  if (!(fichier instanceof File) || fichier.size === 0) throw new Error('Merci de choisir un fichier.')
  if (fichier.type !== TYPE_PDF) throw new Error('Seuls les fichiers PDF sont acceptés.')
  if (fichier.size > TAILLE_MAX_OCTETS) throw new Error('Fichier trop volumineux (4 Mo maximum).')

  const nom = (nomSaisi || nomDepuisFichier(fichier.name)).slice(0, LONGUEUR_MAX_NOM)
  if (!nom) throw new Error('Merci de donner un nom au document.')

  const profil = await getCurrentProfil()
  const officine = await getOfficineActive()
  if (!profil || !officine) throw new Error('Non connecté')

  await deposer(officine.officine_id, profil.id, nom, fichier, fichier.size)
  revalidatePath(CHEMIN_MODULE)
}

// Ajoute à l'officine les PDF officiels fournis avec l'application. Réservé à une
// section vide : évite les doublons et ne ressuscite pas un document supprimé.
export async function chargerDocumentsOfficiels() {
  const profil = await getCurrentProfil()
  const officine = await getOfficineActive()
  if (!profil || !officine) throw new Error('Non connecté')

  const supabase = await createClient()
  const { count, error } = await supabase
    .from('trod_angine_documents')
    .select('id', { count: 'exact', head: true })
    .eq('officine_id', officine.officine_id)
  if (error) throw new Error(error.message)
  if ((count ?? 0) > 0) throw new Error('La section contient déjà des documents.')

  for (const doc of DOCUMENTS_OFFICIELS) {
    const octets = await readFile(path.join(process.cwd(), 'assets', 'trod-angine', 'documents', doc.fichier))
    await deposer(officine.officine_id, profil.id, doc.nom, new Uint8Array(octets), octets.byteLength)
  }

  revalidatePath(CHEMIN_MODULE)
}

export async function obtenirUrlTrodAngineDocument(id: string): Promise<string> {
  const supabase = await createClient()

  // Le chemin est relu sous RLS : un id d'une autre officine ne renvoie rien.
  const { data: ligne } = await supabase
    .from('trod_angine_documents')
    .select('chemin_stockage')
    .eq('id', id)
    .maybeSingle()
  if (!ligne) throw new Error('Document introuvable.')

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(ligne.chemin_stockage, 60 * 5)
  if (error || !data) throw new Error("Impossible d'ouvrir ce document.")

  return data.signedUrl
}

export async function supprimerTrodAngineDocument(id: string) {
  const profil = await getCurrentProfil()
  if (!profil) throw new Error('Non connecté')

  const supabase = await createClient()
  const { data: ligne } = await supabase
    .from('trod_angine_documents')
    .select('chemin_stockage')
    .eq('id', id)
    .maybeSingle()
  if (!ligne) throw new Error('Document introuvable.')

  const { error } = await supabase.from('trod_angine_documents').delete().eq('id', id)
  if (error) throw new Error(error.message)

  // Objet retiré après la ligne : au pire un fichier orphelin invisible.
  await supabase.storage.from(BUCKET).remove([ligne.chemin_stockage])

  revalidatePath(CHEMIN_MODULE)
}
