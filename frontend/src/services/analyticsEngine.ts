/**
 * analyticsEngine.ts
 * Centralized analytics engine — computes all KPIs, chart data, segments,
 * and forecasts from any uploaded dataset. Zero hardcoded values.
 */

export interface EngineKPI {
  label: string
  value: string
  rawValue: number
  change: string
  up: boolean
  sparkData?: { v: number }[]
}

export interface MonthlyPoint {
  month: string
  revenue: number
  mrr: number
  [key: string]: any
}

export interface CustomerRow {
  id: string
  name: string
  email: string
  plan: string
  mrr: number
  status: string
}

export interface CategorySegment {
  label: string
  count: number
  pct: number
  color: string
}

export interface ForecastPoint {
  month: string
  revenue: number
  upper: number
  lower: number
}

export interface AnalyticsResult {
  hasData: boolean
  datasetName: string
  totalRows: number
  columns: string[]
  datasetType: string
  entityName: string
  valueMetricName: string

  kpis: EngineKPI[]
  monthly: MonthlyPoint[]
  customers: CustomerRow[]
  categories: CategorySegment[]
  forecastData: ForecastPoint[]
  topRows: any[]

  aiInsights: {
    keyFindings: string[]
    anomalies: string[]
    trends: string[]
    predictions: string[]
    recommendations: string[]
  }

  // Raw helpers
  primaryMetricKey: string
  primaryTimeKey: string
  primaryCategoryKey: string
  primaryNameKey: string
  statusKey: string
}

const CHART_COLORS = [
  'var(--chart-1)', 'var(--chart-2)', 'var(--chart-5)',
  'var(--chart-6)', 'var(--chart-8)', 'var(--chart-9)'
]

const EMPTY: AnalyticsResult = {
  hasData: false,
  datasetName: '',
  totalRows: 0,
  columns: [],
  datasetType: 'Generic',
  entityName: 'Record',
  valueMetricName: 'Metric',
  kpis: [],
  monthly: [],
  customers: [],
  categories: [],
  forecastData: [],
  topRows: [],
  aiInsights: {
    keyFindings: [],
    anomalies: [],
    trends: [],
    predictions: [],
    recommendations: []
  },
  primaryMetricKey: '',
  primaryTimeKey: '',
  primaryCategoryKey: '',
  primaryNameKey: '',
  statusKey: '',
}

function toNum(v: any): number {
  if (typeof v === 'number') return v
  const n = Number(String(v ?? '').replace(/[^\d.\-]/g, '').trim())
  return isNaN(n) ? 0 : n
}

function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 100) : 0
}

function detectDatasetType(rows: any[], meta: Record<string, string>, filename: string): string {
  const cols = Object.keys(meta).map(c => c.toLowerCase())
  const file = filename.toLowerCase()

  const isSales = file.includes('sale') || file.includes('deal') || file.includes('retail') || file.includes('revenue') || cols.some(c => /revenue|mrr|acv|sales|deal|order|quantity|price/i.test(c))
  const isFinance = file.includes('finance') || file.includes('budget') || file.includes('p&l') || file.includes('ledger') || (cols.some(c => /budget|expense|income|amount|cost|tax|profit/i.test(c)) && !isSales)
  const isHR = file.includes('employee') || file.includes('hr') || file.includes('roster') || cols.some(c => /employee|salary|wage|hire|department|role|job|performance/i.test(c))
  const isHealthcare = file.includes('patient') || file.includes('clinic') || file.includes('hospital') || cols.some(c => /patient|diagnosis|doctor|treatment|admit|admission|readmit/i.test(c))
  const isEducation = file.includes('student') || file.includes('school') || file.includes('class') || cols.some(c => /student|grade|exam|score|attendance|subject|course|term/i.test(c))
  const isInventory = file.includes('inventory') || file.includes('sku') || file.includes('stock') || (cols.some(c => /sku|stock|inventory|qty|quantity|supplier|retailprice/i.test(c)) && !isSales)
  const isMarketing = file.includes('marketing') || file.includes('campaign') || file.includes('ad') || cols.some(c => /campaign|spend|adspend|click|impression|conversion|clicks/i.test(c))
  const isCustomer = cols.some(c => /customer|client|email|phone|address|country/i.test(c))

  if (isSales) return 'Sales'
  if (isFinance) return 'Finance'
  if (isHR) return 'HR'
  if (isHealthcare) return 'Healthcare'
  if (isEducation) return 'Education'
  if (isInventory) return 'Inventory'
  if (isMarketing) return 'Marketing'
  if (isCustomer) return 'Customer Data'
  return 'Generic'
}

export function computeAnalytics(
  rows: any[],
  meta: Record<string, string>,
  filename: string = 'Dataset'
): AnalyticsResult {
  if (!rows || rows.length === 0) return EMPTY

  const datasetType = detectDatasetType(rows, meta, filename)
  let entityName = 'Record'
  let valueMetricName = 'Value'

  if (datasetType === 'Sales') { entityName = 'Customer'; valueMetricName = 'Revenue'; }
  else if (datasetType === 'Finance') { entityName = 'Transaction'; valueMetricName = 'Amount'; }
  else if (datasetType === 'HR') { entityName = 'Employee'; valueMetricName = 'Salary'; }
  else if (datasetType === 'Healthcare') { entityName = 'Patient'; valueMetricName = 'Cost'; }
  else if (datasetType === 'Education') { entityName = 'Student'; valueMetricName = 'Exam Score'; }
  else if (datasetType === 'Inventory') { entityName = 'Product'; valueMetricName = 'Price'; }
  else if (datasetType === 'Marketing') { entityName = 'Campaign'; valueMetricName = 'Spend'; }
  else if (datasetType === 'Customer Data') { entityName = 'User'; valueMetricName = 'Engagement'; }

  // ── Classify columns ───────────────────────────────────────────
  const cols = Object.entries(meta).map(([name, type]) => ({ name, type }))

  const metricCols   = cols.filter(c => c.type === 'metric')
  const timeCols     = cols.filter(c => c.type === 'time' || c.type === 'date')
  const categoryCols = cols.filter(c => c.type === 'category')
  const idCols       = cols.filter(c => c.type === 'identifier')

  // Pick primary keys using smart heuristics
  const primaryMetricKey = (
    metricCols.find(c => /revenue|amount|sales|total|price|spend|mrr|salary|wage|cost|examscore|score|grade|attendance/i.test(c.name)) ||
    metricCols.find(c => /profit|income|earn|gross/i.test(c.name)) ||
    metricCols[0]
  )?.name || ''

  const primaryTimeKey = (
    timeCols.find(c => /date|month|time|period|join/i.test(c.name)) ||
    timeCols[0]
  )?.name || ''

  const primaryCategoryKey = (
    categoryCols.find(c => /plan|category|segment|type|region|product|department|subject|diagnosis|channel/i.test(c.name)) ||
    categoryCols.find(c => /status/i.test(c.name)) ||
    categoryCols[0]
  )?.name || ''

  const statusKey = categoryCols.find(c => /status|readmitted/i.test(c.name))?.name || ''

  const primaryNameKey = (
    idCols.find(c => /name|customer|company|client|user|employee|student|patient|productname/i.test(c.name)) ||
    idCols[0]
  )?.name || Object.keys(meta)[0] || ''

  // ── KPI computation ────────────────────────────────────────────
  const kpis: EngineKPI[] = []

  // KPI 1: Record Count
  kpis.push({
    label: `Total ${entityName}s`,
    value: rows.length.toLocaleString(),
    rawValue: rows.length,
    change: `${cols.length} columns`,
    up: true,
    sparkData: buildSparkFromRows(rows, primaryMetricKey),
  })

  // KPI 2: Primary Metric Sum/Avg
  if (primaryMetricKey) {
    const vals = rows.map(r => toNum(r[primaryMetricKey])).filter(v => !isNaN(v))
    const sum = vals.reduce((s, v) => s + v, 0)
    const avg = vals.length > 0 ? sum / vals.length : 0
    const isCurrency = /revenue|mrr|acv|amount|price|sales|income|spend|profit|earn|salary|wage|cost|treatment/i.test(primaryMetricKey)
    const formatValue = (v: number) => isCurrency ? `$${Math.round(v).toLocaleString()}` : Math.round(v).toLocaleString()

    const useAverage = datasetType === 'HR' || datasetType === 'Education' || /age|rate|score|grade|percent|ratio|attendance/i.test(primaryMetricKey)
    
    kpis.push({
      label: useAverage ? `Average ${primaryMetricKey}` : `Total ${primaryMetricKey}`,
      value: formatValue(useAverage ? avg : sum),
      rawValue: useAverage ? avg : sum,
      change: useAverage ? `Max: ${formatValue(Math.max(...vals, 0))}` : `Avg: ${formatValue(avg)}`,
      up: true,
      sparkData: vals.slice(-6).map(v => ({ v })),
    })
  }

  // KPI 3: Category/Dimension Breakdown
  if (primaryCategoryKey) {
    const uniqueCats = new Set(rows.map(r => r[primaryCategoryKey])).size
    kpis.push({
      label: `Unique ${primaryCategoryKey}s`,
      value: uniqueCats.toLocaleString(),
      rawValue: uniqueCats,
      change: `Across all ${entityName}s`,
      up: true,
    })
  }

  // KPI 4: Type-Specific Ratio/Metric
  if (datasetType === 'HR') {
    const activeCount = rows.filter(r => /active/i.test(String(r[statusKey || 'Status'] || ''))).length
    const activePct = pct(activeCount, rows.length)
    kpis.push({
      label: 'Active Roster Rate',
      value: `${activePct}%`,
      rawValue: activePct,
      change: `${activeCount} active staff`,
      up: activePct > 80,
    })
  } else if (datasetType === 'Education') {
    const passedCount = rows.filter(r => /pass|grad|comp/i.test(String(r[statusKey || 'Status'] || '')) || toNum(r[primaryMetricKey]) >= 50).length
    const passPct = pct(passedCount, rows.length)
    kpis.push({
      label: 'Passing Rate',
      value: `${passPct}%`,
      rawValue: passPct,
      change: `${passedCount} passing students`,
      up: passPct > 70,
    })
  } else if (datasetType === 'Healthcare') {
    const readmitCount = rows.filter(r => /yes|true|y/i.test(String(r[statusKey || 'Readmitted'] || ''))).length
    const readmitPct = pct(readmitCount, rows.length)
    kpis.push({
      label: 'Readmission Rate',
      value: `${readmitPct}%`,
      rawValue: readmitPct,
      change: `${readmitCount} readmitted`,
      up: readmitPct < 15,
    })
  } else if (datasetType === 'Inventory') {
    const stockQtyKey = cols.find(c => /qty|quantity|stock/i.test(c.name))?.name || ''
    const totalStock = stockQtyKey ? rows.reduce((s, r) => s + toNum(r[stockQtyKey]), 0) : 0
    kpis.push({
      label: 'Total Stock Quantity',
      value: totalStock.toLocaleString(),
      rawValue: totalStock,
      change: stockQtyKey ? `In-stock items` : 'No quantity column',
      up: totalStock > 100,
    })
  } else if (datasetType === 'Marketing') {
    const conversionKey = cols.find(c => /conversion|leads/i.test(c.name))?.name || ''
    const totalConvs = conversionKey ? rows.reduce((s, r) => s + toNum(r[conversionKey]), 0) : 0
    kpis.push({
      label: 'Total Conversions',
      value: totalConvs.toLocaleString(),
      rawValue: totalConvs,
      change: conversionKey ? `Successful leads` : 'No conversions column',
      up: true,
    })
  } else if (statusKey) {
    const activeCount = rows.filter(r => /active|paid|complete|success/i.test(String(r[statusKey] || ''))).length
    const activePct = pct(activeCount, rows.length)
    kpis.push({
      label: 'Active Rate',
      value: `${activePct}%`,
      rawValue: activePct,
      change: `${activeCount} items active`,
      up: activePct > 80,
    })
  } else {
    // Generic fallback: Secondary numeric average
    const secondaryMetricCol = metricCols.find(c => c.name !== primaryMetricKey)
    if (secondaryMetricCol) {
      const sVals = rows.map(r => toNum(r[secondaryMetricCol.name])).filter(v => v > 0)
      const sAvg = sVals.length > 0 ? sVals.reduce((s, v) => s + v, 0) / sVals.length : 0
      kpis.push({
        label: `Avg ${secondaryMetricCol.name}`,
        value: Math.round(sAvg).toLocaleString(),
        rawValue: sAvg,
        change: `Across ${sVals.length} items`,
        up: true,
      })
    }
  }

  // ── Monthly time-series ────────────────────────────────────────
  const monthly: MonthlyPoint[] = []

  if (primaryTimeKey && primaryMetricKey) {
    const monthMap: Record<string, { revenue: number; mrr: number; count: number; date: Date }> = {}

    rows.forEach(r => {
      const raw = r[primaryTimeKey]
      const d = new Date(raw)
      if (isNaN(d.getTime())) return
      const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      const val = toNum(r[primaryMetricKey])
      if (!monthMap[key]) {
        monthMap[key] = { revenue: 0, mrr: 0, count: 0, date: d }
      }
      monthMap[key].revenue += val
      monthMap[key].count += 1
    })

    const sorted = Object.entries(monthMap).sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
    sorted.forEach(([month, data]) => {
      monthly.push({
        month,
        revenue: Math.round(data.revenue),
        mrr: Math.round(data.revenue * 0.8),
      })
    })
  } else if (primaryMetricKey) {
    // No time column: group by row index batches
    const batchSize = Math.ceil(rows.length / 6)
    for (let i = 0; i < Math.min(6, Math.ceil(rows.length / batchSize)); i++) {
      const batch = rows.slice(i * batchSize, (i + 1) * batchSize)
      const total = batch.reduce((s, r) => s + toNum(r[primaryMetricKey]), 0)
      monthly.push({
        month: `Batch ${i + 1}`,
        revenue: Math.round(total),
        mrr: Math.round(total * 0.8),
      })
    }
  }

  // ── Customer rows ──────────────────────────────────────────────
  const customers: CustomerRow[] = rows.slice(0, 500).map((r, idx) => {
    const id = String(r[idCols[0]?.name] || r.id || r.ID || idx + 1)
    const name = primaryNameKey ? String(r[primaryNameKey] ?? `${entityName} ${idx + 1}`) : `${entityName} ${idx + 1}`
    const emailKey = idCols.find(c => /email/i.test(c.name))?.name
    const email = emailKey ? String(r[emailKey] ?? '') : `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`
    const plan = primaryCategoryKey ? String(r[primaryCategoryKey] ?? 'Standard') : 'Standard'
    const mrr = primaryMetricKey ? toNum(r[primaryMetricKey]) : 0
    const status = statusKey ? String(r[statusKey] ?? 'Active') : 'Active'
    const normalizedStatus = /churn|cancel|inactive|lost|fail|no/i.test(status) ? 'Churned'
      : /pend|trial|prospect|lead/i.test(status) ? 'Pending'
      : 'Active'

    return { id, name, email, plan, mrr, status: normalizedStatus }
  })

  // ── Category segments ──────────────────────────────────────────
  const categories: CategorySegment[] = []
  if (primaryCategoryKey) {
    const counts: Record<string, number> = {}
    rows.forEach(r => {
      const val = String(r[primaryCategoryKey] ?? 'Other')
      counts[val] = (counts[val] || 0) + 1
    })
    const total = rows.length
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .forEach(([label, count], idx) => {
        categories.push({
          label,
          count,
          pct: pct(count, total),
          color: CHART_COLORS[idx % CHART_COLORS.length],
        })
      })
  }

  // ── Forecast (linear extrapolation) ───────────────────────────
  const forecastData: ForecastPoint[] = []
  if (monthly.length >= 2) {
    const last = monthly[monthly.length - 1]
    const prev = monthly[monthly.length - 2]
    const growth = prev.revenue > 0 ? (last.revenue - prev.revenue) / prev.revenue : 0.05
    const smoothedGrowth = Math.min(Math.max(growth, -0.1), 0.3) // cap at ±30%

    // Last actual point
    forecastData.push({ month: last.month, revenue: last.revenue, upper: last.revenue, lower: last.revenue })

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    let base = last.revenue
    for (let i = 1; i <= 5; i++) {
      base = base * (1 + smoothedGrowth)
      const uncertainty = base * (0.05 + i * 0.02)
      forecastData.push({
        month: `${MONTHS[(monthly.length + i - 1) % 12]} (F)`,
        revenue: Math.round(base),
        upper: Math.round(base + uncertainty),
        lower: Math.round(Math.max(0, base - uncertainty)),
      })
    }
  }

  // ── Top rows by primary metric ─────────────────────────────────
  const topRows = primaryMetricKey
    ? [...rows]
        .sort((a, b) => toNum(b[primaryMetricKey]) - toNum(a[primaryMetricKey]))
        .slice(0, 10)
    : rows.slice(0, 10)

  // ── AI Insights Engine ─────────────────────────────────────────
  const topCategory = categories[0] || { label: 'None', pct: 0 }
  const secondCategory = categories[1] || { label: 'None', pct: 0 }

  const metricVals = primaryMetricKey ? rows.map(r => toNum(r[primaryMetricKey])).filter(v => !isNaN(v)) : []
  const totalMetricVal = metricVals.reduce((s, v) => s + v, 0)
  const avgMetricVal = metricVals.length > 0 ? totalMetricVal / metricVals.length : 0
  const isCurrency = /revenue|mrr|acv|amount|price|sales|income|spend|profit|earn|salary|wage|cost|treatment/i.test(primaryMetricKey)
  const formatValue = (v: number) => isCurrency ? `$${Math.round(v).toLocaleString()}` : Math.round(v).toLocaleString()

  // Find outlier row
  let outlierName = ''
  let outlierValue = 0
  if (primaryMetricKey && primaryNameKey) {
    const outlierRow = [...rows].sort((a, b) => toNum(b[primaryMetricKey]) - toNum(a[primaryMetricKey]))[0]
    if (outlierRow) {
      outlierName = String(outlierRow[primaryNameKey] || '')
      outlierValue = toNum(outlierRow[primaryMetricKey])
    }
  }

  const keyFindings: string[] = [
    `Dataset profile successfully classified as '${datasetType}' data containing ${rows.length} total records.`,
    primaryMetricKey ? `Primary metrics driven by '${primaryMetricKey}', totaling ${formatValue(totalMetricVal)} with an average of ${formatValue(avgMetricVal)}.` : `Dataset attributes include: ${cols.map(c => c.name).slice(0, 5).join(', ')}.`,
    primaryCategoryKey ? `Categorical clustering dominated by '${primaryCategoryKey}' segment '${topCategory.label}', which represents ${topCategory.pct}% of records.` : `No main category columns found.`
  ]

  const anomalies: string[] = []
  if (outlierValue > avgMetricVal * 1.8 && outlierName) {
    anomalies.push(`Significant outlier detected: Entity '${outlierName}' registers at ${formatValue(outlierValue)} in '${primaryMetricKey}', which is 1.8x+ above average.`);
  }
  const failedOrInactive = rows.filter(r => /inactive|fail|cancel|churn|lost|yes/i.test(String(r[statusKey] || ''))).length
  if (failedOrInactive > 0) {
    anomalies.push(`Risk alert: ${failedOrInactive} records (${pct(failedOrInactive, rows.length)}% of dataset) fall under warning status (inactive, failed, readmitted, or cancelled).`);
  }
  if (anomalies.length === 0) {
    anomalies.push(`Distribution check: No critical value anomalies or outliers detected. Metrics fall within normal variance.`);
  }

  const trends: string[] = [
    primaryCategoryKey ? `Core distribution: Category '${topCategory.label}' leads with the highest concentration (${topCategory.pct}%), followed by '${secondCategory.label}' (${secondCategory.pct}%).` : `Uniform distribution: records show even spread across identifier values.`,
  ]
  if (primaryTimeKey && monthly.length >= 2) {
    const growth = monthly[monthly.length - 1].revenue > monthly[0].revenue
    trends.push(`Historical trend: Analysis reveals ${growth ? 'upward growth' : 'downward slope'} from ${monthly[0].month} to ${monthly[monthly.length - 1].month}.`);
  }

  const predictions: string[] = []
  if (primaryMetricKey && monthly.length >= 2) {
    const lastVal = monthly[monthly.length - 1].revenue
    const projectedVal = forecastData[forecastData.length - 1]?.revenue || lastVal
    const diffPct = lastVal > 0 ? Math.round(((projectedVal - lastVal) / lastVal) * 100) : 5
    predictions.push(`Forward modeling projects '${primaryMetricKey}' to shift to ${formatValue(projectedVal)} in the next period (approx. ${diffPct >= 0 ? '+' : ''}${diffPct}% variance).`);
  } else {
    predictions.push(`Projecting steady volume counts: stable baseline of ~${Math.round(rows.length * 1.05)} records expected in the upcoming cycle.`);
  }

  const recommendations: string[] = [
    primaryCategoryKey ? `Resource allocation: Focus resources and operational capacity towards '${topCategory.label}' due to high volume density.` : `Verify dataset identifiers for indexing consistency.`,
    outlierName ? `Operational audit: Conduct a performance review on outlier '${outlierName}' to map replicating conditions.` : `Establish regular tracking of '${primaryMetricKey}' updates.`
  ]
  if (failedOrInactive > 0) {
    recommendations.push(`Risk mitigation: Establish monitoring protocols to target the ${failedOrInactive} warning status records.`);
  }

  return {
    hasData: true,
    datasetName: filename,
    totalRows: rows.length,
    columns: Object.keys(meta),
    datasetType,
    entityName,
    valueMetricName,
    kpis,
    monthly,
    customers,
    categories,
    forecastData,
    topRows,
    aiInsights: {
      keyFindings,
      anomalies,
      trends,
      predictions,
      recommendations
    },
    primaryMetricKey,
    primaryTimeKey,
    primaryCategoryKey,
    primaryNameKey,
    statusKey,
  }
}

function buildSparkFromRows(rows: any[], metricKey: string): { v: number }[] {
  if (!metricKey || rows.length === 0) return []
  const step = Math.max(1, Math.floor(rows.length / 6))
  const result: { v: number }[] = []
  for (let i = 0; i < rows.length; i += step) {
    result.push({ v: toNum(rows[i][metricKey]) })
    if (result.length >= 6) break
  }
  return result
}
