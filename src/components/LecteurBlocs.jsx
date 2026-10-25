import { useRef, useState } from 'react'
import { Bloc } from './Blocs'

/* Parcours e-learning : les blocs sont regroupés en modules par sequence_num.
   Au dernier module, propose le quiz s'il y en a un. */
export default function LecteurBlocs({ formation, blocs, aQuiz, onQuiz }) {
  const modules = [...new Set(blocs.map(b => b.sequence_num))].sort((a, b) => a - b)
  const [courant, setCourant] = useState(modules[0])
  const haut = useRef(null)
  const c1 = formation.couleur1 || '#E07A5F'
  const c2 = formation.couleur2 || '#3D8A7A'
  const i = modules.indexOf(courant)

  function aller(n) {
    setCourant(n)
    haut.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div>
      <div className="bandeau" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>{formation.emoji || '📚'}</div>
        <h1 style={{ color: '#fff', fontSize: 26, marginBottom: 6 }}>{formation.titre}</h1>
        {formation.sous_titre && <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15 }}>{formation.sous_titre}</p>}
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 8 }}>
          {modules.length} module{modules.length > 1 ? 's' : ''}{aQuiz ? ' · quiz final' : ''}
        </p>
      </div>

      <div ref={haut} className="onglets-modules" style={{ scrollMarginTop: 70 }}>
        {modules.map((n, k) => (
          <button key={n} onClick={() => aller(n)} className={n === courant ? 'actif' : ''} style={n === courant ? { color: c1, borderBottomColor: c1 } : null}>
            📖 Module {k + 1}
          </button>
        ))}
        {aQuiz && <button onClick={onQuiz}>📝 Quiz final</button>}
      </div>

      {blocs.filter(b => b.sequence_num === courant).map(b => <Bloc key={b.id} b={b} />)}

      <div className="actions" style={{ marginTop: 24 }}>
        {i > 0 && <button className="btn-secondary" onClick={() => aller(modules[i - 1])}>← Module précédent</button>}
        <div style={{ flex: 1 }} />
        {i < modules.length - 1
          ? <button className="btn-primary" onClick={() => aller(modules[i + 1])}>Module suivant →</button>
          : aQuiz && <button className="btn-primary" style={{ background: 'var(--violet)' }} onClick={onQuiz}>Passer au quiz final →</button>}
      </div>
    </div>
  )
}
