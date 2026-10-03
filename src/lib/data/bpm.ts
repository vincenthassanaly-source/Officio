import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { normaliserDonnees, type DonneesBpm } from '@/lib/bpm'

// Résumé d'une fiche pour la liste du type d'entretien : sans le JSON complet.
export type FicheBpmResume = {
  id: string
  patient_nom: string
  patient_prenom: string
  date_entretien: string
  updated_at: string
}

export type FicheBpm = FicheBpmResume & {
  type_entretien_id: string
  donnees: DonneesBpm
}

// Fiches d'un type d'entretien BPM, la plus récemment modifiée d'abord.
// Filtrées par RLS (est_membre) : une fiche d'une autre officine n'apparaît jamais.
export const getFichesBpm = cache(async (typeEntretienId: string): Promise<FicheBpmResume[]> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('bpm_fiches')
    .select('id, patient_nom, patient_prenom, date_entretien, updated_at')
    .eq('type_entretien_id', typeEntretienId)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('getFichesBpm', error)
    return []
  }

  return (data ?? []) as FicheBpmResume[]
})

// Une fiche précise : null si elle n'existe pas ou n'appartient pas à une
// officine dont l'utilisateur est membre (RLS), sans distinguer les deux cas.
export const getFicheBpm = cache(async (id: string): Promise<FicheBpm | null> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('bpm_fiches')
    .select('id, type_entretien_id, patient_nom, patient_prenom, date_entretien, updated_at, donnees')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('getFicheBpm', error)
    return null
  }
  if (!data) return null

  return {
    id: data.id,
    type_entretien_id: data.type_entretien_id,
    patient_nom: data.patient_nom,
    patient_prenom: data.patient_prenom,
    date_entretien: data.date_entretien,
    updated_at: data.updated_at,
    donnees: normaliserDonnees(data.donnees),
  }
})
