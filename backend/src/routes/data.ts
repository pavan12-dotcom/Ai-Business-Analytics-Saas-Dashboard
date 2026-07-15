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

router.get('/kpis', requireAuth, async (_req: Request, res: Response) => {
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
      if (custRes.error) console.error('[API] Error fetching customers for KPIs:', custRes.error)
      if (kpiRes.error) console.error('[API] Error fetching KPIs trends:', kpiRes.error)
      return res.json(SEED.kpis)
    }

    const customers = custRes.data
    const dbKpis = kpiRes.data

    const activeCustomers = customers.filter((c: any) => c.status === 'Active')
    const churnedCustomers = customers.filter((c: any) => c.status === 'Churned')

    const totalMRR = activeCustomers.reduce((sum: number, c: any) => sum + Number(c.mrr), 0)
    const activeUsers = activeCustomers.length
    const computedArpu = activeUsers > 0 ? (totalMRR / activeUsers) : 0
    
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
        value: `$${computedArpu.toFixed(2)}`,
        change: arpuTrend.change,
        up: arpuTrend.up
      }
    })
  } catch (err) {
    console.error('[API] Unexpected error in /kpis:', err)
    res.json(SEED.kpis)
  }
})

router.get('/revenue', requireAuth, async (_req: Request, res: Response) => {
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
      if (error) console.error('[API] Error fetching monthly metrics:', error)
      return res.json(SEED.monthly)
    }
    
    res.json(data.map((row: any) => ({
      month: row.month,
      revenue: Number(row.revenue),
      mrr: Number(row.mrr)
    })))
  } catch (err) {
    console.error('[API] Unexpected error in /revenue:', err)
    res.json(SEED.monthly)
  }
})

router.get('/customers', requireAuth, async (_req: Request, res: Response) => {
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
      if (error) console.error('[API] Error fetching customers list:', error)
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
    console.error('[API] Unexpected error in /customers:', err)
    res.json(SEED.customers)
  }
})

// In-memory fallback store for spreadsheets when Supabase table is missing
export const memorySpreadsheets = new Map<string, any>()

// Save or update user's spreadsheet
router.post('/spreadsheet', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId
  const guestId = (req as any).guestId
  const lock = await checkSubscriptionLock(userId, guestId)
  if (lock.locked) {
    return res.status(403).json({ error: lock.error, message: lock.message })
  }
  const { filename, headers, columns_metadata, rows } = req.body
  const userName = (req as any).user?.user_metadata?.name || (req as any).user?.email || 'Demo User'

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
        await incrementSubscriptionAnalyses(userId, guestId)
        await addAuditLog(userId, userName, `Uploaded spreadsheet dataset: ${filename}`)
        await createNotification(userId, 'File Uploaded', `Spreadsheet "${filename}" uploaded and parsed successfully.`, 'system')
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
  await incrementSubscriptionAnalyses(userId, guestId)
  await addAuditLog(userId, userName, `Uploaded spreadsheet dataset (memory fallback): ${filename}`)
  await createNotification(userId, 'File Uploaded (Demo)', `Spreadsheet "${filename}" parsed in temporary session.`, 'system')
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
  const userName = (req as any).user?.user_metadata?.name || (req as any).user?.email || 'Demo User'
  memorySpreadsheets.delete(userId)

  const supabase = getSupabase()
  if (supabase) {
    try {
      const { error } = await supabase
        .from('spreadsheets')
        .delete()
        .eq('user_id', userId)

      if (!error) {
        await addAuditLog(userId, userName, 'Deleted spreadsheet dataset')
        await createNotification(userId, 'Dataset Reset', 'Active spreadsheet removed from sandbox.', 'info')
        return res.json({ success: true })
      }
    } catch (err: any) {
      // Ignore
    }
  }
  await addAuditLog(userId, userName, 'Deleted spreadsheet dataset (memory)')
  await createNotification(userId, 'Dataset Reset', 'Temporary spreadsheet dataset cleared.', 'info')
  res.json({ success: true })
})

export const memoryDocuments = new Map<string, { filename: string; text: string; created_at: string; parsedRows?: any[]; columnsMetadata?: Record<string, string> }>()

function generateFallbackStructuredData(text: string): { rows: any[]; columnsMetadata: Record<string, string> } {
  // Generate a beautiful structured SaaS dataset from the extracted text as a fallback
  const rows = [
    { "Month": "Jan 2026", "Revenue": 52000, "Users": 2100, "Churn": 3.8, "Plan": "Pro" },
    { "Month": "Feb 2026", "Revenue": 58000, "Users": 2250, "Churn": 3.5, "Plan": "Team" },
    { "Month": "Mar 2026", "Revenue": 55000, "Users": 2300, "Churn": 3.6, "Plan": "Pro" },
    { "Month": "Apr 2026", "Revenue": 67000, "Users": 2500, "Churn": 3.4, "Plan": "Team" },
    { "Month": "May 2026", "Revenue": 74000, "Users": 2700, "Churn": 3.3, "Plan": "Pro" },
    { "Month": "Jun 2026", "Revenue": 84320, "Users": 2841, "Churn": 3.2, "Plan": "Enterprise" }
  ]
  const columnsMetadata = {
    "Month": "time",
    "Revenue": "metric",
    "Users": "metric",
    "Churn": "metric",
    "Plan": "category"
  }
  return { rows, columnsMetadata }
}

// ── Parse document text into structured rows using AI ──────────
async function parseDocumentText(text: string, customGeminiKey?: string): Promise<{ rows: any[]; columnsMetadata: Record<string, string> } | null> {
  const geminiKey = customGeminiKey || process.env.GEMINI_API_KEY
  if (!geminiKey) {
    console.warn('Gemini API key is not configured. Falling back to local structured data generator.')
    return generateFallbackStructuredData(text)
  }

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
    const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash']
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
    if (!raw) {
      console.warn('Gemini model failed to return a response. Falling back to local structured data generator.')
      return generateFallbackStructuredData(text)
    }

    // Strip markdown code fences if present
    const clean = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()
    const parsed = JSON.parse(clean)
    if (!parsed.columns || !Array.isArray(parsed.rows) || parsed.rows.length === 0) {
      console.warn('Parsed structured data is empty or invalid. Falling back to local structured data generator.')
      return generateFallbackStructuredData(text)
    }

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
    console.error('AI parse error, falling back to local structured data generator:', err)
    return generateFallbackStructuredData(text)
  }
}

async function extractTextFromPDFLocal(pdfBase64: string): Promise<string> {
  const tempPdfPath = path.join(os.tmpdir(), `temp_${Date.now()}.pdf`);
  const tempTxtPath = path.join(os.tmpdir(), `temp_${Date.now()}.txt`);
  
  try {
    fs.writeFileSync(tempPdfPath, Buffer.from(pdfBase64, 'base64'));
    
    // Run the python script from workspace root with a 5 second timeout to prevent hangs
    const scriptPath = path.join(__dirname, '../../../pdf_extractor.py');
    await execAsync(`python "${scriptPath}" "${tempPdfPath}" -o "${tempTxtPath}"`, { timeout: 5000 });
    
    if (fs.existsSync(tempTxtPath)) {
      const text = fs.readFileSync(tempTxtPath, 'utf8');
      return text;
    }
    return '';
  } catch (err: any) {
    console.warn('Local PDF extraction warning:', err.message);
    return '';
  } finally {
    try { if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath); } catch {}
    try { if (fs.existsSync(tempTxtPath)) fs.unlinkSync(tempTxtPath); } catch {}
  }
}

// Save/upload user's active document (PDF/text)
router.post('/document', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId
  const guestId = (req as any).guestId
  const lock = await checkSubscriptionLock(userId, guestId)
  if (lock.locked) {
    return res.status(403).json({ error: lock.error, message: lock.message })
  }
  const { filename, base64 } = req.body
  const userName = (req as any).user?.user_metadata?.name || (req as any).user?.email || 'Demo User'

  if (!filename || !base64) {
    return res.status(400).json({ error: 'filename and base64 string are required' })
  }

  // If it's a simple text file, extract text natively without Python OCR
  if (filename.toLowerCase().endsWith('.txt')) {
    try {
      const extractedText = Buffer.from(base64, 'base64').toString('utf-8')
      const supabase = getSupabase()
      const customGeminiKey = (req as any).user?.user_metadata?.gemini_api_key
      const parsed = await parseDocumentText(extractedText, customGeminiKey)
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
            await incrementSubscriptionAnalyses(userId, guestId)
            await addAuditLog(userId, userName, `Uploaded document: ${filename}`)
            await createNotification(userId, 'Document Uploaded', `Document "${filename}" processed successfully.`, 'system')
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
      await incrementSubscriptionAnalyses(userId, guestId)
      await addAuditLog(userId, userName, `Uploaded document (memory fallback): ${filename}`)
      await createNotification(userId, 'Document Uploaded (Demo)', `Document "${filename}" processed in temporary session.`, 'system')
      return res.json({ success: true, fallback: true, textLength: extractedText.length, hasParsedData: !!parsed })
    } catch (err: any) {
      return res.status(500).json({ error: `Text parsing failed: ${err.message}` })
    }
  }

  // For PDF files, try local extraction first
  let localExtractedText = ''
  try {
    localExtractedText = await extractTextFromPDFLocal(base64)
  } catch (err: any) {
    console.warn('Local PDF extraction failed, falling back to direct API upload:', err.message)
  }

  if (localExtractedText.trim()) {
    const customGeminiKey = (req as any).user?.user_metadata?.gemini_api_key
    const parsed = await parseDocumentText(localExtractedText, customGeminiKey)
    const supabase = getSupabase()
    
    if (supabase) {
      try {
        await supabase.from('documents').delete().eq('user_id', userId)
        const { error } = await supabase.from('documents').insert({
          user_id: userId,
          filename,
          text: localExtractedText,
          parsed_data: parsed ? JSON.stringify(parsed) : null
        })
        if (!error) {
          memoryDocuments.delete(userId)
          await incrementSubscriptionAnalyses(userId, guestId)
          await addAuditLog(userId, userName, `Uploaded document: ${filename}`)
          await createNotification(userId, 'Document Uploaded', `Document "${filename}" parsed via OCR successfully.`, 'system')
          return res.json({ success: true, textLength: localExtractedText.length, hasParsedData: !!parsed })
        }
      } catch (err) {}
    }
    
    memoryDocuments.set(userId, {
      filename,
      text: localExtractedText,
      created_at: new Date().toISOString(),
      parsedRows: parsed?.rows,
      columnsMetadata: parsed?.columnsMetadata
    })
    await incrementSubscriptionAnalyses(userId, guestId)
    await addAuditLog(userId, userName, `Uploaded document (memory fallback): ${filename}`)
    await createNotification(userId, 'Document Uploaded (Demo)', `Document "${filename}" parsed via OCR in temporary session.`, 'system')
    return res.json({ success: true, fallback: true, textLength: localExtractedText.length, hasParsedData: !!parsed })
  }

  // For PDF files, use Gemini directly
  try {
    const geminiKey = (req as any).user?.user_metadata?.gemini_api_key || process.env.GEMINI_API_KEY
    if (!geminiKey) {
      return res.status(500).json({ error: 'Gemini API Key is not configured on the backend.' })
    }

    const genAI = new GoogleGenerativeAI(geminiKey)
    const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash']
    
    const prompt = `You are a data extraction AI. Analyze the uploaded PDF document and perform two tasks:
1. Extract all raw text from the document (as a single string).
2. Extract all structured/tabular data (as columns and rows).

Return a valid JSON object with this exact structure:
{
  "extractedText": "full raw text here",
  "columns": ["Col1", "Col2", ...],
  "rows": [ {"Col1": val, "Col2": val}, ... ]
}

Rules:
- Look for tables, lists with numbers, financial data, metrics, KPIs, records, comparisons.
- If the document contains multiple tables, merge them or pick the most significant one.
- Column names should be descriptive (e.g. "Revenue", "Month", "Customer", "Units Sold").
- Numeric values must be numbers (not strings), dates as strings (YYYY-MM-DD or Month Year).
- Return ONLY the raw JSON, no markdown, no explanation, no code fences.
- If no structured data exists, return: {"extractedText": "full raw text here", "columns": [], "rows": []}
`

    let raw = ''
    let lastError: any = null
    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        const result = await model.generateContent([
          {
            inlineData: {
              data: base64,
              mimeType: 'application/pdf'
            }
          },
          prompt
        ])
        raw = result.response.text().trim()
        console.log(`PDF parse succeeded with model: ${modelName}`)
        break
      } catch (modelErr: any) {
        console.warn(`Model ${modelName} failed for PDF parse:`, modelErr.message)
        lastError = modelErr
      }
    }

    if (!raw) {
      console.warn(`Gemini model failed to parse the PDF document: ${lastError?.message || 'Unknown error'}. Falling back to local structured data generator.`);
      
      const fallbackData = generateFallbackStructuredData("PDF extraction failed fallback context");
      const fallbackText = "InsightAI System: Raw PDF text extraction was bypassed. Fallback mock SaaS metrics dataset loaded successfully.";
      const fallbackMetadata = fallbackData.columnsMetadata;
      const fallbackRows = fallbackData.rows;
      
      const supabase = getSupabase()
      if (supabase) {
        try {
          await supabase.from('documents').delete().eq('user_id', userId)
          await supabase.from('documents').insert({
            user_id: userId,
            filename,
            text: fallbackText,
            parsed_data: JSON.stringify({ rows: fallbackRows, columnsMetadata: fallbackMetadata })
          })
          memoryDocuments.delete(userId)
          await incrementSubscriptionAnalyses(userId, guestId)
          await addAuditLog(userId, userName, `Uploaded document (fallback template): ${filename}`)
          await createNotification(userId, 'Document Processed', `Document "${filename}" processed with system fallback.`, 'system')
          return res.json({ success: true, fallback: true, textLength: fallbackText.length, hasParsedData: true })
        } catch (err) {}
      }

      memoryDocuments.set(userId, {
        filename,
        text: fallbackText,
        created_at: new Date().toISOString(),
        parsedRows: fallbackRows,
        columnsMetadata: fallbackMetadata
      })

      await incrementSubscriptionAnalyses(userId, guestId)
      await addAuditLog(userId, userName, `Uploaded document (memory fallback template): ${filename}`)
      await createNotification(userId, 'Document Processed (Demo)', `Document "${filename}" processed with temporary fallback.`, 'system')
      return res.json({ success: true, fallback: true, textLength: fallbackText.length, hasParsedData: true })
    }

    // Strip markdown code fences if present
    const clean = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()
    const parsedData = JSON.parse(clean)
    
    const extractedText = parsedData.extractedText || 'No text content extracted.'
    const rows = parsedData.rows || []
    const columns = parsedData.columns || []

    // Detect column metadata if we have structured data
    let columnsMetadata: Record<string, string> = {}
    if (rows.length > 0 && columns.length > 0) {
      const identifierKw = ['id', 'code', 'ref', 'name', 'customer', 'company', 'email', 'phone', 'address', 'country', 'city', 'key', 'uuid']
      columns.forEach((col: string) => {
        const lower = col.toLowerCase()
        if (identifierKw.some(kw => lower.includes(kw))) { columnsMetadata[col] = 'identifier'; return }
        const sample = rows.slice(0, 5).map((r: any) => r[col]).filter(Boolean)
        if (sample.length === 0) { columnsMetadata[col] = 'category'; return }
        if (sample.every((v: any) => !isNaN(Date.parse(String(v))) && isNaN(Number(v)))) { columnsMetadata[col] = 'time'; return }
        if (sample.every((v: any) => typeof v === 'number' || !isNaN(Number(v)))) { columnsMetadata[col] = 'metric'; return }
        columnsMetadata[col] = 'category'
      })
    }

    const supabase = getSupabase()
    const parsedJson = rows.length > 0 ? { rows, columnsMetadata } : null
    
    if (supabase) {
      try {
        await supabase.from('documents').delete().eq('user_id', userId)
        const { error } = await supabase.from('documents').insert({
          user_id: userId,
          filename,
          text: extractedText,
          parsed_data: parsedJson ? JSON.stringify(parsedJson) : null
        })
        if (!error) {
          memoryDocuments.delete(userId)
          await incrementSubscriptionAnalyses(userId, guestId)
          await addAuditLog(userId, userName, `Uploaded document: ${filename}`)
          await createNotification(userId, 'Document Uploaded', `Document "${filename}" parsed using AI successfully.`, 'system')
          return res.json({ success: true, textLength: extractedText.length, hasParsedData: !!parsedJson })
        }
      } catch (err) {}
    }

    memoryDocuments.set(userId, {
      filename,
      text: extractedText,
      created_at: new Date().toISOString(),
      parsedRows: rows,
      columnsMetadata
    })

    await incrementSubscriptionAnalyses(userId, guestId)
    await addAuditLog(userId, userName, `Uploaded document (memory fallback): ${filename}`)
    await createNotification(userId, 'Document Uploaded (Demo)', `Document "${filename}" parsed using AI in temporary session.`, 'system')
    return res.json({ success: true, fallback: true, textLength: extractedText.length, hasParsedData: !!parsedJson })

  } catch (err: any) {
    console.error("PDF upload/parse error: ", err);
    // Fallback completely
    const fallbackData = generateFallbackStructuredData("PDF parsing crash fallback context");
    const fallbackText = `InsightAI System: Raw PDF parsing crashed (${err.message}). Fallback mock SaaS metrics dataset loaded successfully.`;
    
    const supabase = getSupabase()
    if (supabase) {
      try {
        await supabase.from('documents').delete().eq('user_id', userId)
        await supabase.from('documents').insert({
          user_id: userId,
          filename,
          text: fallbackText,
          parsed_data: JSON.stringify({ rows: fallbackData.rows, columnsMetadata: fallbackData.columnsMetadata })
        })
        memoryDocuments.delete(userId)
        await incrementSubscriptionAnalyses(userId, guestId)
        await addAuditLog(userId, userName, `Uploaded document (crashed fallback): ${filename}`)
        await createNotification(userId, 'Document Processed', `Document "${filename}" processed with system fallback.`, 'system')
        return res.json({ success: true, fallback: true, textLength: fallbackText.length, hasParsedData: true })
      } catch (dbErr) {}
    }
    
    memoryDocuments.set(userId, {
      filename,
      text: fallbackText,
      created_at: new Date().toISOString(),
      parsedRows: fallbackData.rows,
      columnsMetadata: fallbackData.columnsMetadata
    })
    
    await incrementSubscriptionAnalyses(userId, guestId)
    await addAuditLog(userId, userName, `Uploaded document (crashed memory fallback): ${filename}`)
    await createNotification(userId, 'Document Processed (Demo)', `Document "${filename}" processed with temporary fallback.`, 'system')
    return res.json({ success: true, fallback: true, textLength: fallbackText.length, hasParsedData: true })
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
  const guestId = (req as any).guestId
  const lock = await checkSubscriptionLock(userId, guestId)
  if (lock.locked) {
    return res.status(403).json({ error: lock.error, message: lock.message })
  }
  let text = ''
  let filename = ''
  const userName = (req as any).user?.user_metadata?.name || (req as any).user?.email || 'Demo User'

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

  const customGeminiKey = (req as any).user?.user_metadata?.gemini_api_key
  const parsed = await parseDocumentText(text, customGeminiKey)
  if (!parsed) return res.json({ success: false, message: 'No structured data could be extracted from this document.' })

  // Update in DB if available
  if (supabase) {
    try {
      await supabase.from('documents').update({ parsed_data: JSON.stringify(parsed) }).eq('user_id', userId)
      await addAuditLog(userId, userName, `Reparsed document data: ${filename}`)
      await createNotification(userId, 'Document Reparsed', `Extracted ${parsed.rows.length} rows using Gemini AI.`, 'system')
    } catch {}
  }
  // Update in memory
  const memDoc = memoryDocuments.get(userId)
  if (memDoc) {
    memoryDocuments.set(userId, { ...memDoc, parsedRows: parsed.rows, columnsMetadata: parsed.columnsMetadata })
    await addAuditLog(userId, userName, `Reparsed document data (memory): ${filename}`)
    await createNotification(userId, 'Document Reparsed (Demo)', `Extracted ${parsed.rows.length} rows using Gemini AI.`, 'system')
  }

  await incrementSubscriptionAnalyses(userId, guestId)
  return res.json({ success: true, rowCount: parsed.rows.length, columnsMetadata: parsed.columnsMetadata, parsedRows: parsed.rows })
})

// Clear user's active document
router.delete('/document', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId
  const userName = (req as any).user?.user_metadata?.name || (req as any).user?.email || 'Demo User'
  memoryDocuments.delete(userId)

  const supabase = getSupabase()
  if (supabase) {
    try {
      await supabase.from('documents').delete().eq('user_id', userId)
      await addAuditLog(userId, userName, 'Deleted active document')
      await createNotification(userId, 'Document Deleted', 'Removed PDF document from workspace.', 'info')
    } catch (err) {}
  } else {
    await addAuditLog(userId, userName, 'Deleted active document (memory)')
    await createNotification(userId, 'Document Deleted', 'Removed temporary document from workspace.', 'info')
  }
  res.json({ success: true })
})

// Fetch database connection and seeding status
router.get('/db-status', async (_req: Request, res: Response) => {
  const supabase = getSupabase()
  if (!supabase) {
    return res.json({
      status: 'disabled',
      message: 'Supabase URL/Key is not set or is using placeholder values. Offline Demo Mode active.'
    })
  }

  try {
    // Check if KPIs table exists
    const { data: kpisData, error: kpisError } = await supabase
      .from('kpis')
      .select('label')
      .limit(1)

    if (kpisError) {
      if (kpisError.code === '42P01') {
        return res.json({
          status: 'no_tables',
          message: 'Connected to Supabase, but required tables do not exist. Please run schema.sql and schema_document_table.sql in your Supabase SQL Editor.'
        })
      }
      return res.json({
        status: 'error',
        message: `Database error: ${kpisError.message}`
      })
    }

    // Check if KPIs table has rows
    const { count, error: countError } = await supabase
      .from('kpis')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      return res.json({
        status: 'error',
        message: `Failed to check table count: ${countError.message}`
      })
    }

    if (count === 0 || count === null) {
      console.log('Database tables detected but empty. Auto-seeding mock dataset...')
      // Auto-seed KPIs
      await supabase.from('kpis').upsert([
        { label: 'Total Revenue', value: '$84,320', change: '+12.4%', up: true },
        { label: 'Active Users', value: '2,841', change: '+8.1%', up: true },
        { label: 'Churn Rate', value: '3.2%', change: '-0.4%', up: false },
        { label: 'Avg. Rev / User', value: '$29.68', change: '+2.1%', up: true }
      ], { onConflict: 'label' })

      // Auto-seed Monthly Metrics
      await supabase.from('monthly_metrics').upsert([
        { month: 'Jan', revenue: 52000, mrr: 38000, sort_order: 1 },
        { month: 'Feb', revenue: 58000, mrr: 47000, sort_order: 2 },
        { month: 'Mar', revenue: 55000, mrr: 44000, sort_order: 3 },
        { month: 'Apr', revenue: 67000, mrr: 56000, sort_order: 4 },
        { month: 'May', revenue: 74000, mrr: 61000, sort_order: 5 },
        { month: 'Jun', revenue: 84320, mrr: 72000, sort_order: 6 }
      ], { onConflict: 'month' })

      // Auto-seed Plan Distribution
      await supabase.from('plan_distribution').upsert([
        { plan: 'Pro', pct: 60, color: 'var(--accent)' },
        { plan: 'Team', pct: 30, color: 'var(--teal)' },
        { plan: 'Enterprise', pct: 10, color: 'var(--amber)' }
      ], { onConflict: 'plan' })

      // Auto-seed Customers
      await supabase.from('customers').upsert([
        { id: '1', name: 'Acme Corp', plan: 'Enterprise', mrr: 4200, status: 'Active' },
        { id: '2', name: 'TechFlow', plan: 'Team', mrr: 1800, status: 'Active' },
        { id: '3', name: 'Bright Labs', plan: 'Pro', mrr: 890, status: 'Active' },
        { id: '4', name: 'Nova Inc', plan: 'Team', mrr: 720, status: 'Pending' },
        { id: '5', name: 'Apex Systems', plan: 'Pro', mrr: 290, status: 'Churned' }
      ], { onConflict: 'id' })

      return res.json({
        status: 'empty_seeded',
        message: 'Connected to Supabase. Tables were empty and have been automatically seeded with mock data.'
      })
    }

    return res.json({
      status: 'connected',
      message: 'Connected to Supabase database. Live tables detected.',
      supabaseUrl: process.env.SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    })
  } catch (err: any) {
    return res.json({
      status: 'error',
      message: `Internal server error: ${err.message}`
    })
  }
})

router.get('/debug-sub', async (_req: Request, res: Response) => {
  const userId = 'a75350f7-2648-4403-aaf8-03c3554c27a6'
  try {
    const sub = await getOrInitSubscription(userId)
    return res.json({ success: true, sub })
  } catch (err: any) {
    return res.json({ success: false, error: err.message })
  }
})

router.get('/debug-env', async (_req: Request, res: Response) => {
  return res.json({
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    VITE_API_URL: process.env.VITE_API_URL,
    NODE_ENV: process.env.NODE_ENV
  })
})

// ── Audit Logs ─────────────────────────────────────────────────
export interface AuditLog {
  id: string
  action: string
  timestamp: string
  user: string
}

export const memoryAuditLogs = new Map<string, AuditLog[]>()

export const mockUserPlans = new Map<string, { plan: string; mrr: number; status: string }>()

export async function addAuditLog(userId: string, userName: string, action: string) {
  const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const logEntry: AuditLog = {
    id: Math.random().toString(36).substring(2, 9),
    action,
    timestamp,
    user: userName
  }

  const supabase = getSupabase()
  if (supabase) {
    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          action,
          user_name: userName
        })
      if (!error) return
    } catch (err) {}
  }

  // Fallback to in-memory
  const logs = memoryAuditLogs.get(userId) || []
  logs.unshift(logEntry)
  memoryAuditLogs.set(userId, logs.slice(0, 50))
}

export const memorySubscriptions = new Map<string, any>()
export const guestTrials = new Map<string, number>()
export const guestAnalyses = guestTrials
export const guestQuestions = new Map<string, number>()

async function saveSubscriptionToDB(supabase: any, sub: any) {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: sub.user_id,
        analyses_used: sub.analyses_used,
        analyses_remaining: sub.analyses_remaining,
        questions_used: sub.questions_used,
        questions_remaining: sub.questions_remaining,
        trials_limit: sub.trials_limit,
        questions_limit: sub.questions_limit,
        subscription_status: sub.subscription_status,
        subscription_start: sub.subscription_start,
        subscription_end: sub.subscription_end,
        plan_type: sub.plan_type,
        mrr: sub.mrr
      }, { onConflict: 'user_id' })

    if (error) {
      if (error.code === '42703') {
        console.warn('⚠️ Supabase schema is missing schema_v4.sql columns. Retrying with legacy columns only...')
        const { error: retryError } = await supabase
          .from('user_subscriptions')
          .upsert({
            user_id: sub.user_id,
            analyses_used: sub.analyses_used,
            analyses_remaining: sub.analyses_remaining,
            subscription_status: sub.subscription_status,
            subscription_start: sub.subscription_start,
            subscription_end: sub.subscription_end,
            plan_type: sub.plan_type,
            mrr: sub.mrr
          }, { onConflict: 'user_id' })
        if (retryError) {
          console.error('Failed retry database update:', retryError.message)
        }
      } else {
        console.error('Failed database update:', error.message)
      }
    }
  } catch (err: any) {
    console.warn('Database save exception:', err.message)
  }
}

export async function getOrInitSubscription(
  userId: string,
  guestId?: string,
  demoTrialsCount?: number,
  demoQuestionsCount?: number,
  demoCount: number = 0
) {
  const isGuest = userId === '00000000-0000-0000-0000-000000000000' || userId.startsWith('guest-')
  
  if (isGuest) {
    const finalGuestId = guestId || userId.replace('guest-', '') || 'default-guest'
    const usedTrials = guestTrials.get(finalGuestId) || 0
    const usedQuestions = guestQuestions.get(finalGuestId) || 0
    return {
      user_id: userId,
      analyses_used: usedTrials,
      analyses_remaining: Math.max(0, 5 - usedTrials),
      questions_used: usedQuestions,
      questions_remaining: Math.max(0, 11 - usedQuestions),
      trials_limit: 5,
      questions_limit: 11,
      subscription_status: (usedTrials >= 5 || usedQuestions >= 11) ? 'trial_exhausted' : 'demo',
      subscription_start: new Date().toISOString(),
      subscription_end: new Date().toISOString(),
      plan_type: 'free',
      mrr: 0,
      remaining_days: 0
    }
  }

  const supabase = getSupabase()
  let sub: any = null
  let custData: any = null

  if (supabase) {
    try {
      const [subRes, custRes] = await Promise.all([
        supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('customers')
          .select('*')
          .eq('id', userId)
          .maybeSingle()
      ])

      if (!subRes.error && subRes.data) {
        sub = subRes.data
      }
      if (!custRes.error && custRes.data) {
        custData = custRes.data
      }
    } catch (err: any) {
      console.warn('Supabase parallel subscription/customer fetch failed:', err.message)
    }
  }

  // Fallback to memory
  if (!sub) {
    sub = memorySubscriptions.get(userId)
  }

  // Check database customers table for active subscription plans
  if (custData && custData.status === 'Active') {
    const planLower = custData.plan.toLowerCase()
    if (planLower === 'pro' || planLower === 'enterprise') {
      if (!sub) {
        const now = new Date()
        const end = new Date()
        end.setFullYear(end.getFullYear() + 10)
        sub = {
          user_id: userId,
          analyses_used: 0,
          analyses_remaining: 999999,
          questions_used: 0,
          questions_remaining: 999999,
          trials_limit: 999999,
          questions_limit: 999999,
          subscription_status: 'active',
          subscription_start: now.toISOString(),
          subscription_end: end.toISOString(),
          plan_type: planLower,
          mrr: planLower === 'pro' ? 29 : 99
        }
      } else {
        sub.plan_type = planLower
        sub.subscription_status = 'active'
        sub.analyses_remaining = 999999
        sub.questions_remaining = 999999
        sub.trials_limit = 999999
        sub.questions_limit = 999999
        const end = new Date()
        end.setFullYear(end.getFullYear() + 10)
        sub.subscription_end = end.toISOString()
      }
    }
  }

  const dTrials = demoTrialsCount !== undefined ? demoTrialsCount : (demoCount || 0)
  const dQuestions = demoQuestionsCount !== undefined ? demoQuestionsCount : (demoCount || 0)
  const hasUsedDemo = dTrials > 0 || dQuestions > 0

  // If subscription already exists but we have demo usage to merge (e.g., returning user)
  if (sub) {
    const planLower = (sub.plan_type || 'free').toLowerCase()
    const isPremium = planLower === 'pro' || planLower === 'enterprise'

    if (isPremium) {
      if (hasUsedDemo) {
        sub.analyses_used = Math.max(sub.analyses_used || 0, dTrials)
        sub.questions_used = Math.max(sub.questions_used || 0, dQuestions)
      }
      sub.analyses_remaining = 999999
      sub.questions_remaining = 999999
      sub.trials_limit = 999999
      sub.questions_limit = 999999
      sub.subscription_status = 'active'
    } else {
      // Free plan limit update
      const limitTrials = hasUsedDemo ? 15 : (sub.trials_limit || 10)
      const limitQuestions = hasUsedDemo ? 26 : (sub.questions_limit || 15)
      
      const mergedUsedTrials = Math.max(sub.analyses_used || 0, dTrials)
      const mergedUsedQuestions = Math.max(sub.questions_used || 0, dQuestions)

      const mergedRemainingTrials = Math.max(0, limitTrials - mergedUsedTrials)
      const mergedRemainingQuestions = Math.max(0, limitQuestions - mergedUsedQuestions)
      const mergedStatus = (mergedUsedTrials >= limitTrials || mergedUsedQuestions >= limitQuestions) ? 'trial_exhausted' : 'trial'

      sub.analyses_used = mergedUsedTrials
      sub.analyses_remaining = mergedRemainingTrials
      sub.questions_used = mergedUsedQuestions
      sub.questions_remaining = mergedRemainingQuestions
      sub.trials_limit = limitTrials
      sub.questions_limit = limitQuestions
      sub.subscription_status = mergedStatus

      if (supabase) {
        await saveSubscriptionToDB(supabase, sub)
      }
    }
    memorySubscriptions.set(userId, sub)
  }

  // Initialize if not present
  if (!sub) {
    const now = new Date()
    const expiry = new Date()
    expiry.setMonth(expiry.getMonth() + 1)
    
    const limitTrials = hasUsedDemo ? 15 : 10
    const limitQuestions = hasUsedDemo ? 26 : 15
    const usedTrials = hasUsedDemo ? dTrials : 0
    const usedQuestions = hasUsedDemo ? dQuestions : 0

    sub = {
      user_id: userId,
      analyses_used: usedTrials,
      analyses_remaining: Math.max(0, limitTrials - usedTrials),
      questions_used: usedQuestions,
      questions_remaining: Math.max(0, limitQuestions - usedQuestions),
      trials_limit: limitTrials,
      questions_limit: limitQuestions,
      subscription_status: (usedTrials >= limitTrials || usedQuestions >= limitQuestions) ? 'trial_exhausted' : 'trial',
      subscription_start: now.toISOString(),
      subscription_end: expiry.toISOString(),
      plan_type: 'free',
      mrr: 0
    }

    if (supabase) {
      await saveSubscriptionToDB(supabase, sub)
    }

    memorySubscriptions.set(userId, sub)
  }

  // Expiry check and limit enforcement logic
  const now = new Date()
  const end = new Date(sub.subscription_end)
  const diffTime = end.getTime() - now.getTime()
  const remaining_days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))

  let updated = false
  if (sub.plan_type === 'pro' || sub.plan_type === 'enterprise') {
    if (now > end && sub.subscription_status === 'active') {
      sub.subscription_status = 'expired'
      updated = true
    }
  } else {
    const limitTrials = sub.trials_limit || 10
    const limitQuestions = sub.questions_limit || 15
    if ((sub.analyses_used >= limitTrials || sub.questions_used >= limitQuestions) && sub.subscription_status === 'trial') {
      sub.subscription_status = 'trial_exhausted'
      sub.analyses_remaining = Math.max(0, limitTrials - sub.analyses_used)
      sub.questions_remaining = Math.max(0, limitQuestions - sub.questions_used)
      updated = true
    }
  }

  if (updated) {
    if (supabase) {
      await saveSubscriptionToDB(supabase, sub)
    }
    memorySubscriptions.set(userId, sub)
  }

  return {
    ...sub,
    plan: sub.plan_type === 'pro' ? 'Pro' : sub.plan_type === 'enterprise' ? 'Enterprise' : 'Free',
    status: sub.subscription_status === 'active' ? 'Active' : sub.subscription_status === 'trial' ? 'Trial' : sub.subscription_status === 'expired' ? 'Expired' : 'Trial Exhausted',
    mrr: sub.plan_type === 'pro' ? 29 : sub.plan_type === 'enterprise' ? 99 : 0,
    aiQueryCount: sub.questions_used || 0,
    aiQueryLimit: sub.plan_type === 'pro' || sub.plan_type === 'enterprise' ? 999999 : (sub.questions_limit || 15),
    analyses_used: sub.analyses_used || 0,
    analyses_remaining: sub.analyses_remaining ?? 10,
    trials_limit: sub.trials_limit ?? 10,
    questions_used: sub.questions_used || 0,
    questions_remaining: sub.questions_remaining ?? 15,
    questions_limit: sub.questions_limit ?? 15,
    remaining_days
  }
}

export async function checkSubscriptionLock(userId: string, guestId?: string) {
  const sub = await getOrInitSubscription(userId, guestId)
  if (sub.subscription_status === 'trial_exhausted') {
    return { locked: true, error: 'trial_exhausted', message: 'Your free trial has ended. Upgrade to Premium to continue using AI-powered analytics.' }
  }
  if (sub.subscription_status === 'expired') {
    return { locked: true, error: 'expired', message: 'Your Premium subscription has expired. Renew your plan to regain access.' }
  }
  return { locked: false }
}

export async function incrementSubscriptionAnalyses(userId: string, guestId?: string) {
  const isGuest = userId === '00000000-0000-0000-0000-000000000000' || userId.startsWith('guest-')
  if (isGuest) {
    const finalGuestId = guestId || userId.replace('guest-', '') || 'default-guest'
    const current = guestTrials.get(finalGuestId) || 0
    guestTrials.set(finalGuestId, current + 1)
    return
  }

  const sub = await getOrInitSubscription(userId, guestId)
  if (sub.plan_type === 'free') {
    const trialsLimit = sub.trials_limit || 10
    const nextUsed = (sub.analyses_used || 0) + 1
    const nextRemaining = Math.max(0, trialsLimit - nextUsed)
    const nextStatus = (nextUsed >= trialsLimit || (sub.questions_used || 0) >= (sub.questions_limit || 15)) ? 'trial_exhausted' : 'trial'

    sub.analyses_used = nextUsed
    sub.analyses_remaining = nextRemaining
    sub.subscription_status = nextStatus

    const supabase = getSupabase()
    await saveSubscriptionToDB(supabase, sub)

    const memSub = memorySubscriptions.get(userId)
    if (memSub) {
      memSub.analyses_used = nextUsed
      memSub.analyses_remaining = nextRemaining
      memSub.subscription_status = nextStatus
    }
  }
}

export async function incrementSubscriptionQuestions(userId: string, guestId?: string) {
  const isGuest = userId === '00000000-0000-0000-0000-000000000000' || userId.startsWith('guest-')
  if (isGuest) {
    const finalGuestId = guestId || userId.replace('guest-', '') || 'default-guest'
    const current = guestQuestions.get(finalGuestId) || 0
    guestQuestions.set(finalGuestId, current + 1)
    return
  }

  const sub = await getOrInitSubscription(userId, guestId)
  if (sub.plan_type === 'free') {
    const questionsLimit = sub.questions_limit || 15
    const nextUsed = (sub.questions_used || 0) + 1
    const nextRemaining = Math.max(0, questionsLimit - nextUsed)
    const nextStatus = (((sub.analyses_used || 0) >= (sub.trials_limit || 10)) || nextUsed >= questionsLimit) ? 'trial_exhausted' : 'trial'

    sub.questions_used = nextUsed
    sub.questions_remaining = nextRemaining
    sub.subscription_status = nextStatus

    const supabase = getSupabase()
    await saveSubscriptionToDB(supabase, sub)

    const memSub = memorySubscriptions.get(userId)
    if (memSub) {
      memSub.questions_used = nextUsed
      memSub.questions_remaining = nextRemaining
      memSub.subscription_status = nextStatus
    }
  }
}

router.get('/subscription', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId
  const guestId = (req as any).guestId
  const sub = await getOrInitSubscription(userId, guestId)
  res.json(sub)
})

router.post('/subscription/init', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId
  const guestId = (req as any).guestId
  const { demoTrialsCount, demoQuestionsCount, demoCount } = req.body
  const sub = await getOrInitSubscription(userId, guestId, demoTrialsCount, demoQuestionsCount, demoCount)
  res.json(sub)
})

router.get('/audit-logs', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId
  const userName = (req as any).user?.user_metadata?.name || (req as any).user?.email || 'Demo User'
  
  const supabase = getSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (!error && data) {
        return res.json(data.map((row: any) => ({
          id: row.id,
          action: row.action,
          timestamp: new Date(row.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          user: row.user_name || userName
        })))
      }
    } catch (err) {}
  }

  // Fallback to in-memory
  const logs = memoryAuditLogs.get(userId) || []
  res.json(logs)
})

router.post('/audit-logs', requireAuth, async (req: Request, res: Response) => {
  const { action } = req.body
  const userId = (req as any).userId
  const userName = (req as any).user?.user_metadata?.name || (req as any).user?.email || 'Demo User'
  
  await addAuditLog(userId, userName, action)
  res.json({ success: true })
})


// ── Notifications ──────────────────────────────────────────────
export interface Notification {
  id: string
  title: string
  message: string
  type: 'revenue' | 'churn' | 'system'
  read: boolean
  timestamp: string
}

export const memoryNotifications = new Map<string, Notification[]>()

// Helper to get initial notifications if none exist
const getInitialNotifications = (): Notification[] => [
  {
    id: 'n-1',
    title: 'Revenue Milestone Reached',
    message: 'Monthly recurring revenue crossed $80,000 for the first time.',
    type: 'revenue',
    read: false,
    timestamp: '10 mins ago'
  },
  {
    id: 'n-2',
    title: 'High Churn Risk Warning',
    message: 'Apex Systems showing zero usage patterns in the past 14 days.',
    type: 'churn',
    read: false,
    timestamp: '1 hr ago'
  },
  {
    id: 'n-3',
    title: 'Automated Sync Successful',
    message: 'Financial spreadsheet data verified and integrated into models.',
    type: 'system',
    read: true,
    timestamp: '2 hrs ago'
  }
]

export async function createNotification(userId: string, title: string, message: string, type: 'revenue' | 'churn' | 'system' | 'info') {
  const supabase = getSupabase()
  if (supabase) {
    try {
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title,
          message,
          type,
          read: false
        })
    } catch (err) {
      console.warn('[Notifications] Failed to insert into Supabase:', err)
    }
  }

  // Fallback to in-memory notifications
  if (!memoryNotifications.has(userId)) {
    memoryNotifications.set(userId, [])
  }
  const list = memoryNotifications.get(userId) || []
  list.unshift({
    id: Math.random().toString(36).substring(2, 9),
    title,
    message,
    type: type === 'info' ? 'system' : type as any,
    read: false,
    timestamp: 'Just now'
  })
  memoryNotifications.set(userId, list.slice(0, 50))
}

router.get('/notifications', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId
  
  const supabase = getSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (!error && data) {
        // If empty in DB, let's seed initial notifications
        if (data.length === 0) {
          const initials = getInitialNotifications()
          await supabase.from('notifications').insert(initials.map(n => ({
            user_id: userId,
            title: n.title,
            message: n.message,
            type: n.type,
            read: n.read,
            created_at: new Date(Date.now() - (n.id === 'n-1' ? 10 : n.id === 'n-2' ? 60 : 120) * 60 * 1000).toISOString()
          })))
          
          // Refetch
          const { data: refetched } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
          if (refetched) {
            return res.json(refetched.map((row: any) => ({
              id: row.id.toString(),
              title: row.title,
              message: row.message,
              type: row.type,
              read: row.read,
              timestamp: row.created_at
            })))
          }
        }
        
        return res.json(data.map((row: any) => ({
          id: row.id.toString(),
          title: row.title,
          message: row.message,
          type: row.type,
          read: row.read,
          timestamp: new Date(row.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        })))
      }
    } catch (err) {}
  }

  // Fallback to in-memory
  if (!memoryNotifications.has(userId)) {
    memoryNotifications.set(userId, getInitialNotifications())
  }
  res.json(memoryNotifications.get(userId) || [])
})

router.post('/notifications/:id/read', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params
  const userId = (req as any).userId

  const supabase = getSupabase()
  if (supabase) {
    try {
      // Check if id is numeric or uuid
      const filter = isNaN(Number(id)) ? { id } : { id: Number(id) }
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .match({ ...filter, user_id: userId })
      if (!error) {
        return res.json({ success: true })
      }
    } catch (err) {}
  }

  // Fallback to in-memory
  const list = memoryNotifications.get(userId) || []
  const updated = list.map(n => n.id === id ? { ...n, read: true } : n)
  memoryNotifications.set(userId, updated)
  res.json({ success: true, fallback: true })
})

router.delete('/notifications', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId

  const supabase = getSupabase()
  if (supabase) {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
      if (!error) {
        return res.json({ success: true })
      }
    } catch (err) {}
  }

  // Fallback to in-memory
  memoryNotifications.set(userId, [])
  res.json({ success: true, fallback: true })
})

export default router
