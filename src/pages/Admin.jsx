import { useState, useEffect } from 'react'

const BASE = 'https://orevy-proxy.david-bucari.workers.dev/rest/v1'
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdva2Z4ZWpvZmZ6dHR6dmRrb2xsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDMxNjQ0NCwiZXhwIjoyMDk1ODkyNDQ0fQ.X1BYaEYHHDNTh6I0MXTX0ZjOSQjTAeBiAuMgJH1YSV0'
const H = { 'Content-Type': 'application/json', 'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Prefer': 'return=representation' }

async function dbGet(table, params = '') {
  const r = await fetch(`${BASE}/${table}${params}`, { headers: H })
  return r.ok ? await r.json() : []
}
async function dbPost(table, body) {
  const r = await fetch(`${BASE}/${table}`, { method: 'POST', headers: H, body: JSON.stringify(body) })
  return { ok: r.ok, data: await r.json() }
}
async function dbPatch(table, filter, body) {
  const r = await fetch(`${BASE}/${table}?${filter}`, { method: 'PATCH', headers: H, body: JSON.stringify(body) })
  return r.ok
}
async function dbDelete(table, filter) {
  const r = await fetch(`${BASE}/${table}?${filter}`, { method: 'DELETE', headers: H })
  return r.ok
}

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
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [showFormForm, setShowFormForm] = useState(false)
  const [showPartForm, setShowPartForm] = useState(false)
  const [showAccesForm, setShowAccesForm] = useState(false)
  const [selectedFormation, setSelectedFormation] = useState(null)
  const [chapitres, setChapitres] = useState([])
  const [ressources, setRessources] = useState([])
  const [showChapForm, setShowChapForm] = useState(false)
  const [showResForm, setShowResForm] = useState(false)
  const [chapData, setChapData] = useState({ titre: '', description: '', lien: '', ordre: 0 })
  const [resData, setResData] = useState({ titre: '', lien: '', type_fichier: 'PDF' })
  const [formData, setFormData] = useState({ titre: '', description: '', date_session: '', duree_minutes: '', lien_video: '', categorie: '' })
  const [partData, setPartData] = useState({ nom: '', email: '', code_acces: '' })
  const [accesData, setAccesData] = useState({ participant_id: '', formation_id: '' })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [f, p, a] = await Promise.all([
      dbGet('formations', '?order=date_session.desc'),
      dbGet('participants', '?order=nom.asc'),
      dbGet('acces_formations', ''),
    ])
    setFormations(f); setParticipants(p)
    // Enrichir les accès avec les noms
    const enriched = a.map(ac => ({
      ...ac,
      formations: f.find(x => x.id === ac.formation_id) || {},
      participants: p.find(x => x.id === ac.participant_id) || {},
    }))
    setAcces(enriched); setLoading(false)
  }

  async function loadChapRes(fid) {
    const [ch, res] = await Promise.all([
      dbGet('chapitres', `?formation_id=eq.${fid}&order=ordre.asc`),
      dbGet('ressources', `?formation_id=eq.${fid}&order=created_at.asc`),
    ])
    setChapitres(ch); setRessources(res)
  }

  function flash(m) { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  async function saveFormation(e) {
    e.preventDefault(); setSaving(true)
    const body = { ...formData, duree_minutes: parseInt(formData.duree_minutes) || null }
    if (!body.date_session) delete body.date_session
    const { ok } = await dbPost('formations', body)
    if (ok) { flash('Formation ajoutée !'); setShowFormForm(false); setFormData({ titre: '', description: '', date_session: '', duree_minutes: '', lien_video: '', categorie: '' }); loadAll() }
    else flash('Erreur lors de l\'enregistrement')
    setSaving(false)
  }

  async function saveParticipant(e) {
    e.preventDefault(); setSaving(true)
    const code = partData.code_acces || generateCode()
    const { ok, data } = await dbPost('participants', { ...partData, code_acces: code, email: partData.email.toLowerCase() })
    if (ok) { flash(`Participant ajouté ! Code : ${code}`); setShowPartForm(false); setPartData({ nom: '', email: '', code_acces: '' }); loadAll() }
    else flash('Erreur : ' + JSON.stringify(data))
    setSaving(false)
  }

  async function saveAcces(e) {
    e.preventDefault(); setSaving(true)
    const { ok } = await dbPost('acces_formations', accesData)
    if (ok) { flash('Accès attribué !'); setShowAccesForm(false); setAccesData({ participant_id: '', formation_id: '' }); loadAll() }
    else flash('Erreur')
    setSaving(false)
  }

  async function saveChapitre(e) {
    e.preventDefault(); setSaving(true)
    const { ok } = await dbPost('chapitres', { ...chapData, formation_id: selectedFormation.id, ordre: parseInt(chapData.ordre) || 0 })
    if (ok) { flash('Séquence ajoutée !'); setShowChapForm(false); setChapData({ titre: '', description: '', lien: '', ordre: 0 }); loadChapRes(selectedFormation.id) }
    setSaving(false)
  }

  async function saveRessource(e) {
    e.preventDefault(); setSaving(true)
    const { ok } = await dbPost('ressources', { ...resData, formation_id: selectedFormation.id })
    if (ok) { flash('Ressource ajoutée !'); setShowResForm(false); setResData({ titre: '', lien: '', type_fichier: 'PDF' }); loadChapRes(selectedFormation.id) }
    setSaving(false)
  }

  async function deleteFormation(id) { if (!confirm('Supprimer ?')) return; await dbDelete('formations', `id=eq.${id}`); loadAll() }
  async function deleteParticipant(id) { if (!confirm('Supprimer ?')) return; await dbDelete('participants', `id=eq.${id}`); loadAll() }
  async function deleteAcces(id) { await dbDelete('acces_formations', `id=eq.${id}`); loadAll() }
  async function deleteChapitre(id) { await dbDelete('chapitres', `id=eq.${id}`); loadChapRes(selectedFormation.id) }
  async function deleteRessource(id) { await dbDelete('ressources', `id=eq.${id}`); loadChapRes(selectedFormation.id) }

  const tabStyle = (t) => ({ padding: '10px 20px', fontSize: 14, fontWeight: 500, background: tab === t ? 'var(--accent)' : 'transparent', color: tab === t ? 'white' : 'var(--ink-soft)', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer' })
  const th = { padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }
  const td = { padding: '12px 14px', fontSize: 14, color: 'var(--ink-soft)', borderBottom: '1px solid var(--border)' }

  if (selectedFormation) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
        <div style={{ background: 'var(--warm-white)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', height: 64, gap: 16 }}>
            <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setSelectedFormation(null)}>← Retour</button>
            <span style={{ flex: 1, fontWeight: 500, fontSize: 15 }}>{selectedFormation.titre}</span>
          </div>
        </div>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
          {msg && <div style={{ background: 'var(--green-light)', border: '1px solid var(--green)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: 20, fontSize: 14, color: 'var(--green)' }}>✓ {msg}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h2 style={{ fontSize: 18 }}>Séquences</h2>
                <button className="btn-primary" style={{ fontSize: 13, padding: '7px 14px' }} onClick={() => setShowChapForm(!showChapForm)}>{showChapForm ? '✕' : '+ Ajouter'}</button>
              </div>
              {showChapForm && (
                <div className="card" style={{ padding: 18, marginBottom: 14 }}>
                  <form onSubmit={saveChapitre}>
                    <div className="field"><label>Titre *</label><input type="text" required value={chapData.titre} onChange={e => setChapData({...chapData, titre: e.target.value})} placeholder="Ex: Introduction" /></div>
                    <div className="field"><label>Description courte</label><input type="text" value={chapData.description} onChange={e => setChapData({...chapData, description: e.target.value})} /></div>
                    <div className="field"><label>Lien *</label><input type="text" required value={chapData.lien} onChange={e => setChapData({...chapData, lien: e.target.value})} placeholder="https://..." /></div>
                    <div className="field"><label>Ordre</label><input type="number" value={chapData.ordre} onChange={e => setChapData({...chapData, ordre: e.target.value})} /></div>
                    <button type="submit" className="btn-primary" style={{ fontSize: 13 }} disabled={saving}>Enregistrer</button>
                  </form>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {chapitres.length === 0 ? <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--ink-muted)', fontSize: 14 }}>Aucune séquence</div>
                  : chapitres.map((ch, i) => (
                    <div key={ch.id} className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-light)', color: 'var(--accent-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>{i + 1}</div>
                      <div style={{ flex: 1 }}><p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{ch.titre}</p>{ch.description && <p style={{ fontSize: 12, color: 'var(--ink-muted)', margin: 0 }}>{ch.description}</p>}</div>
                      <button onClick={() => deleteChapitre(ch.id)} style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                    </div>
                  ))}
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h2 style={{ fontSize: 18 }}>Ressources</h2>
                <button className="btn-primary" style={{ fontSize: 13, padding: '7px 14px' }} onClick={() => setShowResForm(!showResForm)}>{showResForm ? '✕' : '+ Ajouter'}</button>
              </div>
              {showResForm && (
                <div className="card" style={{ padding: 18, marginBottom: 14 }}>
                  <form onSubmit={saveRessource}>
                    <div className="field"><label>Titre *</label><input type="text" required value={resData.titre} onChange={e => setResData({...resData, titre: e.target.value})} /></div>
                    <div className="field"><label>Lien *</label><input type="text" required value={resData.lien} onChange={e => setResData({...resData, lien: e.target.value})} placeholder="https://..." /></div>
                    <div className="field"><label>Type</label><select value={resData.type_fichier} onChange={e => setResData({...resData, type_fichier: e.target.value})}><option>PDF</option><option>DOC</option><option>PPT</option><option>VIDEO</option><option>AUTRE</option></select></div>
                    <button type="submit" className="btn-primary" style={{ fontSize: 13 }} disabled={saving}>Enregistrer</button>
                  </form>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ressources.length === 0 ? <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--ink-muted)', fontSize: 14 }}>Aucune ressource</div>
                  : ressources.map(r => (
                    <div key={r.id} className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 20 }}>📄</span>
                      <div style={{ flex: 1 }}><p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{r.titre}</p><p style={{ fontSize: 12, color: 'var(--ink-muted)', margin: 0 }}>{r.type_fichier}</p></div>
                      <button onClick={() => deleteRessource(r.id)} style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <div style={{ background: 'var(--warm-white)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', height: 64 }}>
          <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: 20, flex: 1 }}>Orevy <span style={{ fontSize: 13, color: 'var(--accent)', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>Admin</span></span>
          <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={onLogout}>Déconnexion</button>
        </div>
      </div>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
        {msg && <div style={{ background: 'var(--green-light)', border: '1px solid var(--green)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: 20, fontSize: 14, color: 'var(--green)' }}>✓ {msg}</div>}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28, background: 'var(--warm-white)', padding: 6, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', width: 'fit-content' }}>
          <button style={tabStyle('formations')} onClick={() => setTab('formations')}>Formations ({formations.length})</button>
          <button style={tabStyle('participants')} onClick={() => setTab('participants')}>Participants ({participants.length})</button>
          <button style={tabStyle('acces')} onClick={() => setTab('acces')}>Accès ({acces.length})</button>
        </div>
        {loading ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--ink-muted)' }}>Chargement…</div> : (<>
          {tab === 'formations' && (
            <div className="fade-up">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button className="btn-primary" onClick={() => setShowFormForm(!showFormForm)}>{showFormForm ? '✕ Annuler' : '+ Nouvelle formation'}</button>
              </div>
              {showFormForm && (
                <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                  <form onSubmit={saveFormation}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div className="field" style={{ gridColumn: '1/-1' }}><label>Titre *</label><input type="text" required value={formData.titre} onChange={e => setFormData({...formData, titre: e.target.value})} placeholder="Ex: Accueil du jeune enfant" /></div>
                      <div className="field" style={{ gridColumn: '1/-1' }}><label>Description</label><input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
                      <div className="field"><label>Date (AAAA-MM-JJ)</label><input type="text" value={formData.date_session} onChange={e => setFormData({...formData, date_session: e.target.value})} placeholder="2025-06-15" /></div>
                      <div className="field"><label>Durée (minutes)</label><input type="text" value={formData.duree_minutes} onChange={e => setFormData({...formData, duree_minutes: e.target.value})} placeholder="90" /></div>
                      <div className="field" style={{ gridColumn: '1/-1' }}><label>Lien vidéo *</label><input type="text" required value={formData.lien_video} onChange={e => setFormData({...formData, lien_video: e.target.value})} placeholder="https://..." /></div>
                      <div className="field"><label>Catégorie</label><input type="text" value={formData.categorie} onChange={e => setFormData({...formData, categorie: e.target.value})} placeholder="Pédagogie" /></div>
                    </div>
                    <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
                  </form>
                </div>
              )}
              <div className="card" style={{ overflow: 'hidden' }}>
                {formations.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-muted)' }}>Aucune formation</div> : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr><th style={th}>Titre</th><th style={th}>Date</th><th style={th}>Catégorie</th><th style={th}>Séquences</th><th style={th}></th></tr></thead>
                    <tbody>{formations.map(f => (
                      <tr key={f.id}>
                        <td style={{...td, fontWeight: 500, color: 'var(--ink)'}}>{f.titre}</td>
                        <td style={td}>{formatDate(f.date_session)}</td>
                        <td style={td}>{f.categorie || '—'}</td>
                        <td style={td}><button onClick={() => { setSelectedFormation(f); loadChapRes(f.id) }} style={{ fontSize: 13, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Gérer →</button></td>
                        <td style={{...td, textAlign: 'right'}}><button onClick={() => deleteFormation(f.id)} style={{ fontSize: 13, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Supprimer</button></td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
              </div>
            </div>
          )}
          {tab === 'participants' && (
            <div className="fade-up">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button className="btn-primary" onClick={() => setShowPartForm(!showPartForm)}>{showPartForm ? '✕ Annuler' : '+ Nouveau participant'}</button>
              </div>
              {showPartForm && (
                <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                  <form onSubmit={saveParticipant}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div className="field"><label>Nom *</label><input type="text" required value={partData.nom} onChange={e => setPartData({...partData, nom: e.target.value})} /></div>
                      <div className="field"><label>Email *</label><input type="email" required value={partData.email} onChange={e => setPartData({...partData, email: e.target.value})} /></div>
                      <div className="field"><label>Code (vide = auto)</label><input type="text" value={partData.code_acces} onChange={e => setPartData({...partData, code_acces: e.target.value.toUpperCase()})} style={{ textTransform: 'uppercase' }} /></div>
                    </div>
                    <button type="submit" className="btn-primary" disabled={saving}>{saving ? '…' : 'Créer'}</button>
                  </form>
                </div>
              )}
              <div className="card" style={{ overflow: 'hidden' }}>
                {participants.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-muted)' }}>Aucun participant</div> : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr><th style={th}>Nom</th><th style={th}>Email</th><th style={th}>Code</th><th style={th}></th></tr></thead>
                    <tbody>{participants.map(p => (
                      <tr key={p.id}>
                        <td style={{...td, fontWeight: 500, color: 'var(--ink)'}}>{p.nom}</td>
                        <td style={td}>{p.email}</td>
                        <td style={td}><code style={{ background: 'var(--accent-light)', color: 'var(--accent-dark)', padding: '2px 8px', borderRadius: 4, fontSize: 13, fontWeight: 600 }}>{p.code_acces}</code></td>
                        <td style={{...td, textAlign: 'right'}}><button onClick={() => deleteParticipant(p.id)} style={{ fontSize: 13, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Supprimer</button></td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
              </div>
            </div>
          )}
          {tab === 'acces' && (
            <div className="fade-up">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button className="btn-primary" onClick={() => setShowAccesForm(!showAccesForm)}>{showAccesForm ? '✕ Annuler' : '+ Attribuer un accès'}</button>
              </div>
              {showAccesForm && (
                <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                  <form onSubmit={saveAcces}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div className="field"><label>Participant *</label><select required value={accesData.participant_id} onChange={e => setAccesData({...accesData, participant_id: e.target.value})}><option value="">Choisir…</option>{participants.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}</select></div>
                      <div className="field"><label>Formation *</label><select required value={accesData.formation_id} onChange={e => setAccesData({...accesData, formation_id: e.target.value})}><option value="">Choisir…</option>{formations.map(f => <option key={f.id} value={f.id}>{f.titre}</option>)}</select></div>
                    </div>
                    <button type="submit" className="btn-primary" disabled={saving}>{saving ? '…' : "Attribuer"}</button>
                  </form>
                </div>
              )}
              <div className="card" style={{ overflow: 'hidden' }}>
                {acces.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-muted)' }}>Aucun accès</div> : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr><th style={th}>Participant</th><th style={th}>Formation</th><th style={th}>Statut</th><th style={th}>Vu le</th><th style={th}></th></tr></thead>
                    <tbody>{acces.map(a => (
                      <tr key={a.id}>
                        <td style={{...td, fontWeight: 500, color: 'var(--ink)'}}>{a.participants?.nom}<br/><span style={{fontSize:12,fontWeight:400,color:'var(--ink-muted)'}}>{a.participants?.email}</span></td>
                        <td style={td}>{a.formations?.titre}</td>
                        <td style={td}><span className={`badge ${a.vu ? 'badge-seen' : 'badge-new'}`}>{a.vu ? 'Vu' : 'Non vu'}</span></td>
                        <td style={td}>{a.date_visionnage ? formatDate(a.date_visionnage) : '—'}</td>
                        <td style={{...td, textAlign: 'right'}}><button onClick={() => deleteAcces(a.id)} style={{ fontSize: 13, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Retirer</button></td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </>)}
      </div>
    </div>
  )
}
