import { useState, useEffect } from 'react'

const BASE_F = 'https://yyqppsvihdgmohnuocqr.supabase.co/rest/v1'
const KEY_F = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5cXBwc3ZpaGRnbW9obnVvY3FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTEyMDE4NiwiZXhwIjoyMDk2Njk2MTg2fQ.GVAjwcHDC-IO96BXcrXyZP_mVjrvCcdxdHMKmGuzJ3E'
const H_F = { 'Content-Type': 'application/json', 'apikey': KEY_F, 'Authorization': 'Bearer ' + KEY_F }

async function dbGet(table, params = '') {
  const r = await fetch(`${BASE_F}/${table}${params}`, { headers: H_F })
  return r.ok ? await r.json() : []
}
async function dbPatch(table, filter, body) {
  await fetch(`${BASE_F}/${table}?${filter}`, { method: 'PATCH', headers: { ...H_F, 'Prefer': 'return=minimal' }, body: JSON.stringify(body) })
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

// ── Lecteur e-learning slides SVG ─────────────────────────────

function ElearningReader({ formation, onClose }) {
  const [sequences, setSequences] = useState([]) // { seq_num, slides[] }
  const [activeSeq, setActiveSeq] = useState(0)
  const [activeSlide, setActiveSlide] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    function onFsChange() { setIsFullscreen(!!document.fullscreenElement) }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  useEffect(() => {
    loadSlides()
  }, [])

  async function loadSlides() {
    const slides = await dbGet('slides', `?formation_id=eq.${formation.id}&order=sequence_num.asc,ordre.asc`)
    if (!slides.length) { setLoading(false); return }

    // Grouper par sequence_num
    const seqMap = {}
    slides.forEach(s => {
      if (!seqMap[s.sequence_num]) seqMap[s.sequence_num] = []
      seqMap[s.sequence_num].push(s)
    })
    const grouped = Object.entries(seqMap)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([num, slides]) => ({ seq_num: Number(num), slides }))

    setSequences(grouped)
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#1A1614', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#A0887A', fontSize: 14 }}>Chargement des slides…</div>
      </div>
    )
  }

  if (!sequences.length) {
    return (
      <div style={{ minHeight: '100vh', background: '#1A1614', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ color: '#A0887A', fontSize: 14 }}>Aucune slide disponible pour cette formation.</div>
        <button onClick={onClose} className="btn-secondary" style={{ fontSize: 13, padding: '8px 16px' }}>← Retour</button>
      </div>
    )
  }

  const currentSeq = sequences[activeSeq]
  const currentSlide = currentSeq?.slides[activeSlide]
  const totalSlides = currentSeq?.slides.length || 0
  const isFirst = activeSlide === 0
  const isLast = activeSlide === totalSlides - 1
  const isLastSeq = activeSeq === sequences.length - 1

  function prev() {
    if (!isFirst) setActiveSlide(s => s - 1)
    else if (activeSeq > 0) {
      const prevSeq = sequences[activeSeq - 1]
      setActiveSeq(s => s - 1)
      setActiveSlide(prevSeq.slides.length - 1)
    }
  }

  function next() {
    if (!isLast) setActiveSlide(s => s + 1)
    else if (!isLastSeq) {
      setActiveSeq(s => s + 1)
      setActiveSlide(0)
    }
  }

  function goToSeq(i) {
    setActiveSeq(i)
    setActiveSlide(0)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1A1614', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: '#2A1E1A', borderBottom: '1px solid #3D2318', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16, height: 56, flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'none', border: '1px solid #3D2318', color: '#A0887A', padding: '6px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>← Retour</button>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <span style={{ fontSize: 14, color: '#FAF8F4', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{formation.titre}</span>
        </div>
        <span style={{ fontSize: 12, color: '#A0887A', flexShrink: 0 }}>
          Séq. {currentSeq?.seq_num} · {activeSlide + 1}/{totalSlides}
        </span>
        <button onClick={toggleFullscreen} title={isFullscreen ? 'Quitter le plein écran (Esc)' : 'Plein écran'} style={{ background: 'none', border: '1px solid #3D2318', color: '#A0887A', padding: '6px 10px', borderRadius: 6, fontSize: 15, cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}>
          {isFullscreen ? '✕' : '⛶'}
        </button>
      </div>

      {/* Nav séquences */}
      <div style={{ background: '#2A1E1A', borderBottom: '1px solid #3D2318', padding: '0 24px', display: 'flex', gap: 4, overflowX: 'auto', flexShrink: 0 }}>
        {sequences.map((seq, i) => (
          <button key={seq.seq_num} onClick={() => goToSeq(i)} style={{
            padding: '10px 20px', background: 'none', border: 'none',
            borderBottom: `3px solid ${activeSeq === i ? '#E07A5F' : 'transparent'}`,
            color: activeSeq === i ? '#E07A5F' : '#A0887A',
            fontFamily: 'Georgia, serif', fontSize: 13, cursor: 'pointer',
            whiteSpace: 'nowrap', transition: 'color 0.2s'
          }}>
            Séquence {seq.seq_num}
          </button>
        ))}
      </div>

      {/* Slide principale */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '24px 16px', overflowY: 'auto' }}>
        {currentSlide && (
          <div style={{ width: '100%', maxWidth: 1000, background: '#2A1E1A', borderRadius: 12, overflow: 'hidden', border: '1px solid #3D2318', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            {currentSlide.titre && (
              <div style={{ padding: '10px 16px', fontSize: 11, letterSpacing: 1, color: '#A0887A', borderBottom: '1px solid #3D2318', fontFamily: 'monospace' }}>
                {currentSlide.titre}
              </div>
            )}
            <div
              style={{ width: '100%' }}
              dangerouslySetInnerHTML={{ __html: `<div style="width:100%">${currentSlide.svg_content.replace(/<svg/, '<svg style="width:100%;height:auto;display:block"')}</div>` }}
            />
          </div>
        )}

        {/* Navigation slides */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 20 }}>
          <button
            onClick={prev}
            disabled={isFirst && activeSeq === 0}
            style={{ padding: '10px 22px', background: '#2A1E1A', border: '1px solid #3D2318', color: '#FAF8F4', borderRadius: 8, fontSize: 14, cursor: 'pointer', opacity: (isFirst && activeSeq === 0) ? 0.3 : 1, fontFamily: 'inherit' }}
          >← Préc.</button>

          {/* Dots */}
          <div style={{ display: 'flex', gap: 6 }}>
            {currentSeq?.slides.map((_, i) => (
              <button key={i} onClick={() => setActiveSlide(i)} style={{
                width: i === activeSlide ? 20 : 8, height: 8, borderRadius: 99,
                background: i === activeSlide ? '#E07A5F' : '#3D2318',
                border: 'none', cursor: 'pointer', transition: 'all 0.2s', padding: 0
              }} />
            ))}
          </div>

          {isLast && isLastSeq ? (
            <button
              onClick={onClose}
              style={{ padding: '10px 22px', background: '#E07A5F', border: 'none', color: '#fff', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}
            >Terminer ✓</button>
          ) : (
            <button
              onClick={next}
              style={{ padding: '10px 22px', background: '#E07A5F', border: 'none', color: '#fff', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
            >Suiv. →</button>
          )}
        </div>

        {/* Infographie dispo ? (si la slide actuelle n'est pas déjà l'infographie) */}
        {currentSlide?.type !== 'infographie' && currentSeq?.slides[0]?.type === 'infographie' && (
          <button
            onClick={() => setActiveSlide(0)}
            style={{ marginTop: 12, background: 'none', border: '1px dashed #3D2318', color: '#A0887A', padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            📋 Voir l'infographie récapitulative
          </button>
        )}
      </div>
    </div>
  )
}

// ── Dashboard principal ───────────────────────────────────────

export default function Dashboard({ participant, onLogout }) {
  const [formations, setFormations] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState(null)       // acces object (type video)
  const [elearning, setElearning] = useState(null)   // formation object (type elearning)
  const [chapitres, setChapitres] = useState([])
  const [ressources, setRessources] = useState([])

  useEffect(() => { loadFormations() }, [])

  async function loadFormations() {
    const accesData = await dbGet('acces_formations', `?participant_id=eq.${participant.id}`)
    if (!accesData.length) { setLoading(false); return }

    const formationIds = accesData.map(a => a.formation_id)
    // UUIDs must be quoted inside in() for PostgREST to parse them correctly
    const formationsData = await dbGet('formations', `?id=in.("${formationIds.join('","')}")`)

    const merged = accesData.map(a => ({
      ...a,
      formations: formationsData.find(f => f.id === a.formation_id) || {}
    }))
    setFormations(merged)
    setLoading(false)
  }

  async function openFormation(acces) {
    if (!acces.vu) {
      await dbPatch('acces_formations', `id=eq.${acces.id}`, { vu: true, date_visionnage: new Date().toISOString() })
      setFormations(prev => prev.map(f => f.id === acces.id ? { ...f, vu: true } : f))
    }

    const f = acces.formations

    // Déterminer le mode : si la formation a des slides → e-learning, sinon → video
    const slides = await dbGet('slides', `?formation_id=eq.${f.id}&limit=1`)
    if (slides.length > 0) {
      // Mode e-learning
      setElearning(f)
    } else {
      // Mode vidéo (ancien comportement)
      const fid = acces.formation_id
      const [ch, res] = await Promise.all([
        dbGet('chapitres', `?formation_id=eq.${fid}&order=ordre.asc`),
        dbGet('ressources', `?formation_id=eq.${fid}&order=created_at.asc`),
      ])
      setChapitres(ch); setRessources(res); setViewing(acces)
    }
  }

  const seen = formations.filter(f => f.vu).length
  const total = formations.length

  // Vue e-learning
  if (elearning) {
    return <ElearningReader formation={elearning} onClose={() => setElearning(null)} />
  }

  // Vue vidéo
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
                    <a key={ch.id} href={ch.lien} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
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
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Vue liste formations
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
