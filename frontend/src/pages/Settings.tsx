import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './Settings.css'

export default function Settings() {
  const { user } = useAuth()
  const [name, setName] = useState<string>((user?.user_metadata?.name as string) || 'Demo User')
  const [email] = useState(user?.email || 'demo@insightai.com')
  const [saved, setSaved] = useState(false)

  const save = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="settings-page fade-in">
      <div className="settings-grid">
        {/* Profile */}
        <div className="card settings-section">
          <div className="settings-section-title">Profile</div>
          <div className="settings-section-sub">Your personal information</div>

          <div className="settings-avatar-row">
            <div className="settings-avatar">
              {name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
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

          <button className="btn btn-primary btn-sm" onClick={save}>
            {saved ? '✓ Saved' : 'Save Changes'}
          </button>
        </div>

        {/* Organization */}
        <div className="card settings-section">
          <div className="settings-section-title">Organization</div>
          <div className="settings-section-sub">Workspace settings</div>

          <div className="settings-fields">
            <div className="field">
              <label className="field-label">Org Name</label>
              <input className="field-input" defaultValue="My Company" />
            </div>
            <div className="field">
              <label className="field-label">Industry</label>
              <input className="field-input" defaultValue="SaaS / Technology" />
            </div>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={save}>Update Org</button>
        </div>

        {/* API */}
        <div className="card settings-section">
          <div className="settings-section-title">API Keys</div>
          <div className="settings-section-sub">Connect AI and billing services</div>

          <div className="api-key-list">
            {[
              { name: 'Anthropic (Claude)', env: 'VITE_ANTHROPIC_KEY', status: false },
              { name: 'Supabase URL', env: 'VITE_SUPABASE_URL', status: false },
              { name: 'Stripe Publishable', env: 'VITE_STRIPE_PUBLISHABLE_KEY', status: false },
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
            onClick={() => confirm('This would delete your account in production.')}>
            Delete Account
          </button>
        </div>
      </div>
    </div>
  )
}
