/**
 * dataCleaner.ts
 * Centralized data-cleaning utilities for the analytics dashboard.
 */

// ─── Excel error values that should map to null ─────────────────
const EXCEL_ERRORS = new Set([
  '#DIV/0!', '#REF!', '#N/A', '#NAME?', '#NULL!', '#NUM!', '#VALUE!',
]);

export const DIRTY_SENTINEL_VALUES = [
  '', ' ', '  ',
  'null', 'NULL', 'Null',
  'none', 'None', 'NONE',
  'n/a', 'N/A', 'NA', '#N/A',
  'unknown', 'Unknown', 'UNKNOWN',
  'tbd', 'TBD', 'undefined',
  '-', '--', '---', '#REF!',
  'missing', 'Missing', '?'
];

const DATE_PATTERNS = [
  {
    name: 'ISO',
    regex: /^\d{4}-\d{2}-\d{2}/,
    parse: (v: string) => new Date(v)
  },
  {
    name: 'DMY_SLASH',
    regex: /^\d{1,2}\/\d{1,2}\/\d{4}$/,
    parse: (v: string) => {
      const [d, m, y] = v.split('/');
      return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    }
  },
  {
    name: 'MDY_SLASH',
    regex: /^\d{1,2}\/\d{1,2}\/\d{4}$/,
    parse: (v: string) => new Date(v)
  },
  {
    name: 'DMY_DASH',
    regex: /^\d{1,2}-\d{1,2}-\d{4}$/,
    parse: (v: string) => {
      const [d, m, y] = v.split('-');
      return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    }
  },
  {
    name: 'TEXT_DATE',
    regex: /\d{1,2}\s+[A-Za-z]{3}\s+\d{4}/,
    parse: (v: string) => new Date(v)
  },
  {
    name: 'MONTH_YEAR',
    regex: /^[A-Za-z]{3}[-\/]\d{2,4}$/,
    parse: (v: string) => {
      const months: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
      };
      const parts = v.split(/[-\/]/);
      const m = months[parts[0].toLowerCase().slice(0, 3)];
      let y = parseInt(parts[1]);
      if (parts[1].length === 2) {
        y = y < 50 ? 2000 + y : 1900 + y;
      }
      return m !== undefined ? new Date(y, m, 1) : new Date(NaN);
    }
  },
  {
    name: 'YEAR_ONLY',
    regex: /^\d{4}$/,
    parse: (v: string) => {
      const y = parseInt(v);
      if (y >= 1900 && y <= 2100) return new Date(y, 0, 1);
      return new Date(NaN);
    }
  },
  {
    name: 'EPOCH_SEC',
    regex: /^\d{10}$/,
    parse: (v: string) => new Date(parseInt(v) * 1000)
  },
  {
    name: 'EPOCH_MS',
    regex: /^\d{13}$/,
    parse: (v: string) => new Date(parseInt(v))
  },
  {
    name: 'NO_SEP',
    regex: /^\d{8}$/,
    parse: (v: string) => {
      const y = parseInt(v.substring(0, 4));
      const m = parseInt(v.substring(4, 6));
      const d = parseInt(v.substring(6, 8));
      return new Date(y, m - 1, d);
    }
  }
];

export function cleanNumericValue(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') {
    if (!isFinite(val) || isNaN(val)) return null;
    return val;
  }
  
  let str = String(val).trim();
  if (str === '' || str === '-') return null;
  
  const upperStr = str.toUpperCase();
  if (
    upperStr === 'INFINITY' ||
    upperStr === '-INFINITY' ||
    upperStr === 'NAN' ||
    upperStr === 'ERROR' ||
    EXCEL_ERRORS.has(upperStr) ||
    Array.from(EXCEL_ERRORS).some(err => upperStr.includes(err))
  ) {
    return null;
  }

  const isPercent = str.includes('%');
  let strippedForNeg = str.replace(/[$£€¥₹\s%]/g, '').trim();
  const accountingMatch = strippedForNeg.match(/^\(([0-9,\.]+)\)$/);
  if (accountingMatch) {
    const cleaned = accountingMatch[1].replace(/,/g, '');
    let n = parseFloat(cleaned);
    if (isNaN(n)) return null;
    if (isPercent) n = n / 100;
    return -n;
  }

  const cleaned = str
    .replace(/[$£€¥₹]/g, '')
    .replace(/,/g, '')
    .replace(/%/g, '')
    .replace(/\s+/g, '')
    .trim();

  if (cleaned === '' || cleaned === '-') return null;
  let n = parseFloat(cleaned);
  if (isNaN(n) || !isFinite(n)) return null;
  
  if (isPercent) {
    n = n / 100;
  }
  return n;
}

const EXCEL_EPOCH = new Date(Date.UTC(1899, 11, 30)).getTime();

export function cleanDateValue(val: any): Date | null {
  if (val === null || val === undefined) return null;

  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }

  let numVal = NaN;
  if (typeof val === 'number') {
    numVal = val;
  } else if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed !== '') {
      const parsed = Number(trimmed);
      if (!isNaN(parsed) && isFinite(parsed)) {
        numVal = parsed;
      }
    }
  }

  if (!isNaN(numVal) && numVal >= 10000 && numVal < 100000) {
    const ms = EXCEL_EPOCH + numVal * 86400000;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  if (!isNaN(numVal) && numVal >= 1_000_000_000_000 && numVal < 9_999_999_999_999) {
    const d = new Date(Math.floor(numVal));
    return isNaN(d.getTime()) ? null : d;
  }

  if (!isNaN(numVal) && numVal >= 1_000_000_000 && numVal < 9_999_999_999) {
    const d = new Date(Math.floor(numVal * 1000));
    return isNaN(d.getTime()) ? null : d;
  }

  const str = String(val).trim();
  if (str === '') return null;

  const native = Date.parse(str);
  if (!isNaN(native)) {
    const d = new Date(native);
    if (!isNaN(d.getTime())) return d;
  }

  for (const pattern of DATE_PATTERNS) {
    if (pattern.regex.test(str)) {
      try {
        const d = pattern.parse(str);
        if (d && !isNaN(d.getTime())) return d;
      } catch (_) {}
    }
  }

  return null;
}

// ─── Algorithm 3.1: Numeric Column Cleaning & Stats ──────────────
export function cleanNumericColumn(rawArray: any[]) {
  const parseErrors: { value: any; reason: string }[] = [];
  const parsed: number[] = [];
  let nullCount = 0;

  rawArray.forEach(value => {
    if (value === null || value === undefined) {
      nullCount++;
      parseErrors.push({ value, reason: 'NULL' });
      return;
    }

    const strVal = String(value).trim();
    if (strVal === '' || strVal === '-' || strVal.toLowerCase() === 'null' || strVal.toLowerCase() === 'none') {
      nullCount++;
      parseErrors.push({ value, reason: 'NULL' });
      return;
    }

    const upperStr = strVal.toUpperCase();
    if (EXCEL_ERRORS.has(upperStr) || upperStr === 'ERROR') {
      parseErrors.push({ value, reason: 'EXCEL_ERROR' });
      return;
    }

    const cleaned = strVal
      .replace(/[$£€₹¥₩]/g, '')
      .replace(/,/g, '')
      .replace(/%$/, '')
      .replace(/^\((.+)\)$/, '-$1');

    const num = parseFloat(cleaned);
    if (isNaN(num) || !isFinite(num)) {
      parseErrors.push({ value, reason: 'PARSE_FAIL' });
      return;
    }

    parsed.push(num);
  });

  const reasonable = parsed.filter(v => v < 1e12 && v > -1e12);
  const extremeRemoved = parsed.filter(v => v >= 1e12 || v <= -1e12);

  let cleanArray: number[] = [];
  let outliers: number[] = [];
  let mean = 0;
  let stddev = 0;

  if (reasonable.length < 4) {
    cleanArray = reasonable;
    outliers = [];
    if (cleanArray.length > 0) {
      mean = cleanArray.reduce((a, b) => a + b, 0) / cleanArray.length;
    }
  } else {
    mean = reasonable.reduce((a, b) => a + b, 0) / reasonable.length;
    const variance = reasonable.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / reasonable.length;
    stddev = Math.sqrt(variance);

    const lowerFence = mean - (3 * stddev);
    const upperFence = mean + (3 * stddev);

    cleanArray = reasonable.filter(v => v >= lowerFence && v <= upperFence);
    outliers = reasonable.filter(v => v < lowerFence || v > upperFence);
  }

  const sorted = [...cleanArray].sort((a, b) => a - b);
  const n = sorted.length;

  const isCurrency = rawArray.some(v => /[$£€₹¥₩]/.test(String(v)));
  const isPercentage = rawArray.some(v => String(v).includes('%')) || cleanArray.every(v => v >= 0 && v <= 1);
  const isInteger = cleanArray.every(v => v === Math.floor(v));

  const stats = {
    raw_count: rawArray.length,
    clean_count: n,
    null_count: nullCount,
    parse_error_count: parseErrors.length,
    extreme_count: extremeRemoved.length,
    outlier_count: outliers.length,
    total_excluded: rawArray.length - n,
    sum: cleanArray.reduce((a, b) => a + b, 0),
    avg: n > 0 ? cleanArray.reduce((a, b) => a + b, 0) / n : 0,
    min: n > 0 ? sorted[0] : 0,
    max: n > 0 ? sorted[n - 1] : 0,
    median: n > 0 ? sorted[Math.floor(n / 2)] : 0,
    stddev,
    p25: n > 0 ? sorted[Math.floor(n * 0.25)] : 0,
    p75: n > 0 ? sorted[Math.floor(n * 0.75)] : 0,
    is_currency: isCurrency,
    is_percentage: isPercentage,
    is_integer: isInteger
  };

  return { cleanArray, outliers, stats, parseErrors };
}

// ─── Algorithm 3.2: Date Column Cleaning & Stats ─────────────────
export function cleanDateColumn(rawArray: any[]) {
  const validDates: { original: any; parsed: Date; format: string }[] = [];
  const invalidDates: { value: any; reason: string }[] = [];
  const formatsFound: Record<string, number> = {};

  rawArray.forEach(value => {
    if (value === null || value === undefined || String(value).trim() === '') {
      invalidDates.push({ value, reason: 'NULL' });
      return;
    }

    const strVal = String(value).trim();
    let patternMatched = false;

    for (const pattern of DATE_PATTERNS) {
      if (pattern.regex.test(strVal)) {
        try {
          const parsedDate = pattern.parse(strVal);
          if (parsedDate && !isNaN(parsedDate.getTime())) {
            const yr = parsedDate.getFullYear();
            if (yr >= 1900 && yr <= 2100) {
              validDates.push({
                original: value,
                parsed: parsedDate,
                format: pattern.name
              });
              formatsFound[pattern.name] = (formatsFound[pattern.name] || 0) + 1;
              patternMatched = true;
              break;
            }
          }
        } catch (_) {}
      }
    }

    if (!patternMatched) {
      invalidDates.push({ value, reason: 'NO_FORMAT_MATCH' });
    }
  });

  const validTimes = validDates.map(d => d.parsed.getTime());
  const earliest = validTimes.length > 0 ? new Date(Math.min(...validTimes)) : null;
  const latest = validTimes.length > 0 ? new Date(Math.max(...validTimes)) : null;
  const spanDays = (earliest && latest) ? Math.round((latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  const dateStats = {
    valid_count: validDates.length,
    invalid_count: invalidDates.length,
    valid_pct: rawArray.length > 0 ? (validDates.length / rawArray.length) * 100 : 0,
    earliest: earliest ? earliest.toISOString() : null,
    latest: latest ? latest.toISOString() : null,
    span_days: spanDays,
    span_months: spanDays / 30,
    span_years: spanDays / 365,
    formats_found: formatsFound,
    invalid_sample: invalidDates.slice(0, 10).map(d => d.value)
  };

  return { validDates: validDates.map(d => d.parsed), invalidDates, stats: dateStats };
}

// ─── Algorithm 3.3: Category Column Cleaning & Stats ─────────────
export function cleanCategoryColumn(rawArray: any[]) {
  const cleanValues: string[] = [];
  const dirtyValues: string[] = [];

  rawArray.forEach(value => {
    if (value === null || value === undefined) {
      dirtyValues.push('');
      return;
    }
    const trimmed = String(value).trim();
    if (DIRTY_SENTINEL_VALUES.includes(trimmed)) {
      dirtyValues.push(trimmed);
    } else {
      cleanValues.push(trimmed);
    }
  });

  const valueCounts: Record<string, number> = {};
  cleanValues.forEach(v => {
    valueCounts[v] = (valueCounts[v] || 0) + 1;
  });

  const sortedCounts = Object.entries(valueCounts)
    .sort((a, b) => b[1] - a[1]);

  const total = rawArray.length;
  const valuePcts: Record<string, number> = {};
  Object.entries(valueCounts).forEach(([val, count]) => {
    valuePcts[val] = total > 0 ? (count / total) * 100 : 0;
  });

  const categoryStats = {
    total,
    clean_count: cleanValues.length,
    dirty_count: dirtyValues.length,
    unique_clean: sortedCounts.length,
    top_20: sortedCounts.slice(0, 20).map(([label, count]) => ({ label, count })),
    value_pcts: valuePcts
  };

  return { cleanValues, dirtyValues, stats: categoryStats };
}

// ─── Duplicate Detection ──────────────────────────────────────────
export interface DuplicateReport {
  exactDuplicatesCount: number;
  duplicateIdsCount: number;
  exactDuplicateRows: number[];
  duplicateIdRows: number[];
}

export function detectDuplicates(rows: any[], primaryIdKey: string): DuplicateReport {
  const seenHashes = new Map<string, number>();
  const seenIds = new Map<string, string>();
  const exactDuplicateIndices: number[] = [];
  const duplicateIdIndices: number[] = [];
  let duplicateIdsCount = 0;

  rows.forEach((row, idx) => {
    const fingerprint = JSON.stringify(
      Object.fromEntries(Object.keys(row).sort().map(k => [k, row[k]]))
    );

    let isExactDuplicate = false;
    if (seenHashes.has(fingerprint)) {
      exactDuplicateIndices.push(idx);
      isExactDuplicate = true;
    } else {
      seenHashes.set(fingerprint, idx);
    }

    if (!isExactDuplicate && primaryIdKey && row[primaryIdKey] !== undefined && row[primaryIdKey] !== null) {
      const idKey = String(row[primaryIdKey]);
      if (seenIds.has(idKey)) {
        if (seenIds.get(idKey) !== fingerprint) {
          duplicateIdsCount++;
          duplicateIdIndices.push(idx);
        }
      } else {
        seenIds.set(idKey, fingerprint);
      }
    }
  });

  return {
    exactDuplicatesCount: exactDuplicateIndices.length,
    duplicateIdsCount,
    exactDuplicateRows: exactDuplicateIndices,
    duplicateIdRows: duplicateIdIndices,
  };
}

// ─── Number Formatting ────────────────────────────────────────────
export function formatNumber(
  value: number,
  typeOrIsCurrency: 'currency' | 'number' | 'percent' | 'decimal' | boolean = 'number',
  abbreviate: boolean = false
): string {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
    return '--';
  }

  let type: 'currency' | 'number' | 'percent' | 'decimal' = 'number';
  if (typeof typeOrIsCurrency === 'boolean') {
    type = typeOrIsCurrency ? 'currency' : 'number';
  } else {
    type = typeOrIsCurrency;
  }

  if (type === 'percent') {
    const multiplied = Math.abs(value) <= 1 ? value * 100 : value;
    const formatted = new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1
    }).format(multiplied);
    return `${formatted}%`;
  }

  if (type === 'decimal') {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    }).format(value);
  }

  const absVal = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abbreviate && absVal >= 1000) {
    let divider = 1;
    let suffix = '';
    if (absVal >= 1e12) {
      divider = 1e12;
      suffix = 'T';
    } else if (absVal >= 1e9) {
      divider = 1e9;
      suffix = 'B';
    } else if (absVal >= 1e6) {
      divider = 1e6;
      suffix = 'M';
    } else {
      divider = 1e3;
      suffix = 'K';
    }

    const divided = absVal / divider;
    const fd = divided < 100 ? 1 : 0;
    const formattedDivided = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: fd,
      maximumFractionDigits: fd
    }).format(divided);

    return type === 'currency' ? `${sign}$${formattedDivided}${suffix}` : `${sign}${formattedDivided}${suffix}`;
  }

  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(absVal);

  return type === 'currency' ? `${sign}$${formatted}` : `${sign}${formatted}`;
}

export function formatYAxisTick(v: number): string {
  if (v === 0) return '0';
  return formatNumber(v, 'number', true);
}
