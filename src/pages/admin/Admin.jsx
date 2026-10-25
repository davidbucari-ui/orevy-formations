import { useEffect, useState } from 'react'
import { supabase, q } from '../../lib/supabase'
import { messageErreur } from '../../lib/format'
import { Entete, Onglets, Alerte } from '../../components/ui'
import Formations from './Formations'
import FormationEditeur from './FormationEditeur'
import Participants from './Participants'
import Acces from './Acces'
import Suivi from './Suivi'

export default function Admin({ onLogout, onVueParticipant }) {
  const [onglet, setOnglet] = useState('suivi')
  const [donnees, setDonnees] = useState(null)   // { formations, participants, acces, structures, envois }
  const [message, setMessage] = useState(null)
  const [edition, setEdition] = useState(null)   // formation éditée, ou {} pour une nouvelle

  useEffect(() => { charger() }, [])

  async function charger() {
    try {
      const [formations, participants, acces, structures, envois] = await Promise.all([
        q(supabase.from('formations').select('*').order('ordre', { ascending: true, nullsFirst: false }).order('titre')),
        q(supabase.from('participants').select('*').order('nom')),
        q(supabase.from('acces_formations').select('*')),
        q(supabase.from('structures').select('*').order('nom')),
        q(supabase.from('envois').select('participant_id, type, statut, envoye_le').order('envoye_le', { ascending: false }).limit(1000)),
      ])
      setDonnees({ formations, participants, acces, structures, envois })
    } catch (err) { setMessage({ erreur: true, texte: messageErreur(err) }) }
  }

  if (edition) {
    return <FormationEditeur formation={edition} onClose={() => { setEdition(null); charger() }} />
  }

  const props = { ...(donnees || {}), recharger: charger, setMessage }

  return (
    <div>
      <Entete titre={<><span className="logo-petit">🎓</span> Orevy — Administration</>}>
        <button className="btn-secondary btn-petit" onClick={onVueParticipant}>👁 Espace participant</button>
        <button className="btn-secondary btn-petit" onClick={onLogout}>Déconnexion</button>
      </Entete>
      <main className="page">
        <Alerte message={message} />
        <Onglets actif={onglet} onChange={o => { setOnglet(o); setMessage(null) }} onglets={[
          ['suivi', 'Suivi'],
          ['formations', `Formations${donnees ? ` (${donnees.formations.length})` : ''}`],
          ['participants', `Participants${donnees ? ` (${donnees.participants.length})` : ''}`],
          ['acces', `Accès${donnees ? ` (${donnees.acces.length})` : ''}`],
        ]} />
        {!donnees ? <p className="vide">Chargement…</p>
          : onglet === 'suivi' ? <Suivi {...props} />
          : onglet === 'formations' ? <Formations {...props} onEditer={setEdition} />
          : onglet === 'participants' ? <Participants {...props} />
          : <Acces {...props} />}
      </main>
    </div>
  )
}
