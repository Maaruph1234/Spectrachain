require('dotenv').config()
const express  = require('express')
const cors     = require('cors')

const authRoutes     = require('./routes/auth')
const listingRoutes  = require('./routes/listings')
const requestRoutes  = require('./routes/requests')
const leaseRoutes    = require('./routes/leases')
const metricsRoutes  = require('./routes/metrics')
const disputeRoutes  = require('./routes/disputes')

const app  = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

app.use('/api/auth',     authRoutes)
app.use('/api/listings', listingRoutes)
app.use('/api/requests', requestRoutes)
app.use('/api/leases',   leaseRoutes)
app.use('/api/metrics',  metricsRoutes)
app.use('/api/disputes', disputeRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SpectraChain backend running' })
})

app.listen(PORT, () => {
  console.log(`SpectraChain backend running on http://localhost:${PORT}`)
})