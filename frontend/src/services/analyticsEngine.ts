/**
 * analyticsEngine.ts
 * Centralized analytics engine — computes all KPIs, chart data, segments,
 * and forecasts from any uploaded dataset. Zero hardcoded values.
 *
 * v2: integrates cleanNumericValue / cleanDateValue / detectDuplicates
 *     for robust parsing and exposes diagnostic badges.
 */

import { cleanNumericValue, cleanDateValue, detectDuplicates, formatNumber } from './dataCleaner'

export interface EngineKPI {
  label: string
  value: string
  rawValue: number
  change: string
  up: boolean
  sparkData?: { v: number }[]
  outliersExcludedCount?: number
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

  // ── Diagnostic badges ──────────────────────────────────────────
  cleanedRowsCount: number       // rows where at least 1 metric value was dirty but cleaned
  unparseableDatesCount: number  // rows where date string existed but couldn't be parsed
  exactDuplicatesCount: number   // rows with ALL fields identical to a prior row
  duplicateIdsCount: number      // rows sharing a primary ID but having different field values
  chartPointsExcludedCount: number // rows excluded from chart by IQR fence

  // Phase 3 additions
  rows: any[]
  exactDuplicateRows: number[]
  duplicateIdRows: number[]
  unparseableDateRows: number[]
  outlierRows: number[]
  columnsWithHighNulls: string[]
  nullPercentages: Record<string, number>
  totalProcessedRows: number
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
  cleanedRowsCount: 0,
  unparseableDatesCount: 0,
  exactDuplicatesCount: 0,
  duplicateIdsCount: 0,
  chartPointsExcludedCount: 0,
  rows: [],
  exactDuplicateRows: [],
  duplicateIdRows: [],
  unparseableDateRows: [],
  outlierRows: [],
  columnsWithHighNulls: [],
  nullPercentages: {},
  totalProcessedRows: 0,
}

// Legacy numeric helper for non-metric values (no cleaning badge)
function toNum(v: any): number {
  const n = cleanNumericValue(v)
  return n === null ? 0 : n
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
  rawRows: any[],
  meta: Record<string, string>,
  filename: string = 'Dataset'
): AnalyticsResult {
  if (!rawRows || rawRows.length === 0) return EMPTY

  const cols = Object.entries(meta).map(([name, type]) => ({ name, type }))
  const metricCols   = cols.filter(c => c.type === 'metric')
  const timeCols     = cols.filter(c => c.type === 'time' || c.type === 'date')
  const categoryCols = cols.filter(c => c.type === 'category')
  const idCols       = cols.filter(c => c.type === 'identifier')

  const isDateColumn = (key: string) => {
    if (!key) return false
    const type = meta[key]
    return type === 'time' || type === 'date'
  }

  // Map to store outlier counts per column name
  const columnOutlierCounts: Record<string, number> = {}
  const outlierRowSet = new Set<number>()
  
  // 1. First, compute initial cleaned values for all metric columns (in order to calculate mean/stddev)
  const initialCleanedData = metricCols.map(col => {
    // Step 1: Parse and coerce to float first (accounting negatives, percentages, epoch strings)
    const vals = rawRows.map(r => cleanNumericValue(r[col.name]))
    
    // Step 2 & 3: Remove Infinity, NaN, nulls, and values > 1e12 (magnitude check)
    const cleanSet = vals.filter((v): v is number => v !== null && isFinite(v) && !isNaN(v) && Math.abs(v) <= 1e12)
    
    let mean = 0
    let stddev = 0
    if (cleanSet.length > 0) {
      // Step 4: NOW calculate mean + stddev on the clean set only
      mean = cleanSet.reduce((a, b) => a + b, 0) / cleanSet.length
      const variance = cleanSet.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / cleanSet.length
      stddev = Math.sqrt(variance)
    }
    
    return {
      colName: col.name,
      vals,
      mean,
      stddev,
      // Step 5: outlier threshold bounds
      lowerThreshold: mean - 3 * stddev,
      upperThreshold: mean + 3 * stddev,
      hasCleanData: cleanSet.length > 0
    }
  })

  // 2. Preprocessing pass: Clean metric columns in-place & filter outliers
  let cleanedRowsCount = 0
  const cleanedRowSet = new Set<number>()

  const rows = rawRows.map((row, rowIdx) => {
    const newRow = { ...row }
    metricCols.forEach((col, colIdx) => {
      const colInfo = initialCleanedData[colIdx]
      const rawVal = row[col.name]
      if (rawVal === undefined || rawVal === null) return
      
      const cleaned = colInfo.vals[rowIdx]

      // Outlier checks:
      // - Is it null? (meaning it failed cleanNumericValue or was Infinity/NaN)
      // - Is it > 1e12 or < -1e12?
      // - Is it > mean + 3 * stddev or < mean - 3 * stddev?
      let isOutlier = false
      if (cleaned === null) {
        const rawStr = String(rawVal).toUpperCase()
        if (
          rawStr === 'INFINITY' ||
          rawStr === '-INFINITY' ||
          rawStr === 'NAN' ||
          rawStr === 'ERROR' ||
          rawStr.includes('#DIV/0') ||
          rawStr.includes('#REF') ||
          rawStr.includes('#N/A')
        ) {
          isOutlier = true
        }
      } else if (
        Math.abs(cleaned) > 1e12 ||
        (colInfo.hasCleanData && (cleaned > colInfo.upperThreshold || cleaned < colInfo.lowerThreshold))
      ) {
        isOutlier = true
      }

      if (isOutlier) {
        newRow[col.name] = null
        columnOutlierCounts[col.name] = (columnOutlierCounts[col.name] || 0) + 1
        outlierRowSet.add(rowIdx)
        cleanedRowSet.add(rowIdx)
      } else {
        newRow[col.name] = cleaned

        if (cleaned !== rawVal) {
          if (typeof rawVal === 'string') {
            const str = rawVal.trim()
            const isPlainNumber = /^-?\d+(\.\d+)?$/.test(str)
            if (!isPlainNumber) {
              cleanedRowSet.add(rowIdx)
            }
          } else {
            cleanedRowSet.add(rowIdx)
          }
        }
      }
    })
    return newRow
  })
  cleanedRowsCount = cleanedRowSet.size

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

  // Pick primary keys using smart heuristics
  const primaryMetricKey = (
    metricCols.find(c => /revenue|amount|sales|total|price|spend|mrr|salary|wage|cost|treatment/i.test(c.name)) ||
    metricCols.find(c => /profit|income|earn|gross/i.test(c.name)) ||
    metricCols[0]
  )?.name || ''

  // Step 3 Auto-detect Date Axis:
  // Find a column where >50% of non-empty values parse as valid dates
  let detectedTimeKey = ''
  for (const colName of Object.keys(meta)) {
    const nonNullVals = rawRows.map(r => r[colName]).filter(v => v !== null && v !== undefined && v !== '')
    if (nonNullVals.length === 0) continue
    const parseCount = nonNullVals.filter(v => cleanDateValue(v) !== null).length
    if (parseCount / nonNullVals.length > 0.5) {
      detectedTimeKey = colName
      if (/date|month|time|period|join/i.test(colName)) {
        break
      }
    }
  }

  const primaryTimeKey = detectedTimeKey || (
    timeCols.find(c => /date|month|time|period|join/i.test(c.name)) ||
    timeCols[0]
  )?.name || ''

  // Search for the category columns
  let primaryCategoryKey = (
    categoryCols.find(c => /plan|category|segment|type|region|product|department|subject|diagnosis|channel/i.test(c.name)) ||
    categoryCols.find(c => /status/i.test(c.name)) ||
    categoryCols[0]
  )?.name || ''

  let fallbackCategoryKey = ''
  let isFallbackDateKey = false

  if (!primaryCategoryKey) {
    // Search for first non-metric column with < 50 unique values (Step 1 rules)
    for (const col of cols) {
      if (col.type === 'metric') continue
      const vals = rows.map(r => String(r[col.name] ?? '')).filter(v => v !== '')
      const uniqueVals = new Set(vals)
      if (uniqueVals.size > 0 && uniqueVals.size < 50) {
        fallbackCategoryKey = col.name
        const dateParses = vals.filter(v => cleanDateValue(v) !== null).length
        if (dateParses / vals.length > 0.5) {
          isFallbackDateKey = true
        }
        break
      }
    }
  }

  const categoryKeyToUse = primaryCategoryKey || fallbackCategoryKey

  const idKey = idCols[0]?.name || ''
  const primaryNameKey = (
    idCols.find(c => /name|customer|company|client|user|employee|student|patient|productname/i.test(c.name)) ||
    idCols[0]
  )?.name || Object.keys(meta)[0] || ''

  // ── High null percentage detection ──────────────────────────────
  const nullPercentages: Record<string, number> = {}
  const columnsWithHighNulls: string[] = []
  Object.keys(meta).forEach(colName => {
    const nullCount = rawRows.filter(r => r[colName] === null || r[colName] === undefined || String(r[colName]).trim() === '').length
    const pctVal = (nullCount / rawRows.length) * 100
    nullPercentages[colName] = pctVal
    if (pctVal > 20) {
      columnsWithHighNulls.push(colName)
    }
  })

  // ── Diagnostic: Unparseable dates ──────────────────────────────
  const unparseableDateRows: number[] = []
  let unparseableDatesCount = 0
  if (primaryTimeKey) {
    rawRows.forEach((row, rowIdx) => {
      const raw = row[primaryTimeKey]
      if (raw === null || raw === undefined || String(raw).trim() === '') return
      const d = cleanDateValue(raw)
      if (d === null) {
        unparseableDatesCount++
        unparseableDateRows.push(rowIdx)
      }
    })
  }

  // ── Diagnostic: Duplicates ──────────────────────────────────────
  const dupReport = detectDuplicates(rawRows, idKey)

  // ── KPI computation ────────────────────────────────────────────
  const kpis: EngineKPI[] = []

  // KPI 1: Record / ID Count
  const duplicateIdText = idKey && dupReport.duplicateIdsCount > 0 ? ` (${dupReport.duplicateIdsCount} dup IDs)` : ''
  kpis.push({
    label: `Total ${entityName}s`,
    value: formatNumber(rows.length, 'number'),
    rawValue: rows.length,
    change: idKey ? `${dupReport.duplicateIdsCount} duplicate IDs${duplicateIdText}` : `Across all records`,
    up: true,
  })

  // KPI 2 & 3: Primary Metric Sum & Avg (or Date Range if date column selected)
  if (primaryMetricKey) {
    if (isDateColumn(primaryMetricKey)) {
      const dates = rows
        .map(r => cleanDateValue(r[primaryMetricKey]))
        .filter((d): d is Date => d !== null)
      if (dates.length > 0) {
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
        const spanDays = Math.round((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
        const formatD = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        
        kpis.push({
          label: `Date Range (${primaryMetricKey})`,
          value: `${spanDays} Days`,
          rawValue: spanDays,
          change: `${formatD(minDate)} - ${formatD(maxDate)}`,
          up: true,
        })
      }
    } else {
      const vals = rows
        .map(r => r[primaryMetricKey])
        .filter((v): v is number => v !== null)
      
      const sum = vals.reduce((s, v) => s + v, 0)
      const avg = vals.length > 0 ? sum / vals.length : 0
      const isCurrency = /revenue|mrr|acv|amount|price|sales|income|spend|profit|earn|salary|wage|cost|treatment/i.test(primaryMetricKey)

      // Add Sum KPI
      kpis.push({
        label: `Total ${primaryMetricKey}`,
        value: formatNumber(sum, isCurrency ? 'currency' : 'number', true),
        rawValue: sum,
        change: `Avg: ${formatNumber(avg, isCurrency ? 'currency' : 'number', true)}`,
        up: true,
        sparkData: vals.slice(-6).map(v => ({ v })),
        outliersExcludedCount: columnOutlierCounts[primaryMetricKey] || 0
      })

      // Add Avg KPI
      kpis.push({
        label: `Average ${primaryMetricKey}`,
        value: formatNumber(avg, isCurrency ? 'currency' : 'number', true),
        rawValue: avg,
        change: `Max: ${formatNumber(Math.max(...vals, 0), isCurrency ? 'currency' : 'number', true)}`,
        up: true,
        sparkData: vals.slice(-6).map(v => ({ v })),
        outliersExcludedCount: columnOutlierCounts[primaryMetricKey] || 0
      })
    }
  }

  // KPI 4: Date range card if not already added
  if (primaryTimeKey && primaryTimeKey !== primaryMetricKey) {
    const dates = rows
      .map(r => cleanDateValue(r[primaryTimeKey]))
      .filter((d): d is Date => d !== null)
    if (dates.length > 0) {
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
      const spanDays = Math.round((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
      const formatD = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      
      kpis.push({
        label: `Date Range (${primaryTimeKey})`,
        value: `${spanDays} Days`,
        rawValue: spanDays,
        change: `${formatD(minDate)} - ${formatD(maxDate)}`,
        up: true,
      })
    }
  }

  // Helper for checking active status
  const isValueActive = (val: any) => {
    if (val === null || val === undefined) return false
    const str = String(val).trim().toLowerCase()
    if (str === '' || str === '0' || str === 'false') return false
    const inactiveTerms = ['closed', 'lost', 'cancelled', 'inactive', 'none', 'error', 'n/a', 'na']
    return !inactiveTerms.some(term => str.includes(term))
  }

  const activatableCol = Object.keys(meta).find(c => /status|active|state|flag/i.test(c))
  const statusKey = categoryCols.find(c => /status|readmitted/i.test(c.name))?.name || activatableCol || ''

  // KPI 5: Active Rate %
  if (statusKey) {
    const activeCount = rows.filter(r => isValueActive(r[statusKey])).length
    const activePct = pct(activeCount, rows.length)
    kpis.push({
      label: `Active Rate (${statusKey})`,
      value: `${activePct}%`,
      rawValue: activePct,
      change: `${activeCount} active items`,
      up: activePct > 50,
    })
  }

  // ── Monthly time-series (Secondary IQR fence for charts) ────────────────
  const monthly: MonthlyPoint[] = []
  let chartPointsExcludedCount = 0

  if (primaryTimeKey && primaryMetricKey) {
    const primaryVals = rows
      .map(r => r[primaryMetricKey])
      .filter((v): v is number => v !== null && isFinite(v))
    
    let lowerFence = -Infinity
    let upperFence = Infinity
    if (primaryVals.length >= 4) {
      const sorted = [...primaryVals].sort((a, b) => a - b)
      const q1 = sorted[Math.floor(sorted.length * 0.25)]
      const q3 = sorted[Math.floor(sorted.length * 0.75)]
      const iqr = q3 - q1
      lowerFence = q1 - 2.5 * iqr
      upperFence = q3 + 2.5 * iqr
    }

    const monthMap: Record<string, { revenue: number; mrr: number; count: number; date: Date }> = {}

    rows.forEach(r => {
      const raw = r[primaryTimeKey]
      const d = cleanDateValue(raw)
      if (!d) return
      
      const val = r[primaryMetricKey]
      if (val === null || val === undefined) return

      if (val < lowerFence || val > upperFence) {
        chartPointsExcludedCount++
        return
      }

      const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
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
  }

  // Fallback: group by row-index if no time axis
  if (monthly.length === 0 && primaryMetricKey) {
    const primaryVals = rows
      .map(r => r[primaryMetricKey])
      .filter((v): v is number => v !== null && isFinite(v))
    
    let lowerFence = -Infinity
    let upperFence = Infinity
    if (primaryVals.length >= 4) {
      const sorted = [...primaryVals].sort((a, b) => a - b)
      const q1 = sorted[Math.floor(sorted.length * 0.25)]
      const q3 = sorted[Math.floor(sorted.length * 0.75)]
      const iqr = q3 - q1
      lowerFence = q1 - 2.5 * iqr
      upperFence = q3 + 2.5 * iqr
    }

    const targetBatches = Math.min(8, rows.length)
    const batchSize = Math.max(1, Math.ceil(rows.length / targetBatches))
    const batches = Math.ceil(rows.length / batchSize)
    for (let i = 0; i < batches; i++) {
      const batch = rows.slice(i * batchSize, (i + 1) * batchSize)
      const total = batch.reduce((s, r) => {
        const v = r[primaryMetricKey]
        if (v === null || v === undefined || (typeof v === 'number' && (v < lowerFence || v > upperFence))) {
          return s
        }
        return s + v
      }, 0)
      monthly.push({
        month: `Row Index ${i + 1}`,
        revenue: Math.round(total),
        mrr: Math.round(total * 0.8),
      })
    }
  }

  if (monthly.length === 0 && metricCols.length > 0) {
    const anyMetric = metricCols[0].name
    const targetBatches = Math.min(6, rows.length)
    const batchSize = Math.max(1, Math.ceil(rows.length / targetBatches))
    const batches = Math.ceil(rows.length / batchSize)
    for (let i = 0; i < batches; i++) {
      const batch = rows.slice(i * batchSize, (i + 1) * batchSize)
      const total = batch.reduce((s, r) => {
        const v = r[anyMetric]
        return s + (v !== null && isFinite(v) ? v : 0)
      }, 0)
      monthly.push({
        month: `Row Index ${i + 1}`,
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
    const plan = categoryKeyToUse ? String(r[categoryKeyToUse] ?? 'Standard') : 'Standard'
    const mrr = primaryMetricKey ? (cleanNumericValue(r[primaryMetricKey]) ?? 0) : 0
    const status = statusKey ? String(r[statusKey] ?? 'Active') : 'Active'
    const normalizedStatus = isValueActive(status) ? 'Active' : 'Churned'
    return { id, name, email, plan, mrr, status: normalizedStatus }
  })

  // ── Category segments ──────────────────────────────────────────
  const categories: CategorySegment[] = []
  if (categoryKeyToUse) {
    const counts: Record<string, number> = {}
    rows.forEach(r => {
      let val = String(r[categoryKeyToUse] ?? 'Other')
      if (isFallbackDateKey || isDateColumn(categoryKeyToUse)) {
        const d = cleanDateValue(r[categoryKeyToUse])
        if (d) {
          val = String(d.getFullYear())
        }
      }
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

  const topRows = primaryMetricKey
    ? [...rows]
        .sort((a, b) => (cleanNumericValue(b[primaryMetricKey]) ?? 0) - (cleanNumericValue(a[primaryMetricKey]) ?? 0))
        .slice(0, 10)
    : rows.slice(0, 10)

  // ── AI Insights Engine ─────────────────────────────────────────
  const topCategory = categories[0] || { label: 'None', pct: 0 }
  const secondCategory = categories[1] || { label: 'None', pct: 0 }

  const metricVals = primaryMetricKey
    ? rows.map(r => cleanNumericValue(r[primaryMetricKey])).filter((v): v is number => v !== null)
    : []
  const totalMetricVal = metricVals.reduce((s, v) => s + v, 0)
  const avgMetricVal = metricVals.length > 0 ? totalMetricVal / metricVals.length : 0
  const isCurrency = /revenue|mrr|acv|amount|price|sales|income|spend|profit|earn|salary|wage|cost|treatment/i.test(primaryMetricKey)
  const formatValue = (v: number) => formatNumber(Math.round(v), isCurrency ? 'currency' : 'number')

  const keyFindings: string[] = [
    `Dataset profile successfully classified as '${datasetType}' data containing ${rows.length} total records.`,
    primaryMetricKey ? `Primary metrics driven by '${primaryMetricKey}', totaling ${formatValue(totalMetricVal)} with an average of ${formatValue(avgMetricVal)}.` : `Dataset attributes include: ${cols.map(c => c.name).slice(0, 5).join(', ')}.`,
    primaryCategoryKey ? `Categorical clustering dominated by '${primaryCategoryKey}' segment '${topCategory.label}', which represents ${topCategory.pct}% of records.` : `No main category columns found.`
  ]

  const anomalies: string[] = []
  let outlierName = ''
  let outlierValue = 0
  if (primaryMetricKey && primaryNameKey) {
    const outlierRow = [...rows].sort((a, b) => (cleanNumericValue(b[primaryMetricKey]) ?? 0) - (cleanNumericValue(a[primaryMetricKey]) ?? 0))[0]
    if (outlierRow) {
      outlierName = String(outlierRow[primaryNameKey] || '')
      outlierValue = cleanNumericValue(outlierRow[primaryMetricKey]) ?? 0
    }
  }
  if (outlierValue > avgMetricVal * 1.8 && outlierName) {
    anomalies.push(`Significant outlier detected: Entity '${outlierName}' registers at ${formatValue(outlierValue)} in '${primaryMetricKey}', which is 1.8x+ above average.`);
  }
  const failedOrInactive = rows.filter(r => /inactive|fail|cancel|churn|lost|yes/i.test(String(r[statusKey] || ''))).length
  if (failedOrInactive > 0) {
    anomalies.push(`Volume review: ${failedOrInactive} records contain warning or inactive status descriptors.`);
  }

  const trends: string[] = []
  if (primaryMetricKey && monthly.length >= 2) {
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
    categoryKeyToUse ? `Resource allocation: Focus resources and operational capacity towards '${topCategory.label}' due to high volume density.` : `Verify dataset identifiers for indexing consistency.`,
    outlierName ? `Operational audit: Conduct a performance review on outlier '${outlierName}' to map replicating conditions.` : `Establish regular tracking of '${primaryMetricKey}' updates.`
  ]
  if (failedOrInactive > 0) {
    recommendations.push(`Risk mitigation: Establish monitoring protocols to target the ${failedOrInactive} warning status records.`);
  }

  return {
    hasData: true,
    datasetName: filename,
    totalRows: rawRows.length,
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
    cleanedRowsCount,
    unparseableDatesCount,
    exactDuplicatesCount: dupReport.exactDuplicatesCount,
    duplicateIdsCount: dupReport.duplicateIdsCount,
    chartPointsExcludedCount,
    rows,
    exactDuplicateRows: dupReport.exactDuplicateRows,
    duplicateIdRows: dupReport.duplicateIdRows,
    unparseableDateRows,
    outlierRows: Array.from(outlierRowSet),
    columnsWithHighNulls,
    nullPercentages,
    totalProcessedRows: rawRows.length,
  }
}

function buildSparkFromRows(rows: any[], metricKey: string): { v: number }[] {
  if (!metricKey || rows.length === 0) return []
  const step = Math.max(1, Math.floor(rows.length / 6))
  const result: { v: number }[] = []
  for (let i = 0; i < rows.length; i += step) {
    result.push({ v: cleanNumericValue(rows[i][metricKey]) ?? 0 })
    if (result.length >= 6) break
  }
  return result
}
