import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase, q } from '../../lib/supabase'
import { formatDate, formatDuree, messageErreur } from '../../lib/format'
import { modulesDe, meilleurResultat } from '../../lib/parcours'
import { Entete, Vide } from '../../components/ui'
import LecteurSlides from '../../components/LecteurSlides'
import LecteurBlocs from '../../components/LecteurBlocs'
import Quiz, { imprimerAttestation } from '../../components/Quiz'

export default function FormationVue({ acces, participant, onClose }) {
  const f = acces.formation
  const [contenu, setContenu] = useState(null)
  const [lus, setLus] = useState(new Set())
  const lusRef = useRef(new Set())   // à jour même dans les écouteurs créés plus tôt
  const [resultats, setResultats] = useState([])
  const [mode, setMode] = useState('accueil')   // 'accueil' | 'slides' | 'blocs' | 'quiz'
  const [depart, setDepart] = useState(null)    // module ouvert par le lecteur
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    if (!acces.vu) supabase.rpc('marquer_vu', { acces_id: acces.id }).then(() => {})
    Promise.all([
      q(supabase.from('chapitres').select('*').eq('formation_id', f.id).order('ordre')),
      q(supabase.from('ressources').select('*').eq('formation_id', f.id).order('created_at')),
      q(supabase.from('slides').select('*').eq('formation_id', f.id).order('sequence_num').order('ordre')),
      q(supabase.rpc('quiz_questions', { fid: f.id })),
      q(supabase.from('formation_blocs').select('*').eq('formation_id', f.id).order('sequence_num').order('ordre')),
      q(supabase.from('progression').select('module_num').eq('formation_id', f.id).eq('participant_id', participant.id)),
      q(supabase.from('resultats_quiz').select('*').eq('formation_id', f.id).eq('participant_id', participant.id).order('passe_le', { ascending: false })),
    ])
      .then(([chapitres, ressources, slides, quiz, blocs, prog, res]) => {
        setContenu({ chapitres, ressources, slides, quiz, blocs })
        lusRef.current = new Set(prog.map(p => p.module_num))
        setLus(new Set(lusRef.current))
        setResultats(res)
      })
      .catch(err => setErreur(messageErreur(err)))
  }, [f.id])

  const modules = useMemo(() => contenu ? modulesDe(contenu.blocs, contenu.slides) : [], [contenu])

  function marquerLu(num) {
    if (lusRef.current.has(num)) return
    lusRef.current.add(num)
    setLus(new Set(lusRef.current))
    supabase.rpc('marquer_module_lu', { fid: f.id, module: num }).then(() => {})
  }

  function ouvrir(num) {
    setDepart(num)
    setMode(contenu.blocs.length ? 'blocs' : 'slides')
    window.scrollTo(0, 0)
  }

  if (mode === 'slides') {
    return <LecteurSlides titre={f.titre} slides={contenu.slides} sequenceInitiale={depart} onLu={marquerLu} onClose={() => setMode('accueil')} />
  }

  const aQuiz = contenu?.quiz.length > 0
  const meilleur = meilleurResultat(resultats)
  const prochain = modules.find(m => !lus.has(m.num))
  const pct = modules.length ? Math.round((lus.size / modules.length) * 100) : 0

  return (
    <div>
      <Entete titre={f.titre} onRetour={mode === 'accueil' ? onClose : () => setMode('accueil')} />
      <main className="page page-etroite">
        {erreur && <div className="alerte alerte-erreur">{erreur}</div>}
        {!contenu ? <Vide>Chargement…</Vide> : mode === 'quiz' ? (
          <Quiz questions={contenu.quiz} formation={f} participant={participant}
            onResultat={r => setResultats(prev => [{ ...r, id: `local-${Date.now()}` }, ...prev])}
            onFinish={() => setMode('accueil')} />
        ) : mode === 'blocs' ? (
          <LecteurBlocs formation={f} blocs={contenu.blocs} modules={modules} lus={lus} moduleInitial={depart}
            aQuiz={aQuiz} onLu={marquerLu} onQuiz={() => { setMode('quiz'); window.scrollTo(0, 0) }} />
        ) : (
          <>
            <h1 style={{ fontSize: 28, marginBottom: 8 }}>{f.titre}</h1>
            <p className="meta" style={{ marginBottom: 16 }}>
              {f.reference && <span className="badge badge-ref">{f.reference}</span>}
              {f.categorie && <span className="badge badge-pending">{f.categorie}</span>}
              {f.date_session && <span>📅 {formatDate(f.date_session)}</span>}
              {f.duree_minutes && <span>⏱ {formatDuree(f.duree_minutes)}</span>}
            </p>
            {(f.sous_titre || f.description) && <p style={{ color: 'var(--ink-soft)', marginBottom: 28, lineHeight: 1.7 }}>{f.description || f.sous_titre}</p>}

            <div className="pile">
              {modules.length > 0 && (
                <section className="card parcours">
                  <div className="parcours-tete">
                    <div>
                      <p style={{ fontWeight: 600 }}>{contenu.blocs.length ? '📖 Votre parcours' : '📖 Support de formation'}</p>
                      <p className="sous">{lus.size} sur {modules.length} module{modules.length > 1 ? 's' : ''} · environ {modules.reduce((t, m) => t + m.duree, 0)} min au total</p>
                    </div>
                    <button className="btn-primary" onClick={() => ouvrir((prochain || modules[0]).num)}>
                      {lus.size === 0 ? 'Commencer' : prochain ? `Reprendre : module ${prochain.rang}` : 'Relire'} →
                    </button>
                  </div>
                  <div className="jauge" aria-label={`${pct} % du parcours lu`}><div style={{ width: `${pct}%` }} /></div>
                  <ol className="liste-modules">
                    {modules.map(m => (
                      <li key={m.num}>
                        <button className={lus.has(m.num) ? 'lu' : ''} onClick={() => ouvrir(m.num)}>
                          <span className="module-num">{lus.has(m.num) ? '✓' : m.rang}</span>
                          <span className="module-titre">{m.titre}</span>
                          <span className="module-duree">{m.duree} min</span>
                        </button>
                      </li>
                    ))}
                    {aQuiz && (
                      <li>
                        <button className={meilleur?.reussi ? 'lu' : ''} onClick={() => { setMode('quiz'); window.scrollTo(0, 0) }}>
                          <span className="module-num">{meilleur?.reussi ? '✓' : '★'}</span>
                          <span className="module-titre">Quiz final</span>
                          <span className="module-duree">{contenu.quiz.length} questions</span>
                        </button>
                      </li>
                    )}
                  </ol>
                </section>
              )}

              {aQuiz && (
                <section className="card" style={{ padding: 24 }}>
                  <p style={{ fontWeight: 600, marginBottom: 4 }}>📝 Quiz d'évaluation</p>
                  {meilleur?.reussi ? (
                    <>
                      <p className="sous" style={{ marginBottom: 16 }}>Formation validée le {formatDate(meilleur.passe_le)} avec {meilleur.score}/{meilleur.total}.</p>
                      <div className="actions">
                        <button className="btn-primary" onClick={() => imprimerAttestation(f, participant, meilleur)}>🖨 Télécharger l'attestation</button>
                        <button className="btn-secondary" onClick={() => setMode('quiz')}>Repasser le quiz</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="sous" style={{ marginBottom: 16 }}>
                        {meilleur ? `Meilleur score : ${meilleur.score}/${meilleur.total}. ` : ''}
                        {f.seuil_reussite ?? 70} % de bonnes réponses pour valider la formation et obtenir l'attestation.
                        {prochain && contenu.blocs.length ? ' Conseil : terminez le parcours avant.' : ''}
                      </p>
                      <button className="btn-primary" onClick={() => setMode('quiz')}>{meilleur ? 'Retenter le quiz' : 'Commencer le quiz'} →</button>
                    </>
                  )}
                </section>
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
              {!f.lien_video && !modules.length && !contenu.chapitres.length && !contenu.ressources.length && !aQuiz &&
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
