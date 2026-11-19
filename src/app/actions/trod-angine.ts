'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'
import { enteteTrodAngine, normaliserTrodAngine, trodAngineVide } from '@/lib/trod-angine'

const CHEMIN_MODULE = '/trod-angine'

// Crée une fiche vide dans l'officine active et renvoie son id : l'appelant
// ouvre ensuite la saisie. L'officine vient de la session (jamais d'une valeur
// envoyée par le client) ; la RLS (est_membre) fait foi.
export async function creerTrodAngine(): Promise<string> {
  const profil = await getCurrentProfil()
  if (!profil) throw new Error('Non connecté')

  const officine = await getOfficineActive()
  if (!officine) throw new Error('Aucune officine active.')

  const donnees = trodAngineVide()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('trod_angine_fiches')
    .insert({
      officine_id: officine.officine_id,
      date_entretien: donnees.patient.date,
      donnees,
      cree_par_id: profil.id,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(CHEMIN_MODULE)
  return data.id
}

// Enregistrement automatique pendant la saisie. Les données du client sont
// toujours reconstruites par le validateur (structure et longueurs imposées
// côté serveur). Pas de revalidatePath : appelée à chaque pause de frappe, elle
// relancerait le rendu de la page en cours de saisie.
export async function enregistrerTrodAngine(id: string, brut: unknown): Promise<{ enregistreLe: string }> {
  const profil = await getCurrentProfil()
  if (!profil) throw new Error('Non connecté')

  const donnees = normaliserTrodAngine(brut)
  const entete = enteteTrodAngine(donnees)
  const enregistreLe = new Date().toISOString()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('trod_angine_fiches')
    .update({
      patient_nom: entete.nom.trim(),
      patient_prenom: entete.prenom.trim(),
      date_entretien: entete.date,
      donnees,
      updated_at: enregistreLe,
    })
    .eq('id', id)
    .select('id')

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('Fiche introuvable.')

  return { enregistreLe }
}

export async function supprimerTrodAngine(id: string) {
  const profil = await getCurrentProfil()
  if (!profil) throw new Error('Non connecté')

  const supabase = await createClient()
  const { error } = await supabase.from('trod_angine_fiches').delete().eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath(CHEMIN_MODULE)
}
