import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { normaliserTrodAngine, type DonneesTrodAngine } from '@/lib/trod-angine'

// Résumé d'une fiche pour la liste : sans le JSON complet.
export type TrodAngineResume = {
  id: string
  patient_nom: string
  patient_prenom: string
  date_entretien: string
  updated_at: string
}

export type TrodAngineFiche = TrodAngineResume & {
  officine_id: string
  donnees: DonneesTrodAngine
}

// Fiches de l'officine, la plus récemment modifiée d'abord. Filtrées par RLS
// (est_membre) : une fiche d'une autre officine n'apparaît jamais.
export const getTrodAngineFiches = cache(async (officineId: string): Promise<TrodAngineResume[]> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('trod_angine_fiches')
    .select('id, patient_nom, patient_prenom, date_entretien, updated_at')
    .eq('officine_id', officineId)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('getTrodAngineFiches', error)
    return []
  }

  return (data ?? []) as TrodAngineResume[]
})

// Une fiche précise : null si elle n'existe pas ou n'appartient pas à une
// officine dont l'utilisateur est membre (RLS).
export const getTrodAngineFiche = cache(async (id: string): Promise<TrodAngineFiche | null> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('trod_angine_fiches')
    .select('id, officine_id, patient_nom, patient_prenom, date_entretien, updated_at, donnees')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('getTrodAngineFiche', error)
    return null
  }
  if (!data) return null

  return {
    id: data.id,
    officine_id: data.officine_id,
    patient_nom: data.patient_nom,
    patient_prenom: data.patient_prenom,
    date_entretien: data.date_entretien,
    updated_at: data.updated_at,
    donnees: normaliserTrodAngine(data.donnees),
  }
})
