/**
 * kpiEngine.ts
 * Dynamic column resolution, robust category extraction, atomic KPI calculations,
 * safe ratio bounds checking, and weighted domain classification.
 */

import { formatNumber, cleanNumericValue } from './dataCleaner'

// ── 1. Semantic Role-Based Column Resolution ─────────────────────────
export const ROLE_MAP: Record<string, string[]> = {
  'customer_id':        ['customer id', 'customer_id', 'customer', 'user id', 'userid', 'client id', 'order id', 'transaction id', 'id', 'dealid', 'employeeid'],
  'order_identifier':   ['order id', 'order_id', 'transaction id', 'transaction_id', 'deal id', 'dealid', 'invoice', 'id'],
  'status':             ['status', 'state', 'stage', 'subscription status', 'order status', 'approvalstatus'],
  'churn_risk':         ['churn risk', 'churnrisk', 'risk', 'churn_probability', 'attrition risk'],
  'acquisition_channel':['channel', 'source', 'acquisition', 'medium', 'lead source', 'leadsource', 'marketing channel'],
  'customer_segment':   ['segment', 'customer segment', 'customer_segment', 'customer_type', 'tier', 'plan', 'category', 'industry'],
  'geography':          ['country', 'region', 'state', 'city', 'location'],
  'revenue':            ['revenue', 'mrr', 'acv', 'amount', 'sales', 'total', 'price', 'salary', 'adspend', 'spend', 'budget'],
  'cost':               ['cost', 'cpl', 'cac', 'expense', 'expenses', 'adspend', 'spend'],
  'profit':             ['profit', 'net income', 'margin', 'variance'],
  'ltv':                ['ltv', 'lifetime value', 'clv', 'customer value'],
  'cac':                ['cac', 'acquisition cost', 'cpl', 'cost per lead'],
}

export function resolveColumnForWidget(
  widgetPurpose: string,
  profileOrColumns: Record<string, any> | string[]
): string | null {
  const columns = Array.isArray(profileOrColumns)
    ? profileOrColumns
    : Object.keys(profileOrColumns || {})

  if (!columns.length) return null

  const candidates = ROLE_MAP[widgetPurpose] || [widgetPurpose.toLowerCase()]

  // 1. Exact or strict token matching
  for (const keyword of candidates) {
    const exactMatch = columns.find(col => col.toLowerCase() === keyword)
    if (exactMatch) return exactMatch
  }

  // 2. Substring matching
  for (const keyword of candidates) {
    const match = columns.find(col => col.toLowerCase().includes(keyword))
    if (match) return match
  }

  return null
}

// ── 2. Dynamic Category Derivation ───────────────────────────────────
export function getSegmentCategories(data: any[], segmentCol: string | null): string[] {
  if (!segmentCol || !Array.isArray(data) || data.length === 0) return []
  const set = new Set<string>()
  data.forEach(row => {
    const val = row[segmentCol]
    if (val != null && val !== '' && val !== 'undefined' && val !== 'null') {
      set.add(String(val).trim())
    }
  })
  return Array.from(set)
}

// ── 3. Helper Status Guards ───────────────────────────────────────────
function isActiveStatus(val: any): boolean {
  if (val == null) return false
  const s = String(val).toLowerCase().trim()
  return ['active', 'completed', 'closed won', 'won', 'shipped', 'delivered', 'paid', 'approved', 'vip', 'regular'].some(k => s.includes(k))
}

function isChurnedStatus(val: any): boolean {
  if (val == null) return false
  const s = String(val).toLowerCase().trim()
  return ['churned', 'cancelled', 'canceled', 'closed lost', 'lost', 'refunded', 'terminated', 'inactive'].some(k => s.includes(k))
}

function isHighRisk(val: any): boolean {
  if (val == null) return false
  const s = String(val).toLowerCase().trim()
  return ['high', 'critical', 'pending', 'at risk', 'medium', 'warning'].some(k => s.includes(k))
}

// ── 4. Atomic KPI Computation Pass ───────────────────────────────────
export interface CustomerKPIs {
  total: number
  active: number
  atRisk: number
  churned: number
  churnRate: number
}

export function computeCustomerKPIs(
  data: any[],
  profileOrColumns: Record<string, any> | string[]
): CustomerKPIs {
  if (!Array.isArray(data) || data.length === 0) {
    return { total: 0, active: 0, atRisk: 0, churned: 0, churnRate: 0 }
  }

  const idCol     = resolveColumnForWidget('customer_id', profileOrColumns)
  const statusCol = resolveColumnForWidget('status', profileOrColumns)
  const riskCol   = resolveColumnForWidget('churn_risk', profileOrColumns)

  // Total = unique customers, fallback to row count
  const total = idCol
    ? new Set(data.map(r => r[idCol]).filter(v => v != null)).size
    : data.length

  let active = 0
  let churned = 0
  let atRisk = 0

  if (statusCol) {
    data.forEach(r => {
      const val = r[statusCol]
      if (isActiveStatus(val)) active++
      else if (isChurnedStatus(val)) churned++
    })
  } else {
    active = total
  }

  if (riskCol) {
    data.forEach(r => {
      if (isHighRisk(r[riskCol])) atRisk++
    })
  } else {
    // If no explicit risk column, consider pending/non-active status as risk
    atRisk = Math.max(0, total - active - churned)
  }

  // Mathematical Sanity Guards — sub-counts must never exceed total
  const safeActive  = Math.min(active, total)
  const safeChurned = Math.min(churned, total - safeActive)
  const safeAtRisk  = Math.min(atRisk, safeActive)

  const churnRate = total > 0 ? (safeChurned / total) * 100 : 0

  return {
    total,
    active: safeActive,
    atRisk: safeAtRisk,
    churned: safeChurned,
    churnRate
  }
}

// ── 5. Safe Ratio Calculation ─────────────────────────────────────────
export interface RatioResult {
  value: string | null
  rawRatio: number | null
  reason: string | null
}

export function computeRatio(
  data: any[],
  numeratorRole: string,
  denominatorRole: string,
  profileOrColumns: Record<string, any> | string[]
): RatioResult {
  const numCol = resolveColumnForWidget(numeratorRole, profileOrColumns)
  const denCol = resolveColumnForWidget(denominatorRole, profileOrColumns)

  if (!numCol || !denCol) {
    const missing = !numCol ? numeratorRole : denominatorRole
    return { value: null, rawRatio: null, reason: `Missing ${missing} column in this dataset` }
  }

  let numSum = 0
  let denSum = 0
  let validCount = 0

  data.forEach(row => {
    const n = cleanNumericValue(row[numCol])
    const d = cleanNumericValue(row[denCol])
    if (n != null && d != null && d > 0) {
      numSum += n
      denSum += d
      validCount++
    }
  })

  if (validCount === 0 || denSum === 0) {
    return { value: null, rawRatio: null, reason: 'No valid data rows for ratio calculation' }
  }

  const ratio = numSum / denSum

  // Sanity Bound check
  if (ratio > 100 || ratio < 0 || !isFinite(ratio)) {
    return { value: null, rawRatio: null, reason: 'Ratio out of realistic bounds (>100x or invalid)' }
  }

  return {
    value: `${ratio.toFixed(1)}x`,
    rawRatio: ratio,
    reason: null
  }
}

// ── 6. Weighted Domain Signatures Classification ──────────────────────
export const DOMAIN_SIGNATURES = {
  ECOMMERCE: {
    strong: ['order id', 'order_id', 'sku', 'shipping', 'cart', 'product', 'category', 'coupon', 'aov', 'fulfillment'],
    weak: ['price', 'amount', 'discount', 'quantity', 'status']
  },
  SAAS: {
    strong: ['mrr', 'arr', 'churn', 'subscription', 'plan', 'ltv', 'cac', 'nps', 'expansion', 'contraction'],
    weak: ['revenue', 'customer', 'stage', 'deal', 'rep']
  },
  FINANCE: {
    strong: ['ledger', 'debit', 'credit', 'account balance', 'variance', 'cost center', 'transaction type', 'budget'],
    weak: ['amount', 'transaction', 'cost', 'department']
  },
  HR: {
    strong: ['employee', 'salary', 'bonus', 'tenure', 'headcount', 'perf_rating', 'job_role', 'termination'],
    weak: ['department', 'name', 'location', 'rating']
  },
  MARKETING: {
    strong: ['adspend', 'impressions', 'clicks', 'ctr', 'cpl', 'campaign', 'conversion_rate', 'roi'],
    weak: ['channel', 'source', 'spend', 'medium']
  }
}

export function classifyDomainWeighted(columns: string[]): string {
  const colStr = columns.join(' ').toLowerCase()
  const scores: Record<string, number> = {}

  for (const [domain, sig] of Object.entries(DOMAIN_SIGNATURES)) {
    const strongMatches = sig.strong.filter(k => colStr.includes(k)).length
    const weakMatches   = sig.weak.filter(k => colStr.includes(k)).length
    // Strong matches worth 3x more than weak matches
    scores[domain] = (strongMatches * 3) + (weakMatches * 1)
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const best = sorted[0]

  return (best && best[1] > 0) ? best[0] : 'GENERIC'
}
