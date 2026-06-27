import React, { useRef, useState } from 'react'
import { useSpreadsheet } from '../context/SpreadsheetContext'
import { useAuth } from '../context/AuthContext'
import { SAMPLE_DATASETS } from '../data/sampleDatasets'
import { UploadCloud, Loader2, Check } from 'lucide-react'

export default function RecommendedDatasetsWorkspace({ featureName = 'Analytics' }: { featureName?: string }) {
  const { loadSample, upload, uploadDoc } = useSpreadsheet()
  const { isGuest, isGuestTrialExhausted, setShowSignupModal } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)

  const handleUploadClick = () => {
    if (isGuest && isGuestTrialExhausted()) { setShowSignupModal(true); return }
    fileRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true); setUploadErr(null)
    const isPdf = file.name.toLowerCase().endsWith('.pdf')
    const res = isPdf ? await uploadDoc(file) : await upload(file)
    setUploading(false)
    if (!res.success) setUploadErr(res.error || 'Upload failed')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="dashboard-shell fade-in" style={{ height: '100%', minHeight: '100%', boxSizing: 'border-box', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.json" style={{ display: 'none' }} onChange={handleFileChange} />
      
      <div className="dashboard-empty-state-workspace" style={{
        padding: '10px',
        width: '100%',
        maxWidth: '1100px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: '32px',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        boxSizing: 'border-box'
      }}>
        {/* Left Column: Upload */}
        <div style={{
          flex: '1 1 45%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '12px'
        }}>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', marginBottom: '6px' }}>Explore {featureName}</h2>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.45' }}>
              Connect your business data. Upload your own Excel/CSV file to generate custom {featureName.toLowerCase()} metrics, or select a recommended sample dataset below.
            </p>
          </div>

          {/* Upload Card */}
          <div 
            onClick={handleUploadClick}
            className="glass-card"
            style={{
              border: '2px dashed var(--border)',
              borderRadius: '16px',
              padding: '30px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box',
              flexGrow: 1
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.1)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {uploading ? (
                <Loader2 size={20} className="spin" />
              ) : (
                <UploadCloud size={20} />
              )}
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '2px' }}>
                {uploading ? 'Processing file...' : 'Upload custom spreadsheet'}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Excel (.xlsx, .xls), CSV (.csv), or JSON
              </span>
            </div>
            {uploadErr && (
              <div style={{ color: 'var(--red)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                <Check size={11} style={{ transform: 'rotate(45deg)', color: 'var(--red)' }} /> {uploadErr}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sample Datasets */}
        <div style={{
          flex: '1 1 55%',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          justifyContent: 'center'
        }}>
          <span style={{
            fontSize: '11px',
            fontWeight: 800,
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '4px'
          }}>
            Or Choose a Recommended Dataset
          </span>

           <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {SAMPLE_DATASETS.map(ds => (
              <div 
                key={ds.id}
                onClick={() => loadSample(ds)}
                className="glass-card ds-hover-card"
                style={{
                  borderRadius: '12px',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  boxSizing: 'border-box'
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: 0, left: 0,
                  width: '3px', height: '100%',
                  background: ds.tagColor
                }} />

                <span style={{ fontSize: '20px', flexShrink: 0 }}>{ds.icon}</span>

                <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 750, color: 'var(--text)' }}>{ds.name}</h4>
                    <span style={{
                      fontSize: '8px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      background: `${ds.tagColor}12`,
                      color: ds.tagColor,
                      border: `1px solid ${ds.tagColor}20`
                    }}>{ds.tag}</span>
                  </div>
                  <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: '1.3' }}>{ds.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
