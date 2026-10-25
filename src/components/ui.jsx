export function Entete({ titre, children, onRetour }) {
  return (
    <header className="entete">
      <div className="entete-in">
        {onRetour && <button className="btn-secondary btn-petit" onClick={onRetour}>← Retour</button>}
        <div className="entete-titre">{titre}</div>
        {children}
      </div>
    </header>
  )
}

export function Onglets({ onglets, actif, onChange }) {
  return (
    <div className="onglets">
      {onglets.map(([cle, libelle]) => (
        <button key={cle} className={actif === cle ? 'actif' : ''} onClick={() => onChange(cle)}>{libelle}</button>
      ))}
    </div>
  )
}

export function Alerte({ message }) {
  if (!message) return null
  return <div className={`alerte ${message.erreur ? 'alerte-erreur' : 'alerte-ok'}`}>{message.texte}</div>
}

export function Vide({ children }) {
  return <div className="vide">{children}</div>
}
