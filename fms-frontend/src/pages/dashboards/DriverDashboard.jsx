import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Truck, Play, CheckCircle2, MapPin, Calendar, Bell,
  Navigation, FileText, AlertTriangle, Activity, Route,
  ChevronRight, Wrench, Car, ShieldAlert, FileWarning, Zap
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { driverAPI, tripAPI, alertAPI, documentAPI } from '../../services/api'
import { LoadingState } from '../../components/Common'

// ── Leaflet map: draws a dashed route line between two text locations ──
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
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }
    if (!document.querySelector('script[src*="leaflet"]')) {
      const s = document.createElement('script')
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      s.onload = init
      document.head.appendChild(s)
    } else {
      const check = setInterval(() => { if (window.L) { clearInterval(check); init() } }, 100)
    }
  }, [from, to])

  return <div id="driver-route-map" style={{ height: '170px', borderRadius: '10px', overflow: 'hidden', background: '#f1f5f9' }} />
}

// ── Expiry status badge ──
function ExpiryBadge({ expiryDate }) {
  if (!expiryDate) return <span style={badge('#f1f5f9','#64748b')}>Not uploaded</span>
  const days = Math.floor((new Date(expiryDate) - new Date()) / 86400000)
  if (days < 0)   return <span style={badge('#fee2e2','#dc2626')}>Expired</span>
  if (days <= 15) return <span style={badge('#fef3c7','#d97706')}>Expires in {days}d</span>
  if (days <= 30) return <span style={badge('#fef3c7','#d97706')}>Expires in {days}d</span>
  return <span style={badge('#dcfce7','#16a34a')}>✓ Valid</span>
}
function badge(bg, color) {
  return { fontSize: '0.72rem', fontWeight: 600, background: bg, color, padding: '3px 10px', borderRadius: '999px' }
}

const CARD = {
  background: 'var(--bg-surface)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)', padding: '18px', boxShadow: '0 1px 4px rgba(0,0,0,.05)',
}
const STITLE = {
  fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)',
  marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '7px',
}

export default function DriverDashboard() {
  const { user } = useAuth()
  const [profile,   setProfile]   = useState(null)
  const [trips,     setTrips]     = useState([])
  const [alerts,    setAlerts]    = useState([])
  const [driverDocs, setDriverDocs] = useState([])
  const [vehicleDocs, setVehicleDocs] = useState([])
  const [loading,   setLoading]   = useState(true)

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
        // fetch vehicle docs if driver has assigned vehicle
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
        <FileWarning size={36} style={{ marginBottom: '12px', color: '#d97706' }} />
        <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '6px' }}>No driver profile linked</div>
        <div style={{ fontSize: '0.85rem' }}>Contact your fleet manager to get set up.</div>
      </div>
    )
  }

  const today         = new Date().toDateString()
  const activeTrip    = trips.find(t => t.status === 'in_progress')
  const upcomingTrip  = !activeTrip ? trips.find(t => t.status === 'planned') : null
  const currentTrip   = activeTrip || upcomingTrip
  const todayTrips    = trips.filter(t => t.trip_date && new Date(t.trip_date).toDateString() === today)
  const completedToday = todayTrips.filter(t => t.status === 'completed').length
  const distanceToday  = todayTrips.filter(t => t.status === 'completed').reduce((s, t) => s + (parseFloat(t.distance_km) || 0), 0)
  const recentTrips   = trips.filter(t => t.status === 'completed').slice(0, 3)
  const vehicle       = profile?.assignedVehicle

  const findDoc  = (arr, ...types) => arr.find(d => types.some(tp => d.type?.toLowerCase().includes(tp)))
  const licenseDoc  = findDoc(driverDocs, 'license', 'licence')
  const aadhaarDoc  = findDoc(driverDocs, 'aadhaar', 'aadhar')
  const medicalDoc  = findDoc(driverDocs, 'medical')
  const rcDoc        = findDoc(vehicleDocs, 'rc', 'registration')
  const insuranceDoc = findDoc(vehicleDocs, 'insurance')

  const REPORT_ISSUES = [
    { icon: <Zap size={16} />,         label: 'Tyre Puncture' },
    { icon: <Wrench size={16} />,      label: 'Engine Issue' },
    { icon: <ShieldAlert size={16} />, label: 'Brake Failure' },
    { icon: <Car size={16} />,         label: 'Accident' },
    { icon: <AlertTriangle size={16} />, label: 'Other Issue' },
  ]

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
            Welcome back, {user?.name?.split(' ')[0] || 'Driver'}! 👋
          </h1>
          <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '4px' }}>
            Here's what's happening with your trips today.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#6b7280', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 14px' }}>
          <Calendar size={14} />
          {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '20px' }}>
        {[
          { icon: <Calendar size={22} />,     color: '#1d4ed8', bg: '#dbeafe', label: "Today's Trips",   value: todayTrips.length,                sub: 'Total assigned' },
          { icon: <Play size={22} />,          color: '#16a34a', bg: '#dcfce7', label: 'Active Trip',    value: activeTrip ? 1 : 0,              sub: activeTrip ? 'In Progress' : 'None active' },
          { icon: <CheckCircle2 size={22} />,  color: '#7c3aed', bg: '#ede9fe', label: 'Completed Trips', value: completedToday,                   sub: 'Today' },
          { icon: <Navigation size={22} />,    color: '#d97706', bg: '#fef3c7', label: 'Distance Today',  value: `${distanceToday.toFixed(0)} km`, sub: 'Total travelled' },
          { icon: <Activity size={22} />,      color: '#16a34a', bg: '#dcfce7', label: 'Safety Score',   value: profile?.safety_score ?? '—',    sub: profile?.safety_level || 'Not calculated' },
        ].map((s, i) => (
          <div key={i} style={{ ...CARD, display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{s.value}</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{s.label}</div>
              <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Current Trip + Assigned Vehicle ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px', marginBottom: '16px' }}>

        <div style={CARD}>
          <div style={{ ...STITLE, justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}><Route size={15} color="#1d4ed8" /> Current Trip</span>
            {currentTrip && (
              <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: '999px',
                background: activeTrip ? '#dbeafe' : '#fef3c7',
                color:      activeTrip ? '#1d4ed8' : '#d97706' }}>
                {activeTrip ? 'In Progress' : 'Planned'}
              </span>
            )}
          </div>

          {currentTrip ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {[
                  ['Trip ID',   `TR${String(currentTrip.id).padStart(3,'0')}`],
                  ['Vehicle',   currentTrip.vehicle?.registration_no || '—'],
                  ['From',      currentTrip.start_location || '—'],
                  ['To',        currentTrip.end_location   || '—'],
                  ['Start',     currentTrip.start_time || (currentTrip.actual_start_time ? new Date(currentTrip.actual_start_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—')],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', gap: '8px', fontSize: '0.83rem' }}>
                    <span style={{ color: '#9ca3af', minWidth: '60px', flexShrink: 0 }}>{l}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v}</span>
                  </div>
                ))}
                <Link to="/trips" style={{ marginTop: '6px', background: activeTrip ? '#dc2626' : '#1d4ed8', color: '#fff', borderRadius: '8px', padding: '9px 16px', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none', textAlign: 'center', display: 'block' }}>
                  {activeTrip ? 'Complete Trip' : 'Start Trip'}
                </Link>
              </div>
              <RouteMap from={currentTrip.start_location} to={currentTrip.end_location} />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: '#9ca3af' }}>
              <Route size={32} style={{ opacity: 0.25, marginBottom: '10px' }} />
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>No active trip</div>
              <div style={{ fontSize: '0.82rem' }}>Your fleet manager hasn't scheduled a trip yet</div>
            </div>
          )}
        </div>

        <div style={CARD}>
          <div style={STITLE}><Truck size={15} color="#1d4ed8" /> Assigned Vehicle</div>
          {vehicle ? (
            <>
              <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '16px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80px' }}>
                <div style={{ textAlign: 'center' }}>
                  <Truck size={38} color="#94a3b8" />
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px', fontWeight: 600 }}>{vehicle.make} {vehicle.model}</div>
                </div>
              </div>
              {[
                ['Registration No.', vehicle.registration_no],
                ['Model',            `${vehicle.make || ''} ${vehicle.model || ''}`],
                ['Fuel Type',        vehicle.fuel_type],
                ['Odometer',         vehicle.odometer_km ? `${Number(vehicle.odometer_km).toLocaleString()} km` : '—'],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.83rem' }}>
                  <span style={{ color: '#9ca3af' }}>{l}</span>
                  <span style={{ fontWeight: 600 }}>{v || '—'}</span>
                </div>
              ))}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
              <Truck size={32} style={{ opacity: 0.25, marginBottom: '10px' }} />
              <div style={{ fontWeight: 600 }}>No vehicle assigned</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Today's Assigned Trips ── */}
      <div style={{ ...CARD, marginBottom: '16px' }}>
        <div style={STITLE}><Calendar size={15} color="#1d4ed8" /> Today's Assigned Trips</div>
        {todayTrips.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af', fontSize: '0.85rem' }}>No trips scheduled for today</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Trip ID','From','To','Vehicle','Time','Status','Action'].map(h => (
                  <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {todayTrips.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#1d4ed8', fontWeight: 600 }}>TR{String(t.id).padStart(3,'0')}</td>
                  <td style={{ padding: '10px 12px' }}>{t.start_location || '—'}</td>
                  <td style={{ padding: '10px 12px' }}>{t.end_location   || '—'}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{t.vehicle?.registration_no || '—'}</td>
                  <td style={{ padding: '10px 12px', color: '#64748b' }}>{t.start_time || '—'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: '999px', fontWeight: 600,
                      background: t.status === 'in_progress' ? '#dbeafe' : t.status === 'completed' ? '#dcfce7' : '#f1f5f9',
                      color:      t.status === 'in_progress' ? '#1d4ed8' : t.status === 'completed' ? '#16a34a' : '#64748b',
                    }}>{t.status === 'in_progress' ? 'In Progress' : t.status === 'completed' ? 'Completed' : 'Planned'}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <Link to="/trips" style={{ fontSize: '0.78rem', padding: '5px 14px', borderRadius: '6px', fontWeight: 600, textDecoration: 'none',
                      background: t.status === 'planned' ? '#16a34a' : t.status === 'in_progress' ? '#1d4ed8' : '#f1f5f9',
                      color: t.status === 'completed' ? '#64748b' : '#fff',
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

      {/* ── Recent Trips + Notifications + Vehicle Documents ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* Recent Trips */}
        <div style={CARD}>
          <div style={{ ...STITLE, justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}><Activity size={15} color="#1d4ed8" /> Recent Trips</span>
            <Link to="/trips" style={{ fontSize: '0.75rem', color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 }}>View All</Link>
          </div>
          {recentTrips.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af', fontSize: '0.82rem' }}>No completed trips yet</div>
          ) : recentTrips.map(t => (
            <div key={t.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#1d4ed8', fontWeight: 600 }}>TR{String(t.id).padStart(3,'0')}</span>
                <span style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>Completed</span>
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{t.start_location || '—'} → {t.end_location || '—'}</div>
              {t.distance_km && <div style={{ fontSize: '0.74rem', color: '#9ca3af', marginTop: '2px' }}>{t.distance_km.toFixed(1)} km · {t.trip_date || ''}</div>}
            </div>
          ))}
        </div>

        {/* Notifications */}
        <div style={CARD}>
          <div style={{ ...STITLE, justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}><Bell size={15} color="#1d4ed8" /> Notifications</span>
            <Link to="/alerts" style={{ fontSize: '0.75rem', color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 }}>View All</Link>
          </div>
          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af', fontSize: '0.82rem' }}>No new notifications</div>
          ) : alerts.map(a => (
            <div key={a.id} style={{ display: 'flex', gap: '10px', padding: '10px 0', borderBottom: '1px solid #f1f5f9', alignItems: 'flex-start' }}>
              <div style={{ marginTop: '2px', flexShrink: 0 }}>
                {a.severity === 'high' || a.severity === 'critical'
                  ? <AlertTriangle size={14} color="#dc2626" />
                  : a.severity === 'medium'
                  ? <AlertTriangle size={14} color="#d97706" />
                  : <Bell size={14} color="#1d4ed8" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: '2px' }}>{a.title}</div>
                <div style={{ fontSize: '0.74rem', color: '#9ca3af', lineHeight: 1.4 }}>{a.message?.slice(0, 70)}{a.message?.length > 70 ? '…' : ''}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Vehicle Documents */}
        <div style={CARD}>
          <div style={STITLE}><FileText size={15} color="#1d4ed8" /> Vehicle Documents</div>
          {[
            ['Registration Certificate (RC)', rcDoc],
            ['Insurance',                     insuranceDoc],
          ].map(([name, doc]) => (
            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{name}</span>
              <ExpiryBadge expiryDate={doc?.expiry_date} />
            </div>
          ))}
          <Link to="/documents" style={{ display: 'block', textAlign: 'center', marginTop: '10px', fontSize: '0.8rem', color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 }}>
            View All →
          </Link>
        </div>
      </div>



    </div>
  )
}