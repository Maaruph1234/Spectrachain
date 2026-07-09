import { useState, useEffect } from 'react'
import AppLayout from '../components/AppLayout'
import { StatCard } from '../components/index.jsx'
import { Badge } from '../components/index.jsx'
import { useAuth } from '../context/AuthContext'
import { getMetrics, getAllLeases, getActiveListings } from '../services/api'

const BANDS = [
  { band: '700 MHz',  color: '#00ff9d' },
  { band: '800 MHz',  color: '#fbbf24' },
  { band: '1800 MHz', color: '#00e5ff' },
  { band: '2100 MHz', color: '#a855f7' },
  { band: '3500 MHz', color: '#f43f5e' },
]

export default function Dashboard() {
  const { user } = useAuth()
  const [metrics, setMetrics]   = useState(null)
  const [leases,  setLeases]    = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [mRes, lRes] = await Promise.all([getMetrics(), getAllLeases()])
        setMetrics(mRes.data)
        setLeases(lRes.data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const stats = {
    primary: [
      { value: metrics ? String(metrics.totalListings)  : '—', label: 'TOTAL LISTINGS',    color: '#00e5ff', icon: '📋' },
      { value: metrics ? String(metrics.activeLeases)   : '—', label: 'ACTIVE LEASES',     color: '#00ff9d', icon: '⚡' },
      { value: metrics ? String(metrics.totalRequests)  : '—', label: 'TOTAL REQUESTS',    color: '#fbbf24', icon: '📨' },
      { value: metrics ? `${metrics.sue}%`              : '—', label: 'SPECTRUM UTIL.',    color: '#a855f7', icon: '📊' },
    ],
    secondary: [
      { value: metrics ? String(metrics.totalListings)  : '—', label: 'AVAILABLE LISTINGS',color: '#00e5ff', icon: '📡' },
      { value: metrics ? String(metrics.activeLeases)   : '—', label: 'ACTIVE LEASES',     color: '#00ff9d', icon: '⚡' },
      { value: metrics ? String(metrics.totalRequests)  : '—', label: 'MY REQUESTS',       color: '#fbbf24', icon: '📨' },
      { value: metrics ? `${metrics.successRate}%`      : '—', label: 'SUCCESS RATE',      color: '#a855f7', icon: '✅' },
    ],
    regulator: [
      { value: metrics ? String(metrics.totalListings)  : '—', label: 'TOTAL LISTINGS',    color: '#00e5ff', icon: '📋' },
      { value: metrics ? String(metrics.activeLeases)   : '—', label: 'ACTIVE LEASES',     color: '#00ff9d', icon: '⚡' },
      { value: metrics ? String(metrics.totalRequests)  : '—', label: 'TOTAL REQUESTS',    color: '#fbbf24', icon: '📨' },
      { value: metrics ? String(metrics.jfi)            : '—', label: "JAIN'S FAIRNESS",   color: '#f43f5e', icon: '⚖' },
    ],
  }

  const pct = (band) => {
    const count = leases.filter(l => l.band === band).length
    return Math.min(100, count * 25 + 20)
  }

  if (loading) return (
    <AppLayout title="DASHBOARD" subtitle="Loading blockchain data...">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'300px' }}>
        <p style={{ color:'var(--muted)', fontFamily:'Share Tech Mono, monospace' }}>
          Connecting to blockchain...
        </p>
      </div>
    </AppLayout>
  )

  return (
    <AppLayout title="DASHBOARD" subtitle={`Welcome back, ${user.name}`}>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'18px', marginBottom:'26px' }}>
        {(stats[user.role] || stats.primary).map((s,i) => <StatCard key={i} {...s} />)}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px' }}>

        {/* Spectrum utilisation */}
        <div className="card card-glow-teal" style={{ padding:'24px' }}>
          <p style={{ fontFamily:'Orbitron, sans-serif', color:'#00e5ff', fontSize:'11px', letterSpacing:'0.12em', marginBottom:'18px' }}>
            📊 SPECTRUM UTILISATION BY BAND
          </p>
          {BANDS.map(b => (
            <div key={b.band} style={{ marginBottom:'14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px' }}>
                <span style={{ fontFamily:'Share Tech Mono, monospace', fontSize:'11px', color:'var(--muted)' }}>{b.band}</span>
                <span style={{ fontFamily:'Share Tech Mono, monospace', fontSize:'11px', color:b.color }}>{pct(b.band)}%</span>
              </div>
              <div style={{ height:'6px', background:'rgba(255,255,255,0.05)', borderRadius:'3px', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${pct(b.band)}%`, background:b.color, borderRadius:'3px', transition:'width 1s ease' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Performance metrics */}
        <div className="card card-glow-mint" style={{ padding:'24px' }}>
          <p style={{ fontFamily:'Orbitron, sans-serif', color:'#00ff9d', fontSize:'11px', letterSpacing:'0.12em', marginBottom:'18px' }}>
            ⚡ LIVE PERFORMANCE METRICS
          </p>
          {metrics && [
            ['Spectrum Utilisation',    `${metrics.sue}%`,         '#00ff9d'],
            ['Request Success Rate',    `${metrics.successRate}%`, '#00e5ff'],
            ["Jain's Fairness Index",   String(metrics.jfi),       '#a855f7'],
            ['Active Leases',           String(metrics.activeLeases), '#fbbf24'],
            ['Total On-Chain Records',  String(metrics.totalListings + metrics.totalLeases + metrics.totalRequests), '#f43f5e'],
          ].map(([label, value, color]) => (
            <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
              <span style={{ fontFamily:'Share Tech Mono, monospace', fontSize:'11px', color:'var(--muted)' }}>{label}</span>
              <span style={{ fontFamily:'Orbitron, sans-serif', fontSize:'13px', fontWeight:700, color }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Active leases table */}
      <div className="card" style={{ padding:'24px' }}>
        <p style={{ fontFamily:'Orbitron, sans-serif', color:'#00e5ff', fontSize:'11px', letterSpacing:'0.12em', marginBottom:'16px' }}>
          ⛓ ACTIVE LEASES ON-CHAIN
        </p>
        {leases.length === 0 ? (
          <p style={{ color:'var(--muted)', fontFamily:'Share Tech Mono, monospace', fontSize:'12px', padding:'20px 0' }}>
            No active leases. Create a listing and submit an access request to get started.
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>LEASE ID</th><th>PRIMARY</th><th>SECONDARY</th><th>BAND</th><th>AREA</th><th>STATUS</th></tr>
            </thead>
            <tbody>
              {leases.map(l => (
                <tr key={l.id}>
                  <td style={{ color:'#00e5ff' }}>LSE-{l.id}</td>
                  <td style={{ fontWeight:600 }}>{l.primaryName}</td>
                  <td style={{ color:'var(--muted)' }}>{l.secondaryName}</td>
                  <td>{l.band}</td>
                  <td style={{ color:'var(--muted)' }}>{l.area}</td>
                  <td><Badge status={l.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  )
}