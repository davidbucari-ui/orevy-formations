import { useEffect, useState } from 'react'
import { supabase, q } from '../lib/supabase'
import { messageErreur } from '../lib/format'
import { Alerte, Vide } from './ui'

/* Liste d'éléments d'une table, rattachés à une formation, avec ajout,
   modification et suppression.
   champs : [{ nom, libelle, type: 'text'|'textarea'|'number'|'select'|'lignes', options, requis, aide, large }]
   - 'lignes' : un tableau édité comme un texte à une valeur par ligne
   versFormulaire / versBase : conversions optionnelles d'une ligne. */
export default function ListeEditable({ table, formationId, tri, champs, resume, libelleAjout, versFormulaire, versBase, nouveau }) {
  const [lignes, setLignes] = useState(null)
  const [edition, setEdition] = useState(null)    // null | 'nouveau' | ligne
  const [form, setForm] = useState({})
  const [message, setMessage] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { charger() }, [table, formationId])

  async function charger() {
    try {
      let req = supabase.from(table).select('*').eq('formation_id', formationId)
      tri.forEach(col => { req = req.order(col) })
      setLignes(await q(req))
    } catch (err) { setMessage({ erreur: true, texte: messageErreur(err) }) }
  }

  function ouvrir(ligne) {
    const base = ligne === 'nouveau' ? nouveau(lignes) : ligne
    const f = {}
    champs.forEach(c => {
      const v = base[c.nom]
      f[c.nom] = c.type === 'lignes' ? (v || []).join('\n') : (v ?? '')
    })
    setForm(versFormulaire ? versFormulaire(f, base) : f)
    setEdition(ligne); setMessage(null)
  }

  async function enregistrer(e) {
    e.preventDefault(); setSaving(true)
    const corps = {}
    champs.forEach(c => {
      const v = form[c.nom]
      if (c.type === 'number') corps[c.nom] = v === '' ? null : Number(v)
      else if (c.type === 'lignes') corps[c.nom] = String(v).split('\n').map(s => s.trim()).filter(Boolean)
      else corps[c.nom] = v === '' ? null : v
    })
    try {
      const donnees = versBase ? versBase(corps, form) : corps
      if (edition === 'nouveau') await q(supabase.from(table).insert({ ...donnees, formation_id: formationId }))
      else await q(supabase.from(table).update(donnees).eq('id', edition.id))
      setMessage({ texte: edition === 'nouveau' ? 'Ajouté.' : 'Modifié.' })
      setEdition(null); charger()
    } catch (err) { setMessage({ erreur: true, texte: messageErreur(err) }) }
    setSaving(false)
  }

  async function supprimer(ligne) {
    if (!confirm('Supprimer cet élément ?')) return
    try { await q(supabase.from(table).delete().eq('id', ligne.id)); charger() }
    catch (err) { setMessage({ erreur: true, texte: messageErreur(err) }) }
  }

  return (
    <div>
      <Alerte message={message} />
      {edition ? (
        <form className="card formulaire" onSubmit={enregistrer}>
          <div className="grille-champs">
            {champs.map(c => (
              <div key={c.nom} className={`field ${c.large ? 'large' : ''}`}>
                <label>{c.libelle}{c.requis && ' *'}</label>
                <Champ c={c} valeur={form[c.nom]} onChange={v => setForm({ ...form, [c.nom]: v })} />
                {c.aide && <p className="aide">{c.aide}</p>}
              </div>
            ))}
          </div>
          <div className="actions">
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
            <button type="button" className="btn-secondary" onClick={() => setEdition(null)}>Annuler</button>
          </div>
        </form>
      ) : (
        <div className="actions" style={{ justifyContent: 'flex-end', marginBottom: 16 }}>
          <button className="btn-primary" onClick={() => ouvrir('nouveau')} disabled={!lignes}>+ {libelleAjout}</button>
        </div>
      )}
      {lignes === null ? <Vide>Chargement…</Vide> : lignes.length === 0 ? <Vide>Aucun élément pour l'instant.</Vide> : (
        <div className="card">
          {lignes.map(l => (
            <div key={l.id} className="ligne-liste">
              <div style={{ flex: 1, minWidth: 0 }}>{resume(l)}</div>
              <button className="btn-lien" onClick={() => ouvrir(l)}>Modifier</button>
              <button className="btn-lien danger" onClick={() => supprimer(l)}>Supprimer</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function Champ({ c, valeur, onChange }) {
  const props = { value: valeur ?? '', onChange: e => onChange(e.target.value), required: c.requis, placeholder: c.placeholder }
  if (c.type === 'textarea' || c.type === 'lignes') return <textarea rows={c.lignes || 4} {...props} />
  if (c.type === 'select') {
    return (
      <select {...props}>
        {!c.requis && <option value="">—</option>}
        {c.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    )
  }
  return <input type={c.type === 'number' ? 'number' : c.type === 'date' ? 'date' : 'text'} {...props} />
}
