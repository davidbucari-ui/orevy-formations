import { useState } from 'react'

const BASE = 'https://orevy-proxy.david-bucari.workers.dev/supabase/formations/rest/v1'
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdva2Z4ZWpvZmZ6dHR6dmRrb2xsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDMxNjQ0NCwiZXhwIjoyMDk1ODkyNDQ0fQ.X1BYaEYHHDNTh6I0MXTX0ZjOSQjTAeBiAuMgJH1YSV0'
const H = { 'Content-Type': 'application/json', 'apikey': KEY, 'Authorization': 'Bearer ' + KEY }
const ADMIN_CODE = 'OREVY-ADMIN-2025'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const emailClean = email.trim().toLowerCase()
    const codeClean = code.trim().toUpperCase()

    if (codeClean === ADMIN_CODE) {
      onLogin({ isAdmin: true, email: emailClean, code_acces: ADMIN_CODE })
      setLoading(false)
      return
    }

    const r = await fetch(`${BASE}/participants?email=eq.${encodeURIComponent(emailClean)}&code_acces=eq.${encodeURIComponent(codeClean)}`, { headers: H })
    const data = await r.json()

    if (!r.ok || !data || data.length === 0) {
      setError("Email ou code d'accès incorrect.")
      setLoading(false)
      return
    }

    localStorage.setItem('orevy_participant', JSON.stringify(data[0]))
    onLogin(data[0])
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--cream)' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }} className="fade-up">
          <div style={{ width: 52, height: 52, background: 'var(--accent)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '22px' }}>🎓</div>
          <h1 style={{ fontSize: '28px', color: 'var(--ink)', marginBottom: '6px' }}>Orevy</h1>
          <p style={{ color: 'var(--ink-muted)', fontSize: '15px' }}>Accédez à vos formations</p>
        </div>
        <div className="card fade-up" style={{ padding: '32px', animationDelay: '0.08s' }}>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Adresse email</label>
              <input type="email" placeholder="vous@exemple.fr" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
            <div className="field">
              <label>Code d'accès</label>
              <input type="text" placeholder="OREVY-XXXXXX" value={code} onChange={e => setCode(e.target.value)} required style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }} />
              <p style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '6px' }}>Communiqué par email après votre session</p>
            </div>
            {error && <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '14px', color: '#991B1B', marginBottom: '16px' }}>{error}</div>}
            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>{loading ? 'Connexion…' : 'Accéder à mes formations →'}</button>
          </form>
        </div>
        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--ink-muted)', marginTop: '24px' }}>Vous n'avez pas reçu votre code ?<br />Contactez votre formateur.</p>
        <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #EAE4DA' }}>
          <a href="https://davidbucari-ui.github.io/orevy-solutions/" style={{ fontSize: '14px', color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
            Découvrir Orevy Solutions →
          </a>
        </div>
      </div>
    </div>
  )
}
