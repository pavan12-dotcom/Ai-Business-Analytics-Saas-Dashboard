// SpreadsheetContext.tsx
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { detectColumnTypes } from '../services/columnDetection'
import { fetchSpreadsheet, uploadSpreadsheet, deleteSpreadsheet, fetchDocument, uploadDocument, deleteDocument, reparseDocument } from '../services/api'
import { useAuth } from './AuthContext'
import { computeAnalytics, type AnalyticsResult } from '../services/analyticsEngine'
import type { SampleDataset } from '../data/sampleDatasets'

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
}

const SpreadsheetContext = createContext<SpreadsheetContextType>({} as SpreadsheetContextType)

export function SpreadsheetProvider({ children }: { children: React.ReactNode }) {
  const [activeSheet, setActiveSheet] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeDocument, setActiveDocument] = useState<any>(null)
  const [loadingDoc, setLoadingDoc] = useState(true)
  const [sampleSheet, setSampleSheet] = useState<any>(null) // loaded sample dataset
  const { user, incrementUploadCount, isGuest, isGuestTrialExhausted, setShowSignupModal, refreshSubscription } = useAuth()

  useEffect(() => {
    if (!user) {
      setActiveSheet(null)
      setLoading(false)
      return
    }
    setLoading(true)
    fetchSpreadsheet()
      .then((sheet) => {
        if (sheet) setActiveSheet(sheet)
        else setActiveSheet(null)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error loading active spreadsheet:', err)
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
          if (extension === 'json') {
            const text = e.target?.result as string
            const parsed = JSON.parse(text)
            json = Array.isArray(parsed) ? parsed : [parsed]
          } else {
            const ab = e.target?.result as ArrayBuffer
            const wb = XLSX.read(ab, { type: 'array', cellDates: true })
            const sheetName = wb.SheetNames[0]
            const ws = wb.Sheets[sheetName]
            json = XLSX.utils.sheet_to_json(ws)
          }

          if (json.length === 0) {
            resolve({ success: false, error: 'The uploaded dataset contains no data rows.' })
            return
          }

          if (json.length > 2000) {
            resolve({ success: false, error: 'Dataset exceeds the limit of 2000 rows. Please upload a smaller file.' })
            return
          }

          const headers = Object.keys(json[0])
          const columnsMetadata = detectColumnTypes(json, headers)

          const payload = {
            filename: file.name,
            headers,
            columns_metadata: columnsMetadata,
            rows: json
          }

          const response = await uploadSpreadsheet(payload)
          if (response.success) {
            setActiveSheet(payload)
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

  const reset = async () => {
    try {
      await deleteSpreadsheet()
      setActiveSheet(null)
    } catch (err) {
      console.error('Failed to reset spreadsheet:', err)
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
      const mrrVal = mrrHeader ? Number(String(r[mrrHeader]).replace(/[^\d\.-]/g, '').trim()) : 0
      const mrr = isNaN(mrrVal) ? 0 : mrrVal
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
        
        const revVal = Number(String(r[revHeader]).replace(/[^\d\.-]/g, '').trim())
        const revenue = isNaN(revVal) ? 0 : revVal
        
        const mrrVal = mrrHeader ? Number(String(r[mrrHeader]).replace(/[^\d\.-]/g, '').trim()) : revenue * 0.75
        const mrr = isNaN(mrrVal) ? 0 : mrrVal
        
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
        const val = revHeader ? Number(String(r[revHeader]).replace(/[^\d\.-]/g, '').trim()) : 0
        return sum + (isNaN(val) ? 0 : val)
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
      revenue: { value: `$${totalRevenue.toLocaleString()}`, change: '+12.4%', up: true },
      users: { value: activeUsers.toLocaleString(), change: '+8.1%', up: true },
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
    }}>
      {children}
    </SpreadsheetContext.Provider>
  )
}

export const useSpreadsheet = () => useContext(SpreadsheetContext)
