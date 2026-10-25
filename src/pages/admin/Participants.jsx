import { useState } from 'react'
import { supabase, q } from '../../lib/supabase'
import { messageErreur } from '../../lib/format'
import { Vide } from '../../components/ui'

const VIDE = { nom: '', email: '', is_admin: false }

export default function Participants({ participants, acces, recharger, setMessage }) {
  const [edition, setEdition] = useState(null)   // null | 'nouveau' | participant
  const [form, setForm] = useState(VIDE)
  const [saving, setSaving] = useState(false)
  const [filtre, setFiltre] = useState('')

  function ouvrir(p) {
    setEdition(p)
    setForm(p === 'nouveau' ? VIDE : { nom: p.nom || '', email: p.email || '', is_admin: !!p.is_admin })
  }

  async function enregistrer(e) {
    e.preventDefault(); setSaving(true)
    const corps = { nom: form.nom.trim(), email: form.email.trim().toLowerCase(), is_admin: form.is_admin }
    try {
      if (edition === 'nouveau') await q(supabase.from('participants').insert(corps))
      else await q(supabase.from('participants').update(corps).eq('id', edition.id))
      setMessage({ texte: edition === 'nouveau'
        ? `${corps.nom} est inscrit(e). Ouvrez-lui des formations dans l'onglet Accès ; il ou elle se connecte avec ${corps.email}.`
        : 'Participant modifié.' })
      setEdition(null); recharger()
    } catch (err) {
      setMessage({ erreur: true, texte: err.code === '23505' ? 'Un participant existe déjà avec cet email.' : messageErreur(err) })
    }
    setSaving(false)
  }

  async function supprimer(p) {
    const n = acces.filter(a => a.participant_id === p.id).length
    if (!confirm(`Supprimer ${p.nom || p.email}${n ? ` et ses ${n} accès` : ''} ?`)) return
    try {
      if (n) await q(supabase.from('acces_formations').delete().eq('participant_id', p.id))
      await q(supabase.from('participants').delete().eq('id', p.id))
      setMessage({ texte: 'Participant supprimé.' }); recharger()
    } catch (err) { setMessage({ erreur: true, texte: messageErreur(err) }) }
  }

  const f = filtre.trim().toLowerCase()
  const visibles = participants.filter(p => !f || p.nom?.toLowerCase().includes(f) || p.email?.toLowerCase().includes(f))

  return (
    <div>
      {edition ? (
        <form className="card formulaire" onSubmit={enregistrer}>
          <div className="grille-champs">
            <div className="field"><label>Nom *</label><input type="text" required value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} /></div>
            <div className="field"><label>Email *</label><input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <label className="case large">
              <input type="checkbox" checked={form.is_admin} onChange={e => setForm({ ...form, is_admin: e.target.checked })} />
              Administrateur (accès complet à cette interface)
            </label>
          </div>
          <div className="actions">
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
            <button type="button" className="btn-secondary" onClick={() => setEdition(null)}>Annuler</button>
          </div>
        </form>
      ) : (
        <div className="actions" style={{ marginBottom: 16 }}>
          <input type="text" placeholder="Rechercher un nom ou un email…" value={filtre} onChange={e => setFiltre(e.target.value)} style={{ maxWidth: 320 }} />
          <div style={{ flex: 1 }} />
          <button className="btn-primary" onClick={() => ouvrir('nouveau')}>+ Nouveau participant</button>
        </div>
      )}
      {visibles.length === 0 ? <Vide>Aucun participant.</Vide> : (
        <div className="card tableau-defile">
          <table className="tableau">
            <thead><tr><th>Nom</th><th>Email</th><th>Formations</th><th></th></tr></thead>
            <tbody>
              {visibles.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500, color: 'var(--ink)' }}>{p.nom} {p.is_admin && <span className="badge badge-new">Admin</span>}</td>
                  <td>{p.email}</td>
                  <td>{acces.filter(a => a.participant_id === p.id).length}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn-lien" onClick={() => ouvrir(p)}>Modifier</button>
                    <button className="btn-lien danger" onClick={() => supprimer(p)}>Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
