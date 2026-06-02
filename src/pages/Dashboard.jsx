import { useState, useEffect } from 'react'
const BASE = 'https://orevy-proxy.david-bucari.workers.dev/rest/v1'
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdva2Z4ZWpvZmZ6dHR6dmRrb2xsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDMxNjQ0NCwiZXhwIjoyMDk1ODkyNDQ0fQ.X1BYaEYHHDNTh6I0MXTX0ZjOSQjTAeBiAuMgJH1YSV0'
const H = { 'Content-Type': 'application/json', 'apikey': KEY, 'Authorization': 'Bearer ' + KEY }

async function dbGet(table, params = '') {
  const r = await fetch(`${BASE}/${table}${params}`, { headers: H })
  return r.ok ? await r.json() : []
}
async function dbPatch(table, filter, body) {
  await fetch(`${BASE}/${table}?${filter}`, { method: 'PATCH', headers: { ...H, 'Prefer': 'return=minimal' }, body: JSON.stringify(body) })
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
function formatDuration(min) {
  if (!min) return ''
  const h = Math.floor(min / 60), m = min % 60
  return min < 60 ? `${min} min` : m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

export default function Dashboard({ participant, onLogout }) {
  const [formations, setFormations] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState(null)
  const [chapitres, setChapitres] = useState([])
  const [ressources, setRessources] = useState([])

 const [playerData, setPlayerData] = useState(null)
  async function loadFormations() {
    // 1. Get acces for this participant
    const accesData = await dbGet('acces_formations', `?participant_id=eq.${participant.id}`)
    if (!accesData.length) { setLoading(false); return }

    // 2. Get all formation ids
    const formationIds = accesData.map(a => a.formation_id)
    const formationsData = await dbGet('formations', `?id=in.(${formationIds.join(',')})`)

    // 3. Merge
    const merged = accesData.map(a => ({
      ...a,
      formations: formationsData.find(f => f.id === a.formation_id) || {}
    }))
    setFormations(merged)
    setLoading(false)
  }
useEffect(() => { loadFormations() }, [])

  function parseTime(t) { if (!t) return 0; const p = t.split(':').map(Number); return p.length === 2 ? p[0]*60+p[1] : p[0]*3600+p[1]*60+p[2] }
  async function openFormation(acces) {
    if (!acces.vu) {
      await dbPatch('acces_formations', `id=eq.${acces.id}`, { vu: true, date_visionnage: new Date().toISOString() })
      setFormations(prev => prev.map(f => f.id === acces.id ? { ...f, vu: true } : f))
    }
    const fid = acces.formation_id
    const [ch, res] = await Promise.all([
      dbGet('chapitres', `?formation_id=eq.${fid}&order=ordre.asc`),
      dbGet('ressources', `?formation_id=eq.${fid}&order=created_at.asc`),
    ])
    setChapitres(ch); setRessources(res); setViewing(acces)
  }

  const seen = formations.filter(f => f.vu).length
  const total = formations.length
if (playerData) return (
  <div onClick={() => setPlayerData(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
    <div onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: 860, aspectRatio: '16/9', position: 'relative' }}>
      <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${playerData.videoId}?start=${playerData.start}&autoplay=1`} allow="autoplay; fullscreen" style={{ border: 'none', borderRadius: 8 }} />
      <button onClick={() => setPlayerData(null)} style={{ position: 'absolute', top: -40, right: 0, background: 'none', border: 'none', color: 'white', fontSize: 28, cursor: 'pointer' }}>✕</button>
    </div>
  </div>
)
   if (viewing) {
    const f = viewing.formations
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
        <div style={{ background: 'var(--warm-white)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16, height: 60 }}>
            <button onClick={() => setViewing(null)} className="btn-secondary" style={{ padding: '7px 14px', fontSize: 13 }}>← Retour</button>
            <span style={{ fontSize: 14, color: 'var(--ink-soft)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.titre}</span>
            <span className="badge badge-seen">✓ Vu</span>
          </div>
        </div>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
          <h1 style={{ fontSize: 26, marginBottom: 8 }}>{f.titre}</h1>
          <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
            {f.date_session && <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>📅 {formatDate(f.date_session)}</span>}
            {f.duree_minutes && <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>⏱ {formatDuration(f.duree_minutes)}</span>}
            {f.categorie && <span className="badge badge-pending">{f.categorie}</span>}
          </div>
          {f.description && <p style={{ color: 'var(--ink-soft)', marginBottom: 28, lineHeight: 1.7 }}>{f.description}</p>}
          <div style={{ display: 'grid', gridTemplateColumns: chapitres.length > 0 ? '1fr 320px' : '1fr', gap: 20, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card" style={{ padding: 24 }}>
                <p style={{ fontWeight: 500, marginBottom: 6 }}>🎬 Session complète</p>
                <p style={{ fontSize: 14, color: 'var(--ink-muted)', marginBottom: 16 }}>Regarder l'enregistrement intégral.</p>
                <a href={f.lien_video} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                  <button className="btn-primary">Regarder la session →</button>
                </a>
              </div>
              {ressources.length > 0 && (
                <div className="card" style={{ padding: 24 }}>
                  <p style={{ fontWeight: 500, marginBottom: 16 }}>📂 Documents & ressources</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {ressources.map(r => (
                      <a key={r.id} href={r.lien} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--cream)', cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-light)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'var(--cream)'}
                        >
                          <span style={{ fontSize: 20 }}>📄</span>
                          <div style={{ flex: 1 }}><p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{r.titre}</p><p style={{ fontSize: 12, color: 'var(--ink-muted)', margin: 0 }}>{r.type_fichier}</p></div>
                          <span style={{ fontSize: 13, color: 'var(--accent)' }}>↓</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {chapitres.length > 0 && (
              <div className="card" style={{ padding: 20, position: 'sticky', top: 20 }}>
                <p style={{ fontWeight: 500, marginBottom: 14, fontSize: 14 }}>📋 Séquences</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {chapitres.map((ch, i) => (
                   <div key={ch.id} onClick={async () => { const data = await fetch(`${BASE}/video_segments?chapitre_id=eq.${ch.id}&order=created_at.asc`, { headers: H }).then(r => r.json()); if (data.length > 0) { const seg = data[0].segments?.[0]; setPlayerData({ videoId: data[0].youtube_video_id, start: parseTime(seg?.start) }) } }} style={{ cursor: 'pointer' }}>
                      <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', cursor: 'pointer' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-light)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.borderColor = 'var(--border)' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-light)', color: 'var(--accent-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{i + 1}</div>
                          <div style={{ flex: 1 }}><p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{ch.titre}</p>{ch.description && <p style={{ fontSize: 12, color: 'var(--ink-muted)', margin: '2px 0 0' }}>{ch.description}</p>}</div>
                          <span style={{ fontSize: 12, color: 'var(--accent)' }}>▶</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <div style={{ background: 'var(--warm-white)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', height: 64 }}>
          <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: 20, flex: 1 }}>Orevy</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, color: 'var(--ink-muted)' }}>{participant.nom}</span>
            <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={onLogout}>Déconnexion</button>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
        <div className="fade-up" style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 32, marginBottom: 6 }}>Mes formations</h1>
          <p style={{ color: 'var(--ink-muted)', fontSize: 15 }}>Bonjour {participant.nom.split(' ')[0]} — {seen} sur {total} session{total > 1 ? 's' : ''} visionnée{seen > 1 ? 's' : ''}</p>
        </div>
        {total > 0 && (
          <div className="fade-up" style={{ marginBottom: 32 }}>
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.round((seen / total) * 100)}%`, background: 'var(--green)', borderRadius: 99, transition: 'width 0.6s ease' }} />
            </div>
          </div>
        )}
        {loading ? <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-muted)' }}>Chargement…</div>
          : formations.length === 0 ? (
            <div className="card" style={{ padding: '48px 32px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
              <p style={{ color: 'var(--ink-soft)', fontSize: 15 }}>Aucune formation disponible pour le moment.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {formations.map((acces, i) => {
                const f = acces.formations
                return (
                  <div key={acces.id} className="card fade-up" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20, animationDelay: `${0.1 + i * 0.06}s`, cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onClick={() => openFormation(acces)}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
                  >
                    <div style={{ width: 52, height: 52, borderRadius: 10, flexShrink: 0, background: acces.vu ? 'var(--green-light)' : 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                      {acces.vu ? '✓' : '▶'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span className={`badge ${acces.vu ? 'badge-seen' : 'badge-new'}`}>{acces.vu ? 'Vu' : 'Nouveau'}</span>
                        {f.categorie && <span className="badge badge-pending">{f.categorie}</span>}
                      </div>
                      <p style={{ fontWeight: 500, fontSize: 15, marginBottom: 4, color: 'var(--ink)' }}>{f.titre}</p>
                      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                        {f.date_session && <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>📅 {formatDate(f.date_session)}</span>}
                        {f.duree_minutes && <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>⏱ {formatDuration(f.duree_minutes)}</span>}
                      </div>
                    </div>
                    <div style={{ color: 'var(--ink-muted)', fontSize: 18, flexShrink: 0 }}>→</div>
                  </div>
                )
              })}
            </div>
          )}
      </div>
    </div>
  )
}
