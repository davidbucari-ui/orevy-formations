import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { echapperHtml, messageErreur } from '../lib/format'

/* Quiz final. Les questions arrivent sans la bonne réponse (quiz_questions) ;
   la base note les choix, enregistre la tentative et renvoie la correction. */
export default function Quiz({ questions, formation, participant, onResultat, onFinish }) {
  const [reponses, setReponses] = useState({})
  const [resultat, setResultat] = useState(null)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const seuil = formation.seuil_reussite ?? 70
  const manquantes = questions.length - Object.keys(reponses).length

  async function valider() {
    if (manquantes > 0) { setErreur(`Répondez aux ${manquantes} question${manquantes > 1 ? 's' : ''} restante${manquantes > 1 ? 's' : ''} avant de valider.`); return }
    setEnvoi(true); setErreur('')
    const { data, error } = await supabase.rpc('quiz_soumettre', { fid: formation.id, reponses })
    setEnvoi(false)
    if (error) { setErreur("Vos réponses n'ont pas pu être enregistrées : " + messageErreur(error)); return }
    setResultat(data)
    onResultat?.(data)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (resultat) {
    const correction = Object.fromEntries((resultat.correction || []).map(c => [c.id, c]))
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>{resultat.reussi ? '🏅' : '📚'}</div>
        <h2 style={{ fontSize: 28, marginBottom: 8 }}>{resultat.reussi ? 'Félicitations !' : 'Continuez vos efforts'}</h2>
        <p style={{ color: 'var(--ink-muted)', marginBottom: 24 }}>
          Score : {resultat.score}/{resultat.total} — {resultat.reussi ? 'formation validée ✓' : `il faut ${resultat.seuil} % de bonnes réponses pour valider`}
        </p>
        {questions.map((qu, i) => {
          const c = correction[qu.id] || {}
          const juste = reponses[qu.id] === c.answer
          return (
            <div key={qu.id} className={`correction ${juste ? 'juste' : 'faux'}`}>
              <p style={{ fontWeight: 600, marginBottom: 6 }}>{juste ? '✓' : '✗'} {i + 1}. {qu.question}</p>
              {!juste && <p>Votre réponse : {qu.choices?.[reponses[qu.id]]}</p>}
              <p>Bonne réponse : {qu.choices?.[c.answer]}</p>
              {c.feedback && <p style={{ fontStyle: 'italic', color: 'var(--ink-muted)' }}>{c.feedback}</p>}
            </div>
          )
        })}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
          {resultat.reussi
            ? <button className="btn-primary" onClick={() => imprimerAttestation(formation, participant, resultat)}>🖨 Télécharger l'attestation</button>
            : <button className="btn-secondary" onClick={() => { setReponses({}); setResultat(null) }}>Réessayer</button>}
          <button className="btn-secondary" onClick={onFinish}>← Retour à la formation</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <span className="badge badge-quiz">Quiz — {questions.length} questions</span>
      <p style={{ color: 'var(--ink-muted)', fontSize: 13, margin: '8px 0 24px' }}>
        {seuil} % de bonnes réponses pour valider la formation et obtenir l'attestation ({Math.ceil(questions.length * seuil / 100)}/{questions.length}).
      </p>
      {questions.map((qu, i) => (
        <div key={qu.id} className="card" style={{ padding: '18px 20px', marginBottom: 14 }}>
          <p style={{ fontWeight: 500, marginBottom: 14 }}>{i + 1}. {qu.question}</p>
          <div className="pile" style={{ gap: 8 }}>
            {(qu.choices || []).map((choix, ci) => (
              <button key={ci} className={`choix ${reponses[qu.id] === ci ? 'actif' : ''}`}
                onClick={() => { setReponses(r => ({ ...r, [qu.id]: ci })); setErreur('') }}>{choix}</button>
            ))}
          </div>
        </div>
      ))}
      {erreur && <div className="alerte alerte-erreur">{erreur}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-primary" onClick={valider} disabled={envoi}>{envoi ? 'Correction…' : 'Valider mes réponses →'}</button>
      </div>
    </div>
  )
}

export function imprimerAttestation(formation, participant, resultat) {
  const { score, total } = resultat
  const date = new Date(resultat.passe_le || Date.now()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
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
