import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createCheckout, openBillingPortal } from '../services/api'
import './Billing.css'

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    desc: 'Get started with core analytics',
    current: true,
    features: ['100 AI queries/month', 'Dashboard & charts', '5 customer records', 'Email support'],
    cta: 'Current Plan',
    ctaDisabled: true,
    accent: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    desc: 'Everything you need to grow',
    current: false,
    features: ['Unlimited AI queries', 'All analytics views', 'Unlimited customers', 'Revenue reports', 'Priority support'],
    cta: 'Upgrade to Pro',
    ctaDisabled: false,
    accent: true,
  },
  {
    name: 'Enterprise',
    price: '$99',
    period: '/month',
    desc: 'For teams at scale',
    current: false,
    features: ['Everything in Pro', 'Custom data integrations', 'Team seats (up to 20)', 'Dedicated account manager', 'SLA guarantee'],
    cta: 'Contact Sales',
    ctaDisabled: false,
    accent: false,
  },
]

export default function Billing() {
  const nav = useNavigate()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const handleCheckout = async (planName: string) => {
    const planKey = planName.toLowerCase()
    setLoadingPlan(planKey)
    try {
      const res = await createCheckout(planKey)
      if (res.demo) {
        alert(`Demo Mode: ${res.message}`)
      } else if (res.url) {
        window.location.href = res.url
      } else {
        alert('Could not initiate checkout session.')
      }
    } catch (err: any) {
      console.error('Checkout error:', err)
      const errMsg = err.response?.data?.error || 'Error initiating Stripe checkout.'
      alert(errMsg)
    } finally {
      setLoadingPlan(null)
    }
  }

  const handlePortal = async () => {
    setPortalLoading(true)
    try {
      const res = await openBillingPortal()
      if (res.demo) {
        alert(`Demo Mode: ${res.message}`)
      } else if (res.url) {
        window.location.href = res.url
      } else {
        alert('Could not open billing portal.')
      }
    } catch (err: any) {
      console.error('Portal error:', err)
      const errMsg = err.response?.data?.error || 'Error opening billing portal.'
      alert(errMsg)
    } finally {
      setPortalLoading(false)
    }
  }

  return (
    <div className="billing-page fade-in">
      {/* Current usage */}
      <div className="card billing-usage">
        <div className="usage-left">
          <div className="usage-title">Current Plan: <span className="usage-plan-name">Free</span></div>
          <div className="usage-sub">80 of 100 AI queries used this month · resets July 1</div>
        </div>
        <div className="usage-bar-wrap">
          <div className="usage-bar-bg">
            <div className="usage-bar-fg" style={{ width: '80%' }} />
          </div>
          <div className="usage-pct">80%</div>
        </div>
      </div>

      <div className="billing-intro">Choose the plan that fits your team</div>

      {/* Plan cards */}
      <div className="plans-grid">
        {plans.map(p => (
          <div key={p.name} className={`plan-card ${p.accent ? 'plan-card-accent' : ''}`}>
            {p.accent && <div className="plan-popular-badge">Most Popular</div>}
            <div className="plan-name">{p.name}</div>
            <div className="plan-price">
              <span className="plan-price-num">{p.price}</span>
              <span className="plan-price-period">{p.period}</span>
            </div>
            <div className="plan-desc">{p.desc}</div>
            <ul className="plan-features">
              {p.features.map(f => (
                <li key={f}><span className="check">✓</span>{f}</li>
              ))}
            </ul>
            <button
              className={`btn ${p.accent ? 'btn-primary' : 'btn-secondary'} plan-cta`}
              disabled={p.ctaDisabled || loadingPlan !== null}
              onClick={() => !p.ctaDisabled && handleCheckout(p.name)}
            >
              {loadingPlan === p.name.toLowerCase() ? 'Redirecting…' : p.cta}
            </button>
          </div>
        ))}
      </div>

      {/* Billing portal */}
      <div className="card billing-portal">
        <div>
          <div className="portal-title">Billing Portal</div>
          <div className="portal-sub">Manage invoices, payment methods, and subscription history.</div>
        </div>
        <button
          className="btn btn-secondary"
          disabled={portalLoading}
          onClick={handlePortal}
        >
          {portalLoading ? 'Opening…' : 'Open Billing Portal →'}
        </button>
      </div>
    </div>
  )
}
