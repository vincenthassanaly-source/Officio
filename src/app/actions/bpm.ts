'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfil } from '@/lib/data/profils'
import { donneesBpmVides, normaliserDonnees } from '@/lib/bpm'

const CHEMIN_MODULE = '/entretiens-pharmaceutiques'

// Crée une fiche vide pour un type d'entretien BPM et renvoie son id : l'appelant
// ouvre ensuite la saisie. L'officine est celle du type (lue sous RLS), jamais
// une valeur envoyée par le client.
export async function creerFicheBpm(typeEntretienId: string): Promise<string> {
  const profil = await getCurrentProfil()
  if (!profil) throw new Error('Non connecté')

  const supabase = await createClient()

  const { data: type, error: erreurType } = await supabase
    .from('types_entretien')
    .select('officine_id, modele')
    .eq('id', typeEntretienId)
    .maybeSingle()

  if (erreurType) throw new Error(erreurType.message)
  if (!type || type.modele !== 'bpm') throw new Error('Ce type d’entretien n’a pas de fiche BPM.')

  const donnees = donneesBpmVides()

  const { data, error } = await supabase
    .from('bpm_fiches')
    .insert({
      officine_id: type.officine_id,
      type_entretien_id: typeEntretienId,
      date_entretien: donnees.entete.date,
      donnees,
      cree_par_id: profil.id,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`${CHEMIN_MODULE}/${typeEntretienId}`)
  return data.id
}

// Enregistrement automatique pendant la saisie. Les données du client sont
// toujours reconstruites par normaliserDonnees() : structure et longueurs
// imposées côté serveur. Pas de revalidatePath ici : appelée à chaque pause de
// frappe, elle relancerait le rendu de la page en cours de saisie.
export async function enregistrerFicheBpm(id: string, brut: unknown): Promise<{ enregistreLe: string }> {
  const profil = await getCurrentProfil()
  if (!profil) throw new Error('Non connecté')

  const donnees = normaliserDonnees(brut)
  const enregistreLe = new Date().toISOString()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('bpm_fiches')
    .update({
      patient_nom: donnees.entete.nom.trim(),
      patient_prenom: donnees.entete.prenom.trim(),
      date_entretien: donnees.entete.date,
      donnees,
      updated_at: enregistreLe,
    })
    .eq('id', id)
    .select('id')

  if (error) throw new Error(error.message)
  // RLS : une fiche d'une autre officine ne se met pas à jour, sans erreur.
  if (!data || data.length === 0) throw new Error('Fiche introuvable.')

  return { enregistreLe }
}

export async function supprimerFicheBpm(id: string, typeEntretienId: string) {
  const profil = await getCurrentProfil()
  if (!profil) throw new Error('Non connecté')

  const supabase = await createClient()
  const { error } = await supabase.from('bpm_fiches').delete().eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath(`${CHEMIN_MODULE}/${typeEntretienId}`)
}
