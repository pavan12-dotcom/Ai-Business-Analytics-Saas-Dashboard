// SpreadsheetContext.tsx
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { detectColumnTypes } from '../services/columnDetection'
import { fetchSpreadsheet, uploadSpreadsheet, deleteSpreadsheet, fetchDocument, uploadDocument, deleteDocument, reparseDocument } from '../services/api'
import { useAuth } from './AuthContext'
import { computeAnalytics, type AnalyticsResult } from '../services/analyticsEngine'
import { cleanNumericValue, formatNumber, detectDuplicates } from '../services/dataCleaner'
import type { SampleDataset } from '../data/sampleDatasets'
import { DataEngine } from '../services/dataEngine'

// ── Sheet info for multi-sheet Excel workbooks ────────────────────
export interface SheetInfo {
  name: string
  rowCount: number
}

interface SpreadsheetContextType {
  activeSheet: any
  loading: boolean
  upload: (file: File) => Promise<{ success: boolean; error: string | null }>
  reset: () => Promise<void>
  getSpreadsheetCustomers: () => any[]
  getSpreadsheetMonthlyMetrics: () => any[]
  getSpreadsheetKPIs: () => any
  activeDocument: any
  loadingDoc: boolean
  uploadDoc: (file: File) => Promise<{ success: boolean; error: string | null }>
  resetDoc: () => Promise<void>
  reparseDoc: () => Promise<{ success: boolean; rowCount?: number; message?: string }>
  // Analytics engine
  analytics: AnalyticsResult
  hasData: boolean
  datasetName: string
  loadSample: (dataset: SampleDataset) => void
  // Multi-sheet support
  sheetNames: SheetInfo[]
  activeSheetName: string
  selectSheet: (name: string) => Promise<void>
  // Selected Column Overrides
  selectedTimeKey: string
  setSelectedTimeKey: React.Dispatch<React.SetStateAction<string>>
  selectedCategoryKey: string
  setSelectedCategoryKey: React.Dispatch<React.SetStateAction<string>>
  selectedPrimaryMetricKey: string
  setSelectedPrimaryMetricKey: React.Dispatch<React.SetStateAction<string>>
  selectedSecondaryMetricKey: string
  setSelectedSecondaryMetricKey: React.Dispatch<React.SetStateAction<string>>
  engine: DataEngine | null
  sharedKPIs: {
    revenue: any
    customers: any
    ltvCac: any
    domain: any
  } | null
  shared: {
    domain: string
    vocab: any
    entityKPIs: any
    monetaryKPIs: any
    grouping: any
  } | null
}

const SpreadsheetContext = createContext<SpreadsheetContextType>({} as SpreadsheetContextType)

// Session storage keys
const SS_KEY_SHEETS_DATA  = 'ss_sheets_data'    // { [sheetName]: { rows, headers, columns_metadata } }
const SS_KEY_FILENAME     = 'ss_filename'
const SS_KEY_ACTIVE_SHEET = 'ss_active_sheet'

const cleanMetadata = (meta: any) => {
  if (!meta) return {}
  const cleaned: any = {}
  for (const key in meta) {
    if (!key.startsWith('__')) {
      cleaned[key] = meta[key]
    }
  }
  return cleaned
}

function decodeText(arrayBuffer: ArrayBuffer): string {
  const encodings = ['utf-8', 'utf-16le', 'utf-16be', 'latin1'];
  for (const enc of encodings) {
    try {
      const decoder = new TextDecoder(enc, { fatal: true });
      let text = decoder.decode(arrayBuffer);
      if (text.charCodeAt(0) === 0xFEFF || text.charCodeAt(0) === 0xFFFE) {
        text = text.substring(1);
      }
      return text;
    } catch (_) {}
  }
  const decoder = new TextDecoder('utf-8');
  let text = decoder.decode(arrayBuffer);
  if (text.charCodeAt(0) === 0xFEFF || text.charCodeAt(0) === 0xFFFE) {
    text = text.substring(1);
  }
  return text;
}

function detectDelimiter(text: string): string {
  const delimiters = [',', ';', '|', '\t'];
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '').slice(0, 10);
  if (lines.length === 0) return ',';

  let bestDelimiter = ',';
  let bestScore = -1;

  delimiters.forEach(delim => {
    const counts = lines.map(line => line.split(delim).length - 1);
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    if (avg === 0) return;
    const variance = counts.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / counts.length;
    const score = avg / (variance + 1);
    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delim;
    }
  });
  return bestDelimiter;
}

function cleanedNumeric(v: string) {
  return v.replace(/[$£€₹¥₩]/g, '').replace(/,/g, '').replace(/\s/g, '').replace(/%$/, '').replace(/^\((.+)\)$/, '-$1');
}

function detectHeaders(row0: any[]): { hasHeaders: boolean; headers: string[] } {
  if (!row0 || row0.length === 0) {
    return { hasHeaders: false, headers: [] };
  }
  let totalScore = 0;
  const numCells = row0.length;

  row0.forEach(cell => {
    if (cell === null || cell === undefined) {
      totalScore -= 10;
      return;
    }
    const strVal = String(cell).trim();
    if (strVal === '') {
      totalScore -= 10;
      return;
    }

    const isNumeric = !isNaN(Number(cleanedNumeric(strVal)));
    if (isNumeric) {
      totalScore -= 10;
    } else {
      const hasNumbers = /\d/.test(strVal);
      if (!hasNumbers) {
        totalScore += 20;
      } else {
        totalScore += 10;
      }
    }
    if (strVal.length >= 2 && strVal.length <= 30) {
      totalScore += 5;
    }
  });

  const maxPossibleScore = numCells * 25;
  const scorePct = maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;
  const hasHeaders = scorePct > 0.60;

  const headers = row0.map((cell, idx) => {
    if (hasHeaders) {
      let name = String(cell).trim();
      return name === '' ? `Col_${idx + 1}` : name;
    } else {
      return `Col_${idx + 1}`;
    }
  });

  const cleaned: string[] = [];
  const counts: Record<string, number> = {};
  headers.forEach(h => {
    let clean = h.trim().replace(/[^a-zA-Z0-9]/g, '_');
    if (clean === '') clean = 'Col';
    if (counts[clean]) {
      counts[clean]++;
      clean = `${clean}_${counts[clean]}`;
    } else {
      counts[clean] = 1;
    }
    cleaned.push(clean);
  });

  return { hasHeaders, headers: cleaned };
}

function getRandomSubset(arr: any[], size: number): any[] {
  if (size >= arr.length) return arr;
  const result = new Array(size);
  let len = arr.length;
  const taken = new Array(len);
  let n = size;
  while (n--) {
    const x = Math.floor(Math.random() * len);
    result[n] = arr[x in taken ? taken[x] : x];
    taken[x] = --len in taken ? taken[len] : len;
  }
  return result;
}

function sampleDataset(rows: any[]): { sampledRows: any[]; sampleFlag: string | null } {
  const totalRows = rows.length;
  if (totalRows <= 20000) {
    return { sampledRows: rows, sampleFlag: null };
  }

  const first1000 = rows.slice(0, 1000);
  const last1000 = rows.slice(-1000);

  if (totalRows <= 100000) {
    const randomCount = 4000;
    const middleRows = rows.slice(1000, -1000);
    const randomSample = getRandomSubset(middleRows, randomCount);
    const sampledRows = [...first1000, ...randomSample, ...last1000];
    return {
      sampledRows,
      sampleFlag: `Sampled 6,000 of ${totalRows.toLocaleString()} rows`
    };
  } else {
    const randomCount = 8000;
    const middleRows = rows.slice(1000, -1000);
    const randomSample = getRandomSubset(middleRows, randomCount);
    const sampledRows = [...first1000, ...randomSample, ...last1000];
    return {
      sampledRows,
      sampleFlag: `Sampled 10,000 of ${totalRows.toLocaleString()} rows`
    };
  }
}

function parseExcelWorkbook(ab: ArrayBuffer): {
  sheets: Record<string, { rows: any[]; headers: string[]; rawRows: any[][] }>;
  sheetInfos: SheetInfo[];
  bestSheetName: string;
} {
  const wb = XLSX.read(ab, { type: 'array', cellDates: true });
  const sheets: Record<string, { rows: any[]; headers: string[]; rawRows: any[][] }> = {};
  const sheetInfos: SheetInfo[] = [];

  let highestRowCount = 0;
  wb.SheetNames.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
    if (rawRows.length > highestRowCount) {
      highestRowCount = rawRows.length;
    }
  });

  wb.SheetNames.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
    const row0 = rawRows[0] || [];
    
    const headerDetect = detectHeaders(row0);
    const headers = headerDetect.headers;
    let dataRows: any[] = [];

    if (rawRows.length > 0) {
      const bodyRows = headerDetect.hasHeaders ? rawRows.slice(1) : rawRows;
      dataRows = bodyRows.map((row) => {
        const obj: any = {};
        headers.forEach((h, colIdx) => {
          obj[h] = row[colIdx] !== undefined ? row[colIdx] : null;
        });
        return obj;
      });
    }

    sheets[sheetName] = {
      rows: dataRows,
      headers,
      rawRows
    };

    sheetInfos.push({
      name: sheetName,
      rowCount: dataRows.length
    });
  });

  let bestSheetName = wb.SheetNames[0] || '';
  let bestScore = -Infinity;

  wb.SheetNames.forEach(sheetName => {
    const wsData = sheets[sheetName];
    const rowCount = wsData.rows.length;
    const colCount = wsData.headers.length;
    const isHighest = rowCount === highestRowCount;

    let score = 0;
    if (isHighest) score += 50;
    if (colCount > 3) score += 30;

    const row0 = wsData.rawRows[0] || [];
    const headerDetect = detectHeaders(row0);
    if (headerDetect.hasHeaders) {
      score += 20;
    }

    if (rowCount < 5) score -= 50;

    if (score > bestScore) {
      bestScore = score;
      bestSheetName = sheetName;
    }
  });

  return { sheets, sheetInfos, bestSheetName };
}

export function SpreadsheetProvider({ children }: { children: React.ReactNode }) {
  const [activeSheet, setActiveSheet] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeDocument, setActiveDocument] = useState<any>(null)
  const [loadingDoc, setLoadingDoc] = useState(true)
  const [sampleSheet, setSampleSheet] = useState<any>(null) // loaded sample dataset
  const { user, incrementUploadCount, isGuest, isGuestTrialExhausted, setShowSignupModal, refreshSubscription } = useAuth()

  // ── Restore multi-sheet state from sessionStorage on mount ────
  const _restoredSheets = (() => {
    try {
      const raw = sessionStorage.getItem(SS_KEY_SHEETS_DATA)
      return raw ? JSON.parse(raw) : {}
    } catch { return {} }
  })()
  const _restoredFilename = sessionStorage.getItem(SS_KEY_FILENAME) || ''
  const _restoredActiveName = sessionStorage.getItem(SS_KEY_ACTIVE_SHEET) || ''
  const _restoredSheetInfos: SheetInfo[] = Object.keys(_restoredSheets).map((name: string) => ({
    name,
    rowCount: (_restoredSheets[name]?.rows?.length ?? 0)
  }))

  // Multi-sheet state — initialized from sessionStorage if available
  const [sheetNames, setSheetNames] = useState<SheetInfo[]>(_restoredSheetInfos)
  const [activeSheetName, setActiveSheetName] = useState(_restoredActiveName)
  const [sheetsData, setSheetsData] = useState<Record<string, any>>(_restoredSheets)
  const [sheetsFilename, setSheetsFilename] = useState(_restoredFilename)

  // Helper: persist to sessionStorage whenever multi-sheet state changes
  const persistSheetsData = (data: Record<string, any>, filename: string, activeName: string) => {
    try {
      sessionStorage.setItem(SS_KEY_SHEETS_DATA, JSON.stringify(data))
      sessionStorage.setItem(SS_KEY_FILENAME, filename)
      sessionStorage.setItem(SS_KEY_ACTIVE_SHEET, activeName)
    } catch (e) {
      // sessionStorage may be full for very large files — silently ignore
      console.warn('sessionStorage write failed (possibly too large):', e)
    }
  }

  useEffect(() => {
    if (!user) {
      setActiveSheet(null)
      setLoading(false)
      return
    }
    setLoading(true)
    fetchSpreadsheet()
      .then((sheet) => {
        const restoredActiveName = sessionStorage.getItem(SS_KEY_ACTIVE_SHEET)
        const restoredData = (() => {
          try {
            const raw = sessionStorage.getItem(SS_KEY_SHEETS_DATA)
            return raw ? JSON.parse(raw) : null
          } catch { return null }
        })()
        const restoredFilename = sessionStorage.getItem(SS_KEY_FILENAME) || ''

        if (sheet && restoredActiveName && restoredData?.[restoredActiveName] && sheet.filename === restoredFilename) {
          const sd = restoredData[restoredActiveName]
          const sheetInfoList: SheetInfo[] = Object.keys(restoredData).map((name: string) => ({
            name,
            rowCount: restoredData[name]?.rows?.length ?? 0
          }))
          setSheetNames(sheetInfoList)
          setActiveSheetName(restoredActiveName)
          setSheetsData(restoredData)
          setSheetsFilename(restoredFilename)

          setActiveSheet({
            filename: restoredFilename,
            headers: sd.headers,
            columns_metadata: cleanMetadata(sd.columns_metadata),
            rows: sd.rows,
          })
        } else if (sheet) {
          const meta = sheet.columns_metadata || {}
          let finalMetadata = { ...meta }
          if (meta.__sheetNames && meta.__sheetsData) {
            try {
              const parsedSheetNames = JSON.parse(meta.__sheetNames)
              const parsedSheetsData = JSON.parse(meta.__sheetsData)
              
              // Find the sheet with the most rows as default fallback
              const bestSheet = parsedSheetNames.reduce((best: any, s: any) =>
                s.rowCount > best.rowCount ? s : best
              , parsedSheetNames[0])
              const activeName = meta.__activeSheetName || bestSheet?.name || ''
              
              setSheetNames(parsedSheetNames)
              setActiveSheetName(activeName)
              setSheetsData(parsedSheetsData)
              setSheetsFilename(sheet.filename)

              // Persist to session storage
              persistSheetsData(parsedSheetsData, sheet.filename, activeName)

              // Clean metadata
              finalMetadata = cleanMetadata(meta)

              // Load active sheet's data from sheetsData if present
              const activeSheetData = parsedSheetsData[activeName]
              if (activeSheetData) {
                setActiveSheet({
                  filename: sheet.filename,
                  headers: activeSheetData.headers,
                  columns_metadata: cleanMetadata(activeSheetData.columns_metadata),
                  rows: activeSheetData.rows,
                })
              } else {
                setActiveSheet({
                  ...sheet,
                  columns_metadata: finalMetadata
                })
              }
            } catch (e) {
              console.error('Error parsing sheet metadata from backend:', e)
              setActiveSheet({
                ...sheet,
                columns_metadata: finalMetadata
              })
            }
          } else {
            setSheetNames([])
            setActiveSheetName('')
            setSheetsData({})
            setSheetsFilename('')
            finalMetadata = cleanMetadata(meta)
            setActiveSheet({
              ...sheet,
              columns_metadata: finalMetadata
            })
          }
        } else {
          setSheetNames([])
          setActiveSheetName('')
          setSheetsData({})
          setSheetsFilename('')
          try {
            sessionStorage.removeItem(SS_KEY_SHEETS_DATA)
            sessionStorage.removeItem(SS_KEY_FILENAME)
            sessionStorage.removeItem(SS_KEY_ACTIVE_SHEET)
          } catch {}
          setActiveSheet(null)
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error loading active spreadsheet:', err)
        setSheetNames([])
        setActiveSheetName('')
        setSheetsData({})
        setSheetsFilename('')
        try {
          sessionStorage.removeItem(SS_KEY_SHEETS_DATA)
          sessionStorage.removeItem(SS_KEY_FILENAME)
          sessionStorage.removeItem(SS_KEY_ACTIVE_SHEET)
        } catch {}
        setActiveSheet(null)
        setLoading(false)
      })
  }, [user])

  useEffect(() => {
    if (!user) {
      setActiveDocument(null)
      setLoadingDoc(false)
      return
    }
    setLoadingDoc(true)
    fetchDocument()
      .then((doc) => {
        if (doc) setActiveDocument(doc)
        else setActiveDocument(null)
        setLoadingDoc(false)
      })
      .catch((err) => {
        console.error('Error loading active document:', err)
        setActiveDocument(null)
        setLoadingDoc(false)
      })
  }, [user])


  const upload = async (file: File): Promise<{ success: boolean; error: string | null }> => {
    // Block guest upload if demo trial exhausted
    if (isGuest && isGuestTrialExhausted()) {
      setShowSignupModal(true)
      return { success: false, error: 'demo_limit' }
    }
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (extension !== 'xlsx' && extension !== 'xls' && extension !== 'csv' && extension !== 'json') {
      return { success: false, error: 'Invalid file type. Please upload Excel (.xlsx, .xls), CSV (.csv), or JSON (.json) files.' }
    }

    setLoading(true)
    return new Promise((resolve) => {
      const wrappedResolve = (val: { success: boolean; error: string | null }) => {
        setLoading(false)
        resolve(val)
      }
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          let json: any[] = []
          let allSheetsData: Record<string, { rows: any[]; headers: string[]; columns_metadata: Record<string, string> }> = {}
          let sheetInfoList: SheetInfo[] = []
          let bestSheetName = ''

          if (extension === 'json') {
            const text = e.target?.result as string
            const parsed = JSON.parse(text)
            json = Array.isArray(parsed) ? parsed : [parsed]

            // Reset multi-sheet state for non-Excel files
            setSheetNames([])
            setActiveSheetName('')
            setSheetsData({})
            setSheetsFilename('')
          } else if (extension === 'csv') {
            const ab = e.target?.result as ArrayBuffer
            const text = decodeText(ab)
            const delim = detectDelimiter(text)
            
            const lines = text.split(/\r?\n/).map(line => {
              const result: string[] = [];
              let current = '';
              let inQuotes = false;
              for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                  inQuotes = !inQuotes;
                } else if (char === delim && !inQuotes) {
                  result.push(current);
                  current = '';
                } else {
                  current += char;
                }
              }
              result.push(current);
              return result.map(cell => cell.replace(/^"(.*)"$/, '$1').trim());
            }).filter(line => line.length > 0 && line.some(c => c !== ''));

            if (lines.length === 0) {
              resolve({ success: false, error: 'The uploaded CSV contains no data rows.' })
              return
            }

            const row0 = lines[0] || [];
            const headerDetect = detectHeaders(row0);
            const headers = headerDetect.headers;
            
            const bodyLines = headerDetect.hasHeaders ? lines.slice(1) : lines;
            json = bodyLines.map(row => {
              const obj: any = {};
              headers.forEach((h, colIdx) => {
                obj[h] = row[colIdx] !== undefined ? row[colIdx] : null;
              });
              return obj;
            });

            // Reset multi-sheet state for CSV
            setSheetNames([])
            setActiveSheetName('')
            setSheetsData({})
            setSheetsFilename('')
          } else {
            // Excel: parse ALL sheets and score them
            const ab = e.target?.result as ArrayBuffer
            const parsedBook = parseExcelWorkbook(ab)
            
            sheetInfoList = parsedBook.sheetInfos
            bestSheetName = parsedBook.bestSheetName

            // Map sheets data to the structure the app expects
            Object.entries(parsedBook.sheets).forEach(([sheetName, sheetData]) => {
              const columns_metadata = sheetData.rows.length > 0 ? detectColumnTypes(sheetData.rows, sheetData.headers) : {}
              allSheetsData[sheetName] = {
                rows: sheetData.rows,
                headers: sheetData.headers,
                columns_metadata
              }
            })

            // Update multi-sheet state and persist to sessionStorage
            setSheetsData(allSheetsData)
            setSheetsFilename(file.name)
            setSheetNames(sheetInfoList)
            setActiveSheetName(bestSheetName)
            persistSheetsData(allSheetsData, file.name, bestSheetName)

            json = allSheetsData[bestSheetName].rows
          }

          if (json.length === 0) {
            wrappedResolve({ success: false, error: 'The uploaded dataset contains no data rows.' })
            return
          }

          // Limit files to 20,000 rows (Excel) and 2,000 rows (CSV, JSON) for performance
          const isExcel = extension === 'xlsx' || extension === 'xls'
          const maxRows = isExcel ? 20000 : 2000
          if (json.length > maxRows) {
            wrappedResolve({ success: false, error: `Dataset exceeds the limit of ${maxRows.toLocaleString()} rows for ${isExcel ? 'Excel' : 'CSV/JSON'} files. Please upload a smaller file.` })
            return
          }

          const headers = Object.keys(json[0])
          const columnsMetadata = detectColumnTypes(json, headers)

          // Perform data sampling for analysis (Algorithm 1.3)
          const { sampledRows, sampleFlag } = sampleDataset(json)

          // Perform full data calculations (duplicate detection, sum, total counts) (Algorithm 1.3)
          const idKey = Object.entries(columnsMetadata).find(([_, type]) => type === 'identifier')?.[0] || ''
          const dupReport = detectDuplicates(json, idKey)
          
          const fullSums: Record<string, number> = {}
          headers.forEach(h => {
            if (columnsMetadata[h] === 'metric') {
              let sum = 0
              json.forEach(r => {
                const val = cleanNumericValue(r[h])
                if (val !== null && isFinite(val) && Math.abs(val) <= 1e12) {
                  sum += val
                }
              })
              fullSums[h] = sum
            }
          })

          const payload = {
            filename: file.name,
            headers,
            columns_metadata: {
              ...columnsMetadata,
              __fullTotalRows: String(json.length),
              __fullExactDuplicates: String(dupReport.exactDuplicatesCount),
              __fullDuplicateIds: String(dupReport.duplicateIdsCount),
              __fullSums: JSON.stringify(fullSums),
              ...(sampleFlag ? { __sampleFlag: sampleFlag } : {}),
              ...(isExcel && bestSheetName ? {
                __sheetNames: JSON.stringify(sheetInfoList),
                __activeSheetName: bestSheetName,
                __sheetsData: JSON.stringify(allSheetsData)
              } : {})
            },
            rows: sampledRows // Send sampled rows to server for performance
          }

          const response = await uploadSpreadsheet(payload)
          if (response.success) {
            setActiveSheet({
              ...payload,
              columns_metadata: columnsMetadata // clean version for state
            })
            if (isGuest) {
              incrementUploadCount()
            } else {
              refreshSubscription()
            }
            wrappedResolve({ success: true, error: null })
          } else {
            wrappedResolve({ success: false, error: 'Failed to upload dataset data to server.' })
          }
        } catch (err: any) {
          const errMsg = err.response?.data?.error || err.message || 'Unknown server error'
          wrappedResolve({ success: false, error: `Upload Error: ${errMsg}` })
        }
      }
      reader.onerror = () => {
        wrappedResolve({ success: false, error: 'Failed to read dataset file.' })
      }
      if (extension === 'json') {
        reader.readAsText(file)
      } else {
        reader.readAsArrayBuffer(file)
      }
    })
  }

  /**
   * Switch the active sheet in a multi-sheet workbook.
   * Updates dashboard state and posts the new sheet's rows to the backend.
   */
  const selectSheet = async (name: string) => {
    const sheetData = sheetsData[name]
    if (!sheetData) return

    setLoading(true)
    setActiveSheetName(name)
    // Persist active sheet change to sessionStorage
    persistSheetsData(sheetsData, sheetsFilename, name)

    const payload = {
      filename: sheetsFilename,
      headers: sheetData.headers,
      columns_metadata: {
        ...sheetData.columns_metadata,
        __sheetNames: JSON.stringify(sheetNames),
        __activeSheetName: name,
        __sheetsData: JSON.stringify(sheetsData)
      },
      rows: sheetData.rows
    }

    setActiveSheet({
      ...payload,
      columns_metadata: sheetData.columns_metadata // clean version for state
    })
    // Sync to backend (fire-and-forget — not blocking UX)
    try {
      await uploadSpreadsheet(payload)
    } catch (err) {
      console.warn('selectSheet: failed to sync to backend', err)
    } finally {
      setLoading(false)
    }
  }

  const reset = async () => {
    try {
      await deleteSpreadsheet().catch(() => {})
    } catch (err) {
      console.error('Failed to delete spreadsheet from backend:', err)
    }
    setActiveSheet(null)
    setSampleSheet(null)
    setActiveDocument(null)
    setSheetNames([])
    setActiveSheetName('')
    setSheetsData({})
    setSheetsFilename('')
    try {
      sessionStorage.removeItem(SS_KEY_SHEETS_DATA)
      sessionStorage.removeItem(SS_KEY_FILENAME)
      sessionStorage.removeItem(SS_KEY_ACTIVE_SHEET)
    } catch {}
  }

  const uploadDoc = async (file: File): Promise<{ success: boolean; error: string | null }> => {
    // Block guest upload if demo trial exhausted
    if (isGuest && isGuestTrialExhausted()) {
      setShowSignupModal(true)
      return { success: false, error: 'demo_limit' }
    }
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (extension !== 'pdf' && extension !== 'txt') {
      return { success: false, error: 'Invalid file type. Please upload PDF or text files only (.pdf or .txt)' }
    }

    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: 'Document exceeds the limit of 10MB. Please upload a smaller file.' }
    }

    setLoading(true)
    return new Promise((resolve) => {
      const wrappedResolve = (val: { success: boolean; error: string | null }) => {
        setLoading(false)
        resolve(val)
      }
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const dataUrl = e.target?.result as string
          if (!dataUrl) {
            wrappedResolve({ success: false, error: 'Failed to read document file.' })
            return
          }
          const base64 = dataUrl.split(',')[1]

          const payload = {
            filename: file.name,
            base64
          }

          const response = await uploadDocument(payload)
          if (response.success) {
            setActiveDocument({
              filename: file.name,
              textLength: response.textLength,
              created_at: new Date().toISOString(),
              parsedRows: response.parsedRows,
              columnsMetadata: response.columnsMetadata,
              hasParsedData: !!response.parsedRows?.length
            })
            if (isGuest) {
              // guest: increment unified demo_used counter
              incrementUploadCount()
            } else {
              // authenticated: backend has already incremented DB; refresh UI counters
              refreshSubscription()
            }
            wrappedResolve({ success: true, error: null })
          } else {
            wrappedResolve({ success: false, error: 'Failed to upload document.' })
          }
        } catch (err: any) {
          const errMsg = err.response?.data?.error || err.message || 'Unknown server error'
          wrappedResolve({ success: false, error: errMsg })
        }
      }
      reader.onerror = () => {
        wrappedResolve({ success: false, error: 'Failed to read document file.' })
      }
      reader.readAsDataURL(file)
    })
  }

  const resetDoc = async () => {
    try {
      await deleteDocument()
      setActiveDocument(null)
    } catch (err) {
      console.error('Failed to reset document:', err)
    }
  }

  const reparseDoc = async (): Promise<{ success: boolean; rowCount?: number; message?: string }> => {
    try {
      const res = await reparseDocument()
      console.log('[reparseDoc] API response:', res)
      if (res.success) {
        if (res.parsedRows?.length > 0) {
          // Directly inject parsed rows into state
          setActiveDocument((prev: any) => prev ? {
            ...prev,
            parsedRows: res.parsedRows,
            columnsMetadata: res.columnsMetadata,
            hasParsedData: true
          } : prev)
        } else {
          // Fallback: force fresh fetch with cache-bust
          const doc = await fetchDocument()
          console.log('[reparseDoc] fallback fetchDocument:', doc)
          if (doc) setActiveDocument(doc)
        }
        return { success: true, rowCount: res.rowCount }
      }
      return { success: false, message: res.message || 'No structured data found.' }
    } catch (err: any) {
      console.error('[reparseDoc] error:', err)
      return { success: false, message: err.message }
    }
  }

  const getSpreadsheetCustomers = (): any[] => {
    return analytics.customers || []
  }

  const getSpreadsheetMonthlyMetrics = (): any[] => {
    return analytics.monthly || []
  }

  const getSpreadsheetKPIs = (): any => {
    if (!analytics.hasData) return null
    const kpiObj: Record<string, any> = {}
    analytics.kpis.forEach((k) => {
      const key = k.label.toLowerCase().replace(/[^a-z0-9]/g, '_')
      kpiObj[key] = { value: k.value, change: k.change, up: k.up }
    })
    return kpiObj
  }

  // ── Load a sample dataset without backend ────────────────────
  const loadSample = (dataset: SampleDataset) => {
    setSampleSheet({
      filename: dataset.filename,
      headers: dataset.headers,
      columns_metadata: dataset.columns_metadata,
      rows: dataset.rows,
    })
    // Clear real uploads so sample takes precedence
    setActiveSheet(null)
    setActiveDocument(null)
    setSheetNames([])
    setActiveSheetName('')
    setSheetsData({})
    setSheetsFilename('')
  }

  const [selectedTimeKey, setSelectedTimeKey] = useState<string>('')
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string>('')
  const [selectedPrimaryMetricKey, setSelectedPrimaryMetricKey] = useState<string>('')
  const [selectedSecondaryMetricKey, setSelectedSecondarySecondaryMetricKey] = useState<string>('')

  // Expose normal react setter for secondary metric with custom name to match interface
  const setSelectedSecondaryMetricKey = (val: React.SetStateAction<string>) => {
    setSelectedSecondarySecondaryMetricKey(val)
  }

  // Reset selected keys when active data source changes
  useEffect(() => {
    setSelectedTimeKey('')
    setSelectedCategoryKey('')
    setSelectedPrimaryMetricKey('')
    setSelectedSecondarySecondaryMetricKey('')
  }, [activeSheet, sampleSheet, activeDocument])

  // ── Compute analytics whenever any data source changes ────────
  const effectiveSource = useMemo(() => {
    if (activeSheet) return activeSheet
    if (sampleSheet) return sampleSheet
    if (activeDocument?.parsedRows?.length > 0) {
      return {
        filename: activeDocument.filename,
        rows: activeDocument.parsedRows,
        columns_metadata: activeDocument.columnsMetadata || {},
      }
    }
    return null
  }, [activeSheet, sampleSheet, activeDocument])

  const baseAnalytics = useMemo(() => {
    if (!effectiveSource) return computeAnalytics([], {}, '')
    return computeAnalytics(
      effectiveSource.rows || [],
      effectiveSource.columns_metadata || {},
      effectiveSource.filename || 'Dataset'
    )
  }, [effectiveSource])

  const analytics = useMemo(() => {
    if (!effectiveSource || !baseAnalytics) return baseAnalytics || computeAnalytics([], {}, '')
    
    // Fall back to baseAnalytics if no overrides are set yet
    if (!selectedPrimaryMetricKey && !selectedTimeKey && !selectedCategoryKey) {
      return baseAnalytics
    }

    return computeAnalytics(
      effectiveSource.rows || [],
      effectiveSource.columns_metadata || {},
      effectiveSource.filename || 'Dataset',
      {
        primaryMetricKey: selectedPrimaryMetricKey || baseAnalytics.primaryMetricKey,
        primaryTimeKey: selectedTimeKey || baseAnalytics.primaryTimeKey,
        primaryCategoryKey: selectedCategoryKey || baseAnalytics.primaryCategoryKey,
      }
    )
  }, [effectiveSource, baseAnalytics, selectedTimeKey, selectedCategoryKey, selectedPrimaryMetricKey])

  const hasData = analytics.hasData
  const datasetName = analytics.datasetName

  const engine = useMemo(() => {
    if (!effectiveSource?.rows) return null
    return new DataEngine(effectiveSource.rows, {
      primaryMetricKey: selectedPrimaryMetricKey || baseAnalytics?.primaryMetricKey,
      primaryTimeKey: selectedTimeKey || baseAnalytics?.primaryTimeKey,
      primaryCategoryKey: selectedCategoryKey || baseAnalytics?.primaryCategoryKey,
    })
  }, [effectiveSource, selectedPrimaryMetricKey, selectedTimeKey, selectedCategoryKey, baseAnalytics])

  const sharedKPIs = useMemo(() => {
    if (!engine) return null
    return {
      revenue: engine.getRevenueKPIs(),
      customers: engine.getCustomerKPIs(),
      ltvCac: engine.getLtvCacRatio(),
      domain: engine.classifyDomain(),
    }
  }, [engine])

  const shared = useMemo(() => {
    if (!engine) return null
    return {
      domain: engine.domain,
      vocab: engine.vocab,
      entityKPIs: engine.getEntityKPIs(),
      monetaryKPIs: engine.getMonetaryKPIs(),
      grouping: engine.getGroupingBreakdown(),
    }
  }, [engine])

  return (
    <SpreadsheetContext.Provider value={{
      activeSheet: activeSheet || sampleSheet,
      loading,
      upload,
      reset,
      getSpreadsheetCustomers,
      getSpreadsheetMonthlyMetrics,
      getSpreadsheetKPIs,
      activeDocument,
      loadingDoc,
      uploadDoc,
      resetDoc,
      reparseDoc,
      analytics,
      hasData,
      datasetName,
      loadSample,
      sheetNames,
      activeSheetName,
      selectSheet,
      selectedTimeKey,
      setSelectedTimeKey,
      selectedCategoryKey,
      setSelectedCategoryKey,
      selectedPrimaryMetricKey,
      setSelectedPrimaryMetricKey,
      selectedSecondaryMetricKey,
      setSelectedSecondaryMetricKey,
      engine,
      sharedKPIs,
      shared,
    }}>
      {children}
    </SpreadsheetContext.Provider>
  )
}

export const useSpreadsheet = () => useContext(SpreadsheetContext)
