'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfil } from '@/lib/data/profils'
import { definitionModele, estModeleFiche } from '@/lib/fiches'

const CHEMIN_MODULE = '/entretiens-pharmaceutiques'

// Crée une fiche vide pour un type d'entretien à fiche (opioïdes…) et renvoie
// son id : l'appelant ouvre ensuite la saisie. L'officine et le modèle sont
// ceux du type (lus sous RLS), jamais des valeurs envoyées par le client.
export async function creerFicheEntretien(typeEntretienId: string): Promise<string> {
  const profil = await getCurrentProfil()
  if (!profil) throw new Error('Non connecté')

  const supabase = await createClient()

  const { data: type, error: erreurType } = await supabase
    .from('types_entretien')
    .select('officine_id, modele')
    .eq('id', typeEntretienId)
    .maybeSingle()

  if (erreurType) throw new Error(erreurType.message)
  if (!type || !estModeleFiche(type.modele)) throw new Error('Ce type d’entretien n’a pas de fiche.')

  const modele = definitionModele(type.modele)
  const donnees = modele.vides()
  const entete = modele.entete(donnees)

  const { data, error } = await supabase
    .from('entretien_fiches')
    .insert({
      officine_id: type.officine_id,
      type_entretien_id: typeEntretienId,
      modele: type.modele,
      date_entretien: entete.date,
      donnees,
      cree_par_id: profil.id,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`${CHEMIN_MODULE}/${typeEntretienId}`)
  return data.id
}

// Nouvel entretien pour un patient déjà vu : copie l'identité et la prescription
// d'une fiche existante, vide tout ce qui relève de l'entretien. Renvoie l'id
// de la nouvelle fiche.
export async function dupliquerFicheEntretien(ficheId: string): Promise<string> {
  const profil = await getCurrentProfil()
  if (!profil) throw new Error('Non connecté')

  const supabase = await createClient()

  const { data: source, error: erreurLecture } = await supabase
    .from('entretien_fiches')
    .select('officine_id, type_entretien_id, modele, donnees')
    .eq('id', ficheId)
    .maybeSingle()

  if (erreurLecture) throw new Error(erreurLecture.message)
  if (!source || !estModeleFiche(source.modele)) throw new Error('Fiche introuvable.')

  const modele = definitionModele(source.modele)
  const donnees = modele.dupliquer(modele.normaliser(source.donnees))
  const entete = modele.entete(donnees)

  const { data, error } = await supabase
    .from('entretien_fiches')
    .insert({
      officine_id: source.officine_id,
      type_entretien_id: source.type_entretien_id,
      modele: source.modele,
      patient_nom: entete.nom.trim(),
      patient_prenom: entete.prenom.trim(),
      date_entretien: entete.date,
      donnees,
      cree_par_id: profil.id,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`${CHEMIN_MODULE}/${source.type_entretien_id}`)
  return data.id
}

// Enregistrement automatique pendant la saisie. Les données du client sont
// toujours reconstruites par le validateur du modèle de la fiche (lu en base,
// pas fourni par le client) : structure et longueurs imposées côté serveur.
// Pas de revalidatePath : appelée à chaque pause de frappe, elle relancerait le
// rendu de la page en cours de saisie.
export async function enregistrerFicheEntretien(id: string, brut: unknown): Promise<{ enregistreLe: string }> {
  const profil = await getCurrentProfil()
  if (!profil) throw new Error('Non connecté')

  const supabase = await createClient()

  const { data: fiche, error: erreurLecture } = await supabase
    .from('entretien_fiches')
    .select('modele')
    .eq('id', id)
    .maybeSingle()

  if (erreurLecture) throw new Error(erreurLecture.message)
  if (!fiche || !estModeleFiche(fiche.modele)) throw new Error('Fiche introuvable.')

  const modele = definitionModele(fiche.modele)
  const donnees = modele.normaliser(brut)
  const entete = modele.entete(donnees)
  const enregistreLe = new Date().toISOString()

  const { data, error } = await supabase
    .from('entretien_fiches')
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

export async function supprimerFicheEntretien(id: string, typeEntretienId: string) {
  const profil = await getCurrentProfil()
  if (!profil) throw new Error('Non connecté')

  const supabase = await createClient()
  const { error } = await supabase.from('entretien_fiches').delete().eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath(`${CHEMIN_MODULE}/${typeEntretienId}`)
}
