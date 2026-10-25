import { useEffect, useMemo, useState } from 'react'

/* Diaporama des slides SVG d'une formation, groupées par sequence_num.
   Le SVG est injecté tel quel : il n'est modifiable que par un admin (RLS). */
export default function LecteurSlides({ titre, slides, onClose }) {
  const sequences = useMemo(() => {
    const parNum = {}
    slides.forEach(s => { (parNum[s.sequence_num ?? 1] ||= []).push(s) })
    return Object.entries(parNum).sort(([a], [b]) => a - b).map(([num, liste]) => ({ num, slides: liste }))
  }, [slides])
  const [seq, setSeq] = useState(0)
  const [idx, setIdx] = useState(0)

  const courante = sequences[seq]
  const slide = courante.slides[idx]
  const premiere = seq === 0 && idx === 0
  const derniere = seq === sequences.length - 1 && idx === courante.slides.length - 1

  function prec() {
    if (idx > 0) setIdx(idx - 1)
    else if (seq > 0) { setSeq(seq - 1); setIdx(sequences[seq - 1].slides.length - 1) }
  }
  function suiv() {
    if (idx < courante.slides.length - 1) setIdx(idx + 1)
    else if (seq < sequences.length - 1) { setSeq(seq + 1); setIdx(0) }
  }

  useEffect(() => {
    function touche(e) {
      if (e.key === 'ArrowRight') suiv()
      if (e.key === 'ArrowLeft') prec()
    }
    window.addEventListener('keydown', touche)
    return () => window.removeEventListener('keydown', touche)
  })

  function pleinEcran() {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen?.()
  }

  return (
    <div className="lecteur">
      <div className="lecteur-barre">
        <button className="lecteur-btn" onClick={onClose}>← Retour</button>
        <span className="lecteur-titre">{titre}</span>
        <span className="lecteur-pos">Séq. {courante.num} · {idx + 1}/{courante.slides.length}</span>
        <button className="lecteur-btn" onClick={pleinEcran} title="Plein écran">⛶</button>
      </div>
      {sequences.length > 1 && (
        <div className="lecteur-seqs">
          {sequences.map((s, i) => (
            <button key={s.num} className={i === seq ? 'actif' : ''} onClick={() => { setSeq(i); setIdx(0) }}>Séquence {s.num}</button>
          ))}
        </div>
      )}
      <div className="lecteur-scene">
        <div className="lecteur-slide">
          {slide.titre && <div className="lecteur-slide-titre">{slide.titre}</div>}
          <div className="lecteur-svg" dangerouslySetInnerHTML={{ __html: slide.svg_content || '' }} />
        </div>
        <div className="lecteur-nav">
          <button className="lecteur-btn" onClick={prec} disabled={premiere}>← Préc.</button>
          <div className="lecteur-points">
            {courante.slides.map((_, i) => <button key={i} className={i === idx ? 'actif' : ''} onClick={() => setIdx(i)} aria-label={`Diapositive ${i + 1}`} />)}
          </div>
          {derniere
            ? <button className="lecteur-btn plein" onClick={onClose}>Terminer ✓</button>
            : <button className="lecteur-btn plein" onClick={suiv}>Suiv. →</button>}
        </div>
      </div>
    </div>
  )
}
