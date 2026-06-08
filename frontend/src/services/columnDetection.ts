// columnDetection.ts
import { cleanNumericValue, cleanDateValue } from './dataCleaner'

export type ColumnType = 'metric' | 'date' | 'time' | 'category' | 'identifier';

// Keywords that STRONGLY indicate an identifier column.
// Matched as whole word OR as a suffix (e.g. "order_id", "customer_no").
// We intentionally keep this list tight so we don't accidentally block metric
// columns that happen to contain a weak keyword like "number".
const STRONG_ID_KEYWORDS = [
  'email', 'phone', 'address', 'url', 'uuid', 'guid',
];

// Suffix / standalone keywords (matched at word-boundary / column end)
const SUFFIX_ID_KEYWORDS = [
  '_id', '_key', '_ref', '_code', '_no', '_num', '_uuid',
];

// Name-only identifiers (column name IS exactly one of these)
const EXACT_ID_NAMES = new Set([
  'id', 'key', 'ref', 'code', 'no', 'num', 'name', 'customer', 'company',
  'client', 'user', 'email', 'phone', 'address', 'country', 'city', 'industry',
]);

function isLikelyIdentifierByName(columnName: string): boolean {
  const name = columnName.toLowerCase().trim();

  // Exact match
  if (EXACT_ID_NAMES.has(name)) return true;

  // Strong keyword anywhere in the name
  if (STRONG_ID_KEYWORDS.some(kw => name.includes(kw))) return true;

  // Suffix checks (e.g. OrderID, DealID, CustomerKey, etc.)
  if (name.endsWith('id') && !['paid', 'void', 'solid', 'liquid', 'acid', 'hybrid'].includes(name)) return true;
  if (name.endsWith('key') || name.endsWith('ref') || name.endsWith('code') || name.endsWith('no') || name.endsWith('num') || name.endsWith('uuid')) return true;

  // Suffix / infix keyword
  if (SUFFIX_ID_KEYWORDS.some(kw => name.includes(kw))) return true;

  return false;
}

function detectColumnType(columnName: string, values: any[]): ColumnType {
  const name = columnName.toLowerCase().trim();

  const sample = values.filter(v => v !== null && v !== undefined && v !== '').slice(0, 50);
  if (sample.length === 0) return 'identifier';

  // 1. BOOLEAN / CATEGORY check (2 unique values)
  const uniqueSample = new Set(sample.map(v => String(v).trim().toLowerCase()));
  if (uniqueSample.size === 2) {
    return 'category';
  }

  // 2. DATE check (try 10+ formats via cleanDateValue)
  // If >50% parse successfully, type is 'time'
  const dateParseCount = sample.filter(v => cleanDateValue(v) !== null).length;
  if (dateParseCount / sample.length > 0.5) {
    return 'time';
  }

  // 3. NUMERIC check (strip $, commas, %, (), spaces via cleanNumericValue)
  const numericParseCount = sample.filter(v => cleanNumericValue(v) !== null).length;
  const numericRatio = numericParseCount / sample.length;
  if (numericRatio >= 0.4) {
    const isStrongId = STRONG_ID_KEYWORDS.some(kw => name.includes(kw));
    if (!isStrongId) return 'metric';
  }

  // 4. CATEGORY check: text columns < 50 unique values
  const nonNullAll = values.filter(v => v !== null && v !== undefined && v !== '').map(v => String(v).trim());
  const uniqueAll = new Set(nonNullAll);
  if (uniqueAll.size > 0 && uniqueAll.size < 50) {
    return 'category';
  }

  // 5. ID check: high cardinality text (>80% unique)
  if (nonNullAll.length > 0) {
    const cardinality = uniqueAll.size / nonNullAll.length;
    if (cardinality > 0.8) {
      return 'identifier';
    }
  }

  // Fallback heuristics
  if (isLikelyIdentifierByName(name)) return 'identifier';

  // Fallback to category if low unique count (e.g. 50% sample)
  if (uniqueSample.size <= sample.length * 0.5) return 'category';

  return 'identifier';
}

export function detectColumnTypes(rows: any[], headers: string[]): Record<string, ColumnType> {
  const metadata: Record<string, ColumnType> = {};

  if (!rows || rows.length === 0) return metadata;

  headers.forEach((header) => {
    const values = rows.map((row) => row[header]);
    metadata[header] = detectColumnType(header, values);
  });

  return metadata;
}
