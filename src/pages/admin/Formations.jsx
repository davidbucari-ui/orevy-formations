import { supabase, q } from '../../lib/supabase'
import { formatDate, messageErreur } from '../../lib/format'
import { Vide } from '../../components/ui'

export default function Formations({ formations, acces, recharger, setMessage, onEditer }) {
  async function supprimer(f) {
    const n = acces.filter(a => a.formation_id === f.id).length
    if (!confirm(`Supprimer « ${f.titre} »${n ? ` et ses ${n} accès participant` : ''}, avec tout son contenu (slides, quiz, séquences…) ? Cette action est définitive.`)) return
    try {
      // La base n'efface pas en cascade : on retire d'abord tout ce qui dépend de la formation.
      for (const t of ['acces_formations', 'chapitres', 'ressources', 'slides', 'formation_quiz', 'formation_blocs']) {
        await q(supabase.from(t).delete().eq('formation_id', f.id))
      }
      await q(supabase.from('formations').delete().eq('id', f.id))
      setMessage({ texte: 'Formation supprimée.' }); recharger()
    } catch (err) { setMessage({ erreur: true, texte: messageErreur(err) }) }
  }

  return (
    <div>
      <div className="actions" style={{ justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn-primary" onClick={() => onEditer({})}>+ Nouvelle formation</button>
      </div>
      {formations.length === 0 ? <Vide>Aucune formation.</Vide> : (
        <div className="card tableau-defile">
          <table className="tableau">
            <thead><tr><th>Ordre</th><th>Réf.</th><th>Titre</th><th>Catégorie</th><th>Date</th><th>Inscrits</th><th></th></tr></thead>
            <tbody>
              {formations.map(f => (
                <tr key={f.id}>
                  <td>{f.ordre ?? '—'}</td>
                  <td>{f.reference && <span className="badge badge-ref">{f.reference}</span>}</td>
                  <td style={{ fontWeight: 500, color: 'var(--ink)' }}>{f.titre}</td>
                  <td>{f.categorie || '—'}</td>
                  <td>{formatDate(f.date_session, 'short') || '—'}</td>
                  <td>{acces.filter(a => a.formation_id === f.id).length}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn-lien" onClick={() => onEditer(f)}>Gérer →</button>
                    <button className="btn-lien danger" onClick={() => supprimer(f)}>Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
