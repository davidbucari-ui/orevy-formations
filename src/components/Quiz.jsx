import { useState } from 'react'
import { echapperHtml } from '../lib/format'

const SEUIL = 0.7   // part de bonnes réponses pour valider la formation

export default function Quiz({ questions, formation, participant, onFinish }) {
  const [reponses, setReponses] = useState({})
  const [valide, setValide] = useState(false)

  const seuil = Math.ceil(questions.length * SEUIL)
  const score = questions.filter(qu => reponses[qu.id] === qu.answer).length
  const reussi = score >= seuil

  function valider() {
    if (Object.keys(reponses).length < questions.length) {
      alert('Veuillez répondre à toutes les questions avant de valider.')
      return
    }
    setValide(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (valide) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>{reussi ? '🏅' : '📚'}</div>
        <h2 style={{ fontSize: 28, marginBottom: 8 }}>{reussi ? 'Félicitations !' : 'Continuez vos efforts'}</h2>
        <p style={{ color: 'var(--ink-muted)', marginBottom: 24 }}>
          Score : {score}/{questions.length} — {reussi ? 'formation validée ✓' : `seuil de réussite : ${seuil}/${questions.length}`}
        </p>
        {questions.map((qu, i) => {
          const juste = reponses[qu.id] === qu.answer
          return (
            <div key={qu.id} className={`correction ${juste ? 'juste' : 'faux'}`}>
              <p style={{ fontWeight: 600, marginBottom: 6 }}>{juste ? '✓' : '✗'} {i + 1}. {qu.question}</p>
              {!juste && <p>Votre réponse : {qu.choices?.[reponses[qu.id]]}</p>}
              <p>Bonne réponse : {qu.choices?.[qu.answer]}</p>
              {qu.feedback && <p style={{ fontStyle: 'italic', color: 'var(--ink-muted)' }}>{qu.feedback}</p>}
            </div>
          )
        })}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
          {reussi
            ? <button className="btn-primary" onClick={() => imprimerAttestation(formation, participant, score, questions.length)}>🖨 Télécharger l'attestation</button>
            : <button className="btn-secondary" onClick={() => { setReponses({}); setValide(false) }}>Réessayer</button>}
          <button className="btn-secondary" onClick={onFinish}>← Retour à la formation</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <span className="badge badge-quiz">Quiz — {questions.length} questions</span>
      <p style={{ color: 'var(--ink-muted)', fontSize: 13, margin: '8px 0 24px' }}>Seuil de réussite : {seuil}/{questions.length} pour obtenir l'attestation</p>
      {questions.map((qu, i) => (
        <div key={qu.id} className="card" style={{ padding: '18px 20px', marginBottom: 14 }}>
          <p style={{ fontWeight: 500, marginBottom: 14 }}>{i + 1}. {qu.question}</p>
          <div className="pile" style={{ gap: 8 }}>
            {(qu.choices || []).map((choix, ci) => (
              <button key={ci} className={`choix ${reponses[qu.id] === ci ? 'actif' : ''}`}
                onClick={() => setReponses(r => ({ ...r, [qu.id]: ci }))}>{choix}</button>
            ))}
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-primary" onClick={valider}>Valider mes réponses →</button>
      </div>
    </div>
  )
}

function imprimerAttestation(formation, participant, score, total) {
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const nom = echapperHtml(participant?.nom || 'Le titulaire')
  const titre = echapperHtml(formation?.titre || 'Formation Orevy')
  const win = window.open('', '_blank')
  if (!win) { alert("Autorisez l'ouverture de fenêtres pour télécharger l'attestation."); return }
  win.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Attestation — ${titre}</title>
  <style>
    body{margin:0;padding:40px;background:#FAF8F4;font-family:Georgia,serif;display:flex;justify-content:center}
    .cert{max-width:680px;width:100%;background:#fff;border:2px solid #E8E4DE;border-radius:16px;padding:60px;text-align:center}
    h1{font-size:2rem;color:#1A1714;margin:0 0 8px}
    .sub{color:#C8622A;font-size:.8rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;margin-bottom:32px}
    .nom{font-size:1.8rem;color:#C8622A;font-style:italic;margin:20px 0}
    .titre{font-size:1.1rem;font-weight:600;color:#1A1714;margin:16px 0 8px}
    .gris{color:#9A948E;font-size:.9rem}
    .sig{border-top:1px solid #E8E4DE;padding-top:20px;margin-top:32px;font-size:.8rem;color:#9A948E}
    button{background:#C8622A;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-weight:600;cursor:pointer;margin-top:24px}
    @media print{body{background:#fff}button{display:none}}
  </style></head><body><div class="cert">
  <div style="font-size:3rem;margin-bottom:20px">🏅</div>
  <div class="sub">Attestation de formation</div>
  <h1>Certificat de réussite</h1>
  <p class="gris">Cette attestation certifie que</p>
  <div class="nom">${nom}</div>
  <p class="gris">a suivi et validé avec succès la formation</p>
  <div class="titre">${titre}</div>
  <p class="gris">le ${date}</p>
  <p class="gris" style="line-height:1.7">Score obtenu : ${score}/${total} au quiz d'évaluation.<br>
  Formation dispensée dans le cadre du développement des compétences professionnelles en petite enfance.</p>
  <div class="sig">David Bucari · Éducateur de jeunes enfants · Formateur petite enfance<br>Orevy Formations — Formation en ligne</div>
  <button onclick="window.print()">🖨 Imprimer / Sauvegarder en PDF</button>
  </div></body></html>`)
  win.document.close()
}
