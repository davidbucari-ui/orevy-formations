import { useRef, useState } from 'react'

/* Blocs éditoriaux des formations e-learning (table formation_blocs).
   Chaque bloc a un type et un contenu JSON ; un contenu.audio_url ajoute
   un lecteur de narration au-dessus du bloc. */

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

export function Bloc({ b }) {
  const c = b.contenu || {}
  return (
    <div>
      {c.audio_url && <AudioBloc audioUrl={c.audio_url} narration={c.narration} couleur={c.couleur} />}
      {renderBloc(b)}
    </div>
  )
}

export const TYPES_BLOCS = ['seq', 'tip', 'principe', 'erreur', 'reflexion', 'image', 'retenir', 'citation', 'comparaison', 'essayer']
