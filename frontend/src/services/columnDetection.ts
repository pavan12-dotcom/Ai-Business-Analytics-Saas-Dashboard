// columnDetection.ts

export type ColumnType = 'metric' | 'date' | 'time' | 'category' | 'identifier';

function detectColumnType(columnName: string, values: any[]): ColumnType {
  const name = columnName.toLowerCase().trim();

  // ─── BLOCK 1: Name-based exclusions (check this FIRST) ───
  const identifierKeywords = [
    'id', 'code', 'ref', 'number', 'no', 'num', 'key', 'uuid', 
    'name', 'customer', 'company', 'email', 'phone', 'address', 
    'country', 'city', 'industry'
  ];
  
  if (identifierKeywords.some(keyword => name.includes(keyword))) {
    return 'identifier';  // ← never show as KPI, never chart it
  }

  // ─── BLOCK 2: Value-based checks ───
  const sample = values.filter(v => v !== null && v !== undefined).slice(0, 10);

  if (sample.length === 0) {
    return 'identifier';
  }

  // Check for mixed string+number values like "CUST-1001"
  const hasMixedFormat = sample.some(v => 
    typeof v === 'string' && /[a-zA-Z]/.test(v) && /[0-9]/.test(v)
  );
  if (hasMixedFormat) return 'identifier';

  // Check dates
  if (sample.every(v => {
    if (v instanceof Date) return true;
    const parsed = Date.parse(String(v));
    return !isNaN(parsed) && parsed > 0;
  })) {
    return 'time';
  }

  // Check pure numbers
  if (sample.every(v => {
    if (typeof v === 'number' && !isNaN(v)) return true;
    const cleanVal = String(v).replace(/[^\d\.-]/g, '').trim();
    return cleanVal !== '' && !isNaN(Number(cleanVal));
  })) {
    return 'metric';
  }

  // Check categories (repeated values like Active/Churned)
  const unique = new Set(sample).size;
  if (unique <= sample.length * 0.5) return 'category';

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
