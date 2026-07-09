import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/index.jsx'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import { MyListings, LeaseHistory } from './pages/PrimaryUser/index.jsx'
import { AvailableSpectrum, MyRequests, ActiveLease } from './pages/SecondaryUser/index.jsx'
import { NetworkOverview, AllListings, AllLeases } from './pages/Regulator/index.jsx'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

          {/* Primary */}
          <Route path="/my-listings"   element={<ProtectedRoute roles={['primary']}><MyListings /></ProtectedRoute>} />
          <Route path="/lease-history" element={<ProtectedRoute roles={['primary']}><LeaseHistory /></ProtectedRoute>} />

          {/* Secondary */}
          <Route path="/available"    element={<ProtectedRoute roles={['secondary']}><AvailableSpectrum /></ProtectedRoute>} />
          <Route path="/my-requests"  element={<ProtectedRoute roles={['secondary']}><MyRequests /></ProtectedRoute>} />
          <Route path="/active-lease" element={<ProtectedRoute roles={['secondary']}><ActiveLease /></ProtectedRoute>} />

          {/* Regulator */}
          <Route path="/network-overview" element={<ProtectedRoute roles={['regulator']}><NetworkOverview /></ProtectedRoute>} />
          <Route path="/all-listings"     element={<ProtectedRoute roles={['regulator']}><AllListings /></ProtectedRoute>} />
          <Route path="/all-leases"       element={<ProtectedRoute roles={['regulator']}><AllLeases /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
