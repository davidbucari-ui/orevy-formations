// Fonction « inviter » : envoie l'email de connexion aux participants choisis
// dans l'admin. Première fois : invitation Supabase Auth (crée le compte).
// Compte déjà créé : nouvel email de connexion (relance). Les emails partent
// par le SMTP et les modèles configurés dans Supabase Auth.
//
// Réservée aux administrateurs : l'appelant est vérifié par is_admin() avec
// son propre jeton. Chaque envoi est noté dans la table envois.

import { createClient } from 'npm:@supabase/supabase-js@2.117.3'

const SITE = 'https://davidbucari-ui.github.io/orevy-formations/'
const MAX_PAR_ENVOI = 50

const URL_PROJET = Deno.env.get('SUPABASE_URL')!
// Nouvelles clés (publishable / secret) si présentes, sinon les clés historiques.
function cle(nouvelle: string, historique: string): string {
  try {
    const cles = JSON.parse(Deno.env.get(nouvelle) ?? '{}')
    if (cles.default) return cles.default
  } catch { /* variable absente ou mal formée */ }
  return Deno.env.get(historique)!
}
const CLE_PUBLIQUE = cle('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY')
const CLE_SECRETE = cle('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY')

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const reponse = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const sansSession = { auth: { persistSession: false, autoRefreshToken: false } }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return reponse({ erreur: 'Méthode non autorisée.' }, 405)

  const jeton = req.headers.get('Authorization') ?? ''
  if (!jeton.startsWith('Bearer ')) return reponse({ erreur: 'Connexion requise.' }, 401)

  const appelant = createClient(URL_PROJET, CLE_PUBLIQUE, { ...sansSession, global: { headers: { Authorization: jeton } } })
  const { data: estAdmin, error: errAdmin } = await appelant.rpc('is_admin')
  if (errAdmin || estAdmin !== true) return reponse({ erreur: 'Réservé aux administrateurs.' }, 403)
  const { data: { user } } = await appelant.auth.getUser()

  let ids: string[]
  try {
    const corps = await req.json()
    ids = Array.isArray(corps?.participant_ids) ? corps.participant_ids.filter((x: unknown) => typeof x === 'string') : []
  } catch {
    return reponse({ erreur: 'Requête invalide.' }, 400)
  }
  if (!ids.length) return reponse({ erreur: 'Aucun participant choisi.' }, 400)
  if (ids.length > MAX_PAR_ENVOI) return reponse({ erreur: `${MAX_PAR_ENVOI} participants au plus par envoi.` }, 400)

  const admin = createClient(URL_PROJET, CLE_SECRETE, sansSession)
  const publique = createClient(URL_PROJET, CLE_PUBLIQUE, sansSession)
  const { data: participants, error: errP } = await admin.from('participants').select('id, nom, email').in('id', ids)
  if (errP) return reponse({ erreur: errP.message }, 500)

  const resultats = []
  for (const p of participants ?? []) {
    const email = String(p.email).trim().toLowerCase()
    let type: 'invitation' | 'relance' = 'invitation'
    let erreur: string | null = null

    const invitation = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: SITE, data: { nom: p.nom } })
    if (invitation.error) {
      const dejaInscrit = invitation.error.code === 'email_exists' || /already (been )?registered/i.test(invitation.error.message)
      if (dejaInscrit) {
        type = 'relance'
        const { error } = await publique.auth.signInWithOtp({ email, options: { emailRedirectTo: SITE, shouldCreateUser: false } })
        erreur = error?.message ?? null
      } else {
        erreur = invitation.error.message
      }
    }

    const statut = erreur ? 'echec' : 'envoye'
    await admin.from('envois').insert({ participant_id: p.id, email, type, statut, erreur, envoye_par: user?.email ?? null })
    resultats.push({ participant_id: p.id, nom: p.nom, email, type, statut, erreur })
  }

  return reponse({ resultats })
})
