import { useEffect, useState } from 'react'
import { supabase, q } from '../../lib/supabase'
import { formatDate, formatDuree, messageErreur } from '../../lib/format'
import { Entete, Onglets, Vide } from '../../components/ui'
import FormationVue from './FormationVue'

// Adresse de contact pour les demandes d'accès depuis le catalogue
const CONTACT_EMAIL = 'david.bucari@gmail.com'

export default function Espace({ participant, onLogout, onRetourAdmin }) {
  const [acces, setAcces] = useState(null)        // lignes acces_formations + .formation
  const [catalogue, setCatalogue] = useState([])
  const [onglet, setOnglet] = useState('mes')
  const [ouverte, setOuverte] = useState(null)    // ligne d'accès ouverte
  const [erreur, setErreur] = useState('')

  useEffect(() => { charger() }, [participant.id])

  async function charger() {
    try {
      const [a, f] = await Promise.all([
        q(supabase.from('acces_formations').select('*').eq('participant_id', participant.id)),
        q(supabase.from('formations').select('*').order('ordre', { ascending: true, nullsFirst: false }).order('titre')),
      ])
      setCatalogue(f)
      setAcces(a.map(x => ({ ...x, formation: f.find(fo => fo.id === x.formation_id) })).filter(x => x.formation))
    } catch (err) { setErreur(messageErreur(err)) }
  }

  if (ouverte) {
    return <FormationVue acces={ouverte} participant={participant}
      onClose={() => { setOuverte(null); charger() }} />
  }

  const vues = acces?.filter(a => a.vu).length || 0
  const parCategorie = catalogue.reduce((acc, f) => {
    const c = f.categorie || 'Autres formations'
    ;(acc[c] ||= []).push(f)
    return acc
  }, {})

  return (
    <div>
      <Entete titre={<><span className="logo-petit">🎓</span> Orevy Formations</>}>
        {onRetourAdmin && <button className="btn-secondary btn-petit" onClick={onRetourAdmin}>⚙ Administration</button>}
        <button className="btn-secondary btn-petit" onClick={onLogout}>Déconnexion</button>
      </Entete>
      <main className="page">
        <h1 style={{ fontSize: 30, marginBottom: 4 }}>Bonjour {participant.nom?.split(' ')[0] || ''} 👋</h1>
        {acces && <p style={{ color: 'var(--ink-muted)', marginBottom: 24 }}>
          {acces.length === 0 ? 'Aucune formation ne vous est encore ouverte.' : `${vues} formation${vues > 1 ? 's' : ''} commencée${vues > 1 ? 's' : ''} sur ${acces.length}`}
        </p>}
        {erreur && <div className="alerte alerte-erreur">{erreur}</div>}

        <Onglets actif={onglet} onChange={setOnglet} onglets={[['mes', 'Mes formations'], ['catalogue', 'Catalogue']]} />

        {acces === null ? <Vide>Chargement…</Vide> : onglet === 'mes' ? (
          acces.length === 0
            ? <Vide>Vos formations apparaîtront ici dès que votre formateur vous y aura inscrit.</Vide>
            : <div className="grille">
                {acces.map(a => (
                  <CarteFormation key={a.id} f={a.formation} onClick={() => setOuverte(a)}
                    badge={a.vu ? <span className="badge badge-seen">✓ Commencée</span> : <span className="badge badge-new">Nouveau</span>} />
                ))}
              </div>
        ) : (
          Object.entries(parCategorie).map(([cat, liste]) => (
            <section key={cat} style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 20, marginBottom: 12 }}>{cat}</h2>
              <div className="grille">
                {liste.map(f => {
                  const a = acces.find(x => x.formation_id === f.id)
                  return a
                    ? <CarteFormation key={f.id} f={f} onClick={() => setOuverte(a)} badge={<span className="badge badge-seen">Accès ouvert</span>} />
                    : <CarteFormation key={f.id} f={f} badge={
                        <a className="badge badge-pending" href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Demande d'accès — " + f.titre)}&body=${encodeURIComponent(`Bonjour,\n\nJe souhaite accéder à la formation « ${f.titre} ».\n\n${participant.nom || ''}`)}`}>
                          Demander l'accès ✉
                        </a>} />
                })}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  )
}

function CarteFormation({ f, badge, onClick }) {
  return (
    <div className={`card carte ${onClick ? 'cliquable' : ''}`} onClick={onClick}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {f.reference && <span className="badge badge-ref">{f.reference}</span>}
        {badge}
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{f.titre}</h3>
      {f.description && <p className="carte-desc">{f.description}</p>}
      <p className="meta">
        {f.date_session && <span>📅 {formatDate(f.date_session)}</span>}
        {f.duree_minutes && <span>⏱ {formatDuree(f.duree_minutes)}</span>}
      </p>
    </div>
  )
}
