import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'https://spectrachain-production.up.railway.app/api'
const api = axios.create({ baseURL: BASE })

// ── AUTH ──────────────────────────────────────────────────────────────────────
export const loginUser = (username, password, role) =>
  api.post('/auth/login', { username, password, role })

// ── LISTINGS ──────────────────────────────────────────────────────────────────
export const getActiveListings = () =>
  api.get('/listings')

export const getMyListings = (address) =>
  api.get(`/listings/operator/${address}`)

export const createListing = (username, band, area, startTime, endTime, conditions) =>
  api.post('/listings', { username, band, area, startTime, endTime, conditions })

export const deactivateListing = (username, id) =>
  api.post(`/listings/${id}/deactivate`, { username })

// ── REQUESTS ──────────────────────────────────────────────────────────────────
export const getMyRequests = (address) =>
  api.get(`/requests/requester/${address}`)

export const submitRequest = (username, listingId, requestedStart, requestedEnd, purpose) =>
  api.post('/requests', { username, listingId, requestedStart, requestedEnd, purpose })

// ── LEASES ────────────────────────────────────────────────────────────────────
export const getAllLeases = () =>
  api.get('/leases/all')

export const getMyLeasesAsSecondary = (address) =>
  api.get(`/leases/secondary/${address}`)

export const getMyLeasesAsPrimary = (address) =>
  api.get(`/leases/primary/${address}`)

export const getActiveLease = (listingId) =>
  api.get(`/leases/listing/${listingId}`)

export const createLease = (username, requestId) =>
  api.post('/leases', { username, requestId })

export const releaseLease = (username, leaseId) =>
  api.post(`/leases/${leaseId}/release`, { username })

// ── METRICS ───────────────────────────────────────────────────────────────────
export const getMetrics = () =>
  api.get('/metrics')

// ── DISPUTES ──────────────────────────────────────────────────────────────────
export const getEscalatedDisputes = () =>
  api.get('/disputes/escalated')

export const raiseDispute = (username, leaseId, disputeType, evidence) =>
  api.post('/disputes', { username, leaseId, disputeType, evidence })

export const resolveDispute = (username, disputeId, resolution, note) =>
  api.post(`/disputes/${disputeId}/resolve`, { username, resolution, note })

// ── METRICS HELPERS ───────────────────────────────────────────────────────────
// Convert unix timestamp to readable date
export function tsToDate(ts) {
  if (!ts || ts === '0') return '—'
  return new Date(Number(ts) * 1000).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

// Convert status number to string
export function leaseStatus(status) {
  const map = { active: 'active', expired: 'expired', released: 'released' }
  return map[status] || status
}