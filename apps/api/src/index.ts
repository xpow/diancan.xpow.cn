import express from 'express'
import cors from 'cors'
import nightMarketRoutes from './routes/night-markets.js'
import orderRoutes from './routes/orders.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/night-markets', nightMarketRoutes)
app.use('/api/orders', orderRoutes)

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
})
