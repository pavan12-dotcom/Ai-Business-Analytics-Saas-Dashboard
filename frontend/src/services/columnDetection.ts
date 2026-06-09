// columnDetection.ts

export type ColumnType = 'metric' | 'date' | 'time' | 'category' | 'identifier';

export interface DetailedColumnInfo {
  type: 'EMPTY' | 'UNKNOWN' | 'NUMERIC' | 'DATE' | 'BOOLEAN' | 'LOW_CATEGORY' | 'MED_CATEGORY' | 'HIGH_CATEGORY' | 'IDENTIFIER' | 'FREE_TEXT' | 'HIGH_CARDINALITY_TEXT' | 'MIXED';
  subType?: 'INTEGER_COUNT' | 'RATIO' | 'PERCENTAGE' | 'AMOUNT' | 'SIGNED_AMOUNT' | string;
  confidence: number;
  bestFormat?: string;
  trueValue?: any;
  falseValue?: any;
  numericPortion?: number;
  textPortion?: number;
}

const EMPTY_VALUES = new Set([
  'null', 'NULL', 'Null', 'None', 'NONE', 'none', 'NA', 'N/A', 'n/a', '#N/A', '-', '--', '', ' ', 'undefined', 'UNDEFINED'
]);

// Date Pattern specifications for parsing
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

export function detectDetailedColumnType(columnName: string, values: any[]): DetailedColumnInfo {
  const totalValues = values.length;
  
  // STEP 2.1 — BASIC SCAN
  const emptyIndices = new Set<number>();
  const nonEmptyValues: any[] = [];
  
  values.forEach((v, idx) => {
    if (v === null || v === undefined) {
      emptyIndices.add(idx);
    } else {
      const strVal = String(v).trim();
      if (EMPTY_VALUES.has(strVal) || strVal === '') {
        emptyIndices.add(idx);
      } else {
        nonEmptyValues.push(v);
      }
    }
  });

  const emptyCount = emptyIndices.size;
  const nonEmptyCount = totalValues - emptyCount;

  if (nonEmptyCount === 0) {
    return { type: 'EMPTY', confidence: 100 };
  }

  if (nonEmptyCount < 3) {
    return { type: 'UNKNOWN', confidence: 0 };
  }

  // Draw random sample of min(50, non_empty)
  const sampleSize = Math.min(50, nonEmptyCount);
  const sampleValues: any[] = [];
  const tempValues = [...nonEmptyValues];
  for (let i = 0; i < sampleSize; i++) {
    const randIdx = Math.floor(Math.random() * tempValues.length);
    sampleValues.push(tempValues.splice(randIdx, 1)[0]);
  }

  // STEP 2.2 — NUMERIC TEST
  let numericScore = 0;
  const parsedValues: number[] = [];
  const originalValuesContainingPct = sampleValues.some(v => String(v).includes('%'));
  const originalValuesContainingCurrency = sampleValues.some(v => /[$£€₹¥₩]/.test(String(v)));

  sampleValues.forEach(val => {
    const cleaned = String(val)
      .replace(/[$£€₹¥₩]/g, '')
      .replace(/,/g, '')
      .replace(/\s/g, '')
      .replace(/%$/, '')
      .replace(/^\((.+)\)$/, '-$1');

    const num = parseFloat(cleaned);
    if (!isNaN(num) && isFinite(num)) {
      numericScore += 1;
      parsedValues.push(num);
    }
  });

  const numericPct = numericScore / sampleSize;

  if (numericPct >= 0.60) {
    // IS NUMERIC - Subclassify
    let subType: 'INTEGER_COUNT' | 'RATIO' | 'PERCENTAGE' | 'AMOUNT' | 'SIGNED_AMOUNT' = 'AMOUNT';
    const allIntegers = parsedValues.every(v => v === Math.floor(v));
    const minVal = Math.min(...parsedValues);
    const maxVal = Math.max(...parsedValues);
    const mostGreaterThan1000 = parsedValues.filter(v => v > 1000).length / parsedValues.length > 0.5;

    if (allIntegers && maxVal < 1000000) {
      subType = 'INTEGER_COUNT';
    } else if (maxVal <= 1.0 && minVal >= 0) {
      subType = 'RATIO';
    } else if (maxVal <= 100 && minVal >= 0 && originalValuesContainingPct) {
      subType = 'PERCENTAGE';
    } else if (mostGreaterThan1000) {
      subType = 'AMOUNT';
    } else if (parsedValues.some(v => v < 0)) {
      subType = 'SIGNED_AMOUNT';
    }

    return {
      type: 'NUMERIC',
      subType,
      confidence: numericPct * 100
    };
  }

  // STEP 2.3 — DATE TEST (only if numeric_pct < 0.60)
  let dateScore = 0;
  const dateFormatsFound: Record<string, number> = {};

  sampleValues.forEach(val => {
    const strVal = String(val).trim();
    for (const pattern of DATE_PATTERNS) {
      if (pattern.regex.test(strVal)) {
        try {
          const date = pattern.parse(strVal);
          if (date && !isNaN(date.getTime())) {
            const yr = date.getFullYear();
            if (yr >= 1900 && yr <= 2100) {
              dateScore += 1;
              dateFormatsFound[pattern.name] = (dateFormatsFound[pattern.name] || 0) + 1;
              break;
            }
          }
        } catch (_) {}
      }
    }
  });

  const datePct = dateScore / sampleSize;

  if (datePct >= 0.40) {
    let bestFormat = 'ISO';
    let maxFormatCount = 0;
    Object.entries(dateFormatsFound).forEach(([fmt, count]) => {
      if (count > maxFormatCount) {
        maxFormatCount = count;
        bestFormat = fmt;
      }
    });

    return {
      type: 'DATE',
      bestFormat,
      confidence: datePct * 100
    };
  }

  // STEP 2.4 — CATEGORY TEST (only if not NUMERIC or DATE)
  const fullColumnNonEmpty = nonEmptyValues;
  const uniqueValues = new Set(fullColumnNonEmpty.map(v => String(v).trim().toLowerCase()));
  const uniqueCount = uniqueValues.size;
  const totalNonEmpty = fullColumnNonEmpty.length;
  const uniqueRatio = uniqueCount / totalNonEmpty;

  const totalLength = sampleValues.reduce((sum, v) => sum + String(v).length, 0);
  const avgLength = totalLength / sampleSize;

  if (uniqueCount === 2) {
    const valCounts: Record<string, number> = {};
    fullColumnNonEmpty.forEach(v => {
      const strVal = String(v).trim();
      valCounts[strVal] = (valCounts[strVal] || 0) + 1;
    });
    const sortedVals = Object.entries(valCounts).sort((a, b) => b[1] - a[1]);
    return {
      type: 'BOOLEAN',
      trueValue: sortedVals[0]?.[0] ?? 'True',
      falseValue: sortedVals[1]?.[0] ?? 'False',
      confidence: 95
    };
  }

  if (uniqueCount <= 15 && uniqueRatio < 0.5) {
    return { type: 'LOW_CATEGORY', confidence: 90 };
  }

  if (uniqueCount <= 50 && uniqueRatio < 0.3) {
    return { type: 'MED_CATEGORY', confidence: 80 };
  }

  if (uniqueRatio > 0.8 && avgLength < 30) {
    return { type: 'IDENTIFIER', confidence: 85 };
  }

  if (uniqueRatio > 0.8 && avgLength >= 30) {
    return { type: 'FREE_TEXT', confidence: 75 };
  }

  if (uniqueCount <= 200) {
    return { type: 'HIGH_CATEGORY', confidence: 70 };
  }

  // STEP 2.5 — MIXED TYPE CHECK (can check if it was partially numeric)
  const nonNumericNonEmptyPct = 1 - numericPct;
  if (numericPct >= 0.20 && numericPct < 0.60 && nonNumericNonEmptyPct >= 0.20) {
    return {
      type: 'MIXED',
      numericPortion: numericPct,
      textPortion: nonNumericNonEmptyPct,
      confidence: 70
    };
  }

  return { type: 'HIGH_CARDINALITY_TEXT', confidence: 60 };
}

// Map the detailed column types to the existing frontend type system
export function detectColumnTypes(rows: any[], headers: string[]): Record<string, ColumnType> {
  const metadata: Record<string, ColumnType> = {};

  if (!rows || rows.length === 0) return metadata;

  headers.forEach((header) => {
    const values = rows.map((row) => row[header]);
    const detailed = detectDetailedColumnType(header, values);

    // Map DetailedColumnInfo back to ColumnType
    if (detailed.type === 'NUMERIC') {
      metadata[header] = 'metric';
    } else if (detailed.type === 'DATE') {
      metadata[header] = 'time';
    } else if (detailed.type === 'BOOLEAN' || detailed.type === 'LOW_CATEGORY' || detailed.type === 'MED_CATEGORY' || detailed.type === 'HIGH_CATEGORY') {
      metadata[header] = 'category';
    } else if (detailed.type === 'IDENTIFIER' || detailed.type === 'FREE_TEXT' || detailed.type === 'HIGH_CARDINALITY_TEXT' || detailed.type === 'EMPTY' || detailed.type === 'UNKNOWN') {
      metadata[header] = 'identifier';
    } else if (detailed.type === 'MIXED') {
      metadata[header] = (detailed.numericPortion ?? 0) >= (detailed.textPortion ?? 0) ? 'metric' : 'category';
    } else {
      metadata[header] = 'identifier';
    }
  });

  return metadata;
}
