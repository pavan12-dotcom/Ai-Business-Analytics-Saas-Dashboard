import dotenv from 'dotenv'
dotenv.config()

import express, { Request, Response } from 'express'
import cors from 'cors'
import dataRoutes from './routes/data'
import aiRoutes from './routes/ai'
import billingRoutes from './routes/billing'

const app = express()
const PORT = Number(process.env.PORT) || 4000

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    
    const isLocal = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')
    const isVercel = origin.endsWith('.vercel.app')
    const isConfigured = origin.replace(/\/$/, '') === FRONTEND_URL.replace(/\/$/, '')
    
    if (isLocal || isVercel || isConfigured) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))

// Normalize double slashes in URLs (e.g. //api -> /api)
app.use((req, res, next) => {
  req.url = req.url.replace(/\/+/g, '/')
  next()
})

// Request logger middleware
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    console.log(`[API] ${req.method} ${req.originalUrl} - ${res.statusCode} (${Date.now() - start}ms)`)
  })
  next()
})

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))
app.use(express.raw({ limit: '50mb', type: 'application/json' }))

// Routes
app.use('/api/data', dataRoutes)
app.use('/data', dataRoutes)
app.use('/api/ai', aiRoutes)
app.use('/ai', aiRoutes)
app.use('/api/billing', billingRoutes)
app.use('/billing', billingRoutes)

app.get('/', (_req: Request, res: Response) => {
  res.send('<h1>InsightAI API</h1><p>Backend is running.</p><p><a href="/api/health">/api/health</a></p>')
})

app.get(['/api/health', '/health'], (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

const server = app.listen(PORT, () => {
  console.log(`✅ InsightAI API running on http://localhost:${PORT}`)
})

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use!`)
    console.error(`👉 Fix: Run this in PowerShell to free the port:`)
    console.error(`   Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force\n`)
  } else {
    console.error('❌ Server error:', err.message)
  }
  process.exit(1)
})

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason)
})

export default app

