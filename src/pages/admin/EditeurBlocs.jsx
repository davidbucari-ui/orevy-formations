import { useEffect, useState } from 'react'
import { supabase, q } from '../../lib/supabase'
import { messageErreur } from '../../lib/format'
import { Alerte, Vide } from '../../components/ui'
import { Bloc, LIBELLES_BLOCS, TYPES_BLOCS, dureeEstimee } from '../../components/Blocs'

/* Champs de chaque type de bloc. Types de champ :
   texte, zone (plusieurs lignes), nombre, couleur, liste (une valeur par ligne),
   objets (liste d'éléments à sous-champs), case (case à cocher). */
const COULEURS = [['#E07A5F', 'Corail'], ['#3D8A7A', 'Vert d\'eau'], ['#7B68AE', 'Violet'], ['#1E3A5F', 'Bleu nuit'], ['#F4A261', 'Orange'], ['#C8622A', 'Terracotta']]

const SCHEMAS = {
  seq: [
    { nom: 'sous', libelle: 'Surtitre', aide: 'Ex : Module 1 · Comprendre les émotions' },
    { nom: 'titre', libelle: 'Titre', requis: true },
    { nom: 'emoji', libelle: 'Emoji', court: true },
    { nom: 'couleur', libelle: 'Couleur', type: 'couleur', court: true },
    { nom: 'desc', libelle: 'Texte', type: 'zone', lignes: 6 },
    { nom: 'points', libelle: 'Points clés', type: 'liste' },
    { nom: 'tip', libelle: 'Encadré astuce' },
  ],
  principe: [
    { nom: 'num', libelle: 'Numéro', type: 'nombre', court: true },
    { nom: 'couleur', libelle: 'Couleur', type: 'couleur', court: true },
    { nom: 'titre', libelle: 'Titre', requis: true },
    { nom: 'desc', libelle: 'Texte', type: 'zone', lignes: 5 },
  ],
  tip: [
    { nom: 'emoji', libelle: 'Emoji', court: true },
    { nom: 'titre', libelle: 'Titre' },
    { nom: 'contenu', libelle: 'Texte', type: 'zone', requis: true },
  ],
  retenir: [
    { nom: 'titre', libelle: 'Titre', aide: 'Par défaut : « À retenir »' },
    { nom: 'points', libelle: 'Points', type: 'liste', requis: true },
  ],
  citation: [{ nom: 'texte', libelle: 'Citation', type: 'zone', requis: true }],
  comparaison: [
    { nom: 'intro', libelle: 'Introduction', type: 'zone', lignes: 2 },
    { nom: 'plutot', libelle: 'Plutôt', type: 'liste' },
    { nom: 'eviter', libelle: 'À éviter', type: 'liste' },
  ],
  erreur: [{ nom: 'items', libelle: 'Erreurs à éviter', type: 'liste', requis: true }],
  question: [
    { nom: 'enonce', libelle: 'Question', type: 'zone', lignes: 2, requis: true },
    { nom: 'options', libelle: 'Réponses proposées', type: 'objets', requis: true, aide: 'Cochez la ou les bonnes réponses.',
      sous: [{ nom: 'texte', libelle: 'Réponse' }, { nom: 'juste', libelle: 'Bonne réponse', type: 'case' }] },
    { nom: 'explication', libelle: 'Explication affichée après la réponse', type: 'zone', lignes: 3 },
  ],
  situation: [
    { nom: 'label', libelle: 'Étiquette', aide: 'Par défaut : « Mise en situation »' },
    { nom: 'titre', libelle: 'Titre' },
    { nom: 'contexte', libelle: 'Contexte', type: 'zone', lignes: 3 },
    { nom: 'repliques', libelle: 'Dialogue', type: 'objets', sous: [{ nom: 'qui', libelle: 'Qui parle', court: true }, { nom: 'texte', libelle: 'Réplique' }] },
    { nom: 'consigne', libelle: 'Consigne', aide: 'Ex : Que lui répondez-vous ?' },
    { nom: 'reponse_modele', libelle: 'Réponse possible', type: 'zone', lignes: 3 },
    { nom: 'points', libelle: 'Points d\'attention', type: 'liste' },
  ],
  reflexion: [{ nom: 'question', libelle: 'Question', type: 'zone', requis: true }],
  essayer: [
    { nom: 'label', libelle: 'Étiquette', aide: 'Par défaut : « À essayer cette semaine »' },
    { nom: 'titre', libelle: 'Titre' },
    { nom: 'etapes', libelle: 'Étapes', type: 'objets', sous: [{ nom: 'titre', libelle: 'Étape', court: true }, { nom: 'texte', libelle: 'Description' }] },
    { nom: 'note', libelle: 'Note finale', type: 'zone', lignes: 2 },
  ],
  image: [
    { nom: 'url', libelle: 'Adresse de l\'image', requis: true, aide: 'Lien public, par exemple depuis le stockage Supabase.' },
    { nom: 'legende', libelle: 'Légende' },
    { nom: 'alt', libelle: 'Description pour les lecteurs d\'écran' },
    { nom: 'hauteur', libelle: 'Hauteur (px)', type: 'nombre', court: true },
  ],
  video: [
    { nom: 'url', libelle: 'Lien de la vidéo', requis: true, aide: 'Lien YouTube, ou fichier MP4 public.' },
    { nom: 'titre', libelle: 'Titre' },
    { nom: 'legende', libelle: 'Légende' },
  ],
}
const NARRATION = [
  { nom: 'audio_url', libelle: 'Fichier audio (MP3)', aide: 'Lien public du fichier de narration.' },
  { nom: 'narration', libelle: 'Texte de la narration', type: 'zone', lignes: 4, aide: 'Affiché sous le lecteur et surligné pendant l\'écoute.' },
]

const resumeBloc = c => c.titre || c.enonce || c.question || c.texte || c.contenu || c.items?.[0] || c.points?.[0] || c.intro || c.legende || c.url || ''

export default function EditeurBlocs({ formation }) {
  const [blocs, setBlocs] = useState(null)
  const [edition, setEdition] = useState(null)   // brouillon du bloc en cours
  const [json, setJson] = useState(null)         // texte JSON en mode avancé
  const [message, setMessage] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { charger() }, [formation.id])

  async function charger() {
    try { setBlocs(await q(supabase.from('formation_blocs').select('*').eq('formation_id', formation.id).order('sequence_num').order('ordre'))) }
    catch (err) { setMessage({ erreur: true, texte: messageErreur(err) }) }
  }

  const modules = blocs ? [...new Set(blocs.map(b => b.sequence_num))].sort((a, b) => a - b) : []

  function nouveau(module) {
    const dans = blocs.filter(b => b.sequence_num === module)
    setEdition({ type: 'seq', sequence_num: module, ordre: Math.max(0, ...dans.map(b => b.ordre)) + 1, contenu: {} })
    setJson(null); setMessage(null)
  }

  async function enregistrer() {
    let contenu = edition.contenu
    if (json !== null) {
      try { contenu = JSON.parse(json) } catch { setMessage({ erreur: true, texte: 'Le JSON n\'est pas valide : vérifiez les guillemets et les virgules.' }); return }
    }
    const manquant = (SCHEMAS[edition.type] || []).find(c => c.requis && vide(contenu[c.nom]))
    if (manquant) { setMessage({ erreur: true, texte: `Le champ « ${manquant.libelle} » est obligatoire.` }); return }
    setSaving(true)
    const corps = { type: edition.type, sequence_num: Number(edition.sequence_num) || 1, ordre: Number(edition.ordre) || 1, contenu: nettoyer(contenu) }
    try {
      if (edition.id) await q(supabase.from('formation_blocs').update(corps).eq('id', edition.id))
      else await q(supabase.from('formation_blocs').insert({ ...corps, formation_id: formation.id }))
      setMessage({ texte: edition.id ? 'Bloc enregistré.' : 'Bloc ajouté.' })
      setEdition(null); setJson(null); charger()
    } catch (err) { setMessage({ erreur: true, texte: messageErreur(err) }) }
    setSaving(false)
  }

  async function supprimer(b) {
    if (!confirm('Supprimer ce bloc ?')) return
    try { await q(supabase.from('formation_blocs').delete().eq('id', b.id)); charger() }
    catch (err) { setMessage({ erreur: true, texte: messageErreur(err) }) }
  }

  // Échange la place d'un bloc avec son voisin dans le module.
  async function deplacer(b, sens) {
    const dans = blocs.filter(x => x.sequence_num === b.sequence_num)
    const i = dans.findIndex(x => x.id === b.id), autre = dans[i + sens]
    if (!autre) return
    const [o1, o2] = autre.ordre === b.ordre ? [b.ordre + sens, b.ordre] : [autre.ordre, b.ordre]
    try {
      await q(supabase.from('formation_blocs').update({ ordre: o1 }).eq('id', b.id))
      await q(supabase.from('formation_blocs').update({ ordre: o2 }).eq('id', autre.id))
      charger()
    } catch (err) { setMessage({ erreur: true, texte: messageErreur(err) }) }
  }

  if (blocs === null) return <Vide>Chargement…</Vide>

  if (edition) {
    const schema = SCHEMAS[edition.type] || []
    const apercu = { ...edition, id: edition.id || 'apercu', contenu: json !== null ? essaiJson(json) : nettoyer(edition.contenu) }
    const changer = (nom, v) => setEdition({ ...edition, contenu: { ...edition.contenu, [nom]: v } })
    return (
      <div>
        <Alerte message={message} />
        <div className="editeur-bloc">
          <div className="card formulaire">
            <div className="grille-champs">
              <div className="field large">
                <label htmlFor="bloc-type">Type de bloc</label>
                <select id="bloc-type" value={edition.type} onChange={e => setEdition({ ...edition, type: e.target.value })}>
                  {TYPES_BLOCS.map(t => <option key={t} value={t}>{LIBELLES_BLOCS[t]}</option>)}
                </select>
              </div>
              <div className="field"><label htmlFor="bloc-module">Module n°</label><input id="bloc-module" type="number" min="1" value={edition.sequence_num} onChange={e => setEdition({ ...edition, sequence_num: e.target.value })} /></div>
              <div className="field"><label htmlFor="bloc-ordre">Position dans le module</label><input id="bloc-ordre" type="number" min="1" value={edition.ordre} onChange={e => setEdition({ ...edition, ordre: e.target.value })} /></div>
            </div>

            {json === null ? (
              <>
                <div className="grille-champs">
                  {schema.map(c => <ChampBloc key={c.nom} c={c} valeur={edition.contenu[c.nom]} onChange={v => changer(c.nom, v)} />)}
                </div>
                <details className="narration" open={!!edition.contenu.audio_url}>
                  <summary>🎧 Narration audio (facultatif)</summary>
                  <div className="grille-champs">
                    {NARRATION.map(c => <ChampBloc key={c.nom} c={c} valeur={edition.contenu[c.nom]} onChange={v => changer(c.nom, v)} />)}
                  </div>
                </details>
              </>
            ) : (
              <div className="field">
                <label htmlFor="bloc-json">Contenu (JSON)</label>
                <textarea id="bloc-json" rows={16} value={json} onChange={e => setJson(e.target.value)} style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }} />
              </div>
            )}

            <div className="actions">
              <button className="btn-primary" onClick={enregistrer} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
              <button className="btn-secondary" onClick={() => { setEdition(null); setJson(null); setMessage(null) }}>Annuler</button>
              <div style={{ flex: 1 }} />
              <button className="btn-lien" onClick={() => {
                if (json === null) setJson(JSON.stringify(nettoyer(edition.contenu), null, 2))
                else { const c = essaiJson(json); if (c.__invalide) { setMessage({ erreur: true, texte: 'Corrigez le JSON avant de revenir au formulaire.' }); return } setEdition({ ...edition, contenu: c }); setJson(null) }
              }}>{json === null ? 'Mode avancé (JSON)' : 'Revenir au formulaire'}</button>
            </div>
          </div>
          <div className="apercu">
            <p className="apercu-titre">Aperçu</p>
            {apercu.contenu.__invalide ? <Vide>JSON invalide</Vide> : <Bloc b={apercu} />}
          </div>
        </div>
      </div>
    )
  }

  const prochainModule = (modules[modules.length - 1] || 0) + 1
  return (
    <div>
      <Alerte message={message} />
      <div className="actions" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <p className="sous">{blocs.length} bloc{blocs.length > 1 ? 's' : ''} · {modules.length} module{modules.length > 1 ? 's' : ''}</p>
        <button className="btn-primary" onClick={() => nouveau(prochainModule)}>+ Nouveau module</button>
      </div>
      {modules.length === 0 && <Vide>Aucun bloc : commencez par « + Nouveau module ».</Vide>}
      {modules.map((m, k) => {
        const dans = blocs.filter(b => b.sequence_num === m)
        return (
          <section key={m} className="card module-admin">
            <div className="module-admin-tete">
              <strong>Module {k + 1}</strong>
              <span className="sous">{dans.length} blocs · environ {dureeEstimee(dans)} min</span>
              <div style={{ flex: 1 }} />
              <button className="btn-lien" onClick={() => nouveau(m)}>+ Ajouter un bloc</button>
            </div>
            {dans.map((b, i) => (
              <div key={b.id} className="ligne-liste">
                <span className="badge badge-pending" style={{ flexShrink: 0 }}>{LIBELLES_BLOCS[b.type]?.split(' (')[0] || b.type}</span>
                <span className="sous" style={{ flex: 1, minWidth: 0, color: 'var(--ink)' }}>{b.contenu?.audio_url && '🎧 '}{resumeBloc(b.contenu || {})}</span>
                <button className="btn-lien" onClick={() => deplacer(b, -1)} disabled={i === 0} aria-label="Monter">↑</button>
                <button className="btn-lien" onClick={() => deplacer(b, 1)} disabled={i === dans.length - 1} aria-label="Descendre">↓</button>
                <button className="btn-lien" onClick={() => { setEdition({ ...b, contenu: { ...(b.contenu || {}) } }); setJson(null); setMessage(null) }}>Modifier</button>
                <button className="btn-lien danger" onClick={() => supprimer(b)}>Supprimer</button>
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}

function ChampBloc({ c, valeur, onChange }) {
  const id = `champ-${c.nom}`
  const etiquette = <label htmlFor={id}>{c.libelle}{c.requis && ' *'}</label>
  const aide = c.aide && <p className="aide">{c.aide}</p>
  const classe = `field ${c.court ? '' : 'large'}`

  if (c.type === 'liste') {
    return (
      <div className={classe}>{etiquette}
        <textarea id={id} rows={Math.max(3, (valeur || []).length + 1)} value={(valeur || []).join('\n')} onChange={e => onChange(e.target.value.split('\n'))} />
        <p className="aide">{c.aide ? c.aide + ' ' : ''}Une valeur par ligne.</p>
      </div>
    )
  }
  if (c.type === 'objets') {
    const liste = Array.isArray(valeur) ? valeur : []
    const maj = (i, nom, v) => onChange(liste.map((o, j) => j === i ? { ...o, [nom]: v } : o))
    return (
      <div className={classe}>{etiquette}{aide}
        <div className="objets">
          {liste.map((o, i) => (
            <div key={i} className="objet">
              {c.sous.map(s => s.type === 'case'
                ? <label key={s.nom} className="case" style={{ margin: 0 }}><input type="checkbox" checked={!!o[s.nom]} onChange={e => maj(i, s.nom, e.target.checked)} />{s.libelle}</label>
                : <input key={s.nom} type="text" placeholder={s.libelle} aria-label={s.libelle} value={o[s.nom] || ''} onChange={e => maj(i, s.nom, e.target.value)} style={s.court ? { maxWidth: 160 } : null} />)}
              <button type="button" className="btn-lien danger" onClick={() => onChange(liste.filter((_, j) => j !== i))} aria-label="Retirer">✕</button>
            </div>
          ))}
          <button type="button" className="btn-lien" onClick={() => onChange([...liste, {}])}>+ Ajouter</button>
        </div>
      </div>
    )
  }
  if (c.type === 'couleur') {
    return (
      <div className={classe}>{etiquette}
        <select id={id} value={valeur || ''} onChange={e => onChange(e.target.value)}>
          <option value="">Par défaut</option>
          {COULEURS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          {valeur && !COULEURS.some(([v]) => v === valeur) && <option value={valeur}>{valeur}</option>}
        </select>
      </div>
    )
  }
  if (c.type === 'zone') return <div className={classe}>{etiquette}<textarea id={id} rows={c.lignes || 4} value={valeur || ''} onChange={e => onChange(e.target.value)} />{aide}</div>
  return (
    <div className={classe}>{etiquette}
      <input id={id} type={c.type === 'nombre' ? 'number' : 'text'} value={valeur ?? ''} onChange={e => onChange(c.type === 'nombre' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)} />
      {aide}
    </div>
  )
}

const vide = v => v == null || v === '' || (Array.isArray(v) && !v.some(x => typeof x === 'string' ? x.trim() : x && Object.values(x).some(Boolean)))

// Retire les lignes vides des listes et les champs vides, garde les clés inconnues.
function nettoyer(contenu) {
  const out = {}
  Object.entries(contenu || {}).forEach(([k, v]) => {
    if (Array.isArray(v)) {
      const l = v.filter(x => typeof x === 'string' ? x.trim() : x && Object.values(x).some(y => typeof y === 'string' ? y.trim() : y))
        .map(x => typeof x === 'string' ? x.trim() : x)
      if (l.length) out[k] = l
    } else if (v !== '' && v != null) out[k] = v
  })
  return out
}

function essaiJson(t) {
  try { return JSON.parse(t) } catch { return { __invalide: true } }
}
