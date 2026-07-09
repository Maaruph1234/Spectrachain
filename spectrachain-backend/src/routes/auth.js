const express = require('express')
const router  = express.Router()
const { ACCOUNTS } = require('../contracts')

const USERS = {
  ncc_admin:       { password: 'demo123', role: 'regulator', name: 'NCC Regulator',  address: '0x58776c57A4c2971226927C642Ad166080789DE75' },
  mtn_operator:    { password: 'demo123', role: 'primary',   name: 'MTN Nigeria',    address: '0x4A8eb6402d7716dDA0784d1Cd187902029951F75' },
  glo_operator:    { password: 'demo123', role: 'primary',   name: 'Glo Mobile',     address: '0xc99c2Cb281FEb518b70D4eAcc09Ab6a76517980a' },
  airtel_user:     { password: 'demo123', role: 'secondary', name: 'Airtel Nigeria', address: '0xc6Ac5FB18457D77Fe5f7b98e522caebA4aC7AaD9' },
  ninemobile_user: { password: 'demo123', role: 'secondary', name: '9mobile Nigeria',address: '0x73e82FBa078E25c7820397d545abd17383AFa174' },
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password, role } = req.body
  const user = USERS[username]

  if (!user || user.password !== password || user.role !== role) {
    return res.status(401).json({ error: 'Invalid credentials or role mismatch' })
  }

  res.json({
    username,
    role:    user.role,
    name:    user.name,
    address: user.address,
  })
})

module.exports = router