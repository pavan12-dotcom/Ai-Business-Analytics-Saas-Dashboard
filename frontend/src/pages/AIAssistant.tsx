import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { askAI } from '../services/api'
import { useSpreadsheet } from '../context/SpreadsheetContext'
import './AIAssistant.css'

interface Message { role: 'user' | 'ai'; text: string; ts?: string }

const SUGGESTIONS = [
  'Show me top 5 customers by revenue this month',
  'Which month had the highest revenue?',
  "What's our churn trend this quarter?",
  'Which plan generates the most revenue?',
  'How many active users do we have?',
  'Compare MRR growth month over month',
]

const DOC_SUGGESTIONS = [
  'Summarize the key takeaways from this document.',
  'What are the main topics or sections discussed?',
  'Are there any notable financial or metric points?',
  'List the primary recommendations or conclusions.',
]

export default function AIAssistant() {
  const { activeSheet, activeDocument, loadingDoc, uploadDoc, resetDoc } = useSpreadsheet()
  const [mode, setMode] = useState<'spreadsheet' | 'document'>('spreadsheet')

  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: 'Hi! I can answer questions about your business data. Ask me anything about revenue, customers, churn, or trends.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoMode, setDemoMode] = useState(true)
  const [engine, setEngine] = useState<string>('fallback')
  const [docError, setDocError] = useState<string | null>(null)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  // Read initial mode and question from navigation state
  useEffect(() => {
    if (location.state) {
      const { mode: initialMode, question } = location.state as { mode?: 'spreadsheet' | 'document'; question?: string }
      if (initialMode) {
        setMode(initialMode)
      }
      if (question) {
        send(question, initialMode)
      }
      // Clear location state to prevent running it again on re-renders
      window.history.replaceState({}, document.title)
    }
  }, [location])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Sync initial message on mode toggle
  useEffect(() => {
    if (mode === 'spreadsheet') {
      setMessages([
        { role: 'ai', text: 'Hi! I can answer questions about your business data. Ask me anything about revenue, customers, churn, or trends.' }
      ])
    } else {
      if (activeDocument) {
        setMessages([
          { role: 'ai', text: `Hi! I'm ready to answer questions about the active document: "${activeDocument.filename}". Ask me anything about its contents.` }
        ])
      } else {
        setMessages([
          { role: 'ai', text: 'Please upload a PDF or text document to start chatting with its content.' }
        ])
      }
    }
  }, [mode, activeDocument])

  const send = async (q?: string, overrideMode?: 'spreadsheet' | 'document') => {
    const question = (q ?? input).trim()
    if (!question || loading) return
    setInput('')
    const ts = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    setMessages(prev => [...prev, { role: 'user', text: question, ts }])
    setLoading(true)

    try {
      const activeMode = overrideMode || mode
      const res = await askAI(question, activeMode)
      setMessages(prev => [...prev, { role: 'ai', text: res.answer, ts }])
      setDemoMode(!!res.demo)
      setEngine(res.engine || 'fallback')
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: 'An error occurred. Please make sure the backend is running and try again.', ts }])
    } finally {
      setLoading(false)
    }
  }

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDocError(null)
      setUploadingDoc(true)
      const res = await uploadDoc(e.target.files[0])
      setUploadingDoc(false)
      if (!res.success) {
        setDocError(res.error)
      } else {
        setMessages([
          { role: 'ai', text: `Successfully uploaded and parsed "${e.target.files[0].name}"! Ask me any questions about its content.` }
        ])
      }
    }
  }

  const currentSuggestions = mode === 'spreadsheet' ? SUGGESTIONS : DOC_SUGGESTIONS

  // Dynamic values for sheet context
  const hasSheet = !!activeSheet
  const sheetFilename = activeSheet?.filename || 'Demo Dataset'
  const sheetRows = activeSheet?.rows?.length || 8

  return (
    <div className="ai-page fade-in">
      {/* Header */}
      <div className="ai-page-header">
        <div className="ai-page-info">
          <div className="ai-status-dot" />
          <div>
            <div className="ai-page-title">AI Data Assistant</div>
            <div className="ai-page-sub">
              {engine.startsWith('gemini') ? 'Powered by Google Gemini' : 'Canned Response Demo'} · Reads your business data
            </div>
          </div>
        </div>
        {demoMode && <div className="demo-pill">Demo mode — Add GEMINI_API_KEY to backend/.env for live AI</div>}
      </div>

      {/* Mode Segmented Tab Bar */}
      <div className="ai-mode-tabs">
        <button 
          className={`ai-mode-tab ${mode === 'spreadsheet' ? 'active' : ''}`}
          onClick={() => setMode('spreadsheet')}
        >
          📊 Spreadsheet Analytics
        </button>
        <button 
          className={`ai-mode-tab ${mode === 'document' ? 'active' : ''}`}
          onClick={() => setMode('document')}
        >
          📄 Document Q&A Mode
        </button>
      </div>

      <div className="ai-layout">
        {/* Chat panel */}
        <div className="ai-chat-panel">
          {/* Active document indicator inside chat when in document mode */}
          {mode === 'document' && activeDocument && (
            <div className="doc-badge-chat">
              <span className="doc-badge-filename">📄 {activeDocument.filename} ({Math.round(activeDocument.textLength / 1024)} KB extracted)</span>
              <button className="doc-badge-reset" onClick={resetDoc} title="Remove Document">
                Remove ✕
              </button>
            </div>
          )}

          {mode === 'document' && !activeDocument ? (
            <div className="doc-upload-zone" onClick={() => document.getElementById('doc-file-input')?.click()}>
              <input
                id="doc-file-input"
                type="file"
                accept=".pdf, .txt"
                onChange={handleDocUpload}
                style={{ display: 'none' }}
              />
              <div className="upload-box">
                <span style={{ fontSize: 36 }}>📁</span>
                <p>{uploadingDoc ? 'Uploading and parsing document...' : 'Click to upload PDF or TXT document'}</p>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>Supports scanned PDFs using automated Tesseract OCR</span>
              </div>
              {docError && <div className="upload-error">{docError}</div>}
            </div>
          ) : (
            <>
              <div className="ai-messages">
                {messages.map((m, i) => (
                  <div key={i} className={`ai-bubble ${m.role}`}>
                    <div className="bubble-text">{m.text}</div>
                    {m.ts && <div className="bubble-ts">{m.ts}</div>}
                  </div>
                ))}
                {loading && (
                  <div className="ai-bubble ai">
                    <div className="bubble-text typing">
                      <span /><span /><span />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div className="ai-suggestions-row">
                {currentSuggestions.slice(0, 3).map(s => (
                  <button key={s} className="ai-sug-btn" onClick={() => send(s)} disabled={loading}>{s}</button>
                ))}
              </div>

              <div className="ai-input-bar">
                <input
                  className="ai-input-field"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                  placeholder={mode === 'spreadsheet' ? 'Ask about spreadsheet data...' : 'Ask about document content...'}
                  disabled={loading}
                />
                <button className="btn btn-primary ai-send-btn" onClick={() => send()} disabled={loading || !input.trim()}>
                  {loading ? '…' : 'Ask AI'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Context panel */}
        <div className="ai-context-panel">
          {mode === 'spreadsheet' ? (
            <>
              <div className="context-title">Data Context</div>
              <div className="context-sub">Active: {sheetFilename}</div>
              <div className="context-items">
                {[
                  { icon: '💰', label: 'Revenue Source', val: hasSheet ? 'Custom File' : 'Seeded DB' },
                  { icon: '📊', label: 'Total Rows', val: String(sheetRows) },
                  { icon: '📉', label: 'Churn Rate', val: hasSheet ? 'Calculated' : '3.2%' },
                  { icon: '🏢', label: 'Customers', val: hasSheet ? `${sheetRows} uploaded` : '8 tracked' },
                ].map(({ icon, label, val }) => (
                  <div key={label} className="context-item">
                    <span className="context-icon">{icon}</span>
                    <span className="context-label">{label}</span>
                    <span className="context-val">{val}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="context-title">Document Context</div>
              <div className="context-sub">Active PDF / TXT</div>
              <div className="context-items">
                {activeDocument ? (
                  [
                    { icon: '📄', label: 'File Name', val: activeDocument.filename.length > 15 ? activeDocument.filename.substring(0, 12) + '...' : activeDocument.filename },
                    { icon: '📏', label: 'Text Size', val: `${(activeDocument.textLength / 1024).toFixed(1)} KB` },
                    { icon: '🔤', label: 'Char Count', val: activeDocument.textLength.toLocaleString() },
                    { icon: '⏱️', label: 'Uploaded', val: new Date(activeDocument.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) },
                  ].map(({ icon, label, val }) => (
                    <div key={label} className="context-item">
                      <span className="context-icon">{icon}</span>
                      <span className="context-label">{label}</span>
                      <span className="context-val">{val}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: 12, textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
                    No document active. Please upload a PDF or TXT file to populate context.
                  </div>
                )}
              </div>
            </>
          )}

          <div className="context-title" style={{ marginTop: 20 }}>Sample Questions</div>
          <div className="sample-questions">
            {currentSuggestions.map(s => (
              <button key={s} className="sample-q" onClick={() => send(s)} disabled={loading}>{s}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
