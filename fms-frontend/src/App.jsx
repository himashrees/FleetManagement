import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/Forgotpassword'
import ResetPassword from './pages/Resetpassword'
import Dashboard from './pages/Dashboard'
import Vehicles from './pages/Vehicles'
import VehicleDetail from './pages/VehicleDetail'
import Drivers from './pages/Drivers'
import DriverDetail from './pages/DriverDetail'
import Trips from './pages/Trips'
import Fuel from './pages/Fuel'
import Maintenance from './pages/Maintenance'
import Documents from './pages/Documents'
import Alerts from './pages/Alerts'
import Reports from './pages/Reports'
import GpsTracking from './pages/GpsTracking'
import UserManagement from './pages/UserManagement'
import MyTrips from './pages/MyTrips'
import TripHistory from './pages/TripHistory'
import MyVehicle from './pages/MyVehicle'
import ReportIssue from './pages/ReportIssue'
import MyDocuments from './pages/MyDocuments'

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
      INITIALIZING FLEET OS...
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/" replace /> : children
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login"                 element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register"              element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/forgot-password"       element={<PublicRoute><ForgotPassword /></PublicRoute>} />
            <Route path="/reset-password/:token" element={<PublicRoute><ResetPassword /></PublicRoute>} />

            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Dashboard />} />

              {/* Admin / Manager */}
              <Route path="vehicles"     element={<PrivateRoute roles={['admin','manager']}><Vehicles /></PrivateRoute>} />
              <Route path="vehicles/:id" element={<PrivateRoute roles={['admin','manager']}><VehicleDetail /></PrivateRoute>} />
              <Route path="drivers"      element={<PrivateRoute roles={['admin','manager']}><Drivers /></PrivateRoute>} />
              <Route path="drivers/:id"  element={<PrivateRoute roles={['admin','manager']}><DriverDetail /></PrivateRoute>} />
              <Route path="trips"        element={<PrivateRoute roles={['admin','manager']}><Trips /></PrivateRoute>} />
              <Route path="fuel"         element={<PrivateRoute roles={['admin','manager']}><Fuel /></PrivateRoute>} />
              <Route path="maintenance"  element={<PrivateRoute roles={['admin','manager']}><Maintenance /></PrivateRoute>} />
              <Route path="alerts"       element={<Alerts />} />
              <Route path="reports"      element={<PrivateRoute roles={['admin','manager']}><Reports /></PrivateRoute>} />
              <Route path="gps"          element={<PrivateRoute roles={['admin','manager']}><GpsTracking /></PrivateRoute>} />
              <Route path="users"        element={<PrivateRoute roles={['admin']}><UserManagement /></PrivateRoute>} />
              <Route path="documents"    element={<PrivateRoute roles={['admin','manager']}><Documents /></PrivateRoute>} />

              {/* Driver */}
              <Route path="my-trips"     element={<PrivateRoute roles={['driver']}><MyTrips /></PrivateRoute>} />
              <Route path="trip-history" element={<PrivateRoute roles={['driver']}><TripHistory /></PrivateRoute>} />
              <Route path="my-vehicle"   element={<PrivateRoute roles={['driver']}><MyVehicle /></PrivateRoute>} />
              <Route path="my-documents" element={<PrivateRoute roles={['driver']}><MyDocuments /></PrivateRoute>} />
              <Route path="report-issue" element={<PrivateRoute roles={['driver']}><ReportIssue /></PrivateRoute>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}