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


// Simple in-memory token cache to prevent duplicate remote queries to Supabase Auth
const tokenCache = new Map<string, { userId: string; user: any; expiresAt: number }>()

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  const guestId = req.headers['x-guest-id'] as string
  if (guestId) {
    ;(req as any).guestId = guestId
  }

  // Authenticate guest demo users using isolated guest IDs
  if (token === 'demo-guest-token') {
    const finalGuestId = guestId || '00000000-0000-0000-0000-000000000000'
    ;(req as any).userId = `guest-${finalGuestId}`
    ;(req as any).user = {
      id: `guest-${finalGuestId}`,
      email: 'guest@demo.com',
      user_metadata: { name: 'Demo Guest', isGuest: true }
    }
    return next()
  }

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

  if (!token) return res.status(401).json({ error: 'No token provided' })

  // Check cache
  const cached = tokenCache.get(token)
  const now = Date.now()
  if (cached && cached.expiresAt > now) {
    ;(req as any).userId = cached.userId;
    ;(req as any).user = cached.user;
    return next()
  }

  try {
    const { data: { user }, error } = await client.auth.getUser(token)
    if (error || !user) return res.status(401).json({ error: 'Invalid token' })

    // Cache valid token for 60 seconds
    tokenCache.set(token, { userId: user.id, user, expiresAt: now + 60000 })

    ;(req as any).userId = user.id
    ;(req as any).user = user
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token or authentication failed' })
  }
}

