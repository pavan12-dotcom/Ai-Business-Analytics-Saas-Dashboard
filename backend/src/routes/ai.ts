import { Router, Request, Response } from 'express'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { requireAuth, getSupabase } from '../middleware/auth'
import { memorySpreadsheets, memoryDocuments, addAuditLog, mockUserPlans, memoryAuditLogs, getOrInitSubscription, incrementSubscriptionQuestions } from './data'

const router = Router()
const supabase = getSupabase()

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

router.post('/query', requireAuth, async (req: Request, res: Response) => {
  const { question, mode } = req.body
  if (!question) return res.status(400).json({ error: 'question is required' })

  const userId = (req as any).userId
  const userName = (req as any).user?.user_metadata?.name || (req as any).user?.email || 'Demo User'

  // Check limits before proceeding
  const guestId = (req as any).guestId
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

  // 1. Gather dynamic database context based on mode
  let dbContext = STATIC_DB_CONTEXT

  if (mode === 'document') {
    let docFilename = ''
    let docText = ''
    
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('filename, text')
          .eq('user_id', (req as any).userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
          
        if (!error && data) {
          docFilename = data.filename
          docText = data.text
        }
      } catch (err) {}
    }
    
    if (!docText) {
      const memoryDoc = memoryDocuments.get((req as any).userId)
      if (memoryDoc) {
        docFilename = memoryDoc.filename
        docText = memoryDoc.text
      }
    }
    
    if (docText) {
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
    // Spreadsheet Data Mode
    if (supabase) {
    try {
      let spreadsheet = null
      let sheetError = null
      
      try {
        const { data, error } = await supabase
          .from('spreadsheets')
          .select('filename, columns_metadata, rows')
          .eq('user_id', (req as any).userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        spreadsheet = data
        sheetError = error
      } catch (err) {
        sheetError = err
      }

      if (sheetError || !spreadsheet) {
        spreadsheet = memorySpreadsheets.get((req as any).userId)
      }

      if (spreadsheet) {
        const metadata = spreadsheet.columns_metadata
        const rows = spreadsheet.rows || []
        const rowCount = rows.length
        
        const summary: Record<string, any> = {
          filename: spreadsheet.filename,
          totalRows: rowCount,
        }

        Object.entries(metadata).forEach(([header, type]) => {
          if (type === 'metric') {
            const vals = rows.map((r: any) => Number(r[header])).filter((v: number) => !isNaN(v))
            if (vals.length > 0) {
              const sum = vals.reduce((s: number, v: number) => s + v, 0)
              summary[`Sum of ${header}`] = sum
              summary[`Avg of ${header}`] = (sum / vals.length).toFixed(2)
              summary[`Max of ${header}`] = vals.reduce((a: number, b: number) => Math.max(a, b), -Infinity)


            }
          } else if (type === 'category') {
            const counts: Record<string, number> = {}
            rows.forEach((r: any) => {
              const val = r[header] || 'None'
              counts[val] = (counts[val] || 0) + 1
            })
            summary[`Distribution of ${header}`] = counts
          }
        })

        dbContext = `
You are an AI assistant embedded in InsightAI, a SaaS business analytics platform.
Answer questions based only on this user's uploaded spreadsheet:
Filename: ${summary.filename}
Metadata: ${JSON.stringify(summary, null, 2)}

Sample Data (First 50 Rows):
${JSON.stringify(rows.slice(0, 50), null, 2)}
`.trim()
      } else {
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
      }
    } catch (err) {
      console.error('Error fetching live data for AI assistant context, falling back to static data:', err)
    }
  }
  }

  const geminiKey = (req as any).user?.user_metadata?.gemini_api_key || process.env.GEMINI_API_KEY

  // 2. Route request to appropriate LLM engine or fallback
  if (geminiKey) {
    const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash']
    let lastError: any = null
    
    for (const modelName of models) {
      try {
        console.log(`Routing AI request to Google Gemini (${modelName})...`)
        const genAI = new GoogleGenerativeAI(geminiKey)
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: dbContext,
        })
        const result = await model.generateContent(question)
        const answer = result.response.text()
        
        // Log successful query
        await addAuditLog(userId, userName, `AI Assistant Query: "${question.substring(0, 60)}${question.length > 60 ? '...' : ''}"`)
        await incrementSubscriptionQuestions(userId, guestId)

        return res.json({ answer, demo: false, engine: `gemini (${modelName})` })
      } catch (err: any) {
        console.error(`Gemini API Error with ${modelName}:`, err.message)
        lastError = err
      }
    }
    console.warn('Google Gemini API failed or was rate-limited. Falling back to canned responses...')
  }

  // 3. Fallback: Smart Canned responses using query string matching
  console.log('Falling back to Demo Mode canned responses.')
  const q = question.toLowerCase()
  let answer = `Based on your current data: Total revenue is $84,320/month (+12.4%), 2,841 active users, churn at 3.2%. Your Pro plan leads at 60% of revenue.`

  if (q.includes('top') && q.includes('customer'))
    answer = 'Your top customers by MRR are: Acme Corp ($4,200), Dataform Inc ($3,200), TechFlow ($1,800), Cresent AI ($980), and Bright Labs ($890). Together they account for $11,180/month, about 13% of total revenue.'
  else if (q.includes('churn'))
    answer = 'Your churn rate is 3.2%, down from 3.6% last month — a healthy 0.4% improvement. Continuing this trend would save approximately $2,700 in monthly recurring revenue.'
  else if (q.includes('plan') || q.includes('distribution'))
    answer = 'Pro plan generates 60% of revenue, Team plan 30%, and Enterprise 10%. Your best growth lever is upselling Team customers to Enterprise.'
  else if (q.includes('revenue') || q.includes('month'))
    answer = 'Revenue grew from $52k in January to $84k in June — a 62% increase in 6 months. June was your strongest month on record with $84,320.'

  // Log successful query
  await addAuditLog(userId, userName, `AI Assistant Query: "${question.substring(0, 60)}${question.length > 60 ? '...' : ''}"`)
  await incrementSubscriptionQuestions(userId, guestId)

  return res.json({ answer, demo: true, engine: 'fallback' })
})

// ── Streaming SSE endpoint ─────────────────────────────────────
// POST /api/ai/stream
// Streams Gemini response tokens as Server-Sent Events.
// Each event: data: {"chunk": "..."}\n\n
// Final event: data: [DONE]\n\n
router.post('/stream', requireAuth, async (req: Request, res: Response) => {
  const { question, mode } = req.body
  if (!question) {
    res.status(400).json({ error: 'question is required' })
    return
  }

  const userId = (req as any).userId
  const userName = (req as any).user?.user_metadata?.name || (req as any).user?.email || 'Demo User'

  const guestId = (req as any).guestId
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

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // disable nginx buffering
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

  // Handle client disconnect
  req.on('close', () => { res.end() })

  // Build same dbContext as /query endpoint
  let dbContext = `
You are an AI assistant embedded in InsightAI, a SaaS business analytics platform.
Answer questions concisely (2-3 sentences) based only on this data:

REVENUE: Total $84,320/mo (+12.4%); Jan $52k, Feb $58k, Mar $55k, Apr $67k, May $74k, Jun $84k
NEW MRR: Jan $38k, Feb $47k, Mar $44k, Apr $56k, May $61k, Jun $72k
USERS: 2,841 active (+8.1%), Churn 3.2% (↓ from 3.6%), ARPU $29.68
PLANS: Pro 60%, Team 30%, Enterprise 10%
TOP CUSTOMERS: Acme Corp Enterprise $4,200 Active | TechFlow Team $1,800 Active | Bright Labs Pro $890 Active | Nova Inc Team $720 Pending | Apex Systems Pro $290 Churned
`.trim()

  // Enrich context from DB
  const supabase = getSupabase()
  try {
    if (supabase) {
      if (mode === 'document') {
        const { data } = await supabase
          .from('documents')
          .select('filename, text')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (data?.text) {
          dbContext = `You are an AI assistant. Answer questions based only on this document:\nFilename: ${data.filename}\n\n${data.text}`
        }
      } else {
        const { data: sheet } = await supabase
          .from('spreadsheets')
          .select('filename, columns_metadata, rows')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (sheet) {
          dbContext = `You are an AI assistant. Answer questions based on this spreadsheet:\nFilename: ${sheet.filename}\nSample rows: ${JSON.stringify((sheet.rows as any[]).slice(0, 30))}`
        } else {
          const [kpisRes, metricsRes, customersRes] = await Promise.all([
            supabase.from('kpis').select('label, value, change'),
            supabase.from('monthly_metrics').select('month, revenue, mrr').order('sort_order'),
            supabase.from('customers').select('name, plan, mrr, status').order('mrr', { ascending: false }),
          ])
          if (!kpisRes.error && !metricsRes.error && !customersRes.error) {
            const kpiStr = (kpisRes.data || []).map((k: any) => `${k.label}: ${k.value} (${k.change})`).join(', ')
            const revStr = (metricsRes.data || []).map((m: any) => `${m.month} $${(Number(m.revenue)/1000).toFixed(0)}k`).join(', ')
            const custStr = (customersRes.data || []).slice(0, 8).map((c: any) => `${c.name} (${c.plan}, $${c.mrr}/mo, ${c.status})`).join(' | ')
            dbContext = `You are an AI assistant in InsightAI.\nKPIs: ${kpiStr}\nRevenue trends: ${revStr}\nTop customers: ${custStr}`
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Stream] Context fetch failed, using static context:', err)
  }

  const geminiKey = (req as any).user?.user_metadata?.gemini_api_key || process.env.GEMINI_API_KEY

  if (geminiKey) {
    const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash']
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
    console.warn('[Stream] All Gemini models failed, using fallback')
  }

  // Fallback: stream canned response word by word
  const q = question.toLowerCase()
  let answer = `Based on your current data: Total revenue is $84,320/month (+12.4%), 2,841 active users, churn at 3.2%. Your Pro plan leads at 60% of revenue.`
  if (q.includes('top') && q.includes('customer'))
    answer = 'Your top customers by MRR are: Acme Corp ($4,200), Dataform Inc ($3,200), TechFlow ($1,800), Cresent AI ($980), and Bright Labs ($890). Together they account for $11,180/month.'
  else if (q.includes('churn'))
    answer = 'Your churn rate is 3.2%, down from 3.6% last month — a healthy 0.4% improvement. Continuing this trend would save approximately $2,700 in monthly recurring revenue.'
  else if (q.includes('plan') || q.includes('distribution'))
    answer = 'Pro plan generates 60% of revenue, Team plan 30%, and Enterprise 10%. Your best growth lever is upselling Team customers to Enterprise.'
  else if (q.includes('revenue') || q.includes('month'))
    answer = 'Revenue grew from $52k in January to $84k in June — a 62% increase in 6 months. June was your strongest month on record with $84,320.'

  sendMeta({ engine: 'fallback', demo: true })

  const words = answer.split(' ')
  for (const word of words) {
    sendChunk(word + ' ')
    await new Promise(r => setTimeout(r, 30))
  }

  await addAuditLog(userId, userName, `AI Assistant Query: "${question.substring(0, 60)}${question.length > 60 ? '...' : ''}"`)
  await incrementSubscriptionQuestions(userId, guestId)
  sendDone()
})

export default router

