/**
 * dataCleaner.ts
 * Centralized data-cleaning utilities for the analytics dashboard.
 *
 * - cleanNumericValue:  handles $, commas, %, accounting parens, Excel errors
 * - cleanDateValue:     handles Excel serial numbers, Unix timestamps,
 *                       and mixed-format string dates
 * - detectDuplicates:   exact-row duplicates and duplicate-ID analysis
 */

// ─── Excel error values that should map to null ─────────────────
const EXCEL_ERRORS = new Set([
  '#DIV/0!', '#REF!', '#N/A', '#NAME?', '#NULL!', '#NUM!', '#VALUE!',
])

/**
 * Robustly convert any value to a number, or return null.
 *
 * Handles:
 *  - Plain numbers
 *  - "$1,234.56"    → 1234.56
 *  - "(1,500.00)"   → -1500   (accounting negatives)
 *  - "50%"          → 50
 *  - "#DIV/0!" etc  → null
 *  - "Infinity"     → null
 *  - "NaN"          → null
 *  - ""             → null
 */
export function cleanNumericValue(val: any): number | null {
  if (val === null || val === undefined) return null
  if (typeof val === 'number') {
    if (!isFinite(val) || isNaN(val)) return null
    return val
  }
  
  let str = String(val).trim()
  if (str === '' || str === '-') return null
  
  // Replace Infinity, NaN, and Excel errors case-insensitively
  const upperStr = str.toUpperCase()
  if (
    upperStr === 'INFINITY' ||
    upperStr === '-INFINITY' ||
    upperStr === 'NAN' ||
    upperStr === 'ERROR' ||
    EXCEL_ERRORS.has(upperStr) ||
    Array.from(EXCEL_ERRORS).some(err => upperStr.includes(err))
  ) {
    return null
  }

  // Percentage check before stripping
  const isPercent = str.includes('%')

  // Accounting negatives: (1,500.00) or ($1,500.00) or (1500)
  // Strip currency symbols first to check accounting format correctly
  let strippedForNeg = str.replace(/[$£€¥₹\s%]/g, '').trim()
  const accountingMatch = strippedForNeg.match(/^\(([0-9,\.]+)\)$/)
  if (accountingMatch) {
    const cleaned = accountingMatch[1].replace(/,/g, '')
    let n = parseFloat(cleaned)
    if (isNaN(n)) return null
    if (isPercent) n = n / 100
    return -n
  }

  // Strip currency symbols, commas, percent signs, and spaces
  const cleaned = str
    .replace(/[$£€¥₹]/g, '')  // currency symbols
    .replace(/,/g, '')          // thousands separators
    .replace(/%/g, '')          // percent signs (replace all)
    .replace(/\s+/g, '')        // spaces (replace all)
    .trim()

  if (cleaned === '' || cleaned === '-') return null
  let n = parseFloat(cleaned)
  if (isNaN(n) || !isFinite(n)) return null
  
  if (isPercent) {
    n = n / 100
  }
  return n
}

// ─── Excel epoch: 1900-01-01 (days since) ───────────────────────
const EXCEL_EPOCH = new Date(Date.UTC(1899, 11, 30)).getTime()

// Date string format matchers: [regex, parser]
type DateParser = [RegExp, (m: RegExpMatchArray) => Date | null]

const DATE_PARSERS: DateParser[] = [
  // ISO: YYYY-MM-DD or with time: YYYY-MM-DD HH:MM:SS
  [
    /^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})(?:[T ].*)?$/,
    (m) => new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3])),
  ],
  // YYYYMMDD (e.g. 20240115)
  [
    /^(\d{4})(\d{2})(\d{2})$/,
    (m) => new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3])),
  ],
  // DD/MM/YYYY or MM/DD/YYYY or DD.MM.YYYY or MM.DD.YYYY
  [
    /^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})(?:\s+\d{1,2}:\d{2}.*)?$/,
    (m) => {
      const a = parseInt(m[1]), b = parseInt(m[2]), yr = parseInt(m[3])
      // Disambiguate: if first part > 12, it must be DD/MM/YYYY
      if (a > 12) return new Date(yr, b - 1, a)
      // If second part > 12, it must be MM/DD/YYYY
      if (b > 12) return new Date(yr, a - 1, b)
      // Otherwise default to MM/DD/YYYY (or we can assume MM/DD/YYYY)
      return new Date(yr, a - 1, b)
    },
  ],
  // DD/MM/YY or MM/DD/YY (2-digit year)
  [
    /^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2})(?:\s+\d{1,2}:\d{2}.*)?$/,
    (m) => {
      const a = parseInt(m[1]), b = parseInt(m[2])
      let yr = parseInt(m[3])
      // Convert 2-digit year to 4-digit
      yr = yr < 50 ? 2000 + yr : 1900 + yr
      if (a > 12) return new Date(yr, b - 1, a)
      if (b > 12) return new Date(yr, a - 1, b)
      return new Date(yr, a - 1, b)
    }
  ],
  // DD-Mon-YYYY or DD-Mon-YY (e.g. 15-Jan-2024 or 15-Jan-24)
  [
    /^(\d{1,2})[-/. ]([A-Za-z]{3,9})[-/. ](\d{2,4})$/,
    (m) => {
      const months: Record<string, number> = {
        jan: 0, january: 0,
        feb: 1, february: 1,
        mar: 2, march: 2,
        apr: 3, april: 3,
        may: 4,
        jun: 5, june: 5,
        jul: 6, july: 6,
        aug: 7, august: 7,
        sep: 8, september: 8, sept: 8,
        oct: 9, october: 9,
        nov: 10, november: 10,
        dec: 11, december: 11,
      }
      const mo = months[m[2].toLowerCase()]
      if (mo === undefined) return null
      let yr = parseInt(m[3])
      if (m[3].length === 2) {
        yr = yr < 50 ? 2000 + yr : 1900 + yr
      }
      return new Date(yr, mo, parseInt(m[1]))
    },
  ],
  // Mon DD, YYYY (e.g. Jan 15, 2024)
  [
    /^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/,
    (m) => {
      const months: Record<string, number> = {
        jan: 0, january: 0,
        feb: 1, february: 1,
        mar: 2, march: 2,
        apr: 3, april: 3,
        may: 4,
        jun: 5, june: 5,
        jul: 6, july: 6,
        aug: 7, august: 7,
        sep: 8, september: 8,
        oct: 9, october: 9,
        nov: 10, november: 10,
        dec: 11, december: 11,
      }
      const mo = months[m[1].toLowerCase()]
      if (mo === undefined) return null
      return new Date(parseInt(m[3]), mo, parseInt(m[2]))
    }
  ],
  // Mon YYYY: Jan 2024
  [
    /^([A-Za-z]{3,9})\s+(\d{4})$/,
    (m) => {
      const months: Record<string, number> = {
        jan: 0, january: 0,
        feb: 1, february: 1,
        mar: 2, march: 2,
        apr: 3, april: 3,
        may: 4,
        jun: 5, june: 5,
        jul: 6, july: 6,
        aug: 7, august: 7,
        sep: 8, september: 8,
        oct: 9, october: 9,
        nov: 10, november: 10,
        dec: 11, december: 11,
      }
      const mo = months[m[1].toLowerCase()]
      return mo === undefined ? null : new Date(parseInt(m[2]), mo, 1)
    },
  ],
]

// Non-date sentinel strings — return null immediately to avoid misclassification
const NON_DATE_STRINGS = new Set([
  'tbd', 'n/a', 'na', 'null', 'none', 'undefined', '-', '--', '?', 'unknown', 'pending',
])

function createValidDate(year: number, monthIndex: number, day: number): Date | null {
  const d = new Date(year, monthIndex, day)
  if (isNaN(d.getTime())) return null
  if (d.getFullYear() !== year || d.getMonth() !== monthIndex || d.getDate() !== day) {
    return null // Rollover occurred, invalid date!
  }
  return d
}

/**
 * Parse any date-like value to a Date, or return null.
 *
 * Handles:
 *  - Date objects
 *  - Excel serial numbers (e.g., 45292.5 → 2024-01-15 12:00)
 *  - Unix timestamps in seconds (10 digits) or milliseconds (13 digits) (with floats support)
 *  - ISO strings, DD/MM/YYYY, MM-DD-YYYY, DD-Mon-YYYY, Mon YYYY
 */
export function cleanDateValue(val: any): Date | null {
  if (val === null || val === undefined) return null

  // Already a Date
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val
  }

  // Coerce string numbers to actual numbers if they represent pure numeric timestamps or Excel serial numbers
  let numVal = NaN
  if (typeof val === 'number') {
    numVal = val
  } else if (typeof val === 'string') {
    const trimmed = val.trim()
    if (trimmed !== '') {
      const parsed = Number(trimmed)
      if (!isNaN(parsed) && isFinite(parsed)) {
        numVal = parsed
      }
    }
  }

  // Excel serial number (10000 to 99999, which corresponds to dates between 1927 and 2173)
  if (!isNaN(numVal) && numVal >= 10000 && numVal < 100000) {
    const ms = EXCEL_EPOCH + numVal * 86400000
    const d = new Date(ms)
    return isNaN(d.getTime()) ? null : d
  }

  // Unix timestamp milliseconds (13 digits before decimal)
  if (!isNaN(numVal) && numVal >= 1_000_000_000_000 && numVal < 9_999_999_999_999) {
    const d = new Date(Math.floor(numVal))
    return isNaN(d.getTime()) ? null : d
  }

  // Unix timestamp seconds (10 digits before decimal)
  if (!isNaN(numVal) && numVal >= 1_000_000_000 && numVal < 9_999_999_999) {
    const d = new Date(Math.floor(numVal * 1000))
    return isNaN(d.getTime()) ? null : d
  }

  const str = String(val).trim()
  if (str === '') return null

  // Fast-exit for well-known non-date sentinels (TBD, N/A, etc.)
  if (NON_DATE_STRINGS.has(str.toLowerCase())) return null

  // 1. YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T ].*)?$/)
  if (isoMatch) {
    const yr = parseInt(isoMatch[1])
    const mo = parseInt(isoMatch[2])
    const dy = parseInt(isoMatch[3])
    const d = createValidDate(yr, mo - 1, dy)
    if (d) return d
  }

  // 2. DD/MM/YYYY
  const ddmmMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+.*)?$/)
  if (ddmmMatch) {
    const dy = parseInt(ddmmMatch[1])
    const mo = parseInt(ddmmMatch[2])
    const yr = parseInt(ddmmMatch[3])
    const d = createValidDate(yr, mo - 1, dy)
    if (d) return d
  }

  // 3. MM/DD/YYYY
  if (ddmmMatch) {
    const mo = parseInt(ddmmMatch[1])
    const dy = parseInt(ddmmMatch[2])
    const yr = parseInt(ddmmMatch[3])
    const d = createValidDate(yr, mo - 1, dy)
    if (d) return d
  }

  // 4. DD-MM-YYYY
  const ddmmDashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s+.*)?$/)
  if (ddmmDashMatch) {
    const dy = parseInt(ddmmDashMatch[1])
    const mo = parseInt(ddmmDashMatch[2])
    const yr = parseInt(ddmmDashMatch[3])
    const d = createValidDate(yr, mo - 1, dy)
    if (d) return d
  }

  const months: Record<string, number> = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
    apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
    aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9,
    nov: 10, november: 10, dec: 11, december: 11
  }

  // 5. DD MMM YYYY (e.g., 15 Jan 2024 or 15-Jan-2024 or 15/Jan/2024)
  const ddMmmMatch = str.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,9})[-/ ](\d{4})(?:\s+.*)?$/)
  if (ddMmmMatch) {
    const dy = parseInt(ddMmmMatch[1])
    const mo = months[ddMmmMatch[2].toLowerCase()]
    const yr = parseInt(ddMmmMatch[3])
    if (mo !== undefined) {
      const d = createValidDate(yr, mo, dy)
      if (d) return d
    }
  }

  // 6. MMM DD, YYYY (e.g. Jan 15, 2024)
  const mmmDdMatch = str.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})(?:\s+.*)?$/)
  if (mmmDdMatch) {
    const mo = months[mmmDdMatch[1].toLowerCase()]
    const dy = parseInt(mmmDdMatch[2])
    const yr = parseInt(mmmDdMatch[3])
    if (mo !== undefined) {
      const d = createValidDate(yr, mo, dy)
      if (d) return d
    }
  }

  // 7. YYYYMMDD
  const yyyymmddMatch = str.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (yyyymmddMatch) {
    const yr = parseInt(yyyymmddMatch[1])
    const mo = parseInt(yyyymmddMatch[2])
    const dy = parseInt(yyyymmddMatch[3])
    const d = createValidDate(yr, mo - 1, dy)
    if (d) return d
  }

  // 9. MM-DD-YYYY
  if (ddmmDashMatch) {
    const mo = parseInt(ddmmDashMatch[1])
    const dy = parseInt(ddmmDashMatch[2])
    const yr = parseInt(ddmmDashMatch[3])
    const d = createValidDate(yr, mo - 1, dy)
    if (d) return d
  }

  // Fallback: native Date.parse
  const native = Date.parse(str)
  if (!isNaN(native)) {
    const d = new Date(native)
    if (!isNaN(d.getTime())) return d
  }

  return null
}

// ─── Duplicate Detection ──────────────────────────────────────────

export interface DuplicateReport {
  exactDuplicatesCount: number   // rows where ALL fields match exactly
  duplicateIdsCount: number      // rows sharing an ID but differing in at least one field
  exactDuplicateRows: number[]   // indices of exact duplicates (0-based)
  duplicateIdRows: number[]      // indices of rows sharing duplicate IDs (0-based)
}

/**
 * Detect exact duplicate rows and duplicate primary-key rows.
 *
 * @param rows         - array of data row objects
 * @param primaryIdKey - name of the primary key column (or '' to skip ID check)
 */
export function detectDuplicates(rows: any[], primaryIdKey: string): DuplicateReport {
  const seenHashes = new Map<string, number>() // hash → first occurrence index
  const seenIds = new Map<string, string>()    // id → fingerprint of first occurrence
  const exactDuplicateIndices: number[] = []
  const duplicateIdIndices: number[] = []
  let duplicateIdsCount = 0

  rows.forEach((row, idx) => {
    // Build a canonical JSON fingerprint (sorted keys for consistency)
    const fingerprint = JSON.stringify(
      Object.fromEntries(Object.keys(row).sort().map(k => [k, row[k]]))
    )

    // Exact duplicate check
    let isExactDuplicate = false
    if (seenHashes.has(fingerprint)) {
      exactDuplicateIndices.push(idx)
      isExactDuplicate = true
    } else {
      seenHashes.set(fingerprint, idx)
    }

    // Duplicate ID check
    if (!isExactDuplicate && primaryIdKey && row[primaryIdKey] !== undefined && row[primaryIdKey] !== null) {
      const idKey = String(row[primaryIdKey])
      if (seenIds.has(idKey)) {
        // Same ID exists — check if it's the same row or different data
        if (seenIds.get(idKey) !== fingerprint) {
          duplicateIdsCount++
          duplicateIdIndices.push(idx)
        }
      } else {
        seenIds.set(idKey, fingerprint)
      }
    }
  })

  return {
    exactDuplicatesCount: exactDuplicateIndices.length,
    duplicateIdsCount,
    exactDuplicateRows: exactDuplicateIndices,
    duplicateIdRows: duplicateIdIndices,
  }
}

/**
 * Universal number formatter function used everywhere.
 * signature: formatNumber(value, type)
 * Enforces en-US and standard abbreviations.
 */
export function formatNumber(
  value: number,
  typeOrIsCurrency: 'currency' | 'number' | 'percent' | 'decimal' | boolean = 'number',
  abbreviate: boolean = false
): string {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
    return '--'
  }

  // Convert legacy boolean isCurrency to type string
  let type: 'currency' | 'number' | 'percent' | 'decimal' = 'number'
  if (typeof typeOrIsCurrency === 'boolean') {
    type = typeOrIsCurrency ? 'currency' : 'number'
  } else {
    type = typeOrIsCurrency
  }

  if (type === 'percent') {
    const multiplied = Math.abs(value) <= 1 ? value * 100 : value
    const formatted = new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1
    }).format(multiplied)
    return `${formatted}%`
  }

  if (type === 'decimal') {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    }).format(value)
  }

  const absVal = Math.abs(value)
  const sign = value < 0 ? '-' : ''

  if (abbreviate && absVal >= 1000) {
    let divider = 1
    let suffix = ''
    if (absVal >= 1e12) {
      divider = 1e12
      suffix = 'T'
    } else if (absVal >= 1e9) {
      divider = 1e9
      suffix = 'B'
    } else if (absVal >= 1e6) {
      divider = 1e6
      suffix = 'M'
    } else {
      divider = 1e3
      suffix = 'K'
    }

    const divided = absVal / divider
    const fd = divided < 100 ? 1 : 0
    const formattedDivided = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: fd,
      maximumFractionDigits: fd
    }).format(divided)

    return type === 'currency' ? `${sign}$${formattedDivided}${suffix}` : `${sign}${formattedDivided}${suffix}`
  }

  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(absVal)

  return type === 'currency' ? `${sign}$${formatted}` : `${sign}${formatted}`
}

/**
 * Format Y-axis tick labels.
 */
export function formatYAxisTick(v: number): string {
  if (v === 0) return '0'
  return formatNumber(v, 'number', true)
}
