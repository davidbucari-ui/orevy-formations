import { useEffect, useState } from 'react'
import { supabase, q } from './lib/supabase'
import { messageErreur } from './lib/format'
import Login from './pages/Login'
import Espace from './pages/participant/Espace'
import Admin from './pages/admin/Admin'

export default function App() {
  const [session, setSession] = useState(undefined)     // undefined = en cours de lecture
  const [participant, setParticipant] = useState(undefined)
  const [erreur, setErreur] = useState('')
  const [vueParticipant, setVueParticipant] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evt, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const email = session?.user?.email?.toLowerCase()

  useEffect(() => {
    if (!email) { setParticipant(undefined); return }
    setParticipant(undefined); setErreur('')
    // ilike ignore la casse ; on recompare ensuite à l'identique car « _ » est
    // un joker pour ilike et un admin voit toutes les fiches.
    q(supabase.from('participants').select('*').ilike('email', email))
      .then(rows => setParticipant(rows.find(p => p.email?.toLowerCase() === email) || null))
      .catch(err => setErreur(messageErreur(err)))
  }, [email])

  async function deconnexion() {
    await supabase.auth.signOut()
    setVueParticipant(false)
  }

  if (session === undefined) return <Chargement />
  if (!session) return <Login />
  if (erreur) return <Message titre="Connexion au serveur impossible" texte={erreur} onLogout={deconnexion} />
  if (participant === undefined) return <Chargement />
  if (participant === null) {
    return <Message titre="Aucun compte participant"
      texte={`L'adresse ${email} n'est associée à aucune inscription Orevy. Contactez votre formateur pour qu'il vous inscrive.`}
      onLogout={deconnexion} />
  }
  if (participant.is_admin && !vueParticipant) {
    return <Admin participant={participant} onLogout={deconnexion} onVueParticipant={() => setVueParticipant(true)} />
  }
  return <Espace participant={participant} onLogout={deconnexion}
    onRetourAdmin={participant.is_admin ? () => setVueParticipant(false) : null} />
}

function Chargement() {
  return <div className="plein-centre" style={{ color: 'var(--ink-muted)' }}>Chargement…</div>
}

function Message({ titre, texte, onLogout }) {
  return (
    <div className="plein-centre">
      <div className="card" style={{ padding: 32, maxWidth: 440, textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, marginBottom: 12 }}>{titre}</h1>
        <p style={{ color: 'var(--ink-soft)', marginBottom: 24 }}>{texte}</p>
        <button className="btn-secondary" onClick={onLogout}>Se déconnecter</button>
      </div>
    </div>
  )
}
