import { useNavigate } from 'react-router-dom'
import './Landing.css'

const features = [
  { icon: '▦', title: 'Live Dashboard', desc: 'KPIs, charts, and customer tables updated in real time.' },
  { icon: '✦', title: 'AI Data Assistant', desc: 'Ask natural-language questions, get instant business answers.' },
  { icon: '◈', title: 'Revenue Analytics', desc: 'Track MRR, churn, ARPU and growth trends month over month.' },
  { icon: '◎', title: 'Customer Management', desc: 'All your customers, plans, and statuses in one place.' },
]

export default function Landing() {
  const nav = useNavigate()
  return (
    <div className="landing">
      {/* Nav */}
      <nav className="landing-nav">
        <div className="landing-logo"><span className="logo-dot" />AI Business Analytics</div>
        <div className="landing-nav-links">
          <button className="btn btn-ghost" onClick={() => nav('/login')}>Sign In</button>
          <button className="btn btn-primary" onClick={() => nav('/signup')}>Get Started Free</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-badge">✦ Created by THOTAKURA PAVAN</div>
        <h1 className="hero-title">
          Your Business Data,<br />
          <span className="hero-gradient">Answered in Plain English</span>
        </h1>
        <p className="hero-sub">
          AI Business Analytics connects to your data and lets you ask questions like
          "Who are my top 5 customers this month?" — and gets you the answer instantly.
        </p>
        <div className="hero-cta">
          <button className="btn btn-primary hero-btn" onClick={() => nav('/signup')}>
            Start for Free →
          </button>
          <button className="btn btn-secondary hero-btn" onClick={() => nav('/login')}>
            Sign In
          </button>
        </div>
        <div className="hero-note">No credit card required · 100 AI queries free</div>
      </section>

      {/* Features */}
      <section className="features">
        {features.map(f => (
          <div key={f.title} className="feature-card">
            <div className="feature-icon">{f.icon}</div>
            <div className="feature-title">{f.title}</div>
            <div className="feature-desc">{f.desc}</div>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="landing-cta-section">
        <div className="landing-cta-card">
          <h2>Ready to get started?</h2>
          <p>Join teams already using AI Business Analytics to make faster decisions.</p>
          <button className="btn btn-primary" onClick={() => nav('/signup')}>
            Create Free Account
          </button>
        </div>
      </section>

      <footer className="landing-footer">
        © 2026 AI Business Analytics · Powered by Gemini AI
      </footer>
    </div>
  )
}
