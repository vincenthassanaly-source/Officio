// Normalisation pour la recherche : accents (diacritiques) retirés, minuscules.
// Même logique que celle utilisée jusqu'ici dans /vaccins (vaccins-liste.tsx),
// extraite pour que toutes les listes cherchent « helene » comme « Hélène ».
export function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}
