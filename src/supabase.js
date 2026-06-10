// ── Projet RH (participants, accès, vidéos) — via Cloudflare Worker
const BASE = 'https://orevy-proxy.david-bucari.workers.dev/rest/v1'
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdva2Z4ZWpvZmZ6dHR6dmRrb2xsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDMxNjQ0NCwiZXhwIjoyMDk1ODkyNDQ0fQ.X1BYaEYHHDNTh6I0MXTX0ZjOSQjTAeBiAuMgJH1YSV0'

// ── Projet Formations (formations, formation_blocs, formation_quiz) — direct Supabase
const F_BASE = 'https://yyqppsvihdgmohnuocqr.supabase.co/rest/v1'
const F_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5cXBwc3ZpaGRnbW9obnVvY3FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMjAxODYsImV4cCI6MjA5NjY5NjE4Nn0.mzejn3GMcVF4grWp9BbpW9p2p_7zK8F9yefO4MRr8qg'

// Tables hébergées dans le projet Formations
const F_TABLES = new Set(['formations', 'formation_blocs', 'formation_quiz'])

const headers = {
  'Content-Type': 'application/json',
  'apikey': KEY,
  'Authorization': 'Bearer ' + KEY,
  'Prefer': 'return=representation',
}

function getBase(table) { return F_TABLES.has(table) ? F_BASE : BASE }
function getHeaders(table) {
  if (!F_TABLES.has(table)) return headers
  return {
    'Content-Type': 'application/json',
    'apikey': F_KEY,
    'Authorization': 'Bearer ' + F_KEY,
    'Prefer': 'return=representation',
  }
}

export const supabase = {
  from: (table) => ({
    select: (cols = '*') => ({
      eq: (col, val) => ({
        single: async () => {
          const r = await fetch(`${getBase(table)}/${table}?${col}=eq.${encodeURIComponent(val)}&select=${cols}`, { headers: getHeaders(table) })
          const data = await r.json()
          if (!r.ok) return { data: null, error: data }
          return { data: data[0] || null, error: data[0] ? null : { message: 'Not found' } }
        },
        order: (col2, opts) => ({
          then: async (resolve) => {
            const r = await fetch(`${getBase(table)}/${table}?${col}=eq.${encodeURIComponent(val)}&select=${cols}&order=${col2}${opts?.ascending === false ? '.desc' : '.asc'}`, { headers: getHeaders(table) })
            const data = await r.json()
            resolve({ data: r.ok ? data : null, error: r.ok ? null : data })
          }
        }),
        async then(resolve) {
          const r = await fetch(`${getBase(table)}/${table}?${col}=eq.${encodeURIComponent(val)}&select=${cols}`, { headers: getHeaders(table) })
          const data = await r.json()
          resolve({ data: r.ok ? data : null, error: r.ok ? null : data })
        }
      }),
      order: (col, opts) => ({
        async then(resolve) {
          const r = await fetch(`${getBase(table)}/${table}?select=${cols}&order=${col}${opts?.ascending === false ? '.desc' : '.asc'}`, { headers: getHeaders(table) })
          const data = await r.json()
          resolve({ data: r.ok ? data : null, error: r.ok ? null : data })
        }
      }),
      async then(resolve) {
        const r = await fetch(`${getBase(table)}/${table}?select=${cols}`, { headers: getHeaders(table) })
        const data = await r.json()
        resolve({ data: r.ok ? data : null, error: r.ok ? null : data })
      }
    }),
    insert: (rows) => ({
      async then(resolve) {
        const r = await fetch(`${getBase(table)}/${table}`, {
          method: 'POST', headers: getHeaders(table),
          body: JSON.stringify(Array.isArray(rows) ? rows[0] : rows)
        })
        const data = await r.json()
        resolve({ data: r.ok ? data : null, error: r.ok ? null : data })
      }
    }),
    update: (row) => ({
      eq: (col, val) => ({
        async then(resolve) {
          const r = await fetch(`${getBase(table)}/${table}?${col}=eq.${encodeURIComponent(val)}`, {
            method: 'PATCH', headers: getHeaders(table),
            body: JSON.stringify(row)
          })
          const text = await r.text()
          const data = text ? JSON.parse(text) : {}
          resolve({ data: r.ok ? data : null, error: r.ok ? null : data })
        }
      })
    }),
    delete: () => ({
      eq: (col, val) => ({
        async then(resolve) {
          const r = await fetch(`${getBase(table)}/${table}?${col}=eq.${encodeURIComponent(val)}`, {
            method: 'DELETE', headers: getHeaders(table)
          })
          resolve({ data: null, error: r.ok ? null : { message: 'Delete failed' } })
        }
      })
    }),
  })
}
