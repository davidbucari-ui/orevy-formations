import { useState } from 'react'
import { supabase, q } from '../../lib/supabase'
import { formatDate, messageErreur } from '../../lib/format'
import { Vide } from '../../components/ui'

export default function Acces({ formations, participants, acces, structures, recharger, setMessage }) {
  const [cible, setCible] = useState('')   // 'p:<id participant>' ou 's:<id structure>'
  const [choisies, setChoisies] = useState([])
  const [saving, setSaving] = useState(false)
  const [filtre, setFiltre] = useState('')

  const [genre, id] = cible ? cible.split(':') : []
  const membres = genre === 's' ? participants.filter(p => p.structure_id === id) : participants.filter(p => p.id === id)
  const nomCible = genre === 's' ? `${membres.length} participant${membres.length > 1 ? 's' : ''} de ${structures.find(x => x.id === id)?.nom}` : membres[0]?.nom
  const aDeja = (pid, fid) => acces.some(a => a.participant_id === pid && a.formation_id === fid)
  // Une formation est « déjà ouverte » quand tous les participants visés l'ont.
  const dejaOuverte = fid => membres.length > 0 && membres.every(p => aDeja(p.id, fid))

  async function ouvrir(e) {
    e.preventDefault()
    const lignes = membres.flatMap(p => choisies.filter(fid => !aDeja(p.id, fid)).map(fid => ({ participant_id: p.id, formation_id: fid })))
    if (!lignes.length) return
    setSaving(true)
    try {
      await q(supabase.from('acces_formations').insert(lignes))
      setMessage({ texte: `${choisies.length} formation${choisies.length > 1 ? 's' : ''} ouverte${choisies.length > 1 ? 's' : ''} à ${nomCible} (${lignes.length} accès créé${lignes.length > 1 ? 's' : ''}).` })
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
        <p style={{ fontWeight: 600, marginBottom: 14 }}>Ouvrir des formations à un participant ou à toute une structure</p>
        <div className="field">
          <label htmlFor="acces-cible">Pour</label>
          <select id="acces-cible" value={cible} onChange={e => { setCible(e.target.value); setChoisies([]) }} required>
            <option value="">— Choisir —</option>
            {structures.length > 0 && (
              <optgroup label="Structures (tous leurs participants)">
                {structures.map(s => <option key={s.id} value={`s:${s.id}`}>{s.nom} ({participants.filter(p => p.structure_id === s.id).length})</option>)}
              </optgroup>
            )}
            <optgroup label="Participants">
              {participants.map(p => <option key={p.id} value={`p:${p.id}`}>{p.nom} ({p.email})</option>)}
            </optgroup>
          </select>
          {genre === 's' && membres.length === 0 && <p className="aide">Cette structure n'a encore aucun participant.</p>}
        </div>
        {cible && membres.length > 0 && (
          <div className="field">
            <label>Formations</label>
            <div className="cases">
              {formations.map(f => {
                const fid = f.id, deja = dejaOuverte(fid)
                return (
                  <label key={fid} className={`case ${deja ? 'inactif' : ''}`}>
                    <input type="checkbox" disabled={deja} checked={deja || choisies.includes(fid)}
                      onChange={e => setChoisies(e.target.checked ? [...choisies, fid] : choisies.filter(x => x !== fid))} />
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
