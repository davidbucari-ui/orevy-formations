import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://gokfxejoffzttzvdkoll.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdva2Z4ZWpvZmZ6dHR6dmRrb2xsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDMxNjQ0NCwiZXhwIjoyMDk1ODkyNDQ0fQ.X1BYaEYHHDNTh6I0MXTX0ZjOSQjTAeBiAuMgJH1YSV0'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
