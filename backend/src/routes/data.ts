import { Router, Request, Response } from 'express'
import { requireAuth, getSupabase } from '../middleware/auth'
import { exec } from 'child_process'
import { promisify } from 'util'
const execAsync = promisify(exec)
import fs from 'fs'
import path from 'path'
import os from 'os'
import { GoogleGenerativeAI } from '@google/generative-ai'

const router = Router()

// Seed data for demo / fallback
const SEED = {
  kpis: {
    revenue: { value: '$84,320', change: '+12.4%', up: true },
    users:   { value: '2,841',   change: '+8.1%',  up: true },
    churn:   { value: '3.2%',    change: '-0.4%',  up: false },
    arpu:    { value: '$29.68',  change: '+4.2%',  up: true },
  },
  monthly: [
    { month: 'Jan', revenue: 52000, mrr: 38000 },
    { month: 'Feb', revenue: 58000, mrr: 47000 },
    { month: 'Mar', revenue: 55000, mrr: 44000 },
    { month: 'Apr', revenue: 67000, mrr: 56000 },
    { month: 'May', revenue: 74000, mrr: 61000 },
    { month: 'Jun', revenue: 84320, mrr: 72000 },
  ],
  customers: [
    { id: '1', name: 'Acme Corp',     plan: 'Enterprise', mrr: 4200, status: 'Active',  email: 'billing@acme.com' },
    { id: '2', name: 'TechFlow',      plan: 'Team',       mrr: 1800, status: 'Active',  email: 'pay@techflow.io' },
    { id: '3', name: 'Bright Labs',   plan: 'Pro',        mrr:  890, status: 'Active',  email: 'admin@brightlabs.co' },
    { id: '4', name: 'Nova Inc',      plan: 'Team',       mrr:  720, status: 'Pending', email: 'nova@novainc.com' },
    { id: '5', name: 'Apex Systems',  plan: 'Pro',        mrr:  290, status: 'Churned', email: 'hi@apex.systems' },
    { id: '6', name: 'SkyBridge',     plan: 'Pro',        mrr:  540, status: 'Active',  email: 'pay@skybridge.io' },
    { id: '7', name: 'Dataform Inc',  plan: 'Enterprise', mrr: 3200, status: 'Active',  email: 'billing@dataform.io' },
    { id: '8', name: 'Cresent AI',    plan: 'Team',       mrr:  980, status: 'Active',  email: 'cresent@cresent.ai' },
  ],
}

router.get('/kpis', requireAuth, async (_req, res) => {
  const supabase = getSupabase()
  if (!supabase) {
    return res.json(SEED.kpis)
  }

  try {
    const [custRes, kpiRes] = await Promise.all([
      supabase.from('customers').select('mrr, status'),
      supabase.from('kpis').select('label, change, up')
    ])

    if (custRes.error || kpiRes.error || !custRes.data || !kpiRes.data) {
      return res.json(SEED.kpis)
    }

    const customers = custRes.data
    const dbKpis = kpiRes.data

    const activeCustomers = customers.filter((c: any) => c.status === 'Active')
    const churnedCustomers = customers.filter((c: any) => c.status === 'Churned')

    const totalMRR = activeCustomers.reduce((sum: number, c: any) => sum + Number(c.mrr), 0)
    const activeUsers = activeCustomers.length
    const arpu = activeUsers > 0 ? (totalMRR / activeUsers) : 0
    
    const totalCustomers = customers.length
    const churnRate = totalCustomers > 0 ? (churnedCustomers.length / totalCustomers) * 100 : 0

    const trends: Record<string, { change: string; up: boolean }> = {}
    dbKpis.forEach((row: any) => {
      trends[row.label] = { change: row.change, up: row.up }
    })

    const getTrend = (label: string, defaultChange: string, defaultUp: boolean) => {
      return trends[label] || { change: defaultChange, up: defaultUp }
    }

    const revTrend = getTrend('Total Revenue', '+12.4%', true)
    const usersTrend = getTrend('Active Users', '+8.1%', true)
    const churnTrend = getTrend('Churn Rate', '-0.4%', false)
    const arpuTrend = getTrend('Avg. Rev / User', '+2.1%', true)

    res.json({
      revenue: {
        value: `$${totalMRR.toLocaleString()}`,
        change: revTrend.change,
        up: revTrend.up
      },
      users: {
        value: activeUsers.toLocaleString(),
        change: usersTrend.change,
        up: usersTrend.up
      },
      churn: {
        value: `${churnRate.toFixed(1)}%`,
        change: churnTrend.change,
        up: churnTrend.up
      },
      arpu: {
        value: `$${arpu.toFixed(2)}`,
        change: arpuTrend.change,
        up: arpuTrend.up
      }
    })
  } catch (err) {
    res.json(SEED.kpis)
  }
})

router.get('/revenue', requireAuth, async (_req, res) => {
  const supabase = getSupabase()
  if (!supabase) {
    return res.json(SEED.monthly)
  }

  try {
    const { data, error } = await supabase
      .from('monthly_metrics')
      .select('month, revenue, mrr')
      .order('sort_order', { ascending: true })

    if (error || !data || data.length === 0) {
      return res.json(SEED.monthly)
    }
    
    res.json(data.map((row: any) => ({
      month: row.month,
      revenue: Number(row.revenue),
      mrr: Number(row.mrr)
    })))
  } catch (err) {
    res.json(SEED.monthly)
  }
})

router.get('/customers', requireAuth, async (_req, res) => {
  const supabase = getSupabase()
  if (!supabase) {
    return res.json(SEED.customers)
  }

  try {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, email, plan, mrr, status')
      .order('mrr', { ascending: false })

    if (error || !data || data.length === 0) {
      return res.json(SEED.customers)
    }
    
    res.json(data.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email || `${row.name.toLowerCase().replace(/\s+/g, '')}@example.com`,
      plan: row.plan,
      mrr: Number(row.mrr),
      status: row.status
    })))
  } catch (err) {
    res.json(SEED.customers)
  }
})

// In-memory fallback store for spreadsheets when Supabase table is missing
export const memorySpreadsheets = new Map<string, any>()

// Save or update user's spreadsheet
router.post('/spreadsheet', requireAuth, async (req: Request, res: Response) => {
  const { filename, headers, columns_metadata, rows } = req.body
  const userId = (req as any).userId

  const supabase = getSupabase()
  if (supabase) {
    try {
      // 1. Delete previous spreadsheets for this user
      await supabase
        .from('spreadsheets')
        .delete()
        .eq('user_id', userId)

      // 2. Insert new spreadsheet
      const { error } = await supabase
        .from('spreadsheets')
        .insert({
          user_id: userId,
          filename,
          headers,
          columns_metadata,
          rows
        })

      if (!error) {
        memorySpreadsheets.delete(userId)
        return res.json({ success: true })
      }
      console.warn('Supabase insert failed, falling back to local memory storage:', error.message)
    } catch (err: any) {
      console.warn('Supabase insert crashed, falling back to local memory storage:', err.message)
    }
  }

  // Fallback to local memory storage
  memorySpreadsheets.set(userId, {
    filename,
    headers,
    columns_metadata,
    rows,
    created_at: new Date().toISOString()
  })
  res.json({ success: true, fallback: true })
})

// Fetch user's active spreadsheet
router.get('/spreadsheet', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId

  const supabase = getSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('spreadsheets')
        .select('filename, headers, columns_metadata, rows, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!error && data) {
        return res.json(data)
      }
    } catch (err: any) {
      // Fall through to memory check
    }
  }

  // Check memory store
  const memData = memorySpreadsheets.get(userId)
  res.json(memData || null)
})

// Clear / Delete user's active spreadsheet (reset to seeded data)
router.delete('/spreadsheet', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId
  memorySpreadsheets.delete(userId)

  const supabase = getSupabase()
  if (supabase) {
    try {
      const { error } = await supabase
        .from('spreadsheets')
        .delete()
        .eq('user_id', userId)

      if (!error) {
        return res.json({ success: true })
      }
    } catch (err: any) {
      // Ignore
    }
  }
  res.json({ success: true })
})

export const memoryDocuments = new Map<string, { filename: string; text: string; created_at: string; parsedRows?: any[]; columnsMetadata?: Record<string, string> }>()

// ── Parse document text into structured rows using AI ──────────
async function parseDocumentText(text: string): Promise<{ rows: any[]; columnsMetadata: Record<string, string> } | null> {
  const geminiKey = process.env.GEMINI_API_KEY
  if (!geminiKey) return null

  const prompt = `You are a data extraction AI. Analyze the following document text and extract ALL structured/tabular data from it.
Return a valid JSON object with this exact structure:
{
  "columns": ["Col1", "Col2", ...],
  "rows": [ {"Col1": val, "Col2": val}, ... ]
}

Rules:
- Look for tables, lists with numbers, financial data, metrics, KPIs, records, comparisons.
- If the document contains multiple tables, merge them or pick the most significant one.
- Column names should be descriptive (e.g. "Revenue", "Month", "Customer", "Units Sold").
- Numeric values must be numbers (not strings), dates as strings (YYYY-MM-DD or Month Year).
- Return ONLY the raw JSON, no markdown, no explanation, no code fences.
- If no structured data exists, return: {"columns": [], "rows": []}

Document text:
${text.slice(0, 100000)}`

  try {
    const genAI = new GoogleGenerativeAI(geminiKey)
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']
    let raw = ''
    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        const result = await model.generateContent(prompt)
        raw = result.response.text().trim()
        console.log(`Document parse succeeded with model: ${modelName}`)
        break
      } catch (modelErr: any) {
        console.warn(`Model ${modelName} failed for doc parse:`, modelErr.message)
      }
    }
    if (!raw) return null

    // Strip markdown code fences if present
    const clean = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()
    const parsed = JSON.parse(clean)
    if (!parsed.columns || !Array.isArray(parsed.rows)) return null
    if (parsed.rows.length === 0) return null

    // Auto-detect column types
    const columnsMetadata: Record<string, string> = {}
    const identifierKw = ['id', 'code', 'ref', 'name', 'customer', 'company', 'email', 'phone', 'address', 'country', 'city', 'key', 'uuid']
    parsed.columns.forEach((col: string) => {
      const lower = col.toLowerCase()
      if (identifierKw.some(kw => lower.includes(kw))) { columnsMetadata[col] = 'identifier'; return }
      const sample = parsed.rows.slice(0, 5).map((r: any) => r[col]).filter(Boolean)
      if (sample.every((v: any) => !isNaN(Date.parse(String(v))) && isNaN(Number(v)))) { columnsMetadata[col] = 'time'; return }
      if (sample.every((v: any) => typeof v === 'number' || !isNaN(Number(v)))) { columnsMetadata[col] = 'metric'; return }
      columnsMetadata[col] = 'category'
    })

    return { rows: parsed.rows, columnsMetadata }
  } catch (err) {
    console.error('AI parse error:', err)
    return null
  }
}

// Save/upload user's active document (PDF/text)
router.post('/document', requireAuth, async (req: Request, res: Response) => {
  const { filename, base64 } = req.body
  const userId = (req as any).userId

  if (!filename || !base64) {
    return res.status(400).json({ error: 'filename and base64 string are required' })
  }

  // If it's a simple text file, extract text natively without Python OCR
  if (filename.toLowerCase().endsWith('.txt')) {
    try {
      const extractedText = Buffer.from(base64, 'base64').toString('utf-8')
      const supabase = getSupabase()
      // Parse structured data from text
      const parsed = await parseDocumentText(extractedText)
      if (supabase) {
        try {
          await supabase.from('documents').delete().eq('user_id', userId)
          const { error } = await supabase.from('documents').insert({
            user_id: userId,
            filename,
            text: extractedText,
            parsed_data: parsed ? JSON.stringify(parsed) : null
          })
          if (!error) {
            memoryDocuments.delete(userId)
            return res.json({ success: true, textLength: extractedText.length, hasParsedData: !!parsed })
          }
        } catch (err) {}
      }
      memoryDocuments.set(userId, {
        filename,
        text: extractedText,
        created_at: new Date().toISOString(),
        parsedRows: parsed?.rows,
        columnsMetadata: parsed?.columnsMetadata
      })
      return res.json({ success: true, fallback: true, textLength: extractedText.length, hasParsedData: !!parsed })
    } catch (err: any) {
      return res.status(500).json({ error: `Text parsing failed: ${err.message}` })
    }
  }

  // For PDF files, use pdf_extractor.py
  const projectRoot = path.resolve(__dirname, '../../../')
  const scriptPath = path.join(projectRoot, 'pdf_extractor.py')
  const tempDir = os.tmpdir()
  const tempFilePath = path.join(tempDir, `temp_${Date.now()}_${Math.floor(Math.random() * 1000)}.pdf`)
  const outputFilePath = path.join(tempDir, `temp_${Date.now()}_${Math.floor(Math.random() * 1000)}.txt`)

  // Use the full absolute Python path to avoid PATH resolution issues with nodemon on Windows
  const PYTHON_EXE = process.platform === 'win32'
    ? 'C:\\Users\\PAVAN\\AppData\\Local\\Programs\\Python\\Python314\\python.exe'
    : 'python3'

  try {
    fs.writeFileSync(tempFilePath, Buffer.from(base64, 'base64'))

    const cmd = `"${PYTHON_EXE}" "${scriptPath}" "${tempFilePath}" -o "${outputFilePath}"`

    try {
      await execAsync(cmd, { env: { ...process.env, PYTHONIOENCODING: 'utf-8' }, encoding: 'utf8' })
    } catch (execErr: any) {
      console.error('Python PDF extractor failed:', execErr.stderr || execErr.message)
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath)
      if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath)
      let errorMsg = 'Failed to extract text from PDF document.'
      const stderrStr = String(execErr.stderr || execErr.message)
      if (stderrStr.includes('exceeds the limit')) {
        const match = stderrStr.match(/ValueError: (.*)/)
        if (match) {
          errorMsg = match[1]
        } else {
          errorMsg = 'PDF exceeds the limit of 20 pages. Please upload a smaller document.'
        }
      }
      return res.status(500).json({ error: errorMsg })
    }

    // Clean up temp input PDF
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath)

    if (!fs.existsSync(outputFilePath)) {
      return res.status(500).json({ error: 'Output text file was not generated.' })
    }

    const extractedText = fs.readFileSync(outputFilePath, 'utf-8')
    fs.unlinkSync(outputFilePath)

    const supabase = getSupabase()
    if (supabase) {
      try {
        await supabase.from('documents').delete().eq('user_id', userId)
        const { error } = await supabase.from('documents').insert({
          user_id: userId,
          filename,
          text: extractedText
        })
        if (!error) {
          memoryDocuments.delete(userId)
          return res.json({ success: true, textLength: extractedText.length })
        }
      } catch (err) {}
    }

    // Parse structured data from extracted text
    const parsed = await parseDocumentText(extractedText)
    memoryDocuments.set(userId, {
      filename,
      text: extractedText,
      created_at: new Date().toISOString(),
      parsedRows: parsed?.rows,
      columnsMetadata: parsed?.columnsMetadata
    })
    return res.json({ success: true, fallback: true, textLength: extractedText.length, hasParsedData: !!parsed })

  } catch (err: any) {
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath)
    if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath)
    return res.status(500).json({ error: `File processing failed: ${err.message}` })
  }
})

// Fetch active document metadata + parsed data
router.get('/document', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId

  const supabase = getSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('filename, text, created_at, parsed_data')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!error && data) {
        let parsedRows: any[] | undefined
        let columnsMetadata: Record<string, string> | undefined
        if (data.parsed_data) {
          try {
            const p = JSON.parse(data.parsed_data)
            parsedRows = p.rows
            columnsMetadata = p.columnsMetadata
          } catch {}
        }
        res.set('Cache-Control', 'no-store')
        return res.json({
          filename: data.filename,
          textLength: data.text.length,
          created_at: data.created_at,
          parsedRows,
          columnsMetadata
        })
      }
    } catch (err) {}
  }

  const memDoc = memoryDocuments.get(userId)
  if (memDoc) {
    res.set('Cache-Control', 'no-store')
    return res.json({
      filename: memDoc.filename,
      textLength: memDoc.text.length,
      created_at: memDoc.created_at,
      parsedRows: memDoc.parsedRows,
      columnsMetadata: memDoc.columnsMetadata
    })
  }

  // Disable ETag caching so fresh parsed_data is always returned
  res.set('Cache-Control', 'no-store')
  res.json(null)
})

// Re-parse an already-uploaded document on demand
router.post('/document/parse', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId
  let text = ''
  let filename = ''

  const supabase = getSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('filename, text')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!error && data) { text = data.text; filename = data.filename }
    } catch {}
  }
  if (!text) {
    const memDoc = memoryDocuments.get(userId)
    if (memDoc) { text = memDoc.text; filename = memDoc.filename }
  }
  if (!text) return res.status(404).json({ error: 'No active document found' })

  const parsed = await parseDocumentText(text)
  if (!parsed) return res.json({ success: false, message: 'No structured data could be extracted from this document.' })

  // Update in DB if available
  if (supabase) {
    try {
      await supabase.from('documents').update({ parsed_data: JSON.stringify(parsed) }).eq('user_id', userId)
    } catch {}
  }
  // Update in memory
  const memDoc = memoryDocuments.get(userId)
  if (memDoc) {
    memoryDocuments.set(userId, { ...memDoc, parsedRows: parsed.rows, columnsMetadata: parsed.columnsMetadata })
  }

  return res.json({ success: true, rowCount: parsed.rows.length, columnsMetadata: parsed.columnsMetadata, parsedRows: parsed.rows })
})

// Clear user's active document
router.delete('/document', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId
  memoryDocuments.delete(userId)

  const supabase = getSupabase()
  if (supabase) {
    try {
      await supabase.from('documents').delete().eq('user_id', userId)
    } catch (err) {}
  }
  res.json({ success: true })
})

export default router
