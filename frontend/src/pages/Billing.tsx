import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createCheckout, openBillingPortal, simulateUpgrade } from '../services/api'
import { Check, ExternalLink, ShieldCheck, Sparkles, Award } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './Billing.css'

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    desc: 'Get started with core analytics',
    current: true,
    features: ['100 AI queries/month', 'Dashboard & charts', '5 customer records', 'Basic analytics views', 'Email support'],
    cta: 'Current Plan',
    ctaDisabled: true,
    accent: false,
    icon: ShieldCheck
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
    icon: Sparkles
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
    icon: Award
  },
]


export default function Billing() {
  const nav = useNavigate()
  const { subscription, refreshSubscription } = useAuth()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const handleCheckout = async (planName: string) => {
    const planKey = planName.toLowerCase()
    setLoadingPlan(planKey)
    try {
      const res = await createCheckout(planKey)
      if (res.demo) {
        const confirmSim = window.confirm(
          `Stripe is not configured on the backend. Would you like to simulate an instant upgrade to the ${planName} plan for testing?`
        )
        if (confirmSim) {
          const simRes = await simulateUpgrade(planKey)
          if (simRes.success) {
            alert(`Successfully upgraded to ${planName}!`)
            await refreshSubscription()
          } else {
            alert(`Failed to simulate upgrade.`)
          }
        }
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

  const activePlan = subscription?.plan || 'Free'

  const pricingPlans = plans.map(p => {
    const isCurrent = p.name.toLowerCase() === activePlan.toLowerCase()
    let cta = p.cta
    let ctaDisabled = p.ctaDisabled
    
    if (isCurrent) {
      cta = 'Current Plan'
      ctaDisabled = true
    } else {
      const isDowngrade = 
        (activePlan === 'Enterprise' && (p.name === 'Pro' || p.name === 'Free')) ||
        (activePlan === 'Pro' && p.name === 'Free')
      
      if (isDowngrade) {
        cta = 'Downgrade Plan'
        ctaDisabled = false
      } else {
        cta = p.name === 'Enterprise' ? 'Contact Sales / Upgrade' : `Upgrade to ${p.name}`
        ctaDisabled = false
      }
    }
    
    return {
      ...p,
      current: isCurrent,
      cta,
      ctaDisabled
    }
  })

  return (
    <div className="billing-page fade-in">
      <div className="billing-intro-section">
        <div className="billing-intro-title">Flexible Plans for Every Scale</div>
        <div className="billing-intro-sub">Upgrade your analytics stack to unlock enterprise capabilities</div>
      </div>

      {/* Plan cards */}
      <div className="plans-grid">
        {pricingPlans.map(p => {
          const Icon = p.icon
          return (
            <div key={p.name} className={`plan-card glass-card ${p.accent ? 'plan-card-accent' : ''}`}>
              {p.accent && <div className="plan-popular-badge">Most Popular</div>}
              <div className="plan-header-row">
                <div className="plan-icon-wrap">
                  <Icon size={18} />
                </div>
                <div className="plan-name">{p.name}</div>
              </div>
              <div className="plan-price">
                <span className="plan-price-num">{p.price}</span>
                <span className="plan-price-period">{p.period}</span>
              </div>
              <div className="plan-desc">{p.desc}</div>
              {p.features && p.features.length > 0 && (
                <>
                  <div className="plan-divider" />
                  <ul className="plan-features">
                    {p.features.map(f => (
                      <li key={f}>
                        <Check size={12} className="check-icon" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <button
                className={`btn ${p.accent ? 'btn-primary' : 'btn-secondary'} plan-cta`}
                disabled={p.ctaDisabled || loadingPlan !== null}
                onClick={() => !p.ctaDisabled && handleCheckout(p.name)}
              >
                {loadingPlan === p.name.toLowerCase() ? 'Syncing...' : p.cta}
              </button>
            </div>
          )
        })}
      </div>

      {/* Billing portal */}
      <div className="card billing-portal glass-card">
        <div className="portal-left">
          <div className="portal-title">Enterprise Stripe Portal</div>
          <div className="portal-sub">Modify invoice details, configure credit cards, or request historic tax logs.</div>
        </div>
        <button
          className="btn btn-secondary portal-btn"
          disabled={portalLoading}
          onClick={handlePortal}
        >
          <span>{portalLoading ? 'Syncing Stripe...' : 'Access Customer Portal'}</span>
          <ExternalLink size={13} style={{ marginLeft: 6 }} />
        </button>
      </div>
    </div>
  )
}

