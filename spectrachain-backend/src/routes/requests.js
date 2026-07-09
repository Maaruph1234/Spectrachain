const express  = require('express')
const router   = express.Router()
const { getContract, getSigner } = require('../contracts')

// GET /api/requests/requester/:address
router.get('/requester/:address', async (req, res) => {
  try {
    const ar   = getContract('AccessRequest')
    const reqs = await ar.getRequestsByRequester(req.params.address)

    const requests = reqs.map(r => ({
      id:             r.id.toString(),
      requester:      r.requester,
      requesterName:  r.requesterName,
      listingId:      r.listingId.toString(),
      requestedStart: r.requestedStart.toString(),
      requestedEnd:   r.requestedEnd.toString(),
      purpose:        r.purpose,
      status:         Number(r.status) === 0 ? 'pending' : Number(r.status) === 1 ? 'granted' : 'rejected',
      rejectionReason: r.rejectionReason,
      createdAt:      r.createdAt.toString(),
    }))

    res.json(requests)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/requests — submit access request
router.post('/', async (req, res) => {
  try {
    const { username, listingId, requestedStart, requestedEnd, purpose } = req.body

    const signer = getSigner(username)
    const ar     = getContract('AccessRequest', signer)

    const tx = await ar.submitRequest(
      BigInt(listingId),
      BigInt(requestedStart),
      BigInt(requestedEnd),
      purpose
    )
    const receipt = await tx.wait()

    // Find grant or reject event
    const granted = receipt.logs
      .map(log => { try { return ar.interface.parseLog(log) } catch { return null } })
      .find(e => e && e.name === 'LeaseGranted')

    const rejected = receipt.logs
      .map(log => { try { return ar.interface.parseLog(log) } catch { return null } })
      .find(e => e && e.name === 'RequestRejected')

    res.json({
      success:    true,
      txHash:     receipt.hash,
      status:     granted ? 'granted' : rejected ? 'rejected' : 'pending',
      reason:     rejected ? rejected.args.reason : null,
      requestId:  granted ? granted.args.requestId.toString() : rejected ? rejected.args.requestId.toString() : null,
      blockNumber: receipt.blockNumber,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router