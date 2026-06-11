import { useState, useEffect } from 'react'

const BASE = 'https://orevy-proxy.david-bucari.workers.dev/rest/v1'
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdva2Z4ZWpvZmZ6dHR6dmRrb2xsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDMxNjQ0NCwiZXhwIjoyMDk1ODkyNDQ0fQ.X1BYaEYHHDNTh6I0MXTX0ZjOSQjTAeBiAuMgJH1YSV0'
const H = { 'Content-Type': 'application/json', 'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Prefer': 'return=representation' }

// ─── Supabase Formations (yyqpp) — accès direct pour les blocs ───────────────
const BASE_F = 'https://yyqppsvihdgmohnuocqr.supabase.co/rest/v1'
const KEY_F  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5cXBwc3ZpaGRnbW9obnVvY3FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTEyMDE4NiwiZXhwIjoyMDk2Njk2MTg2fQ.GVAjwcHDC-IO96BXcrXyZP_mVjrvCcdxdHMKmGuzJ3E'

const H_F = { 'Content-Type': 'application/json', 'apikey': KEY_F, 'Authorization': 'Bearer ' + KEY_F, 'Prefer': 'return=representation' }

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

// ─── CRUD blocs (projet Formations) ──────────────────────────────────────────
async function blocsGet(formationId) {
  const r = await fetch(`${BASE_F}/formation_blocs?formation_id=eq.${formationId}&order=ordre.asc`, { headers: H_F })
  return r.ok ? await r.json() : []
}
async function blocPost(body) {
  const r = await fetch(`${BASE_F}/formation_blocs`, { method: 'POST', headers: H_F, body: JSON.stringify(body) })
  return { ok: r.ok, data: await r.json() }
}
async function blocPatch(id, body) {
  const r = await fetch(`${BASE_F}/formation_blocs?id=eq.${id}`, { method: 'PATCH', headers: H_F, body: JSON.stringify(body) })
  return r.ok
}
async function blocDelete(id) {
  const r = await fetch(`${BASE_F}/formation_blocs?id=eq.${id}`, { method: 'DELETE', headers: H_F })
  return r.ok
}

// ─── ElevenLabs via Cloudflare Worker proxy ───────────────────────────────────
// Le Worker ajoute la clé API ElevenLabs côté serveur — jamais exposée en front
const WORKER = 'https://orevy-proxy.david-bucari.workers.dev'

async function generateAudio(script, voiceId) {
  const r = await fetch(`${WORKER}/elevenlabs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: script, voice_id: voiceId })
  })
  if (!r.ok) throw new Error(await r.text())
  return await r.blob() // retourne le mp3
}

async function uploadAudio(blob, filename) {
  // Upload dans Supabase Storage bucket "formation-audio"
  const r = await fetch(`${BASE_F.replace('/rest/v1', '')}/storage/v1/object/formation-audio/${filename}`, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + KEY_F, 'Content-Type': 'audio/mpeg', 'x-upsert': 'true' },
    body: blob
  })
  if (!r.ok) throw new Error('Upload Storage échoué')
  return `${BASE_F.replace('/rest/v1', '')}/storage/v1/object/public/formation-audio/${filename}`
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

// ─── TAG COLORS ───────────────────────────────────────────────────────────────
const TAG_COLORS = {
  'CONCEPT': '#E07A5F', 'THÉORIE': '#1E3A5F', 'NEURO': '#7B68AE',
  'PRATIQUE': '#3D9A8B', 'OUTIL': '#F4A261', 'CONTENU': '#4CAF82',
  'INTRODUCTION': '#5B8DB8', 'CONCLUSION': '#2C3E50', 'SCIENCE': '#3D9A8B',
  'DÉFINITION': '#E07A5F', 'DÉTAIL': '#7B68AE',
}

const VOIX_ELEVENLABS = [
  { id: 'XB0fDUnXU5powFXDhCwa', label: 'Charlotte — FR féminine naturelle' },
  { id: 'onwK4e9ZLuTAKqWW03F9', label: 'Daniel — FR masculin posé' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', label: 'Callum — FR masculin dynamique' },
  { id: 'custom', label: '🎙 Voix clonée (ID custom)' },
]

export default function Admin({ onLogout }) {
  const [tab, setTab] = useState('formations')
  const [formations, setFormations] = useState([])
  const [participants, setParticipants] = useState([])
  const [acces, setAcces] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('success') // success | error
  const [showFormForm, setShowFormForm] = useState(false)
  const [showPartForm, setShowPartForm] = useState(false)
  const [showAccesForm, setShowAccesForm] = useState(false)
  const [selectedFormation, setSelectedFormation] = useState(null)
  const [chapitres, setChapitres] = useState([])
  const [ressources, setRessources] = useState([])
  const [blocs, setBlocs] = useState([])
  const [blocTab, setBlocTab] = useState('blocs') // blocs | chapitres | ressources
  const [showChapForm, setShowChapForm] = useState(false)
  const [showResForm, setShowResForm] = useState(false)
  const [showBlocForm, setShowBlocForm] = useState(false)
  const [editingBloc, setEditingBloc] = useState(null)
  const [generatingId, setGeneratingId] = useState(null)
  const [voiceId, setVoiceId] = useState(VOIX_ELEVENLABS[0].id)
  const [customVoiceId, setCustomVoiceId] = useState('')
  const [chapData, setChapData] = useState({ titre: '', description: '', lien: '', ordre: 0 })
  const [resData, setResData] = useState({ titre: '', lien: '', type_fichier: 'PDF' })
  const [formData, setFormData] = useState({ titre: '', description: '', date_session: '', duree_minutes: '', lien_video: '', categorie: '' })
  const [partData, setPartData] = useState({ nom: '', email: '', code_acces: '' })
  const [accesData, setAccesData] = useState({ participant_id: '', formation_id: '' })
  const [blocData, setBlocData] = useState({ titre: '', tag: 'CONCEPT', ordre: 0, contenu_html: '', audio_script: '', audio_duree: 150 })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [f, p, a] = await Promise.all([
      dbGet('formations', '?order=date_session.desc'),
      dbGet('participants', '?order=nom.asc'),
      dbGet('acces_formations', ''),
    ])
    setFormations(f); setParticipants(p)
    const enriched = a.map(ac => ({
      ...ac,
      formations: f.find(x => x.id === ac.formation_id) || {},
      participants: p.find(x => x.id === ac.participant_id) || {},
    }))
    setAcces(enriched); setLoading(false)
  }

  async function loadChapRes(fid) {
    const [ch, res, bl] = await Promise.all([
      dbGet('chapitres', `?formation_id=eq.${fid}&order=ordre.asc`),
      dbGet('ressources', `?formation_id=eq.${fid}&order=created_at.asc`),
      blocsGet(fid),
    ])
    setChapitres(ch); setRessources(res); setBlocs(bl)
  }

  function flash(m, type = 'success') {
    setMsg(m); setMsgType(type)
    setTimeout(() => setMsg(''), 5000)
  }

  // ─── CRUD formations / participants / accès (inchangé) ───────────────────
  async function saveFormation(e) {
    e.preventDefault(); setSaving(true)
    const body = { ...formData, duree_minutes: parseInt(formData.duree_minutes) || null }
    if (!body.date_session) delete body.date_session
    const { ok } = await dbPost('formations', body)
    if (ok) { flash('Formation ajoutée !'); setShowFormForm(false); setFormData({ titre: '', description: '', date_session: '', duree_minutes: '', lien_video: '', categorie: '' }); loadAll() }
    else flash('Erreur lors de l\'enregistrement', 'error')
    setSaving(false)
  }
  async function saveParticipant(e) {
    e.preventDefault(); setSaving(true)
    const code = partData.code_acces || generateCode()
    const { ok, data } = await dbPost('participants', { ...partData, code_acces: code, email: partData.email.toLowerCase() })
    if (ok) { flash(`Participant ajouté ! Code : ${code}`); setShowPartForm(false); setPartData({ nom: '', email: '', code_acces: '' }); loadAll() }
    else flash('Erreur : ' + JSON.stringify(data), 'error')
    setSaving(false)
  }
  async function saveAcces(e) {
    e.preventDefault(); setSaving(true)
    const { ok } = await dbPost('acces_formations', accesData)
    if (ok) { flash('Accès attribué !'); setShowAccesForm(false); setAccesData({ participant_id: '', formation_id: '' }); loadAll() }
    else flash('Erreur', 'error')
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

  // ─── CRUD blocs ───────────────────────────────────────────────────────────
  async function saveBloc(e) {
    e.preventDefault(); setSaving(true)
    const body = { ...blocData, formation_id: selectedFormation.id, ordre: parseInt(blocData.ordre) || 0, audio_duree: parseInt(blocData.audio_duree) || null }
    if (editingBloc) {
      await blocPatch(editingBloc.id, body)
      flash('Bloc mis à jour !')
    } else {
      const { ok } = await blocPost(body)
      if (ok) flash('Bloc ajouté !')
      else flash('Erreur ajout bloc', 'error')
    }
    setShowBlocForm(false); setEditingBloc(null)
    setBlocData({ titre: '', tag: 'CONCEPT', ordre: 0, contenu_html: '', audio_script: '', audio_duree: 150 })
    loadChapRes(selectedFormation.id); setSaving(false)
  }

  function startEditBloc(b) {
    setEditingBloc(b)
    setBlocData({ titre: b.titre, tag: b.tag || 'CONCEPT', ordre: b.ordre, contenu_html: b.contenu_html || '', audio_script: b.audio_script || '', audio_duree: b.audio_duree || 150 })
    setShowBlocForm(true)
  }

  async function deleteBloc(id) {
    if (!confirm('Supprimer ce bloc ?')) return
    await blocDelete(id)
    loadChapRes(selectedFormation.id)
  }

  // ─── GÉNÉRATION AUDIO ELEVENLABS ─────────────────────────────────────────
  async function handleGenererAudio(bloc) {
    if (!bloc.audio_script?.trim()) { flash('Ce bloc n\'a pas de script audio.', 'error'); return }
    const vid = voiceId === 'custom' ? customVoiceId.trim() : voiceId
    if (!vid) { flash('Sélectionne une voix.', 'error'); return }
    if (!confirm(`Générer l'audio pour "${bloc.titre}" ?\nVoix : ${vid}\n\nCela va appeler ElevenLabs (~${Math.ceil((bloc.audio_script.length / 1000) * 0.3)}€ estimé).`)) return

    setGeneratingId(bloc.id)
    try {
      // 1. Appel ElevenLabs via Worker
      const mp3Blob = await generateAudio(bloc.audio_script, vid)

      // 2. Upload dans Supabase Storage
      const filename = `${selectedFormation.id}_bloc${String(bloc.ordre).padStart(2,'0')}.mp3`
      const audioUrl = await uploadAudio(mp3Blob, filename)

      // 3. Mise à jour du bloc avec l'URL
      await blocPatch(bloc.id, { audio_url: audioUrl })
      await loadChapRes(selectedFormation.id)
      flash(`🎙 Audio généré pour "${bloc.titre}"`)
    } catch (err) {
      flash('Erreur génération : ' + err.message, 'error')
    }
    setGeneratingId(null)
  }

  async function handleSupprimerAudio(bloc) {
    if (!confirm('Supprimer le fichier audio de ce bloc ?')) return
    await blocPatch(bloc.id, { audio_url: null })
    await loadChapRes(selectedFormation.id)
    flash('Audio supprimé.')
  }

  const tabStyle = (t) => ({ padding: '10px 20px', fontSize: 14, fontWeight: 500, background: tab === t ? 'var(--accent)' : 'transparent', color: tab === t ? 'white' : 'var(--ink-soft)', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer' })
  const blocTabStyle = (t) => ({ padding: '8px 16px', fontSize: 13, fontWeight: 500, background: blocTab === t ? 'var(--accent)' : 'transparent', color: blocTab === t ? 'white' : 'var(--ink-soft)', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer' })
  const th = { padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }
  const td = { padding: '12px 14px', fontSize: 14, color: 'var(--ink-soft)', borderBottom: '1px solid var(--border)' }

  // ─── VUE FORMATION SÉLECTIONNÉE ──────────────────────────────────────────
  if (selectedFormation) {
    const blocsAvecAudio = blocs.filter(b => b.audio_url).length
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
        <div style={{ background: 'var(--warm-white)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', height: 64, gap: 16 }}>
            <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setSelectedFormation(null)}>← Retour</button>
            <span style={{ flex: 1, fontWeight: 500, fontSize: 15 }}>{selectedFormation.titre}</span>
            <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>🎙 {blocsAvecAudio}/{blocs.length} audios générés</span>
          </div>
        </div>

        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 24px 0' }}>
          {msg && <div style={{ background: msgType === 'error' ? '#fee2e2' : 'var(--green-light)', border: `1px solid ${msgType === 'error' ? '#fca5a5' : 'var(--green)'}`, borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: 16, fontSize: 14, color: msgType === 'error' ? '#dc2626' : 'var(--green)' }}>{msgType === 'error' ? '⚠ ' : '✓ '}{msg}</div>}

          {/* Sous-onglets */}
          <div style={{ display: 'flex', gap: 6, background: 'var(--warm-white)', padding: 5, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', width: 'fit-content', marginBottom: 24 }}>
            <button style={blocTabStyle('blocs')} onClick={() => setBlocTab('blocs')}>🎙 Blocs audio ({blocs.length})</button>
            <button style={blocTabStyle('chapitres')} onClick={() => setBlocTab('chapitres')}>Séquences ({chapitres.length})</button>
            <button style={blocTabStyle('ressources')} onClick={() => setBlocTab('ressources')}>Ressources ({ressources.length})</button>
          </div>
        </div>

        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px 32px' }}>

          {/* ── ONGLET BLOCS AUDIO ── */}
          {blocTab === 'blocs' && (
            <div className="fade-up">
              {/* Sélecteur de voix global */}
              <div className="card" style={{ padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>🎙 Voix ElevenLabs :</span>
                <select value={voiceId} onChange={e => setVoiceId(e.target.value)} style={{ fontSize: 13, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'white', flex: 1, minWidth: 200 }}>
                  {VOIX_ELEVENLABS.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                </select>
                {voiceId === 'custom' && <input value={customVoiceId} onChange={e => setCustomVoiceId(e.target.value)} placeholder="Voice ID ElevenLabs" style={{ fontSize: 13, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', flex: 1 }} />}
                <span style={{ fontSize: 12, color: 'var(--ink-muted)', background: '#f0f9ff', padding: '4px 10px', borderRadius: 20 }}>
                  Tarif ~0,30€ / 1 000 mots
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
                <button className="btn-primary" onClick={() => { setEditingBloc(null); setBlocData({ titre: '', tag: 'CONCEPT', ordre: blocs.length, contenu_html: '', audio_script: '', audio_duree: 150 }); setShowBlocForm(!showBlocForm) }}>
                  {showBlocForm && !editingBloc ? '✕ Annuler' : '+ Nouveau bloc'}
                </button>
              </div>

              {showBlocForm && (
                <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                  <h3 style={{ fontSize: 15, marginBottom: 16 }}>{editingBloc ? `Modifier — ${editingBloc.titre}` : 'Nouveau bloc'}</h3>
                  <form onSubmit={saveBloc}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 80px', gap: 12, marginBottom: 12 }}>
                      <div className="field" style={{ gridColumn: '1/3' }}><label>Titre *</label><input type="text" required value={blocData.titre} onChange={e => setBlocData({...blocData, titre: e.target.value})} placeholder="Ex: Qu'est-ce qu'une émotion ?" /></div>
                      <div className="field"><label>Tag</label>
                        <select value={blocData.tag} onChange={e => setBlocData({...blocData, tag: e.target.value})}>
                          {Object.keys(TAG_COLORS).map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="field"><label>Ordre</label><input type="number" value={blocData.ordre} onChange={e => setBlocData({...blocData, ordre: e.target.value})} /></div>
                    </div>
                    <div className="field" style={{ marginBottom: 12 }}>
                      <label>Contenu écrit (HTML ou texte) <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>— affiché dans le lecteur</span></label>
                      <textarea rows={4} value={blocData.contenu_html} onChange={e => setBlocData({...blocData, contenu_html: e.target.value})} placeholder="Contenu de la slide..." style={{ width: '100%', fontSize: 13, padding: 10, borderRadius: 6, border: '1px solid var(--border)', resize: 'vertical', fontFamily: 'monospace' }} />
                    </div>
                    <div className="field" style={{ marginBottom: 12 }}>
                      <label style={{ color: '#E07A5F', fontWeight: 600 }}>🎙 Script voix off <span style={{ fontSize: 11, color: 'var(--ink-muted)', fontWeight: 400 }}>— contenu supplémentaire, différent du texte</span></label>
                      <textarea rows={8} value={blocData.audio_script} onChange={e => setBlocData({...blocData, audio_script: e.target.value})} placeholder="Coller le script voix off ici..." style={{ width: '100%', fontSize: 13, padding: 10, borderRadius: 6, border: '2px solid #E07A5F', resize: 'vertical', lineHeight: 1.6 }} />
                      {blocData.audio_script && <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>~{Math.ceil(blocData.audio_script.split(' ').length / 130)} min estimée — {blocData.audio_script.split(' ').length} mots</span>}
                    </div>
                    <div className="field" style={{ marginBottom: 16 }}>
                      <label>Durée audio estimée (secondes)</label>
                      <input type="number" value={blocData.audio_duree} onChange={e => setBlocData({...blocData, audio_duree: e.target.value})} style={{ width: 120 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Enregistrement…' : editingBloc ? 'Mettre à jour' : 'Enregistrer le bloc'}</button>
                      <button type="button" className="btn-secondary" onClick={() => { setShowBlocForm(false); setEditingBloc(null) }}>Annuler</button>
                    </div>
                  </form>
                </div>
              )}

              {/* Liste des blocs */}
              {blocs.length === 0 ? (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--ink-muted)' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🎙</div>
                  <p style={{ fontSize: 14 }}>Aucun bloc audio. Crée le premier bloc pour commencer.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {blocs.map(b => {
                    const tagColor = TAG_COLORS[b.tag] || '#888'
                    const isGenerating = generatingId === b.id
                    const hasAudio = !!b.audio_url
                    const hasScript = !!b.audio_script?.trim()
                    return (
                      <div key={b.id} className="card" style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {/* Numéro */}
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: tagColor, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{b.ordre + 1}</div>

                          {/* Titre + tag */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{b.titre}</span>
                              {b.tag && <span style={{ fontSize: 10, fontWeight: 700, color: tagColor, background: tagColor + '18', padding: '2px 7px', borderRadius: 10, letterSpacing: '0.05em' }}>{b.tag}</span>}
                            </div>
                            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                              <span style={{ fontSize: 12, color: hasScript ? '#059669' : 'var(--ink-muted)' }}>
                                {hasScript ? `✓ Script (${b.audio_script.split(' ').length} mots)` : '○ Pas de script'}
                              </span>
                              <span style={{ fontSize: 12, color: hasAudio ? '#059669' : 'var(--ink-muted)' }}>
                                {hasAudio ? '🎵 Audio généré' : '○ Pas d\'audio'}
                              </span>
                              {b.audio_duree && <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>⏱ ~{Math.ceil(b.audio_duree / 60)} min</span>}
                            </div>
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                            {hasAudio && (
                              <audio controls src={b.audio_url} style={{ height: 32, width: 160 }} />
                            )}
                            {hasScript && !hasAudio && (
                              <button
                                onClick={() => handleGenererAudio(b)}
                                disabled={isGenerating}
                                style={{ fontSize: 13, padding: '6px 14px', background: isGenerating ? 'var(--border)' : '#E07A5F', color: 'white', border: 'none', borderRadius: 6, cursor: isGenerating ? 'wait' : 'pointer', fontWeight: 600 }}
                              >
                                {isGenerating ? '⏳ Génération…' : '🎙 Générer audio'}
                              </button>
                            )}
                            {hasAudio && (
                              <button onClick={() => handleGenererAudio(b)} disabled={isGenerating} style={{ fontSize: 12, padding: '5px 10px', background: 'var(--warm-white)', color: 'var(--ink-soft)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}>
                                {isGenerating ? '⏳' : '↺ Regénérer'}
                              </button>
                            )}
                            <button onClick={() => startEditBloc(b)} style={{ fontSize: 12, padding: '5px 10px', background: 'var(--warm-white)', color: 'var(--ink-soft)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}>✏ Éditer</button>
                            <button onClick={() => deleteBloc(b.id)} style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── ONGLET SÉQUENCES ── */}
          {blocTab === 'chapitres' && (
            <div className="fade-up">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
                <button className="btn-primary" style={{ fontSize: 13, padding: '7px 14px' }} onClick={() => setShowChapForm(!showChapForm)}>{showChapForm ? '✕' : '+ Ajouter'}</button>
              </div>
              {showChapForm && (
                <div className="card" style={{ padding: 18, marginBottom: 14 }}>
                  <form onSubmit={saveChapitre}>
                    <div className="field"><label>Titre *</label><input type="text" required value={chapData.titre} onChange={e => setChapData({...chapData, titre: e.target.value})} /></div>
                    <div className="field"><label>Description</label><input type="text" value={chapData.description} onChange={e => setChapData({...chapData, description: e.target.value})} /></div>
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
          )}

          {/* ── ONGLET RESSOURCES ── */}
          {blocTab === 'ressources' && (
            <div className="fade-up">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
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
          )}
        </div>
      </div>
    )
  }

  // ─── VUE PRINCIPALE ───────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <div style={{ background: 'var(--warm-white)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', height: 64 }}>
          <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: 20, flex: 1 }}>Orevy <span style={{ fontSize: 13, color: 'var(--accent)', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>Admin</span></span>
          <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={onLogout}>Déconnexion</button>
        </div>
      </div>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
        {msg && <div style={{ background: msgType === 'error' ? '#fee2e2' : 'var(--green-light)', border: `1px solid ${msgType === 'error' ? '#fca5a5' : 'var(--green)'}`, borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: 20, fontSize: 14, color: msgType === 'error' ? '#dc2626' : 'var(--green)' }}>{msgType === 'error' ? '⚠ ' : '✓ '}{msg}</div>}
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
                      <div className="field" style={{ gridColumn: '1/-1' }}><label>Lien vidéo</label><input type="text" value={formData.lien_video} onChange={e => setFormData({...formData, lien_video: e.target.value})} placeholder="https://..." /></div>
                      <div className="field"><label>Catégorie</label><input type="text" value={formData.categorie} onChange={e => setFormData({...formData, categorie: e.target.value})} placeholder="Pédagogie" /></div>
                    </div>
                    <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
                  </form>
                </div>
              )}
              <div className="card" style={{ overflow: 'hidden' }}>
                {formations.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-muted)' }}>Aucune formation</div> : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr><th style={th}>Titre</th><th style={th}>Date</th><th style={th}>Catégorie</th><th style={th}>Blocs</th><th style={th}></th></tr></thead>
                    <tbody>{formations.map(f => (
                      <tr key={f.id} style={{ cursor: 'pointer' }}>
                        <td style={{...td, fontWeight: 500, color: 'var(--ink)'}}>{f.titre}</td>
                        <td style={td}>{formatDate(f.date_session)}</td>
                        <td style={td}>{f.categorie || '—'}</td>
                        <td style={td}><button onClick={() => { setSelectedFormation(f); loadChapRes(f.id) }} style={{ fontSize: 13, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>🎙 Gérer →</button></td>
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
                    <button type="submit" className="btn-primary" disabled={saving}>{saving ? '…' : 'Attribuer'}</button>
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
