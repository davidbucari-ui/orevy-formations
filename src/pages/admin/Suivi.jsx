import { useEffect, useMemo, useState } from 'react'
import { supabase, q } from '../../lib/supabase'
import { formatDate, messageErreur } from '../../lib/format'
import { meilleurResultat } from '../../lib/parcours'
import { Vide } from '../../components/ui'

/* Une ligne par accès ouvert : où en est chaque participant dans chaque formation. */
export default function Suivi({ formations, participants, acces, structures, setMessage }) {
  const [donnees, setDonnees] = useState(null)   // { modules: {fid: n}, progression, resultats }
  const [fStructure, setFStructure] = useState('')
  const [fFormation, setFFormation] = useState('')
  const [fEtat, setFEtat] = useState('')

  useEffect(() => {
    Promise.all([
      q(supabase.from('formation_blocs').select('formation_id, sequence_num')),
      q(supabase.from('slides').select('formation_id, sequence_num')),
      q(supabase.from('progression').select('participant_id, formation_id, module_num, lu_le')),
      q(supabase.from('resultats_quiz').select('participant_id, formation_id, score, total, reussi, passe_le')),
    ]).then(([blocs, slides, progression, resultats]) => {
      const modules = {}
      formations.forEach(f => {
        const compter = l => new Set(l.filter(x => x.formation_id === f.id).map(x => x.sequence_num)).size
        modules[f.id] = compter(blocs) || compter(slides)
      })
      setDonnees({ modules, progression, resultats })
    }).catch(err => setMessage({ erreur: true, texte: messageErreur(err) }))
  }, [formations])

  const lignes = useMemo(() => {
    if (!donnees) return []
    return acces.map(a => {
      const p = participants.find(x => x.id === a.participant_id)
      const f = formations.find(x => x.id === a.formation_id)
      if (!p || !f) return null
      const prog = donnees.progression.filter(x => x.participant_id === p.id && x.formation_id === f.id)
      const res = donnees.resultats.filter(x => x.participant_id === p.id && x.formation_id === f.id)
      const meilleur = meilleurResultat(res)
      const total = donnees.modules[f.id] || 0
      const lus = Math.min(prog.length, total)
      const dates = [...prog.map(x => x.lu_le), ...res.map(x => x.passe_le), a.date_visionnage].filter(Boolean).sort()
      const etat = meilleur?.reussi ? 'validee' : (lus || res.length || a.vu) ? 'en_cours' : 'pas_commencee'
      return { id: a.id, p, f, total, lus, meilleur, tentatives: res.length, derniere: dates[dates.length - 1], etat,
        structure: structures.find(s => s.id === p.structure_id)?.nom }
    }).filter(Boolean)
      .sort((x, y) => (x.p.nom || '').localeCompare(y.p.nom || '') || (x.f.ordre ?? 99) - (y.f.ordre ?? 99))
  }, [donnees, acces, participants, formations, structures])

  if (!donnees) return <Vide>Chargement du suivi…</Vide>

  const visibles = lignes.filter(l =>
    (!fStructure || (fStructure === 'aucune' ? !l.p.structure_id : l.p.structure_id === fStructure)) &&
    (!fFormation || l.f.id === fFormation) && (!fEtat || l.etat === fEtat))
  const compte = e => visibles.filter(l => l.etat === e).length
  const ETATS = { validee: ['Validée', 'badge-seen'], en_cours: ['En cours', 'badge-new'], pas_commencee: ['Pas commencée', 'badge-pending'] }

  return (
    <div>
      <div className="chiffres">
        <div><strong>{visibles.length}</strong><span>inscriptions</span></div>
        <div><strong>{compte('pas_commencee')}</strong><span>pas commencées</span></div>
        <div><strong>{compte('en_cours')}</strong><span>en cours</span></div>
        <div><strong>{compte('validee')}</strong><span>validées</span></div>
      </div>
      <div className="actions" style={{ marginBottom: 16 }}>
        <select aria-label="Structure" value={fStructure} onChange={e => setFStructure(e.target.value)} style={{ maxWidth: 240 }}>
          <option value="">Toutes les structures</option>
          {structures.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
          <option value="aucune">Sans structure</option>
        </select>
        <select aria-label="Formation" value={fFormation} onChange={e => setFFormation(e.target.value)} style={{ maxWidth: 300 }}>
          <option value="">Toutes les formations</option>
          {formations.map(f => <option key={f.id} value={f.id}>{f.reference ? `${f.reference} · ` : ''}{f.titre}</option>)}
        </select>
        <select aria-label="État" value={fEtat} onChange={e => setFEtat(e.target.value)} style={{ maxWidth: 200 }}>
          <option value="">Tous les états</option>
          {Object.entries(ETATS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      {visibles.length === 0 ? <Vide>Aucune inscription pour ces filtres.</Vide> : (
        <div className="card tableau-defile">
          <table className="tableau">
            <thead><tr><th>Participant</th><th>Formation</th><th>Parcours</th><th>Quiz</th><th>État</th><th>Dernière activité</th></tr></thead>
            <tbody>
              {visibles.map(l => (
                <tr key={l.id}>
                  <td style={{ color: 'var(--ink)', fontWeight: 500 }}>{l.p.nom}{l.structure && <span className="sous">{l.structure}</span>}</td>
                  <td>{l.f.reference && <span className="badge badge-ref" style={{ marginRight: 6 }}>{l.f.reference}</span>}{l.f.titre}</td>
                  <td style={{ minWidth: 130 }}>
                    {l.total ? <div className="carte-progression" style={{ margin: 0 }}><div className="jauge"><div style={{ width: `${Math.round(l.lus / l.total * 100)}%` }} /></div><span>{l.lus}/{l.total}</span></div> : '—'}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {l.meilleur ? <>{l.meilleur.score}/{l.meilleur.total}<span className="sous">{l.tentatives} tentative{l.tentatives > 1 ? 's' : ''}</span></> : '—'}
                  </td>
                  <td><span className={`badge ${ETATS[l.etat][1]}`}>{l.etat === 'validee' ? `Validée le ${formatDate(l.meilleur.passe_le, 'short')}` : ETATS[l.etat][0]}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>{l.derniere ? formatDate(l.derniere, 'short') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
