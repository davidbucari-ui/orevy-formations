import { useState } from 'react'
import { supabase } from '../lib/supabase'

/* Connexion sans mot de passe : Supabase envoie par email un code à usage
   unique (et un lien de connexion, selon le modèle d'email configuré). */
export default function Login() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [etape, setEtape] = useState('email')   // 'email' | 'code'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function envoyerCode(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
    })
    setLoading(false)
    if (error) setError(error.status === 429
      ? 'Trop de demandes. Patientez quelques minutes avant de redemander un code.'
      : "Impossible d'envoyer le code : " + error.message)
    else setEtape('code')
  }

  async function verifierCode(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' })
    setLoading(false)
    if (error) setError('Code incorrect ou expiré.')
  }

  return (
    <div className="plein-centre" style={{ padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }} className="fade-up">
          <div className="logo">🎓</div>
          <h1 style={{ fontSize: 28, marginBottom: 6 }}>Orevy</h1>
          <p style={{ color: 'var(--ink-muted)', fontSize: 15 }}>Accédez à vos formations</p>
        </div>
        <div className="card fade-up" style={{ padding: 32 }}>
          {etape === 'email' ? (
            <form onSubmit={envoyerCode}>
              <div className="field">
                <label>Adresse email</label>
                <input type="email" placeholder="vous@exemple.fr" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
                <p className="aide">Un code de connexion vous sera envoyé par email.</p>
              </div>
              {error && <div className="alerte alerte-erreur">{error}</div>}
              <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Envoi…' : 'Recevoir mon code'}
              </button>
            </form>
          ) : (
            <form onSubmit={verifierCode}>
              <p style={{ fontSize: 14, color: 'var(--ink-soft)', marginBottom: 16 }}>
                Un email a été envoyé à <strong>{email}</strong>. Saisissez le code reçu, ou cliquez sur le lien de l'email.
              </p>
              <div className="field">
                <label>Code de connexion</label>
                <input type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="123456"
                  value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} required autoFocus
                  style={{ letterSpacing: '0.3em', fontSize: 20, textAlign: 'center' }} />
              </div>
              {error && <div className="alerte alerte-erreur">{error}</div>}
              <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Vérification…' : 'Se connecter'}
              </button>
              <button type="button" className="btn-lien" onClick={() => { setEtape('email'); setCode(''); setError('') }}>
                ← Changer d'adresse ou renvoyer un code
              </button>
            </form>
          )}
        </div>
        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13 }}>
          <a href="https://davidbucari-ui.github.io/orevy-solutions/" style={{ color: 'var(--ink-muted)' }}>Découvrir Orevy Solutions →</a>
        </p>
      </div>
    </div>
  )
}
