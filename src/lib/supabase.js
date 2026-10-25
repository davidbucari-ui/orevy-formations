import { createClient } from '@supabase/supabase-js'

/* Projet Supabase « formations ». La clé publishable est faite pour être
   publiée dans le site : ce qu'elle permet est entièrement borné par les
   règles RLS (supabase/001_auth_rls.sql). Ne jamais mettre ici une clé
   secret ou service_role. */
const SUPABASE_URL = 'https://yyqppsvihdgmohnuocqr.supabase.co'
const SUPABASE_KEY = 'sb_publishable_gqoHyQO8sj2Xjt8cuspmWA_AwK4v9BZ'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Exécute une requête Supabase et renvoie ses données, ou lève l'erreur.
export async function q(requete) {
  const { data, error } = await requete
  if (error) throw error
  return data
}
