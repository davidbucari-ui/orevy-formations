import { useEffect, useState } from 'react'
import { supabase, q } from '../../lib/supabase'
import { formatDate, formatDuree, messageErreur } from '../../lib/format'
import { Entete, Vide } from '../../components/ui'
import LecteurSlides from '../../components/LecteurSlides'
import Quiz from '../../components/Quiz'

export default function FormationVue({ acces, participant, onClose }) {
  const f = acces.formation
  const [contenu, setContenu] = useState(null)
  const [mode, setMode] = useState('accueil')   // 'accueil' | 'slides' | 'quiz'
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    if (!acces.vu) supabase.rpc('marquer_vu', { acces_id: acces.id }).then(() => {})
    Promise.all([
      q(supabase.from('chapitres').select('*').eq('formation_id', f.id).order('ordre')),
      q(supabase.from('ressources').select('*').eq('formation_id', f.id).order('created_at')),
      q(supabase.from('slides').select('*').eq('formation_id', f.id).order('sequence_num').order('ordre')),
      q(supabase.from('formation_quiz').select('*').eq('formation_id', f.id).order('module_num').order('ordre')),
    ])
      .then(([chapitres, ressources, slides, quiz]) => setContenu({ chapitres, ressources, slides, quiz }))
      .catch(err => setErreur(messageErreur(err)))
  }, [f.id])

  if (mode === 'slides') return <LecteurSlides titre={f.titre} slides={contenu.slides} onClose={() => setMode('accueil')} />

  return (
    <div>
      <Entete titre={f.titre} onRetour={mode === 'quiz' ? () => setMode('accueil') : onClose} />
      <main className="page page-etroite">
        {erreur && <div className="alerte alerte-erreur">{erreur}</div>}
        {!contenu ? <Vide>Chargement…</Vide> : mode === 'quiz' ? (
          <Quiz questions={contenu.quiz} formation={f} participant={participant} onFinish={() => setMode('accueil')} />
        ) : (
          <>
            <h1 style={{ fontSize: 28, marginBottom: 8 }}>{f.titre}</h1>
            <p className="meta" style={{ marginBottom: 16 }}>
              {f.reference && <span className="badge badge-ref">{f.reference}</span>}
              {f.categorie && <span className="badge badge-pending">{f.categorie}</span>}
              {f.date_session && <span>📅 {formatDate(f.date_session)}</span>}
              {f.duree_minutes && <span>⏱ {formatDuree(f.duree_minutes)}</span>}
            </p>
            {f.description && <p style={{ color: 'var(--ink-soft)', marginBottom: 28, lineHeight: 1.7 }}>{f.description}</p>}

            <div className="pile">
              {contenu.slides.length > 0 && (
                <Bloc titre="📖 Support de formation" texte={`${contenu.slides.length} diapositive${contenu.slides.length > 1 ? 's' : ''}`}>
                  <button className="btn-primary" onClick={() => setMode('slides')}>Ouvrir le support →</button>
                </Bloc>
              )}
              {f.lien_video && (
                <Bloc titre="🎬 Session complète" texte="Regarder l'enregistrement intégral.">
                  <a href={f.lien_video} target="_blank" rel="noopener noreferrer" className="btn-primary">Regarder la session →</a>
                </Bloc>
              )}
              {contenu.chapitres.length > 0 && (
                <Bloc titre="📋 Séquences">
                  <div className="liste-liens">
                    {contenu.chapitres.map((c, i) => (
                      <Lien key={c.id} href={c.lien} icone={i + 1} titre={c.titre} sous={c.description} />
                    ))}
                  </div>
                </Bloc>
              )}
              {contenu.ressources.length > 0 && (
                <Bloc titre="📂 Documents & ressources">
                  <div className="liste-liens">
                    {contenu.ressources.map(r => <Lien key={r.id} href={r.lien} icone="📄" titre={r.titre} sous={r.type_fichier} />)}
                  </div>
                </Bloc>
              )}
              {contenu.quiz.length > 0 && (
                <Bloc titre="📝 Quiz d'évaluation" texte={`${contenu.quiz.length} questions — réussissez-le pour obtenir votre attestation.`}>
                  <button className="btn-primary" onClick={() => setMode('quiz')}>Commencer le quiz →</button>
                </Bloc>
              )}
              {!f.lien_video && !contenu.slides.length && !contenu.chapitres.length && !contenu.ressources.length && !contenu.quiz.length &&
                <Vide>Le contenu de cette formation sera bientôt disponible.</Vide>}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function Bloc({ titre, texte, children }) {
  return (
    <section className="card" style={{ padding: 24 }}>
      <p style={{ fontWeight: 600, marginBottom: texte ? 4 : 14 }}>{titre}</p>
      {texte && <p style={{ fontSize: 14, color: 'var(--ink-muted)', marginBottom: 16 }}>{texte}</p>}
      {children}
    </section>
  )
}

function Lien({ href, icone, titre, sous }) {
  const contenu = (
    <>
      <span className="lien-icone">{icone}</span>
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', fontWeight: 500 }}>{titre}</span>
        {sous && <span style={{ display: 'block', fontSize: 13, color: 'var(--ink-muted)' }}>{sous}</span>}
      </span>
      {href && <span style={{ color: 'var(--accent)' }}>→</span>}
    </>
  )
  return href
    ? <a className="lien-ligne" href={href} target="_blank" rel="noopener noreferrer">{contenu}</a>
    : <div className="lien-ligne">{contenu}</div>
}
