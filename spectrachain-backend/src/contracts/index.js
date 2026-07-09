const { ethers } = require('ethers')

const SL_ABI = require('./abis/SpectrumListing.json').abi
const AR_ABI = require('./abis/AccessRequest.json').abi
const LM_ABI = require('./abis/LeaseManagement.json').abi
const DR_ABI = require('./abis/DisputeResolution.json').abi

const ADDRESSES = {
  SpectrumListing:   '0x2236518a96F2DF32D352452240147495620A271D',
  AccessRequest:     '0x3c503D642e00021cAcb6e161A9Aa798D53625915',
  LeaseManagement:   '0x1719dF1e31d590FD451f19A8eE32D47903997F02',
  DisputeResolution: '0x6994D6221394c66185FD9B3e5aef9b2a99160Fb6',
}

const ACCOUNTS = {
  ncc_admin:       { privateKey: process.env.NCC_KEY,       role: 'regulator' },
  mtn_operator:    { privateKey: process.env.MTN_KEY,       role: 'primary'   },
  glo_operator:    { privateKey: process.env.GLO_KEY,       role: 'primary'   },
  airtel_user:     { privateKey: process.env.AIRTEL_KEY,    role: 'secondary' },
  ninemobile_user: { privateKey: process.env.NINEMOBILE_KEY,role: 'secondary' },
}

const provider = new ethers.JsonRpcProvider(
  process.env.RPC_URL || 'http://127.0.0.1:8545'
)

function getSigner(username) {
  const account = ACCOUNTS[username]
  if (!account) throw new Error(`Unknown user: ${username}`)
  if (!account.privateKey) throw new Error(`No private key configured for: ${username}`)
  return new ethers.Wallet(account.privateKey, provider)
}

function getContract(name, signerOrProvider) {
  const abis = {
    SpectrumListing:   SL_ABI,
    AccessRequest:     AR_ABI,
    LeaseManagement:   LM_ABI,
    DisputeResolution: DR_ABI,
  }
  return new ethers.Contract(ADDRESSES[name], abis[name], signerOrProvider || provider)
}

module.exports = { getSigner, getContract, ADDRESSES, ACCOUNTS }