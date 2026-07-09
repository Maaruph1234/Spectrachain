import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import { Badge } from '../../components/index.jsx'
import { useAuth } from '../../context/AuthContext'
import { getMyListings, createListing, deactivateListing, getMyLeasesAsPrimary, tsToDate } from '../../services/api'

// ── MyListings ────────────────────────────────────────────────────────────────
export function MyListings() {
  const { user } = useAuth()
  const [listings,    setListings]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showModal,   setShowModal]   = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [toast,       setToast]       = useState(null)
  const [form, setForm] = useState({ band:'', area:'', startDate:'', endDate:'', conditions:'' })

  function showToast(msg, type) { setToast({ msg, type }); setTimeout(() => setToast(null), 4000) }

  async function load() {
    try {
      const res = await getMyListings(user.address)
      setListings(res.data)
    } catch (e) {
      showToast('Failed to load listings from blockchain', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleCreate() {
    if (!form.band || !form.area || !form.startDate || !form.endDate || !form.conditions) {
      showToast('All fields are required', 'error'); return
    }
    const startTime = Math.floor(new Date(form.startDate).getTime() / 1000)
    const endTime   = Math.floor(new Date(form.endDate).getTime() / 1000)
    if (startTime <= Math.floor(Date.now() / 1000)) {
      showToast('Start date must be in the future', 'error'); return
    }
    if (endTime <= startTime) {
      showToast('End date must be after start date', 'error'); return
    }
    setSubmitting(true)
    try {
      const res = await createListing(user.username, form.band, form.area, startTime, endTime, form.conditions)
      showToast(`✓ Listing created on-chain — TX: ${res.data.txHash.slice(0,18)}...`, 'success')
      setShowModal(false)
      setForm({ band:'', area:'', startDate:'', endDate:'', conditions:'' })
      await load()
    } catch (e) {
      showToast(e.response?.data?.error || 'Transaction failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeactivate(id) {
    try {
      await deactivateListing(user.username, id)
      showToast('Listing deactivated on-chain', 'success')
      await load()
    } catch (e) {
      showToast(e.response?.data?.error || 'Failed to deactivate', 'error')
    }
  }

  return (
    <AppLayout title="MY LISTINGS" subtitle="Spectrum you have listed on the blockchain">
      {toast && (
        <div style={{ position:'fixed', bottom:'24px', right:'24px', zIndex:9999, padding:'14px 22px', borderRadius:'6px', background:toast.type==='success'?'rgba(0,255,157,0.12)':'rgba(244,63,94,0.12)', border:`1px solid ${toast.type==='success'?'#00ff9d':'#f43f5e'}`, color:toast.type==='success'?'#00ff9d':'#f43f5e', fontFamily:'Share Tech Mono, monospace', fontSize:'12px', maxWidth:'420px' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'22px' }}>
        <span style={{ fontFamily:'Share Tech Mono, monospace', fontSize:'11px', color:'var(--muted)' }}>
          {listings.filter(l => l.status==='active').length} active listings on-chain
        </span>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ width:'auto', padding:'10px 22px', fontSize:'11px' }}>
          + NEW LISTING
        </button>
      </div>

      {loading ? (
        <p style={{ color:'var(--muted)', fontFamily:'Share Tech Mono, monospace' }}>Loading from blockchain...</p>
      ) : listings.length === 0 ? (
        <div className="card" style={{ padding:'60px', textAlign:'center' }}>
          <p style={{ color:'var(--muted)', fontFamily:'Share Tech Mono, monospace' }}>No listings yet. Create your first listing.</p>
        </div>
      ) : (
        <div style={{ display:'grid', gap:'14px' }}>
          {listings.map(l => (
            <div key={l.id} className={`card ${l.status==='active'?'card-glow-teal':''}`} style={{ padding:'22px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr auto', gap:'16px', alignItems:'center' }}>
              <div>
                <div style={{ fontFamily:'Orbitron, sans-serif', color:'#00e5ff', fontSize:'16px', fontWeight:700, marginBottom:'3px' }}>{l.band}</div>
                <div style={{ fontFamily:'Share Tech Mono, monospace', color:'var(--muted)', fontSize:'10px' }}>ID #{l.id}</div>
              </div>
              <div><div style={{ color:'var(--muted)', fontSize:'10px', marginBottom:'2px' }}>AREA</div><div style={{ fontWeight:600 }}>{l.area}</div></div>
              <div><div style={{ color:'var(--muted)', fontSize:'10px', marginBottom:'2px' }}>WINDOW</div><div style={{ fontSize:'11px', color:'var(--muted)' }}>{tsToDate(l.startTime)} → {tsToDate(l.endTime)}</div></div>
              <div><Badge status={l.status} /></div>
              {l.status === 'active' && (
                <button className="btn-danger" onClick={() => handleDeactivate(l.id)} style={{ fontSize:'10px', padding:'7px 14px', whiteSpace:'nowrap' }}>DEACTIVATE</button>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(2,12,27,0.9)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'var(--navy2)', border:'1px solid rgba(0,229,255,0.22)', borderRadius:'12px', padding:'32px', width:'90%', maxWidth:'480px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'22px' }}>
              <h3 style={{ fontFamily:'Orbitron, sans-serif', color:'#00e5ff', fontSize:'12px', letterSpacing:'0.1em' }}>NEW SPECTRUM LISTING</h3>
              <button onClick={() => setShowModal(false)} style={{ background:'none', border:'none', color:'var(--muted)', fontSize:'20px', cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ display:'grid', gap:'14px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div>
                  <label style={{ display:'block', marginBottom:'6px', color:'var(--muted)', fontSize:'10px', fontFamily:'Share Tech Mono, monospace' }}>BAND</label>
                  <select className="select-neon" value={form.band} onChange={e => setForm({...form, band:e.target.value})}>
                    <option value="">Select</option>
                    {['700 MHz','800 MHz','1800 MHz','2100 MHz','3500 MHz'].map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display:'block', marginBottom:'6px', color:'var(--muted)', fontSize:'10px', fontFamily:'Share Tech Mono, monospace' }}>AREA</label>
                  <select className="select-neon" value={form.area} onChange={e => setForm({...form, area:e.target.value})}>
                    <option value="">Select</option>
                    {['Lagos','Abuja','Kano','Kaduna','Rivers','Oyo','Anambra','Delta'].map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div>
                  <label style={{ display:'block', marginBottom:'6px', color:'var(--muted)', fontSize:'10px', fontFamily:'Share Tech Mono, monospace' }}>START DATE</label>
                  <input type="datetime-local" className="input-neon" value={form.startDate} onChange={e => setForm({...form, startDate:e.target.value})} />
                </div>
                <div>
                  <label style={{ display:'block', marginBottom:'6px', color:'var(--muted)', fontSize:'10px', fontFamily:'Share Tech Mono, monospace' }}>END DATE</label>
                  <input type="datetime-local" className="input-neon" value={form.endDate} onChange={e => setForm({...form, endDate:e.target.value})} />
                </div>
              </div>
              <div>
                <label style={{ display:'block', marginBottom:'6px', color:'var(--muted)', fontSize:'10px', fontFamily:'Share Tech Mono, monospace' }}>CONDITIONS</label>
                <input type="text" className="input-neon" placeholder="e.g. Max EIRP 43 dBm. No interference with public safety." value={form.conditions} onChange={e => setForm({...form, conditions:e.target.value})} />
              </div>
              <button className="btn-primary" onClick={handleCreate} disabled={submitting} style={{ marginTop:'6px' }}>
                {submitting ? 'SUBMITTING TO BLOCKCHAIN...' : '⛓ CREATE LISTING'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

// ── LeaseHistory ──────────────────────────────────────────────────────────────
export function LeaseHistory() {
  const { user }  = useAuth()
  const [leases, setLeases]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyLeasesAsPrimary(user.address)
      .then(r => setLeases(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <AppLayout title="LEASE HISTORY" subtitle="Secondary operators who have leased your spectrum">
      <div className="card" style={{ padding:'24px' }}>
        {loading ? (
          <p style={{ color:'var(--muted)', fontFamily:'Share Tech Mono, monospace' }}>Loading from blockchain...</p>
        ) : (
          <table className="data-table">
            <thead><tr><th>LEASE ID</th><th>SECONDARY</th><th>BAND</th><th>AREA</th><th>START</th><th>END</th><th>STATUS</th></tr></thead>
            <tbody>
              {leases.length === 0
                ? <tr><td colSpan={7} style={{ textAlign:'center', color:'var(--muted)', padding:'40px', fontFamily:'Share Tech Mono, monospace' }}>No lease history yet.</td></tr>
                : leases.map(l => (
                  <tr key={l.id}>
                    <td style={{ color:'#00e5ff' }}>LSE-{l.id}</td>
                    <td style={{ fontWeight:600 }}>{l.secondaryName}</td>
                    <td>{l.band}</td>
                    <td style={{ color:'var(--muted)' }}>{l.area}</td>
                    <td style={{ color:'var(--muted)', fontSize:'11px' }}>{tsToDate(l.startTime)}</td>
                    <td style={{ color:'var(--muted)', fontSize:'11px' }}>{tsToDate(l.endTime)}</td>
                    <td><Badge status={l.status} /></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  )
}