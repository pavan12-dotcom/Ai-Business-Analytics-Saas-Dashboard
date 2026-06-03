import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://evxxymkctwhwhkqcpyao.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2eHh5bWtjdHdod2hrcWNweWFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzOTg2MTEsImV4cCI6MjA5NTk3NDYxMX0.Xf1cDp94VpXkJvGeMUNC9wHsASFa_IDo0xh6HNKpVXM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

