const express  = require('express')
const router   = express.Router()
const { getContract, getSigner } = require('../contracts')

function formatLease(l) {
  return {
    id:            l.id.toString(),
    requestId:     l.requestId.toString(),
    listingId:     l.listingId.toString(),
    primary:       l.primary,
    primaryName:   l.primaryName,
    secondary:     l.secondary,
    secondaryName: l.secondaryName,
    band:          l.band,
    area:          l.area,
    startTime:     l.startTime.toString(),
    endTime:       l.endTime.toString(),
    status:        Number(l.status) === 0 ? 'active' : Number(l.status) === 1 ? 'expired' : 'released',
    createdAt:     l.createdAt.toString(),
    terminatedAt:  l.terminatedAt.toString(),
  }
}

// GET /api/leases/all — all active leases
router.get('/all', async (req, res) => {
  try {
    const lm     = getContract('LeaseManagement')
    const active = await lm.getAllActiveLeases()
    res.json(active.map(formatLease))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/leases/secondary/:address
router.get('/secondary/:address', async (req, res) => {
  try {
    const lm     = getContract('LeaseManagement')
    const leases = await lm.getLeasesBySecondary(req.params.address)
    res.json(leases.map(formatLease))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/leases/primary/:address
router.get('/primary/:address', async (req, res) => {
  try {
    const lm     = getContract('LeaseManagement')
    const leases = await lm.getLeasesByPrimary(req.params.address)
    res.json(leases.map(formatLease))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/leases/listing/:id — active lease for a listing
router.get('/listing/:id', async (req, res) => {
  try {
    const lm    = getContract('LeaseManagement')
    const lease = await lm.getActiveLease(BigInt(req.params.id))
    res.json(formatLease(lease))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/leases — create lease from granted request (NCC only)
router.post('/', async (req, res) => {
  try {
    const { username, requestId } = req.body
    const signer = getSigner(username)
    const lm     = getContract('LeaseManagement', signer)

    const tx      = await lm.createLease(BigInt(requestId))
    const receipt = await tx.wait()

    const event = receipt.logs
      .map(log => { try { return lm.interface.parseLog(log) } catch { return null } })
      .find(e => e && e.name === 'LeaseCreated')

    res.json({
      success:  true,
      txHash:   receipt.hash,
      leaseId:  event ? event.args.leaseId.toString() : null,
      blockNumber: receipt.blockNumber,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/leases/:id/release
router.post('/:id/release', async (req, res) => {
  try {
    const { username } = req.body
    const signer = getSigner(username)
    const lm     = getContract('LeaseManagement', signer)

    const tx      = await lm.releaseLease(BigInt(req.params.id))
    const receipt = await tx.wait()

    res.json({ success: true, txHash: receipt.hash })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/leases/:id/expire
router.post('/:id/expire', async (req, res) => {
  try {
    const lm      = getContract('LeaseManagement')
    const tx      = await lm.checkAndExpire(BigInt(req.params.id))
    const receipt = await tx.wait()
    res.json({ success: true, txHash: receipt.hash })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router