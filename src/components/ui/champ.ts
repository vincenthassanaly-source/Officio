// Classes d'un champ de saisie (`<input>`, `<textarea>`, `<select>`). Source
// unique : contour `champ-bord` (WCAG 1.4.11) et 16 px pour éviter le zoom
// automatique d'iOS au focus — voir DESIGN.md, Inputs / Fields.
export const CHAMP_CLASS =
  'rounded-xl border border-champ-bord bg-bg px-3 py-2.5 text-[16px] text-ink focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary'
