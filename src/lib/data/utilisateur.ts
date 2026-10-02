import { cache } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { avecRetrySession } from '@/lib/supabase/avec-retry-session'

// Un seul auth.getUser() réseau par requête serveur, partagé par
// getMesAdhesions() et getCurrentProfil() (via React.cache). Avant, chacune
// faisait le sien : trois vérifications de session concurrentes avec celle du
// proxy, qui se percutaient sur la rotation du refresh token Supabase (usage
// unique) et déclenchaient les retries avec backoff d'avecRetrySession().
// Une erreur persistante lève (jamais de `null` masquant un échec technique) :
// voir scripts/RAPPORT-fix-session-bienvenue-2026-08-21.md.
export const getUtilisateur = cache(async (): Promise<User | null> => {
  const supabase = await createClient()
  return avecRetrySession(
    () => supabase.auth.getUser().then(({ data: { user }, error }) => ({ data: user, error })),
    { label: 'getUtilisateur: auth.getUser()', messageErreur: 'Impossible de vérifier la session utilisateur' }
  )
})
