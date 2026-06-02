import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDuration(min) {
  if (!min) return ''
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

function FileIcon({ type }) {
  const icons = { PDF: '📄', DOC: '📝', PPT: '📊', VIDEO: '🎬', AUTRE: '📎' }
  return <span>{icons[type] || icons.AUTRE}</span>
}

export default function Dashboard({ participant, onLogout }) {
  const [formations, setFormations] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState(null)
  const [chapitres, setChapitres] = useState([])
  const [ressources, setRessources] = useState([])

  useEffect(() => { loadFormations() }, [])

  async function loadFormations() {
    const { data } = await supabase
      .from('acces_formations')
      .select(`id, vu, date_visionnage, formations (id, titre, description, date_session, duree_minutes, lien_video, categorie)`)
      .eq('participant_id', participant.id)
      .order('created_at', { ascending: false })
    if (data) setFormations(data)
    setLoading(false)
  }

  async function openFormation(acces) {
    // Marquer comme vu
    if (!acces.vu) {
      await supabase.from('acces_formations').update({ vu: true, date_visionnage: new Date().toISOString() }).eq('id', acces.id)
      setFormations(prev => prev.map(f => f.id === acces.id ? { ...f, vu: true } : f))
    }
    // Charger chapitres et ressources
    const fid = acces.formations.id
    const [ch, res] = await Promise.all([
      supabase.from('chapitres').select('*').eq('formation_id', fid).order('ordre'),
      supabase.from('ressources').select('*').eq('formation_id', fid).order('created_at'),
    ])
    setChapitres(ch.data || [])
    setRessources(res.data || [])
    setViewing(acces)
  }

  const seen = formations.filter(f => f.vu).length
  const total = formations.length

  // ===== VUE FORMATION =====
  if (viewing) {
    const f = viewing.formations
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
        {/* Header */}
        <div style={{ background: 'var(--warm-white)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16, height: 60 }}>
            <button onClick={() => setViewing(null)} className="btn-secondary" style={{ padding: '7px 14px', fontSize: 13 }}>← Retour</button>
            <span style={{ fontSize: 14, color: 'var(--ink-soft)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.titre}</span>
            <span className="badge badge-seen">✓ Vu</span>
          </div>
        </div>

        <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
          {/* Titre */}
          <h1 style={{ fontSize: 26, marginBottom: 8 }}>{f.titre}</h1>
          <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
            {f.date_session && <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>📅 {formatDate(f.date_session)}</span>}
            {f.duree_minutes && <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>⏱ {formatDuration(f.duree_minutes)}</span>}
            {f.categorie && <span className="badge badge-pending">{f.categorie}</span>}
          </div>
          {f.description && <p style={{ color: 'var(--ink-soft)', marginBottom: 28, lineHeight: 1.7 }}>{f.description}</p>}

          <div style={{ display: 'grid', gridTemplateColumns: chapitres.length > 0 ? '1fr 340px' : '1fr', gap: 20, alignItems: 'start' }}>

            {/* Colonne principale */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Bouton vidéo complète */}
              <div className="card" style={{ padding: 24 }}>
                <p style={{ fontWeight: 500, marginBottom: 6, color: 'var(--ink)' }}>🎬 Session complète</p>
                <p style={{ fontSize: 14, color: 'var(--ink-muted)', marginBottom: 16 }}>Regarder l'enregistrement intégral de la session Teams.</p>
                <a href={f.lien_video} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                  <button className="btn-primary">Regarder la session →</button>
                </a>
              </div>

              {/* Ressources */}
              {ressources.length > 0 && (
                <div className="card" style={{ padding: 24 }}>
                  <p style={{ fontWeight: 500, marginBottom: 16, color: 'var(--ink)' }}>📂 Documents & ressources</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {ressources.map(r => (
                      <a key={r.id} href={r.lien} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 14px', borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)', background: 'var(--cream)',
                          transition: 'all 0.15s', cursor: 'pointer',
                        }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-light)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'var(--cream)'}
                        >
                          <span style={{ fontSize: 20 }}><FileIcon type={r.type_fichier} /></span>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', margin: 0 }}>{r.titre}</p>
                            <p style={{ fontSize: 12, color: 'var(--ink-muted)', margin: 0 }}>{r.type_fichier}</p>
                          </div>
                          <span style={{ fontSize: 13, color: 'var(--accent)' }}>↓</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Chapitres */}
            {chapitres.length > 0 && (
              <div className="card" style={{ padding: 20, position: 'sticky', top: 20 }}>
                <p style={{ fontWeight: 500, marginBottom: 14, color: 'var(--ink)', fontSize: 14 }}>📋 Séquences de la session</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {chapitres.map((ch, i) => (
                    <a key={ch.id} href={ch.lien} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                      <div style={{
                        padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)', cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-light)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.borderColor = 'var(--border)' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: 'var(--accent-light)', color: 'var(--accent-dark)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 600, flexShrink: 0,
                          }}>{i + 1}</div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', margin: 0 }}>{ch.titre}</p>
                            {ch.description && <p style={{ fontSize: 12, color: 'var(--ink-muted)', margin: '2px 0 0' }}>{ch.description}</p>}
                          </div>
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

  // ===== VUE LISTE =====
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <div style={{ background: 'var(--warm-white)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', height: 64 }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: 20 }}>Orevy</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, color: 'var(--ink-muted)' }}>{participant.nom}</span>
            <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={onLogout}>Déconnexion</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
        <div className="fade-up" style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 32, marginBottom: 6 }}>Mes formations</h1>
          <p style={{ color: 'var(--ink-muted)', fontSize: 15 }}>
            Bonjour {participant.nom.split(' ')[0]} — {seen} sur {total} session{total > 1 ? 's' : ''} visionnée{seen > 1 ? 's' : ''}
          </p>
        </div>

        {total > 0 && (
          <div className="fade-up" style={{ marginBottom: 32 }}>
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.round((seen / total) * 100)}%`, background: 'var(--green)', borderRadius: 99, transition: 'width 0.6s ease' }} />
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-muted)' }}>Chargement…</div>
        ) : formations.length === 0 ? (
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
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
