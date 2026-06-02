import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://gokfxejoffzttzvdkoll.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdva2Z4ZWpvZmZ6dHR6dmRrb2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTY0NDQsImV4cCI6MjA5NTg5MjQ0NH0.2oghhJNpqeh-zLUjHE0iAJLK_eJX40_ZRuQTaQFGzhw'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'public' },
  global: {
    headers: { 'Prefer': 'return=minimal' }
  }
})
