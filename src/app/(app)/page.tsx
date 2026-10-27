import { getCurrentProfil } from '@/lib/data/profils'
import { getOfficineActive } from '@/lib/data/officine-active'
import { getMessages, type MessageAvecDetails } from '@/lib/data/messages'
import { getTaches, type Tache } from '@/lib/data/taches'
import { getRendezVous, type RendezVous } from '@/lib/data/rendez-vous'
import { getHuilesEssentielles, type HuileEssentielle } from '@/lib/data/huiles-essentielles'
import { getContacts, type Contact } from '@/lib/data/contacts'
import { getCnoPatients, type PatientCno } from '@/lib/data/cno'
import { getSuggestions, type SuggestionAvecAuteur } from '@/lib/data/suggestions'
import { getRupturesStock, type RuptureStock } from '@/lib/data/ruptures-stock'
import { getNombrePromessesActives } from '@/lib/data/promesses-patients'
import { getProduitsARecommander, type ProduitARecommander } from '@/lib/data/produits-a-recommander'
import { getNotes, type NoteAvecAuteur } from '@/lib/data/notes'
import { getJournalActivite, type PageJournalActivite } from '@/lib/data/journal-activite'
import { getEquipe, type MembreEquipe } from '@/lib/data/equipe'
import { getCouleursMembres, type CouleurAvatar } from '@/lib/data/couleurs-membres'
import { signalerErreurClient } from '@/app/actions/erreurs-client'
import { getWeekDates, toISODate } from '@/lib/dates'
import { pluriel } from '@/lib/pluriel'
import { AccueilDashboard } from '@/components/accueil-dashboard'
import { TuileModule } from '@/components/tuile-module'
import { RechercheGlobale } from '@/components/recherche-globale'
import { FabCreationRapide } from '@/components/fab-creation-rapide'
import {
  IconLiaison,
  IconAgenda,
  IconCarnet,
  IconHuiles,
  IconFournisseurs,
  IconChaussures,
  IconCno,
  IconRegularisation,
  IconVaccin,
  IconSuggestions,
  IconRupturesStock,
  IconPromesses,
  IconNote,
  IconActivite,
  IconPosologie,
  IconEntretien,
} from '@/components/nav-icons'
import { getTypesEntretien, type TypeEntretien } from '@/lib/data/entretiens'

// Sur mobile (PWA installée), fermer complètement l'app (swipe dans les
// apps récentes) puis la rouvrir peut afficher un instantané mis en cache
// par le navigateur/l'OS Android (cache disque ou restauration de
// processus WebAPK) plutôt que le résultat d'une requête fraîche : le
// nombre de messages non lus du Cahier de liaison pouvait alors être
// obsolète. Ces deux directives empêchent Next.js de mettre cette page en
// cache côté serveur ; voir aussi EcouteurRepriseApp (composant client
// monté dans layout.tsx) pour le cas de la restauration bfcache côté
// navigateur.
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const MAX_MESSAGES_APERCU = 3

// Extrait la valeur d'un résultat de Promise.allSettled, ou une valeur de
// repli neutre en cas d'échec — journalise l'échec (console + client_errors)
// sans jamais le faire remonter, pour dégrader une carte plutôt que planter
// toute la page.
function valeur<T>(nomFonction: string, resultat: PromiseSettledResult<T>, repli: T): T {
  if (resultat.status === 'fulfilled') return resultat.value

  console.error(nomFonction, resultat.reason)
  const message = resultat.reason instanceof Error ? resultat.reason.message : String(resultat.reason)
  void signalerErreurClient({ message, contexte: nomFonction }).catch(() => {})

  return repli
}

export const metadata = { title: 'Accueil' }

export default async function AccueilPage() {
  const [officine, profil] = await Promise.all([getOfficineActive(), getCurrentProfil()])
  if (!officine) return null

  const aujourdhui = new Date()
  const aujourdhuiIso = toISODate(aujourdhui)
  const weekDates = getWeekDates(aujourdhui)

  // Promise.allSettled plutôt que Promise.all : les 15 requêtes de l'accueil
  // tournent en parallèle juste après l'ouverture de l'app, moment où une
  // course sur le rafraîchissement du refresh token Supabase (usage unique)
  // peut faire échouer l'une d'elles (même classe de bug que
  // getCurrentProfil()/getMesAdhesions(), voir src/lib/data/profils.ts). Un
  // seul échec ne doit dégrader que la carte concernée, jamais planter toute
  // la page via l'error boundary — voir la fonction `valeur` ci-dessus.
  const [
    messagesR,
    tachesR,
    rendezVousR,
    huilesR,
    contactsR,
    patientsCnoR,
    suggestionsR,
    equipeR,
    couleursR,
    rupturesStockR,
    promessesR,
    produitsARecommanderR,
    notesR,
    journalActiviteR,
    typesEntretienR,
  ] = await Promise.allSettled([
    getMessages(officine.officine_id),
    getTaches(officine.officine_id),
    getRendezVous(officine.officine_id, toISODate(weekDates[0]), toISODate(weekDates[6])),
    getHuilesEssentielles(officine.officine_id),
    getContacts(officine.officine_id),
    getCnoPatients(officine.officine_id),
    getSuggestions(officine.officine_id),
    getEquipe(officine.officine_id),
    getCouleursMembres(officine.officine_id),
    getRupturesStock(officine.officine_id),
    getNombrePromessesActives(officine.officine_id),
    getProduitsARecommander(officine.officine_id),
    getNotes(officine.officine_id),
    getJournalActivite(officine.officine_id),
    getTypesEntretien(officine.officine_id),
  ])

  const messages = valeur('getMessages', messagesR, [] as MessageAvecDetails[])
  const taches = valeur('getTaches', tachesR, [] as Tache[])
  const rendezVous = valeur('getRendezVous', rendezVousR, [] as RendezVous[])
  const huiles = valeur('getHuilesEssentielles', huilesR, [] as HuileEssentielle[])
  const contacts = valeur('getContacts', contactsR, [] as Contact[])
  const patientsCno = valeur('getCnoPatients', patientsCnoR, [] as PatientCno[])
  const suggestions = valeur('getSuggestions', suggestionsR, [] as SuggestionAvecAuteur[])
  const equipe = valeur('getEquipe', equipeR, [] as MembreEquipe[])
  const couleurs = valeur('getCouleursMembres', couleursR, new Map<string, CouleurAvatar>())
  const rupturesStock = valeur('getRupturesStock', rupturesStockR, [] as RuptureStock[])
  const promessesEnAttente = valeur('getNombrePromessesActives', promessesR, 0)
  const produitsARecommander = valeur('getProduitsARecommander', produitsARecommanderR, [] as ProduitARecommander[])
  const notes = valeur('getNotes', notesR, [] as NoteAvecAuteur[])
  const journalActivite = valeur('getJournalActivite', journalActiviteR, {
    entrees: [],
    curseurSuivant: null,
  } as PageJournalActivite)
  const typesEntretien = valeur('getTypesEntretien', typesEntretienR, [] as TypeEntretien[])

  // Un chiffre "—" plutôt qu'un décompte trompeur (ex: 0) sur les cartes dont
  // la donnée a échoué à charger — voir `valeur` ci-dessus.
  const messagesOk = messagesR.status === 'fulfilled'
  const rendezVousOk = rendezVousR.status === 'fulfilled'
  const contactsOk = contactsR.status === 'fulfilled'
  const huilesOk = huilesR.status === 'fulfilled'
  const patientsCnoOk = patientsCnoR.status === 'fulfilled'
  const suggestionsOk = suggestionsR.status === 'fulfilled'
  const rupturesOk = rupturesStockR.status === 'fulfilled' && produitsARecommanderR.status === 'fulfilled'
  const promessesOk = promessesR.status === 'fulfilled'
  const notesOk = notesR.status === 'fulfilled'
  const journalActiviteOk = journalActiviteR.status === 'fulfilled'
  const typesEntretienOk = typesEntretienR.status === 'fulfilled'
  const typesEntretienActifs = typesEntretien.filter((t) => t.actif).length

  const huilesACommander = huiles.filter((h) => h.statut === 'a_commander').length
  const suggestionsNonTraitees = suggestions.filter((s) => !s.fait).length
  // Sur les 30 dernières entrées du journal (toutes activités confondues),
  // celles du jour même — cohérent avec la comparaison "Aujourd'hui" déjà
  // utilisée pour les séparateurs de jour (voir formatSeparateurJour).
  const activitesAujourdhui = journalActivite.entrees.filter(
    (e) => new Date(e.created_at).toDateString() === aujourdhui.toDateString()
  ).length

  const messagesNonLusTous = messages.filter((m) => !m.lecteurs.some((l) => l.profil_id === profil?.id))
  const nonLus = messagesNonLusTous.length
  const messagesNonLusApercu = messagesNonLusTous.slice(0, MAX_MESSAGES_APERCU)

  // Priorité aux tâches en retard ou dues aujourd'hui, puis échéances futures,
  // puis sans échéance — pour que la vue "Aujourd'hui" mette en avant ce qui
  // presse plutôt que l'ordre de création.
  const tachesAFaireTous = taches
    .filter((t) => t.statut === 'a_faire')
    .sort((a, b) => {
      const rangA = a.echeance ? (a.echeance <= aujourdhuiIso ? 0 : 1) : 2
      const rangB = b.echeance ? (b.echeance <= aujourdhuiIso ? 0 : 1) : 2
      if (rangA !== rangB) return rangA - rangB
      if (a.echeance && b.echeance) return a.echeance.localeCompare(b.echeance)
      return 0
    })
  const tachesDuJour = tachesAFaireTous

  const prenom = profil?.nom_complet.split(' ')[0] ?? ''
  const dateLabel = aujourdhui.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  // Salutation selon l'heure plutôt qu'un « Bonjour » fixe toute la journée
  // — un même titre, mais qui reflète le moment réel où l'équipe consulte
  // l'app (souvent en fin de journée après le comptoir).
  const salutation = aujourdhui.getHours() < 18 ? 'Bonjour' : 'Bonsoir'

  return (
    <>
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-ink">
          {salutation}, {prenom}
        </h1>
        <p className="mt-0.5 text-[12.5px] capitalize text-muted">{dateLabel}</p>
      </div>

      <div className="mt-4">
        <RechercheGlobale />
      </div>

      <AccueilDashboard
        tachesDuJour={tachesDuJour}
        totalTachesAFaire={tachesAFaireTous.length}
        messagesNonLusApercu={messagesNonLusApercu}
        totalMessagesNonLus={nonLus}
        equipe={equipe}
        couleurs={couleurs}
        profilActuelId={profil?.id ?? ''}
      />

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <TuileModule
          href="/liaison"
          Icone={IconLiaison}
          couleur="bg-primary-soft text-primary"
          titre="Cahier de liaison"
          detail={pluriel(nonLus, 'nouveau message', 'nouveaux messages')}
          indisponible={!messagesOk}
        />
        <TuileModule
          href="/agenda"
          Icone={IconAgenda}
          couleur="bg-green-soft text-green"
          titre="Agenda"
          detail={`${rendezVous.length} rendez-vous`}
          indisponible={!rendezVousOk}
        />
        <TuileModule
          href="/carnet"
          Icone={IconCarnet}
          couleur="bg-primary-soft text-primary"
          titre="Carnet d’adresses"
          detail={pluriel(contacts.length, 'contact')}
          indisponible={!contactsOk}
        />
        <TuileModule
          href="/huiles-essentielles"
          Icone={IconHuiles}
          couleur="bg-purple-soft text-purple"
          titre="Huiles essentielles"
          detail={`${huilesACommander} à commander`}
          indisponible={!huilesOk}
        />
        <TuileModule href="/fournisseurs" Icone={IconFournisseurs} couleur="bg-accent-soft text-accent" titre="Fournisseurs" />
        <TuileModule
          href="/chaussures"
          Icone={IconChaussures}
          couleur="bg-brun-soft text-brun"
          titre="Chaussures orthopédiques"
        />
        <TuileModule
          href="/suivi-cno"
          Icone={IconCno}
          couleur="bg-green-soft text-green"
          titre="Suivi CNO"
          detail={pluriel(patientsCno.length, 'patient suivi', 'patients suivis')}
          indisponible={!patientsCnoOk}
        />
        <TuileModule
          href="/regularisations"
          Icone={IconRegularisation}
          couleur="bg-accent-soft text-accent"
          titre="Régularisation ordonnances"
        />
        <TuileModule
          href="/suggestions"
          Icone={IconSuggestions}
          couleur="bg-primary-soft text-primary-light"
          titre="Suggestions"
          detail={pluriel(suggestionsNonTraitees, 'proposition')}
          indisponible={!suggestionsOk}
        />
        <TuileModule href="/vaccins" Icone={IconVaccin} couleur="bg-green-soft text-green" titre="Vaccins" />
        <TuileModule
          href="/ruptures-stock"
          Icone={IconRupturesStock}
          couleur="bg-rec-soft text-rec"
          titre="Ruptures de stock"
          detail={`${rupturesStock.length + produitsARecommander.length} en cours`}
          indisponible={!rupturesOk}
        />
        <TuileModule
          href="/promesses-patients"
          Icone={IconPromesses}
          couleur="bg-teal-soft text-teal"
          titre="Promesses patients"
          detail={`${promessesEnAttente} en attente`}
          indisponible={!promessesOk}
        />
        <TuileModule
          href="/notes"
          Icone={IconNote}
          couleur="bg-primary-soft text-primary-dark"
          titre="Notes"
          detail={pluriel(notes.length, 'note')}
          indisponible={!notesOk}
        />
        <TuileModule
          href="/activite"
          Icone={IconActivite}
          couleur="bg-neutral-soft text-neutral-text"
          titre="Activité"
          detail={pluriel(activitesAujourdhui, 'activité récente', 'activités récentes')}
          indisponible={!journalActiviteOk}
        />
        <TuileModule
          href="/plan-posologie"
          Icone={IconPosologie}
          couleur="bg-accent-soft text-accent"
          titre="Plan de posologie"
        />
        <TuileModule
          href="/entretiens-pharmaceutiques"
          Icone={IconEntretien}
          couleur="bg-purple-soft text-purple"
          titre="Entretiens pharmaceutiques"
          detail={pluriel(typesEntretienActifs, 'type actif', 'types actifs')}
          indisponible={!typesEntretienOk}
        />
      </div>

      <FabCreationRapide equipe={equipe} profilActuelId={profil?.id ?? ''} />
    </>
  )
}
