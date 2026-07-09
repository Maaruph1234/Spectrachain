export const LISTINGS = [
  { id: 'LST-001', owner: 'MTN Nigeria',  band: '700 MHz',  area: 'Kaduna', start: '2026-05-01', end: '2026-06-30', conditions: 'No interference with public safety bands. Max EIRP 43 dBm.', status: 'active',  txHash: '0x4a2f...c91d' },
  { id: 'LST-002', owner: 'Glo Mobile',   band: '1800 MHz', area: 'Lagos',  start: '2026-05-15', end: '2026-07-15', conditions: 'Restricted to indoor small cell deployment only.',            status: 'active',  txHash: '0x7b3e...f02a' },
  { id: 'LST-003', owner: 'MTN Nigeria',  band: '2100 MHz', area: 'Abuja',  start: '2026-06-01', end: '2026-08-31', conditions: 'Secondary must maintain minimum 20 dB co-channel isolation.', status: 'active',  txHash: '0x1c9a...3b7f' },
  { id: 'LST-004', owner: 'Glo Mobile',   band: '800 MHz',  area: 'Kano',   start: '2026-04-01', end: '2026-04-30', conditions: 'Temporary rural coverage expansion only.',                   status: 'expired', txHash: '0x8d4c...a15e' },
  { id: 'LST-005', owner: 'MTN Nigeria',  band: '3500 MHz', area: 'Rivers', start: '2026-07-01', end: '2026-09-30', conditions: '5G NR only. Beamforming mandatory above 30 dBm EIRP.',       status: 'active',  txHash: '0x2e6b...d83c' },
]

export const LEASES = [
  { id: 'LSE-001', primary: 'MTN Nigeria', secondary: 'Airtel Nigeria', listingId: 'LST-001', band: '700 MHz',  area: 'Kaduna', start: '2026-05-01', end: '2026-06-30', status: 'active',  txHash: '0x5f1a...b29c' },
  { id: 'LSE-002', primary: 'Glo Mobile',  secondary: '9mobile Nigeria', listingId: 'LST-004', band: '800 MHz',  area: 'Kano',   start: '2026-04-01', end: '2026-04-30', status: 'expired', txHash: '0x3c8d...e47b' },
]

export const REQUESTS = [
  { id: 'REQ-001', band: '700 MHz',  area: 'Kaduna', listingId: 'LST-001', reqStart: '2026-05-01', reqEnd: '2026-06-30', purpose: 'Temporary capacity expansion for network congestion relief in Kaduna metropolis.', status: 'granted', txHash: '0x5f1a...b29c' },
  { id: 'REQ-002', band: '1800 MHz', area: 'Lagos',  listingId: 'LST-002', reqStart: '2026-05-15', reqEnd: '2026-07-15', purpose: 'Indoor coverage improvement for Lagos Island commercial zone.',                    status: 'pending', txHash: '0x9a2e...4d1f' },
]

export const TRANSACTIONS = [
  { hash: '0x5f1a...b29c', type: 'LEASE_GRANT',   from: 'MTN Nigeria',  to: 'Airtel Nigeria',  band: '700 MHz',  area: 'Kaduna', status: 'confirmed', time: '2026-05-01 08:14' },
  { hash: '0x4a2f...c91d', type: 'LISTING',        from: 'MTN Nigeria',  to: 'Network',         band: '700 MHz',  area: 'Kaduna', status: 'confirmed', time: '2026-04-28 11:02' },
  { hash: '0x7b3e...f02a', type: 'LISTING',        from: 'Glo Mobile',   to: 'Network',         band: '1800 MHz', area: 'Lagos',  status: 'confirmed', time: '2026-04-29 09:45' },
  { hash: '0x9a2e...4d1f', type: 'REQUEST',        from: 'Airtel Nigeria',to: 'Glo Mobile',     band: '1800 MHz', area: 'Lagos',  status: 'pending',   time: '2026-05-16 14:33' },
  { hash: '0x3c8d...e47b', type: 'LEASE_EXPIRE',   from: 'Glo Mobile',   to: '9mobile Nigeria', band: '800 MHz',  area: 'Kano',   status: 'confirmed', time: '2026-04-30 23:59' },
  { hash: '0x1c9a...3b7f', type: 'LISTING',        from: 'MTN Nigeria',  to: 'Network',         band: '2100 MHz', area: 'Abuja',  status: 'confirmed', time: '2026-04-30 16:20' },
]

export const DISPUTES = [
  { id: 'DSP-001', leaseId: 'LSE-001', raiser: 'Airtel Nigeria', against: 'MTN Nigeria', reason: 'Primary operator attempted to reclaim 700 MHz spectrum before scheduled lease expiry on 2026-06-30.', status: 'escalated', time: '2026-05-18 10:22' },
]
