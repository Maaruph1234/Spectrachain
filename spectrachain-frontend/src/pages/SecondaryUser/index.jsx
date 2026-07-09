import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import { Badge } from '../../components/index.jsx'
import { useAuth } from '../../context/AuthContext'
import { getActiveListings, submitRequest, getMyRequests, getMyLeasesAsSecondary, releaseLease, tsToDate } from '../../services/api'

// ── AvailableSpectrum ─────────────────────────────────────────────────────────
export function AvailableSpectrum() {
  const { user } = useAuth()
  const [listings,   setListings]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [selected,   setSelected]   = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast,      setToast]      = useState(null)
  const [bandFilter, setBandFilter] = useState('')
  const [areaFilter, setAreaFilter] = useState('')
  const [form, setForm] = useState({ startDate:'', endDate:'', purpose:'' })

  function showToast(msg, type) { setToast({ msg, type }); setTimeout(() => setToast(null), 4000) }

  useEffect(() => {
    getActiveListings()
      .then(r => setListings(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = listings.filter(l =>
    (!bandFilter || l.band === bandFilter) &&
    (!areaFilter || l.area === areaFilter)
  )

  async function handleRequest() {
    if (!form.startDate || !form.endDate || !form.purpose) {
      showToast('All fields are required', 'error'); return
    }
    const requestedStart = Math.floor(new Date(form.startDate).getTime() / 1000)
    const requestedEnd   = Math.floor(new Date(form.endDate).getTime() / 1000)
    if (requestedStart <= Math.floor(Date.now() / 1000)) {
      showToast('Start must be in the future', 'error'); return
    }
    if (requestedEnd <= requestedStart) {
      showToast('End must be after start', 'error'); return
    }
    setSubmitting(true)
    try {
      const res = await submitRequest(user.username, selected.id, requestedStart, requestedEnd, form.purpose)
      if (res.data.status === 'granted') {
        showToast(`✓ Access granted — TX: ${res.data.txHash.slice(0,18)}...`, 'success')
      } else if (res.data.status === 'rejected') {
        showToast(`✗ Rejected: ${res.data.reason}`, 'error')
      }
      setSelected(null)
      setForm({ startDate:'', endDate:'', purpose:'' })
    } catch (e) {
      showToast(e.response?.data?.error || 'Transaction failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppLayout title="AVAILABLE SPECTRUM" subtitle="NCC-verified listings from licensed primary operators">
      {toast && (
        <div style={{ position:'fixed', bottom:'24px', right:'24px', zIndex:9999, padding:'14px 22px', borderRadius:'6px', background:toast.type==='success'?'rgba(0,255,157,0.12)':'rgba(244,63,94,0.12)', border:`1px solid ${toast.type==='success'?'#00ff9d':'#f43f5e'}`, color:toast.type==='success'?'#00ff9d':'#f43f5e', fontFamily:'Share Tech Mono, monospace', fontSize:'12px', maxWidth:'420px' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display:'flex', gap:'12px', marginBottom:'22px', alignItems:'center' }}>
        <span style={{ fontFamily:'Share Tech Mono, monospace', fontSize:'11px', color:'var(--muted)' }}>
          {filtered.length} listing{filtered.length!==1?'s':''} available
        </span>
        <div style={{ marginLeft:'auto', display:'flex', gap:'10px' }}>
          <select className="select-neon" style={{ width:'140px', fontSize:'12px' }} value={bandFilter} onChange={e => setBandFilter(e.target.value)}>
            <option value="">All Bands</option>
            {['700 MHz','800 MHz','1800 MHz','2100 MHz','3500 MHz'].map(b => <option key={b}>{b}</option>)}
          </select>
          <select className="select-neon" style={{ width:'140px', fontSize:'12px' }} value={areaFilter} onChange={e => setAreaFilter(e.target.value)}>
            <option value="">All Areas</option>
            {['Lagos','Abuja','Kano','Kaduna','Rivers'].map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <p style={{ color:'var(--muted)', fontFamily:'Share Tech Mono, monospace' }}>Loading from blockchain...</p>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding:'60px', textAlign:'center' }}>
          <p style={{ color:'var(--muted)', fontFamily:'Share Tech Mono, monospace' }}>No listings available. Try adjusting your filters.</p>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'16px' }}>
          {filtered.map(l => (
            <div key={l.id} className="card card-glow-teal" style={{ padding:'22px', transition:'transform 0.2s' }}
              onMouseOver={e => e.currentTarget.style.transform='translateY(-3px)'}
              onMouseOut={e => e.currentTarget.style.transform='translateY(0)'}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'14px' }}>
                <div>
                  <div style={{ fontFamily:'Orbitron, sans-serif', color:'#00e5ff', fontSize:'16px', fontWeight:700, marginBottom:'3px' }}>{l.band}</div>
                  <div style={{ fontFamily:'Share Tech Mono, monospace', color:'var(--muted)', fontSize:'10px' }}>ID #{l.id}</div>
                </div>
                <Badge status={l.status} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px' }}>
                {[['OPERATOR',l.operatorName],['AREA',l.area],['FROM',tsToDate(l.startTime)],['TO',tsToDate(l.endTime)]].map(([label,val]) => (
                  <div key={label} style={{ background:'rgba(0,229,255,0.04)', borderRadius:'4px', padding:'8px 10px' }}>
                    <div style={{ color:'var(--muted)', fontSize:'9px', fontFamily:'Share Tech Mono, monospace', marginBottom:'3px' }}>{label}</div>
                    <div style={{ color:'var(--text)', fontSize:'11px', fontWeight:600 }}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{ background:'rgba(0,229,255,0.03)', border:'1px solid rgba(0,229,255,0.08)', borderRadius:'4px', padding:'10px', marginBottom:'14px' }}>
                <div style={{ color:'var(--muted)', fontSize:'9px', fontFamily:'Share Tech Mono, monospace', marginBottom:'3px' }}>CONDITIONS</div>
                <div style={{ color:'var(--muted)', fontSize:'11px', lineHeight:1.5 }}>{l.conditions}</div>
              </div>
              <button className="btn-primary" onClick={() => { setSelected(l); setForm({ startDate:'', endDate:'', purpose:'' }) }} style={{ fontSize:'11px', padding:'10px' }}>
                REQUEST ACCESS
              </button>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(2,12,27,0.9)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'var(--navy2)', border:'1px solid rgba(0,229,255,0.22)', borderRadius:'12px', padding:'32px', width:'90%', maxWidth:'480px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
              <h3 style={{ fontFamily:'Orbitron, sans-serif', color:'#00e5ff', fontSize:'12px', letterSpacing:'0.1em' }}>REQUEST ACCESS — {selected.band}</h3>
              <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', color:'var(--muted)', fontSize:'20px', cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ background:'rgba(0,229,255,0.05)', border:'1px solid rgba(0,229,255,0.15)', borderRadius:'6px', padding:'12px', marginBottom:'18px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px' }}>
              {[['OPERATOR',selected.operatorName],['AREA',selected.area],['ID',`#${selected.id}`]].map(([l,v]) => (
                <div key={l}><div style={{ color:'var(--muted)', fontSize:'9px', fontFamily:'Share Tech Mono, monospace', marginBottom:'2px' }}>{l}</div><div style={{ color:'var(--text)', fontSize:'11px', fontWeight:600 }}>{v}</div></div>
              ))}
            </div>
            <div style={{ display:'grid', gap:'13px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div>
                  <label style={{ display:'block', marginBottom:'6px', color:'var(--muted)', fontSize:'10px', fontFamily:'Share Tech Mono, monospace' }}>START</label>
                  <input type="datetime-local" className="input-neon" value={form.startDate} onChange={e => setForm({...form, startDate:e.target.value})} />
                </div>
                <div>
                  <label style={{ display:'block', marginBottom:'6px', color:'var(--muted)', fontSize:'10px', fontFamily:'Share Tech Mono, monospace' }}>END</label>
                  <input type="datetime-local" className="input-neon" value={form.endDate} onChange={e => setForm({...form, endDate:e.target.value})} />
                </div>
              </div>
              <div>
                <label style={{ display:'block', marginBottom:'6px', color:'var(--muted)', fontSize:'10px', fontFamily:'Share Tech Mono, monospace' }}>PURPOSE</label>
                <input type="text" className="input-neon" placeholder="e.g. Temporary capacity expansion" value={form.purpose} onChange={e => setForm({...form, purpose:e.target.value})} />
              </div>
              <button className="btn-primary" onClick={handleRequest} disabled={submitting} style={{ marginTop:'6px' }}>
                {submitting ? 'SUBMITTING TO BLOCKCHAIN...' : '⛓ SUBMIT REQUEST'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

// ── MyRequests ────────────────────────────────────────────────────────────────
export function MyRequests() {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    getMyRequests(user.address)
      .then(r => setRequests(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <AppLayout title="MY REQUESTS" subtitle="Access requests submitted to the blockchain">
      {loading ? (
        <p style={{ color:'var(--muted)', fontFamily:'Share Tech Mono, monospace' }}>Loading from blockchain...</p>
      ) : requests.length === 0 ? (
        <div className="card" style={{ padding:'60px', textAlign:'center' }}>
          <p style={{ color:'var(--muted)', fontFamily:'Share Tech Mono, monospace' }}>No requests yet. Go to Available Spectrum to submit one.</p>
        </div>
      ) : (
        <div style={{ display:'grid', gap:'14px' }}>
          {requests.map(r => (
            <div key={r.id} className={`card ${r.status==='granted'?'card-glow-teal':r.status==='pending'?'card-glow-amber':''}`} style={{ padding:'22px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
                <span style={{ fontFamily:'Orbitron, sans-serif', fontSize:'14px', color:'var(--text)' }}>REQ-{r.id}</span>
                <Badge status={r.status} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px', marginBottom:'12px' }}>
                {[['LISTING',`#${r.listingId}`],['FROM',tsToDate(r.requestedStart)],['TO',tsToDate(r.requestedEnd)]].map(([l,v]) => (
                  <div key={l}><div style={{ color:'var(--muted)', fontSize:'10px', marginBottom:'3px' }}>{l}</div><div style={{ fontWeight:600, fontSize:'12px' }}>{v}</div></div>
                ))}
              </div>
              <div style={{ background:'rgba(0,229,255,0.04)', borderRadius:'4px', padding:'10px', marginBottom: r.status==='granted'?'14px':'0' }}>
                <div style={{ color:'var(--muted)', fontSize:'10px', marginBottom:'3px' }}>PURPOSE</div>
                <div style={{ color:'var(--muted)', fontSize:'12px' }}>{r.purpose}</div>
              </div>
              {r.status === 'rejected' && r.rejectionReason && (
                <div style={{ marginTop:'12px', background:'rgba(244,63,94,0.07)', border:'1px solid rgba(244,63,94,0.2)', borderRadius:'4px', padding:'10px' }}>
                  <div style={{ color:'#f43f5e', fontSize:'11px', fontFamily:'Share Tech Mono, monospace' }}>REJECTED: {r.rejectionReason}</div>
                </div>
              )}
              {r.status === 'granted' && (
                <button className="btn-mint" onClick={() => navigate('/active-lease')} style={{ marginTop:'14px', fontSize:'11px', padding:'8px 18px' }}>
                  VIEW ACTIVE LEASE →
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  )
}

// ── ActiveLease ───────────────────────────────────────────────────────────────
export function ActiveLease() {
  const { user }  = useAuth()
  const [leases,   setLeases]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [toast,    setToast]    = useState(null)
  const [releasing, setReleasing] = useState(false)

  function showToast(msg, type) { setToast({ msg, type }); setTimeout(() => setToast(null), 4000) }

  async function load() {
    try {
      const res = await getMyLeasesAsSecondary(user.address)
      setLeases(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const active = leases.find(l => l.status === 'active')

  async function handleRelease(leaseId) {
    setReleasing(true)
    try {
      const res = await releaseLease(user.username, leaseId)
      showToast(`✓ Lease released on-chain — TX: ${res.data.txHash.slice(0,18)}...`, 'success')
      await load()
    } catch (e) {
      showToast(e.response?.data?.error || 'Release failed', 'error')
    } finally {
      setReleasing(false)
    }
  }

  return (
    <AppLayout title="ACTIVE LEASE" subtitle="Your current spectrum access grant">
      {toast && (
        <div style={{ position:'fixed', bottom:'24px', right:'24px', zIndex:9999, padding:'14px 22px', borderRadius:'6px', background:toast.type==='success'?'rgba(0,255,157,0.12)':'rgba(244,63,94,0.12)', border:`1px solid ${toast.type==='success'?'#00ff9d':'#f43f5e'}`, color:toast.type==='success'?'#00ff9d':'#f43f5e', fontFamily:'Share Tech Mono, monospace', fontSize:'12px' }}>
          {toast.msg}
        </div>
      )}

      {loading ? (
        <p style={{ color:'var(--muted)', fontFamily:'Share Tech Mono, monospace' }}>Loading from blockchain...</p>
      ) : !active ? (
        <div className="card" style={{ padding:'60px', textAlign:'center' }}>
          <p style={{ color:'var(--muted)', fontFamily:'Share Tech Mono, monospace' }}>No active lease at this time.</p>
        </div>
      ) : (
        <div style={{ maxWidth:'680px' }}>
          <div className="card card-glow-mint" style={{ padding:'30px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'24px' }}>
              <div style={{ width:'12px', height:'12px', borderRadius:'50%', background:'#00ff9d', boxShadow:'0 0 16px #00ff9d', animation:'glow-pulse 1.5s infinite', flexShrink:0 }} />
              <h3 style={{ fontFamily:'Orbitron, sans-serif', color:'#00ff9d', fontSize:'13px', letterSpacing:'0.1em' }}>
                LEASE ACTIVE — SPECTRUM ACCESS GRANTED
              </h3>
            </div>

            <div style={{ background:'rgba(0,255,157,0.06)', border:'1px solid rgba(0,255,157,0.2)', borderRadius:'8px', padding:'26px', marginBottom:'20px', textAlign:'center' }}>
              <div style={{ fontFamily:'Orbitron, sans-serif', fontSize:'48px', fontWeight:900, color:'#00ff9d', marginBottom:'6px' }}>{active.band}</div>
              <div style={{ fontFamily:'Share Tech Mono, monospace', color:'var(--muted)', fontSize:'11px' }}>
                {active.area} STATE &nbsp;|&nbsp; LEASE #{active.id}
              </div>
              <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'center', gap:'3px', marginTop:'16px', height:'24px' }}>
                {[35,55,75,100,75,55,35,55,75,100,75,55,35].map((h,i) => (
                  <div key={i} style={{ width:'5px', height:`${h}%`, background:'#00ff9d', borderRadius:'2px', opacity:0.7, animation:`float-up ${0.8+i*0.1}s ease-in-out infinite alternate` }} />
                ))}
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px', marginBottom:'18px' }}>
              {[['PRIMARY OPERATOR',active.primaryName],['LEASE START',tsToDate(active.startTime)],['LEASE END',tsToDate(active.endTime)]].map(([label,val]) => (
                <div key={label} style={{ background:'rgba(0,229,255,0.05)', borderRadius:'6px', padding:'12px' }}>
                  <div style={{ color:'var(--muted)', fontSize:'9px', fontFamily:'Share Tech Mono, monospace', marginBottom:'5px' }}>{label}</div>
                  <div style={{ color:'var(--text)', fontWeight:600, fontSize:'12px' }}>{val}</div>
                </div>
              ))}
            </div>

            <button className="btn-outline" onClick={() => handleRelease(active.id)} disabled={releasing} style={{ fontSize:'11px', padding:'10px 20px' }}>
              {releasing ? 'SUBMITTING TO BLOCKCHAIN...' : 'EARLY RELEASE'}
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  )
}