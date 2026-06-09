import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { fetchAuditLogs } from '../services/api'
import { PieChart, Pie, Cell } from 'recharts'
import {
  Shield,
  Key,
  Monitor,
  Activity,
  Check,
  AlertTriangle,
  Lock,
  Building,
  User,
  Trash2,
  Crown,
  Calendar,
  Mail,
  Layers,
  Info,
  Clock
} from 'lucide-react'
import './Settings.css'

interface AuditLog {
  id: string
  action: string
  timestamp: string
  user: string
}

export default function Settings() {
  const { user, updateProfile, signOut, userRole, subscription } = useAuth()

  const isViewer = userRole === 'Viewer'
  const isAnalyst = userRole === 'Analyst'
  const isManager = userRole === 'Manager'
  const isRestricted = isViewer || isAnalyst
  const isKeyRestricted = isRestricted || isManager
  const isDangerRestricted = isRestricted || isManager

  // Derive real user data
  const displayName: string = (user?.user_metadata?.name as string) || user?.email?.split('@')[0] || 'User'
  const displayEmail = user?.email || '—'
  const isGuest = !!user?.user_metadata?.isGuest

  // Plan info
  const planLabel = subscription?.plan_type === 'enterprise'
    ? 'Enterprise'
    : subscription?.plan_type === 'pro'
      ? 'Pro'
      : 'Free'
  const planStatus = subscription?.subscription_status || 'demo'
  const remainingDays = subscription?.remaining_days ?? 0
  const aiUsed = subscription?.questions_used ?? 0
  const aiLimit = subscription?.questions_limit ?? 15

  // Joined date (Supabase createdAt)
  const createdAt: string | undefined = (user as any)?.created_at
  const joinedDate = createdAt
    ? new Date(createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'N/A'

  // Profile states
  const [name, setName] = useState<string>(displayName)
  const [email] = useState(displayEmail)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Organization states
  const [orgName, setOrgName] = useState<string>((user?.user_metadata?.orgName as string) || '')
  const [industry, setIndustry] = useState<string>((user?.user_metadata?.industry as string) || '')
  const [savedOrg, setSavedOrg] = useState(false)
  const [savingOrg, setSavingOrg] = useState(false)
  const [errorOrg, setErrorOrg] = useState<string | null>(null)

  // Custom API key states
  const [geminiKey, setGeminiKey] = useState<string>((user?.user_metadata?.gemini_api_key as string) || '')
  const [savingKey, setSavingKey] = useState(false)
  const [savedKey, setSavedKey] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  // Audit Logs states
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  const loadLogs = async () => {
    setLoadingLogs(true)
    try {
      const data = await fetchAuditLogs()
      setLogs(data)
    } catch {
      const localLogs = JSON.parse(localStorage.getItem('audit_logs') || '[]')
      setLogs(localLogs)
    } finally {
      setLoadingLogs(false)
    }
  }

  useEffect(() => {
    loadLogs()
    window.addEventListener('audit_log_added', loadLogs)
    return () => {
      window.removeEventListener('audit_log_added', loadLogs)
    }
  }, [])

  useEffect(() => {
    if (user) {
      const n: string = (user.user_metadata?.name as string) || user.email?.split('@')[0] || 'User'
      setName(n)
      if (user.user_metadata?.orgName) setOrgName(user.user_metadata.orgName as string)
      if (user.user_metadata?.industry) setIndustry(user.user_metadata.industry as string)
      if (user.user_metadata?.gemini_api_key) setGeminiKey(user.user_metadata.gemini_api_key as string)
    }
  }, [user])

  const saveGeminiKey = async () => {
    setErrorKey(null)
    setSavingKey(true)
    const { error: err } = await updateProfile({ gemini_api_key: geminiKey })
    setSavingKey(false)
    if (err) {
      setErrorKey(err)
    } else {
      setSavedKey(true)
      setTimeout(() => setSavedKey(false), 2000)
    }
  }

  const save = async () => {
    setError(null)
    setSaving(true)
    const { error: err } = await updateProfile({ name })
    setSaving(false)
    if (err) {
      setError(err)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const saveOrg = async () => {
    setErrorOrg(null)
    setSavingOrg(true)
    const { error: err } = await updateProfile({ orgName, industry })
    setSavingOrg(false)
    if (err) {
      setErrorOrg(err)
    } else {
      setSavedOrg(true)
      setTimeout(() => setSavedOrg(false), 2000)
    }
  }

  const handleDeleteAccount = async () => {
    const ok = confirm('Are you sure you want to delete your account? This action is irreversible.')
    if (ok) {
      alert('Account deletion request sent to administration.')
      await signOut()
    }
  }

  const hasSupabase = !!import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co'
  const hasStripe = !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

  // Avatar initials from real name
  const avatarInitials = name
    .split(' ')
    .filter(Boolean)
    .map((w: string) => (w ? w[0] : ''))
    .join('')
    .slice(0, 2)
    .toUpperCase() || displayEmail.slice(0, 2).toUpperCase()

  // Role icon
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Admin': return <Shield size={13} />
      case 'Manager': return <Layers size={13} />
      case 'Analyst': return <Activity size={13} />
      default: return <Info size={13} />
    }
  }

  // Role badge color
  const roleBadgeColor: Record<string, string> = {
    Admin: 'var(--accent)',
    Manager: 'var(--green)',
    Analyst: 'var(--amber)',
    Viewer: 'var(--muted)'
  }

  // Plan badge color
  const planBadgeColor: Record<string, string> = {
    enterprise: 'var(--accent)',
    pro: 'var(--green)',
    free: 'var(--amber)',
  }

  // Security ring based on real signals
  const secureScore = hasSupabase ? (hasStripe ? 90 : 75) : 55
  const securityData = [
    { name: 'Secure', value: secureScore, fill: 'var(--green)' },
    { name: 'Gap', value: 100 - secureScore, fill: 'var(--border)' }
  ]
  const securityLabel = secureScore >= 80 ? 'Good Standing' : secureScore >= 60 ? 'Fair Standing' : 'Needs Attention'

  // AI usage ring
  const aiUsagePct = aiLimit > 0 ? Math.round((aiUsed / aiLimit) * 100) : 0

  return (
    <div className="settings-page fade-in">
      {isRestricted && (
        <div className="settings-warning-banner glass-card">
          <div className="warning-banner-icon">
            <Lock size={18} />
          </div>
          <div className="warning-banner-content">
            <div className="warning-banner-title">Workspace Restricted ({userRole} Mode)</div>
            <div className="warning-banner-desc">
              Your active workspace permission level is set to <strong>{userRole}</strong>. Profiling fields, custom overrides, and dangerous options are locked.
            </div>
          </div>
        </div>
      )}

      <div className="settings-grid">
        {/* Left side: Forms */}
        <div className="settings-left-col">

          {/* Account Summary Card */}
          <div className="card settings-section glass-card" style={{ marginBottom: 0 }}>
            <div className="settings-section-title">
              <User size={14} /> Account Overview
            </div>
            <div className="settings-section-sub">Your current identity &amp; subscription</div>

            <div className="settings-avatar-row" style={{ alignItems: 'flex-start', gap: 16 }}>
              <div className="settings-avatar" style={{ fontSize: 22, width: 56, height: 56, minWidth: 56 }}>
                {avatarInitials}
              </div>
              <div style={{ flex: 1 }}>
                <div className="avatar-name" style={{ fontSize: 17, fontWeight: 700 }}>{name}</div>
                <div className="avatar-email" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <Mail size={11} /> {email}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {/* Role badge */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: `color-mix(in srgb, ${roleBadgeColor[userRole] ?? 'var(--accent)'} 15%, transparent)`,
                    color: roleBadgeColor[userRole] ?? 'var(--accent)',
                    border: `1px solid color-mix(in srgb, ${roleBadgeColor[userRole] ?? 'var(--accent)'} 40%, transparent)`,
                    borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 700, letterSpacing: '0.4px'
                  }}>
                    {getRoleIcon(userRole)} {userRole}
                  </span>

                  {/* Plan badge */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: `color-mix(in srgb, ${planBadgeColor[subscription?.plan_type ?? 'free'] ?? 'var(--amber)'} 15%, transparent)`,
                    color: planBadgeColor[subscription?.plan_type ?? 'free'] ?? 'var(--amber)',
                    border: `1px solid color-mix(in srgb, ${planBadgeColor[subscription?.plan_type ?? 'free'] ?? 'var(--amber)'} 40%, transparent)`,
                    borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 700
                  }}>
                    <Crown size={11} /> {planLabel} Plan
                  </span>

                  {/* Guest badge */}
                  {isGuest && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: 'rgba(148,163,184,0.12)', color: 'var(--muted)',
                      border: '1px solid rgba(148,163,184,0.3)',
                      borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 700
                    }}>
                      Guest Session
                    </span>
                  )}
                </div>

                {/* Joined / subscription info */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 10 }}>
                  {!isGuest && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted)' }}>
                      <Calendar size={11} /> Joined {joinedDate}
                    </div>
                  )}
                  {planStatus === 'trial' && remainingDays > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} /> {remainingDays} trial day{remainingDays !== 1 ? 's' : ''} remaining
                    </div>
                  )}
                  {planStatus === 'active' && (
                    <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Check size={11} /> Active subscription
                    </div>
                  )}
                </div>

                {/* AI Usage bar */}
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                    <span>AI Queries Used</span>
                    <span style={{ fontWeight: 700, color: aiUsagePct >= 80 ? 'var(--red)' : 'var(--text)' }}>
                      {aiUsed} / {aiLimit}
                    </span>
                  </div>
                  <div style={{ background: 'var(--border)', borderRadius: 999, height: 5, overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(aiUsagePct, 100)}%`,
                      height: '100%',
                      background: aiUsagePct >= 80 ? 'var(--red)' : 'var(--accent)',
                      borderRadius: 999,
                      transition: 'width 0.6s ease'
                    }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Profile */}
          <div className="card settings-section glass-card">
            <div className="settings-section-title">
              <User size={14} /> Profile Settings
            </div>
            <div className="settings-section-sub">Manage your display name</div>

            <div className="settings-fields">
              <div className="field">
                <label className="field-label">Full Name</label>
                <input
                  className={`field-input ${isRestricted ? 'disabled-input' : ''}`}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={isRestricted}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="field">
                <label className="field-label">Email Address</label>
                <input className="field-input disabled-input" value={email} disabled />
              </div>
              <div className="field">
                <label className="field-label">User Role</label>
                <input className="field-input disabled-input" value={userRole} disabled />
              </div>
            </div>

            {error && <div className="settings-error-msg" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={12} /> {error}</div>}

            <button
              className="btn btn-primary btn-sm save-btn"
              onClick={save}
              disabled={saving || isRestricted}
              title={isRestricted ? `Access denied: ${userRole}s cannot modify profile settings` : ''}
            >
              {saving ? 'Saving...' : saved ? <><Check size={13} style={{ marginRight: 4 }} />Profile Saved</> : 'Save Profile'}
            </button>
          </div>

          {/* Organization */}
          <div className="card settings-section glass-card">
            <div className="settings-section-title">
              <Building size={14} /> Organization Settings
            </div>
            <div className="settings-section-sub">Configure your corporate workspace</div>

            <div className="settings-fields">
              <div className="field">
                <label className="field-label">Organization Name</label>
                <input
                  className={`field-input ${isRestricted ? 'disabled-input' : ''}`}
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  disabled={isRestricted}
                  placeholder="e.g. Acme Corp"
                />
              </div>
              <div className="field">
                <label className="field-label">Industry Classification</label>
                <input
                  className={`field-input ${isRestricted ? 'disabled-input' : ''}`}
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                  disabled={isRestricted}
                  placeholder="e.g. SaaS / Technology"
                />
              </div>
            </div>

            {errorOrg && <div className="settings-error-msg" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={12} /> {errorOrg}</div>}

            <button
              className="btn btn-secondary btn-sm save-btn"
              onClick={saveOrg}
              disabled={savingOrg || isRestricted}
              title={isRestricted ? `Access denied: ${userRole}s cannot modify organization settings` : ''}
            >
              {savingOrg ? 'Saving...' : savedOrg ? <><Check size={13} style={{ marginRight: 4 }} />Org Updated</> : 'Update Org'}
            </button>
          </div>


        </div>

        {/* Right side: Security Score & Logs */}
        <div className="settings-right-col">
          {/* Security Score Card */}
          <div className="card settings-section glass-card security-health-card">
            <div className="settings-section-title">
              <Shield size={14} /> Security Dashboard
            </div>
            <div className="settings-section-sub">Connection & auth audit status</div>

            <div className="security-ring-section">
              <div className="ring-wrap">
                <PieChart width={90} height={90}>
                  <Pie
                    data={securityData}
                    innerRadius={28}
                    outerRadius={38}
                    paddingAngle={0}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill="var(--green)" />
                    <Cell fill="var(--border)" />
                  </Pie>
                </PieChart>
                <div className="ring-text">{secureScore}%</div>
              </div>
              <div className="ring-details">
                <div className="ring-status-header">{securityLabel}</div>
                <div className="ring-status-sub">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{hasSupabase ? <><Check size={10} style={{ color: 'var(--green)' }} /> Supabase connected</> : <><AlertTriangle size={10} style={{ color: 'var(--amber)' }} /> Supabase not configured</>}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{hasStripe ? <><Check size={10} style={{ color: 'var(--green)' }} /> Stripe connected</> : <><AlertTriangle size={10} style={{ color: 'var(--amber)' }} /> Stripe not configured</>}</span>
                </div>
              </div>
            </div>

            {/* Session info — derived from actual auth */}
            <div className="session-list-title">Current Session</div>
            <div className="sessions-list">
              <div className="session-row">
                <div className="session-icon">
                  <Monitor size={14} />
                </div>
                <div className="session-info">
                  <div className="session-device">
                    {navigator.platform || 'Web Browser'}
                    <span className="current-session-badge">Current</span>
                  </div>
                  <div className="session-loc">
                    {isGuest
                      ? 'Guest Session · No persistent data'
                      : `${email} · ${planLabel} Plan`
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Usage Ring */}
          <div className="card settings-section glass-card">
            <div className="settings-section-title">
              <Activity size={14} /> AI Query Usage
            </div>
            <div className="settings-section-sub">Your {planLabel} plan quota</div>

            <div className="security-ring-section">
              <div className="ring-wrap">
                <PieChart width={90} height={90}>
                  <Pie
                    data={[
                      { value: aiUsed, fill: aiUsagePct >= 80 ? 'var(--red)' : 'var(--accent)' },
                      { value: Math.max(0, aiLimit - aiUsed), fill: 'var(--border)' }
                    ]}
                    innerRadius={28}
                    outerRadius={38}
                    paddingAngle={0}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill={aiUsagePct >= 80 ? 'var(--red)' : 'var(--accent)'} />
                    <Cell fill="var(--border)" />
                  </Pie>
                </PieChart>
                <div className="ring-text" style={{ fontSize: 11 }}>{aiUsagePct}%</div>
              </div>
              <div className="ring-details">
                <div className="ring-status-header">{aiUsed} / {aiLimit} Used</div>
                <div className="ring-status-sub">
                  {aiLimit - aiUsed} queries remaining<br />
                  {planLabel} plan · {planStatus === 'active' ? 'Active' : planStatus === 'trial' ? `${remainingDays}d trial left` : 'Demo'}
                </div>
              </div>
            </div>
          </div>


        </div>
      </div>
    </div>
  )
}
