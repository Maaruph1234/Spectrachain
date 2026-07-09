import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const DEMO = [
  { label: 'MTN Nigeria',    username: 'mtn_operator',    role: 'primary',   color: '#fbbf24' },
  { label: 'Glo Mobile',    username: 'glo_operator',    role: 'primary',   color: '#00ff9d' },
  { label: 'Airtel Nigeria', username: 'airtel_user',    role: 'secondary', color: '#f43f5e' },
  { label: '9mobile Nigeria',username: 'ninemobile_user',role: 'secondary', color: '#a855f7' },
  { label: 'NCC Regulator',  username: 'ncc_admin',      role: 'regulator', color: '#00e5ff' },
]

function colorRGB(hex) {
  const m = { '#fbbf24':'251,191,36', '#00ff9d':'0,255,157', '#f43f5e':'244,63,94', '#a855f7':'168,85,247', '#00e5ff':'0,229,255' }
  return m[hex] || '0,229,255'
}

export default function Login() {
  const { login }  = useAuth()
  const navigate   = useNavigate()
  const [form, setForm]     = useState({ username: '', password: '', role: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  function fill(c) { setForm({ username: c.username, password: 'demo123', role: c.role }); setError('') }

  async function handleSubmit() {
    setError('')
    if (!form.username || !form.password || !form.role) { setError('All fields are required.'); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 900))
    const ok = login(form.username, form.password, form.role)
    setLoading(false)
    if (ok) navigate('/')
    else setError('Invalid credentials or role mismatch.')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#020c1b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Rajdhani, sans-serif' }}>

      {/* Static background glows */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-15%', left: '-5%', width: '55vw', height: '55vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,255,0.05) 0%, transparent 65%)' }} />
        <div style={{ position: 'absolute', bottom: '-15%', right: '-5%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,255,157,0.04) 0%, transparent 65%)' }} />
      </div>

      <div style={{ width: '100%', maxWidth: '980px', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '44px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '60px', height: '60px', borderRadius: '14px', marginBottom: '18px', background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.18)' }}>
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect x="2"  y="14" width="28" height="4" rx="2" fill="#00e5ff" opacity="0.9"/>
              <rect x="8"  y="8"  width="16" height="4" rx="2" fill="#00e5ff" opacity="0.6"/>
              <rect x="13" y="2"  width="6"  height="4" rx="2" fill="#00e5ff" opacity="0.4"/>
              <rect x="8"  y="20" width="16" height="4" rx="2" fill="#00ff9d" opacity="0.6"/>
              <rect x="13" y="26" width="6"  height="4" rx="2" fill="#00ff9d" opacity="0.4"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '24px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.1em', marginBottom: '7px' }}>
            SPECTRACHAIN
          </h1>
          <p style={{ color: '#4a6785', fontSize: '11px', letterSpacing: '0.14em', fontFamily: 'Share Tech Mono, monospace' }}>
            BLOCKCHAIN SPECTRUM SHARING FRAMEWORK
          </p>
          <div style={{ margin: '18px auto 0', width: '44px', height: '2px', background: 'linear-gradient(90deg, transparent, #00e5ff, transparent)' }} />
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', alignItems: 'start' }}>

          {/* LEFT — form */}
          <div style={{ background: 'rgba(10,25,47,0.85)', border: '1px solid rgba(0,229,255,0.12)', borderRadius: '12px', padding: '34px' }}>
            <h2 style={{ fontFamily: 'Orbitron, sans-serif', color: '#e2e8f0', fontSize: '12px', fontWeight: 600, letterSpacing: '0.14em', marginBottom: '26px' }}>
              OPERATOR SIGN IN
            </h2>

            {/* Operator ID */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '7px', color: '#4a6785', fontSize: '10px', fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.1em' }}>OPERATOR ID</label>
              <input type="text" className="input-neon" placeholder="Enter your operator ID" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} style={{ fontSize: '13px' }} />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '7px', color: '#4a6785', fontSize: '10px', fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.1em' }}>PASSWORD</label>
              <input type="password" className="input-neon" placeholder="Enter your password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={{ fontSize: '13px' }} />
            </div>

            {/* Role */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '7px', color: '#4a6785', fontSize: '10px', fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.1em' }}>ACCESS ROLE</label>
              <select className="select-neon" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={{ fontSize: '13px' }}>
                <option value="">Select role</option>
                <option value="primary">Primary Operator</option>
                <option value="secondary">Secondary Operator</option>
                <option value="regulator">NCC Regulator</option>
              </select>
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.22)', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', color: '#f43f5e', fontSize: '12px', fontFamily: 'Share Tech Mono, monospace' }}>
                {error}
              </div>
            )}

            <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ fontSize: '12px', letterSpacing: '0.12em' }}>
              {loading ? 'AUTHENTICATING...' : 'SIGN IN'}
            </button>

            {/* Notice */}
            <div style={{ marginTop: '18px', padding: '11px 13px', background: 'rgba(0,229,255,0.04)', borderRadius: '6px', borderLeft: '3px solid rgba(0,229,255,0.25)' }}>
              <p style={{ color: '#4a6785', fontSize: '10px', fontFamily: 'Share Tech Mono, monospace', lineHeight: 1.6, margin: 0 }}>
                Access restricted to verified NCC-licensed operators and registered regulatory personnel only.
              </p>
            </div>
          </div>

          {/* RIGHT — demo credentials + status */}
          <div>
            <p style={{ color: '#4a6785', fontSize: '10px', fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.1em', marginBottom: '12px' }}>
              DEMO CREDENTIALS — click to fill
            </p>

            <div style={{ display: 'grid', gap: '9px', marginBottom: '18px' }}>
              {DEMO.map(c => (
                <button key={c.username} onClick={() => fill(c)} style={{
                  width: '100%', textAlign: 'left',
                  background: 'rgba(10,25,47,0.6)',
                  border: `1px solid rgba(${colorRGB(c.color)},0.15)`,
                  borderRadius: '8px', padding: '12px 15px',
                  cursor: 'pointer', transition: 'background 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(10,25,47,0.95)'}
                  onMouseOut={e => e.currentTarget.style.background = 'rgba(10,25,47,0.6)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                    <div>
                      <div style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: 600, marginBottom: '1px' }}>{c.label}</div>
                      <div style={{ color: '#4a6785', fontSize: '10px', fontFamily: 'Share Tech Mono, monospace' }}>{c.username}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '9px', letterSpacing: '0.08em', color: c.color, opacity: 0.75, fontFamily: 'Share Tech Mono, monospace', textTransform: 'uppercase' }}>
                    {c.role}
                  </div>
                </button>
              ))}
            </div>

            {/* System status */}
            <div style={{ background: 'rgba(10,25,47,0.6)', border: '1px solid rgba(0,229,255,0.09)', borderRadius: '8px', padding: '16px' }}>
              <p style={{ color: '#4a6785', fontSize: '10px', fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.1em', marginBottom: '12px' }}>SYSTEM STATUS</p>
              {[
                ['Blockchain Node',  '#00ff9d', 'ONLINE'],
                ['Smart Contracts',  '#00ff9d', 'DEPLOYED'],
                ['NCC Registry',     '#00ff9d', 'ACTIVE'],
                ['Termii Gateway',   '#fbbf24', 'STANDBY'],
              ].map(([label, color, status]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '9px' }}>
                  <span style={{ color: '#4a6785', fontSize: '11px', fontFamily: 'Share Tech Mono, monospace' }}>{label}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color, fontSize: '10px', fontFamily: 'Share Tech Mono, monospace' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: color, display: 'inline-block' }} />
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: '30px', color: '#1e3a5f', fontSize: '10px', fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.08em' }}>
          AFIT KADUNA &nbsp;·&nbsp; DEPT. OF TELECOMMUNICATIONS ENGINEERING &nbsp;·&nbsp; U19TE1063
        </p>
      </div>
    </div>
  )
}
