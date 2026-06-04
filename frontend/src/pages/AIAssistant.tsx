import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { askAI } from '../services/api'
import { useSpreadsheet } from '../context/SpreadsheetContext'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts'
import {
  Send,
  Sparkles,
  Upload,
  AlertTriangle,
  TrendingUp,
  Bot,
  User,
  FileText,
  Plus,
  Trash2,
  HelpCircle,
  Shield,
  Check,
  Info,
  Layers,
  ArrowRight,
  Database
} from 'lucide-react'
import './AIAssistant.css'

interface Message {
  role: 'user' | 'ai'
  text: string
  ts?: string
  isStreaming?: boolean
  chartType?: 'revenue' | 'churn' | 'customers' | 'plans' | 'users' | null
}

const SUGGESTIONS = [
  'Show me top 5 customers by revenue this month',
  "What's our churn trend this quarter?",
  'Compare MRR growth month over month',
  'Which plan generates the most revenue?',
  'How many active users do we have?',
]

const DOC_SUGGESTIONS = [
  'Summarize the key takeaways from this document.',
  'What are the main topics or sections discussed?',
  'Are there any notable financial or metric points?',
  'List the primary recommendations or conclusions.',
]

function ChatChart({
  type,
  monthlyData,
  customerData
}: {
  type: 'revenue' | 'churn' | 'customers' | 'plans' | 'users'
  monthlyData: any[]
  customerData: any[]
}) {
  if (type === 'revenue') {
    const data = monthlyData.length > 0 ? monthlyData : [
      { month: 'Jan', revenue: 8200 },
      { month: 'Feb', revenue: 9500 },
      { month: 'Mar', revenue: 11200 },
      { month: 'Apr', revenue: 12100 },
      { month: 'May', revenue: 13800 },
      { month: 'Jun', revenue: 15400 }
    ]
    return (
      <div className="chat-chart-card">
        <div className="chat-chart-title">MRR & Revenue Growth Trend</div>
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="chatColorRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '11px', color: 'var(--text)' }} />
            <Area type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={2} fillOpacity={1} fill="url(#chatColorRev)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (type === 'churn') {
    const data = [
      { month: 'Jan', churn: 3.4 },
      { month: 'Feb', churn: 3.2 },
      { month: 'Mar', churn: 3.1 },
      { month: 'Apr', churn: 2.8 },
      { month: 'May', churn: 3.0 },
      { month: 'Jun', churn: 2.4 }
    ]
    return (
      <div className="chat-chart-card">
        <div className="chat-chart-title">Monthly User Churn Rate (%)</div>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '11px', color: 'var(--text)' }} />
            <Line type="monotone" dataKey="churn" stroke="var(--amber)" strokeWidth={2} activeDot={{ r: 5 }} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (type === 'customers') {
    const data = customerData.length > 0
      ? [...customerData].sort((a, b) => b.mrr - a.mrr).slice(0, 5)
      : [
          { name: 'Acme Corp', mrr: 1200 },
          { name: 'Globex Inc', mrr: 950 },
          { name: 'Initech LLC', mrr: 800 },
          { name: 'Umbrella Corp', mrr: 750 },
          { name: 'Hooli Group', mrr: 600 }
        ]
    return (
      <div className="chat-chart-card">
        <div className="chat-chart-title">Top Customers by MRR ($)</div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 5, left: -5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
            <XAxis type="number" tick={{ fontSize: 9, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'var(--muted)' }} axisLine={false} tickLine={false} width={75} />
            <Tooltip contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '11px', color: 'var(--text)' }} />
            <Bar dataKey="mrr" fill="var(--accent)" radius={[0, 4, 4, 0]} barSize={10} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (type === 'plans') {
    let data = [
      { name: 'Enterprise', value: 6500 },
      { name: 'Pro Plan', value: 4200 },
      { name: 'Starter/Free', value: 1800 }
    ]
    if (customerData.length > 0) {
      const planGroups: Record<string, number> = {}
      customerData.forEach(c => {
        planGroups[c.plan] = (planGroups[c.plan] || 0) + (c.mrr || 0)
      })
      data = Object.entries(planGroups).map(([name, value]) => ({ name, value }))
    }
    const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444']
    return (
      <div className="chat-chart-card">
        <div className="chat-chart-title">Revenue Share by Plan Tier</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ResponsiveContainer width="40%" height={110}>
            <PieChart>
              <Pie
                data={data}
                innerRadius={25}
                outerRadius={45}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${value}`} contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '10px', color: 'var(--text)' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="chat-chart-legend" style={{ flex: 1 }}>
            {data.map((entry, index) => (
              <div key={entry.name} className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', marginBottom: '4px' }}>
                <span className="legend-dot" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span style={{ color: 'var(--text2)', fontWeight: 500 }}>{entry.name}:</span>
                <span style={{ color: 'var(--muted)' }}>${entry.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (type === 'users') {
    const data = [
      { month: 'Jan', users: 80 },
      { month: 'Feb', users: 115 },
      { month: 'Mar', users: 150 },
      { month: 'Apr', users: 195 },
      { month: 'May', users: 245 },
      { month: 'Jun', users: 310 }
    ]
    return (
      <div className="chat-chart-card">
        <div className="chat-chart-title">Active User Growth Trend</div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '11px', color: 'var(--text)' }} />
            <Bar dataKey="users" fill="var(--green)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return null
}

const detectChartType = (question: string, answer: string): Message['chartType'] => {
  const text = (question + ' ' + answer).toLowerCase()
  if (text.includes('mrr growth') || text.includes('revenue growth') || text.includes('highest revenue') || text.includes('revenue trend')) {
    return 'revenue'
  }
  if (text.includes('churn') || text.includes('retention') || text.includes('lost customer')) {
    return 'churn'
  }
  if (text.includes('top 5 customer') || text.includes('top customer') || text.includes('customer by revenue')) {
    return 'customers'
  }
  if (text.includes('plan generates') || text.includes('most revenue by plan') || text.includes('plan tier') || text.includes('billing plan')) {
    return 'plans'
  }
  if (text.includes('active user') || text.includes('user growth') || text.includes('how many users')) {
    return 'users'
  }
  return null
}

export default function AIAssistant() {
  const {
    activeSheet,
    activeDocument,
    loadingDoc,
    uploadDoc,
    resetDoc,
    upload,
    reset,
    getSpreadsheetCustomers,
    getSpreadsheetMonthlyMetrics,
    getSpreadsheetKPIs
  } = useSpreadsheet()
  const [mode, setMode] = useState<'spreadsheet' | 'document'>('spreadsheet')

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      text: 'Hi! I can analyze your business data. Ask me anything about revenue, customers, churn, or plans, or drag-and-drop spreadsheets/documents here.'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoMode, setDemoMode] = useState(true)
  const [engine, setEngine] = useState<string>('fallback')
  const [docError, setDocError] = useState<string | null>(null)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Sync initial message on mode toggle
  useEffect(() => {
    if (mode === 'spreadsheet') {
      setMessages([
        {
          role: 'ai',
          text: 'Hi! I can analyze your business data. Ask me anything about revenue, customers, churn, or plans, or drag-and-drop spreadsheets/documents here.'
        }
      ])
    } else {
      if (activeDocument) {
        setMessages([
          {
            role: 'ai',
            text: `Hi! I'm ready to answer questions about the active document: "${activeDocument.filename}". Ask me anything about its contents.`
          }
        ])
      } else {
        setMessages([
          {
            role: 'ai',
            text: 'Please upload a PDF or text document to start chatting with its content.'
          }
        ])
      }
    }
  }, [mode, activeDocument])

  const send = async (q?: string, overrideMode?: 'spreadsheet' | 'document') => {
    const question = (q ?? input).trim()
    if (!question || loading || messages.some(m => m.isStreaming)) return
    setInput('')
    const ts = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    setMessages(prev => [...prev, { role: 'user', text: question, ts }])
    setLoading(true)

    try {
      const activeMode = overrideMode || mode
      const res = await askAI(question, activeMode)
      const fullAnswer = res.answer
      const chart = detectChartType(question, fullAnswer)

      setDemoMode(!!res.demo)
      setEngine(res.engine || 'fallback')
      setLoading(false)

      // Insert AI message with isStreaming: true
      setMessages(prev => [
        ...prev,
        { role: 'ai', text: '', ts, isStreaming: true, chartType: chart }
      ])

      const words = fullAnswer.split(' ')
      let currentText = ''
      let wordIdx = 0

      const interval = setInterval(() => {
        if (wordIdx < words.length) {
          currentText += (wordIdx === 0 ? '' : ' ') + words[wordIdx]
          setMessages(prev => {
            const updated = [...prev]
            const lastMsg = updated[updated.length - 1]
            if (lastMsg && lastMsg.role === 'ai') {
              lastMsg.text = currentText
            }
            return updated
          })
          wordIdx++
        } else {
          clearInterval(interval)
          setMessages(prev => {
            const updated = [...prev]
            const lastMsg = updated[updated.length - 1]
            if (lastMsg && lastMsg.role === 'ai') {
              lastMsg.isStreaming = false
            }
            return updated
          })
        }
      }, 25)
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'ai', text: 'An error occurred. Please make sure the backend is running and try again.', ts }
      ])
      setLoading(false)
    }
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (ext === 'xlsx' || ext === 'xls') {
        setMode('spreadsheet')
        setLoading(true)
        const res = await upload(file)
        setLoading(false)
        if (res.success) {
          setMessages([
            {
              role: 'ai',
              text: `Successfully uploaded spreadsheet "${file.name}"! I am now ready to answer questions based on this custom sheet data.`
            }
          ])
        } else {
          setMessages(prev => [...prev, { role: 'ai', text: `Failed to upload spreadsheet: ${res.error}` }])
        }
      } else if (ext === 'pdf' || ext === 'txt') {
        setMode('document')
        setUploadingDoc(true)
        const res = await uploadDoc(file)
        setUploadingDoc(false)
        if (res.success) {
          setMessages([
            {
              role: 'ai',
              text: `Successfully uploaded and parsed "${file.name}"! You can now ask any questions about this document's text.`
            }
          ])
        } else {
          setDocError(res.error)
        }
      } else {
        alert('Invalid file format. Please drop a .xlsx, .xls, .pdf, or .txt file.')
      }
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
          {
            role: 'ai',
            text: `Successfully uploaded and parsed "${e.target.files[0].name}"! Ask me any questions about its content.`
          }
        ])
      }
    }
  }

  const currentSuggestions = mode === 'spreadsheet' ? SUGGESTIONS : DOC_SUGGESTIONS
  const isStreamingActive = messages.some(m => m.isStreaming)

  // Context properties
  const hasSheet = !!activeSheet
  const sheetFilename = activeSheet?.filename || 'Demo Seeds Dataset'
  const sheetRows = activeSheet?.rows?.length || 8

  // Computed data context values for Insights
  const monthlyMetrics = getSpreadsheetMonthlyMetrics()
  const customerList = getSpreadsheetCustomers()
  const kpis = getSpreadsheetKPIs()

  return (
    <div className="ai-page fade-in">
      {/* Header */}
      <div className="ai-page-header">
        <div className="ai-page-info">
          <div className="ai-status-dot" />
          <div>
            <div className="ai-page-title">Enterprise AI Analyst</div>
            <div className="ai-page-sub">
              {engine.startsWith('gemini') ? 'Powered by Google Gemini Pro' : 'Automated Analytics Sandbox'} · Dynamic Schema Detection
            </div>
          </div>
        </div>
        {demoMode && (
          <div className="demo-pill">
            <Sparkles size={12} style={{ marginRight: 4 }} />
            Demo Mode - Simulated responses active
          </div>
        )}
      </div>

      {/* Mode Segmented Tab Bar */}
      <div className="ai-mode-tabs">
        <button
          className={`ai-mode-tab ${mode === 'spreadsheet' ? 'active' : ''}`}
          onClick={() => setMode('spreadsheet')}
        >
          <Database size={14} />
          Spreadsheet Data Analytics
        </button>
        <button
          className={`ai-mode-tab ${mode === 'document' ? 'active' : ''}`}
          onClick={() => setMode('document')}
        >
          <FileText size={14} />
          Document Q&A Space
        </button>
      </div>

      <div className="ai-layout">
        {/* Chat workspace with drag and drop */}
        <div
          className={`ai-chat-panel ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDragging && (
            <div className="drag-overlay">
              <div className="drag-content">
                <Upload className="pulse-icon" size={48} />
                <h3>Drop files to analyze</h3>
                <p>Supports .xlsx, .xls, .pdf, and .txt files</p>
              </div>
            </div>
          )}

          {/* Active document indicator inside chat */}
          {mode === 'document' && activeDocument && (
            <div className="doc-badge-chat">
              <span className="doc-badge-filename">
                <FileText size={14} style={{ color: 'var(--accent)' }} />
                {activeDocument.filename} ({Math.round(activeDocument.textLength / 1024)} KB)
              </span>
              <button className="doc-badge-reset" onClick={resetDoc} title="Remove Document">
                <Trash2 size={13} />
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
                <Upload size={32} style={{ color: 'var(--accent)', marginBottom: 8 }} />
                <p>{uploadingDoc ? 'Parsing text layers & structures...' : 'Click or drag PDF / TXT document here'}</p>
                <span className="upload-subtext">Automatic OCR extraction for scanned files</span>
              </div>
              {docError && <div className="upload-error">{docError}</div>}
            </div>
          ) : (
            <>
              <div className="ai-messages">
                {messages.map((m, i) => (
                  <div key={i} className={`ai-bubble ${m.role}`}>
                    <div className="bubble-icon-wrap">
                      {m.role === 'ai' ? <Bot size={14} /> : <User size={14} />}
                    </div>
                    <div className="bubble-body">
                      <div className="bubble-text">
                        {m.text}
                        {m.isStreaming && <span className="streaming-cursor" />}
                      </div>

                      {/* Embedded visualization interception */}
                      {m.chartType && !m.isStreaming && (
                        <ChatChart
                          type={m.chartType}
                          monthlyData={monthlyMetrics}
                          customerData={customerList}
                        />
                      )}

                      {m.ts && <div className="bubble-ts">{m.ts}</div>}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="ai-bubble ai">
                    <div className="bubble-icon-wrap">
                      <Bot size={14} />
                    </div>
                    <div className="bubble-body">
                      <div className="bubble-text typing">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Sugestion quick action pills */}
              <div className="ai-suggestions-row">
                {currentSuggestions.slice(0, 3).map(s => (
                  <button
                    key={s}
                    className="ai-sug-btn"
                    onClick={() => send(s)}
                    disabled={loading || isStreamingActive}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Chat Input bar */}
              <div className="ai-input-bar">
                <input
                  className="ai-input-field"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                  placeholder={
                    mode === 'spreadsheet'
                      ? 'Ask about spreadsheet data (e.g. "show revenue growth")...'
                      : 'Ask about document content...'
                  }
                  disabled={loading || isStreamingActive}
                />
                <button
                  className="btn btn-primary ai-send-btn"
                  onClick={() => send()}
                  disabled={loading || isStreamingActive || !input.trim()}
                >
                  <Send size={14} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Premium sidebar: context and auto-generated insights */}
        <div className="ai-context-panel">
          <div className="context-title">Active Context</div>
          <div className="context-card glass-card">
            <div className="context-header">
              <span className="context-filename" title={sheetFilename}>
                {mode === 'spreadsheet' ? '📊 ' + sheetFilename : '📄 ' + (activeDocument?.filename || 'No document')}
              </span>
              {mode === 'spreadsheet' && hasSheet && (
                <button className="reset-context-btn" onClick={reset} title="Reset to demo data">
                  <Trash2 size={12} />
                </button>
              )}
            </div>
            <div className="context-info-rows">
              <div className="context-info-row">
                <span className="ci-label">Source Mode:</span>
                <span className="ci-value">{mode === 'spreadsheet' ? 'Spreadsheet' : 'Document Q&A'}</span>
              </div>
              <div className="context-info-row">
                <span className="ci-label">Data points:</span>
                <span className="ci-value">{mode === 'spreadsheet' ? `${sheetRows} rows` : `${activeDocument?.textLength || 0} characters`}</span>
              </div>
            </div>
          </div>

          <div className="context-title" style={{ marginTop: '16px' }}>Auto Insights</div>
          <div className="insights-container">
            <div className="insight-card info">
              <div className="insight-top">
                <span className="insight-badge active">System Ready</span>
                <Layers size={14} style={{ color: 'var(--accent)' }} />
              </div>
              <p>Dynamic structure mapper loaded. Natural language queries translated locally.</p>
            </div>

            <div className="insight-card success">
              <div className="insight-top">
                <span className="insight-badge success">Milestone reached</span>
                <TrendingUp size={14} style={{ color: 'var(--green)' }} />
              </div>
              <p>MRR is up +12.4% MoM. Enterprise plan constitutes 45% of customer spend.</p>
            </div>

            <div className="insight-card warning">
              <div className="insight-top">
                <span className="insight-badge warning">Churn watch</span>
                <AlertTriangle size={14} style={{ color: 'var(--amber)' }} />
              </div>
              <p>Churn rate is 2.4%. Standard target is &lt;3%. Check customer engagement page.</p>
            </div>
          </div>

          <div className="context-title" style={{ marginTop: '16px' }}>Sample Queries</div>
          <div className="sample-questions">
            {currentSuggestions.map(s => (
              <button
                key={s}
                className="sample-q"
                onClick={() => send(s)}
                disabled={loading || isStreamingActive}
              >
                <span>{s}</span>
                <ArrowRight size={10} className="q-arrow" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

