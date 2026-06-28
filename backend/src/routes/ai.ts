import { Router, Request, Response } from 'express'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { requireAuth, getSupabase } from '../middleware/auth'
import { memorySpreadsheets, memoryDocuments, addAuditLog, mockUserPlans, memoryAuditLogs, getOrInitSubscription, incrementSubscriptionQuestions } from './data'

const router = Router()

// Default static fallback context
const STATIC_DB_CONTEXT = `
You are an AI assistant embedded in InsightAI, a SaaS business analytics platform.
Answer questions concisely (2-3 sentences) based only on this data:

REVENUE: Total $84,320/mo (+12.4%); Jan $52k, Feb $58k, Mar $55k, Apr $67k, May $74k, Jun $84k
NEW MRR: Jan $38k, Feb $47k, Mar $44k, Apr $56k, May $61k, Jun $72k
USERS: 2,841 active (+8.1%), Churn 3.2% (↓ from 3.6%), ARPU $29.68
PLANS: Pro 60%, Team 30%, Enterprise 10%
TOP CUSTOMERS: Acme Corp Enterprise $4,200 Active | TechFlow Team $1,800 Active | Bright Labs Pro $890 Active | Nova Inc Team $720 Pending | Apex Systems Pro $290 Churned
`.trim()

// Helper to resolve active dataset context for both /query and /stream
async function getActiveContext(userId: string, guestId: string | undefined, mode: string) {
  const supabase = getSupabase()
  let dbContext = STATIC_DB_CONTEXT
  let activeSheet: any = null
  let activeDoc: any = null

  if (mode === 'document') {
    let docFilename = ''
    let docText = ''
    
    if (supabase) {
      try {
        const { data } = await supabase
          .from('documents')
          .select('filename, text')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (data?.text) {
          docFilename = data.filename
          docText = data.text
        }
      } catch (err) {}
    }
    
    if (!docText) {
      const memoryDoc = memoryDocuments.get(userId) || (guestId ? memoryDocuments.get(guestId) : null)
      if (memoryDoc) {
        docFilename = memoryDoc.filename
        docText = memoryDoc.text
      }
    }
    
    if (docText) {
      activeDoc = { filename: docFilename, text: docText }
      dbContext = `
You are an AI assistant embedded in InsightAI, a SaaS business analytics platform.
Answer the user's questions based only on this user's uploaded document:
Filename: ${docFilename}

Document Contents:
${docText}
`.trim()
    } else {
      dbContext = `
You are an AI assistant embedded in InsightAI.
The user wants to chat about an uploaded document, but no active document context is available.
Please ask them to upload a PDF or text document first.
`.trim()
    }
  } else {
    // Spreadsheet Mode
    if (supabase) {
      try {
        const { data } = await supabase
          .from('spreadsheets')
          .select('filename, columns_metadata, rows')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (data && data.rows?.length > 0) {
          activeSheet = data
        }
      } catch (err) {}
    }

    if (!activeSheet) {
      activeSheet = memorySpreadsheets.get(userId) || (guestId ? memorySpreadsheets.get(guestId) : null)
    }

    if (activeSheet && activeSheet.rows?.length > 0) {
      const metadata = activeSheet.columns_metadata || {}
      const rows = activeSheet.rows || []
      const rowCount = rows.length
      
      const summary: Record<string, any> = {
        filename: activeSheet.filename,
        totalRows: rowCount,
      }

      Object.entries(metadata).forEach(([header, type]) => {
        if (type === 'metric') {
          const vals = rows.map((r: any) => Number(r[header])).filter((v: number) => !isNaN(v))
          if (vals.length > 0) {
            const sum = vals.reduce((s: number, v: number) => s + v, 0)
            summary[`Sum of ${header}`] = Math.round(sum)
            summary[`Avg of ${header}`] = (sum / vals.length).toFixed(2)
            summary[`Max of ${header}`] = Math.max(...vals)
          }
        } else if (type === 'category') {
          const counts: Record<string, number> = {}
          rows.forEach((r: any) => {
            const val = String(r[header] ?? 'None')
            if (val && val !== 'undefined') counts[val] = (counts[val] || 0) + 1
          })
          summary[`Distribution of ${header}`] = counts
        }
      })

      dbContext = `
You are an expert Data Analyst AI assistant embedded in InsightAI.
Your job is to provide accurate, mathematically precise answers based on the user's dataset.
If a question asks for sums, averages, or distributions, use the pre-calculated aggregate statistics provided in the Metadata below.
Do not hallucinate facts or numbers.

Uploaded Dataset: ${activeSheet.filename}
Calculated Metrics & Aggregate Metadata:
${JSON.stringify(summary, null, 2)}

Sample Data Rows:
${JSON.stringify(rows.slice(0, 100), null, 2)}
`.trim()
    } else if (supabase) {
      try {
        const [kpisRes, metricsRes, planRes, customersRes] = await Promise.all([
          supabase.from('kpis').select('label, value, change, up'),
          supabase.from('monthly_metrics').select('month, revenue, mrr').order('sort_order', { ascending: true }),
          supabase.from('plan_distribution').select('plan, pct'),
          supabase.from('customers').select('name, plan, mrr, status').order('mrr', { ascending: false })
        ])

        if (!kpisRes.error && !metricsRes.error && !planRes.error && !customersRes.error) {
          const kpis = kpisRes.data || []
          const metrics = metricsRes.data || []
          const plans = planRes.data || []
          const customers = customersRes.data || []

          const kpiStr = kpis.map((k: any) => `${k.label}: ${k.value} (${k.change})`).join(', ')
          const revTrend = metrics.map((m: any) => `${m.month} $${(Number(m.revenue) / 1000).toFixed(0)}k`).join(', ')
          const mrrTrend = metrics.map((m: any) => `${m.month} $${(Number(m.mrr) / 1000).toFixed(0)}k`).join(', ')
          const planStr = plans.map((p: any) => `${p.plan} ${p.pct}%`).join(', ')
          const topCustStr = customers.slice(0, 8).map((c: any) => `${c.name} (${c.plan} plan, $${c.mrr}/mo, ${c.status})`).join(' | ')

          dbContext = `
You are an AI assistant embedded in InsightAI, a SaaS business analytics platform.
Answer questions concisely (2-3 sentences) based only on this live database data:

REVENUE & METRICS: ${kpiStr}
REVENUE TRENDS: ${revTrend}
NEW MRR TRENDS: ${mrrTrend}
PLANS: ${planStr}
TOP CUSTOMERS: ${topCustStr}
`.trim()
        }
      } catch (err) {}
    }
  }

  return { dbContext, activeSheet, activeDoc }
}

// Smart dynamic fallback generator when Gemini API is offline or rate-limited
function generateSmartFallbackAnswer(question: string, activeSheet: any, activeDoc: any): string {
  const q = question.toLowerCase()

  if (activeDoc) {
    const textSnippet = activeDoc.text.slice(0, 300).replace(/\s+/g, ' ')
    return `Based on "${activeDoc.filename}": The document covers key operational sections (${activeDoc.text.length} characters parsed). Summary overview: "${textSnippet}..."`
  }

  if (activeSheet && activeSheet.rows?.length > 0) {
    const rows = activeSheet.rows
    const meta = activeSheet.columns_metadata || {}
    const cols = Object.keys(rows[0] || {})
    const metricCols = cols.filter(c => meta[c] === 'metric')
    const catCols = cols.filter(c => meta[c] === 'category')
    const primaryMetric = metricCols[0] || cols.find(c => /amount|revenue|cost|budget|price|sales|val|mrr|total/i.test(c)) || ''
    const primaryCat = catCols[0] || cols.find(c => /category|type|department|segment|region|status|plan|group/i.test(c)) || ''

    if (q.includes('top') || q.includes('highest') || q.includes('best') || q.includes('leading') || q.includes('max')) {
      if (primaryMetric) {
        const sorted = [...rows].sort((a, b) => (Number(b[primaryMetric]) || 0) - (Number(a[primaryMetric]) || 0)).slice(0, 5)
        const nameCol = cols.find(c => /name|title|id|item|product|customer|user|client|page/i.test(c)) || cols[0]
        const topList = sorted.map(r => `${r[nameCol] || 'Item'} (${primaryMetric}: ${Number(r[primaryMetric]).toLocaleString()})`).join(', ')
        return `Top records by ${primaryMetric} in "${activeSheet.filename}": ${topList}.`
      }
    }

    if (q.includes('total') || q.includes('sum') || q.includes('revenue') || q.includes('amount') || q.includes('budget') || q.includes('overall') || q.includes('summary')) {
      if (primaryMetric) {
        const total = rows.reduce((s: number, r: any) => s + (Number(r[primaryMetric]) || 0), 0)
        const avg = total / Math.max(rows.length, 1)
        return `In dataset "${activeSheet.filename}" (${rows.length} rows): Total ${primaryMetric} is ${Math.round(total).toLocaleString()} with an average of ${Math.round(avg).toLocaleString()} per entry.`
      }
    }

    if (q.includes('category') || q.includes('breakdown') || q.includes('department') || q.includes('type') || q.includes('share') || q.includes('distribution')) {
      if (primaryCat) {
        const counts: Record<string, number> = {}
        rows.forEach((r: any) => {
          const k = String(r[primaryCat] ?? 'Other')
          if (k && k !== 'undefined') counts[k] = (counts[k] || 0) + 1
        })
        const distStr = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k}: ${v} records (${Math.round((v / rows.length) * 100)}%)`).join(', ')
        return `Breakdown by ${primaryCat} in "${activeSheet.filename}": ${distStr}.`
      }
    }

    // Default dynamic summary for custom sheet
    const primaryMetricVal = primaryMetric ? Math.round(rows.reduce((s: number, r: any) => s + (Number(r[primaryMetric]) || 0), 0)).toLocaleString() : `${rows.length} rows`
    return `Analysis for "${activeSheet.filename}": Analyzed ${rows.length} entries across columns (${cols.slice(0, 4).join(', ')}). ${primaryMetric ? `Aggregate ${primaryMetric} is ${primaryMetricVal}.` : 'Data structure is verified and active.'}`
  }

  // Demo fallbacks with specific variations
  if (q.includes('top') && q.includes('customer'))
    return 'Your top customers by MRR are: Acme Corp ($4,200), Dataform Inc ($3,200), TechFlow ($1,800), Cresent AI ($980), and Bright Labs ($890). Together they account for $11,180/month.'
  if (q.includes('churn'))
    return 'Your churn rate is 3.2%, down from 3.6% last month — a healthy 0.4% improvement. Continuing this trend saves approximately $2,700 monthly.'
  if (q.includes('plan') || q.includes('distribution'))
    return 'Pro plan generates 60% of revenue, Team plan 30%, and Enterprise 10%. Upselling Team tier accounts offers your strongest expansion opportunity.'
  if (q.includes('revenue') || q.includes('growth') || q.includes('trend') || q.includes('month'))
    return 'Revenue expanded from $52k in January to $84k in June — a 62% semi-annual surge. June achieved peak monthly performance at $84,320.'

  return 'Based on your operational dataset: Monthly revenue stands at $84,320 (+12.4% MoM) with 2,841 active user seats and a strong 60% Pro plan market concentration.'
}

router.post('/query', requireAuth, async (req: Request, res: Response) => {
  const { question, mode } = req.body
  if (!question) return res.status(400).json({ error: 'question is required' })

  const userId = (req as any).userId
  const guestId = (req as any).guestId
  const userName = (req as any).user?.user_metadata?.name || (req as any).user?.email || 'Demo User'

  const sub = await getOrInitSubscription(userId, guestId)

  if (sub.subscription_status === 'trial_exhausted') {
    return res.status(403).json({
      error: 'trial_exhausted',
      message: 'Your free trial has ended. Upgrade to Premium to continue using AI-powered analytics.'
    })
  }
  if (sub.subscription_status === 'expired') {
    return res.status(403).json({
      error: 'expired',
      message: 'Your Premium subscription has expired. Renew your plan to regain access.'
    })
  }

  const { dbContext, activeSheet, activeDoc } = await getActiveContext(userId, guestId, mode)
  const geminiKey = (req as any).user?.user_metadata?.gemini_api_key || process.env.GEMINI_API_KEY

  if (geminiKey) {
    const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash']
    for (const modelName of models) {
      try {
        console.log(`Routing AI query to Google Gemini (${modelName})...`)
        const genAI = new GoogleGenerativeAI(geminiKey)
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: dbContext,
        })
        const result = await model.generateContent(question)
        const answer = result.response.text()
        
        await addAuditLog(userId, userName, `AI Assistant Query: "${question.substring(0, 60)}${question.length > 60 ? '...' : ''}"`)
        await incrementSubscriptionQuestions(userId, guestId)

        return res.json({ answer, demo: false, engine: `gemini (${modelName})` })
      } catch (err: any) {
        console.error(`Gemini API Error with ${modelName}:`, err.message)
      }
    }
  }

  const answer = generateSmartFallbackAnswer(question, activeSheet, activeDoc)
  await addAuditLog(userId, userName, `AI Assistant Query: "${question.substring(0, 60)}${question.length > 60 ? '...' : ''}"`)
  await incrementSubscriptionQuestions(userId, guestId)

  return res.json({ answer, demo: true, engine: 'fallback' })
})

// POST /api/ai/stream
router.post('/stream', requireAuth, async (req: Request, res: Response) => {
  const { question, mode } = req.body
  if (!question) {
    res.status(400).json({ error: 'question is required' })
    return
  }

  const userId = (req as any).userId
  const guestId = (req as any).guestId
  const userName = (req as any).user?.user_metadata?.name || (req as any).user?.email || 'Demo User'

  const sub = await getOrInitSubscription(userId, guestId)

  if (sub.subscription_status === 'trial_exhausted') {
    res.status(403).json({
      error: 'trial_exhausted',
      message: 'Your free trial has ended. Upgrade to Premium to continue using AI-powered analytics.'
    })
    return
  }
  if (sub.subscription_status === 'expired') {
    res.status(403).json({
      error: 'expired',
      message: 'Your Premium subscription has expired. Renew your plan to regain access.'
    })
    return
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const sendChunk = (chunk: string) => {
    res.write(`data: ${JSON.stringify({ chunk })}\n\n`)
  }

  const sendMeta = (meta: Record<string, any>) => {
    res.write(`data: ${JSON.stringify(meta)}\n\n`)
  }

  const sendDone = () => {
    res.write('data: [DONE]\n\n')
    res.end()
  }

  req.on('close', () => { res.end() })

  const { dbContext, activeSheet, activeDoc } = await getActiveContext(userId, guestId, mode)
  const geminiKey = (req as any).user?.user_metadata?.gemini_api_key || process.env.GEMINI_API_KEY

  if (geminiKey) {
    const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash']
    for (const modelName of models) {
      try {
        console.log(`[Stream] Streaming via Google Gemini (${modelName})...`)
        const genAI = new GoogleGenerativeAI(geminiKey)
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: dbContext,
        })

        sendMeta({ engine: `gemini (${modelName})`, demo: false })

        const result = await model.generateContentStream(question)

        for await (const chunk of result.stream) {
          const text = chunk.text()
          if (text) sendChunk(text)
        }

        await addAuditLog(userId, userName, `AI Assistant Query: "${question.substring(0, 60)}${question.length > 60 ? '...' : ''}"`)
        await incrementSubscriptionQuestions(userId, guestId)
        sendDone()
        return
      } catch (err: any) {
        console.error(`[Stream] Gemini ${modelName} error:`, err.message)
      }
    }
  }

  const answer = generateSmartFallbackAnswer(question, activeSheet, activeDoc)
  sendMeta({ engine: 'fallback', demo: true })

  const words = answer.split(' ')
  for (const word of words) {
    sendChunk(word + ' ')
    await new Promise(r => setTimeout(r, 25))
  }

  await addAuditLog(userId, userName, `AI Assistant Query: "${question.substring(0, 60)}${question.length > 60 ? '...' : ''}"`)
  await incrementSubscriptionQuestions(userId, guestId)
  sendDone()
})

export default router
