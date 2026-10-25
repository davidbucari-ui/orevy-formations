export function formatDate(d, mois = 'long') {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: mois, year: 'numeric' })
}

export function formatDuree(min) {
  if (!min) return ''
  const h = Math.floor(min / 60), m = min % 60
  return min < 60 ? `${min} min` : m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

export function echapperHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

export function messageErreur(err) {
  return err?.message || String(err)
}
