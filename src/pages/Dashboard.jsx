import { useState, useEffect, useRef } from 'react'

const BASE_F = 'https://yyqppsvihdgmohnuocqr.supabase.co/rest/v1'
const KEY_F = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5cXBwc3ZpaGRnbW9obnVvY3FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTEyMDE4NiwiZXhwIjoyMDk2Njk2MTg2fQ.GVAjwcHDC-IO96BXcrXyZP_mVjrvCcdxdHMKmGuzJ3E'
const H_F = { 'Content-Type': 'application/json', 'apikey': KEY_F, 'Authorization': 'Bearer ' + KEY_F }

// Adresse de contact pour les demandes d'accès depuis le catalogue (à adapter)
const CONTACT_EMAIL = 'david.bucari@gmail.com'

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

// ── Lecteur contenu structuré (formation_blocs + quiz) ────────
// Fallback quand une formation n'a pas de slides SVG mais a des blocs.

function BlocSeq({ c }) {
  return (
    <div style={{ background: `${c.couleur || '#3D8A7A'}12`, border: `2px solid ${c.couleur || '#3D8A7A'}30`, borderRadius: 14, padding: '24px 28px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <span style={{ fontSize: 28 }}>{c.emoji || '📌'}</span>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.couleur || '#3D8A7A', marginBottom: 2 }}>{c.sous || ''}</div>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 22, margin: 0, color: 'var(--ink)' }}>{c.titre}</h2>
        </div>
      </div>
      {c.desc && <p style={{ color: 'var(--ink-soft)', lineHeight: 1.7, marginBottom: c.points?.length ? 16 : 0 }}>{c.desc}</p>}
      {c.points?.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {c.points.map((p, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: 'var(--ink-soft)' }}>
              <span style={{ color: c.couleur || '#3D8A7A', fontWeight: 700, flexShrink: 0 }}>→</span>{p}
            </li>
          ))}
        </ul>
      )}
      {c.tip && (
        <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.7)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--ink-soft)', fontStyle: 'italic' }}>
          💡 {c.tip}
        </div>
      )}
    </div>
  )
}

function BlocTip({ c }) {
  return (
    <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '18px 22px', marginBottom: 16, display: 'flex', gap: 14 }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>{c.emoji || '💡'}</span>
      <div>
        <p style={{ fontWeight: 600, fontSize: 14, color: '#92400E', marginBottom: 6 }}>{c.titre}</p>
        <p style={{ fontSize: 14, color: '#78350F', lineHeight: 1.7 }}>{c.contenu}</p>
      </div>
    </div>
  )
}

function BlocPrincipe({ c }) {
  return (
    <div style={{ background: 'var(--warm-white)', border: `1px solid var(--border)`, borderLeft: `4px solid ${c.couleur || '#7B68AE'}`, borderRadius: '0 12px 12px 0', padding: '16px 20px', marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.couleur || '#7B68AE', marginBottom: 6 }}>Principe {c.num}</div>
      <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)', marginBottom: 6 }}>{c.titre}</p>
      <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.7 }}>{c.desc}</p>
    </div>
  )
}

function BlocErreur({ c }) {
  return (
    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
      <p style={{ fontWeight: 600, fontSize: 13, color: '#991B1B', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>⚠ À éviter</p>
      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(c.items || []).map((item, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: '#7F1D1D' }}>
            <span style={{ flexShrink: 0, marginTop: 2 }}>✗</span>{item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function BlocReflexion({ c }) {
  return (
    <div style={{ background: 'linear-gradient(135deg, #EDE9FE, #F5F3FF)', border: '1px solid #C4B5FD', borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#6D28D9', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>🤔 Question de réflexion</p>
      <p style={{ fontSize: 15, color: '#4C1D95', lineHeight: 1.7, fontStyle: 'italic' }}>{c.question}</p>
    </div>
  )
}

function BlocImage({ c }) {
  if (!c.url) return null
  return (
    <figure style={{ margin: '0 0 20px', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--warm-white)' }}>
      <img src={c.url} alt={c.alt || c.legende || ''} style={{ display: 'block', width: '100%', height: c.hauteur ? `${c.hauteur}px` : 'auto', objectFit: 'cover' }} />
      {c.legende && (
        <figcaption style={{ fontSize: 12, color: 'var(--ink-muted)', fontStyle: 'italic', padding: '8px 14px', borderTop: '1px solid var(--border)' }}>{c.legende}</figcaption>
      )}
    </figure>
  )
}

// Lecteur audio « player narré » : n'apparaît que sur les blocs ayant contenu.audio_url.
// Si contenu.narration est présent, affiche le transcript avec surlignage proportionnel.
function AudioBloc({ audioUrl, narration, couleur }) {
  const col = couleur || '#3D8A7A'
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [cur, setCur] = useState(0)
  const [dur, setDur] = useState(0)

  const phrases = (narration || '').split(/(?<=[.!?…])\s+/).map(s => s.trim()).filter(Boolean)
  const totalChars = phrases.reduce((n, p) => n + p.length, 0) || 1
  let activeIdx = -1
  if (dur > 0 && phrases.length) {
    const LAG = 0.7 // secondes de retard du surlignage (monte à 1.0–1.5 si encore trop vite)
    const frac = Math.min(Math.max((cur - LAG) / dur, 0), 0.999)
    let acc = 0
    for (let i = 0; i < phrases.length; i++) { acc += phrases[i].length / totalChars; if (frac < acc) { activeIdx = i; break } }
    if (activeIdx === -1) activeIdx = phrases.length - 1
  }
  const toggle = () => { const a = audioRef.current; if (!a) return; if (a.paused) { a.play(); setPlaying(true) } else { a.pause(); setPlaying(false) } }
  const fmt = t => { if (!t || isNaN(t)) return '0:00'; const m = Math.floor(t / 60), s = Math.floor(t % 60); return `${m}:${s < 10 ? '0' : ''}${s}` }
  const seek = e => { const a = audioRef.current; if (!a || !dur) return; const r = e.currentTarget.getBoundingClientRect(); a.currentTime = ((e.clientX - r.left) / r.width) * dur }

  return (
    <div style={{ background: `${col}0D`, border: `1px solid ${col}33`, borderRadius: 12, padding: '12px 16px', marginBottom: 12 }}>
      <audio ref={audioRef} src={audioUrl} preload="metadata"
        onLoadedMetadata={e => setDur(e.target.duration)} onTimeUpdate={e => setCur(e.target.currentTime)} onEnded={() => setPlaying(false)} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={toggle} aria-label={playing ? 'Pause' : 'Écouter'}
          style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: col, color: '#fff', fontSize: 15, cursor: 'pointer', flexShrink: 0 }}>
          {playing ? '❚❚' : '▶'}
        </button>
        <div style={{ flex: 1 }}>
          <div onClick={seek} style={{ height: 6, background: `${col}26`, borderRadius: 3, cursor: 'pointer', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${dur ? (cur / dur) * 100 : 0}%`, background: col, borderRadius: 3 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-muted)', marginTop: 4 }}>
            <span>🎧 Écouter la narration</span><span>{fmt(cur)} / {fmt(dur)}</span>
          </div>
        </div>
      </div>
      {phrases.length > 0 && (
        <p style={{ marginTop: 12, marginBottom: 0, fontSize: 14, lineHeight: 1.8 }}>
          {phrases.map((p, i) => (
            <span key={i} style={{ background: i === activeIdx ? `${col}33` : 'transparent', color: i === activeIdx ? 'var(--ink)' : 'var(--ink-soft)', borderRadius: 4, padding: '1px 2px', transition: 'background 0.3s' }}>{p}{' '}</span>
          ))}
        </p>
      )}
    </div>
  )
}

// ── Blocs éditoriaux (retenir / citation / comparaison / essayer) ──
function BlocRetenir({ c }) {
  const points = (c.points || []).filter(p => p && p.trim())
  return (
    <div style={{ background: 'var(--warm-white,#FEF9F6)', border: '1px solid var(--border,#E8E0D8)', borderLeft: '4px solid #3D8A7A', borderRadius: '0 12px 12px 0', padding: '16px 20px', marginBottom: 16 }}>
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3D8A7A', marginBottom: 10 }}>{c.titre || 'À retenir'}</p>
      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {points.map((p, i) => (
          <li key={i} style={{ display: 'flex', gap: 10, fontSize: 14, color: 'var(--ink-soft,#5C4A3A)', lineHeight: 1.6 }}>
            <span style={{ color: '#3D8A7A', flexShrink: 0, marginTop: 1 }}>•</span>{p}
          </li>
        ))}
      </ul>
    </div>
  )
}

function BlocCitation({ c }) {
  return (
    <blockquote style={{ borderLeft: '4px solid #E07A5F', margin: '0 0 16px', padding: '4px 0 4px 20px', fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 17, lineHeight: 1.7, color: '#1E3A5F' }}>
      {(c.texte || '').split('\n').map((l, i) => <span key={i}>{l}<br /></span>)}
    </blockquote>
  )
}

function BlocComparaison({ c }) {
  const plutot = (c.plutot || []).filter(x => x && x.trim())
  const eviter = (c.eviter || []).filter(x => x && x.trim())
  return (
    <div style={{ marginBottom: 16 }}>
      {c.intro && <p style={{ fontSize: 14, color: 'var(--ink-soft,#5C4A3A)', lineHeight: 1.7, marginBottom: 12 }}>{c.intro}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ background: '#3D8A7A12', border: '1px solid #3D8A7A30', borderRadius: 12, padding: '14px 16px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#2E6B5E', marginBottom: 8 }}>Plutôt</p>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {plutot.map((x, i) => <li key={i} style={{ fontSize: 13.5, color: 'var(--ink-soft,#5C4A3A)', lineHeight: 1.5 }}>✓ {x}</li>)}
          </ul>
        </div>
        <div style={{ background: '#E07A5F12', border: '1px solid #E07A5F30', borderRadius: 12, padding: '14px 16px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#B0492F', marginBottom: 8 }}>À éviter</p>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {eviter.map((x, i) => <li key={i} style={{ fontSize: 13.5, color: 'var(--ink-soft,#5C4A3A)', lineHeight: 1.5 }}>✗ {x}</li>)}
          </ul>
        </div>
      </div>
    </div>
  )
}

function BlocEssayer({ c }) {
  const etapes = c.etapes || []
  return (
    <div style={{ background: '#E07A5F10', border: '1px solid #E07A5F30', borderRadius: 14, padding: '20px 24px', marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#E07A5F', marginBottom: 8 }}>{c.label || 'À essayer cette semaine'}</div>
      {c.titre && <h3 style={{ fontSize: 16, color: 'var(--ink,#3D2318)', margin: '0 0 12px' }}>{c.titre}</h3>}
      <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8, margin: 0 }}>
        {etapes.map((e, i) => (
          <li key={i} style={{ fontSize: 14, color: 'var(--ink-soft,#5C4A3A)', lineHeight: 1.6 }}>
            {e.titre && <strong style={{ color: 'var(--ink,#3D2318)' }}>{e.titre} </strong>}{e.texte}
          </li>
        ))}
      </ol>
      {c.note && <p style={{ fontSize: 13, color: 'var(--ink-muted,#A0887A)', marginTop: 12, fontStyle: 'italic' }}>{c.note}</p>}
    </div>
  )
}

function renderBloc(b) {
  const c = b.contenu || {}
  switch (b.type) {
    case 'seq':       return <BlocSeq key={b.id} c={c} />
    case 'tip':       return <BlocTip key={b.id} c={c} />
    case 'principe':  return <BlocPrincipe key={b.id} c={c} />
    case 'erreur':    return <BlocErreur key={b.id} c={c} />
    case 'reflexion': return <BlocReflexion key={b.id} c={c} />
    case 'image':     return <BlocImage key={b.id} c={c} />
    case 'retenir':     return <BlocRetenir key={b.id} c={c} />
    case 'citation':    return <BlocCitation key={b.id} c={c} />
    case 'comparaison': return <BlocComparaison key={b.id} c={c} />
    case 'essayer':     return <BlocEssayer key={b.id} c={c} />
    default: return null
  }
}

// Enveloppe chaque bloc : ajoute le lecteur audio au-dessus si contenu.audio_url existe.
function renderBlocAudio(b) {
  const c = b.contenu || {}
  return (
    <div key={b.id}>
      {c.audio_url && <AudioBloc audioUrl={c.audio_url} narration={c.narration} couleur={c.couleur} />}
      {renderBloc(b)}
    </div>
  )
}

function BlocsQuiz({ questions, formation, participant, onFinish }) {
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)

  const seuil = Math.ceil(questions.length * 0.7)
  const score = submitted ? questions.filter(q => answers[q.id] === q.answer).length : 0
  const passed = score >= seuil

  function handleSubmit() {
    if (Object.keys(answers).length < questions.length) {
      alert('Veuillez répondre à toutes les questions avant de valider.')
      return
    }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 24px' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>{passed ? '🏅' : '📚'}</div>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 28, marginBottom: 8 }}>
          {passed ? 'Félicitations !' : 'Continuez vos efforts'}
        </h2>
        <p style={{ color: 'var(--ink-muted)', fontSize: 16, marginBottom: 24 }}>
          Score : {score}/{questions.length} — {passed ? 'Formation validée ✓' : `Seuil de réussite : ${seuil}/${questions.length}`}
        </p>
        {questions.map((q, i) => {
          const correct = answers[q.id] === q.answer
          return (
            <div key={q.id} style={{ textAlign: 'left', background: correct ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${correct ? '#BBF7D0' : '#FECACA'}`, borderRadius: 10, padding: '14px 18px', marginBottom: 10 }}>
              <p style={{ fontWeight: 500, fontSize: 14, marginBottom: 6, color: correct ? '#166534' : '#991B1B' }}>
                {correct ? '✓' : '✗'} {i + 1}. {q.question}
              </p>
              {!correct && <p style={{ fontSize: 13, color: '#991B1B', marginBottom: 4 }}>Votre réponse : {q.choices[answers[q.id]]}</p>}
              <p style={{ fontSize: 13, color: '#166534', fontWeight: 500, marginBottom: 4 }}>Bonne réponse : {q.choices[q.answer]}</p>
              <p style={{ fontSize: 13, color: 'var(--ink-muted)', fontStyle: 'italic' }}>{q.feedback}</p>
            </div>
          )
        })}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
          {passed && (
            <button className="btn-primary" onClick={() => printCertificat(formation, participant, score, questions.length)}>
              🖨 Télécharger l'attestation
            </button>
          )}
          {!passed && (
            <button className="btn-secondary" onClick={() => { setAnswers({}); setSubmitted(false) }}>
              Réessayer
            </button>
          )}
          <button className="btn-secondary" onClick={onFinish}>← Retour à mes formations</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <span style={{ background: '#EDE9FE', color: '#6D28D9', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 14px', borderRadius: 20 }}>
          Quiz final — {questions.length} questions
        </span>
        <p style={{ color: 'var(--ink-muted)', fontSize: 13, marginTop: 8 }}>Seuil de réussite : {seuil}/{questions.length} pour obtenir l'attestation</p>
      </div>
      {questions.map((q, i) => (
        <div key={q.id} className="card" style={{ padding: '18px 20px', marginBottom: 14 }}>
          <p style={{ fontWeight: 500, fontSize: 15, marginBottom: 14, color: 'var(--ink)' }}>{i + 1}. {q.question}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(q.choices || []).map((choice, ci) => {
              const selected = answers[q.id] === ci
              return (
                <button key={ci} onClick={() => setAnswers(prev => ({ ...prev, [q.id]: ci }))}
                  style={{ textAlign: 'left', padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border)'}`, background: selected ? 'var(--accent-light)' : 'var(--warm-white)', fontSize: 14, color: selected ? 'var(--accent-dark)' : 'var(--ink-soft)', fontWeight: selected ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
                  {choice}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button className="btn-primary" onClick={handleSubmit}>
          Valider mes réponses →
        </button>
      </div>
    </div>
  )
}

function printCertificat(formation, participant, score, total) {
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const nom = participant?.nom || 'Le titulaire'
  const win = window.open('', '_blank')
  win.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Attestation</title>
  <style>
    body{margin:0;padding:40px;background:#FAF8F4;font-family:Georgia,serif;display:flex;justify-content:center}
    .cert{max-width:680px;width:100%;background:#fff;border:2px solid #E8E4DE;border-radius:16px;padding:60px;text-align:center;box-shadow:0 8px 40px rgba(0,0,0,0.08)}
    h1{font-family:Georgia,serif;font-size:2rem;color:#1A1714;margin:0 0 8px}
    .sub{color:#C8622A;font-size:0.8rem;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:32px}
    .nom{font-family:Georgia,serif;font-size:1.8rem;color:#C8622A;font-style:italic;margin:20px 0}
    .titre{font-size:1.1rem;font-weight:600;color:#1A1714;margin:16px 0 8px}
    .date{color:#9A948E;font-size:0.88rem;margin-bottom:32px}
    .sig{border-top:1px solid #E8E4DE;padding-top:20px;margin-top:32px;font-size:0.8rem;color:#9A948E}
    @media print{body{background:white}.cert{box-shadow:none}}
  </style></head><body><div class="cert">
  <div style="font-size:3rem;margin-bottom:20px">🏅</div>
  <div class="sub">Attestation de formation</div>
  <h1>Certificat de réussite</h1>
  <p style="color:#9A948E;font-size:0.9rem;margin:0 0 4px">Cette attestation certifie que</p>
  <div class="nom">${nom}</div>
  <p style="color:#9A948E;font-size:0.9rem;margin:0 0 4px">a suivi et validé avec succès la formation</p>
  <div class="titre">${formation?.titre || 'Formation Orevy'}</div>
  <div class="date">le ${date}</div>
  <p style="font-size:0.83rem;color:#9A948E;line-height:1.7;max-width:480px;margin:0 auto 24px">
    Score obtenu : ${score}/${total} au quiz d'évaluation final.<br>
    Formation dispensée dans le cadre du développement des compétences professionnelles en petite enfance.
  </p>
  <div class="sig">David Bucari · Éducateur de jeunes enfants · Formateur petite enfance<br>Orevy Formations — Formation en ligne</div>
  <div style="margin-top:24px"><button onclick="window.print()" style="background:#C8622A;color:white;border:none;padding:10px 24px;border-radius:8px;font-weight:600;cursor:pointer;font-size:0.88rem">🖨 Imprimer / Sauvegarder en PDF</button></div>
  </div></body></html>`)
  win.document.close()
}

function BlocsReader({ formation, participant, onClose }) {
  const [loading, setLoading] = useState(true)
  const [blocs, setBlocs] = useState([])
  const [quiz, setQuiz] = useState([])
  const [activeModule, setActiveModule] = useState(null)
  const [showQuiz, setShowQuiz] = useState(false)
  const topRef = useRef(null)

  // Remonte en haut du contenu à chaque changement de module / passage au quiz
  const goTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [b, q] = await Promise.all([
      dbGet('formation_blocs', `?formation_id=eq.${formation.id}&order=sequence_num.asc,ordre.asc`),
      dbGet('formation_quiz',  `?formation_id=eq.${formation.id}&order=module_num.asc,ordre.asc`),
    ])
    setBlocs(b); setQuiz(q); setLoading(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)' }}>
      <div style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <p>Chargement de la formation…</p>
      </div>
    </div>
  )

  if (!blocs.length) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'var(--cream)' }}>
      <div style={{ fontSize: 32 }}>⚠️</div>
      <p style={{ color: 'var(--ink-muted)' }}>Aucun contenu disponible pour cette formation.</p>
      <button className="btn-secondary" onClick={onClose}>← Retour</button>
    </div>
  )

  const modules = [...new Set(blocs.map(b => b.sequence_num))].sort((a, b) => a - b)
  const current = modules.includes(activeModule) ? activeModule : modules[0]
  const hasQuiz = quiz.length > 0
  const blocsModule = blocs.filter(b => b.sequence_num === current)
  const couleur1 = formation.couleur1 || '#E07A5F'
  const couleur2 = formation.couleur2 || '#3D8A7A'
  const isLastModule = current === modules[modules.length - 1]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <div style={{ background: 'var(--warm-white)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16, height: 60 }}>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '7px 14px', fontSize: 13, flexShrink: 0 }}>← Retour</button>
          <span style={{ fontSize: 14, color: 'var(--ink-soft)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formation.titre}</span>
          <span style={{ background: `${couleur1}20`, color: couleur1, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>E-learning</span>
        </div>
      </div>

      <div style={{ background: `linear-gradient(135deg, ${couleur1}, ${couleur2})`, padding: '32px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>{formation.emoji || '📚'}</div>
          <h1 style={{ fontFamily: 'Georgia, serif', color: '#fff', fontSize: 26, margin: '0 0 8px' }}>{formation.titre}</h1>
          {formation.description && <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>{formation.description}</p>}
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 8 }}>{modules.length} module{modules.length > 1 ? 's' : ''}{hasQuiz ? ' · Quiz final' : ''}</p>
        </div>
      </div>

      <div ref={topRef} style={{ background: 'var(--warm-white)', borderBottom: '1px solid var(--border)', scrollMarginTop: 60 }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px', display: 'flex', gap: 4, overflowX: 'auto' }}>
          {modules.map((n, i) => (
            <button key={n} onClick={() => { setActiveModule(n); setShowQuiz(false); goTop() }}
              style={{ padding: '14px 18px', fontSize: 13, fontWeight: !showQuiz && current === n ? 700 : 500, color: !showQuiz && current === n ? couleur1 : 'var(--ink-muted)', background: 'none', border: 'none', borderBottom: !showQuiz && current === n ? `2px solid ${couleur1}` : '2px solid transparent', borderRadius: 0, whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.15s' }}>
              📖 Module {i + 1}
            </button>
          ))}
          {hasQuiz && (
            <button onClick={() => { setShowQuiz(true); goTop() }}
              style={{ padding: '14px 18px', fontSize: 13, fontWeight: showQuiz ? 700 : 500, color: showQuiz ? '#6D28D9' : 'var(--ink-muted)', background: 'none', border: 'none', borderBottom: showQuiz ? '2px solid #6D28D9' : '2px solid transparent', borderRadius: 0, whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.15s' }}>
              📝 Quiz final
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
        {showQuiz
          ? <BlocsQuiz questions={quiz} formation={formation} participant={participant} onFinish={onClose} />
          : blocsModule.map(b => renderBlocAudio(b))
        }
        {!showQuiz && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, flexWrap: 'wrap', gap: 12 }}>
            {current > modules[0] && (
              <button className="btn-secondary" onClick={() => { setActiveModule(modules[modules.indexOf(current) - 1]); goTop() }}>← Module précédent</button>
            )}
            <div style={{ flex: 1 }} />
            {!isLastModule ? (
              <button className="btn-primary" onClick={() => { setActiveModule(modules[modules.indexOf(current) + 1]); goTop() }}>Module suivant →</button>
            ) : hasQuiz ? (
              <button className="btn-primary" onClick={() => { setShowQuiz(true); goTop() }} style={{ background: '#6D28D9' }}>Passer au quiz final →</button>
            ) : (
              <button className="btn-primary" onClick={onClose}>Terminer ✓</button>
            )}
          </div>
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
  const [blocsMode, setBlocsMode] = useState(null)   // formation object (contenu formation_blocs)
  const [chapitres, setChapitres] = useState([])
  const [ressources, setRessources] = useState([])
  const [tab, setTab] = useState('mes')            // 'mes' | 'catalogue'
  const [catalogue, setCatalogue] = useState(null) // toutes les formations (chargé à la demande)
  const [catLoading, setCatLoading] = useState(false)

  useEffect(() => { loadFormations() }, [])

  async function loadFormations() {
    const accesData = await dbGet('acces_formations', `?participant_id=eq.${participant.id}`)
    if (!accesData.length) { setLoading(false); return }

    const formationIds = accesData.map(a => a.formation_id)
    const formationsData = await dbGet('formations', `?id=in.(${formationIds.join(',')})`)

    const merged = accesData.map(a => ({
      ...a,
      formations: formationsData.find(f => f.id === a.formation_id) || {}
    }))
    setFormations(merged)
    setLoading(false)
  }

  async function loadCatalogue() {
    if (catalogue !== null) return
    setCatLoading(true)
    const all = await dbGet('formations', '?order=ordre.asc')
    setCatalogue(all)
    setCatLoading(false)
  }

  function openFromCatalogue(f) {
    const acces = formations.find(a => a.formation_id === f.id)
    if (acces) openFormation(acces)
  }

  async function openFormation(acces) {
    if (!acces.vu) {
      await dbPatch('acces_formations', `id=eq.${acces.id}`, { vu: true, date_visionnage: new Date().toISOString() })
      setFormations(prev => prev.map(f => f.id === acces.id ? { ...f, vu: true } : f))
    }

    const f = acces.formations

    // Détection du mode : slides SVG → sinon blocs structurés → sinon vidéo Teams
    const slides = await dbGet('slides', `?formation_id=eq.${f.id}&limit=1`)
    if (slides.length > 0) {
      setElearning(f)
      return
    }
    const blocs = await dbGet('formation_blocs', `?formation_id=eq.${f.id}&limit=1`)
    if (blocs.length > 0) {
      setBlocsMode(f)
      return
    }
    // Mode vidéo (Teams)
    const fid = acces.formation_id
    const [ch, res] = await Promise.all([
      dbGet('chapitres', `?formation_id=eq.${fid}&order=ordre.asc`),
      dbGet('ressources', `?formation_id=eq.${fid}&order=created_at.asc`),
    ])
    setChapitres(ch); setRessources(res); setViewing(acces)
  }

  const seen = formations.filter(f => f.vu).length
  const total = formations.length

  // Vue e-learning (slides SVG)
  if (elearning) {
    return <ElearningReader formation={elearning} onClose={() => setElearning(null)} />
  }

  // Vue e-learning (contenu formation_blocs)
  if (blocsMode) {
    return <BlocsReader formation={blocsMode} participant={participant} onClose={() => setBlocsMode(null)} />
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
            {f.reference && <span className="badge" style={{ fontFamily: 'monospace', fontWeight: 600 }}>{f.reference}</span>}{f.categorie && <span className="badge badge-pending">{f.categorie}</span>}
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

  // Vue liste + catalogue (espace apprenant)
  const accessibleIds = new Set(formations.map(a => a.formation_id))
  const grouped = (catalogue || []).reduce((acc, f) => {
    const cat = f.categorie || 'Autres'
    ;(acc[cat] = acc[cat] || []).push(f)
    return acc
  }, {})

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
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px', display: 'flex', gap: 4 }}>
          {[['mes', 'Mes formations'], ['catalogue', 'Catalogue']].map(([key, label]) => (
            <button key={key} onClick={() => { setTab(key); if (key === 'catalogue') loadCatalogue() }}
              style={{ padding: '12px 16px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === key ? 'var(--accent)' : 'transparent'}`, color: tab === key ? 'var(--accent)' : 'var(--ink-muted)', fontWeight: tab === key ? 600 : 500, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'mes' && (
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
                          {f.reference && <span className="badge" style={{ fontFamily: 'monospace', fontWeight: 600 }}>{f.reference}</span>}{f.categorie && <span className="badge badge-pending">{f.categorie}</span>}
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
      )}

      {tab === 'catalogue' && (
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
          <div className="fade-up" style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 32, marginBottom: 6 }}>Catalogue des formations</h1>
            <p style={{ color: 'var(--ink-muted)', fontSize: 15 }}>Toutes les formations proposées par Orevy.</p>
          </div>
          {catLoading || catalogue === null ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-muted)' }}>Chargement…</div>
          ) : catalogue.length === 0 ? (
            <div className="card" style={{ padding: '48px 32px', textAlign: 'center' }}>
              <p style={{ color: 'var(--ink-soft)', fontSize: 15 }}>Le catalogue est vide pour le moment.</p>
            </div>
          ) : (
            Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} style={{ marginBottom: 32 }}>
                <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 12 }}>{cat}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                  {items.map((f, i) => {
                    const owned = accessibleIds.has(f.id)
                    return (
                      <div key={f.id} className="card fade-up" style={{ padding: '20px 24px', animationDelay: `${0.05 + i * 0.05}s` }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                          <div style={{ width: 48, height: 48, borderRadius: 10, flexShrink: 0, background: owned ? 'var(--green-light)' : 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                            {owned ? '✓' : '📚'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                              {owned
                                ? <span className="badge badge-seen">Accessible</span>
                                : <span className="badge badge-pending">Sur demande</span>}
                              {f.reference && <span className="badge" style={{ fontFamily: 'monospace', fontWeight: 600 }}>{f.reference}</span>}
                              {f.duree_minutes && <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>⏱ {formatDuration(f.duree_minutes)}</span>}
                            </div>
                            <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 6, color: 'var(--ink)' }}>{f.titre}</p>
                            {f.description && <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: 14 }}>{f.description}</p>}
                            {owned ? (
                              <button className="btn-primary" style={{ fontSize: 13, padding: '8px 16px' }} onClick={() => openFromCatalogue(f)}>Ouvrir la formation →</button>
                            ) : (
                              <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Demande d\'accès — ' + f.titre)}&body=${encodeURIComponent('Bonjour,\n\nJe souhaite accéder à la formation « ' + f.titre + ' ».\n\n' + participant.nom)}`} style={{ textDecoration: 'none' }}>
                                <button className="btn-secondary" style={{ fontSize: 13, padding: '8px 16px' }}>Demander l'accès</button>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
