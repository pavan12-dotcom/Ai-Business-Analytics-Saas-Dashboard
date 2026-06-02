import { Router, Request, Response } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { requireAuth, getSupabase } from '../middleware/auth'

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
  const { question } = req.body
  if (!question) return res.status(400).json({ error: 'question is required' })

  // 1. Gather dynamic database context from Supabase
  let dbContext = STATIC_DB_CONTEXT
  const supabase = getSupabase()

  if (supabase) {
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
    } catch (err) {
      console.error('Error fetching live data for AI assistant context, falling back to static data:', err)
    }
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY

  // 2. Route request to appropriate LLM engine or fallback
  if (geminiKey) {
    try {
      console.log('Routing AI request to Google Gemini (2.5 Flash)...')
      const genAI = new GoogleGenerativeAI(geminiKey)
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: dbContext,
      })
      const result = await model.generateContent(question)
      const answer = result.response.text()
      return res.json({ answer, demo: false, engine: 'gemini' })
    } catch (err: any) {
      console.error('Gemini API Error:', err.message)
      return res.status(500).json({ error: `Gemini API Error: ${err.message}` })
    }
  } else if (anthropicKey) {
    try {
      console.log('Routing AI request to Anthropic (Claude 3.5 Sonnet)...')
      const client = new Anthropic({ apiKey: anthropicKey })
      const message = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 512,
        system: dbContext,
        messages: [{ role: 'user', content: question }],
      })
      const answer = (message.content[0] as any).text
      return res.json({ answer, demo: false, engine: 'anthropic' })
    } catch (err: any) {
      console.error('Anthropic API Error:', err.message)
      return res.status(500).json({ error: `Anthropic API Error: ${err.message}` })
    }
  }

  // 3. Fallback: Smart Canned responses using query string matching
  console.log('No API Keys configured. Falling back to Demo Mode canned responses.')
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

  return res.json({ answer, demo: true, engine: 'fallback' })
})

export default router
