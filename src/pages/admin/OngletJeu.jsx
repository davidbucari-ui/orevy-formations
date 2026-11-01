import { useEffect, useState } from 'react'
import { supabase, q } from '../../lib/supabase'
import { messageErreur } from '../../lib/format'
import { Alerte, Vide } from '../../components/ui'
import { Bloc, lienJeu } from '../../components/Blocs'
import QrCode from '../../components/QrCode'

const NIVEAUX = [['', 'Au choix du joueur'], ['fam', 'Familles (tout public)'], ['pro', 'Professionnels'], ['mix', 'Mixte']]
const MODES = [['', 'Au choix du joueur'], ['coop', 'Coopératif'], ['comp', 'Compétitif']]

// Onglet « Jeu » : lancer Cube à cube et le proposer (ou non) dans le parcours e-learning.
// Le jeu est stocké comme un bloc de type « jeu » dans formation_blocs.
export default function OngletJeu({ formation }) {
  const [blocs, setBlocs] = useState(null)
  const [reglages, setReglages] = useState({ niveau: '', mode: '', titre: '', consigne: '', module: '' })
  const [message, setMessage] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { charger() }, [formation.id])

  async function charger() {
    try {
      const lignes = await q(supabase.from('formation_blocs').select('*').eq('formation_id', formation.id).order('sequence_num').order('ordre'))
      setBlocs(lignes)
      const jeu = lignes.find(b => b.type === 'jeu')
      const modules = [...new Set(lignes.map(b => b.sequence_num))].sort((a, b) => a - b)
      const c = jeu?.contenu || {}
      setReglages({
        niveau: c.niveau || '', mode: c.mode || '', titre: c.titre || '', consigne: c.consigne || '',
        module: String(jeu ? jeu.sequence_num : (modules[modules.length - 1] ?? 1)),
      })
    } catch (err) { setMessage({ erreur: true, texte: messageErreur(err) }) }
  }

  if (blocs === null) return <><Alerte message={message} /><Vide>Chargement…</Vide></>

  const jeu = blocs.find(b => b.type === 'jeu')
  const modules = [...new Set(blocs.map(b => b.sequence_num))].sort((a, b) => a - b)
  const changer = (nom, v) => setReglages({ ...reglages, [nom]: v })
  const contenu = Object.fromEntries(['titre', 'consigne', 'niveau', 'mode'].map(k => [k, reglages[k].trim()]).filter(([, v]) => v))

  async function enregistrer() {
    setSaving(true); setMessage(null)
    const module = Number(reglages.module) || 1
    try {
      if (jeu) {
        const corps = { contenu, sequence_num: module }
        if (module !== jeu.sequence_num) corps.ordre = Math.max(0, ...blocs.filter(b => b.sequence_num === module).map(b => b.ordre)) + 1
        await q(supabase.from('formation_blocs').update(corps).eq('id', jeu.id))
      } else {
        const ordre = Math.max(0, ...blocs.filter(b => b.sequence_num === module).map(b => b.ordre)) + 1
        await q(supabase.from('formation_blocs').insert({ formation_id: formation.id, type: 'jeu', sequence_num: module, ordre, contenu }))
      }
      setMessage({ texte: jeu ? 'Réglages du jeu enregistrés.' : 'Le jeu est ajouté au parcours des participants.' })
      await charger()
    } catch (err) { setMessage({ erreur: true, texte: messageErreur(err) }) }
    setSaving(false)
  }

  async function retirer() {
    if (!confirm('Retirer le jeu du parcours des participants ?')) return
    setSaving(true); setMessage(null)
    try {
      await q(supabase.from('formation_blocs').delete().eq('id', jeu.id))
      setMessage({ texte: 'Le jeu est retiré du parcours.' })
      await charger()
    } catch (err) { setMessage({ erreur: true, texte: messageErreur(err) }) }
    setSaving(false)
  }

  return (
    <div>
      <Alerte message={message} />

      <section className="card formulaire">
        <h3 style={{ marginBottom: 6 }}>🎲 Cube à cube</h3>
        <p className="aide" style={{ marginTop: 0, marginBottom: 16 }}>
          Le jeu de plateau sur la petite enfance : chaque bonne réponse ajoute un cube à la pyramide.
          Ouvrez-le ici pour l'animer pendant une session, ou proposez-le aux participants dans leur parcours.
        </p>
        <div className="grille-champs">
          <div className="field">
            <label htmlFor="jeu-niveau">Niveau des questions</label>
            <select id="jeu-niveau" value={reglages.niveau} onChange={e => changer('niveau', e.target.value)}>
              {NIVEAUX.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="jeu-mode">Mode de jeu</label>
            <select id="jeu-mode" value={reglages.mode} onChange={e => changer('mode', e.target.value)}>
              {MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="jeu-lancer">
          <div>
            <a className="btn-primary" href={lienJeu(reglages)} target="_blank" rel="noopener noreferrer">Ouvrir le jeu →</a>
            <p className="aide" style={{ maxWidth: 360 }}>
              Ou faites scanner ce QR code : il ouvre le jeu sur le téléphone avec ces réglages.
              Téléchargez-le pour le mettre sur une diapo ou l'imprimer. Pour une partie à plusieurs
              téléphones, utilisez plutôt « Créer une partie en ligne » dans le jeu : il affiche son propre QR code.
            </p>
          </div>
          <QrCode texte={new URL(lienJeu(reglages), window.location.origin).href} taille={168}
            nomFichier={`cube-a-cube${reglages.niveau ? '-' + reglages.niveau : ''}${reglages.mode ? '-' + reglages.mode : ''}`} />
        </div>
      </section>

      <section className="card formulaire">
        <h3 style={{ marginBottom: 6 }}>Dans le parcours des participants</h3>
        <p className="aide" style={{ marginTop: 0, marginBottom: 16 }}>
          {jeu
            ? `Le jeu est proposé aux participants dans le module ${modules.indexOf(jeu.sequence_num) + 1} du parcours e-learning, avec le niveau et le mode choisis ci-dessus.`
            : 'Le jeu n\'est pas encore proposé aux participants. Ajoutez-le pour qu\'une carte « Ouvrir le jeu » apparaisse dans leur parcours, avec le niveau et le mode choisis ci-dessus.'}
        </p>
        <div className="grille-champs">
          <div className="field">
            <label htmlFor="jeu-module">Module</label>
            {modules.length
              ? <select id="jeu-module" value={reglages.module} onChange={e => changer('module', e.target.value)}>
                  {modules.map((m, k) => <option key={m} value={m}>Module {k + 1}</option>)}
                </select>
              : <p className="aide">Le parcours est vide : le jeu formera le module 1.</p>}
          </div>
          <div className="field">
            <label htmlFor="jeu-titre">Titre de la carte</label>
            <input id="jeu-titre" type="text" value={reglages.titre} placeholder="Cube à cube" onChange={e => changer('titre', e.target.value)} />
          </div>
          <div className="field large">
            <label htmlFor="jeu-consigne">Consigne</label>
            <textarea id="jeu-consigne" rows={2} value={reglages.consigne} placeholder="Un jeu de plateau sur la petite enfance, à jouer seul ou en équipe…" onChange={e => changer('consigne', e.target.value)} />
          </div>
        </div>
        <div className="actions">
          <button className="btn-primary" onClick={enregistrer} disabled={saving}>
            {saving ? 'Enregistrement…' : jeu ? 'Enregistrer les réglages' : 'Ajouter au parcours'}
          </button>
          {jeu && <button className="btn-secondary" onClick={retirer} disabled={saving}>Retirer du parcours</button>}
        </div>
      </section>

      <p className="aide" style={{ marginBottom: 8 }}>Aperçu de la carte vue par les participants :</p>
      <div className="card formulaire"><Bloc b={{ id: 'apercu', type: 'jeu', contenu }} /></div>
    </div>
  )
}
