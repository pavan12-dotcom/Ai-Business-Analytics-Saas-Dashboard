// Reloaded to support Stripe Test Mode Product IDs
import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import dataRoutes from './routes/data'
import aiRoutes from './routes/ai'
import billingRoutes from './routes/billing'


const app = express()
const PORT = process.env.PORT || 4000

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}))
app.use(express.json())
app.use(express.raw({ type: 'application/json' }))

// Routes
app.use('/api/data', dataRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/billing', billingRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`✅ InsightAI API running on http://localhost:${PORT}`)
})

export default app
