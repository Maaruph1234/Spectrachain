const express  = require('express')
const router   = express.Router()
const { getContract, getSigner } = require('../contracts')
const { ethers } = require('ethers')

// GET /api/listings — all active listings
router.get('/', async (req, res) => {
  try {
    const sl      = getContract('SpectrumListing')
    const active  = await sl.getActiveListings()

    const listings = active.map(l => ({
      id:         l.id.toString(),
      owner:      l.owner,
      operatorName: l.operatorName,
      band:       l.band,
      area:       l.area,
      startTime:  l.startTime.toString(),
      endTime:    l.endTime.toString(),
      conditions: l.conditions,
      status:     Number(l.status) === 0 ? 'active' : Number(l.status) === 1 ? 'expired' : 'deactivated',
      createdAt:  l.createdAt.toString(),
    }))

    res.json(listings)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/listings/operator/:address — listings by operator
router.get('/operator/:address', async (req, res) => {
  try {
    const sl   = getContract('SpectrumListing')
    const list = await sl.getListingsByOperator(req.params.address)

    const listings = list.map(l => ({
      id:           l.id.toString(),
      owner:        l.owner,
      operatorName: l.operatorName,
      band:         l.band,
      area:         l.area,
      startTime:    l.startTime.toString(),
      endTime:      l.endTime.toString(),
      conditions:   l.conditions,
      status:       Number(l.status) === 0 ? 'active' : Number(l.status) === 1 ? 'expired' : 'deactivated',
      createdAt:    l.createdAt.toString(),
    }))

    res.json(listings)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/listings — create a new listing
router.post('/', async (req, res) => {
  try {
    const { username, band, area, startTime, endTime, conditions } = req.body

    const signer = getSigner(username)
    const sl     = getContract('SpectrumListing', signer)

    const tx = await sl.createListing(band, area, BigInt(startTime), BigInt(endTime), conditions)
    const receipt = await tx.wait()

    // Extract listing ID from event
    const event = receipt.logs
      .map(log => { try { return sl.interface.parseLog(log) } catch { return null } })
      .find(e => e && e.name === 'ListingCreated')

    res.json({
      success:   true,
      txHash:    receipt.hash,
      listingId: event ? event.args.listingId.toString() : null,
      blockNumber: receipt.blockNumber,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/listings/:id/deactivate
router.post('/:id/deactivate', async (req, res) => {
  try {
    const { username } = req.body
    const signer = getSigner(username)
    const sl     = getContract('SpectrumListing', signer)

    const tx      = await sl.deactivateListing(BigInt(req.params.id))
    const receipt = await tx.wait()

    res.json({ success: true, txHash: receipt.hash })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router