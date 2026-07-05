import { useState, useEffect } from 'react'

// ── Projet Formations yyqpp — accès direct
const F_BASE = 'https://yyqppsvihdgmohnuocqr.supabase.co/rest/v1'
const F_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5cXBwc3ZpaGRnbW9obnVvY3FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMjAxODYsImV4cCI6MjA5NjY5NjE4Nn0.mzejn3GMcVF4grWp9BbpW9p2p_7zK8F9yefO4MRr8qg'
const F_H = { 'Content-Type': 'application/json', 'apikey': F_KEY, 'Authorization': 'Bearer ' + F_KEY }

async function fGet(table, params = '') {
  const r = await fetch(`${F_BASE}/${table}${params}`, { headers: F_H })
  return r.ok ? r.json() : []
}

// ── Rendu d'un bloc selon son type ──────────────────────────
function BlocSeq({ c }) {
  return (
    <div style={{ background: `${c.couleur || '#3B82F6'}12`, border: `2px solid ${c.couleur || '#3B82F6'}30`, borderRadius: 14, padding: '24px 28px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <span style={{ fontSize: 28 }}>{c.emoji || '📌'}</span>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.couleur || '#3B82F6', marginBottom: 2 }}>{c.sous || ''}</div>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, margin: 0, color: 'var(--ink)' }}>{c.titre}</h2>
        </div>
      </div>
      {c.desc && <p style={{ color: 'var(--ink-soft)', lineHeight: 1.7, marginBottom: c.points?.length ? 16 : 0 }}>{c.desc}</p>}
      {c.points?.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {c.points.map((p, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: 'var(--ink-soft)' }}>
              <span style={{ color: c.couleur || '#3B82F6', fontWeight: 700, flexShrink: 0 }}>→</span>{p}
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
    <div style={{ background: 'var(--warm-white)', border: `1px solid var(--border)`, borderLeft: `4px solid ${c.couleur || '#7C3AED'}`, borderRadius: '0 12px 12px 0', padding: '16px 20px', marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.couleur || '#7C3AED', marginBottom: 6 }}>Principe {c.num}</div>
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

function renderBloc(b) {
  const c = b.contenu || {}
  switch (b.type) {
    case 'seq':       return <BlocSeq key={b.id} c={c} />
    case 'tip':       return <BlocTip key={b.id} c={c} />
    case 'principe':  return <BlocPrincipe key={b.id} c={c} />
    case 'erreur':    return <BlocErreur key={b.id} c={c} />
    case 'reflexion': return <BlocReflexion key={b.id} c={c} />
    default: return null
  }
}

// ── Composant Quiz ───────────────────────────────────────────
function Quiz({ questions, formation, participant, onFinish }) {
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)

  const score = submitted
    ? questions.filter(q => answers[q.id] === q.answer).length
    : 0
  const passed = score >= 7

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
        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 28, marginBottom: 8 }}>
          {passed ? 'Félicitations !' : 'Continuez vos efforts'}
        </h2>
        <p style={{ color: 'var(--ink-muted)', fontSize: 16, marginBottom: 24 }}>
          Score : {score}/{questions.length} — {passed ? 'Formation validée ✓' : 'Seuil de réussite : 7/10'}
        </p>
        {questions.map((q, i) => {
          const correct = answers[q.id] === q.answer
          return (
            <div key={q.id} style={{ textAlign: 'left', background: correct ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${correct ? '#BBF7D0' : '#FECACA'}`, borderRadius: 10, padding: '14px 18px', marginBottom: 10 }}>
              <p style={{ fontWeight: 500, fontSize: 14, marginBottom: 6, color: correct ? '#166534' : '#991B1B' }}>
                {correct ? '✓' : '✗'} {i + 1}. {q.question}
              </p>
              {!correct && <p style={{ fontSize: 13, color: '#991B1B', marginBottom: 4 }}>Votre réponse : {q.choices[answers[q.id]]}</p>}
              <p style={{ fontSize: 13, color: correct ? '#166534' : '#166534', fontWeight: 500, marginBottom: 4 }}>Bonne réponse : {q.choices[q.answer]}</p>
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
        <p style={{ color: 'var(--ink-muted)', fontSize: 13, marginTop: 8 }}>Seuil de réussite : 7/{questions.length} pour obtenir l'attestation</p>
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
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body{margin:0;padding:40px;background:#FAF8F4;font-family:'DM Sans',sans-serif;display:flex;justify-content:center}
    .cert{max-width:680px;width:100%;background:#fff;border:2px solid #E8E4DE;border-radius:16px;padding:60px;text-align:center;box-shadow:0 8px 40px rgba(0,0,0,0.08)}
    h1{font-family:'DM Serif Display',serif;font-size:2rem;color:#1A1714;margin:0 0 8px}
    .sub{color:#C8622A;font-size:0.8rem;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:32px}
    .nom{font-family:'DM Serif Display',serif;font-size:1.8rem;color:#C8622A;font-style:italic;margin:20px 0}
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

// ── Composant principal ──────────────────────────────────────
export default function ElearningReader({ formation, participant, onBack }) {
  const [loading, setLoading] = useState(true)
  const [blocs, setBlocs] = useState([])
  const [quiz, setQuiz] = useState([])
  const [activeModule, setActiveModule] = useState(1)
  const [showQuiz, setShowQuiz] = useState(false)
  const [fData, setFData] = useState(null)

  // formation.elearning_slug est le slug dans yyqpp
  const slug = formation?.elearning_slug

  useEffect(() => {
    if (!slug) { setLoading(false); return }
    load()
  }, [slug])

  async function load() {
    setLoading(true)
    try {
      const [fRows, blocsRows, quizRows] = await Promise.all([
        fGet('formations', `?slug=eq.${slug}&limit=1`),
        fGet('formation_blocs', `?formations.slug=eq.${slug}&order=sequence_num.asc,ordre.asc`),
        fGet('formation_quiz',  `?formations.slug=eq.${slug}&order=module_num.asc,ordre.asc`),
      ])
      // Récupérer l'ID depuis la formation
      if (fRows[0]) {
        const fid = fRows[0].id
        const [b, q] = await Promise.all([
          fGet('formation_blocs', `?formation_id=eq.${fid}&order=sequence_num.asc,ordre.asc`),
          fGet('formation_quiz',  `?formation_id=eq.${fid}&order=module_num.asc,ordre.asc`),
        ])
        setFData(fRows[0])
        setBlocs(b)
        setQuiz(q)
      }
    } catch(e) { console.error('ElearningReader load:', e) }
    setLoading(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <p>Chargement de la formation…</p>
      </div>
    </div>
  )

  if (!slug || !fData) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <p>Contenu de formation introuvable.</p>
        <button className="btn-secondary" style={{ marginTop: 16 }} onClick={onBack}>← Retour</button>
      </div>
    </div>
  )

  const modules = [...new Set(blocs.map(b => b.sequence_num))].sort((a, b) => a - b)
  const hasQuiz = quiz.length > 0
  const blocsModule = blocs.filter(b => b.sequence_num === activeModule)
  const couleur1 = fData.couleur1 || '#3B82F6'
  const couleur2 = fData.couleur2 || '#1D4ED8'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>

      {/* Header */}
      <div style={{ background: 'var(--warm-white)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16, height: 60 }}>
          <button onClick={onBack} className="btn-secondary" style={{ padding: '7px 14px', fontSize: 13, flexShrink: 0 }}>← Retour</button>
          <span style={{ fontSize: 14, color: 'var(--ink-soft)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fData.titre}</span>
          <span style={{ background: `${couleur1}20`, color: couleur1, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>E-learning</span>
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${couleur1}, ${couleur2})`, padding: '32px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>{fData.emoji || '📚'}</div>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', color: '#fff', fontSize: 26, margin: '0 0 8px' }}>{fData.titre}</h1>
          {fData.sous_titre && <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontStyle: 'italic' }}>{fData.sous_titre}</p>}
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 8 }}>{fData.duree} · {modules.length} module{modules.length > 1 ? 's' : ''}{hasQuiz ? ' · Quiz final' : ''}</p>
        </div>
      </div>

      {/* Onglets modules */}
      <div style={{ background: 'var(--warm-white)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px', display: 'flex', gap: 4, overflowX: 'auto' }}>
          {modules.map(n => (
            <button key={n} onClick={() => { setActiveModule(n); setShowQuiz(false) }}
              style={{ padding: '14px 18px', fontSize: 13, fontWeight: showQuiz ? 400 : activeModule === n ? 700 : 500, color: !showQuiz && activeModule === n ? couleur1 : 'var(--ink-muted)', background: 'none', border: 'none', borderBottom: !showQuiz && activeModule === n ? `2px solid ${couleur1}` : '2px solid transparent', borderRadius: 0, whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.15s' }}>
              📖 Module {n}
            </button>
          ))}
          {hasQuiz && (
            <button onClick={() => setShowQuiz(true)}
              style={{ padding: '14px 18px', fontSize: 13, fontWeight: showQuiz ? 700 : 500, color: showQuiz ? '#6D28D9' : 'var(--ink-muted)', background: 'none', border: 'none', borderBottom: showQuiz ? '2px solid #6D28D9' : '2px solid transparent', borderRadius: 0, whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.15s' }}>
              📝 Quiz final
            </button>
          )}
        </div>
      </div>

      {/* Contenu */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
        {showQuiz
          ? <Quiz questions={quiz} formation={fData} participant={participant} onFinish={onBack} />
          : blocsModule.map(b => renderBloc(b))
        }
        {!showQuiz && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, flexWrap: 'wrap', gap: 12 }}>
            {activeModule > modules[0] && (
              <button className="btn-secondary" onClick={() => setActiveModule(m => m - 1)}>← Module précédent</button>
            )}
            <div style={{ flex: 1 }} />
            {activeModule < modules[modules.length - 1] ? (
              <button className="btn-primary" onClick={() => setActiveModule(m => m + 1)}>Module suivant →</button>
            ) : hasQuiz ? (
              <button className="btn-primary" onClick={() => setShowQuiz(true)} style={{ background: '#6D28D9' }}>Passer au quiz final →</button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
