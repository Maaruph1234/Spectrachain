// ── ProtectedRoute.jsx ───────────────────────────────────────────────────────
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children, roles }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

// ── Badge.jsx ────────────────────────────────────────────────────────────────
const STATUS_MAP = {
  active:    'badge-active',
  pending:   'badge-pending',
  expired:   'badge-expired',
  granted:   'badge-granted',
  rejected:  'badge-rejected',
  confirmed: 'badge-confirmed',
  dispute:   'badge-dispute',
  escalated: 'badge-escalated',
}
export function Badge({ status }) {
  return (
    <span className={`badge ${STATUS_MAP[status] || 'badge-expired'}`}>
      {status?.toUpperCase()}
    </span>
  )
}

// ── StatCard.jsx ─────────────────────────────────────────────────────────────
export function StatCard({ value, label, color, icon }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <span style={{ fontSize: '22px' }}>{icon}</span>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}`, marginTop: '4px' }} />
      </div>
      <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '28px', fontWeight: 700, color, marginBottom: '6px' }}>
        {value}
      </div>
      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.1em' }}>
        {label}
      </div>
    </div>
  )
}

// ── BackgroundSVG.jsx ────────────────────────────────────────────────────────
// Clean static background — no animated lines, no SVG network graphics
export function BackgroundSVG() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 0,
      background: 'var(--navy)', overflow: 'hidden', pointerEvents: 'none',
    }}>
      <div style={{
        position: 'absolute', top: '-20%', left: '-10%',
        width: '60vw', height: '60vw', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,229,255,0.045) 0%, transparent 70%)',
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', right: '-10%',
        width: '55vw', height: '55vw', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,255,157,0.035) 0%, transparent 70%)',
      }} />
      <div style={{
        position: 'absolute', top: '35%', left: '40%',
        width: '40vw', height: '40vw', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(168,85,247,0.025) 0%, transparent 70%)',
      }} />
    </div>
  )
}
