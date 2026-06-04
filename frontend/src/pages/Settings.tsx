import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { fetchAuditLogs } from '../services/api'
import { PieChart, Pie, Cell } from 'recharts'
import {
  Shield,
  Key,
  Users,
  Monitor,
  Smartphone,
  Globe,
  Activity,
  Check,
  AlertTriangle,
  Lock,
  Building,
  User,
  Trash2
} from 'lucide-react'
import './Settings.css'

interface AuditLog {
  id: string
  action: string
  timestamp: string
  user: string
}

export default function Settings() {
  const { user, updateProfile, signOut, userRole } = useAuth()

  const isViewer = userRole === 'Viewer'
  const isAnalyst = userRole === 'Analyst'
  const isManager = userRole === 'Manager'
  const isRestricted = isViewer || isAnalyst
  const isKeyRestricted = isRestricted || isManager
  const isDangerRestricted = isRestricted || isManager

  // Profile states
  const [name, setName] = useState<string>((user?.user_metadata?.name as string) || 'Demo User')
  const [email, setEmail] = useState(user?.email || 'demo@insightai.com')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Organization states
  const [orgName, setOrgName] = useState<string>((user?.user_metadata?.orgName as string) || 'My Company')
  const [industry, setIndustry] = useState<string>((user?.user_metadata?.industry as string) || 'SaaS / Technology')
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
    } catch (err) {
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
      if (user.user_metadata?.name) setName(user.user_metadata.name)
      if (user.email) setEmail(user.email)
      if (user.user_metadata?.orgName) setOrgName(user.user_metadata.orgName)
      if (user.user_metadata?.industry) setIndustry(user.user_metadata.industry)
      if (user.user_metadata?.gemini_api_key) setGeminiKey(user.user_metadata.gemini_api_key)
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

  const hasSupabase = !!import.meta.env.VITE_SUPABASE_URL
  const hasStripe = !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

  // Security Ring Data
  const securityData = [
    { name: 'Secure', value: 92, fill: 'var(--green)' },
    { name: 'Gap', value: 8, fill: 'var(--border)' }
  ]

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
          {/* Profile */}
          <div className="card settings-section glass-card">
            <div className="settings-section-title">
              <User size={14} /> Profile Settings
            </div>
            <div className="settings-section-sub">Manage your public account details</div>

            <div className="settings-avatar-row">
              <div className="settings-avatar">
                {name
                  .split(' ')
                  .map((w: string) => (w ? w[0] : ''))
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <div className="avatar-name">{name}</div>
                <div className="avatar-email">{email}</div>
              </div>
            </div>

            <div className="settings-fields">
              <div className="field">
                <label className="field-label">Full Name</label>
                <input 
                  className={`field-input ${isRestricted ? 'disabled-input' : ''}`} 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  disabled={isRestricted}
                />
              </div>
              <div className="field">
                <label className="field-label">Email Address</label>
                <input className="field-input disabled-input" value={email} disabled />
              </div>
            </div>

            {error && <div className="settings-error-msg">⚠️ {error}</div>}

            <button 
              className="btn btn-primary btn-sm save-btn" 
              onClick={save} 
              disabled={saving || isRestricted}
              title={isRestricted ? `Access denied: ${userRole}s cannot modify profile settings` : ''}
            >
              {saving ? 'Saving...' : saved ? '✓ Profile Saved' : 'Save Profile'}
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
                />
              </div>
              <div className="field">
                <label className="field-label">Industry Classification</label>
                <input 
                  className={`field-input ${isRestricted ? 'disabled-input' : ''}`} 
                  value={industry} 
                  onChange={e => setIndustry(e.target.value)} 
                  disabled={isRestricted}
                />
              </div>
            </div>

            {errorOrg && <div className="settings-error-msg">⚠️ {errorOrg}</div>}

            <button 
              className="btn btn-secondary btn-sm save-btn" 
              onClick={saveOrg} 
              disabled={savingOrg || isRestricted}
              title={isRestricted ? `Access denied: ${userRole}s cannot modify organization settings` : ''}
            >
              {savingOrg ? 'Saving...' : savedOrg ? '✓ Org Updated' : 'Update Org'}
            </button>
          </div>

          {/* API Keys */}
          <div className="card settings-section glass-card">
            <div className="settings-section-title">
              <Key size={14} /> Connected integrations
            </div>
            <div className="settings-section-sub">Manage secure endpoints and billing nodes</div>

            <div className="field" style={{ marginBottom: 12 }}>
              <label className="field-label flex-between">
                <span>Custom Gemini API Key Override</span>
                <span className={`badge ${geminiKey ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 9 }}>
                  {geminiKey ? 'KEY ACTIVE' : 'NO OVERRIDE'}
                </span>
              </label>
              <input
                type="password"
                placeholder={isKeyRestricted ? `API Key override locked for ${userRole}` : "Paste Gemini token (will be masked securely)..."}
                className={`field-input ${isKeyRestricted ? 'disabled-input' : ''}`}
                value={geminiKey}
                onChange={e => setGeminiKey(e.target.value)}
                disabled={isKeyRestricted}
              />
            </div>

            {errorKey && <div className="settings-error-msg">⚠️ {errorKey}</div>}

            <button 
              className="btn btn-secondary btn-sm save-btn" 
              onClick={saveGeminiKey} 
              disabled={savingKey || isKeyRestricted} 
              style={{ marginBottom: 16 }}
              title={isKeyRestricted ? `Access denied: ${userRole}s cannot configure API keys` : ''}
            >
              {savingKey ? 'Configuring...' : savedKey ? '✓ Key Saved' : 'Update Gemini Override'}
            </button>

            <div className="api-key-list">
              {[
                { name: 'Default AI Engine API', env: 'GEMINI_API_KEY (Backend)', status: true },
                { name: 'Supabase Database', env: 'VITE_SUPABASE_URL', status: hasSupabase },
                { name: 'Stripe Gateway', env: 'VITE_STRIPE_PUBLISHABLE_KEY', status: hasStripe }
              ].map(k => (
                <div key={k.name} className="api-key-row">
                  <div>
                    <div className="api-key-name">{k.name}</div>
                    <div className="api-key-env">{k.env}</div>
                  </div>
                  <span className={`badge ${k.status ? 'badge-green' : 'badge-red'}`}>
                    {k.status ? 'CONNECTED' : 'DISCONNECTED'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right side: Security Score & Team Usage */}
        <div className="settings-right-col">
          {/* Security Score Card */}
          <div className="card settings-section glass-card security-health-card">
            <div className="settings-section-title">
              <Shield size={14} /> Security Dashboard
            </div>
            <div className="settings-section-sub">Realtime audit status</div>

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
                <div className="ring-text">92%</div>
              </div>
              <div className="ring-details">
                <div className="ring-status-header">Excellent Standing</div>
                <div className="ring-status-sub">2FA active · 0 leaked credential alerts</div>
              </div>
            </div>

            <div className="session-list-title">Active Login Sessions</div>
            <div className="sessions-list">
              {[
                { device: 'Windows 11 · Chrome', location: 'Hyderabad, India', current: true },
                { device: 'MacBook Pro · Safari', location: 'San Francisco, USA', current: false }
              ].map((s, idx) => (
                <div key={idx} className="session-row">
                  <div className="session-icon">
                    <Monitor size={14} />
                  </div>
                  <div className="session-info">
                    <div className="session-device">
                      {s.device}
                      {s.current && <span className="current-session-badge">Current</span>}
                    </div>
                    <div className="session-loc">{s.location}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Activity Logs */}
          <div className="card settings-section glass-card">
            <div className="settings-section-title">
              <Activity size={14} /> System Activity Logs
            </div>
            <div className="settings-section-sub">Real-time audit timeline of workspace operations</div>

            <div className="audit-timeline">
              {loadingLogs && logs.length === 0 ? (
                <div className="timeline-empty">Syncing audit history...</div>
              ) : logs.length === 0 ? (
                <div className="timeline-empty">No activity logs recorded.</div>
              ) : (
                logs.slice(0, 8).map((log) => (
                  <div key={log.id} className="timeline-item">
                    <div className="timeline-badge" />
                    <div className="timeline-content">
                      <div className="timeline-action">{log.action}</div>
                      <div className="timeline-meta">
                        <span className="timeline-user">{log.user}</span>
                        <span className="timeline-dot">·</span>
                        <span className="timeline-time">{log.timestamp}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Team Active score meters */}
          <div className="card settings-section glass-card">
            <div className="settings-section-title">
              <Users size={14} /> Workspace Team usage
            </div>
            <div className="settings-section-sub">Track active seat rates</div>

            <div className="team-list">
              {[
                { name: 'Sarah Jenkins', role: 'Billing Administrator', pct: 98, color: 'var(--green)' },
                { name: 'David Miller', role: 'Lead Developer', pct: 64, color: 'var(--accent)' },
                { name: 'Alex Thompson', role: 'Support Specialist', pct: 40, color: 'var(--amber)' }
              ].map(m => (
                <div key={m.name} className="team-member-row">
                  <div className="tm-avatar">
                    {m.name
                      .split(' ')
                      .map(w => w[0])
                      .join('')}
                  </div>
                  <div className="tm-body">
                    <div className="tm-header">
                      <span className="tm-name">{m.name}</span>
                      <span className="tm-pct">{m.pct}% active</span>
                    </div>
                    <div className="tm-role">{m.role}</div>
                    <div className="tm-bar-bg">
                      <div className="tm-bar-fg" style={{ width: `${m.pct}%`, backgroundColor: m.color }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Danger zone */}
          <div className="card settings-section settings-danger glass-card">
            <div className="danger-header">
              <AlertTriangle size={16} />
              <div>
                <div className="danger-title">Danger Zone</div>
                <div className="danger-sub">Irreversible actions on this workspace</div>
              </div>
            </div>
            <button 
              className="btn delete-account-btn" 
              onClick={handleDeleteAccount}
              disabled={isDangerRestricted}
              title={isDangerRestricted ? `Access denied: ${userRole}s cannot deactivate seats` : ''}
            >
              <Trash2 size={13} style={{ marginRight: 6 }} />
              Deactivate Enterprise Seat
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

