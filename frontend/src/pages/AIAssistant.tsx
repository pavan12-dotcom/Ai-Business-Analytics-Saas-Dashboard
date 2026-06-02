import { useState, useRef, useEffect } from 'react'
import { askAI } from '../services/api'
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

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: 'Hi! I can answer questions about your business data. Ask me anything about revenue, customers, churn, or trends.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoMode, setDemoMode] = useState(true)
  const [engine, setEngine] = useState<'gemini' | 'anthropic' | 'fallback'>('fallback')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async (q?: string) => {
    const question = (q ?? input).trim()
    if (!question || loading) return
    setInput('')
    const ts = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    setMessages(prev => [...prev, { role: 'user', text: question, ts }])
    setLoading(true)

    try {
      const res = await askAI(question)
      setMessages(prev => [...prev, { role: 'ai', text: res.answer, ts }])
      setDemoMode(!!res.demo)
      setEngine(res.engine || 'fallback')
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: 'An error occurred. Please make sure the backend is running and try again.', ts }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ai-page fade-in">
      {/* Header */}
      <div className="ai-page-header">
        <div className="ai-page-info">
          <div className="ai-status-dot" />
          <div>
            <div className="ai-page-title">AI Data Assistant</div>
            <div className="ai-page-sub">
              {engine === 'gemini' ? 'Powered by Google Gemini' : engine === 'anthropic' ? 'Powered by Anthropic Claude' : 'Canned Response Demo'} · Reads your business data
            </div>
          </div>
        </div>
        {demoMode && <div className="demo-pill">Demo mode — Add GEMINI_API_KEY to backend/.env for live AI</div>}
      </div>

      <div className="ai-layout">
        {/* Chat panel */}
        <div className="ai-chat-panel">
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
            {SUGGESTIONS.slice(0, 3).map(s => (
              <button key={s} className="ai-sug-btn" onClick={() => send(s)} disabled={loading}>{s}</button>
            ))}
          </div>

          <div className="ai-input-bar">
            <input
              className="ai-input-field"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask about your data..."
              disabled={loading}
            />
            <button className="btn btn-primary ai-send-btn" onClick={() => send()} disabled={loading || !input.trim()}>
              {loading ? '…' : 'Ask AI'}
            </button>
          </div>
        </div>

        {/* Context panel */}
        <div className="ai-context-panel">
          <div className="context-title">Data Context</div>
          <div className="context-sub">What the AI can see</div>
          <div className="context-items">
            {[
              { icon: '💰', label: 'Revenue', val: '$84,320/mo' },
              { icon: '👥', label: 'Active Users', val: '2,841' },
              { icon: '📉', label: 'Churn Rate', val: '3.2%' },
              { icon: '💳', label: 'ARPU', val: '$29.68' },
              { icon: '📊', label: 'Plans', val: 'Pro · Team · Ent.' },
              { icon: '🏢', label: 'Customers', val: '8 tracked' },
            ].map(({ icon, label, val }) => (
              <div key={label} className="context-item">
                <span className="context-icon">{icon}</span>
                <span className="context-label">{label}</span>
                <span className="context-val">{val}</span>
              </div>
            ))}
          </div>

          <div className="context-title" style={{ marginTop: 20 }}>Sample Questions</div>
          <div className="sample-questions">
            {SUGGESTIONS.map(s => (
              <button key={s} className="sample-q" onClick={() => send(s)} disabled={loading}>{s}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
