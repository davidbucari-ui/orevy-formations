import { useState } from 'react'
import { supabase, q } from '../../lib/supabase'
import { formatDate, messageErreur } from '../../lib/format'
import { Vide } from '../../components/ui'

const VIDE = { nom: '', email: '', is_admin: false, structure_id: '', nouvelle_structure: '' }

export default function Participants({ participants, acces, structures, envois, recharger, setMessage }) {
  const [edition, setEdition] = useState(null)   // null | 'nouveau' | participant
  const [form, setForm] = useState(VIDE)
  const [saving, setSaving] = useState(false)
  const [filtre, setFiltre] = useState('')
  const [fStructure, setFStructure] = useState('')
  const [choisis, setChoisis] = useState([])
  const [envoi, setEnvoi] = useState(false)
  const [structuresOuvertes, setStructuresOuvertes] = useState(false)

  function ouvrir(p) {
    setEdition(p)
    setForm(p === 'nouveau' ? { ...VIDE, structure_id: fStructure && fStructure !== 'aucune' ? fStructure : '' }
      : { ...VIDE, nom: p.nom || '', email: p.email || '', is_admin: !!p.is_admin, structure_id: p.structure_id || '' })
  }

  async function enregistrer(e) {
    e.preventDefault(); setSaving(true)
    try {
      let structure_id = form.structure_id || null
      if (form.structure_id === 'nouvelle') {
        const nom = form.nouvelle_structure.trim()
        if (!nom) throw new Error('Donnez un nom à la nouvelle structure.')
        structure_id = (await q(supabase.from('structures').insert({ nom }).select().single())).id
      }
      const corps = { nom: form.nom.trim(), email: form.email.trim().toLowerCase(), is_admin: form.is_admin, structure_id }
      if (edition === 'nouveau') await q(supabase.from('participants').insert(corps))
      else await q(supabase.from('participants').update(corps).eq('id', edition.id))
      setMessage({ texte: edition === 'nouveau'
        ? `${corps.nom} est inscrit(e). Ouvrez-lui des formations dans l'onglet Accès, puis envoyez-lui l'invitation.`
        : 'Participant modifié.' })
      setEdition(null); recharger()
    } catch (err) {
      setMessage({ erreur: true, texte: err.code === '23505' ? 'Ce nom de structure ou cet email existe déjà.' : messageErreur(err) })
    }
    setSaving(false)
  }

  async function supprimer(p) {
    const n = acces.filter(a => a.participant_id === p.id).length
    if (!confirm(`Supprimer ${p.nom || p.email}${n ? ` et ses ${n} accès` : ''}, avec sa progression et ses résultats ?`)) return
    try {
      if (n) await q(supabase.from('acces_formations').delete().eq('participant_id', p.id))
      await q(supabase.from('participants').delete().eq('id', p.id))
      setMessage({ texte: 'Participant supprimé.' }); recharger()
    } catch (err) { setMessage({ erreur: true, texte: messageErreur(err) }) }
  }

  async function inviter() {
    const liste = participants.filter(p => choisis.includes(p.id))
    if (!confirm(`Envoyer l'email de connexion à ${liste.length} participant${liste.length > 1 ? 's' : ''} ?\n\n${liste.map(p => `- ${p.nom} (${p.email})`).join('\n')}`)) return
    setEnvoi(true)
    const { data, error } = await supabase.functions.invoke('inviter', { body: { participant_ids: choisis } })
    setEnvoi(false)
    if (error) {
      let detail = error.message
      try { detail = (await error.context.json()).erreur || detail } catch { /* réponse sans corps JSON */ }
      setMessage({ erreur: true, texte: "L'envoi n'a pas pu se faire : " + detail })
      return
    }
    const r = data.resultats || []
    const ok = r.filter(x => x.statut === 'envoye'), ko = r.filter(x => x.statut === 'echec')
    setMessage({ erreur: ko.length > 0, texte:
      `${ok.length} email${ok.length > 1 ? 's' : ''} envoyé${ok.length > 1 ? 's' : ''}` +
      (ko.length ? ` · ${ko.length} échec${ko.length > 1 ? 's' : ''} : ${ko.map(x => `${x.email} (${x.erreur})`).join(' ; ')}` : '.') })
    setChoisis([]); recharger()
  }

  const dernierEnvoi = id => envois.find(e => e.participant_id === id)
  const nomStructure = id => structures.find(s => s.id === id)?.nom
  const f = filtre.trim().toLowerCase()
  const visibles = participants.filter(p =>
    (!f || p.nom?.toLowerCase().includes(f) || p.email?.toLowerCase().includes(f)) &&
    (!fStructure || (fStructure === 'aucune' ? !p.structure_id : p.structure_id === fStructure)))
  const tousChoisis = visibles.length > 0 && visibles.every(p => choisis.includes(p.id))

  return (
    <div>
      {edition ? (
        <form className="card formulaire" onSubmit={enregistrer}>
          <div className="grille-champs">
            <div className="field"><label htmlFor="p-nom">Nom *</label><input id="p-nom" type="text" required value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} /></div>
            <div className="field"><label htmlFor="p-email">Email *</label><input id="p-email" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div className="field">
              <label htmlFor="p-structure">Structure</label>
              <select id="p-structure" value={form.structure_id} onChange={e => setForm({ ...form, structure_id: e.target.value })}>
                <option value="">Aucune</option>
                {structures.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                <option value="nouvelle">+ Nouvelle structure…</option>
              </select>
            </div>
            {form.structure_id === 'nouvelle' && (
              <div className="field"><label htmlFor="p-nouvelle">Nom de la nouvelle structure</label><input id="p-nouvelle" type="text" placeholder="Ex : Crèche Les Lutins" value={form.nouvelle_structure} onChange={e => setForm({ ...form, nouvelle_structure: e.target.value })} /></div>
            )}
            <label className="case large">
              <input type="checkbox" checked={form.is_admin} onChange={e => setForm({ ...form, is_admin: e.target.checked })} />
              Administrateur (accès complet à cette interface)
            </label>
          </div>
          <div className="actions">
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
            <button type="button" className="btn-secondary" onClick={() => setEdition(null)}>Annuler</button>
          </div>
        </form>
      ) : (
        <div className="actions" style={{ marginBottom: 16 }}>
          <input type="text" aria-label="Rechercher" placeholder="Rechercher un nom ou un email…" value={filtre} onChange={e => setFiltre(e.target.value)} style={{ maxWidth: 280 }} />
          <select aria-label="Structure" value={fStructure} onChange={e => setFStructure(e.target.value)} style={{ maxWidth: 220 }}>
            <option value="">Toutes les structures</option>
            {structures.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
            <option value="aucune">Sans structure</option>
          </select>
          <div style={{ flex: 1 }} />
          <button className="btn-secondary btn-petit" onClick={() => setStructuresOuvertes(!structuresOuvertes)}>Structures ({structures.length})</button>
          <button className="btn-primary" onClick={() => ouvrir('nouveau')}>+ Nouveau participant</button>
        </div>
      )}

      {structuresOuvertes && !edition && <GestionStructures structures={structures} participants={participants} recharger={recharger} setMessage={setMessage} />}

      {choisis.length > 0 && !edition && (
        <div className="barre-selection">
          <span>{choisis.length} sélectionné{choisis.length > 1 ? 's' : ''}</span>
          <button className="btn-primary btn-petit" onClick={inviter} disabled={envoi}>{envoi ? 'Envoi…' : '✉ Envoyer l\'email de connexion'}</button>
          <button className="btn-lien" onClick={() => setChoisis([])}>Annuler</button>
          <span className="sous" style={{ flexBasis: '100%' }}>Première fois : invitation. Déjà invité : nouvel email de connexion. Les emails partent par le SMTP configuré dans Supabase.</span>
        </div>
      )}

      {visibles.length === 0 ? <Vide>Aucun participant.</Vide> : (
        <div className="card tableau-defile">
          <table className="tableau">
            <thead><tr>
              <th style={{ width: 32 }}><input type="checkbox" aria-label="Tout sélectionner" checked={tousChoisis}
                onChange={e => setChoisis(e.target.checked ? [...new Set([...choisis, ...visibles.map(p => p.id)])] : choisis.filter(id => !visibles.some(p => p.id === id)))} /></th>
              <th>Nom</th><th>Email</th><th>Formations</th><th>Email de connexion</th><th></th>
            </tr></thead>
            <tbody>
              {visibles.map(p => {
                const env = dernierEnvoi(p.id)
                return (
                  <tr key={p.id}>
                    <td><input type="checkbox" aria-label={`Sélectionner ${p.nom}`} checked={choisis.includes(p.id)}
                      onChange={e => setChoisis(e.target.checked ? [...choisis, p.id] : choisis.filter(x => x !== p.id))} /></td>
                    <td style={{ fontWeight: 500, color: 'var(--ink)' }}>
                      {p.nom} {p.is_admin && <span className="badge badge-new">Admin</span>}
                      {nomStructure(p.structure_id) && <span className="sous">{nomStructure(p.structure_id)}</span>}
                    </td>
                    <td>{p.email}</td>
                    <td>{acces.filter(a => a.participant_id === p.id).length}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{env
                      ? <span className={`badge ${env.statut === 'envoye' ? 'badge-seen' : 'badge-echec'}`}>{env.statut === 'echec' ? 'Échec' : env.type === 'invitation' ? 'Invité' : 'Relancé'} le {formatDate(env.envoye_le, 'short')}</span>
                      : <span className="badge badge-pending">Jamais envoyé</span>}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn-lien" onClick={() => ouvrir(p)}>Modifier</button>
                      <button className="btn-lien danger" onClick={() => supprimer(p)}>Supprimer</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function GestionStructures({ structures, participants, recharger, setMessage }) {
  const [nom, setNom] = useState('')
  const [renommage, setRenommage] = useState(null)   // { id, nom }

  async function action(fn, ok) {
    try { await fn(); setMessage({ texte: ok }); recharger() }
    catch (err) { setMessage({ erreur: true, texte: err.code === '23505' ? 'Une structure porte déjà ce nom.' : messageErreur(err) }) }
  }

  return (
    <div className="card formulaire">
      <p style={{ fontWeight: 600, marginBottom: 12 }}>Structures</p>
      {structures.map(s => {
        const n = participants.filter(p => p.structure_id === s.id).length
        return (
          <div key={s.id} className="ligne-liste" style={{ padding: '8px 0' }}>
            {renommage?.id === s.id
              ? <input type="text" aria-label="Nouveau nom" value={renommage.nom} onChange={e => setRenommage({ ...renommage, nom: e.target.value })} style={{ flex: 1 }} />
              : <span style={{ flex: 1 }}>{s.nom} <span className="sous" style={{ display: 'inline' }}>· {n} participant{n > 1 ? 's' : ''}</span></span>}
            {renommage?.id === s.id
              ? <button className="btn-lien" onClick={() => action(() => q(supabase.from('structures').update({ nom: renommage.nom.trim() }).eq('id', s.id)), 'Structure renommée.').then(() => setRenommage(null))}>Enregistrer</button>
              : <button className="btn-lien" onClick={() => setRenommage({ id: s.id, nom: s.nom })}>Renommer</button>}
            <button className="btn-lien danger" onClick={() => confirm(`Supprimer « ${s.nom} » ? Ses ${n} participants resteront inscrits, sans structure.`) &&
              action(() => q(supabase.from('structures').delete().eq('id', s.id)), 'Structure supprimée.')}>Supprimer</button>
          </div>
        )
      })}
      <form className="actions" style={{ marginTop: 12 }} onSubmit={e => { e.preventDefault(); if (nom.trim()) action(() => q(supabase.from('structures').insert({ nom: nom.trim() })), 'Structure ajoutée.').then(() => setNom('')) }}>
        <input type="text" aria-label="Nom de la structure" placeholder="Ex : Crèche Les Lutins" value={nom} onChange={e => setNom(e.target.value)} style={{ maxWidth: 320 }} />
        <button type="submit" className="btn-secondary btn-petit">+ Ajouter</button>
      </form>
    </div>
  )
}
