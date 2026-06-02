import { Router, Request, Response } from 'express'
import Stripe from 'stripe'
import { requireAuth, getSupabase } from '../middleware/auth'

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
    success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/app/billing?success=1`,
    cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/app/billing`,
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

export default router
