import AppLayout from '../../components/AppLayout'
import { Badge, StatCard } from '../../components/index.jsx'
import { LISTINGS, LEASES, TRANSACTIONS, DISPUTES } from '../../data/mockData'

// ── NetworkOverview ───────────────────────────────────────────────────────────
export function NetworkOverview() {
  const stats = [
    { value:'5', label:'ACTIVE LISTINGS',  color:'#00e5ff', icon:'📋' },
    { value:'2', label:'ACTIVE LEASES',    color:'#00ff9d', icon:'⚡' },
    { value:'5', label:'OPERATORS ONLINE', color:'#fbbf24', icon:'🛰' },
    { value:'1', label:'PENDING DISPUTES', color:'#f43f5e', icon:'⚠' },
  ]
  return (
    <AppLayout title="NETWORK OVERVIEW" subtitle="Full read-only network monitoring — NCC Regulator">
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'18px',marginBottom:'24px' }}>
        {stats.map((s,i)=><StatCard key={i} {...s} />)}
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px',marginBottom:'20px' }}>

        {/* Radar */}
        <div className="card card-glow-teal" style={{ padding:'24px',textAlign:'center' }}>
          <p style={{ fontFamily:'Orbitron, sans-serif',color:'#00e5ff',fontSize:'11px',letterSpacing:'0.12em',marginBottom:'14px' }}>📡 SPECTRUM ACTIVITY RADAR</p>
          <svg width="210" height="210" viewBox="0 0 210 210" style={{ margin:'0 auto',display:'block',overflow:'visible' }}>
            <defs><radialGradient id="sg"><stop offset="0%" stopColor="#00ff9d" stopOpacity="0.3"/><stop offset="100%" stopColor="transparent"/></radialGradient></defs>
            {[85,65,45,25].map(r=><circle key={r} cx="105" cy="105" r={r} fill="none" stroke="#00e5ff" strokeWidth="0.7" opacity="0.15"/>)}
            <line x1="105" y1="20" x2="105" y2="190" stroke="#00e5ff" strokeWidth="0.5" opacity="0.08"/>
            <line x1="20"  y1="105" x2="190" y2="105" stroke="#00e5ff" strokeWidth="0.5" opacity="0.08"/>
            <g style={{ transformOrigin:'105px 105px',animation:'radar-sweep 4s linear infinite' }}>
              <line x1="105" y1="105" x2="105" y2="20" stroke="#00ff9d" strokeWidth="1.5" opacity="0.85"/>
              <path d="M105,105 L105,20 A85,85 0 0,1 175,165 Z" fill="url(#sg)" opacity="0.15"/>
            </g>
            {[{cx:148,cy:58,c:'#00ff9d',r:4},{cx:62,cy:138,c:'#fbbf24',r:3.5},{cx:162,cy:118,c:'#a855f7',r:3.5},{cx:82,cy:58,c:'#00e5ff',r:3},{cx:140,cy:155,c:'#f43f5e',r:3}].map((b,i)=>(
              <circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill={b.c} opacity="0.8">
                <animate attributeName="opacity" values="0.8;0.1;0.8" dur={`${2+i*0.5}s`} repeatCount="indefinite" begin={`${i*0.4}s`}/>
              </circle>
            ))}
            <circle cx="105" cy="105" r="4" fill="#00e5ff" opacity="0.7"/>
          </svg>
          <div style={{ display:'flex',justifyContent:'center',gap:'14px',marginTop:'12px',flexWrap:'wrap' }}>
            {[['#00ff9d','MTN'],['#a855f7','Airtel'],['#fbbf24','Glo'],['#00e5ff','9mobile'],['#f43f5e','Dispute']].map(([c,l])=>(
              <div key={l} style={{ display:'flex',alignItems:'center',gap:'5px' }}>
                <div style={{ width:'6px',height:'6px',borderRadius:'50%',background:c }}/>
                <span style={{ fontFamily:'Share Tech Mono, monospace',color:'var(--muted)',fontSize:'10px' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Disputes */}
        <div className="card card-glow-purple" style={{ padding:'24px' }}>
          <p style={{ fontFamily:'Orbitron, sans-serif',color:'#a855f7',fontSize:'11px',letterSpacing:'0.12em',marginBottom:'16px' }}>⚠ DISPUTE ESCALATIONS</p>
          {DISPUTES.map(d=>(
            <div key={d.id} style={{ background:'rgba(168,85,247,0.07)',border:'1px solid rgba(168,85,247,0.18)',borderRadius:'6px',padding:'14px' }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px' }}>
                <span style={{ fontFamily:'Orbitron, sans-serif',color:'#a855f7',fontSize:'12px' }}>{d.id}</span>
                <Badge status={d.status}/>
              </div>
              {[['RAISED BY',d.raiser],['LEASE',d.leaseId]].map(([l,v])=>(
                <div key={l} style={{ marginBottom:'8px' }}>
                  <div style={{ color:'var(--muted)',fontSize:'10px',marginBottom:'2px' }}>{l}</div>
                  <div style={{ color:'var(--text)',fontSize:'12px',fontWeight:600 }}>{v}</div>
                </div>
              ))}
              <div style={{ background:'rgba(168,85,247,0.06)',borderRadius:'4px',padding:'9px' }}>
                <div style={{ color:'var(--muted)',fontSize:'10px',marginBottom:'3px' }}>REASON</div>
                <div style={{ color:'var(--muted)',fontSize:'11px',lineHeight:1.5 }}>{d.reason}</div>
              </div>
              <div style={{ fontFamily:'Share Tech Mono, monospace',color:'var(--muted)',fontSize:'10px',marginTop:'8px' }}>{d.time}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Full tx log */}
      <div className="card" style={{ padding:'24px' }}>
        <p style={{ fontFamily:'Orbitron, sans-serif',color:'#00e5ff',fontSize:'11px',letterSpacing:'0.12em',marginBottom:'16px' }}>⛓ FULL NETWORK TRANSACTION LOG</p>
        <table className="data-table">
          <thead><tr><th>TX HASH</th><th>TYPE</th><th>FROM</th><th>TO</th><th>BAND</th><th>AREA</th><th>STATUS</th><th>TIME</th></tr></thead>
          <tbody>
            {TRANSACTIONS.map(tx=>(
              <tr key={tx.hash}>
                <td style={{ color:'#00e5ff',fontSize:'11px' }}>{tx.hash}</td>
                <td style={{ color:'#a855f7',fontWeight:600 }}>{tx.type}</td>
                <td style={{ color:'var(--muted)' }}>{tx.from}</td>
                <td style={{ color:'var(--muted)' }}>{tx.to}</td>
                <td>{tx.band}</td>
                <td style={{ color:'var(--muted)' }}>{tx.area}</td>
                <td><Badge status={tx.status}/></td>
                <td style={{ color:'var(--muted)',fontSize:'11px' }}>{tx.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  )
}

// ── AllListings ───────────────────────────────────────────────────────────────
export function AllListings() {
  return (
    <AppLayout title="ALL LISTINGS" subtitle="Complete spectrum listing registry — read only">
      <div className="card" style={{ padding:'24px' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px' }}>
          <p style={{ fontFamily:'Orbitron, sans-serif',color:'#00e5ff',fontSize:'11px',letterSpacing:'0.12em' }}>LISTING REGISTRY</p>
          <span style={{ fontFamily:'Share Tech Mono, monospace',color:'var(--muted)',fontSize:'11px' }}>{LISTINGS.filter(l=>l.status==='active').length} active of {LISTINGS.length} total</span>
        </div>
        <table className="data-table">
          <thead><tr><th>LISTING ID</th><th>PRIMARY OPERATOR</th><th>BAND</th><th>AREA</th><th>START</th><th>END</th><th>STATUS</th><th>ON-CHAIN HASH</th></tr></thead>
          <tbody>
            {LISTINGS.map(l=>(
              <tr key={l.id}>
                <td style={{ color:'#00e5ff' }}>{l.id}</td>
                <td style={{ fontWeight:600 }}>{l.owner}</td>
                <td>{l.band}</td>
                <td style={{ color:'var(--muted)' }}>{l.area}</td>
                <td style={{ color:'var(--muted)',fontSize:'11px' }}>{l.start}</td>
                <td style={{ color:'var(--muted)',fontSize:'11px' }}>{l.end}</td>
                <td><Badge status={l.status}/></td>
                <td style={{ color:'#a855f7',fontSize:'11px' }}>{l.txHash}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  )
}

// ── AllLeases ─────────────────────────────────────────────────────────────────
export function AllLeases() {
  const active = LEASES.filter(l=>l.status==='active')
  return (
    <AppLayout title="ALL LEASES" subtitle="All lease records across the network — read only">
      {active.length>0 && (
        <div style={{ marginBottom:'22px' }}>
          <p style={{ fontFamily:'Orbitron, sans-serif',color:'#00ff9d',fontSize:'11px',letterSpacing:'0.12em',marginBottom:'14px' }}>⚡ CURRENTLY ACTIVE</p>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:'14px' }}>
            {active.map(l=>(
              <div key={l.id} className="card card-glow-mint" style={{ padding:'22px' }}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'12px' }}>
                  <div>
                    <div style={{ fontFamily:'Orbitron, sans-serif',color:'#00ff9d',fontSize:'15px',fontWeight:700,marginBottom:'3px' }}>{l.band}</div>
                    <div style={{ fontFamily:'Share Tech Mono, monospace',color:'var(--muted)',fontSize:'10px' }}>{l.id}</div>
                  </div>
                  <div style={{ display:'flex',alignItems:'center',gap:'7px' }}>
                    <div style={{ width:'6px',height:'6px',borderRadius:'50%',background:'#00ff9d',animation:'glow-pulse 1.5s infinite' }}/>
                    <Badge status={l.status}/>
                  </div>
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'12px' }}>
                  {[['PRIMARY',l.primary],['SECONDARY',l.secondary],['AREA',l.area],['LISTING',l.listingId]].map(([label,val])=>(
                    <div key={label} style={{ background:'rgba(0,255,157,0.04)',borderRadius:'4px',padding:'8px 10px' }}>
                      <div style={{ color:'var(--muted)',fontSize:'9px',fontFamily:'Share Tech Mono, monospace',marginBottom:'2px' }}>{label}</div>
                      <div style={{ color:'var(--text)',fontSize:'11px',fontWeight:600 }}>{val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background:'rgba(0,229,255,0.04)',border:'1px solid rgba(0,229,255,0.1)',borderRadius:'4px',padding:'10px' }}>
                  <div style={{ color:'var(--muted)',fontSize:'9px',fontFamily:'Share Tech Mono, monospace',marginBottom:'3px' }}>ON-CHAIN HASH</div>
                  <div style={{ color:'#00e5ff',fontSize:'11px',fontFamily:'Share Tech Mono, monospace' }}>{l.txHash}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="card" style={{ padding:'24px' }}>
        <p style={{ fontFamily:'Orbitron, sans-serif',color:'#00e5ff',fontSize:'11px',letterSpacing:'0.12em',marginBottom:'16px' }}>COMPLETE LEASE REGISTRY</p>
        <table className="data-table">
          <thead><tr><th>LEASE ID</th><th>PRIMARY</th><th>SECONDARY</th><th>BAND</th><th>AREA</th><th>START</th><th>END</th><th>STATUS</th><th>TX HASH</th></tr></thead>
          <tbody>
            {LEASES.map(l=>(
              <tr key={l.id}>
                <td style={{ color:'#00e5ff' }}>{l.id}</td>
                <td style={{ fontWeight:600 }}>{l.primary}</td>
                <td style={{ color:'var(--muted)' }}>{l.secondary}</td>
                <td>{l.band}</td>
                <td style={{ color:'var(--muted)' }}>{l.area}</td>
                <td style={{ color:'var(--muted)',fontSize:'11px' }}>{l.start}</td>
                <td style={{ color:'var(--muted)',fontSize:'11px' }}>{l.end}</td>
                <td><Badge status={l.status}/></td>
                <td style={{ color:'#a855f7',fontSize:'11px' }}>{l.txHash}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  )
}
