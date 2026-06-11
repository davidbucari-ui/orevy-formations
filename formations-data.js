// ============================================================
//  FORMATIONS-DATA.JS — Orevy
//  Contenu chargé depuis Supabase
//  Mode Administrateur : mot de passe Orevy2025
// ============================================================

// ── CONFIG SUPABASE (réutilise les constantes de index.html) ─
const F_URL = 'https://yyqppsvihdgmohnuocqr.supabase.co';
const F_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5cXBwc3ZpaGRnbW9obnVvY3FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTEyMDE4NiwiZXhwIjoyMDk2Njk2MTg2fQ.GVAjwcHDC-IO96BXcrXyZP_mVjrvCcdxdHMKmGuzJ3E';

function fHeaders() {
  const h = { 'apikey': F_KEY, 'Authorization': 'Bearer ' + F_KEY, 'Content-Type': 'application/json' };
  const token = localStorage.getItem('sb_token');
  if (token) h['Authorization'] = 'Bearer ' + token;
  return h;
}

async function fGet(table, params) {
  const res = await fetch(`${F_URL}/rest/v1/${table}?${params}`, { headers: fHeaders() });
  if (!res.ok) throw new Error(`Supabase ${table}: ${res.status}`);
  return res.json();
}

async function fUpsert(table, data) {
  const res = await fetch(`${F_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...fHeaders(), 'Prefer': 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`Supabase upsert ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function fUpdate(table, id, data) {
  const res = await fetch(`${F_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...fHeaders(), 'Prefer': 'return=representation' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`Supabase update ${table}: ${res.status}`);
  return res.json();
}

async function fInsert(table, data) {
  const res = await fetch(`${F_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...fHeaders(), 'Prefer': 'return=representation' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`Supabase insert ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function fDelete(table, id) {
  const res = await fetch(`${F_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'DELETE', headers: fHeaders()
  });
  if (!res.ok) throw new Error(`Supabase delete ${table}: ${res.status}`);
}

// ────────────────────────────────────────────────────────────
//  CACHE LOCAL — évite de recharger à chaque clic d'onglet
// ────────────────────────────────────────────────────────────

const F_CACHE = {}; // { slug: { formation, blocs, quiz } }

async function loadFormation(slug) {
  if (F_CACHE[slug]) return F_CACHE[slug];

  const [formations, blocs, quiz] = await Promise.all([
    fGet('formations', `slug=eq.${slug}&limit=1`),
    fGet('formation_blocs', `formation_id=eq.${await getFormationId(slug)}&order=sequence_num.asc,ordre.asc`),
    fGet('formation_quiz',  `formation_id=eq.${await getFormationId(slug)}&order=module_num.asc,ordre.asc`)
  ]);

  F_CACHE[slug] = { formation: formations[0], blocs, quiz };
  return F_CACHE[slug];
}

// Cache des IDs pour éviter les requêtes répétées
const F_IDS = {};
async function getFormationId(slug) {
  if (F_IDS[slug]) return F_IDS[slug];
  const rows = await fGet('formations', `slug=eq.${slug}&select=id`);
  F_IDS[slug] = rows[0]?.id;
  return F_IDS[slug];
}

// Cache du catalogue complet
let F_CATALOGUE = null;
async function loadCatalogue() {
  if (F_CATALOGUE) return F_CATALOGUE;
  F_CATALOGUE = await fGet('formations', 'actif=eq.true&order=ordre.asc');
  // Pré-remplir les IDs
  F_CATALOGUE.forEach(f => { F_IDS[f.slug] = f.id; });
  return F_CATALOGUE;
}

// ────────────────────────────────────────────────────────────
//  RENDU DU CATALOGUE (remplace les cartes codées en dur)
// ────────────────────────────────────────────────────────────

async function renderFormationsCatalogue() {
  const container = document.getElementById('cat-enligne-grid');
  if (!container) return;

  container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--ink3)">⏳ Chargement des formations…</div>`;

  try {
    const formations = await loadCatalogue();
    const enligne  = formations.filter(f => f.en_ligne);
    const animees  = formations.filter(f => !f.en_ligne);

    // Grille formations en ligne
    container.innerHTML = enligne.map(f => `
      <div style="background:var(--surface2);border-radius:16px;overflow:hidden;box-shadow:var(--shadow-lg);cursor:pointer;transition:transform 0.2s"
           onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform=''"
           onclick="showFormation('${f.slug}')">
        <div style="background:linear-gradient(135deg,${f.couleur1},${f.couleur2});padding:28px 24px 24px;position:relative;overflow:hidden">
          <div style="position:absolute;right:-10px;bottom:-10px;font-size:80px;opacity:0.12">${f.emoji}</div>
          <div style="font-size:2.5rem;margin-bottom:10px">${f.emoji}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
            <span style="background:rgba(255,255,255,0.2);color:#fff;font-size:0.65rem;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;padding:4px 12px;border-radius:20px">${f.nb_modules} ${f.nb_modules > 1 ? 'modules' : 'séquence'}</span>
            <span style="background:rgba(255,255,255,0.2);color:#fff;font-size:0.65rem;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;padding:4px 12px;border-radius:20px">${f.duree || 'en ligne'}</span>
          </div>
          <h3 style="margin:0 0 6px;color:#fff;font-family:'Syne',sans-serif;font-size:1.15rem;font-weight:800;line-height:1.3">${f.titre}</h3>
          <p style="margin:0;color:rgba(255,255,255,0.8);font-size:0.82rem;font-style:italic">${f.sous_titre || ''}</p>
        </div>
        <div style="padding:20px 24px">
          <p style="font-size:0.83rem;color:var(--ink2);margin:0 0 16px;line-height:1.5">${f.description || ''}</p>
          <button style="width:100%;background:linear-gradient(135deg,${f.couleur1},${f.couleur2});color:#fff;border:none;padding:12px;border-radius:10px;font-weight:700;font-size:0.88rem;cursor:pointer;font-family:'Instrument Sans',sans-serif">
            Accéder à la formation →
          </button>
        </div>
      </div>`).join('');

    // Grille formations animées
    const animeeGrid = document.getElementById('cat-animee-grid');
    if (animeeGrid && animees.length > 0) {
      animeeGrid.innerHTML = animees.map(f => `
        <div style="background:var(--surface2);border-radius:16px;overflow:hidden;box-shadow:var(--shadow-lg)">
          <div style="background:linear-gradient(135deg,${f.couleur1},${f.couleur2});padding:24px 20px 20px">
            <div style="font-size:2rem;margin-bottom:10px">${f.emoji}</div>
            <h3 style="margin:0 0 5px;color:#fff;font-family:'Syne',sans-serif;font-size:1rem;font-weight:800">${f.titre}</h3>
            <p style="margin:0;color:rgba(255,255,255,0.75);font-size:0.78rem;font-style:italic">${f.sous_titre || ''}</p>
          </div>
          <div style="padding:18px 20px">
            <p style="font-size:0.8rem;color:var(--ink2);margin:0 0 14px">${f.description || ''}</p>
            <button onclick="demanderFormation('${f.titre}')"
              style="width:100%;background:linear-gradient(135deg,${f.couleur1},${f.couleur2});color:#fff;border:none;padding:11px;border-radius:10px;font-weight:700;font-size:0.83rem;cursor:pointer;font-family:'Instrument Sans',sans-serif">
              Demander cette formation →
            </button>
          </div>
        </div>`).join('');
    }

  } catch(e) {
    container.innerHTML = `<div style="color:var(--red);padding:20px">⚠️ Erreur de chargement : ${e.message}</div>`;
    console.error('Catalogue formations:', e);
  }
}

// ────────────────────────────────────────────────────────────
//  AFFICHAGE D'UNE FORMATION
// ────────────────────────────────────────────────────────────

async function showFormation(slug) {
  // Masquer catalogue, masquer toutes les vues détail existantes
  document.getElementById('f-catalogue').style.display = 'none';
  document.querySelectorAll('[id^="f-detail-"]').forEach(el => el.style.display = 'none');

  // Conteneur dynamique
  let detail = document.getElementById('f-detail-' + slug);
  if (!detail) {
    detail = document.createElement('div');
    detail.id = 'f-detail-' + slug;
    document.getElementById('f-catalogue').parentNode.appendChild(detail);
  }
  detail.style.display = 'block';
  detail.innerHTML = `<div style="text-align:center;padding:60px;color:var(--ink3)">⏳ Chargement…</div>`;

  try {
    const { formation: f, blocs, quiz } = await loadFormation(slug);

    // Grouper blocs par sequence_num
    const seqNums = [...new Set(blocs.map(b => b.sequence_num))].sort((a,b) => a-b);
    const quizMods = [...new Set(quiz.map(q => q.module_num))].sort((a,b) => a-b);

    // Construire les onglets
    const tabs = seqNums.map((n, i) => `
      <button class="f-tab-${slug} f-tab-dyn" onclick="showSeqDyn('${slug}',${n},this)"
        style="background:${i===0?f.couleur1:'var(--surface2)'};color:${i===0?'#fff':'var(--ink2)'};border:${i===0?'none':'1px solid var(--border)'};padding:10px 18px;border-radius:10px;font-weight:${i===0?700:600};font-size:0.82rem;cursor:pointer;font-family:'Instrument Sans',sans-serif">
        📖 ${f.nb_modules > 1 ? 'Module' : 'Séq.'} ${n}
      </button>`).join('') +
      quizMods.map((m, i) => `
      <button class="f-tab-${slug} f-tab-dyn" onclick="showQuizDyn('${slug}',${m},this)"
        style="background:var(--surface2);color:var(--ink2);border:1px solid var(--border);padding:10px 18px;border-radius:10px;font-weight:600;font-size:0.82rem;cursor:pointer;font-family:'Instrument Sans',sans-serif">
        📝 Quiz${quizMods.length > 1 ? ' ' + (i+1) : ''}
      </button>`).join('');

    detail.innerHTML = `
      <button onclick="backToCatalogue()" style="background:none;border:none;cursor:pointer;color:var(--accent);font-weight:700;font-size:0.88rem;margin-bottom:20px;padding:0;display:flex;align-items:center;gap:6px">← Retour au catalogue</button>

      <div style="background:linear-gradient(135deg,${f.couleur1},${f.couleur2});border-radius:16px;padding:28px;margin-bottom:24px;position:relative;overflow:hidden">
        <div style="position:absolute;right:20px;top:50%;transform:translateY(-50%);font-size:80px;opacity:0.12">${f.emoji}</div>
        <div style="font-size:2rem;margin-bottom:10px">${f.emoji}</div>
        <h2 style="margin:0 0 8px;color:#fff;font-family:'Syne',sans-serif;font-size:1.5rem">${f.titre}</h2>
        <p style="margin:0;color:rgba(255,255,255,0.8);font-size:0.9rem">${f.sous_titre || ''}</p>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px" id="tabs-${slug}">
        ${tabs}
      </div>

      <div id="seq-content-${slug}" style="background:var(--surface2);border-radius:16px;padding:28px;box-shadow:var(--shadow)"></div>`;

    // Afficher le premier onglet
    if (seqNums.length > 0) {
      showSeqDyn(slug, seqNums[0], detail.querySelector('.f-tab-dyn'));
    }

  } catch(e) {
    detail.innerHTML = `<div style="color:var(--red);padding:20px">⚠️ Erreur : ${e.message}</div>`;
    console.error('showFormation:', e);
  }
}

function backToCatalogue() {
  document.querySelectorAll('[id^="f-detail-"]').forEach(el => el.style.display = 'none');
  document.getElementById('f-catalogue').style.display = 'block';
}

function showSeqDyn(slug, seqNum, btn) {
  const f = F_CACHE[slug];
  if (!f) return;
  const { formation, blocs } = f;

  // Highlight onglet actif
  document.querySelectorAll(`.f-tab-${slug}`).forEach(b => {
    b.style.background = 'var(--surface2)'; b.style.color = 'var(--ink2)'; b.style.border = '1px solid var(--border)'; b.style.fontWeight = '600';
  });
  if (btn) { btn.style.background = formation.couleur1; btn.style.color = '#fff'; btn.style.border = 'none'; btn.style.fontWeight = '700'; }

  const seqBlocs = blocs.filter(b => b.sequence_num === seqNum).sort((a,b) => a.ordre - b.ordre);
  const accroche = seqBlocs[0]?.contenu?.accroche || '';
  const titreSeq = seqBlocs[0]?.contenu?.titre_seq || `Séquence ${seqNum}`;

  document.getElementById(`seq-content-${slug}`).innerHTML = `
    <div style="margin-bottom:24px">
      <span style="background:${formation.couleur1}20;color:${formation.couleur2};font-size:0.72rem;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;padding:4px 14px;border-radius:20px">
        ${formation.nb_modules > 1 ? 'Module' : 'Séquence'} ${seqNum}
      </span>
      ${accroche ? `<p style="color:var(--ink3);font-size:0.88rem;font-style:italic;margin-top:12px">${accroche}</p>` : ''}
    </div>
    ${seqBlocs.map(b => renderBlocFromDB(b.type, b.contenu)).join('')}`;
}

function showQuizDyn(slug, moduleNum, btn) {
  const f = F_CACHE[slug];
  if (!f) return;
  const { formation, quiz } = f;

  document.querySelectorAll(`.f-tab-${slug}`).forEach(b => {
    b.style.background = 'var(--surface2)'; b.style.color = 'var(--ink2)'; b.style.border = '1px solid var(--border)'; b.style.fontWeight = '600';
  });
  if (btn) { btn.style.background = formation.couleur1; btn.style.color = '#fff'; btn.style.border = 'none'; btn.style.fontWeight = '700'; }

  const questions = quiz.filter(q => q.module_num === moduleNum).sort((a,b) => a.ordre - b.ordre);
  const quizId = `${slug}-m${moduleNum}`;

  document.getElementById(`seq-content-${slug}`).innerHTML = `
    <div style="margin-bottom:24px">
      <span style="background:${formation.couleur1}20;color:${formation.couleur2};font-size:0.72rem;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;padding:4px 14px;border-radius:20px">Quiz · ${questions.length} questions</span>
      <h2 style="font-family:'Syne',sans-serif;font-size:1.3rem;margin:14px 0 6px">Évaluation</h2>
      <p style="color:var(--ink3);font-size:0.88rem">Seuil de réussite : 7/${questions.length} pour obtenir l'attestation</p>
    </div>
    <div id="quiz-${quizId}-container">${buildQuiz(quizId, questions, slug, moduleNum)}</div>`;
}

// ────────────────────────────────────────────────────────────
//  RENDU DES BLOCS DEPUIS LA BDD
// ────────────────────────────────────────────────────────────

function renderBlocFromDB(type, c) {
  switch(type) {
    case 'seq':       return seqBlock(c.emoji||'📌', c.couleur||'#7B9E87', c.titre||'', c.sous||'', c.desc||'', c.points||[], c.tip||'');
    case 'tip':       return tipBlock(c.emoji||'💡', c.titre||'', c.contenu||'');
    case 'principe':  return principeBlock(c.num||'', c.couleur||'#7B9E87', c.titre||'', c.desc||'');
    case 'erreur':    return erreurBlock(c.items||[]);
    case 'reflexion': return reflexionBlock(c.question||'');
    default: return '';
  }
}

// ────────────────────────────────────────────────────────────
//  COMPOSANTS HTML
// ────────────────────────────────────────────────────────────

function seqBlock(emoji, color, title, subtitle, desc, points, tip) {
  return `
    <div style="background:var(--surface);border-radius:12px;padding:20px;margin-bottom:16px;border-left:4px solid ${color}">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <span style="font-size:1.4rem">${emoji}</span>
        <div>
          <div style="font-weight:800;font-size:0.93rem">${title}</div>
          <div style="font-size:0.75rem;color:${color};font-weight:700;letter-spacing:0.06em;text-transform:uppercase">${subtitle}</div>
        </div>
      </div>
      <p style="font-size:0.85rem;color:var(--ink2);margin-bottom:12px;line-height:1.6">${desc}</p>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">
        ${points.map(p => `<span style="background:${color}18;color:${color};font-size:0.75rem;font-weight:700;padding:3px 10px;border-radius:20px">${p}</span>`).join('')}
      </div>
      <div style="background:${color}12;border-left:3px solid ${color};border-radius:0 8px 8px 0;padding:10px 14px;font-size:0.82rem;color:var(--ink);font-style:italic;line-height:1.5">💡 ${tip}</div>
    </div>`;
}

function tipBlock(emoji, title, content) {
  return `
    <div style="background:var(--amber-lt);border-radius:12px;padding:18px 20px;margin-bottom:16px;border-left:4px solid var(--amber)">
      <div style="font-weight:800;font-size:0.88rem;margin-bottom:8px">${emoji} ${title}</div>
      <p style="font-size:0.84rem;color:var(--ink2);margin:0;line-height:1.65">${content}</p>
    </div>`;
}

function principeBlock(num, color, title, desc) {
  return `
    <div style="display:flex;gap:14px;align-items:flex-start;padding:14px 0;border-bottom:1px solid var(--border)">
      <div style="width:32px;height:32px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.9rem;flex-shrink:0">${num}</div>
      <div>
        <div style="font-weight:800;font-size:0.88rem;margin-bottom:4px">${title}</div>
        <p style="font-size:0.83rem;color:var(--ink2);margin:0;line-height:1.6">${desc}</p>
      </div>
    </div>`;
}

function erreurBlock(items) {
  return `
    <div style="background:var(--red-lt);border-radius:12px;padding:18px 20px;margin-bottom:16px;border-left:4px solid var(--red)">
      <div style="font-weight:800;font-size:0.88rem;margin-bottom:10px;color:var(--red)">🛑 Les erreurs à éviter</div>
      ${items.map(i => `<div style="display:flex;gap:8px;font-size:0.83rem;color:var(--ink2);margin-bottom:6px"><span style="color:var(--red);font-weight:700;flex-shrink:0">✗</span>${i}</div>`).join('')}
    </div>`;
}

function reflexionBlock(question) {
  return `
    <div style="background:var(--purple-lt);border-radius:12px;padding:18px 20px;border-left:4px solid var(--purple)">
      <div style="font-weight:800;font-size:0.88rem;margin-bottom:8px;color:var(--purple)">❓ Activité de réflexion</div>
      <p style="font-size:0.84rem;color:var(--ink2);margin:0 0 10px;line-height:1.65;font-style:italic">${question}</p>
      <textarea placeholder="Notez vos réflexions ici…" style="width:100%;border:1px solid var(--purple);border-radius:8px;padding:10px;font-family:'Instrument Sans',sans-serif;font-size:0.83rem;color:var(--ink);background:white;resize:vertical;min-height:70px;outline:none"></textarea>
    </div>`;
}

// ────────────────────────────────────────────────────────────
//  MOTEUR QUIZ
// ────────────────────────────────────────────────────────────

function buildQuiz(id, questions, slug, moduleNum) {
  return `
    <div id="quiz-${id}-questions">
      ${questions.map((q, i) => `
        <div style="background:var(--surface);border-radius:12px;padding:20px;margin-bottom:14px">
          <div style="font-weight:700;font-size:0.9rem;margin-bottom:14px;line-height:1.5">${i+1}. ${q.question}</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${(q.choices||[]).map((c, j) => `
              <button onclick="answerQuiz('${id}',${i},${j})" id="btn-${id}-${i}-${j}"
                style="background:var(--surface2);border:1.5px solid var(--border);border-radius:8px;padding:10px 14px;text-align:left;cursor:pointer;font-family:'Instrument Sans',sans-serif;font-size:0.83rem;color:var(--ink);transition:all 0.2s"
                onmouseover="if(!this.dataset.answered) this.style.borderColor='var(--accent)'"
                onmouseout="if(!this.dataset.answered) this.style.borderColor='var(--border)'">${c}</button>`).join('')}
          </div>
          <div id="feedback-${id}-${i}" style="display:none;margin-top:12px;font-size:0.82rem;padding:10px 14px;border-radius:8px;line-height:1.5"></div>
        </div>`).join('')}
      <button onclick="submitQuiz('${id}')" id="btn-submit-${id}"
        style="width:100%;background:linear-gradient(135deg,#7B9E87,#5A7A65);color:#fff;border:none;padding:14px;border-radius:10px;font-weight:800;font-size:0.9rem;cursor:pointer;font-family:'Instrument Sans',sans-serif;margin-top:8px">
        Valider mes réponses →
      </button>
    </div>
    <div id="quiz-${id}-result" style="display:none;text-align:center;padding:32px 20px"></div>`;
}

const quizAnswers = {};
const quizMeta = {}; // stocke slug + moduleNum par quizId

function answerQuiz(id, qIdx, aIdx) {
  if (!quizAnswers[id]) quizAnswers[id] = {};
  quizAnswers[id][qIdx] = aIdx;
  document.querySelectorAll(`[id^="btn-${id}-${qIdx}-"]`).forEach((btn, j) => {
    btn.style.borderColor = j === aIdx ? 'var(--accent)' : 'var(--border)';
    btn.style.background  = j === aIdx ? 'var(--accent-lt)' : 'var(--surface2)';
    btn.style.fontWeight  = j === aIdx ? '700' : '400';
  });
}

function submitQuiz(id) {
  // Retrouver les questions depuis le cache
  const [slug, , moduleStr] = id.split('-m');
  const moduleNum = parseInt(moduleStr);
  const cache = F_CACHE[slug];
  if (!cache) return;

  const questions = cache.quiz.filter(q => q.module_num === moduleNum).sort((a,b) => a.ordre - b.ordre);
  const answers   = quizAnswers[id] || {};
  let score = 0;
  const col = cache.formation.couleur1 || '#7B9E87';
  const grad = `linear-gradient(135deg,${cache.formation.couleur1},${cache.formation.couleur2})`;

  questions.forEach((q, i) => {
    const userAnswer = answers[i];
    const correct    = q.answer;
    const isCorrect  = userAnswer === correct;
    if (isCorrect) score++;

    document.querySelectorAll(`[id^="btn-${id}-${i}-"]`).forEach((btn, j) => {
      btn.dataset.answered = 'true'; btn.style.cursor = 'default'; btn.onmouseover = null;
      if (j === correct) { btn.style.background='#F0FDF4'; btn.style.borderColor='#16A34A'; btn.style.color='#15803D'; btn.style.fontWeight='700'; }
      else if (j === userAnswer && !isCorrect) { btn.style.background='#FEF2F2'; btn.style.borderColor='#DC2626'; btn.style.color='#DC2626'; }
    });
    const fb = document.getElementById(`feedback-${id}-${i}`);
    if (fb) {
      fb.style.display = 'block'; fb.style.background = isCorrect?'#F0FDF4':'#FEF2F2';
      fb.style.color = isCorrect?'#15803D':'#991B1B';
      fb.style.borderLeft = `3px solid ${isCorrect?'#16A34A':'#DC2626'}`;
      fb.innerHTML = (isCorrect?'✅ ':'❌ ') + (q.feedback||'');
    }
  });

  document.getElementById(`btn-submit-${id}`).style.display = 'none';
  const pass = score >= 7;
  const result = document.getElementById(`quiz-${id}-result`);
  result.style.display = 'block';
  result.innerHTML = `
    <div style="font-size:3rem;margin-bottom:16px">${pass?'🏅':'📖'}</div>
    <div style="font-size:2rem;font-weight:800;font-family:'Syne',sans-serif;color:${col};margin-bottom:8px">${score} / ${questions.length}</div>
    <div style="font-size:1rem;font-weight:700;margin-bottom:12px;color:${col}">${pass?'✅ Félicitations !':'📚 Continuez !'}</div>
    <p style="font-size:0.88rem;color:var(--ink2);max-width:400px;margin:0 auto 20px;line-height:1.7">
      ${pass?'Excellent résultat ! Votre attestation est disponible.':'Relisez les feedbacks des questions manquées avant de retenter.'}
    </p>
    ${pass
      ? `<button onclick="genererAttestation('${id}',${score})" style="background:${grad};color:#fff;border:none;padding:12px 28px;border-radius:10px;font-weight:700;cursor:pointer;font-family:'Instrument Sans',sans-serif;font-size:0.88rem">🏅 Télécharger mon attestation</button>`
      : `<button onclick="resetQuiz('${id}')" style="background:var(--accent);color:#fff;border:none;padding:12px 28px;border-radius:10px;font-weight:700;cursor:pointer;font-family:'Instrument Sans',sans-serif;font-size:0.88rem">🔄 Réessayer</button>`}`;
  result.scrollIntoView({ behavior:'smooth', block:'center' });
}

function resetQuiz(id) {
  document.getElementById(`quiz-${id}-result`).style.display = 'none';
  document.querySelectorAll(`[id^="btn-${id}-"]`).forEach(b => {
    if (b.id !== `btn-submit-${id}`) {
      b.dataset.answered=''; b.style.background='var(--surface2)'; b.style.borderColor='var(--border)'; b.style.color='var(--ink)'; b.style.fontWeight='400';
    }
  });
  quizAnswers[id] = {};
  document.getElementById(`btn-submit-${id}`).style.display = 'block';
  document.querySelectorAll(`[id^="feedback-${id}"]`).forEach(f => f.style.display = 'none');
}

function genererAttestation(id, score) {
  const [slug] = id.split('-m');
  const f = F_CACHE[slug]?.formation;
  const titre     = f ? f.titre : 'Formation petite enfance';
  const scoreText = score + '/' + (F_CACHE[slug]?.quiz?.length || 10);
  const date      = new Date().toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' });
  const w = window.open('', '_blank');
  if (!w) { if(typeof showNotif==='function') showNotif('⚠️ Autorisez les popups'); return; }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Attestation</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lato:wght@400;700&display=swap" rel="stylesheet">
  <style>body{font-family:'Lato',sans-serif;background:#f8f6f2;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px}
  .cert{background:white;max-width:680px;width:100%;padding:60px;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,0.12);text-align:center;position:relative;border:2px solid #7B9E87}
  .cert::before{content:'';position:absolute;inset:8px;border:1px solid #7B9E8740;border-radius:10px;pointer-events:none}
  h1{font-family:'Playfair Display',serif;font-size:2rem;color:#2A2D26;margin:0 0 8px}
  .sub{color:#7B9E87;font-size:0.8rem;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:32px}
  .formation{font-size:1.1rem;font-weight:700;color:#2A2D26;margin:16px 0 8px}
  .date{color:#7A7065;font-size:0.88rem;margin-bottom:32px}
  .sig{border-top:1px solid #e0e0e0;padding-top:20px;margin-top:32px;font-size:0.8rem;color:#A8A29E}
  @media print{body{background:white}.cert{box-shadow:none}}</style></head>
  <body><div class="cert">
  <div style="font-size:3rem;margin-bottom:20px">🏅</div>
  <div class="sub">Attestation de formation</div>
  <h1>Certificat de réussite</h1>
  <p style="color:#7A7065;font-size:0.9rem;margin:0 0 4px">Cette attestation certifie que</p>
  <div style="font-family:'Playfair Display',serif;font-size:1.6rem;color:#5A7A65;font-style:italic;margin:20px 0">le titulaire de cette attestation</div>
  <p style="color:#7A7065;font-size:0.9rem;margin:0 0 4px">a suivi et validé avec succès la formation</p>
  <div class="formation">${titre}</div>
  <div class="date">le ${date}</div>
  <p style="font-size:0.83rem;color:#7A7065;line-height:1.7;max-width:480px;margin:0 auto 24px">Score obtenu : ${scoreText} au quiz d'évaluation final.<br>Formation dispensée dans le cadre du développement des compétences professionnelles en petite enfance.</p>
  <div class="sig">David Bucari · Éducateur de jeunes enfants · Formateur petite enfance<br>Formation en ligne — Accès Orevy</div>
  <div style="margin-top:24px"><button onclick="window.print()" style="background:#7B9E87;color:white;border:none;padding:10px 24px;border-radius:8px;font-weight:700;cursor:pointer;font-size:0.88rem">🖨 Imprimer / Sauvegarder en PDF</button></div>
  </div></body></html>`);
}

// ────────────────────────────────────────────────────────────
//  MODE ADMINISTRATEUR
// ────────────────────────────────────────────────────────────

const ADMIN_PASSWORD = 'Orevy2025';
let adminMode = false;

function openAdminLogin() {
  const pwd = prompt('🔐 Mot de passe administrateur :');
  if (!pwd) return;
  if (pwd !== ADMIN_PASSWORD) { alert('Mot de passe incorrect.'); return; }
  adminMode = true;
  document.getElementById('btn-admin-open').style.display = 'block';
  openAdmin();
}

function openAdmin() {
  document.getElementById('modal-admin').style.display = 'block';
  document.body.style.overflow = 'hidden';
  loadAdminCatalogue();
}

function closeAdmin() {
  document.getElementById('modal-admin').style.display = 'none';
  document.body.style.overflow = '';
}

async function loadAdminCatalogue() {
  const content = document.getElementById('admin-content');
  content.innerHTML = `<div style="text-align:center;padding:40px;color:#A8A29E">⏳ Chargement…</div>`;
  try {
    const formations = await fGet('formations', 'order=ordre.asc');
    content.innerHTML = `
      <div style="margin-bottom:20px;display:flex;justify-content:flex-end">
        <button onclick="adminNewFormation()" style="${adminBtnStyle('#7B9E87')}">+ Nouvelle formation</button>
      </div>
      ${formations.map(f => `
        <div style="background:#292524;border-radius:12px;padding:20px;margin-bottom:12px;border:1px solid #44403C;display:flex;align-items:center;gap:16px">
          <div style="font-size:2rem">${f.emoji}</div>
          <div style="flex:1">
            <div style="font-weight:700;color:#fff;margin-bottom:4px">${f.titre}</div>
            <div style="font-size:0.78rem;color:#A8A29E">${f.slug} · ${f.nb_modules} module(s) · ${f.en_ligne?'En ligne':'Animée'} · ordre ${f.ordre}</div>
          </div>
          <div style="display:flex;gap:8px">
            <button onclick="adminEditFormation('${f.slug}')" style="background:#44403C;color:#D6D3D1;border:none;padding:8px 14px;border-radius:7px;font-size:0.8rem;cursor:pointer;font-family:inherit">✏️ Éditer</button>
            <button onclick="adminToggleFormation(${f.id},${f.actif})" style="background:${f.actif?'#78350F':'#14532D'};color:${f.actif?'#FCD34D':'#86EFAC'};border:none;padding:8px 14px;border-radius:7px;font-size:0.8rem;cursor:pointer;font-family:inherit">${f.actif?'⏸ Désactiver':'▶ Activer'}</button>
          </div>
        </div>`).join('')}`;
  } catch(e) {
    content.innerHTML = `<div style="color:#FCA5A5;padding:20px">⚠️ Erreur : ${e.message}</div>`;
  }
}

async function adminEditFormation(slug) {
  const content = document.getElementById('admin-content');
  content.innerHTML = `<div style="text-align:center;padding:40px;color:#A8A29E">⏳ Chargement…</div>`;

  try {
    const { formation: f, blocs, quiz } = await loadFormation(slug);
    const seqNums  = [...new Set(blocs.map(b => b.sequence_num))].sort((a,b)=>a-b);
    const quizMods = [...new Set(quiz.map(q => q.module_num))].sort((a,b)=>a-b);

    content.innerHTML = `
      <button onclick="loadAdminCatalogue()" style="background:none;border:none;color:#7B9E87;font-weight:700;cursor:pointer;font-family:inherit;margin-bottom:20px">← Retour</button>

      <!-- Métadonnées -->
      <div style="background:#292524;border-radius:12px;padding:20px;margin-bottom:16px;border:1px solid #44403C">
        <div style="font-weight:700;color:#fff;margin-bottom:14px">📋 Informations générales</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div><label style="font-size:0.7rem;color:#A8A29E;display:block;margin-bottom:4px">TITRE</label>
            <input id="af-titre" value="${escA(f.titre)}" style="${adminInputStyle()}"></div>
          <div><label style="font-size:0.7rem;color:#A8A29E;display:block;margin-bottom:4px">SOUS-TITRE</label>
            <input id="af-sous" value="${escA(f.sous_titre||'')}" style="${adminInputStyle()}"></div>
          <div><label style="font-size:0.7rem;color:#A8A29E;display:block;margin-bottom:4px">EMOJI</label>
            <input id="af-emoji" value="${f.emoji}" style="${adminInputStyle('80px')}"></div>
          <div><label style="font-size:0.7rem;color:#A8A29E;display:block;margin-bottom:4px">DURÉE</label>
            <input id="af-duree" value="${f.duree||''}" style="${adminInputStyle()}"></div>
          <div><label style="font-size:0.7rem;color:#A8A29E;display:block;margin-bottom:4px">COULEUR 1</label>
            <input id="af-col1" value="${f.couleur1}" style="${adminInputStyle('120px')}"></div>
          <div><label style="font-size:0.7rem;color:#A8A29E;display:block;margin-bottom:4px">COULEUR 2</label>
            <input id="af-col2" value="${f.couleur2}" style="${adminInputStyle('120px')}"></div>
        </div>
        <div style="margin-top:10px"><label style="font-size:0.7rem;color:#A8A29E;display:block;margin-bottom:4px">DESCRIPTION</label>
          <textarea id="af-desc" style="${adminTextareaStyle('50px')}">${escA(f.description||'')}</textarea></div>
        <button onclick="adminSaveFormationMeta('${slug}',${f.id})" style="${adminBtnStyle('#7B9E87')} margin-top:10px">💾 Enregistrer les infos</button>
      </div>

      <!-- Onglets séquences -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px solid #44403C;margin-bottom:16px;padding-bottom:0">
        ${seqNums.map((n,i) => `
          <button class="admin-seq-tab" data-seq="${n}" onclick="adminShowSeq('${slug}',${n},this)"
            style="background:${i===0?f.couleur1:'none'};color:${i===0?'#fff':'#78716C'};border:none;border-bottom:2px solid ${i===0?f.couleur1:'transparent'};padding:10px 16px;font-family:inherit;font-size:0.82rem;font-weight:${i===0?700:600};cursor:pointer;margin-bottom:-1px">
            Module ${n}
          </button>`).join('')}
        ${quizMods.map((m,i) => `
          <button class="admin-seq-tab" data-quiz="${m}" onclick="adminShowQuiz('${slug}',${m},this)"
            style="background:none;color:#78716C;border:none;border-bottom:2px solid transparent;padding:10px 16px;font-family:inherit;font-size:0.82rem;font-weight:600;cursor:pointer;margin-bottom:-1px">
            Quiz ${m}
          </button>`).join('')}
        <button onclick="adminAddSequence('${slug}',${f.id})" style="background:none;color:#7B9E87;border:1px dashed #7B9E87;border-radius:8px;padding:6px 14px;font-family:inherit;font-size:0.78rem;cursor:pointer">+ Module</button>
        <button onclick="adminAddQuizModule('${slug}',${f.id})" style="background:none;color:#D4922A;border:1px dashed #D4922A;border-radius:8px;padding:6px 14px;font-family:inherit;font-size:0.78rem;cursor:pointer">+ Quiz</button>
      </div>

      <div id="admin-seq-content"></div>`;

    // Afficher le premier onglet
    if (seqNums.length > 0) {
      adminShowSeq(slug, seqNums[0], content.querySelector('.admin-seq-tab'));
    }

  } catch(e) {
    content.innerHTML = `<div style="color:#FCA5A5">⚠️ ${e.message}</div>`;
  }
}

function adminShowSeq(slug, seqNum, btn) {
  document.querySelectorAll('.admin-seq-tab').forEach(b => {
    b.style.background = 'none'; b.style.color = '#78716C'; b.style.borderBottomColor = 'transparent'; b.style.fontWeight = '600';
  });
  if (btn) { btn.style.background = F_CACHE[slug]?.formation?.couleur1||'#7B9E87'; btn.style.color = '#fff'; btn.style.borderBottomColor = F_CACHE[slug]?.formation?.couleur1||'#7B9E87'; btn.style.fontWeight = '700'; }

  const blocs = (F_CACHE[slug]?.blocs || []).filter(b => b.sequence_num === seqNum).sort((a,b) => a.ordre - b.ordre);
  const seqContent = document.getElementById('admin-seq-content');
  seqContent.innerHTML = `
    <div style="margin-bottom:14px;display:flex;gap:8px;flex-wrap:wrap">
      ${['seq','tip','erreur','reflexion','principe'].map(t =>
        `<button onclick="adminAddBloc('${slug}',${seqNum},'${t}')" style="background:#44403C;color:#D6D3D1;border:none;padding:6px 12px;border-radius:6px;font-size:0.75rem;cursor:pointer;font-family:inherit">+ ${t}</button>`
      ).join('')}
    </div>
    ${blocs.map(b => adminRenderBloc(b, slug)).join('')}`;
}

function adminShowQuiz(slug, moduleNum, btn) {
  document.querySelectorAll('.admin-seq-tab').forEach(b => {
    b.style.background = 'none'; b.style.color = '#78716C'; b.style.borderBottomColor = 'transparent'; b.style.fontWeight = '600';
  });
  if (btn) { btn.style.background = '#D4922A'; btn.style.color = '#fff'; btn.style.borderBottomColor = '#D4922A'; btn.style.fontWeight = '700'; }

  const questions = (F_CACHE[slug]?.quiz || []).filter(q => q.module_num === moduleNum).sort((a,b) => a.ordre - b.ordre);
  const formId    = F_CACHE[slug]?.formation?.id;
  document.getElementById('admin-seq-content').innerHTML = `
    ${questions.map(q => adminRenderQuestion(q, slug, moduleNum)).join('')}
    <button onclick="adminAddQuestion('${slug}',${formId},${moduleNum})" style="${adminBtnStyle('#D4922A')}">+ Ajouter une question</button>`;
}

function adminRenderBloc(b, slug) {
  const c = b.contenu || {};
  const typeColors = { seq:'#3B82F6', tip:'#D97706', principe:'#7C3AED', erreur:'#DC2626', reflexion:'#7C3AED' };
  const col = typeColors[b.type] || '#78716C';
  return `
    <div style="background:#1C1917;border-radius:8px;padding:14px;margin-bottom:10px;border-left:3px solid ${col}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span style="font-size:0.7rem;font-weight:700;color:${col};text-transform:uppercase">${b.type}</span>
        <button onclick="adminDeleteBloc(${b.id},'${slug}',${b.sequence_num})" style="background:#7F1D1D;color:#FCA5A5;border:none;padding:3px 8px;border-radius:5px;font-size:0.68rem;cursor:pointer;font-family:inherit">✕ Supprimer</button>
      </div>
      ${b.type==='seq'?`
        <input placeholder="Emoji" value="${c.emoji||''}" onchange="adminPatchBloc(${b.id},'${slug}',${b.sequence_num},'emoji',this.value)" style="${adminInputStyle('60px')}">
        <input placeholder="Couleur" value="${c.couleur||''}" onchange="adminPatchBloc(${b.id},'${slug}',${b.sequence_num},'couleur',this.value)" style="${adminInputStyle('120px')}">
        <input placeholder="Titre" value="${escA(c.titre||'')}" onchange="adminPatchBloc(${b.id},'${slug}',${b.sequence_num},'titre',this.value)" style="${adminInputStyle()}">
        <input placeholder="Sous-titre" value="${escA(c.sous||'')}" onchange="adminPatchBloc(${b.id},'${slug}',${b.sequence_num},'sous',this.value)" style="${adminInputStyle()}">
        <textarea placeholder="Description" onchange="adminPatchBloc(${b.id},'${slug}',${b.sequence_num},'desc',this.value)" style="${adminTextareaStyle()}">${escA(c.desc||'')}</textarea>
        <textarea placeholder="Points (un par ligne)" onchange="adminPatchBlocArray(${b.id},'${slug}',${b.sequence_num},'points',this.value)" style="${adminTextareaStyle('55px')}">${(c.points||[]).join('\n')}</textarea>
        <input placeholder="Conseil 💡" value="${escA(c.tip||'')}" onchange="adminPatchBloc(${b.id},'${slug}',${b.sequence_num},'tip',this.value)" style="${adminInputStyle()}">
      `:b.type==='tip'?`
        <input placeholder="Emoji" value="${c.emoji||''}" onchange="adminPatchBloc(${b.id},'${slug}',${b.sequence_num},'emoji',this.value)" style="${adminInputStyle('60px')}">
        <input placeholder="Titre" value="${escA(c.titre||'')}" onchange="adminPatchBloc(${b.id},'${slug}',${b.sequence_num},'titre',this.value)" style="${adminInputStyle()}">
        <textarea placeholder="Contenu" onchange="adminPatchBloc(${b.id},'${slug}',${b.sequence_num},'contenu',this.value)" style="${adminTextareaStyle()}">${escA(c.contenu||'')}</textarea>
      `:b.type==='erreur'?`
        <textarea placeholder="Erreurs (une par ligne)" onchange="adminPatchBlocArray(${b.id},'${slug}',${b.sequence_num},'items',this.value)" style="${adminTextareaStyle('80px')}">${(c.items||[]).join('\n')}</textarea>
      `:b.type==='reflexion'?`
        <textarea placeholder="Question" onchange="adminPatchBloc(${b.id},'${slug}',${b.sequence_num},'question',this.value)" style="${adminTextareaStyle('55px')}">${escA(c.question||'')}</textarea>
      `:b.type==='principe'?`
        <input placeholder="N°" value="${c.num||''}" onchange="adminPatchBloc(${b.id},'${slug}',${b.sequence_num},'num',this.value)" style="${adminInputStyle('60px')}">
        <input placeholder="Couleur" value="${c.couleur||''}" onchange="adminPatchBloc(${b.id},'${slug}',${b.sequence_num},'couleur',this.value)" style="${adminInputStyle('120px')}">
        <input placeholder="Titre" value="${escA(c.titre||'')}" onchange="adminPatchBloc(${b.id},'${slug}',${b.sequence_num},'titre',this.value)" style="${adminInputStyle()}">
        <textarea placeholder="Description" onchange="adminPatchBloc(${b.id},'${slug}',${b.sequence_num},'desc',this.value)" style="${adminTextareaStyle()}">${escA(c.desc||'')}</textarea>
      `:''}
    </div>`;
}

function adminRenderQuestion(q, slug, moduleNum) {
  return `
    <div style="background:#292524;border-radius:10px;padding:16px;margin-bottom:10px;border:1px solid #44403C">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span style="font-size:0.72rem;font-weight:700;color:#A8A29E">QUESTION</span>
        <button onclick="adminDeleteQuestion(${q.id},'${slug}',${moduleNum})" style="background:#7F1D1D;color:#FCA5A5;border:none;padding:4px 10px;border-radius:6px;font-size:0.72rem;cursor:pointer;font-family:inherit">🗑 Supprimer</button>
      </div>
      <textarea placeholder="Question" onchange="adminPatchQuestion(${q.id},'${slug}',${moduleNum},'question',this.value)" style="${adminTextareaStyle('48px')}">${escA(q.question)}</textarea>
      ${(q.choices||[]).map((c,ci) => `
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
          <input type="radio" name="correct-${q.id}" ${q.answer===ci?'checked':''} onchange="adminPatchQuestion(${q.id},'${slug}',${moduleNum},'answer',${ci})" style="accent-color:#7B9E87;flex-shrink:0">
          <input value="${escA(c)}" onchange="adminPatchChoice(${q.id},'${slug}',${moduleNum},${ci},this.value)" style="${adminInputStyle()}">
        </div>`).join('')}
      <textarea placeholder="Feedback" onchange="adminPatchQuestion(${q.id},'${slug}',${moduleNum},'feedback',this.value)" style="${adminTextareaStyle('44px')}">${escA(q.feedback||'')}</textarea>
      <div style="font-size:0.68rem;color:#7B9E87">✅ Cocher le bouton radio à gauche de la bonne réponse</div>
    </div>`;
}

// ── MUTATIONS SUPABASE ───────────────────────────────────────

async function adminPatchBloc(id, slug, seqNum, field, value) {
  try {
    const bloc = F_CACHE[slug].blocs.find(b => b.id === id);
    if (!bloc) return;
    bloc.contenu = { ...bloc.contenu, [field]: value };
    await fUpdate('formation_blocs', id, { contenu: bloc.contenu });
    showAdminNotif('✅ Sauvegardé');
  } catch(e) { showAdminNotif('⚠️ ' + e.message); }
}

async function adminPatchBlocArray(id, slug, seqNum, field, value) {
  const arr = value.split('\n').filter(Boolean);
  await adminPatchBloc(id, slug, seqNum, field, arr);
}

async function adminSaveFormationMeta(slug, fId) {
  try {
    const data = {
      titre:      document.getElementById('af-titre').value,
      sous_titre: document.getElementById('af-sous').value,
      emoji:      document.getElementById('af-emoji').value,
      duree:      document.getElementById('af-duree').value,
      couleur1:   document.getElementById('af-col1').value,
      couleur2:   document.getElementById('af-col2').value,
      description:document.getElementById('af-desc').value,
      updated_at: new Date().toISOString()
    };
    await fUpdate('formations', fId, data);
    // Invalider cache
    delete F_CACHE[slug]; F_CATALOGUE = null;
    showAdminNotif('✅ Formation mise à jour');
  } catch(e) { showAdminNotif('⚠️ ' + e.message); }
}

async function adminToggleFormation(id, actif) {
  try {
    await fUpdate('formations', id, { actif: !actif });
    F_CATALOGUE = null;
    loadAdminCatalogue();
  } catch(e) { showAdminNotif('⚠️ ' + e.message); }
}

async function adminAddBloc(slug, seqNum, type) {
  const fId    = F_CACHE[slug]?.formation?.id;
  const blocs  = (F_CACHE[slug]?.blocs || []).filter(b => b.sequence_num === seqNum);
  const maxOrd = blocs.length ? Math.max(...blocs.map(b => b.ordre)) + 1 : 1;
  const defaults = {
    seq:       { emoji:'📌', couleur:'#7B9E87', titre:'Nouveau bloc', sous:'', desc:'', points:[], tip:'' },
    tip:       { emoji:'💡', titre:'Nouveau conseil', contenu:'' },
    erreur:    { items:['Nouvelle erreur à éviter'] },
    reflexion: { question:'Votre question de réflexion…' },
    principe:  { num:'1', couleur:'#7B9E87', titre:'Nouveau principe', desc:'' }
  };
  try {
    const rows = await fInsert('formation_blocs', { formation_id: fId, sequence_num: seqNum, ordre: maxOrd, type, contenu: defaults[type] || {} });
    F_CACHE[slug].blocs.push(rows[0]);
    adminShowSeq(slug, seqNum, null);
    showAdminNotif('✅ Bloc ajouté');
  } catch(e) { showAdminNotif('⚠️ ' + e.message); }
}

async function adminDeleteBloc(id, slug, seqNum) {
  if (!confirm('Supprimer ce bloc ?')) return;
  try {
    await fDelete('formation_blocs', id);
    F_CACHE[slug].blocs = F_CACHE[slug].blocs.filter(b => b.id !== id);
    adminShowSeq(slug, seqNum, null);
    showAdminNotif('🗑 Bloc supprimé');
  } catch(e) { showAdminNotif('⚠️ ' + e.message); }
}

async function adminAddSequence(slug, fId) {
  const seqs   = [...new Set((F_CACHE[slug]?.blocs||[]).map(b => b.sequence_num))];
  const nextSeq = seqs.length ? Math.max(...seqs) + 1 : 1;
  try {
    const rows = await fInsert('formation_blocs', { formation_id: fId, sequence_num: nextSeq, ordre: 1, type: 'tip', contenu: { emoji:'📖', titre:'Nouveau module', contenu:'' } });
    F_CACHE[slug].blocs.push(rows[0]);
    await fUpdate('formations', fId, { nb_modules: nextSeq });
    delete F_CACHE[slug]; F_CATALOGUE = null;
    adminEditFormation(slug);
    showAdminNotif('✅ Module ajouté');
  } catch(e) { showAdminNotif('⚠️ ' + e.message); }
}

async function adminAddQuizModule(slug, fId) {
  const mods   = [...new Set((F_CACHE[slug]?.quiz||[]).map(q => q.module_num))];
  const nextMod = mods.length ? Math.max(...mods) + 1 : 1;
  try {
    const rows = await fInsert('formation_quiz', { formation_id: fId, module_num: nextMod, ordre: 1, question: 'Nouvelle question ?', choices: ['Réponse A','Réponse B','Réponse C','Réponse D'], answer: 0, feedback: 'Explication.' });
    F_CACHE[slug].quiz.push(rows[0]);
    adminEditFormation(slug);
    showAdminNotif('✅ Quiz ajouté');
  } catch(e) { showAdminNotif('⚠️ ' + e.message); }
}

async function adminPatchQuestion(id, slug, moduleNum, field, value) {
  try {
    const q = F_CACHE[slug].quiz.find(x => x.id === id);
    if (!q) return;
    q[field] = field === 'answer' ? Number(value) : value;
    await fUpdate('formation_quiz', id, { [field]: q[field] });
    showAdminNotif('✅ Sauvegardé');
  } catch(e) { showAdminNotif('⚠️ ' + e.message); }
}

async function adminPatchChoice(id, slug, moduleNum, ci, value) {
  try {
    const q = F_CACHE[slug].quiz.find(x => x.id === id);
    if (!q) return;
    const choices = [...(q.choices || [])];
    choices[ci] = value;
    q.choices = choices;
    await fUpdate('formation_quiz', id, { choices });
    showAdminNotif('✅ Sauvegardé');
  } catch(e) { showAdminNotif('⚠️ ' + e.message); }
}

async function adminDeleteQuestion(id, slug, moduleNum) {
  if (!confirm('Supprimer cette question ?')) return;
  try {
    await fDelete('formation_quiz', id);
    F_CACHE[slug].quiz = F_CACHE[slug].quiz.filter(q => q.id !== id);
    adminShowQuiz(slug, moduleNum, null);
    showAdminNotif('🗑 Question supprimée');
  } catch(e) { showAdminNotif('⚠️ ' + e.message); }
}

async function adminAddQuestion(slug, fId, moduleNum) {
  const questions = (F_CACHE[slug]?.quiz||[]).filter(q => q.module_num === moduleNum);
  const maxOrd    = questions.length ? Math.max(...questions.map(q => q.ordre)) + 1 : 1;
  try {
    const rows = await fInsert('formation_quiz', { formation_id: fId, module_num: moduleNum, ordre: maxOrd, question: 'Nouvelle question ?', choices: ['Réponse A','Réponse B','Réponse C','Réponse D'], answer: 0, feedback: 'Explication.' });
    F_CACHE[slug].quiz.push(rows[0]);
    adminShowQuiz(slug, moduleNum, null);
    showAdminNotif('✅ Question ajoutée');
  } catch(e) { showAdminNotif('⚠️ ' + e.message); }
}

async function adminNewFormation() {
  const slug = prompt('Identifiant court (ex: emotions-enfant) :');
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) { alert('Identifiant invalide — uniquement lettres minuscules, chiffres et tirets.'); return; }
  try {
    await fInsert('formations', { slug, titre: 'Nouvelle formation', sous_titre: '', emoji: '📚', couleur1: '#7B9E87', couleur2: '#5A7A65', description: '', duree: '', nb_modules: 1, en_ligne: true, actif: false, ordre: 99 });
    F_CATALOGUE = null;
    loadAdminCatalogue();
    showAdminNotif('✅ Formation créée — éditez-la puis activez-la');
  } catch(e) { showAdminNotif('⚠️ ' + e.message); }
}

// ── HELPERS ─────────────────────────────────────────────────

function showAdminNotif(msg) {
  let n = document.getElementById('admin-notif');
  if (!n) {
    n = document.createElement('div');
    n.id = 'admin-notif';
    n.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#292524;color:#fff;padding:10px 20px;border-radius:8px;font-size:0.82rem;font-weight:600;z-index:9999;font-family:inherit;border:1px solid #44403C;pointer-events:none';
    document.body.appendChild(n);
  }
  n.textContent = msg;
  n.style.opacity = '1';
  clearTimeout(n._t);
  n._t = setTimeout(() => { n.style.opacity = '0'; }, 2000);
}

function adminInputStyle(w) {
  return `width:${w||'100%'};background:#1C1917;border:1px solid #44403C;border-radius:6px;padding:8px 10px;color:#E7E5E0;font-family:'Instrument Sans',sans-serif;font-size:0.82rem;margin-bottom:6px;outline:none;box-sizing:border-box`;
}
function adminTextareaStyle(h) {
  return `width:100%;background:#1C1917;border:1px solid #44403C;border-radius:6px;padding:8px 10px;color:#E7E5E0;font-family:'Instrument Sans',sans-serif;font-size:0.82rem;margin-bottom:6px;outline:none;resize:vertical;min-height:${h||'70px'};box-sizing:border-box`;
}
function adminBtnStyle(col) {
  return `background:${col}22;color:${col};border:1px dashed ${col};padding:10px 20px;border-radius:8px;font-weight:700;font-size:0.82rem;cursor:pointer;font-family:inherit`;
}
function escA(s) { return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ────────────────────────────────────────────────────────────
//  INITIALISATION — injecter l'UI admin + déclencher le catalogue
// ────────────────────────────────────────────────────────────

window._showFormationSupabase = showFormation;

window.addEventListener('load', () => {
  injectAdminModal();
  // Remplacer le contenu statique du catalogue par le dynamique
  patchFormationsPage();
});

function injectAdminModal() {
  const modal = document.createElement('div');
  modal.id = 'modal-admin';
  modal.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9000;overflow-y:auto;padding:20px';
  modal.innerHTML = `
    <div style="background:#1C1917;min-height:100vh;border-radius:16px;max-width:960px;margin:0 auto;font-family:\'Instrument Sans\',sans-serif">
      <div style="background:#292524;border-radius:16px 16px 0 0;padding:18px 28px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10;border-bottom:1px solid #44403C">
        <div>
          <div style="font-family:\'Syne\',sans-serif;font-size:1.05rem;font-weight:800;color:#fff">⚙️ Administration — Formations</div>
          <div style="font-size:0.75rem;color:#A8A29E;margin-top:2px">Modifications sauvegardées en temps réel dans Supabase</div>
        </div>
        <button onclick="closeAdmin()" style="background:#DC2626;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-weight:700;font-size:0.82rem;cursor:pointer;font-family:inherit">✕ Fermer</button>
      </div>
      <div id="admin-content" style="padding:24px"></div>
    </div>`;
  document.body.appendChild(modal);

  const btn = document.createElement('button');
  btn.id = 'btn-admin-open';
  btn.innerHTML = '⚙️ Admin';
  btn.style.cssText = 'display:none;position:fixed;bottom:80px;right:24px;background:#1C1917;color:#A8A29E;border:1px solid #44403C;padding:8px 14px;border-radius:8px;font-size:0.75rem;font-weight:600;cursor:pointer;z-index:8000;font-family:inherit';
  btn.onclick = openAdmin;
  document.body.appendChild(btn);
}

function patchFormationsPage() {
  // Remplacer la grille statique par un conteneur dynamique
  const staticGrid = document.querySelector('#cat-enligne > div[style*="grid"]');
  if (staticGrid) {
    const dyn = document.createElement('div');
    dyn.id = 'cat-enligne-grid';
    dyn.style.cssText = staticGrid.style.cssText;
    staticGrid.replaceWith(dyn);
  }

  // Ajouter le bouton admin discret dans l'en-tête formations
  const header = document.querySelector('#f-catalogue > div:first-child');
  if (header && !document.getElementById('btn-open-admin-login')) {
    const btn = document.createElement('button');
    btn.id = 'btn-open-admin-login';
    btn.innerHTML = '🔐';
    btn.title = 'Mode administrateur';
    btn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:1rem;opacity:0.25;padding:4px;transition:opacity 0.2s;position:absolute;right:0;top:0';
    btn.onmouseover = () => btn.style.opacity = '1';
    btn.onmouseout  = () => btn.style.opacity = adminMode ? '1' : '0.25';
    btn.onclick = () => adminMode ? openAdmin() : openAdminLogin();
    header.style.position = 'relative';
    header.appendChild(btn);
  }

// Déclenchement du catalogue formations
document.addEventListener('click', function(e) {
  const btn = e.target.closest('[data-page="formations"], .nav-btn');
  if (btn && (btn.dataset.page === 'formations' || btn.textContent.includes('Formations'))) {
    setTimeout(() => renderFormationsCatalogue(), 100);
  }
});
}
