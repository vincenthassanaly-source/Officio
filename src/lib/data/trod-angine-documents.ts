import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type TrodAngineDocument = {
  id: string
  nom: string
  chemin_stockage: string
  taille_octets: number | null
  created_at: string
}

// Documents de l'officine, dans l'ordre d'ajout. Filtrés par RLS (est_membre).
export const getTrodAngineDocuments = cache(async (officineId: string): Promise<TrodAngineDocument[]> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('trod_angine_documents')
    .select('id, nom, chemin_stockage, taille_octets, created_at')
    .eq('officine_id', officineId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('getTrodAngineDocuments', error)
    return []
  }

  return (data ?? []) as TrodAngineDocument[]
})
