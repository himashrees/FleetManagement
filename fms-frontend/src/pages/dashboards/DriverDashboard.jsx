import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Truck, Route, Shield, FileWarning, Play, MapPin, Clock, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { driverAPI, tripAPI } from '../../services/api'
import { LoadingState, EmptyState, PageHeader } from '../../components/Common'

const SAFETY_BADGE = { good: 'badge-green', fair: 'badge-amber', critical: 'badge-red' }

export default function DriverDashboard() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.driverId) { setLoading(false); return }
    Promise.all([
      driverAPI.getById(user.driverId),
      tripAPI.getAll(), // backend auto-scopes this to the driver's own trips
    ])
      .then(([p, t]) => {
        setProfile(p.data.data)
        setTrips(t.data.data || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return <LoadingState label="Loading your dashboard…" />

  if (!user?.driverId) {
    return (
      <div className="page-enter">
        <PageHeader title="My" accent="Dashboard" sub="Welcome to FleetOS" />
        <div className="notice notice-amber">
          <FileWarning size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>No driver profile is linked to your account yet. Contact your fleet manager to get set up.</span>
        </div>
      </div>
    )
  }

  const activeTrip = trips.find(t => t.status === 'in_progress')
  const upcomingTrip = !activeTrip ? trips.find(t => t.status === 'planned') : null
  const recentTrips = trips.filter(t => t.status === 'completed').slice(0, 5)
  const licenseExpiry = profile?.license_expiry ? new Date(profile.license_expiry) : null
  const daysToExpiry = licenseExpiry ? Math.floor((licenseExpiry - new Date()) / (1000 * 60 * 60 * 24)) : null

  return (
    <div className="page-enter">
      <PageHeader title="My" accent="Dashboard" sub={`Welcome back, ${user?.name?.split(' ')[0] || 'driver'}`} />

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card blue">
          <div className="stat-icon blue"><Truck size={18} /></div>
          <div className="stat-label">Assigned Vehicle</div>
          <div className="stat-value" style={{ fontSize: '1.3rem' }}>{profile?.assignedVehicle?.registration_no || '—'}</div>
          <div className="stat-sub">{profile?.assignedVehicle ? `${profile.assignedVehicle.make} ${profile.assignedVehicle.model}` : 'No vehicle assigned'}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon green"><Shield size={18} /></div>
          <div className="stat-label">Safety Score</div>
          <div className="stat-value">{profile?.safety_score ?? '—'}</div>
          <div className="stat-sub">
            {profile?.safety_level && <span className={`badge ${SAFETY_BADGE[profile.safety_level]}`}>{profile.safety_level}</span>}
          </div>
        </div>
        <div className={`stat-card ${daysToExpiry !== null && daysToExpiry < 30 ? 'red' : 'blue'}`}>
          <div className={`stat-icon ${daysToExpiry !== null && daysToExpiry < 30 ? 'red' : 'blue'}`}><FileWarning size={18} /></div>
          <div className="stat-label">License Expiry</div>
          <div className="stat-value" style={{ fontSize: '1.1rem' }}>{profile?.license_expiry || '—'}</div>
          <div className="stat-sub">
            {daysToExpiry !== null && (daysToExpiry < 0 ? 'Expired' : daysToExpiry < 30 ? `${daysToExpiry} days left` : 'Valid')}
          </div>
        </div>
      </div>

      <div className="chart-card" style={{ marginBottom: '16px' }}>
        <div className="chart-header">
          <div className="chart-title">Current Trip</div>
          {!activeTrip && !upcomingTrip && <span className="badge badge-slate">Idle</span>}
        </div>
        {activeTrip ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MapPin size={16} color="var(--brand)" />
              <span style={{ fontSize: '0.9rem' }}>{activeTrip.start_location || '—'} → {activeTrip.end_location || '—'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <Clock size={14} />
              Started {activeTrip.start_time ? new Date(activeTrip.start_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
            </div>
            <span className="badge badge-blue" style={{ width: 'fit-content' }}>On Going</span>
            <Link to="/trips" className="btn btn-secondary" style={{ width: 'fit-content', textDecoration: 'none' }}>End this trip →</Link>
          </div>
        ) : upcomingTrip ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MapPin size={16} color="var(--amber)" />
              <span style={{ fontSize: '0.9rem' }}>{upcomingTrip.start_location || '—'} → {upcomingTrip.end_location || '—'}</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Vehicle: {upcomingTrip.vehicle?.registration_no || '—'}</div>
            <span className="badge badge-slate" style={{ width: 'fit-content' }}>Scheduled — not started</span>
            <Link to="/trips" className="btn btn-primary" style={{ width: 'fit-content', textDecoration: 'none' }}><Play size={13} /> Start this trip →</Link>
          </div>
        ) : (
          <EmptyState icon="🚗" title="No active trip" sub="Your fleet manager hasn't scheduled a trip for you yet" />
        )}
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <div className="chart-title">Recent Completed Trips</div>
          <Route size={14} color="var(--text-muted)" />
        </div>
        {recentTrips.length === 0 ? (
          <EmptyState icon="🗺️" title="No completed trips yet" sub="Your trip history will appear here" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentTrips.map(t => (
              <div key={t.id} style={{ padding: '10px 14px', background: 'var(--bg-canvas)', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)' }}>{t.start_location || '—'} → {t.end_location || '—'}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{t.distance_km ? `${t.distance_km.toFixed(1)} km` : '—'}</div>
                </div>
                <span className="badge badge-green"><CheckCircle2 size={10} /> Completed</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}