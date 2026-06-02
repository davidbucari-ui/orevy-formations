import { useState, useEffect } from 'react'

const BASE = 'https://orevy-proxy.david-bucari.workers.dev/rest/v1'
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdva2Z4ZWpvZmZ6dHR6dmRrb2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTY0NDQsImV4cCI6MjA5NTg5MjQ0NH0.2oghhJNpqeh-zLUjHE0iAJLK_eJX40_ZRuQTaQFGzhw'
const H = { 'Content-Type': 'application/json', 'apikey': KEY, 'Authorization': 'Bearer ' + KEY }

function parseTime(t) {
  if (!t) return 0
  const parts = t.split(':').map(Number)
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return 0
}

export default function VideoPlayer({ chapitreId, onClose }) {
  const [blocs, setBlocs] = useState([])
  const [selected, setSelected] = useState(null)
  const [segIndex, setSegIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${BASE}/video_segments?chapitre_id=eq.${chapitreId}&order=created_at.asc`, { headers: H })
      .then(r => r.json())
      .then(data => { setBlocs(data); if (data.length > 0) { setSelected(data[0]); setSegIndex(0) } setLoading(false) })
      .catch(() => setLoading(false))
  }, [chapitreId])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-muted)' }}>Chargement…</div>
  if (blocs.length === 0) return null

  const seg = selected?.segments?.[segIndex]
  const start = seg ? parseTime(seg.start) : 0
  const playerUrl = selected ? `https://www.youtube.com/embed/${selected.youtube_video_id}?start=${start}&rel=0&autoplay=1` : ''

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh' }}>
      <div style={{ background: 'var(--warm-white)', borderBottom: '1px solid var(--border)', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16, height: 56 }}>
        <button onClick={onClose} className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }}>← Retour</button>
        <span style={{ fontSize: 14, color: 'var(--ink-soft)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.titre}
        </span>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 24px' }}>
        <div style={{ borderRadius: 'var(--radius)', overflow: 'hidden', aspectRatio: '16/9', background: '#000', marginBottom: 20 }}>
          {selected && <iframe key={`${selected.youtube_video_id}-${segIndex}`} width="100%" height="100%" src={playerUrl} frameBorder="0" allowFullScreen allow="autoplay" style={{ display: 'block' }} />}
        </div>

        {selected?.segments?.length > 0 && (
          <div className="card" style={{ padding: 16, marginBottom: 20 }}>
            <p style={{ fontWeight: 500, fontSize: 14, marginBottom: 12 }}>Segments</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {selected.segments.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setSegIndex(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', textAlign: 'left',
                    background: segIndex === i ? 'var(--accent-light)' : 'transparent',
                    color: segIndex === i ? 'var(--accent)' : 'var(--ink)'
                  }}
                >
                  <span style={{ fontSize: 12, color: segIndex === i ? 'var(--accent)' : 'var(--ink-muted)', minWidth: 40 }}>{s.start}</span>
                  <span style={{ fontSize: 14 }}>{s.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {blocs.length > 1 && (
          <div className="card" style={{ padding: 16 }}>
            <p style={{ fontWeight: 500, fontSize: 14, marginBottom: 12 }}>Autres vidéos</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {blocs.map((b, i) => (
                <button
                  key={b.id}
                  onClick={() => { setSelected(b); setSegIndex(0) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', textAlign: 'left',
                    background: selected?.id === b.id ? 'var(--accent-light)' : 'transparent',
                    color: selected?.id === b.id ? 'var(--accent)' : 'var(--ink)'
                  }}
                >
                  <span style={{ fontSize: 20 }}>▶</span>
                  <span style={{ fontSize: 14 }}>{b.titre}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
