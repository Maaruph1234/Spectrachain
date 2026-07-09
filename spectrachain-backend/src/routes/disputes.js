const express  = require('express')
const router   = express.Router()
const { getContract, getSigner } = require('../contracts')

function formatDispute(d) {
  const statusMap = ['raised', 'autoResolved', 'escalated', 'regulatorResolved']
  const typeMap   = ['prematureReclaim', 'qualityViolation', 'conditionsViolation', 'other']
  const resMap    = ['none', 'upheldSecondary', 'upheldPrimary', 'dismissed']
  return {
    id:             d.id.toString(),
    leaseId:        d.leaseId.toString(),
    listingId:      d.listingId.toString(),
    raiser:         d.raiser,
    raiserName:     d.raiserName,
    against:        d.against,
    againstName:    d.againstName,
    disputeType:    typeMap[Number(d.disputeType)],
    evidence:       d.evidence,
    status:         statusMap[Number(d.status)],
    resolution:     resMap[Number(d.resolution)],
    resolutionNote: d.resolutionNote,
    raisedAt:       d.raisedAt.toString(),
    resolvedAt:     d.resolvedAt.toString(),
  }
}

// GET /api/disputes/escalated
router.get('/escalated', async (req, res) => {
  try {
    const dr       = getContract('DisputeResolution')
    const disputes = await dr.getEscalatedDisputes()
    res.json(disputes.map(formatDispute))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/disputes — raise a dispute
router.post('/', async (req, res) => {
  try {
    const { username, leaseId, disputeType, evidence } = req.body

    const typeMap = { prematureReclaim: 0, qualityViolation: 1, conditionsViolation: 2, other: 3 }

    const signer = getSigner(username)
    const dr     = getContract('DisputeResolution', signer)

    const tx      = await dr.raiseDispute(BigInt(leaseId), typeMap[disputeType] ?? 3, evidence)
    const receipt = await tx.wait()

    const event = receipt.logs
      .map(log => { try { return dr.interface.parseLog(log) } catch { return null } })
      .find(e => e && e.name === 'DisputeRaised')

    res.json({
      success:   true,
      txHash:    receipt.hash,
      disputeId: event ? event.args.disputeId.toString() : null,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/disputes/:id/resolve — NCC resolves escalated dispute
router.post('/:id/resolve', async (req, res) => {
  try {
    const { username, resolution, note } = req.body

    const resMap = { none: 0, upheldSecondary: 1, upheldPrimary: 2, dismissed: 3 }

    const signer = getSigner(username)
    const dr     = getContract('DisputeResolution', signer)

    const tx      = await dr.regulatorResolve(BigInt(req.params.id), resMap[resolution] ?? 0, note)
    const receipt = await tx.wait()

    res.json({ success: true, txHash: receipt.hash })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router