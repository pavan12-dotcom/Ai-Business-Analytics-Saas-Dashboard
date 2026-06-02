import { Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'

let supabase: any = null

export function getSupabase() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || url === 'placeholder' || !key || key === 'placeholder') {
      return null
    }
    supabase = createClient(url, key)
  }
  return supabase
}


export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Demo mode — skip auth if Supabase not configured
  if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL === 'placeholder') {
    (req as any).userId = 'demo-user'
    return next()
  }

  const client = getSupabase()
  if (!client) {
    (req as any).userId = 'demo-user'
    return next()
  }

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'No token provided' })

  const { data: { user }, error } = await client.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Invalid token' })

  ;(req as any).userId = user.id
  next()
}
