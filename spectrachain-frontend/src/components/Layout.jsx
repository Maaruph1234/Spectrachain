import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// ── TOPBAR ────────────────────────────────────────────────────────────────────
export function Topbar({ title, subtitle }) {
  const [blocks, setBlocks] = useState(847291)
  useEffect(() => {
    const t = setInterval(() => setBlocks(b => b + 1), 8000)
    return () => clearInterval(t)
  }, [])
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(2,12,27,0.92)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(0,229,255,0.08)',
      padding: '14px 28px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <div>
        <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '15px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.1em' }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '10px', color: 'var(--muted)', marginTop: '2px', letterSpacing: '0.06em' }}>
            {subtitle}
          </p>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00ff9d', animation: 'glow-pulse 2s infinite' }} />
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '10px', color: 'var(--muted)' }}>
            HARDHAT TESTNET
          </span>
        </div>
        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '10px', color: '#00e5ff' }}>
          #{blocks.toLocaleString()}
        </div>
      </div>
    </div>
  )
}

// ── NAV CONFIG ────────────────────────────────────────────────────────────────
const NAV = {
  primary:   [
    { to: '/',             label: 'Dashboard',     icon: '◈' },
    { to: '/my-listings',  label: 'My Listings',   icon: '📋' },
    { to: '/lease-history',label: 'Lease History', icon: '📜' },
  ],
  secondary: [
    { to: '/',              label: 'Dashboard',        icon: '◈' },
    { to: '/available',     label: 'Available Spectrum',icon: '📡' },
    { to: '/my-requests',   label: 'My Requests',      icon: '📨' },
    { to: '/active-lease',  label: 'Active Lease',     icon: '⚡' },
  ],
  regulator: [
    { to: '/',                label: 'Dashboard',        icon: '◈' },
    { to: '/network-overview',label: 'Network Overview', icon: '🛰' },
    { to: '/all-listings',    label: 'All Listings',     icon: '📋' },
    { to: '/all-leases',      label: 'All Leases',       icon: '📜' },
  ],
}

const ROLE_COLOR = { primary: '#00e5ff', secondary: '#00ff9d', regulator: '#a855f7' }

export function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  if (!user) return null
  const links = NAV[user.role] || []
  const color  = ROLE_COLOR[user.role]

  return (
    <div className="sidebar">
      {/* Logo */}
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid rgba(0,229,255,0.08)' }}>
        <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '16px', fontWeight: 900, color: '#00e5ff', letterSpacing: '0.1em' }}>
          SPECTRA<span style={{ color: '#00ff9d' }}>CHAIN</span>
        </div>
        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '9px', color: 'var(--muted)', marginTop: '4px', letterSpacing: '0.1em' }}>
          BLOCKCHAIN SPECTRUM FRAMEWORK
        </div>
      </div>

      {/* User info */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,229,255,0.06)', margin: '0 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
            background: `rgba(${color === '#00e5ff' ? '0,229,255' : color === '#00ff9d' ? '0,255,157' : '168,85,247'},0.1)`,
            border: `1px solid ${color}33`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Orbitron, sans-serif', fontSize: '12px', fontWeight: 700, color,
          }}>
            {user.name.charAt(0)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.name}
            </div>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '9px', color, marginTop: '2px', letterSpacing: '0.06em' }}>
              {user.role.toUpperCase()}
            </div>
          </div>
        </div>
        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '9px', color: 'var(--muted)', marginTop: '8px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {user.address}
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, padding: '12px 0' }}>
        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '9px', color: 'var(--muted)', letterSpacing: '0.12em', padding: '0 22px', marginBottom: '8px' }}>
          NAVIGATION
        </div>
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <span style={{ fontSize: '14px' }}>{l.icon}</span>
            <span>{l.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div style={{ padding: '16px 10px', borderTop: '1px solid rgba(0,229,255,0.06)' }}>
        <button
          onClick={() => { logout(); navigate('/login') }}
          style={{
            width: '100%', padding: '9px 16px',
            background: 'rgba(244,63,94,0.06)',
            border: '1px solid rgba(244,63,94,0.2)',
            borderRadius: '6px', color: '#f43f5e',
            fontFamily: 'Orbitron, sans-serif', fontSize: '10px',
            fontWeight: 600, letterSpacing: '0.1em',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(244,63,94,0.12)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(244,63,94,0.06)'}
        >
          SIGN OUT
        </button>
      </div>
    </div>
  )
}
