import { Router, Request, Response } from 'express'
import Stripe from 'stripe'
import { requireAuth, getSupabase } from '../middleware/auth'
import { mockUserPlans, addAuditLog } from './data'

const router = Router()

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  return new Stripe(key)
}

const PRODUCTS: Record<string, { id: string; amount: number }> = {
  pro: {
    id: process.env.STRIPE_PRODUCT_PRO || '',
    amount: Number(process.env.STRIPE_PRODUCT_PRO_AMOUNT) || 1900,
  },
  enterprise: {
    id: process.env.STRIPE_PRODUCT_ENTERPRISE || '',
    amount: Number(process.env.STRIPE_PRODUCT_ENTERPRISE_AMOUNT) || 9900,
  },
}

router.post('/checkout', requireAuth, async (req: Request, res: Response) => {
  const stripe = getStripe()
  if (!stripe) {
    return res.json({
      url: null,
      demo: true,
      message: 'Stripe not configured. Add STRIPE_SECRET_KEY to backend/.env',
    })
  }

  const { plan } = req.body
  const productInfo = PRODUCTS[plan]
  if (!productInfo || !productInfo.id) {
    return res.status(400).json({
      error: `Stripe Product ID for '${plan}' is not configured in backend/.env (STRIPE_PRODUCT_${plan.toUpperCase()} is empty).`
    })
  }

  const origin = (req.headers.origin as string) || process.env.FRONTEND_URL || 'http://localhost:5173'
  const cleanOrigin = origin.replace(/\/$/, '')

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product: productInfo.id,
        recurring: { interval: 'month' },
        unit_amount: productInfo.amount,
      },
      quantity: 1,
    }],
    client_reference_id: (req as any).userId,
    metadata: { plan },
    success_url: `${cleanOrigin}/app/billing?success=1`,
    cancel_url: `${cleanOrigin}/app/billing`,
  })

  res.json({ url: session.url })
})

router.post('/portal', requireAuth, async (_req: Request, res: Response) => {
  const stripe = getStripe()
  if (!stripe) {
    return res.json({
      url: null,
      demo: true,
      message: 'Stripe not configured.',
    })
  }
  // In production, look up the customer from DB; for now return demo message
  res.json({ url: null, demo: true, message: 'Configure STRIPE_SECRET_KEY to enable billing portal.' })
})

// Webhook (raw body needed)
router.post('/webhook', async (req: Request, res: Response) => {
  const stripe = getStripe()
  if (!stripe) return res.json({ received: true })

  const sig = req.headers['stripe-signature'] as string
  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '')
  } catch {
    return res.status(400).send('Webhook error')
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.client_reference_id
    const plan = session.metadata?.plan

    console.log('Payment succeeded for session:', session.id)

    if (userId && plan) {
      const supabase = getSupabase()
      if (supabase) {
        const mrr = plan === 'pro' ? 29 : plan === 'enterprise' ? 99 : 0
        const { error } = await supabase
          .from('customers')
          .upsert({
            id: userId,
            name: session.customer_details?.name || 'Subscriber',
            email: session.customer_details?.email || null,
            plan: plan === 'pro' ? 'Pro' : plan === 'enterprise' ? 'Enterprise' : 'Free',
            mrr,
            status: 'Active',
          }, { onConflict: 'id' })

        if (error) {
          console.error('Error updating customer plan in Supabase:', error.message)
        } else {
          console.log(`✅ Successfully updated customer ${userId} plan to ${plan} in Supabase`)
        }
      }
    }
  }

  res.json({ received: true })
})

router.post('/simulate-upgrade', requireAuth, async (req: Request, res: Response) => {
  const { plan } = req.body
  const userId = (req as any).userId
  const userName = (req as any).user?.user_metadata?.name || (req as any).user?.email || 'Demo User'
  
  const mrr = plan === 'pro' ? 29 : plan === 'enterprise' ? 99 : 0
  const planName = plan === 'pro' ? 'Pro' : plan === 'enterprise' ? 'Enterprise' : 'Free'
  
  const supabase = getSupabase()
  if (supabase) {
    try {
      const { error } = await supabase
        .from('customers')
        .upsert({
          id: userId,
          name: userName,
          email: (req as any).user?.email || null,
          plan: planName,
          mrr,
          status: 'Active',
        }, { onConflict: 'id' })
        
      if (error) {
        throw error
      }
    } catch (err: any) {
      console.error('Failed to simulate upgrade in Supabase:', err.message)
    }
  }
  
  // Track in memory
  mockUserPlans.set(userId, { plan: planName, mrr, status: 'Active' })
  
  // Log activity
  await addAuditLog(userId, userName, `Simulated Upgrade: Upgraded plan to ${planName}`)
  
  res.json({ success: true, plan: planName, mrr })
})

export default router
