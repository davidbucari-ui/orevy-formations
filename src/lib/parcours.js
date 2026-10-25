import { dureeEstimee } from '../components/Blocs'

/* Modules d'une formation : les blocs groupés par sequence_num, ou à défaut
   les séquences de slides. C'est l'unité de la progression (table progression). */
export function modulesDe(blocs, slides) {
  const source = blocs.length ? blocs : slides
  const nums = [...new Set(source.map(x => x.sequence_num ?? 1))].sort((a, b) => a - b)
  return nums.map((num, i) => {
    if (blocs.length) {
      const liste = blocs.filter(b => b.sequence_num === num)
      const ouverture = liste.find(b => b.type === 'seq' && b.contenu?.titre)
      // « Module 1 · Comprendre les émotions » → « Comprendre les émotions »
      const sous = ouverture?.contenu?.sous?.replace(/^module\s*\d+\s*[·:–-]\s*/i, '')
      return { num, rang: i + 1, titre: sous || ouverture?.contenu?.titre || `Module ${i + 1}`, duree: dureeEstimee(liste) }
    }
    const liste = slides.filter(s => (s.sequence_num ?? 1) === num)
    return { num, rang: i + 1, titre: `Séquence ${num}`, duree: Math.max(2, Math.round(liste.length * 1.5)) }
  })
}

// Le meilleur résultat d'abord : réussi, puis meilleur score, puis le plus récent.
export function meilleurResultat(resultats) {
  return [...resultats].sort((a, b) =>
    (b.reussi - a.reussi) || (b.score / b.total - a.score / a.total) || (new Date(b.passe_le) - new Date(a.passe_le)))[0] || null
}
