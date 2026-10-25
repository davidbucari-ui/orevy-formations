import { useState } from 'react'
import { supabase, q } from '../../lib/supabase'
import { formatDate, messageErreur } from '../../lib/format'
import { Vide } from '../../components/ui'

export default function Acces({ formations, participants, acces, recharger, setMessage }) {
  const [participantId, setParticipantId] = useState('')
  const [choisies, setChoisies] = useState([])
  const [saving, setSaving] = useState(false)
  const [filtre, setFiltre] = useState('')

  const dejaOuvertes = new Set(acces.filter(a => String(a.participant_id) === participantId).map(a => String(a.formation_id)))

  async function ouvrir(e) {
    e.preventDefault()
    if (!choisies.length) return
    setSaving(true)
    const p = participants.find(x => String(x.id) === participantId)
    try {
      await q(supabase.from('acces_formations').insert(choisies.map(fid => ({ participant_id: p.id, formation_id: formations.find(f => String(f.id) === fid).id }))))
      setMessage({ texte: `${choisies.length} formation${choisies.length > 1 ? 's' : ''} ouverte${choisies.length > 1 ? 's' : ''} à ${p.nom}.` })
      setChoisies([]); recharger()
    } catch (err) { setMessage({ erreur: true, texte: messageErreur(err) }) }
    setSaving(false)
  }

  async function retirer(a) {
    if (!confirm('Retirer cet accès ?')) return
    try { await q(supabase.from('acces_formations').delete().eq('id', a.id)); recharger() }
    catch (err) { setMessage({ erreur: true, texte: messageErreur(err) }) }
  }

  const nomP = id => participants.find(p => p.id === id)
  const titreF = id => formations.find(f => f.id === id)?.titre || '(formation supprimée)'
  const fl = filtre.trim().toLowerCase()
  const lignes = acces
    .map(a => ({ ...a, p: nomP(a.participant_id), titre: titreF(a.formation_id) }))
    .filter(a => !fl || a.p?.nom?.toLowerCase().includes(fl) || a.p?.email?.toLowerCase().includes(fl) || a.titre.toLowerCase().includes(fl))
    .sort((a, b) => (a.p?.nom || '').localeCompare(b.p?.nom || '') || a.titre.localeCompare(b.titre))

  return (
    <div>
      <form className="card formulaire" onSubmit={ouvrir}>
        <p style={{ fontWeight: 600, marginBottom: 14 }}>Ouvrir des formations à un participant</p>
        <div className="field">
          <label>Participant</label>
          <select value={participantId} onChange={e => { setParticipantId(e.target.value); setChoisies([]) }} required>
            <option value="">— Choisir —</option>
            {participants.map(p => <option key={p.id} value={String(p.id)}>{p.nom} ({p.email})</option>)}
          </select>
        </div>
        {participantId && (
          <div className="field">
            <label>Formations</label>
            <div className="cases">
              {formations.map(f => {
                const id = String(f.id), deja = dejaOuvertes.has(id)
                return (
                  <label key={id} className={`case ${deja ? 'inactif' : ''}`}>
                    <input type="checkbox" disabled={deja} checked={deja || choisies.includes(id)}
                      onChange={e => setChoisies(e.target.checked ? [...choisies, id] : choisies.filter(x => x !== id))} />
                    {f.reference && <span className="badge badge-ref">{f.reference}</span>} {f.titre} {deja && <em>(déjà ouverte)</em>}
                  </label>
                )
              })}
            </div>
          </div>
        )}
        <button type="submit" className="btn-primary" disabled={saving || !choisies.length}>{saving ? 'Enregistrement…' : 'Ouvrir l\'accès'}</button>
      </form>

      <div className="actions" style={{ margin: '24px 0 12px' }}>
        <input type="text" placeholder="Filtrer par participant ou formation…" value={filtre} onChange={e => setFiltre(e.target.value)} style={{ maxWidth: 320 }} />
      </div>
      {lignes.length === 0 ? <Vide>Aucun accès.</Vide> : (
        <div className="card tableau-defile">
          <table className="tableau">
            <thead><tr><th>Participant</th><th>Formation</th><th>Statut</th><th></th></tr></thead>
            <tbody>
              {lignes.map(a => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 500, color: 'var(--ink)' }}>{a.p?.nom || '(participant supprimé)'}</td>
                  <td>{a.titre}</td>
                  <td>{a.vu ? <span className="badge badge-seen">Ouverte{a.date_visionnage ? ` le ${formatDate(a.date_visionnage, 'short')}` : ''}</span> : <span className="badge badge-pending">Pas encore ouverte</span>}</td>
                  <td style={{ textAlign: 'right' }}><button className="btn-lien danger" onClick={() => retirer(a)}>Retirer</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
