export function toISODate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getWeekDates(reference: Date): Date[] {
  const jour = reference.getDay() // 0 = dimanche
  const decalageLundi = jour === 0 ? -6 : 1 - jour
  const lundi = new Date(reference)
  lundi.setHours(0, 0, 0, 0)
  lundi.setDate(reference.getDate() + decalageLundi)

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lundi)
    d.setDate(lundi.getDate() + i)
    return d
  })
}

const JOURS_COURTS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const JOURS_LONGS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

export function formatJourCourt(d: Date): string {
  return JOURS_COURTS[d.getDay()]
}

export function formatDateLongue(dateISO: string): string {
  const [annee, mois, jour] = dateISO.split('-').map(Number)
  const d = new Date(annee, mois - 1, jour)
  return `${JOURS_LONGS[d.getDay()]} ${jour} ${MOIS_LONG[mois - 1]} ${annee}`
}

export function formatHeure(heure: string): string {
  return heure.slice(0, 5)
}

const MOIS_COURT = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
]

const MOIS_LONG = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

export function formatDateCourte(dateISO: string): string {
  const [annee, mois, jour] = dateISO.split('-').map(Number)
  return `${jour} ${MOIS_COURT[mois - 1]} ${annee}`
}

// Grille complète (semaines entières, lundi en premier) couvrant le mois de
// `reference`, avec les jours des mois voisins nécessaires pour remplir la
// première et la dernière semaine.
export function getMonthGridDates(reference: Date): Date[] {
  const premierJourMois = new Date(reference.getFullYear(), reference.getMonth(), 1)
  const decalageDebut = premierJourMois.getDay() === 0 ? 6 : premierJourMois.getDay() - 1
  const debutGrille = new Date(premierJourMois)
  debutGrille.setDate(premierJourMois.getDate() - decalageDebut)

  const dernierJourMois = new Date(reference.getFullYear(), reference.getMonth() + 1, 0)
  const decalageFin = dernierJourMois.getDay() === 0 ? 0 : 7 - dernierJourMois.getDay()
  const finGrille = new Date(dernierJourMois)
  finGrille.setDate(dernierJourMois.getDate() + decalageFin)

  const dates: Date[] = []
  const curseur = new Date(debutGrille)
  while (curseur <= finGrille) {
    dates.push(new Date(curseur))
    curseur.setDate(curseur.getDate() + 1)
  }
  return dates
}

export function formatMoisAnnee(reference: Date): string {
  const mois = MOIS_LONG[reference.getMonth()]
  return `${mois.charAt(0).toUpperCase()}${mois.slice(1)} ${reference.getFullYear()}`
}

// Fuseau fixé : ces libellés sont calculés au rendu serveur (Vercel, en UTC)
// puis au client (Europe/Paris) ; sans fuseau explicite, l'heure et le
// "Aujourd'hui / Hier" divergeaient à l'hydratation.
const FUSEAU = 'Europe/Paris'
const FORMAT_CLE_JOUR = new Intl.DateTimeFormat('en-CA', { timeZone: FUSEAU, year: 'numeric', month: '2-digit', day: '2-digit' })
const FORMAT_JOUR_MOIS = new Intl.DateTimeFormat('fr-FR', { timeZone: FUSEAU, day: '2-digit', month: '2-digit' })
const FORMAT_HEURE = new Intl.DateTimeFormat('fr-FR', { timeZone: FUSEAU, hour: '2-digit', minute: '2-digit' })

// Clé de jour AAAA-MM-JJ calculée en fuseau Paris.
export function cleJourParis(date: Date): string {
  return FORMAT_CLE_JOUR.format(date)
}

function cleHierParis(maintenant: Date): string {
  const [a, m, j] = cleJourParis(maintenant).split('-').map(Number)
  return toISODate(new Date(a, m - 1, j - 1))
}

// Horodatage relatif ("Aujourd'hui · 14:32", "Hier · 09:10", "05/08 · 11:00")
// — extrait de fil-de-messages.tsx pour être réutilisé ailleurs (ex. le
// centre de notifications) sans dupliquer la logique.
export function formatDateRelative(iso: string): string {
  const date = new Date(iso)
  const maintenant = new Date()
  const heure = FORMAT_HEURE.format(date)
  const cle = cleJourParis(date)

  if (cle === cleJourParis(maintenant)) return `Aujourd'hui · ${heure}`
  if (cle === cleHierParis(maintenant)) return `Hier · ${heure}`
  return `${FORMAT_JOUR_MOIS.format(date)} · ${heure}`
}

// Étiquette de séparateur de jour pour un fil de messages ("Aujourd'hui",
// "Hier", ou "Mercredi 6 août" pour les jours plus anciens).
export function formatSeparateurJour(iso: string): string {
  const date = new Date(iso)
  const maintenant = new Date()
  const cle = cleJourParis(date)

  if (cle === cleJourParis(maintenant)) return "Aujourd'hui"
  if (cle === cleHierParis(maintenant)) return 'Hier'

  const [annee, mois, jour] = cle.split('-').map(Number)
  const jourSemaine = new Date(annee, mois - 1, jour).getDay()
  const memeAnnee = annee === Number(cleJourParis(maintenant).slice(0, 4))
  return `${JOURS_LONGS[jourSemaine]} ${jour} ${MOIS_LONG[mois - 1]}${memeAnnee ? '' : ' ' + annee}`
}

export function formatPeriodeSemaine(weekDates: Date[]): string {
  const debut = weekDates[0]
  const fin = weekDates[6]

  const memeMois = debut.getMonth() === fin.getMonth() && debut.getFullYear() === fin.getFullYear()

  if (memeMois) {
    return `${debut.getDate()} – ${fin.getDate()} ${MOIS_LONG[fin.getMonth()]} ${fin.getFullYear()}`
  }

  return `${debut.getDate()} ${MOIS_COURT[debut.getMonth()]} – ${fin.getDate()} ${MOIS_COURT[fin.getMonth()]} ${fin.getFullYear()}`
}
