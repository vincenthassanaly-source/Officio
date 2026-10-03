import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { estModeleFiche, definitionModele, type ModeleFiche } from '@/lib/fiches'

// Résumé d'une fiche pour la liste du type d'entretien : sans le JSON complet.
export type FicheEntretienResume = {
  id: string
  patient_nom: string
  patient_prenom: string
  date_entretien: string
  updated_at: string
}

export type FicheEntretien = FicheEntretienResume & {
  type_entretien_id: string
  modele: ModeleFiche
  // Déjà validées par le modèle ; le type précis est restitué par l'appelant
  // (qui connaît le modèle de sa page).
  donnees: object
}

// Fiches d'un type d'entretien, la plus récemment modifiée d'abord. Filtrées
// par RLS (est_membre) : une fiche d'une autre officine n'apparaît jamais.
export const getFichesEntretien = cache(async (typeEntretienId: string): Promise<FicheEntretienResume[]> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('entretien_fiches')
    .select('id, patient_nom, patient_prenom, date_entretien, updated_at')
    .eq('type_entretien_id', typeEntretienId)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('getFichesEntretien', error)
    return []
  }

  return (data ?? []) as FicheEntretienResume[]
})

// Une fiche précise : null si elle n'existe pas, n'appartient pas à une
// officine dont l'utilisateur est membre (RLS) ou a un modèle inconnu.
export const getFicheEntretien = cache(async (id: string): Promise<FicheEntretien | null> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('entretien_fiches')
    .select('id, type_entretien_id, modele, patient_nom, patient_prenom, date_entretien, updated_at, donnees')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('getFicheEntretien', error)
    return null
  }
  if (!data || !estModeleFiche(data.modele)) return null

  return {
    id: data.id,
    type_entretien_id: data.type_entretien_id,
    modele: data.modele,
    patient_nom: data.patient_nom,
    patient_prenom: data.patient_prenom,
    date_entretien: data.date_entretien,
    updated_at: data.updated_at,
    donnees: definitionModele(data.modele).normaliser(data.donnees),
  }
})
