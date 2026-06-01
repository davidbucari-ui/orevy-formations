import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'OREVY-'
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Admin({ onLogout }) {
  const [tab, setTab] = useState('formations')
  const [formations, setFormations] = useState([])
  const [participants, setParticipants] = useState([])
  const [acces, setAcces] = useState([])
  const [loading, setLoading] = useState(true)

  // Formulaires
  const [showFormForm, setShowFormForm] = useState(false)
  const [showPartForm, setShowPartForm] = useState(false)
  const [showAccesForm, setShowAccesForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const [formData, setFormData] = useState({ titre: '', description: '', date_session: '', duree_minutes: '', lien_video: '', categorie: '' })
  const [partData, setPartData] = useState({ nom: '', email: '', code_acces: '' })
  const [accesData, setAccesData] = useState({ participant_id: '', formation_id: '' })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [f, p, a] = await Promise.all([
      supabase.from('formations').select('*').order('date_session', { ascending: false }),
      supabase.from('participants').select('*').order('nom'),
      supabase.from('acces_formations').select('*, formations(titre), participants(nom,email)').order('created_at', { ascending: false }),
    ])
    if (f.data) setFormations(f.data)
    if (p.data) setParticipants(p.data)
    if (a.data) setAcces(a.data)
    setLoading(false)
  }

  function flash(m) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  async function saveFormation(e) {
    e.preventDefault(); setSaving(true)
    const { error } = await supabase.from('formations').insert([{ ...formData, duree_minutes: parseInt(formData.duree_minutes) || null }])
    if (!error) { flash('Formation ajoutée !'); setShowFormForm(false); setFormData({ titre: '', description: '', date_session: '', duree_minutes: '', lien_video: '', categorie: '' }); loadAll() }
    setSaving(false)
  }

  async function saveParticipant(e) {
    e.preventDefault(); setSaving(true)
    const code = partData.code_acces || generateCode()
    const { error } = await supabase.from('participants').insert([{ ...partData, code_acces: code, email: partData.email.toLowerCase() }])
    if (!error) { flash(`Participant ajouté ! Code : ${code}`); setShowPartForm(false); setPartData({ nom: '', email: '', code_acces: '' }); loadAll() }
    else flash('Erreur : ' + error.message)
    setSaving(false)
  }

  async function saveAcces(e) {
    e.preventDefault(); setSaving(true)
    const { error } = await supabase.from('acces_formations').insert([accesData])
    if (!error) { flash('Accès attribué !'); setShowAccesForm(false); setAccesData({ participant_id: '', formation_id: '' }); loadAll() }
    else flash('Erreur : ' + error.message)
    setSaving(false)
  }

  async function deleteFormation(id) {
    if (!confirm('Supprimer cette formation ?')) return
    await supabase.from('formations').delete().eq('id', id)
    loadAll()
  }

  async function deleteParticipant(id) {
    if (!confirm('Supprimer ce participant et tous ses accès ?')) return
    await supabase.from('participants').delete().eq('id', id)
    loadAll()
  }

  async function deleteAcces(id) {
    await supabase.from('acces_formations').delete().eq('id', id)
    loadAll()
  }

  const tabStyle = (t) => ({
    padding: '10px 20px', fontSize: 14, fontWeight: 500,
    background: tab === t ? 'var(--accent)' : 'transparent',
    color: tab === t ? 'white' : 'var(--ink-soft)',
    borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
  })

  const th = { padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }
  const td = { padding: '12px 14px', fontSize: 14, color: 'var(--ink-soft)', borderBottom: '1px solid var(--border)' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>

      {/* Header */}
      <div style={{ background: 'var(--warm-white)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', height: 64 }}>
          <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: 20, flex: 1 }}>Orevy <span style={{ fontSize: 13, color: 'var(--accent)', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>Admin</span></span>
          <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={onLogout}>Déconnexion</button>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>

        {/* Flash message */}
        {msg && (
          <div style={{ background: 'var(--green-light)', border: '1px solid var(--green)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: 20, fontSize: 14, color: 'var(--green)' }}>
            ✓ {msg}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28, background: 'var(--warm-white)', padding: 6, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', width: 'fit-content' }}>
          <button style={tabStyle('formations')} onClick={() => setTab('formations')}>Formations ({formations.length})</button>
          <button style={tabStyle('participants')} onClick={() => setTab('participants')}>Participants ({participants.length})</button>
          <button style={tabStyle('acces')} onClick={() => setTab('acces')}>Accès ({acces.length})</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--ink-muted)' }}>Chargement…</div>
        ) : (
          <>
            {/* ===== FORMATIONS ===== */}
            {tab === 'formations' && (
              <div className="fade-up">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                  <button className="btn-primary" onClick={() => setShowFormForm(!showFormForm)}>
                    {showFormForm ? '✕ Annuler' : '+ Nouvelle formation'}
                  </button>
                </div>

                {showFormForm && (
                  <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                    <form onSubmit={saveFormation}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div className="field" style={{ gridColumn: '1/-1' }}>
                          <label>Titre *</label>
                          <input type="text" required value={formData.titre} onChange={e => setFormData({...formData, titre: e.target.value})} placeholder="Ex: Accueil du jeune enfant — module 2" />
                        </div>
                        <div className="field" style={{ gridColumn: '1/-1' }}>
                          <label>Description</label>
                          <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Résumé de la session" />
                        </div>
                        <div className="field">
                          <label>Date de la session</label>
                          <input type="text" value={formData.date_session} onChange={e => setFormData({...formData, date_session: e.target.value})} placeholder="2025-06-15" />
                        </div>
                        <div className="field">
                          <label>Durée (minutes)</label>
                          <input type="text" value={formData.duree_minutes} onChange={e => setFormData({...formData, duree_minutes: e.target.value})} placeholder="90" />
                        </div>
                        <div className="field" style={{ gridColumn: '1/-1' }}>
                          <label>Lien vidéo Teams / SharePoint *</label>
                          <input type="text" required value={formData.lien_video} onChange={e => setFormData({...formData, lien_video: e.target.value})} placeholder="https://..." />
                        </div>
                        <div className="field">
                          <label>Catégorie</label>
                          <input type="text" value={formData.categorie} onChange={e => setFormData({...formData, categorie: e.target.value})} placeholder="Ex: Pédagogie, Santé…" />
                        </div>
                      </div>
                      <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer la formation'}</button>
                    </form>
                  </div>
                )}

                <div className="card" style={{ overflow: 'hidden' }}>
                  {formations.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ink-muted)' }}>Aucune formation</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr>
                        <th style={th}>Titre</th>
                        <th style={th}>Date</th>
                        <th style={th}>Durée</th>
                        <th style={th}>Catégorie</th>
                        <th style={th}></th>
                      </tr></thead>
                      <tbody>
                        {formations.map(f => (
                          <tr key={f.id}>
                            <td style={{...td, color: 'var(--ink)', fontWeight: 500}}>{f.titre}</td>
                            <td style={td}>{formatDate(f.date_session)}</td>
                            <td style={td}>{f.duree_minutes ? `${f.duree_minutes} min` : '—'}</td>
                            <td style={td}>{f.categorie || '—'}</td>
                            <td style={{...td, textAlign: 'right'}}>
                              <button onClick={() => deleteFormation(f.id)} style={{ fontSize: 13, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Supprimer</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* ===== PARTICIPANTS ===== */}
            {tab === 'participants' && (
              <div className="fade-up">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                  <button className="btn-primary" onClick={() => setShowPartForm(!showPartForm)}>
                    {showPartForm ? '✕ Annuler' : '+ Nouveau participant'}
                  </button>
                </div>

                {showPartForm && (
                  <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                    <form onSubmit={saveParticipant}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div className="field">
                          <label>Nom complet *</label>
                          <input type="text" required value={partData.nom} onChange={e => setPartData({...partData, nom: e.target.value})} placeholder="Marie Dupont" />
                        </div>
                        <div className="field">
                          <label>Email *</label>
                          <input type="email" required value={partData.email} onChange={e => setPartData({...partData, email: e.target.value})} placeholder="marie@exemple.fr" />
                        </div>
                        <div className="field">
                          <label>Code d'accès (laissez vide = auto-généré)</label>
                          <input type="text" value={partData.code_acces} onChange={e => setPartData({...partData, code_acces: e.target.value.toUpperCase()})} placeholder="OREVY-XXXXXX" style={{ textTransform: 'uppercase' }} />
                        </div>
                      </div>
                      <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Créer le participant'}</button>
                    </form>
                  </div>
                )}

                <div className="card" style={{ overflow: 'hidden' }}>
                  {participants.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-muted)' }}>Aucun participant</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr>
                        <th style={th}>Nom</th>
                        <th style={th}>Email</th>
                        <th style={th}>Code d'accès</th>
                        <th style={th}></th>
                      </tr></thead>
                      <tbody>
                        {participants.map(p => (
                          <tr key={p.id}>
                            <td style={{...td, color: 'var(--ink)', fontWeight: 500}}>{p.nom}</td>
                            <td style={td}>{p.email}</td>
                            <td style={td}>
                              <code style={{ background: 'var(--accent-light)', color: 'var(--accent-dark)', padding: '2px 8px', borderRadius: 4, fontSize: 13, fontWeight: 600, letterSpacing: '0.05em' }}>
                                {p.code_acces}
                              </code>
                            </td>
                            <td style={{...td, textAlign: 'right'}}>
                              <button onClick={() => deleteParticipant(p.id)} style={{ fontSize: 13, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Supprimer</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* ===== ACCÈS ===== */}
            {tab === 'acces' && (
              <div className="fade-up">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                  <button className="btn-primary" onClick={() => setShowAccesForm(!showAccesForm)}>
                    {showAccesForm ? '✕ Annuler' : '+ Attribuer un accès'}
                  </button>
                </div>

                {showAccesForm && (
                  <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                    <p style={{ fontSize: 14, color: 'var(--ink-muted)', marginBottom: 16 }}>Donner l'accès à une formation à un participant.</p>
                    <form onSubmit={saveAcces}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div className="field">
                          <label>Participant *</label>
                          <select required value={accesData.participant_id} onChange={e => setAccesData({...accesData, participant_id: e.target.value})}>
                            <option value="">Choisir…</option>
                            {participants.map(p => <option key={p.id} value={p.id}>{p.nom} — {p.email}</option>)}
                          </select>
                        </div>
                        <div className="field">
                          <label>Formation *</label>
                          <select required value={accesData.formation_id} onChange={e => setAccesData({...accesData, formation_id: e.target.value})}>
                            <option value="">Choisir…</option>
                            {formations.map(f => <option key={f.id} value={f.id}>{f.titre}</option>)}
                          </select>
                        </div>
                      </div>
                      <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Attribuer l\'accès'}</button>
                    </form>
                  </div>
                )}

                <div className="card" style={{ overflow: 'hidden' }}>
                  {acces.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-muted)' }}>Aucun accès configuré</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr>
                        <th style={th}>Participant</th>
                        <th style={th}>Formation</th>
                        <th style={th}>Statut</th>
                        <th style={th}>Visionné le</th>
                        <th style={th}></th>
                      </tr></thead>
                      <tbody>
                        {acces.map(a => (
                          <tr key={a.id}>
                            <td style={{...td, color: 'var(--ink)', fontWeight: 500}}>{a.participants?.nom}<br/><span style={{fontSize:12,fontWeight:400,color:'var(--ink-muted)'}}>{a.participants?.email}</span></td>
                            <td style={td}>{a.formations?.titre}</td>
                            <td style={td}>
                              <span className={`badge ${a.vu ? 'badge-seen' : 'badge-new'}`}>{a.vu ? 'Vu' : 'Non vu'}</span>
                            </td>
                            <td style={td}>{a.date_visionnage ? formatDate(a.date_visionnage) : '—'}</td>
                            <td style={{...td, textAlign: 'right'}}>
                              <button onClick={() => deleteAcces(a.id)} style={{ fontSize: 13, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Retirer</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
