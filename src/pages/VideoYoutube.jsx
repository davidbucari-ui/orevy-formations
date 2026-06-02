import { useState, useEffect } from 'react'

const WORKER_URL = 'https://orevy-proxy.david-bucari.workers.dev'
const BASE = `${WORKER_URL}/rest/v1`
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdva2Z4ZWpvZmZ6dHR6dmRrb2xsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDMxNjQ0NCwiZXhwIjoyMDk1ODkyNDQ0fQ.X1BYaEYHHDNTh6I0MXTX0ZjOSQjTAeBiAuMgJH1YSV0'
const H = { 'Content-Type': 'application/json', 'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Prefer': 'return=representation' }

export default function VideoYoutube() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [segments, setSegments] = useState([{ title: '', start: '00:00', end: '' }])
  const [formations, setFormations] = useState([])
  const [chapitres, setChapitres] = useState([])
  const [formationId, setFormationId] = useState('')
  const [chapitreId, setChapitreId] = useState('')
  const [blocTitle, setBlocTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    fetch(`${BASE}/formations?select=id,titre&order=titre`, { headers: H })
      .then(r => r.json()).then(setFormations).catch(() => {})
  }, [])

  async function searchYoutube() {
    if (!query.trim()) return
    setSearching(true)
    setResults([])
    try {
      const res = await fetch(`${WORKER_URL}/youtube-search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      if (data.items) {
        setResults(data.items.map(i => ({
          id: i.id.videoId,
          title: i.snippet.title,
          channel: i.snippet.channelTitle,
          thumb: i.snippet.thumbnails.medium?.url || ''
        })))
      } else {
        setMsg('Aucun résultat ou erreur API YouTube.')
      }
    } catch {
      setMsg('Erreur de connexion au Worker.')
    }
    setSearching(false)
  }

  async function loadChapitres(fId) {
    setFormationId(fId)
    setChapitreId('')
    if (!fId) return
    const res = await fetch(`${BASE}/chapitres?formation_id=eq.${fId}&select=id,titre&order=titre`, { headers: H })
    const data = await res.json()
    setChapitres(data)
  }

  function selectVideo(v) {
    setSelectedVideo(v)
    setSegments([{ title: '', start: '00:00', end: '' }])
    setBlocTitle(v.title.substring(0, 80))
  }

  function addSegment() {
    setSegments([...segments, { title: '', start: '', end: '' }])
  }

  function removeSegment(i) {
    setSegments(segments.filter((_, idx) => idx !== i))
  }

  function updateSegment(i, field, value) {
    const updated = [...segments]
    updated[i][field] = value
    setSegments(updated)
  }

  async function save() {
    if (!selectedVideo) return setMsg('Sélectionnez une vidéo.')
    if (!chapitreId) return setMsg('Sélectionnez un chapitre.')
    if (!blocTitle.trim()) return setMsg('Ajoutez un titre au bloc.')
    const segsValides = segments.filter(s => s.title && s.start)
    if (segsValides.length === 0) return setMsg('Ajoutez au moins un segment.')
    setLoading(true)
    setMsg('')
    try {
      const res = await fetch(`${BASE}/video_segments`, {
        method: 'POST',
        headers: H,
        body: JSON.stringify({
          chapitre_id: chapitreId,
          titre: blocTitle,
          youtube_video_id: selectedVideo.id,
          youtube_titre: selectedVideo.title,
          youtube_channel: selectedVideo.channel,
          segments: segsValides
        })
      })
      if (res.ok) {
        setMsg(`✓ ${segsValides.length} segment(s) enregistré(s) avec succès.`)
        setSelectedVideo(null)
        setResults([])
        setQuery('')
        setSegments([{ title: '', start: '00:00', end: '' }])
      } else {
        const err = await res.json()
        setMsg('Erreur : ' + (err.message || err.code))
      }
    } catch {
      setMsg('Erreur réseau.')
    }
    setLoading(false)
  }

  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 14, background: 'var(--warm-white)', color: 'var(--text)' }
  const btnStyle = { padding: '8px 16px', borderRadius: 6, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 14, cursor: 'pointer' }
  const btnSecStyle = { ...btnStyle, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Vidéos YouTube</h2>

      <div style={{ background: 'var(--warm-white)', borderRadius: 8, border: '1px solid var(--border)', padding: 20, marginBottom: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-muted)' }}>ÉTAPE 1 — Rechercher une vidéo</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchYoutube()}
            placeholder="ex : droit du travail contrat CDI"
          />
          <button style={btnStyle} onClick={searchYoutube} disabled={searching}>
            {searching ? 'Recherche...' : 'Chercher'}
          </button>
        </div>

        {results.map(v => (
          <div
            key={v.id}
            onClick={() => selectVideo(v)}
            style={{
              display: 'flex', gap: 12, alignItems: 'flex-start', padding: 10,
              borderRadius: 6, cursor: 'pointer', marginBottom: 8,
              border: selectedVideo?.id === v.id ? '2px solid var(--primary)' : '1px solid var(--border)',
              background: selectedVideo?.id === v.id ? 'var(--green-light)' : 'transparent'
            }}
          >
            {v.thumb && <img src={v.thumb} alt="" style={{ width: 120, height: 68, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />}
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{v.title}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.channel}</p>
            </div>
          </div>
        ))}
      </div>

      {selectedVideo && (
        <div style={{ background: 'var(--warm-white)', borderRadius: 8, border: '1px solid var(--border)', padding: 20, marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-muted)' }}>ÉTAPE 2 — Découper en segments</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ borderRadius: 8, overflow: 'hidden', aspectRatio: '16/9', background: '#000' }}>
                <iframe
                  width="100%" height="100%"
                  src={`https://www.youtube.com/embed/${selectedVideo.id}?rel=0`}
                  frameBorder="0" allowFullScreen style={{ display: 'block' }}
                />
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, marginTop: 8 }}>{selectedVideo.title}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedVideo.channel}</p>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>Segments ({segments.length})</span>
                <button style={btnSecStyle} onClick={addSegment}>+ Ajouter</button>
              </div>
              {segments.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>{i + 1}</span>
                  <input style={{ ...inputStyle, width: 72 }} value={s.start} onChange={e => updateSegment(i, 'start', e.target.value)} placeholder="00:00" />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>→</span>
                  <input style={{ ...inputStyle, width: 72 }} value={s.end} onChange={e => updateSegment(i, 'end', e.target.value)} placeholder="fin" />
                  <input style={{ ...inputStyle, flex: 1 }} value={s.title} onChange={e => updateSegment(i, 'title', e.target.value)} placeholder="Titre du segment..." />
                  <button style={{ ...btnSecStyle, padding: '6px 10px' }} onClick={() => removeSegment(i)}>✕</button>
                </div>
              ))}
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Format : MM:SS ou HH:MM:SS</p>
            </div>
          </div>
        </div>
      )}

      {selectedVideo && (
        <div style={{ background: 'var(--warm-white)', borderRadius: 8, border: '1px solid var(--border)', padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-muted)' }}>ÉTAPE 3 — Rattacher à un module</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Formation</label>
              <select style={inputStyle} value={formationId} onChange={e => loadChapitres(e.target.value)}>
                <option value="">Choisir une formation...</option>
                {formations.map(f => <option key={f.id} value={f.id}>{f.titre}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Chapitre</label>
              <select style={inputStyle} value={chapitreId} onChange={e => setChapitreId(e.target.value)}>
                <option value="">Choisir un chapitre...</option>
                {chapitres.map(c => <option key={c.id} value={c.id}>{c.titre}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Titre du bloc vidéo</label>
            <input style={inputStyle} value={blocTitle} onChange={e => setBlocTitle(e.target.value)} placeholder="ex : Vidéo — Les bases du contrat de travail" />
          </div>
          <button style={{ ...btnStyle, width: '100%' }} onClick={save} disabled={loading}>
            {loading ? 'Enregistrement...' : 'Enregistrer dans Supabase'}
          </button>
          {msg && (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 6, fontSize: 13, background: msg.startsWith('✓') ? 'var(--green-light)' : '#ffeaea', color: msg.startsWith('✓') ? 'var(--green)' : '#c00' }}>
              {msg}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
