import { useState } from 'react'
import { supabase, q } from '../../lib/supabase'
import { messageErreur } from '../../lib/format'
import { Entete, Onglets, Alerte } from '../../components/ui'
import ListeEditable, { Champ } from '../../components/ListeEditable'
import { Bloc, TYPES_BLOCS } from '../../components/Blocs'

const CHAMPS_FORMATION = [
  { nom: 'titre', libelle: 'Titre', requis: true, large: true, placeholder: 'Ex : Accueil du jeune enfant' },
  { nom: 'reference', libelle: 'Référence', placeholder: 'Ex : M3-F6' },
  { nom: 'categorie', libelle: 'Catégorie', placeholder: 'Ex : Pédagogie' },
  { nom: 'description', libelle: 'Description', type: 'textarea', large: true },
  { nom: 'date_session', libelle: 'Date de la session', type: 'date' },
  { nom: 'duree_minutes', libelle: 'Durée (minutes)', type: 'number', placeholder: '90' },
  { nom: 'lien_video', libelle: 'Lien vidéo de la session', large: true, placeholder: 'https://…', aide: 'Facultatif : enregistrement Teams, YouTube…' },
  { nom: 'ordre', libelle: 'Ordre dans le catalogue', type: 'number', aide: 'Les plus petits nombres apparaissent en premier.' },
  { nom: 'slug', libelle: 'Identifiant (slug)', placeholder: 'accueil-jeune-enfant', aide: 'Unique. Laissé vide, il est déduit du titre.' },
]

const versSlug = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const suivant = (lignes, col) => Math.max(0, ...lignes.map(l => l[col] || 0)) + 1

export default function FormationEditeur({ formation: initiale, onClose }) {
  const [formation, setFormation] = useState(initiale)
  const [onglet, setOnglet] = useState('infos')
  const nouvelle = !formation.id

  return (
    <div>
      <Entete titre={nouvelle ? 'Nouvelle formation' : formation.titre} onRetour={onClose} />
      <main className="page">
        {!nouvelle && (
          <Onglets actif={onglet} onChange={setOnglet} onglets={[
            ['infos', 'Informations'], ['blocs', 'Parcours e-learning'], ['chapitres', 'Séquences'], ['ressources', 'Ressources'],
            ['slides', 'Slides'], ['quiz', 'Quiz'],
          ]} />
        )}
        {onglet === 'infos' && <Infos formation={formation} onSaved={setFormation} />}

        {onglet === 'blocs' && (
          <ListeEditable key="blocs" table="formation_blocs" formationId={formation.id} tri={['sequence_num', 'ordre']} libelleAjout="Nouveau bloc"
            nouveau={l => {
              const mod = l.length ? Math.max(...l.map(b => b.sequence_num || 1)) : 1
              return { type: 'seq', sequence_num: mod, ordre: suivant(l.filter(b => b.sequence_num === mod), 'ordre'), contenu: { titre: '', desc: '' } }
            }}
            champs={[
              { nom: 'type', libelle: 'Type de bloc', type: 'select', requis: true, options: TYPES_BLOCS.map(t => [t, t]) },
              { nom: 'sequence_num', libelle: 'Module n°', type: 'number', requis: true },
              { nom: 'ordre', libelle: 'Ordre dans le module', type: 'number', requis: true },
              { nom: 'contenu', libelle: 'Contenu (JSON)', type: 'textarea', large: true, lignes: 12,
                aide: 'Champs selon le type : titre, desc, points[], tip, couleur, emoji, question, items[], url, legende… Ajoutez audio_url et narration pour une narration audio.' },
            ]}
            versFormulaire={(f, base) => ({ ...f, contenu: JSON.stringify(base.contenu ?? {}, null, 2) })}
            versBase={c => {
              let contenu
              try { contenu = JSON.parse(c.contenu || '{}') } catch { throw new Error('Le contenu n\'est pas un JSON valide (vérifiez les guillemets et les virgules).') }
              return { ...c, contenu }
            }}
            resume={b => (
              <details>
                <summary style={{ cursor: 'pointer' }}>
                  <strong>Module {b.sequence_num} · {b.ordre}</strong> <span className="badge badge-pending">{b.type}</span>{' '}
                  {b.contenu?.audio_url && '🎧 '}{b.contenu?.titre || b.contenu?.question || b.contenu?.texte || ''}
                </summary>
                <div style={{ marginTop: 12 }}><Bloc b={b} /></div>
              </details>
            )} />
        )}

        {onglet === 'chapitres' && (
          <ListeEditable key="chapitres" table="chapitres" formationId={formation.id} tri={['ordre']} libelleAjout="Nouvelle séquence"
            nouveau={l => ({ ordre: suivant(l, 'ordre') })}
            champs={[
              { nom: 'titre', libelle: 'Titre', requis: true, large: true },
              { nom: 'description', libelle: 'Description', type: 'textarea', large: true, lignes: 2 },
              { nom: 'lien', libelle: 'Lien', large: true, placeholder: 'https://… (vidéo ou passage de la session)' },
              { nom: 'ordre', libelle: 'Ordre', type: 'number' },
            ]}
            resume={c => <><strong>{c.ordre}. {c.titre}</strong>{c.description && <span className="sous">{c.description}</span>}</>} />
        )}

        {onglet === 'ressources' && (
          <ListeEditable key="ressources" table="ressources" formationId={formation.id} tri={['created_at']} libelleAjout="Nouvelle ressource"
            nouveau={() => ({ type_fichier: 'PDF' })}
            champs={[
              { nom: 'titre', libelle: 'Titre', requis: true, large: true },
              { nom: 'lien', libelle: 'Lien', requis: true, large: true, placeholder: 'https://…' },
              { nom: 'type_fichier', libelle: 'Type', placeholder: 'PDF, Vidéo, Lien…' },
            ]}
            resume={r => <><strong>{r.titre}</strong><span className="sous">{r.type_fichier} · {r.lien}</span></>} />
        )}

        {onglet === 'slides' && (
          <ListeEditable key="slides" table="slides" formationId={formation.id} tri={['sequence_num', 'ordre']} libelleAjout="Nouvelle slide"
            nouveau={l => {
              const seq = l.length ? Math.max(...l.map(s => s.sequence_num || 1)) : 1
              return { sequence_num: seq, ordre: suivant(l.filter(s => s.sequence_num === seq), 'ordre') }
            }}
            champs={[
              { nom: 'titre', libelle: 'Titre', large: true },
              { nom: 'sequence_num', libelle: 'Séquence n°', type: 'number', requis: true },
              { nom: 'ordre', libelle: 'Ordre dans la séquence', type: 'number', requis: true },
              { nom: 'svg_content', libelle: 'Contenu SVG', type: 'textarea', requis: true, large: true, lignes: 10, placeholder: '<svg viewBox="0 0 1600 900" …>…</svg>' },
            ]}
            resume={s => (
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div className="miniature" dangerouslySetInnerHTML={{ __html: s.svg_content || '' }} />
                <div><strong>Séq. {s.sequence_num} · {s.ordre}</strong><span className="sous">{s.titre || 'Sans titre'}</span></div>
              </div>
            )} />
        )}

        {onglet === 'quiz' && (
          <ListeEditable key="quiz" table="formation_quiz" formationId={formation.id} tri={['module_num', 'ordre']} libelleAjout="Nouvelle question"
            nouveau={l => ({ module_num: 1, ordre: suivant(l, 'ordre'), choices: [], answer: 0 })}
            champs={[
              { nom: 'question', libelle: 'Question', type: 'textarea', requis: true, large: true, lignes: 2 },
              { nom: 'choices', libelle: 'Réponses proposées', type: 'lignes', requis: true, large: true, aide: 'Une réponse par ligne.' },
              { nom: 'answer', libelle: 'Numéro de la bonne réponse', type: 'number', requis: true, aide: '1 pour la première ligne, 2 pour la deuxième…' },
              { nom: 'ordre', libelle: 'Ordre', type: 'number' },
              { nom: 'feedback', libelle: 'Explication affichée après correction', type: 'textarea', large: true, lignes: 2 },
              { nom: 'module_num', libelle: 'Module', type: 'number' },
            ]}
            versFormulaire={f => ({ ...f, answer: f.answer === '' ? 1 : Number(f.answer) + 1 })}
            versBase={c => {
              if (c.choices.length < 2) throw new Error('Proposez au moins deux réponses.')
              if (!(c.answer >= 1 && c.answer <= c.choices.length)) throw new Error(`La bonne réponse doit être un numéro entre 1 et ${c.choices.length}.`)
              return { ...c, answer: c.answer - 1 }
            }}
            resume={qu => <><strong>{qu.ordre}. {qu.question}</strong><span className="sous">✓ {qu.choices?.[qu.answer]} · {qu.choices?.length || 0} réponses</span></>} />
        )}
      </main>
    </div>
  )
}

function Infos({ formation, onSaved }) {
  const [form, setForm] = useState(() => Object.fromEntries(CHAMPS_FORMATION.map(c => {
    const v = formation[c.nom] ?? ''
    return [c.nom, c.type === 'date' ? String(v).slice(0, 10) : v]
  })))
  const [message, setMessage] = useState(null)
  const [saving, setSaving] = useState(false)

  async function enregistrer(e) {
    e.preventDefault(); setSaving(true); setMessage(null)
    const corps = {}
    CHAMPS_FORMATION.forEach(c => {
      const v = form[c.nom]
      corps[c.nom] = v === '' ? null : c.type === 'number' ? Number(v) : v
    })
    corps.slug = versSlug(corps.slug || corps.titre)
    try {
      const ligne = formation.id
        ? await q(supabase.from('formations').update(corps).eq('id', formation.id).select().single())
        : await q(supabase.from('formations').insert(corps).select().single())
      setMessage({ texte: formation.id ? 'Formation enregistrée.' : 'Formation créée : vous pouvez maintenant ajouter son contenu avec les onglets ci-dessus.' })
      onSaved(ligne)
      setForm(f => ({ ...f, slug: ligne.slug }))
    } catch (err) {
      setMessage({ erreur: true, texte: err.code === '23505' ? `L'identifiant « ${corps.slug} » est déjà pris : choisissez-en un autre.` : messageErreur(err) })
    }
    setSaving(false)
  }

  return (
    <form className="card formulaire" onSubmit={enregistrer}>
      <Alerte message={message} />
      <div className="grille-champs">
        {CHAMPS_FORMATION.map(c => (
          <div key={c.nom} className={`field ${c.large ? 'large' : ''}`}>
            <label>{c.libelle}{c.requis && ' *'}</label>
            <Champ c={c} valeur={form[c.nom]} onChange={v => setForm({ ...form, [c.nom]: v })} />
            {c.aide && <p className="aide">{c.aide}</p>}
          </div>
        ))}
      </div>
      <div className="actions">
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Enregistrement…' : formation.id ? 'Enregistrer' : 'Créer la formation'}</button>
      </div>
    </form>
  )
}
