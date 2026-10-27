// Accord en nombre à la française : 0 et 1 prennent le singulier, 2 et plus
// le pluriel. `pluralise` est à fournir quand le pluriel n'est pas simplement
// le singulier + « s » (« nouveau message » → « nouveaux messages »).
export function pluriel(n: number, singulier: string, pluralise = `${singulier}s`): string {
  return `${n} ${n >= 2 ? pluralise : singulier}`
}
