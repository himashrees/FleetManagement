import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Truck, Play, CheckCircle2, MapPin, Calendar, Bell,
  Navigation, FileText, AlertTriangle, Activity, Route,
  Wrench, Car, ShieldAlert, FileWarning, Zap, Clock,
  ArrowRight, TrendingUp
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { driverAPI, tripAPI, alertAPI, documentAPI } from '../../services/api'
import { LoadingState } from '../../components/Common'

function RouteMap({ from, to }) {
  useEffect(() => {
    if (!from || !to) return
    const mapId = 'driver-route-map'
    const init = () => {
      const L = window.L
      const container = document.getElementById(mapId)
      if (!container || container._leaflet_id) return
      const map = L.map(mapId, { zoomControl: false, attributionControl: false })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)
      const geocode = async (place) => {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place + ', India')}&format=json&limit=1`)
        const d = await r.json()
        return d[0] ? [parseFloat(d[0].lat), parseFloat(d[0].lon)] : null
      }
      Promise.all([geocode(from), geocode(to)]).then(([fc, tc]) => {
        if (!fc || !tc) return
        const mkIcon = (color) => L.divIcon({ html: `<div style="background:${color};width:11px;height:11px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`, iconSize: [11,11], iconAnchor: [5,5] })
        L.marker(fc, { icon: mkIcon('#16a34a') }).addTo(map).bindPopup(from)
        L.marker(tc, { icon: mkIcon('#dc2626') }).addTo(map).bindPopup(to)
        const line = L.polyline([fc, tc], { color: '#1d4ed8', weight: 3, dashArray: '6,5' }).addTo(map)
        map.fitBounds(line.getBounds(), { padding: [28, 28] })
      })
    }
    if (window.L) { init(); return }
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link'); link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }
    if (!document.querySelector('script[src*="leaflet"]')) {
      const s = document.createElement('script')
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      s.onload = init; document.head.appendChild(s)
    } else {
      const check = setInterval(() => { if (window.L) { clearInterval(check); init() } }, 100)
    }
  }, [from, to])
  return <div id="driver-route-map" style={{ height: '160px', borderRadius: '8px', overflow: 'hidden', background: '#f1f5f9' }} />
}

function ExpiryBadge({ expiryDate }) {
  if (!expiryDate) return <span style={{ fontSize: '0.72rem', fontWeight: 600, background: '#f1f5f9', color: '#64748b', padding: '3px 10px', borderRadius: 999 }}>Not uploaded</span>
  const days = Math.floor((new Date(expiryDate) - new Date()) / 86400000)
  if (days < 0)   return <span style={{ fontSize: '0.72rem', fontWeight: 600, background: '#fee2e2', color: '#dc2626', padding: '3px 10px', borderRadius: 999 }}>Expired</span>
  if (days <= 30) return <span style={{ fontSize: '0.72rem', fontWeight: 600, background: '#fef3c7', color: '#d97706', padding: '3px 10px', borderRadius: 999 }}>Expires in {days}d</span>
  return <span style={{ fontSize: '0.72rem', fontWeight: 600, background: '#dcfce7', color: '#16a34a', padding: '3px 10px', borderRadius: 999 }}>Valid</span>
}

const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }
const sectionTitle = { fontSize: '0.9rem', fontWeight: 700, color: '#111827', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }

export default function DriverDashboard() {
  const { user } = useAuth()
  const [profile, setProfile]     = useState(null)
  const [trips, setTrips]         = useState([])
  const [alerts, setAlerts]       = useState([])
  const [driverDocs, setDriverDocs] = useState([])
  const [vehicleDocs, setVehicleDocs] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    if (!user?.driverId) { setLoading(false); return }
    Promise.all([
      driverAPI.getById(user.driverId),
      tripAPI.getAll(),
      alertAPI.getAll({ is_read: false }),
      documentAPI.getAll({ driver_id: user.driverId }),
    ])
      .then(([p, t, a, dd]) => {
        const prof = p.data.data
        setProfile(prof)
        setTrips(t.data.data || [])
        setAlerts((a.data.data || []).slice(0, 4))
        setDriverDocs(dd.data.data || [])
        if (prof?.assigned_vehicle_id) {
          documentAPI.getAll({ vehicle_id: prof.assigned_vehicle_id })
            .then(vd => setVehicleDocs(vd.data.data || []))
            .catch(() => {})
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return <LoadingState label="Loading your dashboard…" />

  if (!user?.driverId) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
        <FileWarning size={36} style={{ marginBottom: 12, color: '#d97706' }} />
        <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 6 }}>No driver profile linked</div>
        <div style={{ fontSize: '0.85rem' }}>Contact your fleet manager to get set up.</div>
      </div>
    )
  }

  const today          = new Date().toDateString()
  const activeTrip     = trips.find(t => t.status === 'in_progress')
  const upcomingTrip   = !activeTrip ? trips.find(t => t.status === 'planned') : null
  const currentTrip    = activeTrip || upcomingTrip
  const todayTrips     = trips.filter(t => t.trip_date && new Date(t.trip_date).toDateString() === today)
  const completedToday = todayTrips.filter(t => t.status === 'completed').length
  const distanceToday  = todayTrips.filter(t => t.status === 'completed').reduce((s, t) => s + (parseFloat(t.distance_km) || 0), 0)
  const recentTrips    = trips.filter(t => t.status === 'completed').slice(0, 4)
  const vehicle        = profile?.assignedVehicle

  const findDoc     = (arr, ...types) => arr.find(d => types.some(tp => d.type?.toLowerCase().includes(tp)))
  const licenseDoc  = findDoc(driverDocs, 'license', 'licence')
  const rcDoc       = findDoc(vehicleDocs, 'rc', 'registration')
  const insuranceDoc = findDoc(vehicleDocs, 'insurance')

  const statCards = [
    { icon: Calendar,    color: '#3b82f6', bg: '#eff6ff', label: "Today's Trips",   value: todayTrips.length,                sub: 'Total assigned' },
    { icon: Play,        color: '#10b981', bg: '#f0fdf4', label: 'Active Trip',     value: activeTrip ? 1 : 0,              sub: activeTrip ? 'In Progress' : 'None active' },
    { icon: CheckCircle2,color: '#8b5cf6', bg: '#f5f3ff', label: 'Completed',       value: completedToday,                  sub: 'Today' },
    { icon: Navigation,  color: '#f59e0b', bg: '#fffbeb', label: 'Distance Today',  value: `${distanceToday.toFixed(0)} km`, sub: 'Total travelled' },
    { icon: TrendingUp,  color: '#10b981', bg: '#f0fdf4', label: 'Safety Score',    value: profile?.safety_score ?? '—',   sub: profile?.safety_level || 'Not calculated' },
  ]

  return (
    <div className="page">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#111827' }}>
            Welcome back, {user?.name?.split(' ')[0] || 'Driver'}! 👋
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: 4, marginBottom: 0 }}>
            Here's what's happening with your trips today.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#374151', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 14px' }}>
          <Calendar size={14} color="#6b7280" />
          {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }}>
        {statCards.map((s, i) => (
          <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.icon size={20} color={s.color} />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>{s.value}</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginTop: 2 }}>{s.label}</div>
              <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Current Trip + Vehicle */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Current Trip */}
        <div style={card}>
          <div style={{ ...sectionTitle, justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Route size={14} color="#3b82f6" />
              </div>
              Current Trip
            </span>
            {currentTrip && (
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: 999,
                background: activeTrip ? '#dbeafe' : '#fef3c7',
                color: activeTrip ? '#1d4ed8' : '#d97706' }}>
                {activeTrip ? '● In Progress' : '○ Planned'}
              </span>
            )}
          </div>

          {currentTrip ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['Trip ID', `TR${String(currentTrip.id).padStart(3,'0')}`],
                  ['Vehicle', currentTrip.vehicle?.registration_no || '—'],
                  ['From',    currentTrip.start_location || '—'],
                  ['To',      currentTrip.end_location   || '—'],
                  ['Start',   currentTrip.start_time || '—'],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', gap: 8, fontSize: '0.83rem', alignItems: 'flex-start' }}>
                    <span style={{ color: '#9ca3af', minWidth: 58, flexShrink: 0, paddingTop: 1 }}>{l}</span>
                    <span style={{ fontWeight: 600, color: '#111827' }}>{v}</span>
                  </div>
                ))}
                <Link to="/trips" style={{
                  marginTop: 6, textAlign: 'center', display: 'block', textDecoration: 'none',
                  padding: '9px 16px', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', color: '#fff',
                  background: activeTrip ? '#dc2626' : '#3b82f6',
                }}>
                  {activeTrip ? 'Complete Trip' : 'Start Trip'}
                </Link>
              </div>
              <RouteMap from={currentTrip.start_location} to={currentTrip.end_location} />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '36px 20px', color: '#9ca3af' }}>
              <div style={{ width: 56, height: 56, borderRadius: 12, background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Route size={24} color="#d1d5db" />
              </div>
              <div style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>No active trip</div>
              <div style={{ fontSize: '0.82rem' }}>Your fleet manager hasn't scheduled a trip yet</div>
            </div>
          )}
        </div>

        {/* Assigned Vehicle */}
        <div style={card}>
          <div style={sectionTitle}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={14} color="#3b82f6" />
            </div>
            Assigned Vehicle
          </div>
          {vehicle ? (
            <>
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 70 }}>
                <div style={{ textAlign: 'center' }}>
                  <Truck size={32} color="#94a3b8" />
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 6, fontWeight: 600 }}>{vehicle.make} {vehicle.model}</div>
                </div>
              </div>
              {[
                ['Registration', vehicle.registration_no],
                ['Fuel Type',   vehicle.fuel_type],
                ['Odometer',    vehicle.odometer_km ? `${Number(vehicle.odometer_km).toLocaleString()} km` : '—'],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f3f4f6', fontSize: '0.83rem' }}>
                  <span style={{ color: '#9ca3af' }}>{l}</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>{v || '—'}</span>
                </div>
              ))}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
              <div style={{ width: 56, height: 56, borderRadius: 12, background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Truck size={24} color="#d1d5db" />
              </div>
              <div style={{ fontWeight: 600, color: '#374151' }}>No vehicle assigned</div>
            </div>
          )}
        </div>
      </div>

      {/* Today's Assigned Trips */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={sectionTitle}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={14} color="#3b82f6" />
          </div>
          Today's Assigned Trips
        </div>
        {todayTrips.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px', color: '#9ca3af', fontSize: '0.85rem' }}>No trips scheduled for today</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderRadius: 8 }}>
                {['Trip ID','From','To','Vehicle','Status','Action'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {todayTrips.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                  <td style={{ padding: '11px 14px', fontFamily: 'monospace', color: '#3b82f6', fontWeight: 700 }}>TR{String(t.id).padStart(3,'0')}</td>
                  <td style={{ padding: '11px 14px', color: '#374151' }}>{t.start_location || '—'}</td>
                  <td style={{ padding: '11px 14px', color: '#374151' }}>{t.end_location || '—'}</td>
                  <td style={{ padding: '11px 14px', fontFamily: 'monospace', color: '#6b7280' }}>{t.vehicle?.registration_no || '—'}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: 999, fontWeight: 700,
                      background: t.status === 'in_progress' ? '#dbeafe' : t.status === 'completed' ? '#dcfce7' : '#f3f4f6',
                      color: t.status === 'in_progress' ? '#1d4ed8' : t.status === 'completed' ? '#16a34a' : '#6b7280',
                    }}>{t.status === 'in_progress' ? 'In Progress' : t.status === 'completed' ? 'Completed' : 'Planned'}</span>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <Link to="/trips" style={{ fontSize: '0.78rem', padding: '5px 14px', borderRadius: 6, fontWeight: 700, textDecoration: 'none',
                      background: t.status === 'planned' ? '#16a34a' : t.status === 'in_progress' ? '#3b82f6' : '#f3f4f6',
                      color: t.status === 'completed' ? '#6b7280' : '#fff',
                    }}>
                      {t.status === 'planned' ? 'Start' : t.status === 'in_progress' ? 'View' : 'Done'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Bottom row: Recent Trips | Notifications | Documents */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

        {/* Recent Trips */}
        <div style={card}>
          <div style={{ ...sectionTitle, justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={14} color="#3b82f6" />
              </div>
              Recent Trips
            </span>
            <Link to="/trip-history" style={{ fontSize: '0.75rem', color: '#3b82f6', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
              View All <ArrowRight size={12} />
            </Link>
          </div>
          {recentTrips.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px', color: '#9ca3af', fontSize: '0.82rem' }}>No completed trips yet</div>
          ) : recentTrips.map(t => (
            <div key={t.id} style={{ padding: '10px 0', borderBottom: '1px solid #f9fafb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#3b82f6', fontWeight: 700 }}>TR{String(t.id).padStart(3,'0')}</span>
                <span style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>Done</span>
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#374151' }}>{t.start_location || '—'} → {t.end_location || '—'}</div>
              {t.distance_km && <div style={{ fontSize: '0.74rem', color: '#9ca3af', marginTop: 2 }}>{parseFloat(t.distance_km).toFixed(1)} km</div>}
            </div>
          ))}
        </div>

        {/* Notifications */}
        <div style={card}>
          <div style={{ ...sectionTitle, justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bell size={14} color="#3b82f6" />
              </div>
              Notifications
            </span>
            <Link to="/alerts" style={{ fontSize: '0.75rem', color: '#3b82f6', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
              View All <ArrowRight size={12} />
            </Link>
          </div>
          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px', color: '#9ca3af', fontSize: '0.82rem' }}>No new notifications</div>
          ) : alerts.map(a => (
            <div key={a.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid #f9fafb', alignItems: 'flex-start' }}>
              <div style={{ width: 30, height: 30, borderRadius: 6, flexShrink: 0,
                background: a.severity === 'high' || a.severity === 'critical' ? '#fee2e2' : a.severity === 'medium' ? '#fef3c7' : '#eff6ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={13} color={a.severity === 'high' || a.severity === 'critical' ? '#dc2626' : a.severity === 'medium' ? '#d97706' : '#3b82f6'} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827', marginBottom: 2 }}>{a.title}</div>
                <div style={{ fontSize: '0.74rem', color: '#9ca3af', lineHeight: 1.4 }}>{a.message?.slice(0, 70)}{a.message?.length > 70 ? '…' : ''}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Documents */}
        <div style={card}>
          <div style={{ ...sectionTitle, justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={14} color="#3b82f6" />
              </div>
              Vehicle Documents
            </span>
          </div>
          {[
            ['Registration Certificate (RC)', rcDoc],
            ['Insurance',                     insuranceDoc],
            ['Driver License',                licenseDoc],
          ].map(([name, doc]) => (
            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f9fafb' }}>
              <span style={{ fontSize: '0.82rem', color: '#374151' }}>{name}</span>
              <ExpiryBadge expiryDate={doc?.expiry_date} />
            </div>
          ))}
          <Link to="/documents" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 12, fontSize: '0.8rem', color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>
            View All <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  )
}