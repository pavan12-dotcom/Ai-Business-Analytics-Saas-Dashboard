// Reloaded to support Stripe Test Mode Product IDs
import dotenv from 'dotenv'
dotenv.config()

process.on('exit', (code) => {
  console.log(`⚠️ Process exited with code: ${code}`)
  console.trace('Exit stack trace:')
})

import express from 'express'
import cors from 'cors'
import dataRoutes from './routes/data'
import aiRoutes from './routes/ai'
import billingRoutes from './routes/billing'


const app = express()
const PORT = process.env.PORT || 4000

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://frontend-plum-six-82.vercel.app',
    /\.vercel\.app$/,
  ],
  credentials: true,
}))

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
app.use('/api/ai', aiRoutes)
app.use('/api/billing', billingRoutes)

app.get('/', (_req, res) => {
  res.send('<h1>InsightAI API</h1><p>The backend API is running successfully.</p><p>Health check: <a href="/api/health">/api/health</a></p>')
})

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log('✅ InsightAI API running on http://localhost:4000')
})

export default app
