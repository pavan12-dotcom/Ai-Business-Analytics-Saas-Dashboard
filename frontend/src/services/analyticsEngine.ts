/**
 * analyticsEngine.ts
 * Centralized analytics engine — computes all KPIs, chart data, segments,
 * and forecasts from any uploaded dataset.
 */

import { detectDetailedColumnType, type DetailedColumnInfo } from './columnDetection'
import { cleanNumericColumn, cleanDateColumn, cleanCategoryColumn, detectDuplicates, formatNumber, cleanNumericValue, DIRTY_SENTINEL_VALUES } from './dataCleaner'

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

  primaryMetricKey: string
  primaryTimeKey: string
  primaryCategoryKey: string
  primaryNameKey: string
  statusKey: string

  cleanedRowsCount: number
  unparseableDatesCount: number
  exactDuplicatesCount: number
  duplicateIdsCount: number
  chartPointsExcludedCount: number

  rows: any[]
  exactDuplicateRows: number[]
  duplicateIdRows: number[]
  unparseableDateRows: number[]
  outlierRows: number[]
  columnsWithHighNulls: string[]
  nullPercentages: Record<string, number>
  totalProcessedRows: number

  // Domain detection info
  domainDetection?: {
    domain: string;
    confidence: number;
    evidence: string[];
    all_scores: Record<string, number>;
    runner_up: string;
  }
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

// ─── Algorithm 4: Domain Detection ─────────────────────────────────
export function detectDomain(
  rows: any[],
  meta: Record<string, string>,
  detailedTypes: Record<string, DetailedColumnInfo>,
  cleanedMetrics: Record<string, any>
) {
  const evidence: string[] = [];
  const scores: Record<string, number> = {
    SALES_CRM: 0,
    FINANCE: 0,
    HR: 0,
    MARKETING: 0,
    ECOMMERCE: 0,
    COHORT: 0,
    PRODUCT: 0,
    SURVEY: 0,
    INVENTORY: 0
  };

  const cols = Object.keys(meta);
  const lowCatCols = cols.filter(c => detailedTypes[c].type === 'LOW_CATEGORY' || detailedTypes[c].type === 'BOOLEAN');
  const medCatCols = cols.filter(c => detailedTypes[c].type === 'MED_CATEGORY');
  const highCatCols = cols.filter(c => detailedTypes[c].type === 'HIGH_CATEGORY');
  const idCols = cols.filter(c => detailedTypes[c].type === 'IDENTIFIER');
  const numericCols = cols.filter(c => detailedTypes[c].type === 'NUMERIC');
  const dateCols = cols.filter(c => detailedTypes[c].type === 'DATE');

  // SALES_CRM Scorer
  let salesScore = 0;
  lowCatCols.forEach(col => {
    const vals = rows.map(r => String(r[col] ?? '').toLowerCase().trim());
    const match = vals.some(v => ['won', 'win', 'closed won', 'lost', 'closed lost', 'active', 'inactive', 'open', 'closed'].includes(v));
    if (match) {
      salesScore += 40;
      evidence.push(`Sales/CRM Status col: ${col}`);
    }
  });
  idCols.forEach(col => {
    const name = col.toLowerCase();
    if (name.includes('deal') || name.includes('transaction') || name.includes('opp') || name.includes('order') || name.includes('ticket') || name.includes('case')) {
      salesScore += 30;
      evidence.push(`Sales/CRM ID: ${col}`);
    }
  });
  if (lowCatCols.length >= 3) {
    salesScore += 20;
    evidence.push('Multiple sales category columns');
  }
  numericCols.forEach(col => {
    const cleanInfo = cleanedMetrics[col];
    if (cleanInfo && cleanInfo.stats.avg > 10000 && cleanInfo.stats.is_currency) {
      salesScore += 25;
      evidence.push(`Large Sales amount: ${col}`);
    }
  });
  if (dateCols.length >= 1) salesScore += 15;
  if (numericCols.length >= 3) salesScore += 10;
  scores.SALES_CRM = salesScore;

  // FINANCE Scorer
  let finScore = 0;
  if (numericCols.length >= 2) {
    for (let i = 0; i < numericCols.length; i++) {
      for (let j = i + 1; j < numericCols.length; j++) {
        const avg1 = cleanedMetrics[numericCols[i]]?.stats.avg ?? 0;
        const avg2 = cleanedMetrics[numericCols[j]]?.stats.avg ?? 0;
        if (avg2 > 0) {
          const ratio = avg1 / avg2;
          if (ratio >= 0.5 && ratio <= 2.0) {
            finScore += 35;
            evidence.push(`Finance Budget/Actual pair: ${numericCols[i]} / ${numericCols[j]}`);
            break;
          }
        }
      }
    }
  }
  numericCols.forEach(col => {
    const cleanInfo = cleanedMetrics[col];
    if (cleanInfo && cleanInfo.stats.min < 0) {
      finScore += 25;
      evidence.push(`Negative financial variance: ${col}`);
    }
  });
  lowCatCols.forEach(col => {
    const unique = new Set(rows.map(r => String(r[col] ?? ''))).size;
    if (unique >= 4 && unique <= 15 && /dept|department|division|cost_center/i.test(col)) {
      finScore += 20;
      evidence.push(`Financial Division/Dept: ${col}`);
    }
  });
  dateCols.forEach(col => {
    const dates = rows.map(r => cleanDateColumn([r[col]]).validDates[0]).filter(Boolean);
    if (dates.length > 0) {
      const firstOfMonth = dates.filter(d => d.getDate() === 1).length;
      if (firstOfMonth / dates.length > 0.7) {
        finScore += 20;
        evidence.push(`Monthly Finance Dates: ${col}`);
      }
    }
  });
  scores.FINANCE = finScore;

  // HR Scorer
  let hrScore = 0;
  numericCols.forEach(col => {
    const cleanInfo = cleanedMetrics[col];
    if (cleanInfo) {
      const avg = cleanInfo.stats.avg;
      if (avg >= 20000 && avg <= 500000 && !cleanInfo.stats.is_integer) {
        hrScore += 40;
        evidence.push(`Salary range column: ${col}`);
      }
      if (cleanInfo.stats.is_integer && avg < 10000 && /headcount|employees|staff/i.test(col)) {
        hrScore += 20;
        evidence.push(`HR Headcount integer: ${col}`);
      }
    }
  });
  if (dateCols.length >= 2) {
    hrScore += 25;
    evidence.push('Multiple HR date milestones (hire/term)');
  }
  lowCatCols.forEach(col => {
    const unique = new Set(rows.map(r => String(r[col] ?? ''))).size;
    if (unique >= 3 && unique <= 20 && /dept|department|team|role|job/i.test(col)) {
      hrScore += 15;
      evidence.push(`HR Category department/role: ${col}`);
    }
  });
  scores.HR = hrScore;

  // MARKETING Scorer
  let mktScore = 0;
  numericCols.forEach(col => {
    if (detailedTypes[col].subType === 'RATIO') {
      mktScore += 35;
      evidence.push(`Marketing ratio CTR/Conv: ${col}`);
    }
    const cleanInfo = cleanedMetrics[col];
    if (cleanInfo) {
      if (cleanInfo.stats.is_currency && cleanInfo.stats.avg < 100000 && /spend|cost|adspend/i.test(col)) {
        mktScore += 25;
        evidence.push(`Marketing campaign spend: ${col}`);
      }
      if (cleanInfo.stats.is_integer && cleanInfo.stats.avg > 1000 && /click|impression|view|reach/i.test(col)) {
        mktScore += 20;
        evidence.push(`Marketing conversion integer: ${col}`);
      }
    }
  });
  if (medCatCols.length > 0) {
    mktScore += 15;
    evidence.push('Campaign medium categories');
  }
  scores.MARKETING = mktScore;

  // ECOMMERCE Scorer
  let ecoScore = 0;
  numericCols.forEach(col => {
    const cleanInfo = cleanedMetrics[col];
    if (cleanInfo) {
      if (cleanInfo.stats.is_integer && cleanInfo.stats.avg < 10000 && /order|quantity|sales_volume/i.test(col)) {
        ecoScore += 25;
        evidence.push(`Order count integer: ${col}`);
      }
      if (cleanInfo.stats.avg >= 10 && cleanInfo.stats.avg <= 10000 && cleanInfo.stats.is_currency && /price|aov|unit/i.test(col)) {
        ecoScore += 30;
        evidence.push(`Price/AOV column: ${col}`);
      }
    }
  });
  if (medCatCols.length > 0 || highCatCols.length > 0) {
    ecoScore += 20;
    evidence.push('SKU/Product code lists');
  }
  lowCatCols.forEach(col => {
    const vals = rows.map(r => String(r[col] ?? '').toLowerCase().trim());
    const match = vals.some(v => ['pending', 'shipped', 'delivered', 'cancelled', 'returned', 'refunded'].includes(v));
    if (match) {
      ecoScore += 35;
      evidence.push(`E-commerce order status: ${col}`);
    }
  });
  scores.ECOMMERCE = ecoScore;

  // COHORT Scorer
  let cohScore = 0;
  numericCols.forEach(col => {
    const cleanInfo = cleanedMetrics[col];
    if (cleanInfo) {
      if (cleanInfo.stats.is_integer && cleanInfo.stats.max <= 50 && cleanInfo.stats.min >= 0 && /period|month|cohort/i.test(col)) {
        cohScore += 40;
        evidence.push(`Period counts integer: ${col}`);
      }
      if (detailedTypes[col].subType === 'RATIO' && cleanInfo.stats.max <= 1) {
        cohScore += 35;
        evidence.push(`Retention percentage metric: ${col}`);
      }
    }
  });
  if (numericCols.length >= 2) {
    for (let i = 0; i < numericCols.length; i++) {
      for (let j = 0; j < numericCols.length; j++) {
        if (i !== j) {
          const c1 = cleanedMetrics[numericCols[i]];
          const c2 = cleanedMetrics[numericCols[j]];
          if (c1 && c2 && c1.stats.max <= c2.stats.max && c1.stats.avg <= c2.stats.avg) {
            cohScore += 25;
            evidence.push(`Cohort subset metric relationship: ${numericCols[i]} <= ${numericCols[j]}`);
            break;
          }
        }
      }
    }
  }
  dateCols.forEach(col => {
    const unique = new Set(rows.map(r => String(r[col] ?? ''))).size;
    if (unique < rows.length * 0.1) {
      cohScore += 20;
      evidence.push(`Repeated Cohort periods: ${col}`);
    }
  });
  scores.COHORT = cohScore;

  // PRODUCT Scorer
  let prodScore = 0;
  numericCols.forEach(col => {
    const cleanInfo = cleanedMetrics[col];
    if (cleanInfo) {
      if (cleanInfo.stats.is_integer && cleanInfo.stats.avg >= 100 && cleanInfo.stats.avg <= 10000000 && /dau|mau|users|active/i.test(col)) {
        prodScore += 25;
        evidence.push(`Daily active count metric: ${col}`);
      }
      if (detailedTypes[col].subType === 'RATIO' && /churn|retention|conversion/i.test(col)) {
        prodScore += 30;
        evidence.push(`Product retention ratio: ${col}`);
      }
      if (cleanInfo.stats.max <= 10 && cleanInfo.stats.min >= 0 && /nps|satisfaction|rating/i.test(col)) {
        prodScore += 20;
        evidence.push(`Product NPS scale: ${col}`);
      }
    }
  });
  scores.PRODUCT = prodScore;

  // SURVEY Scorer
  let survScore = 0;
  numericCols.forEach(col => {
    const cleanInfo = cleanedMetrics[col];
    if (cleanInfo) {
      if (cleanInfo.stats.is_integer && cleanInfo.stats.max <= 10 && cleanInfo.stats.min >= 1 && /rating|answer|score/i.test(col)) {
        survScore += 40;
        evidence.push(`Survey Rating Scale: ${col}`);
      }
    }
  });
  const textCols = cols.filter(c => detailedTypes[c].type === 'FREE_TEXT' || detailedTypes[c].type === 'HIGH_CARDINALITY_TEXT');
  if (textCols.length >= 2) {
    survScore += 15;
    evidence.push('Multiple survey text columns');
  }
  idCols.forEach(col => {
    if (/respondent|user_id|submission/i.test(col)) {
      survScore += 10;
      evidence.push(`Survey Respondent ID: ${col}`);
    }
  });
  if (rows.length / cols.length < 10) {
    survScore += 20;
    evidence.push('Survey wide low-row dataset profile');
  }
  scores.SURVEY = survScore;

  // INVENTORY Scorer
  let invScore = 0;
  numericCols.forEach(col => {
    const cleanInfo = cleanedMetrics[col];
    if (cleanInfo) {
      if (cleanInfo.stats.is_integer && cleanInfo.stats.avg < 100000 && /quantity|qty|stock|inventory/i.test(col)) {
        invScore += 25;
        evidence.push(`Inventory stock counts: ${col}`);
      }
      if (cleanInfo.stats.is_currency && cleanInfo.stats.avg < 10000 && /price|cost/i.test(col)) {
        invScore += 25;
        evidence.push(`Inventory price points: ${col}`);
      }
    }
  });
  idCols.forEach(col => {
    if (col.toLowerCase().includes('sku') || col.toLowerCase().includes('barcode') || col.toLowerCase().includes('item_code')) {
      invScore += 20;
      evidence.push(`SKU identifier code: ${col}`);
    }
  });
  lowCatCols.forEach(col => {
    if (/warehouse|shelf|category|location/i.test(col)) {
      invScore += 15;
      evidence.push(`Stock category: ${col}`);
    }
  });
  scores.INVENTORY = invScore;

  // Select Domain
  let topDomain = 'GENERIC';
  let topScore = 0;
  Object.entries(scores).forEach(([d, s]) => {
    if (s > topScore) {
      topScore = s;
      topDomain = d;
    }
  });

  let confidence = 0;
  let runner_up = 'GENERIC';
  let secondScore = 0;
  Object.entries(scores).forEach(([d, s]) => {
    if (d !== topDomain && s > secondScore) {
      secondScore = s;
      runner_up = d;
    }
  });

  if (topScore >= 60) {
    confidence = Math.min(topScore, 100);
  } else if (topScore >= 30) {
    confidence = topScore;
  } else {
    topDomain = 'GENERIC';
    confidence = 0;
  }

  return {
    domain: topDomain,
    confidence,
    evidence,
    all_scores: scores,
    runner_up
  };
}

// ─── Algorithm 5: Primary Metric Selection ──────────────────────────
export function selectPrimaryMetric(
  numericCols: string[],
  cleanedMetrics: Record<string, any>,
  detailedTypes: Record<string, DetailedColumnInfo>
) {
  const scoredCols = numericCols.map(colName => {
    let score = 0;
    const name = colName.toLowerCase();
    const cleanInfo = cleanedMetrics[colName];
    const detInfo = detailedTypes[colName];

    if (!cleanInfo) return { colName, score: -1 };

    // Currency bonus
    if (cleanInfo.stats.is_currency) {
      score += 25;
    }

    // Not ratio or pct
    if (detInfo.subType !== 'RATIO' && detInfo.subType !== 'PERCENTAGE') {
      score += 20;
    }

    // Not an integer count
    if (!cleanInfo.stats.is_integer) {
      score += 15;
    }

    // Not an ID-like column
    const EXCLUDE_WORDS = ['id', 'key', 'code', 'flag', 'rank', 'index', 'seq', 'num', 'no', 'number', 'row', 'line', 'ref', 'ref_no'];
    const hasExclude = EXCLUDE_WORDS.some(w => name === w || name.includes(w + '_') || name.includes('_' + w));
    if (!hasExclude) {
      score += 15;
    }

    // Not a percentage col (max > 1)
    if (cleanInfo.stats.max > 1) {
      score += 10;
    }

    // Revenue Hints
    const REVENUE_HINTS = ['rev', 'sal', 'amt', 'val', 'total', 'sum', 'earn', 'income', 'profit', 'price', 'cost', 'spend', 'pay', 'fee', 'arr', 'mrr', 'gmv', 'acv'];
    if (REVENUE_HINTS.some(hint => name.includes(hint))) {
      score += 20;
    }

    return { colName, score, sum: cleanInfo.stats.sum };
  });

  // Sort by sum descending to apply size ranking
  scoredCols.sort((a, b) => (b.sum ?? 0) - (a.sum ?? 0));
  scoredCols.forEach((item, idx) => {
    if (idx === 0) item.score += 30;
    else if (idx === 1) item.score += 15;
    else if (idx === 2) item.score += 5;
  });

  // Sort final score descending
  scoredCols.sort((a, b) => b.score - a.score);

  return {
    primary: scoredCols[0]?.colName || '',
    secondary: scoredCols[1]?.colName || '',
    scoredCols
  };
}

export function computeAnalytics(
  rawRows: any[],
  meta: Record<string, string>,
  filename: string = 'Dataset'
): AnalyticsResult {
  if (!rawRows || rawRows.length === 0) return EMPTY;

  const cols = Object.keys(meta);
  
  // Compute detailed column types (Algorithm 2)
  const detailedTypes: Record<string, DetailedColumnInfo> = {};
  cols.forEach(col => {
    const vals = rawRows.map(r => r[col]);
    detailedTypes[col] = detectDetailedColumnType(col, vals);
  });

  // Run full data cleaning & stats on columns (Algorithm 3)
  const cleanedMetrics: Record<string, any> = {};
  const cleanedDates: Record<string, any> = {};
  const cleanedCategories: Record<string, any> = {};

  cols.forEach(col => {
    const rawValArray = rawRows.map(r => r[col]);
    const typeInfo = detailedTypes[col];
    
    if (typeInfo.type === 'NUMERIC' || typeInfo.type === 'MIXED') {
      cleanedMetrics[col] = cleanNumericColumn(rawValArray);
    } else if (typeInfo.type === 'DATE') {
      cleanedDates[col] = cleanDateColumn(rawValArray);
    } else if (typeInfo.type !== 'EMPTY') {
      cleanedCategories[col] = cleanCategoryColumn(rawValArray);
    }
  });

  // Run Domain Detection (Algorithm 4)
  const domainInfo = detectDomain(rawRows, meta, detailedTypes, cleanedMetrics);

  // Load pre-calculated full dataset properties from metadata if available (Algorithm 1.3)
  const fullTotalRows = meta.__fullTotalRows ? parseInt(meta.__fullTotalRows) : rawRows.length;
  const fullExactDuplicates = meta.__fullExactDuplicates ? parseInt(meta.__fullExactDuplicates) : null;
  const fullDuplicateIds = meta.__fullDuplicateIds ? parseInt(meta.__fullDuplicateIds) : null;
  let fullSums: Record<string, number> = {};
  if (meta.__fullSums) {
    try {
      fullSums = JSON.parse(meta.__fullSums);
    } catch (_) {}
  }

  let entityName = 'Record';
  let valueMetricName = 'Value';
  const datasetType = domainInfo.domain === 'SALES_CRM' ? 'Sales' :
                      domainInfo.domain === 'FINANCE' ? 'Finance' :
                      domainInfo.domain === 'HR' ? 'HR' :
                      domainInfo.domain === 'MARKETING' ? 'Marketing' :
                      domainInfo.domain === 'ECOMMERCE' ? 'E-commerce' :
                      domainInfo.domain === 'COHORT' ? 'Cohort' :
                      domainInfo.domain === 'PRODUCT' ? 'Product' :
                      domainInfo.domain === 'SURVEY' ? 'Survey' :
                      domainInfo.domain === 'INVENTORY' ? 'Inventory' : 'Generic';

  if (datasetType === 'Sales') { entityName = 'Deal'; valueMetricName = 'Revenue'; }
  else if (datasetType === 'Finance') { entityName = 'Transaction'; valueMetricName = 'Amount'; }
  else if (datasetType === 'HR') { entityName = 'Employee'; valueMetricName = 'Salary'; }
  else if (datasetType === 'Marketing') { entityName = 'Campaign'; valueMetricName = 'Spend'; }
  else if (datasetType === 'E-commerce') { entityName = 'Order'; valueMetricName = 'Amount'; }
  else if (datasetType === 'Cohort') { entityName = 'Cohort Period'; valueMetricName = 'Retention'; }
  else if (datasetType === 'Product') { entityName = 'Event'; valueMetricName = 'Metric'; }
  else if (datasetType === 'Survey') { entityName = 'Respondent'; valueMetricName = 'Score'; }
  else if (datasetType === 'Inventory') { entityName = 'Item'; valueMetricName = 'Quantity'; }

  // Primary Metric Selection (Algorithm 5)
  const numericCols = cols.filter(c => detailedTypes[c].type === 'NUMERIC');
  const metricSelection = selectPrimaryMetric(numericCols, cleanedMetrics, detailedTypes);
  const primaryMetricKey = metricSelection.primary;
  
  // Pick primary date/time axis
  const dateCols = cols.filter(c => detailedTypes[c].type === 'DATE');
  const primaryTimeKey = dateCols[0] || '';

  // Pick primary category col
  const catCols = cols.filter(c => detailedTypes[c].type === 'LOW_CATEGORY' || detailedTypes[c].type === 'MED_CATEGORY' || detailedTypes[c].type === 'BOOLEAN');
  const primaryCategoryKey = catCols.find(c => /plan|category|segment|type|department|subject|product|warehouse/i.test(c)) || catCols[0] || '';

  // Set identifier name key
  const idCols = cols.filter(c => detailedTypes[c].type === 'IDENTIFIER');
  const primaryNameKey = idCols.find(c => /name|customer|company|sku|item|respondent/i.test(c)) || idCols[0] || cols[0] || '';

  // Get status key
  const statusKey = catCols.find(c => /status|state|active/i.test(c)) || '';

  // Build the cleaned dataset rows array
  const outlierRowSet = new Set<number>();
  const cleanedRowSet = new Set<number>();
  let unparseableDatesCount = 0;
  const unparseableDateRows: number[] = [];

  const rows = rawRows.map((row, rowIdx) => {
    const newRow = { ...row };
    
    // Copy cleaned numeric values, track outliers & cleaned statuses
    numericCols.forEach(col => {
      const colCleanInfo = cleanedMetrics[col];
      if (colCleanInfo) {
        const parsed = colCleanInfo.cleanArray;
        const isOutlier = colCleanInfo.outliers.includes(row[col]);
        if (isOutlier) {
          newRow[col] = null;
          outlierRowSet.add(rowIdx);
        } else {
          // If cleaned value differs from raw string, mark as cleaned row
          const cleanedVal = colCleanInfo.cleanArray[rowIdx] ?? null;
          newRow[col] = cleanedVal;
          if (row[col] !== cleanedVal && typeof row[col] === 'string' && !/^-?\d+(\.\d+)?$/.test(row[col].trim())) {
            cleanedRowSet.add(rowIdx);
          }
        }
      }
    });

    // Track unparseable dates
    dateCols.forEach(col => {
      const colCleanInfo = cleanedDates[col];
      if (colCleanInfo) {
        const rawDateVal = row[col];
        if (rawDateVal !== null && rawDateVal !== undefined && String(rawDateVal).trim() !== '') {
          const cleanedD = cleanDateColumn([rawDateVal]).validDates[0];
          if (!cleanedD) {
            unparseableDatesCount++;
            unparseableDateRows.push(rowIdx);
          }
        }
      }
    });

    return newRow;
  });

  const exactDupIndices: number[] = [];
  const duplicateIdIndices: number[] = [];
  let duplicateIdsCount = 0;
  let exactDuplicatesCount = 0;

  const idKey = idCols[0] || '';
  if (rawRows.length > 0) {
    const dupReport = detectDuplicates(rawRows, idKey);
    exactDuplicatesCount = fullExactDuplicates !== null ? fullExactDuplicates : dupReport.exactDuplicatesCount;
    duplicateIdsCount = fullDuplicateIds !== null ? fullDuplicateIds : dupReport.duplicateIdsCount;
    exactDupIndices.push(...dupReport.exactDuplicateRows);
    duplicateIdIndices.push(...dupReport.duplicateIdRows);
  }

  // ── Calculate Stats / Null Percentages ──────────────────────────
  const nullPercentages: Record<string, number> = {};
  const columnsWithHighNulls: string[] = [];
  cols.forEach(col => {
    const nullCount = rawRows.filter(r => r[col] === null || r[col] === undefined || String(r[col]).trim() === '').length;
    const pctVal = (nullCount / rawRows.length) * 100;
    nullPercentages[col] = pctVal;
    if (pctVal > 20) {
      columnsWithHighNulls.push(col);
    }
  });

  // KPIs aggregation
  const kpis: EngineKPI[] = [];
  kpis.push({
    label: `Total ${entityName}s`,
    value: formatNumber(fullTotalRows, 'number'),
    rawValue: fullTotalRows,
    change: `Domain: ${datasetType}`,
    up: true
  });

  if (primaryMetricKey) {
    const cleanInfo = cleanedMetrics[primaryMetricKey];
    if (cleanInfo) {
      const stats = cleanInfo.stats;
      const sumVal = fullSums[primaryMetricKey] !== undefined ? fullSums[primaryMetricKey] : stats.sum;
      kpis.push({
        label: `Total ${primaryMetricKey}`,
        value: formatNumber(sumVal, stats.is_currency ? 'currency' : 'number', true),
        rawValue: sumVal,
        change: `Average: ${formatNumber(stats.avg, stats.is_currency ? 'currency' : 'number', true)}`,
        up: true,
        sparkData: cleanInfo.cleanArray.slice(-6).map((v: number) => ({ v })),
        outliersExcludedCount: cleanInfo.outliers.length
      });

      kpis.push({
        label: `Average ${primaryMetricKey}`,
        value: formatNumber(stats.avg, stats.is_currency ? 'currency' : 'number', true),
        rawValue: stats.avg,
        change: `Max: ${formatNumber(stats.max, stats.is_currency ? 'currency' : 'number', true)}`,
        up: true,
        sparkData: cleanInfo.cleanArray.slice(-6).map((v: number) => ({ v })),
        outliersExcludedCount: cleanInfo.outliers.length
      });
    }
  }

  if (primaryTimeKey) {
    const cleanInfo = cleanedDates[primaryTimeKey];
    if (cleanInfo && cleanInfo.validDates.length > 0) {
      const dates = cleanInfo.validDates;
      const minDate = new Date(Math.min(...dates.map((d: Date) => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map((d: Date) => d.getTime())));
      const formatD = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      kpis.push({
        label: `Date Range`,
        value: `${cleanInfo.stats.span_days} Days`,
        rawValue: cleanInfo.stats.span_days,
        change: `${formatD(minDate)} - ${formatD(maxDate)}`,
        up: true
      });
    }
  }

  // Monthly aggregated data (Algorithm 6 Charts - Time series)
  const monthly: MonthlyPoint[] = [];
  if (primaryTimeKey && primaryMetricKey) {
    const dateCleanInfo = cleanedDates[primaryTimeKey];
    const metricCleanInfo = cleanedMetrics[primaryMetricKey];

    if (dateCleanInfo && metricCleanInfo) {
      // Determine aggregation period based on span in months
      const spanMonths = dateCleanInfo.stats.span_months;
      let period: 'day' | 'month' | 'quarter' | 'year' = 'month';
      if (spanMonths <= 3) period = 'day';
      else if (spanMonths <= 18) period = 'month';
      else if (spanMonths <= 60) period = 'quarter';
      else period = 'year';

      const groups: Record<string, number[]> = {};
      rows.forEach(r => {
        const dVal = cleanDateColumn([r[primaryTimeKey]]).validDates[0];
        if (!dVal) return;
        const mVal = cleanNumericValue(r[primaryMetricKey]);
        if (mVal === null || metricCleanInfo.outliers.includes(r[primaryMetricKey])) return;

        let key = '';
        if (period === 'day') {
          key = dVal.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else if (period === 'month') {
          key = dVal.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        } else if (period === 'quarter') {
          const q = Math.floor(dVal.getMonth() / 3) + 1;
          key = `Q${q} ${dVal.getFullYear().toString().slice(-2)}`;
        } else {
          key = String(dVal.getFullYear());
        }

        if (!groups[key]) groups[key] = [];
        groups[key].push(mVal);
      });

      Object.entries(groups).forEach(([periodKey, vals]) => {
        const sum = vals.reduce((a, b) => a + b, 0);
        monthly.push({
          month: periodKey,
          revenue: Math.round(sum),
          mrr: Math.round(sum * 0.8)
        });
      });
    }
  }

  // Fallback monthly batches if monthly is empty
  if (monthly.length === 0 && primaryMetricKey) {
    const cleanInfo = cleanedMetrics[primaryMetricKey];
    if (cleanInfo) {
      const vals = cleanInfo.cleanArray;
      const batches = Math.min(8, vals.length);
      const batchSize = Math.max(1, Math.ceil(vals.length / batches));
      for (let i = 0; i < batches; i++) {
        const chunk = vals.slice(i * batchSize, (i + 1) * batchSize);
        if (chunk.length > 0) {
          const sum = chunk.reduce((a: number, b: number) => a + b, 0);
          monthly.push({
            month: `Batch ${i + 1}`,
            revenue: Math.round(sum),
            mrr: Math.round(sum * 0.8)
          });
        }
      }
    }
  }

  // ── Category segment breakdowns (Algorithm 6 Charts - Categories) ──
  const categories: CategorySegment[] = [];
  if (primaryCategoryKey && primaryMetricKey) {
    const catClean = cleanedCategories[primaryCategoryKey];
    if (catClean) {
      const catGroups: Record<string, number> = {};
      rows.forEach(r => {
        const cVal = String(r[primaryCategoryKey] ?? 'Other').trim();
        if (DIRTY_SENTINEL_VALUES.includes(cVal)) return;
        const mVal = cleanNumericValue(r[primaryMetricKey]);
        if (mVal !== null && !cleanedMetrics[primaryMetricKey]?.outliers.includes(r[primaryMetricKey])) {
          catGroups[cVal] = (catGroups[cVal] || 0) + mVal;
        }
      });

      const totalVal = Object.values(catGroups).reduce((a, b) => a + b, 0);
      Object.entries(catGroups)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .forEach(([label, sumVal], idx) => {
          categories.push({
            label,
            count: Math.round(sumVal),
            pct: totalVal > 0 ? Math.round((sumVal / totalVal) * 100) : 0,
            color: CHART_COLORS[idx % CHART_COLORS.length]
          });
        });
    }
  }

  // Customer Records mappings
  const customers: CustomerRow[] = rows.slice(0, 100).map((r, idx) => {
    const id = String(r[idCols[0]] || idx + 1);
    const name = String(r[primaryNameKey] || `${entityName} ${idx + 1}`);
    const email = `${name.toLowerCase().replace(/\s+/g, '')}@example.com`;
    const plan = primaryCategoryKey ? String(r[primaryCategoryKey] ?? 'Standard') : 'Standard';
    const mrr = primaryMetricKey ? (cleanNumericValue(r[primaryMetricKey]) ?? 0) : 0;
    const status = statusKey ? String(r[statusKey] ?? 'Active') : 'Active';
    const normalizedStatus = ['churned', 'inactive', 'lost', 'cancelled', 'expired'].some(t => status.toLowerCase().includes(t)) ? 'Churned' : 'Active';
    return { id, name, email, plan, mrr, status: normalizedStatus };
  });

  // Forecast Aggregation
  const forecastData: ForecastPoint[] = [];
  if (monthly.length >= 2) {
    const last = monthly[monthly.length - 1];
    const prev = monthly[monthly.length - 2];
    const growth = prev.revenue > 0 ? (last.revenue - prev.revenue) / prev.revenue : 0.05;
    const smoothedGrowth = Math.min(Math.max(growth, -0.1), 0.3); // cap at ±30%

    forecastData.push({ month: last.month, revenue: last.revenue, upper: last.revenue, lower: last.revenue });

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let base = last.revenue;
    for (let i = 1; i <= 5; i++) {
      base = base * (1 + smoothedGrowth);
      const uncertainty = base * (0.05 + i * 0.02);
      forecastData.push({
        month: `${MONTHS[(monthly.length + i - 1) % 12]} (F)`,
        revenue: Math.round(base),
        upper: Math.round(base + uncertainty),
        lower: Math.round(Math.max(0, base - uncertainty)),
      });
    }
  }

  const topRows = primaryMetricKey
    ? [...rows].sort((a, b) => (cleanNumericValue(b[primaryMetricKey]) ?? 0) - (cleanNumericValue(a[primaryMetricKey]) ?? 0)).slice(0, 10)
    : rows.slice(0, 10);

  // AI Insights Generation
  const topCategory = categories[0] || { label: 'None', pct: 0 };
  const cleanInfo = primaryMetricKey ? cleanedMetrics[primaryMetricKey] : null;
  const totalMetricVal = cleanInfo ? cleanInfo.stats.sum : 0;
  const avgMetricVal = cleanInfo ? cleanInfo.stats.avg : 0;
  const isCurrency = cleanInfo ? cleanInfo.stats.is_currency : false;
  const formatValue = (v: number) => formatNumber(Math.round(v), isCurrency ? 'currency' : 'number');

  const keyFindings: string[] = [
    `Dataset profile successfully classified as '${datasetType}' domain with ${domainInfo.confidence}% confidence.`,
    primaryMetricKey ? `Primary metrics driven by '${primaryMetricKey}', totaling ${formatValue(totalMetricVal)} with an average of ${formatValue(avgMetricVal)}.` : `Dataset attributes include: ${cols.slice(0, 5).join(', ')}.`,
    primaryCategoryKey ? `Categorical clustering dominated by '${primaryCategoryKey}' segment '${topCategory.label}', representing ${topCategory.pct}% of records.` : `No main category columns found.`
  ];

  const anomalies: string[] = [];
  if (primaryMetricKey && primaryNameKey) {
    const outlierRow = [...rows].sort((a, b) => (cleanNumericValue(b[primaryMetricKey]) ?? 0) - (cleanNumericValue(a[primaryMetricKey]) ?? 0))[0];
    if (outlierRow) {
      const outlierName = String(outlierRow[primaryNameKey] || '');
      const outlierValue = cleanNumericValue(outlierRow[primaryMetricKey]) ?? 0;
      if (outlierValue > avgMetricVal * 1.8 && outlierName) {
        anomalies.push(`Significant outlier detected: Entity '${outlierName}' registers at ${formatValue(outlierValue)} in '${primaryMetricKey}', which is 1.8x+ above average.`);
      }
    }
  }

  const failedOrInactive = rows.filter(r => /inactive|fail|cancel|churn|lost/i.test(String(r[statusKey] || ''))).length;
  if (failedOrInactive > 0) {
    anomalies.push(`Volume review: ${failedOrInactive} records contain warning or inactive status descriptors.`);
  }

  const trends: string[] = [];
  if (primaryMetricKey && monthly.length >= 2) {
    const growth = monthly[monthly.length - 1].revenue > monthly[0].revenue;
    trends.push(`Historical trend: Analysis reveals ${growth ? 'upward growth' : 'downward slope'} from ${monthly[0].month} to ${monthly[monthly.length - 1].month}.`);
  }

  const predictions: string[] = [];
  if (primaryMetricKey && monthly.length >= 2) {
    const lastVal = monthly[monthly.length - 1].revenue;
    const projectedVal = forecastData[forecastData.length - 1]?.revenue || lastVal;
    const diffPct = lastVal > 0 ? Math.round(((projectedVal - lastVal) / lastVal) * 100) : 5;
    predictions.push(`Forward modeling projects '${primaryMetricKey}' to shift to ${formatValue(projectedVal)} in the next period (approx. ${diffPct >= 0 ? '+' : ''}${diffPct}% variance).`);
  } else {
    predictions.push(`Projecting steady volume counts: stable baseline of ~${Math.round(rows.length * 1.05)} records expected in the upcoming cycle.`);
  }

  const recommendations: string[] = [
    primaryCategoryKey ? `Resource allocation: Focus resources and operational capacity towards '${topCategory.label}' due to high volume density.` : `Verify dataset identifiers for indexing consistency.`,
  ];
  if (failedOrInactive > 0) {
    recommendations.push(`Risk mitigation: Establish monitoring protocols to target the ${failedOrInactive} warning status records.`);
  }

  return {
    hasData: true,
    datasetName: filename,
    totalRows: rawRows.length,
    columns: cols,
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
    cleanedRowsCount: cleanedRowSet.size,
    unparseableDatesCount,
    exactDuplicatesCount,
    duplicateIdsCount,
    chartPointsExcludedCount: outlierRowSet.size,
    rows,
    exactDuplicateRows: exactDupIndices,
    duplicateIdRows: duplicateIdIndices,
    unparseableDateRows,
    outlierRows: Array.from(outlierRowSet),
    columnsWithHighNulls,
    nullPercentages,
    totalProcessedRows: rawRows.length,
    domainDetection: domainInfo
  };
}
