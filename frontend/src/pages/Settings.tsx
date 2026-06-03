import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './Settings.css'

export default function Settings() {
  const { user, updateProfile, signOut } = useAuth()
  
  // Profile states
  const [name, setName] = useState<string>((user?.user_metadata?.name as string) || 'Demo User')
  const [email] = useState(user?.email || 'demo@insightai.com')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Organization states
  const [orgName, setOrgName] = useState<string>((user?.user_metadata?.orgName as string) || 'My Company')
  const [industry, setIndustry] = useState<string>((user?.user_metadata?.industry as string) || 'SaaS / Technology')
  const [savedOrg, setSavedOrg] = useState(false)
  const [savingOrg, setSavingOrg] = useState(false)
  const [errorOrg, setErrorOrg] = useState<string | null>(null)

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

  const hasAnthropic = !!import.meta.env.VITE_ANTHROPIC_KEY
  const hasSupabase = !!import.meta.env.VITE_SUPABASE_URL
  const hasStripe = !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

  return (
    <div className="settings-page fade-in">
      <div className="settings-grid">
        {/* Profile */}
        <div className="card settings-section">
          <div className="settings-section-title">Profile</div>
          <div className="settings-section-sub">Your personal information</div>

          <div className="settings-avatar-row">
            <div className="settings-avatar">
              {name.split(' ').map((w: string) => w ? w[0] : '').join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{email}</div>
            </div>
          </div>

          <div className="settings-fields">
            <div className="field">
              <label className="field-label">Full Name</label>
              <input className="field-input" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Email</label>
              <input className="field-input" value={email} disabled style={{ opacity: 0.6 }} />
            </div>
          </div>

          {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>⚠️ {error}</div>}

          <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Changes'}
          </button>
        </div>

        {/* Organization */}
        <div className="card settings-section">
          <div className="settings-section-title">Organization</div>
          <div className="settings-section-sub">Workspace settings</div>

          <div className="settings-fields">
            <div className="field">
              <label className="field-label">Org Name</label>
              <input className="field-input" value={orgName} onChange={e => setOrgName(e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Industry</label>
              <input className="field-input" value={industry} onChange={e => setIndustry(e.target.value)} />
            </div>
          </div>

          {errorOrg && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>⚠️ {errorOrg}</div>}

          <button className="btn btn-secondary btn-sm" onClick={saveOrg} disabled={savingOrg}>
            {savingOrg ? 'Saving...' : savedOrg ? '✓ Saved' : 'Update Org'}
          </button>
        </div>

        {/* API */}
        <div className="card settings-section">
          <div className="settings-section-title">API Keys</div>
          <div className="settings-section-sub">Connect AI and billing services</div>

          <div className="api-key-list">
            {[
              { name: 'Anthropic (Claude)', env: 'VITE_ANTHROPIC_KEY', status: hasAnthropic },
              { name: 'Supabase URL', env: 'VITE_SUPABASE_URL', status: hasSupabase },
              { name: 'Stripe Publishable', env: 'VITE_STRIPE_PUBLISHABLE_KEY', status: hasStripe },
            ].map(k => (
              <div key={k.name} className="api-key-row">
                <div>
                  <div className="api-key-name">{k.name}</div>
                  <div className="api-key-env">{k.env}</div>
                </div>
                <span className={`badge ${k.status ? 'badge-green' : 'badge-red'}`}>
                  {k.status ? 'Connected' : 'Not set'}
                </span>
              </div>
            ))}
          </div>

          <div className="api-note">
            Add these keys to <code className="code-pill">frontend/.env</code> to enable live features.
          </div>
        </div>

        {/* Danger zone */}
        <div className="card settings-section settings-danger">
          <div className="settings-section-title" style={{ color: 'var(--red)' }}>Danger Zone</div>
          <div className="settings-section-sub">Irreversible actions</div>
          <button className="btn btn-secondary btn-sm"
            style={{ borderColor: 'rgba(239,68,68,0.3)', color: 'var(--red)' }}
            onClick={handleDeleteAccount}>
            Delete Account
          </button>
        </div>
      </div>
    </div>
  )
}
