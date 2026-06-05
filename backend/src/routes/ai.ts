import { Router, Request, Response } from 'express'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { requireAuth, getSupabase } from '../middleware/auth'
import { memorySpreadsheets, memoryDocuments, addAuditLog, mockUserPlans, memoryAuditLogs } from './data'

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

router.post('/query', requireAuth, async (req: Request, res: Response) => {
  const { question, mode } = req.body
  if (!question) return res.status(400).json({ error: 'question is required' })

  const userId = (req as any).userId
  const userName = (req as any).user?.user_metadata?.name || (req as any).user?.email || 'Demo User'

  // Check limits before proceeding
  let plan = 'Free'
  let aiQueryCount = 0
  const supabase = getSupabase()

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('plan')
        .eq('id', userId)
        .maybeSingle()
      
      if (!error && data) {
        plan = data.plan
      }
    } catch (err) {}

    try {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { count, error } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .like('action', 'AI Assistant Query%')
        .gte('created_at', startOfMonth.toISOString())

      if (!error && count !== null) {
        aiQueryCount = count
      }
    } catch (err) {}
  } else {
    const logs = memoryAuditLogs.get(userId) || []
    aiQueryCount = logs.filter(l => l.action.startsWith('AI Assistant Query')).length
  }

  // Check if upgraded in local memory
  const mockUpgrade = mockUserPlans.get(userId)
  if (mockUpgrade) {
    plan = mockUpgrade.plan
  }

  // Determine limits
  let aiQueryLimit = 100
  if (plan === 'Pro') aiQueryLimit = 1000
  if (plan === 'Enterprise') aiQueryLimit = 10000

  if (aiQueryCount >= aiQueryLimit) {
    return res.status(403).json({
      error: 'limit_exceeded',
      message: `You have exceeded your plan's monthly limit of ${aiQueryLimit} AI queries. Please upgrade to Pro or Enterprise to continue.`,
      aiQueryCount,
      aiQueryLimit
    })
  }

  // 1. Gather dynamic database context based on mode
  let dbContext = STATIC_DB_CONTEXT
  const supabase = getSupabase()

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

  return res.json({ answer, demo: true, engine: 'fallback' })
})

export default router
