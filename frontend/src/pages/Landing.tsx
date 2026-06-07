import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useRealtime } from '../hooks/useRealtime'
import { useSpreadsheet } from '../context/SpreadsheetContext'
import { SAMPLE_DATASETS } from '../data/sampleDatasets'
import type { SampleDataset } from '../data/sampleDatasets'
import { Zap, Bot, TrendingUp, Users, Sparkles, Globe, ArrowRight, ShieldCheck, Database, Check, Sun, Moon, ShoppingCart, BarChart3, Coins, Users2, GraduationCap, Stethoscope, Package, Megaphone, FolderOpen, Rocket, Loader2, AlertTriangle } from 'lucide-react'
import './Landing.css'

const FEATURES = [
  { icon: <TrendingUp size={22} />, title: 'Live SaaS Dashboard', desc: 'KPIs, charts, and customer tables updated instantly in real time via WebSockets.' },
  { icon: <Bot size={22} />, title: 'AI Analyst Copilot', desc: 'Ask natural-language questions and stream instant business answers token-by-token.' },
  { icon: <Zap size={22} />, title: 'Financial Intelligence', desc: 'Track MRR, monthly growth, churn, and ARPU trends dynamically with executive analytics.' },
  { icon: <Users size={22} />, title: 'Customer Segmentation', desc: 'Sort customer tiers, LTV scores, engagement ratings, and track live customer journeys.' },
]

const MOCK_PROMPTS = [
  {
    question: "Analyze June revenue performance",
    answer: "June revenue grew by 12.4% MoM to $84,320. This growth was driven by a 15% uptick in Enterprise subscription upgrades, representing our highest-performing month of the year."
  },
  {
    question: "What is our current churn rate?",
    answer: "Active churn has dropped to 3.2%, down 0.4% from last month. This represents an estimated monthly savings of $2,700 in recurring revenue across all segments."
  },
  {
    question: "Summarize plan distribution shares",
    answer: "The Pro tier leads our revenue share at 60%, followed by the Team tier at 30%, and Enterprise contracts at 10%. Up-selling Team tier users remains our best growth lever."
  }
]

const MOCK_ACTIVITIES = [
  "Acme Corp upgraded to Enterprise Plan ($4,200/mo)",
  "New subscriber signup: TechFlow (Team Plan)",
  "Bright Labs updated engagement index to 94%",
  "Monthly subscription invoice processed for Nova Inc",
  "Apex Systems re-activated subscription (Pro Plan)",
  "New customer lead generated: SkyBridge Corp",
  "Dataform Inc finalized annual enterprise agreement",
  "Cresent AI connected fresh spreadsheet data stream"
]

export default function Landing() {
  const navigate = useNavigate()
  const { loginAsGuest } = useAuth()
  const { upload: ctxUpload, uploadDoc, loadSample } = useSpreadsheet()
  const { status: realtimeStatus } = useRealtime()

  const getDatasetIcon = (id: string) => {
    const iconProps = { size: 22, style: { minWidth: 22, opacity: 0.85 } }
    switch (id) {
      case 'retail': return <ShoppingCart {...iconProps} style={{ color: 'var(--indigo)' }} />
      case 'sales': return <BarChart3 {...iconProps} style={{ color: 'var(--teal)' }} />
      case 'finance': return <Coins {...iconProps} style={{ color: 'var(--amber)' }} />
      case 'hr': return <Users2 {...iconProps} style={{ color: 'var(--pink)' }} />
      case 'education': return <GraduationCap {...iconProps} style={{ color: 'var(--purple)' }} />
      case 'healthcare': return <Stethoscope {...iconProps} style={{ color: 'var(--red)' }} />
      case 'inventory': return <Package {...iconProps} style={{ color: 'var(--blue)' }} />
      case 'marketing': return <Megaphone {...iconProps} style={{ color: 'var(--green)' }} />
      default: return null
    }
  }

  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)

  const handleSampleSelect = (ds: SampleDataset) => {
    loginAsGuest()
    loadSample(ds)
    navigate('/app')
  }

  const handleUploadClick = () => {
    fileRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadErr(null)
    try {
      loginAsGuest()
      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf'
      const res = isPdf ? await uploadDoc(file) : await ctxUpload(file)
      if (res.success) {
        navigate('/app')
      } else {
        setUploadErr(res.error || 'Upload failed')
      }
    } catch (err: any) {
      setUploadErr(err.message || 'Error uploading file')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleSeeDemo = () => {
    loginAsGuest()
    navigate('/app')
  }

  // Theme support on landing page
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  })

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark')
    } else {
      document.body.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  // 1. MOCK AI STREAM TYPEWRITER SIMULATION
  const [currentPromptIdx, setCurrentPromptIdx] = useState(0)
  const [promptText, setPromptText] = useState("")
  const [responseText, setResponseText] = useState("")
  const [isTypingQuestion, setIsTypingQuestion] = useState(true)
  const [isStreamingAnswer, setIsStreamingAnswer] = useState(false)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const activePrompt = MOCK_PROMPTS[currentPromptIdx]
    let qIdx = 0
    let aIdx = 0
    setPromptText("")
    setResponseText("")
    setIsTypingQuestion(true)
    setIsStreamingAnswer(false)

    // Type the question
    const typeQuestion = () => {
      if (qIdx < activePrompt.question.length) {
        setPromptText(prev => prev + activePrompt.question[qIdx])
        qIdx++
        typingTimerRef.current = setTimeout(typeQuestion, 60)
      } else {
        // Wait 800ms, then start streaming the answer
        typingTimerRef.current = setTimeout(() => {
          setIsTypingQuestion(false)
          setIsStreamingAnswer(true)
          typeAnswer()
        }, 800)
      }
    }

    // Stream the answer chunk by chunk
    const typeAnswer = () => {
      const words = activePrompt.answer.split(" ")
      if (aIdx < words.length) {
        setResponseText(prev => prev + (aIdx === 0 ? "" : " ") + words[aIdx])
        aIdx++
        typingTimerRef.current = setTimeout(typeAnswer, 150)
      } else {
        // Let user read answer for 4 seconds, then transition to next prompt
        typingTimerRef.current = setTimeout(() => {
          setIsStreamingAnswer(false)
          setCurrentPromptIdx(prev => (prev + 1) % MOCK_PROMPTS.length)
        }, 4000)
      }
    }

    typingTimerRef.current = setTimeout(typeQuestion, 500)

    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    }
  }, [currentPromptIdx])

  // 2. LIVE ROLLING ACTIVITIES FEED
  const [activities, setActivities] = useState<string[]>([
    "Acme Corp upgraded to Enterprise Plan ($4,200/mo) - Just now",
    "New subscriber signup: TechFlow (Team Plan) - 1m ago",
    "Bright Labs updated engagement index to 94% - 3m ago"
  ])

  useEffect(() => {
    const activityInterval = setInterval(() => {
      const randomMsg = MOCK_ACTIVITIES[Math.floor(Math.random() * MOCK_ACTIVITIES.length)]
      const timeStamped = `${randomMsg} - Just now`
      
      setActivities(prev => {
        // Shift old time indicators slightly and prepend new message
        const updated = prev.map(act => {
          if (act.includes("Just now")) return act.replace("Just now", "1m ago")
          if (act.includes("1m ago")) return act.replace("1m ago", "5m ago")
          return act
        })
        return [timeStamped, ...updated.slice(0, 2)]
      })
    }, 4500)

    return () => clearInterval(activityInterval)
  }, [])

  return (
    <div className="landing">
      {/* Background glass glows */}
      <div className="landing-glow glow-1" />
      <div className="landing-glow glow-2" />

      {/* Nav */}
      <nav className="landing-nav">
        <div className="landing-logo">
          <span className="logo-dot-live animate-ping-slow" />
          <span>Insight<span className="logo-ai">AI</span></span>
          <span className="badge badge-blue landing-badge">SaaS Realtime</span>
        </div>
        <div className="landing-nav-links">
          <button 
            className="theme-toggle-btn landing-theme-toggle" 
            onClick={toggleTheme} 
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
          </button>
          <button className="btn btn-ghost see-demo-link" onClick={handleSeeDemo}>See Demo <Zap size={13} style={{ marginLeft: 2 }} /></button>
          <button className="btn btn-secondary" onClick={() => navigate('/login')}>Sign In</button>
          <button className="btn btn-primary" onClick={() => navigate('/signup')}>Get Started Free</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero-section">
        <div className="hero-status-pill">
          <span className="rt-pulse" />
          <span>InsightAI Network Status: <strong>ACTIVE</strong> ({realtimeStatus === 'live' ? 'Connected' : 'Live Syncing'})</span>
        </div>
        
        <h1 className="hero-headline">
          Real-time SaaS Data,<br />
          <span className="gradient-text">Answered Instantly by AI</span>
        </h1>
        
        <p className="hero-tagline">
          Connect your spreadsheets and PDF databases. Ask natural questions, view streaming token answers, and watch your metrics update in real time without refreshing.
        </p>
        
        <div className="hero-cta-group">
          <button className="btn btn-primary btn-lg-glow" onClick={() => navigate('/signup')}>
            Get Started Free <ArrowRight size={16} />
          </button>
          <button className="btn btn-secondary btn-demo-glow" onClick={handleSeeDemo}>
            Explore Live Demo <Zap size={14} style={{ marginLeft: 4 }} />
          </button>
        </div>
        <div className="hero-subtext">No credit card required · Full security RLS authentication</div>
      </section>

      {/* Interactive Mock Dashboard Live Showcase */}
      <section className="live-demo-showcase">
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.json,.pdf" style={{ display: 'none' }} onChange={handleFileChange} />
        <div className="mock-window glass-card">
          <div className="mock-window-header">
            <div className="mock-window-dots">
              <span className="dot red" />
              <span className="dot yellow" />
              <span className="dot green" />
            </div>
            <div className="mock-window-address">https://insightai.co/live-sandbox</div>
          </div>
          
          <div className="mock-window-content">
            {/* Start Your Analysis Hero */}
            <div className="no-data-hero card" style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: '24px 0', margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Rocket size={42} className="glow-icon" style={{ color: 'var(--accent)', marginBottom: 12, filter: 'drop-shadow(0 0 10px rgba(99,102,241,0.4))' }} />
              <h2 className="no-data-title" style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 8, textAlign: 'center' }}>Start Your Analysis</h2>
              <p className="no-data-sub" style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 500, margin: '0 auto 24px', lineHeight: 1.6, textAlign: 'center' }}>
                Upload CSV, Excel, or JSON/PDF files to instantly run dynamic KPIs, interactive charts, and stream AI insights.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}>
                <button 
                  className="btn btn-primary btn-lg-glow" 
                  onClick={handleUploadClick} 
                  disabled={uploading} 
                  style={{ padding: '14px 40px', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
                >
                  {uploading ? (
                    <>
                      <Loader2 size={18} style={{ animation: 'spin-slow 1.5s linear infinite' }} /> Processing Dataset...
                    </>
                  ) : (
                    <>
                      <FolderOpen size={18} /> Upload Dataset
                    </>
                  )}
                </button>
                {uploadErr && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={12} /> {uploadErr}</div>}
              </div>

              <div className="no-data-divider" style={{ width: '100%', maxWidth: 440, margin: '28px auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 12 }}>
                <span style={{ height: 1, background: 'var(--border)', flex: 1 }} />
                <span>OR TRY A SAMPLE DATASET</span>
                <span style={{ height: 1, background: 'var(--border)', flex: 1 }} />
              </div>

              <div className="sample-cards" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: 800, margin: '0 auto' }}>
                {SAMPLE_DATASETS.map(ds => (
                  <button
                    key={ds.id}
                    className="sample-card hover-lift"
                    onClick={() => handleSampleSelect(ds)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '14px 18px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      flex: '1 1 220px',
                      maxWidth: '260px',
                      color: 'var(--text)',
                      textAlign: 'left'
                    }}
                  >
                    <span className="sample-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 24 }}>
                      {getDatasetIcon(ds.id)}
                    </span>
                    <div className="sample-info" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div className="sample-name" style={{ fontWeight: 700, fontSize: 13.5 }}>{ds.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{ds.tag}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-section">
        <h2 className="section-title">Built for Premium Operations</h2>
        <p className="section-subtitle">Stunning micro-animations, glassmorphic UI, and real-time syncing engines.</p>
        
        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="feature-card glass-card hover-lift">
              <div className="feature-icon-wrapper">{f.icon}</div>
              <h3 className="feature-card-title">{f.title}</h3>
              <p className="feature-card-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Security & Reliability Features */}
      <section className="trust-section">
        <div className="trust-card glass-card">
          <div className="trust-grid">
            <div className="trust-info">
              <div className="trust-icon-pill"><ShieldCheck size={20} /> Bank-Grade Security</div>
              <h2 className="trust-title">Secure RLS Multi-Tenant Database</h2>
              <p className="trust-desc">
                Your data is strictly protected. RLS policies verify authentication keys on every call, ensuring users only retrieve context they own. Supports custom Gemini API key mounting for private workflows.
              </p>
              <div className="trust-checks">
                <div className="check-item"><Check size={16} /> Row-Level Security (RLS)</div>
                <div className="check-item"><Check size={16} /> JWT-Token Middleware Verification</div>
                <div className="check-item"><Check size={16} /> Sandbox Encryption Keys</div>
              </div>
            </div>
            <div className="trust-visual glass-card">
              <div className="visual-header"><Database size={16} /> Connection Security Vault</div>
              <div className="visual-body">
                <div className="vault-row"><span>Supabase Auth</span> <span className="badge badge-green">Enforced</span></div>
                <div className="vault-row"><span>SSL Endpoints</span> <span className="badge badge-green">TLS 1.3</span></div>
                <div className="vault-row"><span>Spreadsheet Sandbox</span> <span className="badge badge-green">Isolated</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-wrapper glass-card">
          <h2 className="cta-title">Upgrade Your Business Intelligence</h2>
          <p className="cta-desc">Start asking questions to your business data today. Get 100 free AI queries upon registration.</p>
          <button className="btn btn-primary btn-lg-glow" onClick={() => navigate('/signup')}>
            Create Your Free Account
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <span>© 2026 InsightAI. All rights reserved.</span>
          <span>Created by THOTAKURA PAVAN</span>
        </div>
      </footer>
    </div>
  )
}
