import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { IDENTITE_VIDE, normaliserIdentite, type IdentiteOfficine } from '@/lib/trod-angine'

// Identité de l'officine imprimée sur les documents du TROD (RLS : est_membre).
// Absente ou illisible : identité vide, les documents sortent sans tampon pré-rempli.
export const getTrodAngineIdentite = cache(async (officineId: string): Promise<IdentiteOfficine> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('trod_angine_officine')
    .select('nom_structure, adresse, numero_am')
    .eq('officine_id', officineId)
    .maybeSingle()

  if (error) {
    console.error('getTrodAngineIdentite', error)
    return IDENTITE_VIDE
  }

  return normaliserIdentite(data)
})
