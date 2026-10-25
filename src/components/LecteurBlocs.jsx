import { useEffect, useRef, useState } from 'react'
import { Bloc } from './Blocs'

/* Parcours e-learning : un module à la fois. Le module est marqué lu quand on
   arrive en bas de la page (ou tout de suite s'il tient à l'écran), et quand
   on passe au suivant. Au dernier module, propose le quiz s'il y en a un. */
export default function LecteurBlocs({ formation, blocs, modules, lus, moduleInitial, aQuiz, onQuiz, onLu }) {
  const [courant, setCourant] = useState(moduleInitial ?? modules[0]?.num)
  const [lecture, setLecture] = useState(0)
  const haut = useRef(null)
  const c1 = formation.couleur1 || '#E07A5F'
  const c2 = formation.couleur2 || '#3D8A7A'
  const i = modules.findIndex(m => m.num === courant)
  const module = modules[i]

  useEffect(() => {
    function suivre() {
      const h = document.documentElement
      const reste = h.scrollHeight - h.clientHeight
      const pct = reste > 0 ? Math.min(100, (h.scrollTop / reste) * 100) : 100
      setLecture(pct)
      if (pct >= 95) onLu(courant)
    }
    suivre()
    window.addEventListener('scroll', suivre, { passive: true })
    // Un module court ne déclenche aucun défilement : on vérifie après l'affichage.
    const t = setTimeout(suivre, 400)
    return () => { window.removeEventListener('scroll', suivre); clearTimeout(t) }
  }, [courant])

  function aller(num, marquer) {
    if (marquer) onLu(courant)
    setCourant(num)
    haut.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div>
      <div className="barre-lecture" style={{ width: `${lecture}%`, background: c1 }} aria-hidden="true" />
      <div className="bandeau" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>{formation.emoji || '📚'}</div>
        <h1 style={{ color: '#fff', fontSize: 26, marginBottom: 6 }}>{formation.titre}</h1>
        {formation.sous_titre && <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15 }}>{formation.sous_titre}</p>}
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 8 }}>
          {lus.size} module{lus.size > 1 ? 's' : ''} lu{lus.size > 1 ? 's' : ''} sur {modules.length}{aQuiz ? ' · quiz final' : ''}
        </p>
      </div>

      <div ref={haut} className="onglets-modules" style={{ scrollMarginTop: 70 }}>
        {modules.map(m => (
          <button key={m.num} onClick={() => aller(m.num)} className={m.num === courant ? 'actif' : ''} style={m.num === courant ? { color: c1, borderBottomColor: c1 } : null}>
            {lus.has(m.num) ? '✓' : '📖'} Module {m.rang}
          </button>
        ))}
        {aQuiz && <button onClick={onQuiz}>📝 Quiz final</button>}
      </div>

      {module && <p className="module-entete">Module {module.rang} sur {modules.length} · {module.titre} · environ {module.duree} min</p>}

      {blocs.filter(b => b.sequence_num === courant).map(b => <Bloc key={b.id} b={b} />)}

      <div className="actions" style={{ marginTop: 24 }}>
        {i > 0 && <button className="btn-secondary" onClick={() => aller(modules[i - 1].num)}>← Module précédent</button>}
        <div style={{ flex: 1 }} />
        {i < modules.length - 1
          ? <button className="btn-primary" onClick={() => aller(modules[i + 1].num, true)}>Module suivant →</button>
          : aQuiz && <button className="btn-primary" style={{ background: 'var(--violet)' }} onClick={() => { onLu(courant); onQuiz() }}>Passer au quiz final →</button>}
      </div>
    </div>
  )
}
