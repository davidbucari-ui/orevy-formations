import { useMemo } from 'react'
import qrcode from 'qrcode-generator'

const MARGE = 4 // zone blanche autour du code, en modules (minimum recommandé)

function matrice(texte) {
  const qr = qrcode(0, 'M')
  qr.addData(texte)
  qr.make()
  const n = qr.getModuleCount()
  return { n, noir: (l, c) => qr.isDark(l, c) }
}

// QR code en SVG : modules noirs sur fond blanc, lisible aussi en mode sombre.
export default function QrCode({ texte, taille = 200, nomFichier = 'qr-code' }) {
  const m = useMemo(() => matrice(texte), [texte])
  const cote = m.n + 2 * MARGE
  let d = ''
  for (let l = 0; l < m.n; l++) for (let c = 0; c < m.n; c++) if (m.noir(l, c)) d += `M${c + MARGE} ${l + MARGE}h1v1h-1z`

  function telecharger() {
    const echelle = 16, canvas = document.createElement('canvas')
    canvas.width = canvas.height = cote * echelle
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#000'
    for (let l = 0; l < m.n; l++) for (let c = 0; c < m.n; c++) if (m.noir(l, c)) ctx.fillRect((c + MARGE) * echelle, (l + MARGE) * echelle, echelle, echelle)
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png'); a.download = `${nomFichier}.png`; a.click()
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg viewBox={`0 0 ${cote} ${cote}`} width={taille} height={taille} role="img" aria-label="QR code" shapeRendering="crispEdges" style={{ borderRadius: 8, border: '1px solid var(--border)' }}>
        <rect width="100%" height="100%" fill="#fff" />
        <path d={d} fill="#000" />
      </svg>
      <button type="button" className="btn-lien" onClick={telecharger}>Télécharger le QR code (PNG)</button>
    </div>
  )
}
