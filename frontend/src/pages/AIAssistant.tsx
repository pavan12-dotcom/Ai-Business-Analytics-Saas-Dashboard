import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { streamAI } from '../services/api'
import { useSpreadsheet } from '../context/SpreadsheetContext'
import { useAuth } from '../context/AuthContext'
import { formatNumber, formatYAxisTick } from '../services/dataCleaner'
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
  CartesianGrid,
  LabelList
} from 'recharts'
import {
  Bot, User, Trash2, Upload, AlertTriangle, FileText, TrendingUp, Layers,
  ArrowRight, Database, Send, Sparkles, AlertCircle, Lock, Loader2
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
                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatYAxisTick} tick={{ fontSize: 9, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '11px', color: 'var(--text)' }} />
            <Area type="monotone" dataKey="revenue" stroke="var(--chart-1)" strokeWidth={2} fillOpacity={1} fill="url(#chatColorRev)" />
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
            <YAxis tickFormatter={formatYAxisTick} tick={{ fontSize: 9, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '11px', color: 'var(--text)' }} />
            <Line type="monotone" dataKey="churn" stroke="var(--chart-6)" strokeWidth={2} activeDot={{ r: 5 }} dot={{ r: 3 }} />
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
            <XAxis type="number" tickFormatter={formatYAxisTick} tick={{ fontSize: 9, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'var(--muted)' }} axisLine={false} tickLine={false} width={75} />
            <Tooltip contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '11px', color: 'var(--text)' }} />
            <Bar dataKey="mrr" fill="var(--chart-1)" radius={[0, 4, 4, 0]} barSize={10}>
              <LabelList position="right" formatter={(v: any) => formatNumber(Number(v), 'currency', true)} style={{ fill: 'var(--text-muted)', fontSize: 9, fontWeight: 500 }} />
            </Bar>
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
      data = (Object.entries(planGroups) as [string, number][]).map(([name, value]) => ({ name, value }))
    }
    const COLORS = ['var(--chart-1)', 'var(--chart-5)', 'var(--chart-6)', 'var(--chart-8)']
    return (
      <div className="chat-chart-card">
        <div className="chat-chart-title">Revenue Share by Plan Tier</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '110px', height: '110px', flexShrink: 0, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
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
          </div>
          <div className="chat-chart-legend" style={{ flex: 1 }}>
            {data.map((entry, index) => (
              <div key={entry.name} className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', marginBottom: '4px' }}>
                <span className="legend-dot" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span style={{ color: 'var(--text2)', fontWeight: 500 }}>{entry.name}:</span>
                <span style={{ color: 'var(--muted)' }}>{formatNumber(entry.value, true)}</span>
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
            <YAxis tickFormatter={formatYAxisTick} tick={{ fontSize: 9, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '11px', color: 'var(--text)' }} />
            <Bar dataKey="users" fill="var(--chart-5)" radius={[3, 3, 0, 0]}>
              <LabelList position="top" formatter={(v: any) => formatNumber(Number(v), false, true)} style={{ fill: 'var(--text-muted)', fontSize: 9, fontWeight: 500 }} />
            </Bar>
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
    hasData,
    analytics,
    datasetName
  } = useSpreadsheet()
  const { isLocked, refreshSubscription, isGuest, guestQueryCount, incrementGuestQueryCount, setShowSignupModal, isGuestTrialExhausted } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'spreadsheet' | 'document'>('spreadsheet')

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      text: 'Hi! I\'m your AI Analytics assistant. Ask me anything about your data, or upload a dataset (CSV, XLSX, JSON) to analyze your own numbers.'
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
      const introText = hasData
        ? `Hi! I can analyze your ${analytics.datasetType} data. Ask me anything about ${analytics.entityName}s, ${analytics.valueMetricName}, or categories in this dataset.`
        : 'Hi! I\'m your AI Analytics assistant. Ask me anything — I\'ll answer using demo business data. Upload your own dataset for personalized insights.'
      setMessages([{ role: 'ai', text: introText }])
    } else {
      if (activeDocument) {
        setMessages([{
          role: 'ai',
          text: `Hi! I'm ready to answer questions about "${activeDocument.filename}". Ask me anything about its contents.`
        }])
      } else {
        setMessages([{
          role: 'ai',
          text: 'Upload a PDF or text document, then ask me questions about its content.'
        }])
      }
    }
  }, [mode, activeDocument, hasData, analytics.datasetType, analytics.entityName, analytics.valueMetricName])

  const abortRef = useRef<AbortController | null>(null)

  // Cleanup stream on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  const send = useCallback(async (q?: string, overrideMode?: 'spreadsheet' | 'document') => {
    const question = (q ?? input).trim()
    if (!question || loading || messages.some(m => m.isStreaming)) return

    if (isGuest && isGuestTrialExhausted()) {
      setShowSignupModal(true)
      return
    }

    setInput('')
    const ts = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    setMessages(prev => [...prev, { role: 'user', text: question, ts }])
    setLoading(true)

    // Add placeholder AI message that will be filled by stream
    setMessages(prev => [...prev, { role: 'ai', text: '', ts, isStreaming: true, chartType: null }])

    const activeMode = overrideMode || mode
    let accumulated = ''

    const controller = new AbortController()
    abortRef.current = controller

    await streamAI(
      question,
      activeMode,
      // onChunk — append each token
      (chunk: string) => {
        accumulated += chunk
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last?.role === 'ai' && last.isStreaming) last.text = accumulated
          return [...updated]
        })
      },
      // onDone
      (engName: string, isDemo: boolean) => {
        const chart = detectChartType(question, accumulated)
        setDemoMode(isDemo)
        setEngine(engName)
        setLoading(false)
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last?.role === 'ai') {
            last.isStreaming = false
            last.chartType = chart
          }
          return [...updated]
        })
        if (isGuest) {
          // Guest: increment unified demo_used counter
          incrementGuestQueryCount()
        } else {
          // Authenticated: backend already incremented DB count; just refresh UI
          refreshSubscription()
        }
      },
      // onError
      (errMsg: string) => {
        setLoading(false)
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last?.role === 'ai' && last.isStreaming) {
            last.isStreaming = false
            last.text = `Error: ${errMsg}`
          }
          return [...updated]
        })
      },
      controller.signal
    )
  }, [input, loading, messages, mode, isGuest, isGuestTrialExhausted, setShowSignupModal, incrementGuestQueryCount, refreshSubscription])

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
    if (isGuest && guestQueryCount >= 2) {
      setShowSignupModal(true)
      return
    }
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
    if (isGuest && guestQueryCount >= 2) {
      setShowSignupModal(true)
      return
    }
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

  const isStreamingActive = messages.some(m => m.isStreaming)

  // Context properties — never lock spreadsheet mode, AI works with fallback context
  const isSpreadsheetLocked = false
  const hasSheet = hasData
  const sheetFilename = hasData ? (activeSheet?.filename || datasetName || 'Active Dataset') : 'Demo Context'

  // Computed data context values for Insights
  const monthlyMetrics = hasData ? analytics.monthly : []
  const customerList = hasData ? analytics.customers : []
  const kpis = hasData ? analytics.kpis : []
  const sheetRows = hasData ? (activeSheet?.rows?.length || customerList.length || 0) : 0

  const currentSuggestions = mode === 'spreadsheet'
    ? (hasData ? [
        `Show me top 5 ${analytics.entityName.toLowerCase()}s by ${analytics.valueMetricName.toLowerCase()}`,
        `What's our primary trend this period?`,
        `Compare monthly ${analytics.valueMetricName.toLowerCase()} growth`,
        `Which category generates the most ${analytics.valueMetricName.toLowerCase()}?`,
        `How many active ${analytics.entityName.toLowerCase()}s do we have?`
      ] : [
        'Show me top 5 entries by metric value',
        "What's the overall trend this period?",
        'Compare growth month over month',
        'Which category has the highest count?',
        'How many active records do we have?'
      ])
    : DOC_SUGGESTIONS

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
        {isGuest ? (
          <div className="demo-pill" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            <Sparkles size={12} style={{ marginRight: 4 }} />
            Demo Session: {Math.max(0, 2 - guestQueryCount)} Queries Left
          </div>
        ) : demoMode && (
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
          className={`ai-chat-panel ${isDragging ? 'dragging' : ''} ${isLocked || isSpreadsheetLocked ? 'premium-locked-container' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isLocked && (
            <div className="premium-blur-overlay" style={{ zIndex: 50 }}>
              <div className="lock-icon-wrap" style={{ width: 54, height: 54, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lock size={20} style={{ color: 'var(--accent)' }} />
              </div>
              <h5 className="lock-title">AI Assistant Locked</h5>
              <p className="lock-desc">Your free trial has ended. Upgrade to Premium to chat with spreadsheets, documents, and generate predictive charts.</p>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/app/billing')}>Upgrade Now</button>
            </div>
          )}
          {/* Soft upload suggestion banner — shown when no dataset, but AI still works */}
          {mode === 'spreadsheet' && !hasData && !isLocked && (
            <div style={{
              margin: '8px 16px 0',
              padding: '10px 14px',
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.25)',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 12,
              color: 'var(--accent)'
            }}>
              <Database size={14} />
              <span style={{ flex: 1 }}>Using demo context. <strong>Upload a dataset</strong> to analyze your own data.</span>
              <button
                className="btn btn-primary btn-sm"
                style={{ fontSize: 11, padding: '4px 12px' }}
                onClick={() => navigate('/app')}
              >
                Upload
              </button>
            </div>
          )}
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
              <div className="ai-messages" style={isLocked || isSpreadsheetLocked ? { filter: 'blur(4px)', pointerEvents: 'none' } : undefined}>
                {messages.map((m, i) => (
                  <div key={i} className={`ai-bubble ${m.role}`}>
                    <div className="bubble-icon-wrap">
                      {m.role === 'ai' ? <Bot size={14} /> : <User size={14} />}
                    </div>
                    <div className="bubble-body">
                      <div className="bubble-text" style={m.text.startsWith('Error:') ? { display: 'flex', alignItems: 'center', gap: 6, color: 'var(--red)' } : undefined}>
                        {m.text.startsWith('Error:') ? (
                          <>
                            <AlertCircle size={14} style={{ flexShrink: 0 }} />
                            <span>{m.text.substring(6)}</span>
                          </>
                        ) : m.text}
                        {m.isStreaming && <span className="streaming-cursor" />}
                      </div>

                      {/* Embedded visualization interception */}
                      {m.chartType && !m.isStreaming && (
                        <ChatChart
                          type={m.chartType as any}
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
              <div className="ai-suggestions-row" style={isLocked || isSpreadsheetLocked ? { pointerEvents: 'none', opacity: 0.5 } : undefined}>
                {currentSuggestions.slice(0, 3).map(s => (
                  <button
                    key={s}
                    className="ai-sug-btn"
                    onClick={() => send(s)}
                    disabled={loading || isStreamingActive || isLocked || isSpreadsheetLocked}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Chat Input bar */}
              <div className="ai-input-bar" style={isLocked || isSpreadsheetLocked ? { opacity: 0.7 } : undefined}>
                <input
                  className="ai-input-field"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                  placeholder={
                    isLocked
                      ? 'AI Assistant locked. Upgrade to continue...'
                      : isSpreadsheetLocked
                      ? 'Upload a dataset first to generate AI insights.'
                      : mode === 'spreadsheet'
                      ? 'Ask about spreadsheet data (e.g. "show revenue growth")...'
                      : 'Ask about document content...'
                  }
                  disabled={loading || isStreamingActive || isLocked || isSpreadsheetLocked}
                />
                <button
                  className="btn btn-primary ai-send-btn"
                  onClick={() => send()}
                  disabled={loading || isStreamingActive || !input.trim() || isLocked || isSpreadsheetLocked}
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
              <span className="context-filename" title={sheetFilename} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {mode === 'spreadsheet' ? (
                  <>
                    <Database size={13} style={{ color: 'var(--accent)' }} /> {sheetFilename}
                  </>
                ) : (
                  <>
                    <FileText size={13} style={{ color: 'var(--accent)' }} /> {activeDocument?.filename || 'No document'}
                  </>
                )}
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

          <div className="context-title" style={{ marginTop: '16px' }}>AI Copilot Tasks</div>
          <div className="copilot-tasks-container">
            {[
              {
                id: 'report',
                title: 'Generate Executive Report',
                desc: 'Full MRR growth summary & chart',
                query: 'Generate an executive report showing MRR growth and revenue summary.',
                icon: <FileText size={14} />
              },
              {
                id: 'forecast',
                title: 'Predict Next Month\'s Revenue',
                desc: 'Future trend forecast with confidence intervals',
                query: 'Predict next month\'s revenue based on current trends.',
                icon: <TrendingUp size={14} />
              },
              {
                id: 'churn',
                title: 'Analyze Customer Churn',
                desc: 'Details accounts at risk & churn curve',
                query: 'Analyze customer churn rate and risk profile.',
                icon: <AlertTriangle size={14} />
              },
              {
                id: 'pricing',
                title: 'Recommend Pricing Changes',
                desc: 'Value-tier updates & plan distribution',
                query: 'Recommend pricing changes based on current plan share.',
                icon: <Layers size={14} />
              }
            ].map(task => (
              <button
                key={task.id}
                className="copilot-task-card glass-card"
                onClick={() => {
                  if (isLocked || isSpreadsheetLocked) return
                  setMode('spreadsheet')
                  send(task.query)
                }}
                disabled={loading || isStreamingActive || isLocked || isSpreadsheetLocked}
                style={isLocked || isSpreadsheetLocked ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
              >
                <div className="task-card-icon">{task.icon}</div>
                <div className="task-card-details">
                  <div className="task-card-title">{task.title}</div>
                  <div className="task-card-desc">{task.desc}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="context-title" style={{ marginTop: '16px' }}>Auto Insights</div>
          <div className="insights-container">
            {!hasData ? (
              <div className="insight-card info" style={{ textAlign: 'center', padding: '24px 16px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
                  Upload a dataset to generate AI-powered analytics.
                </p>
              </div>
            ) : (
              <>
                {analytics.aiInsights.keyFindings.slice(0, 1).map((f, idx) => (
                  <div key={idx} className="insight-card success">
                    <div className="insight-top">
                      <span className="insight-badge success">Key Finding</span>
                      <TrendingUp size={14} style={{ color: 'var(--green)' }} />
                    </div>
                    <p style={{ fontSize: '12.5px', lineHeight: 1.4, margin: 0 }}>{f}</p>
                  </div>
                ))}

                {analytics.aiInsights.anomalies.slice(0, 1).map((a, idx) => (
                  <div key={idx} className="insight-card warning">
                    <div className="insight-top">
                      <span className="insight-badge warning">Variance / Alert</span>
                      <AlertTriangle size={14} style={{ color: 'var(--amber)' }} />
                    </div>
                    <p style={{ fontSize: '12.5px', lineHeight: 1.4, margin: 0 }}>{a}</p>
                  </div>
                ))}

                {analytics.aiInsights.trends.slice(0, 1).map((t, idx) => (
                  <div key={idx} className="insight-card info">
                    <div className="insight-top">
                      <span className="insight-badge active">Trend Detected</span>
                      <Layers size={14} style={{ color: 'var(--accent)' }} />
                    </div>
                    <p style={{ fontSize: '12.5px', lineHeight: 1.4, margin: 0 }}>{t}</p>
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="context-title" style={{ marginTop: '16px' }}>Sample Queries</div>
          <div className="sample-questions">
            {currentSuggestions.map(s => (
              <button
                key={s}
                className="sample-q"
                onClick={() => !(isLocked || isSpreadsheetLocked) && send(s)}
                disabled={loading || isStreamingActive || isLocked || isSpreadsheetLocked}
                style={isLocked || isSpreadsheetLocked ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
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

