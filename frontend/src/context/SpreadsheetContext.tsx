// SpreadsheetContext.tsx
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { detectColumnTypes } from '../services/columnDetection'
import { fetchSpreadsheet, uploadSpreadsheet, deleteSpreadsheet, fetchDocument, uploadDocument, deleteDocument, reparseDocument } from '../services/api'
import { useAuth } from './AuthContext'
import { computeAnalytics, type AnalyticsResult } from '../services/analyticsEngine'
import { cleanNumericValue, formatNumber } from '../services/dataCleaner'
import type { SampleDataset } from '../data/sampleDatasets'

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

    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          let json: any[] = []
          let allSheetsData: Record<string, { rows: any[]; headers: string[]; columns_metadata: Record<string, string> }> = {}
          let sheetInfoList: SheetInfo[] = []
          let bestSheet: SheetInfo | null = null

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
            const wb = XLSX.read(ab, { type: 'array', cellDates: true })
            const ws = wb.Sheets[wb.SheetNames[0]]
            json = XLSX.utils.sheet_to_json(ws)

            // Reset multi-sheet state for CSV
            setSheetNames([])
            setActiveSheetName('')
            setSheetsData({})
            setSheetsFilename('')
          } else {
            // Excel: parse ALL sheets ─────────────────────────────
            const ab = e.target?.result as ArrayBuffer
            const wb = XLSX.read(ab, { type: 'array', cellDates: true })

            // Build a map of all sheets with their row counts
            wb.SheetNames.forEach(sheetName => {
              const ws = wb.Sheets[sheetName]
              const sheetRows: any[] = XLSX.utils.sheet_to_json(ws)
              const headers = sheetRows.length > 0 ? Object.keys(sheetRows[0]) : []
              const columns_metadata = sheetRows.length > 0 ? detectColumnTypes(sheetRows, headers) : {}
              allSheetsData[sheetName] = { rows: sheetRows, headers, columns_metadata }
              sheetInfoList.push({ name: sheetName, rowCount: sheetRows.length })
            })

            // Auto-select sheet with the most rows
            bestSheet = sheetInfoList.reduce((best, s) =>
              s.rowCount > best.rowCount ? s : best
            , sheetInfoList[0])

            // Update multi-sheet state and persist to sessionStorage
            setSheetsData(allSheetsData)
            setSheetsFilename(file.name)
            setSheetNames(sheetInfoList)
            setActiveSheetName(bestSheet.name)
            persistSheetsData(allSheetsData, file.name, bestSheet.name)

            json = allSheetsData[bestSheet.name].rows
          }

          if (json.length === 0) {
            resolve({ success: false, error: 'The uploaded dataset contains no data rows.' })
            return
          }

          const maxRows = (extension === 'xlsx' || extension === 'xls') ? 10000 : 2000
          if (json.length > maxRows) {
            resolve({ success: false, error: `Dataset exceeds the limit of ${formatNumber(maxRows)} rows. Please upload a smaller file.` })
            return
          }

          const headers = Object.keys(json[0])
          const columnsMetadata = detectColumnTypes(json, headers)

          const isExcel = extension === 'xlsx' || extension === 'xls'
          const payload = {
            filename: file.name,
            headers,
            columns_metadata: {
              ...columnsMetadata,
              ...(isExcel && bestSheet ? {
                __sheetNames: JSON.stringify(sheetInfoList),
                __activeSheetName: bestSheet.name,
                __sheetsData: JSON.stringify(allSheetsData)
              } : {})
            },
            rows: json
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
            resolve({ success: true, error: null })
          } else {
            resolve({ success: false, error: 'Failed to upload dataset data to server.' })
          }
        } catch (err: any) {
          const errMsg = err.response?.data?.error || err.message || 'Unknown server error'
          resolve({ success: false, error: `Upload Error: ${errMsg}` })
        }
      }
      reader.onerror = () => {
        resolve({ success: false, error: 'Failed to read dataset file.' })
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
    }
  }

  const reset = async () => {
    try {
      if (activeSheet) {
        await deleteSpreadsheet()
        setActiveSheet(null)
      }
      setSampleSheet(null)
      setSheetNames([])
      setActiveSheetName('')
      setSheetsData({})
      setSheetsFilename('')
      // Clear session storage
      try {
        sessionStorage.removeItem(SS_KEY_SHEETS_DATA)
        sessionStorage.removeItem(SS_KEY_FILENAME)
        sessionStorage.removeItem(SS_KEY_ACTIVE_SHEET)
      } catch {}
    } catch (err) {
      console.error('Failed to reset spreadsheet:', err)
      setSampleSheet(null)
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

    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const dataUrl = e.target?.result as string
          if (!dataUrl) {
            resolve({ success: false, error: 'Failed to read document file.' })
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
            resolve({ success: true, error: null })
          } else {
            resolve({ success: false, error: 'Failed to upload document.' })
          }
        } catch (err: any) {
          const errMsg = err.response?.data?.error || err.message || 'Unknown server error'
          resolve({ success: false, error: errMsg })
        }
      }
      reader.onerror = () => {
        resolve({ success: false, error: 'Failed to read document file.' })
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
    const sheet = activeSheet || (activeDocument?.parsedRows?.length > 0 ? {
      rows: activeDocument.parsedRows,
      columns_metadata: activeDocument.columnsMetadata || {}
    } : null)

    if (!sheet) return []
    const meta = sheet.columns_metadata || sheet.columnsMetadata || {}
    const rows = sheet.rows || []

    const nameHeader = Object.keys(meta).find(h => h.toLowerCase().includes('name') || h.toLowerCase().includes('customer')) ||
                       Object.keys(meta).find(h => meta[h] === 'identifier') ||
                       Object.keys(meta)[0] || 'Name'

    const emailHeader = Object.keys(meta).find(h => h.toLowerCase().includes('email'))

    const planHeader = Object.keys(meta).find(h => h.toLowerCase().includes('plan')) ||
                       Object.keys(meta).find(h => meta[h] === 'category')

    const mrrHeader = Object.keys(meta).find(h => h.toLowerCase().includes('mrr') || h.toLowerCase().includes('revenue') || h.toLowerCase().includes('amount') || h.toLowerCase().includes('spend') || h.toLowerCase().includes('price')) ||
                      Object.keys(meta).find(h => meta[h] === 'metric')

    const statusHeader = Object.keys(meta).find(h => h.toLowerCase().includes('status')) ||
                         Object.keys(meta).find(h => meta[h] === 'category' && h !== planHeader)

    return rows.map((r: any, index: number) => {
      const name = r[nameHeader] ? String(r[nameHeader]) : `Customer ${index + 1}`
      const email = emailHeader && r[emailHeader] ? String(r[emailHeader]) : `${name.toLowerCase().replace(/\s+/g, '')}@example.com`
      const plan = planHeader && r[planHeader] ? String(r[planHeader]) : 'Pro'
      const mrr = mrrHeader ? (cleanNumericValue(r[mrrHeader]) ?? 0) : 0
      const status = statusHeader && r[statusHeader] ? String(r[statusHeader]) : 'Active'

      return {
        id: r.id || String(index + 1),
        name,
        email,
        plan,
        mrr,
        status
      }
    })
  }

  const getSpreadsheetMonthlyMetrics = (): any[] => {
    const sheet = activeSheet || (activeDocument?.parsedRows?.length > 0 ? {
      rows: activeDocument.parsedRows,
      columns_metadata: activeDocument.columnsMetadata || {}
    } : null)

    if (!sheet) return []
    const meta = sheet.columns_metadata || sheet.columnsMetadata || {}
    const rows = sheet.rows || []

    const dateHeader = Object.keys(meta).find(h => meta[h] === 'date' || meta[h] === 'time') ||
                       Object.keys(meta).find(h => h.toLowerCase().includes('date') || h.toLowerCase().includes('month') || h.toLowerCase().includes('time'))

    const revHeader = Object.keys(meta).find(h => h.toLowerCase().includes('revenue') || h.toLowerCase().includes('amount') || h.toLowerCase().includes('spend')) ||
                      Object.keys(meta).find(h => meta[h] === 'metric')

    const mrrHeader = Object.keys(meta).find(h => h.toLowerCase().includes('mrr') || h.toLowerCase().includes('new mrr'))

    if (dateHeader && revHeader) {
      const validRows = rows.filter((row: any) => {
        const d = new Date(row[dateHeader])
        return d instanceof Date && !isNaN(d.getTime())
      })

      const monthlyGroups: Record<string, { revenue: number; mrr: number }> = {}
      validRows.forEach((r: any) => {
        const parsed = new Date(r[dateHeader])
        const monthName = parsed.toLocaleString('en-US', { month: 'short', year: 'numeric' })

        const revenue = cleanNumericValue(r[revHeader]) ?? 0

        const mrrVal = mrrHeader ? cleanNumericValue(r[mrrHeader]) : null
        const mrr = mrrVal !== null ? mrrVal : revenue * 0.75

        if (!monthlyGroups[monthName]) {
          monthlyGroups[monthName] = { revenue: 0, mrr: 0 }
        }
        monthlyGroups[monthName].revenue += revenue
        monthlyGroups[monthName].mrr += mrr
      })

      const monthOrder: Record<string, number> = {
        Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
        Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12
      }
      return (Object.entries(monthlyGroups) as [string, { revenue: number; mrr: number }][]).map(([month, data]) => ({
        month,
        revenue: Math.round(data.revenue),
        mrr: Math.round(data.mrr)
      })).sort((a, b) => {
        const m1 = a.month.split(' ')[0]
        const m2 = b.month.split(' ')[0]
        return (monthOrder[m1] || 0) - (monthOrder[m2] || 0)
      })
    } else {
      const totalRev = rows.reduce((sum: number, r: any) => {
        const val = revHeader ? (cleanNumericValue(r[revHeader]) ?? 0) : 0
        return sum + val
      }, 0)

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
      return months.map((m, idx) => ({
        month: m,
        revenue: Math.round((totalRev / 6) * (0.8 + idx * 0.1)),
        mrr: Math.round((totalRev / 8) * (0.8 + idx * 0.1))
      }))
    }
  }

  const getSpreadsheetKPIs = (): any => {
    const sheet = activeSheet || (activeDocument?.parsedRows?.length > 0 ? {
      rows: activeDocument.parsedRows,
      columns_metadata: activeDocument.columnsMetadata || {}
    } : null)
    if (!sheet) return null

    const custs = getSpreadsheetCustomers()
    const activeCusts = custs.filter((c: any) => c.status === 'Active')
    const churnedCusts = custs.filter((c: any) => c.status === 'Churned')

    const totalRevenue = activeCusts.reduce((sum: number, c: any) => sum + c.mrr, 0)
    const activeUsers = activeCusts.length
    const arpu = activeUsers > 0 ? (totalRevenue / activeUsers) : 0
    const totalCustomers = custs.length
    const churnRate = totalCustomers > 0 ? (churnedCusts.length / totalCustomers) * 100 : 0

    return {
      revenue: { value: formatNumber(totalRevenue, true), change: '+12.4%', up: true },
      users: { value: formatNumber(activeUsers), change: '+8.1%', up: true },
      churn: { value: `${churnRate.toFixed(1)}%`, change: '-0.4%', up: false },
      arpu: { value: `$${arpu.toFixed(2)}`, change: '+2.1%', up: true }
    }
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

  // ── Compute analytics whenever any data source changes ────────
  const effectiveSource = activeSheet || sampleSheet || (
    activeDocument?.parsedRows?.length > 0 ? {
      filename: activeDocument.filename,
      rows: activeDocument.parsedRows,
      columns_metadata: activeDocument.columnsMetadata || {},
    } : null
  )

  const analytics = useMemo(() => {
    if (!effectiveSource) return computeAnalytics([], {}, '')
    return computeAnalytics(
      effectiveSource.rows || [],
      effectiveSource.columns_metadata || {},
      effectiveSource.filename || 'Dataset'
    )
  }, [effectiveSource])

  const hasData = analytics.hasData
  const datasetName = analytics.datasetName

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
    }}>
      {children}
    </SpreadsheetContext.Provider>
  )
}

export const useSpreadsheet = () => useContext(SpreadsheetContext)
