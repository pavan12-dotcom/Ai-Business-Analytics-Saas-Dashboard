// dataEngine.ts — Universal Dashboard Engine supporting SaaS, E-commerce, Marketing, Logistics, HR, and Healthcare.

import { cleanNumericValue } from './dataCleaner'

export interface ColumnProfile {
  name: string
  count: number
  uniqueValues: any[]
  uniqueCount: number
  nullCount: number
  isNumeric: boolean
  isDate: boolean
  isBoolean: boolean
  isCategorical: boolean
  isLowCardinalityNumeric: boolean
  isHighCardinalityId: boolean
}

export const CONCEPT_DEFINITIONS = {
  ENTITY: {
    label: 'Record',
    columnHints: ['id', 'order id', 'shipment id', 'employee id', 'customer id', 'patient id', 'transaction id', 'record id'],
  },
  ENTITY_STATUS: {
    label: 'Status',
    columnHints: ['status', 'state', 'stage', 'phase'],
  },
  MONETARY_VALUE: {
    label: 'Value',
    columnHints: ['revenue', 'amount', 'cost', 'spend', 'salary', 'mrr', 'price', 'value', 'fee', 'sales', 'billed amount'],
  },
  GROUPING: {
    label: 'Category',
    columnHints: ['segment', 'category', 'channel', 'department', 'carrier', 'type', 'tier', 'plan', 'class', 'campaign_type'],
  },
  TIME: {
    label: 'Date',
    columnHints: ['date', 'created', 'signup', 'ship date', 'order date', 'timestamp', 'time'],
  },
  RATIO_NUMERATOR: { columnHints: ['ltv', 'lifetime value', 'revenue', 'mrr'] },
  RATIO_DENOMINATOR: { columnHints: ['cac', 'cost', 'spend', 'expense'] },
} as const

export const DOMAIN_VOCABULARIES = {
  SAAS: {
    ENTITY: 'Customer',
    ENTITY_STATUS: 'Subscription Status',
    MONETARY_VALUE: 'Revenue',
    GROUPING: 'Plan / Segment',
    detectStrong: ['mrr', 'churn', 'subscription', 'ltv', 'cac', 'plan'],
  },
  ECOMMERCE: {
    ENTITY: 'Order',
    ENTITY_STATUS: 'Order Status',
    MONETARY_VALUE: 'Order Value',
    GROUPING: 'Category',
    detectStrong: ['order id', 'sku', 'shipping', 'cart', 'coupon', 'product category'],
  },
  MARKETING: {
    ENTITY: 'Campaign Record',
    ENTITY_STATUS: 'Campaign Status',
    MONETARY_VALUE: 'Spend / Revenue',
    GROUPING: 'Channel',
    detectStrong: ['impressions', 'clicks', 'ctr', 'cpc', 'roas', 'campaign'],
  },
  LOGISTICS: {
    ENTITY: 'Shipment',
    ENTITY_STATUS: 'Shipment Status',
    MONETARY_VALUE: 'Shipping Cost',
    GROUPING: 'Carrier / Vehicle Type',
    detectStrong: ['shipment', 'carrier', 'transit', 'warehouse', 'freight'],
  },
  HR: {
    ENTITY: 'Employee',
    ENTITY_STATUS: 'Employment Status',
    MONETARY_VALUE: 'Salary',
    GROUPING: 'Department',
    detectStrong: ['employee', 'salary', 'department', 'attrition', 'hire'],
  },
  HEALTHCARE: {
    ENTITY: 'Patient',
    ENTITY_STATUS: 'Visit Status',
    MONETARY_VALUE: 'Billed Amount',
    GROUPING: 'Diagnosis / Department',
    detectStrong: ['patient', 'diagnosis', 'treatment', 'admission'],
  },
  GENERIC: {
    ENTITY: 'Record',
    ENTITY_STATUS: 'Status',
    MONETARY_VALUE: 'Value',
    GROUPING: 'Category',
    detectStrong: [],
  },
} as const

export type DomainType = keyof typeof DOMAIN_VOCABULARIES
export type VocabularyType = typeof DOMAIN_VOCABULARIES[DomainType]

export function detectDomain(columns: string[]): DomainType {
  const colStr = columns.join(' ').toLowerCase()
  let best: { domain: DomainType; score: number } = { domain: 'GENERIC', score: 0 }
  for (const [domain, vocab] of Object.entries(DOMAIN_VOCABULARIES)) {
    if (domain === 'GENERIC') continue
    const score = vocab.detectStrong.filter(k => colStr.includes(k)).length
    if (score > best.score) {
      best = { domain: domain as DomainType, score }
    }
  }
  // Require minimum 2 strong signals before claiming a specific domain
  return best.score >= 2 ? best.domain : 'GENERIC'
}

export function profileColumn(data: any[], colName: string): ColumnProfile {
  const values = data.map(r => r[colName]).filter(v => v != null && v !== '')
  const unique = new Set(values)
  const sample = values.slice(0, 100)

  const isNumeric = sample.length > 0 && sample.every(v => {
    const clean = String(v).replace(/[$£€₹¥₩%,]/g, '').trim()
    return clean !== '' && !isNaN(Number(clean))
  })

  const isDate = !isNumeric && sample.length > 0 && sample.every(v => {
    if (typeof v === 'number') return false
    const timestamp = Date.parse(String(v))
    return !isNaN(timestamp) && isNaN(Number(v))
  })

  const isBoolean = sample.length > 0 && sample.every(v => 
    [true, false, 'true', 'false', 'TRUE', 'FALSE', 'Yes', 'No', 'yes', 'no'].includes(v)
  )

  const uniqueCount = unique.size
  const nullCount = data.length - values.length

  return {
    name: colName,
    count: values.length,
    uniqueValues: [...unique],
    uniqueCount,
    nullCount,
    isNumeric,
    isDate,
    isBoolean,
    isCategorical: !isNumeric && !isDate && !isBoolean && uniqueCount <= 50,
    isLowCardinalityNumeric: isNumeric && uniqueCount <= 50,
    isHighCardinalityId: uniqueCount > values.length * 0.9,
  }
}

export function resolveGroupingColumn(profile: Record<string, ColumnProfile>): ColumnProfile | null {
  const candidates = Object.values(profile).filter(col => 
    col.isCategorical && 
    !col.isHighCardinalityId &&
    col.uniqueCount >= 2 && 
    col.uniqueCount <= 30
  )
  
  const hinted = candidates.find(c => 
    CONCEPT_DEFINITIONS.GROUPING.columnHints.some(h => 
      c.name.toLowerCase().includes(h)
    )
  )
  
  return hinted || candidates[0] || null
}

export function resolveChartLabelColumn(profile: Record<string, ColumnProfile>, valueColumn?: string): string | null {
  const groupCol = resolveGroupingColumn(profile)
  if (groupCol) return groupCol.name
  return null
}

export class DashboardDataEngine {
  raw: any[]
  profile: Record<string, ColumnProfile>
  domain: DomainType
  vocab: VocabularyType
  overrides?: {
    primaryMetricKey?: string
    primaryTimeKey?: string
    primaryCategoryKey?: string
  }

  constructor(rawData: any[], overrides?: {
    primaryMetricKey?: string
    primaryTimeKey?: string
    primaryCategoryKey?: string
  }) {
    this.raw = this.cleanData(rawData || [])
    this.profile = {}
    this.overrides = overrides
    if (this.raw.length) {
      Object.keys(this.raw[0]).forEach(col => {
        this.profile[col] = profileColumn(this.raw, col)
      })
    }
    this.domain = detectDomain(Object.keys(this.profile))
    this.vocab = DOMAIN_VOCABULARIES[this.domain]
  }

  cleanData(rawData: any[]): any[] {
    if (!Array.isArray(rawData)) return []
    return rawData.map(row => {
      const clean: any = {}
      if (!row || typeof row !== 'object') return clean
      for (const [k, v] of Object.entries(row)) {
        let val: any = typeof v === 'string' ? v.trim() : v
        if (val === '' || val === 'N/A' || val === 'null' || val === undefined) {
          val = null
        }
        if (typeof val === 'string') {
          const numStr = val.replace(/[$,%]/g, '').trim()
          if (numStr !== '' && !isNaN(Number(numStr))) {
            val = parseFloat(numStr)
          }
        }
        clean[k.trim()] = val
      }
      return clean
    })
  }

  findColumn(roleKeywords: readonly string[]): string | null {
    if (this.overrides) {
      if (roleKeywords.includes('revenue') && this.overrides.primaryMetricKey) {
        return this.overrides.primaryMetricKey
      }
      if (roleKeywords.includes('date') && this.overrides.primaryTimeKey) {
        return this.overrides.primaryTimeKey
      }
      if (roleKeywords.includes('segment') && this.overrides.primaryCategoryKey) {
        return this.overrides.primaryCategoryKey
      }
    }
    const cols = Object.keys(this.profile)
    for (const kw of roleKeywords) {
      const match = cols.find(c => c.toLowerCase().includes(kw.toLowerCase()))
      if (match) return match
    }
    // Substring fallback
    for (const kw of roleKeywords) {
      const cleanKw = kw.toLowerCase().replace(/[^a-z0-9]/g, '')
      const match = cols.find(c => c.toLowerCase().replace(/[^a-z0-9]/g, '').includes(cleanKw))
      if (match) return match
    }
    return null
  }

  // ── ENTITY KPIs (Customer/Shipment/Employee/etc. — whatever ENTITY is) ──
  getEntityKPIs() {
    const idCol = this.findColumn(CONCEPT_DEFINITIONS.ENTITY.columnHints)
    const statusCol = this.findColumn(CONCEPT_DEFINITIONS.ENTITY_STATUS.columnHints)

    const total = idCol ? new Set(this.raw.map(r => r[idCol]).filter(v => v != null && v !== '')).size : this.raw.length

    if (!statusCol) {
      return {
        total,
        active: total,
        atRisk: 0,
        negative: 0,
        rate: 0,
        statusColumn: null,
        note: `No status column found — showing total ${this.vocab.ENTITY} count only`,
      }
    }

    const statusProfile = this.profile[statusCol]
    if (!statusProfile || !statusProfile.isCategorical) {
      return {
        total,
        active: total,
        atRisk: 0,
        negative: 0,
        rate: 0,
        statusColumn: statusCol,
        note: 'Status column found but not categorical — cannot compute status breakdown',
      }
    }

    const statusValues = [...new Set(this.raw.map(r => r[statusCol]).filter(Boolean))] as string[]
    const positiveStatuses = statusValues.filter(s => 
      /active|delivered|completed|success|resurrected|paid|won|shipped|regular|vip/i.test(s)
    )
    const negativeStatuses = statusValues.filter(s => 
      /churn|cancel|lost|fail|return|delay|inactive|refunded|terminated/i.test(s)
    )
    const warningStatuses = statusValues.filter(s => 
      /warning|critical|pending|risk|hold/i.test(s)
    )

    const activeRows = this.raw.filter(r => positiveStatuses.some(s => String(r[statusCol]).toLowerCase() === s.toLowerCase()))
    const negativeRows = this.raw.filter(r => negativeStatuses.some(s => String(r[statusCol]).toLowerCase() === s.toLowerCase()))
    const atRiskRows = this.raw.filter(r => warningStatuses.some(s => String(r[statusCol]).toLowerCase() === s.toLowerCase()))

    const activeCount = activeRows.length || (total - negativeRows.length)
    const atRiskCount = atRiskRows.length

    return {
      total,
      active: activeCount,
      atRisk: atRiskCount,
      negative: negativeRows.length,
      rate: total > 0 ? +(negativeRows.length / total * 100).toFixed(1) : 0,
      statusColumn: statusCol,
      note: null,
    }
  }

  // ── MONETARY KPIs (Revenue/Cost/Salary/whatever MONETARY_VALUE is) ──
  getMonetaryKPIs() {
    const valueCol = this.findColumn(CONCEPT_DEFINITIONS.MONETARY_VALUE.columnHints)
    if (!valueCol) return { total: 0, refunds: 0, negativeTotal: 0, average: 0, column: null, note: 'No monetary value column found in this dataset' }

    const validRows = this.raw.filter(r => r[valueCol] != null && !isNaN(Number(r[valueCol])))
    const positive = validRows.filter(r => Number(r[valueCol]) > 0)
    const negative = validRows.filter(r => Number(r[valueCol]) < 0)

    const total = positive.reduce((a, r) => a + Number(r[valueCol]), 0)
    const negativeTotal = negative.reduce((a, r) => a + Number(r[valueCol]), 0)
    const average = positive.length ? total / positive.length : 0

    return {
      total,
      refunds: negativeTotal,
      negativeTotal,
      average,
      column: valueCol,
      note: null,
    }
  }

  // ── GROUPING breakdown (Segment/Channel/Carrier/Department — never numeric) ──
  getGroupingBreakdown() {
    const groupCol = resolveGroupingColumn(this.profile)
    if (!groupCol) return { column: null, data: [], note: 'No categorical grouping column found' }

    const groups: Record<string, number> = {}
    this.raw.forEach(r => {
      const val = r[groupCol.name] ?? 'Unknown'
      groups[val] = (groups[val] || 0) + 1
    })

    return {
      column: groupCol.name,
      data: Object.entries(groups)
        .map(([name, count]) => ({
          name,
          count,
          pct: this.raw.length > 0 ? +(count / this.raw.length * 100).toFixed(1) : 0,
        }))
        .sort((a, b) => b.count - a.count),
      note: null,
    }
  }

  // ── RATIO (LTV:CAC or any domain-relevant ratio) — with sanity bound ──
  getRatio(numHints: readonly string[], denHints: readonly string[], label: string) {
    const numCol = this.findColumn(numHints)
    const denCol = this.findColumn(denHints)
    if (!numCol || !denCol) {
      return { value: null, ratio: null, note: `${label} not applicable — missing required column(s) in this dataset` }
    }
    const validRows = this.raw.filter(r => Number(r[denCol]) > 0 && r[numCol] != null)
    if (!validRows.length) return { value: null, ratio: null, note: `${label} not applicable — no valid rows` }

    const avgNum = validRows.reduce((a, r) => a + Number(r[numCol]), 0) / validRows.length
    const avgDen = validRows.reduce((a, r) => a + Number(r[denCol]), 0) / validRows.length
    const ratio = avgNum / avgDen

    if (!isFinite(ratio) || ratio > 50 || ratio < 0) {
      return { value: null, ratio: null, note: `${label} computed value (${ratio.toFixed(1)}x) out of realistic range — flagged, not shown` }
    }
    return { value: +ratio.toFixed(1), ratio: +ratio.toFixed(1), note: null }
  }

  // ── Domain-aware widget applicability check ──
  isWidgetApplicable(widgetType: 'CHURN_ANALYSIS' | 'MRR_TREND' | 'LTV_CAC' | 'COHORT_RETENTION' | 'GEOGRAPHIC_BREAKDOWN') {
    const requirements = {
      CHURN_ANALYSIS: () => !!this.findColumn(CONCEPT_DEFINITIONS.ENTITY_STATUS.columnHints),
      MRR_TREND: () => !!this.findColumn(CONCEPT_DEFINITIONS.MONETARY_VALUE.columnHints),
      LTV_CAC: () => !!this.findColumn(CONCEPT_DEFINITIONS.RATIO_NUMERATOR.columnHints) && !!this.findColumn(CONCEPT_DEFINITIONS.RATIO_DENOMINATOR.columnHints),
      COHORT_RETENTION: () => !!this.findColumn(CONCEPT_DEFINITIONS.TIME.columnHints) && !!this.findColumn(CONCEPT_DEFINITIONS.ENTITY.columnHints),
      GEOGRAPHIC_BREAKDOWN: () => !!this.findColumn(['country', 'region', 'state', 'city', 'location']),
    }
    return requirements[widgetType] ? requirements[widgetType]() : true
  }

  // ── Backward Compatibility API ──
  classifyDomain() {
    return { domain: this.domain, confidence: this.domain === 'GENERIC' ? 'low' : 'high' }
  }

  getCustomerKPIs() {
    const entity = this.getEntityKPIs()
    return {
      total: entity.total,
      active: entity.active,
      atRisk: entity.atRisk,
      churnRate: entity.rate,
    }
  }

  getRevenueKPIs() {
    const mon = this.getMonetaryKPIs()
    return {
      total: mon.total,
      refunds: mon.refunds,
      average: mon.average,
      column: mon.column,
    }
  }

  getCategoryBreakdown(roleKeywords: readonly string[]) {
    const col = this.findColumn(roleKeywords)
    if (!col) return { column: null, categories: [] }
    const groups: Record<string, number> = {}
    this.raw.forEach(r => {
      const val = r[col] != null ? String(r[col]).trim() : 'Unknown'
      groups[val] = (groups[val] || 0) + 1
    })
    return {
      column: col,
      categories: Object.entries(groups).map(([name, count]) => ({
        name,
        count,
        pct: this.raw.length > 0 ? +(count / this.raw.length * 100).toFixed(1) : 0,
      })).sort((a, b) => b.count - a.count),
    }
  }

  getChurnRiskBySegment() {
    const segCol = this.findColumn(CONCEPT_DEFINITIONS.GROUPING.columnHints)
    const riskCol = this.findColumn(CONCEPT_DEFINITIONS.ENTITY_STATUS.columnHints)
    if (!segCol) return { column: null, data: [] }
    const segments = [...new Set(this.raw.map(r => r[segCol]).filter((v): v is string => v != null && v !== ''))]
    return {
      column: segCol,
      data: segments.map(seg => {
        const segRows = this.raw.filter(r => r[segCol] === seg)
        const riskRows = riskCol 
          ? segRows.filter(r => String(r[riskCol] ?? '').toLowerCase().match(/churn|cancel|lost|fail|return|delay|inactive|terminated/i))
          : []
        const riskPct = segRows.length ? +(riskRows.length / segRows.length * 100).toFixed(1) : 0
        return {
          segment: seg,
          risk: riskPct,
          riskPct,
        }
      }),
    }
  }

  getLtvCacRatio() {
    const res = this.getRatio(CONCEPT_DEFINITIONS.RATIO_NUMERATOR.columnHints, CONCEPT_DEFINITIONS.RATIO_DENOMINATOR.columnHints, 'LTV:CAC')
    return { ratio: res.ratio, note: res.note }
  }

  getTopRecordsChart() {
    const idCol = this.findColumn(CONCEPT_DEFINITIONS.ENTITY.columnHints)
    const valueCol = this.findColumn(CONCEPT_DEFINITIONS.MONETARY_VALUE.columnHints)
    
    if (!idCol || !valueCol) return { column: null, data: [] }
    const idColProfile = this.profile[idCol]
    if (idColProfile && idColProfile.uniqueCount > this.raw.length * 0.5) {
      return this.getCategoryBreakdown(CONCEPT_DEFINITIONS.GROUPING.columnHints)
    }
    
    const data = [...this.raw]
      .sort((a, b) => {
        const valA = Number(String(a[valueCol]).replace(/[$£€₹¥₩%,]/g, '')) || 0
        const valB = Number(String(b[valueCol]).replace(/[$£€₹¥₩%,]/g, '')) || 0
        return valB - valA
      })
      .slice(0, 7)
      .map(r => ({ id: r[idCol], value: Number(String(r[valueCol]).replace(/[$£€₹¥₩%,]/g, '')) || 0 }))
    return { column: idCol, data }
  }
}

export { DashboardDataEngine as DataEngine }
