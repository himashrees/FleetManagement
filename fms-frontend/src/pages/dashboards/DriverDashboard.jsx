import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Truck, Play, CheckCircle2, MapPin, Calendar, Bell,
  Navigation, FileText, AlertTriangle, Activity, Route,
  Wrench, Car, ShieldAlert, FileWarning, Zap, Clock,
  ArrowRight, TrendingUp, RefreshCw
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { driverAPI, tripAPI, alertAPI, documentAPI } from '../../services/api'
import { LoadingState, KpiCards } from '../../components/Common'

/* KPI color palette (matches Vehicles page glow cards) */
const DRIVER_KPI_PALETTE = {
  green:  { accent: '#10b981', bg: '#f0fdf4', border: '#bbf7d0', glow: 'rgba(16,185,129,0.20)' },
  purple: { accent: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe', glow: 'rgba(139,92,246,0.20)' },
  amber:  { accent: '#f59e0b', bg: '#fffbeb', border: '#fde68a', glow: 'rgba(245,158,11,0.20)' },
}

function RouteMap({ from, to, height = '100%' }) {
  useEffect(() => {
    if (!from || !to) return
    const mapId = 'driver-route-map'

    // Clean up any existing Leaflet instance so refresh works
    const existing = document.getElementById(mapId)
    if (existing && existing._leaflet_id) {
      existing._leaflet_id = null
      existing.innerHTML = ''
    }

    const init = () => {
      const L = window.L
      const container = document.getElementById(mapId)
      if (!container) return

      const map = L.map(mapId, { zoomControl: true, attributionControl: false, scrollWheelZoom: true, doubleClickZoom: true, touchZoom: true, zoomSnap: 0.5 })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)

      // Leaflet measures its container size once on init. Since this map sits in a
      // flex/grid card whose size can settle after that (fonts loading, sidebar
      // collapse, etc.), keep it in sync so tiles always cover the full box.
      setTimeout(() => map.invalidateSize(), 0)
      setTimeout(() => map.invalidateSize(), 300)
      const resizeObserver = new ResizeObserver(() => {
        map.invalidateSize()
        if (map._routeBounds) map.fitBounds(map._routeBounds, { paddingTopLeft: [56, 40], paddingBottomRight: [36, 36] })
      })
      resizeObserver.observe(container)
      map._sizeObserver = resizeObserver

      const geocode = async (place) => {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place + ', India')}&format=json&limit=1`)
        const d = await r.json()
        return d[0] ? [parseFloat(d[0].lat), parseFloat(d[0].lon)] : null
      }

      const mkIcon = (color, label) => L.divIcon({
        html: `<div style="background:${color};color:#fff;font-size:10px;font-weight:800;width:24px;height:24px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center">${label}</div>`,
        iconSize: [24,24], iconAnchor: [12,12]
      })

      const driverIcon = L.divIcon({
        html: `<div style="position:relative;width:20px;height:20px">
          <div style="position:absolute;inset:0;background:#3b82f6;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(59,130,246,.6)"></div>
          <div style="position:absolute;inset:-6px;background:rgba(59,130,246,.25);border-radius:50%;animation:pulse 1.5s infinite"></div>
        </div>`,
        iconSize: [20,20], iconAnchor: [10,10]
      })

      // Add pulse keyframes once
      if (!document.getElementById('map-pulse-style')) {
        const style = document.createElement('style')
        style.id = 'map-pulse-style'
        style.textContent = '@keyframes pulse{0%,100%{transform:scale(1);opacity:.6}50%{transform:scale(1.6);opacity:0}}'
        document.head.appendChild(style)
      }

      // Clicking a marker zooms in close on that point
      const zoomToPoint = (coord) => map.flyTo(coord, 15, { duration: 0.6 })

      geocode(to).then(async (destCoord) => {
        if (!destCoord) return
        const destMarker = L.marker(destCoord, { icon: mkIcon('#dc2626','B') }).addTo(map)
        destMarker.bindPopup(`<b>Destination:</b> ${to}`)
        destMarker.on('click', () => zoomToPoint(destCoord))

        const drawRoute = (fromCoord) => {
          // Remove old route layers
          map.eachLayer(l => { if (l._isRoute) map.removeLayer(l) })

          const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${fromCoord[1]},${fromCoord[0]};${destCoord[1]},${destCoord[0]}?overview=full&geometries=geojson`
          fetch(osrmUrl)
            .then(r => r.json())
            .then(data => {
              if (data.routes?.[0]?.geometry) {
                const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])
                const line = L.polyline(coords, { color: '#1d4ed8', weight: 5, opacity: 0.9 })
                line._isRoute = true
                line.addTo(map)
                map._routeBounds = line.getBounds()
                map.fitBounds(map._routeBounds, { paddingTopLeft: [56, 40], paddingBottomRight: [36, 36] })

                const dist = (data.routes[0].distance / 1000).toFixed(1)
                const mins = Math.round(data.routes[0].duration / 60)
                const hrs = Math.floor(mins / 60); const rem = mins % 60
                const eta = hrs > 0 ? `${hrs}h ${rem}m` : `${mins}m`

                // Remove old info control
                if (map._infoCtrl) map.removeControl(map._infoCtrl)
                const info = L.control({ position: 'bottomleft' })
                info.onAdd = () => {
                  const d = L.DomUtil.create('div')
                  d.innerHTML = `<div style="background:#1d4ed8;color:#fff;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,.25);display:flex;gap:8px;align-items:center">
                    <span>📍 ${dist} km</span><span>⏱ ${eta}</span>
                  </div>`
                  return d
                }
                info.addTo(map)
                map._infoCtrl = info
              }
            }).catch(() => {})
        }

        // Try live geolocation first
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const driverCoord = [pos.coords.latitude, pos.coords.longitude]
              const driverMarker = L.marker(driverCoord, { icon: driverIcon }).addTo(map)
              driverMarker.bindPopup('📍 Your location')
              driverMarker.on('click', () => zoomToPoint(driverCoord))
              L.marker(destCoord, { icon: mkIcon('#dc2626','B') }) // already added above
              drawRoute(driverCoord)

              // Update driver position every 10s
              const watchId = navigator.geolocation.watchPosition((p) => {
                const c = [p.coords.latitude, p.coords.longitude]
                driverMarker.setLatLng(c)
                driverMarker.off('click').on('click', () => zoomToPoint(c))
                drawRoute(c)
              }, () => {}, { enableHighAccuracy: true, maximumAge: 10000 })
              map._watchId = watchId
            },
            () => {
              // Geolocation denied — fall back to origin city geocode
              geocode(from).then(fromCoord => {
                if (!fromCoord) return
                const fromMarker = L.marker(fromCoord, { icon: mkIcon('#16a34a','A') }).addTo(map).bindPopup(`<b>From:</b> ${from}`)
                fromMarker.on('click', () => zoomToPoint(fromCoord))
                drawRoute(fromCoord)
              })
            },
            { enableHighAccuracy: true, timeout: 5000 }
          )
        } else {
          geocode(from).then(fromCoord => {
            if (!fromCoord) return
            const fromMarker = L.marker(fromCoord, { icon: mkIcon('#16a34a','A') }).addTo(map).bindPopup(`<b>From:</b> ${from}`)
            fromMarker.on('click', () => zoomToPoint(fromCoord))
            drawRoute(fromCoord)
          })
        }
      })

      // Cleanup on unmount
      return () => {
        if (map._watchId != null) navigator.geolocation.clearWatch(map._watchId)
        if (map._sizeObserver) map._sizeObserver.disconnect()
        map.remove()
      }
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

  return <div id="driver-route-map" style={{ height, minHeight: '260px', borderRadius: '8px', overflow: 'hidden', background: '#f1f5f9' }} />
}

function ExpiryBadge({ expiryDate }) {
  if (!expiryDate) return <span style={{ fontSize: '0.72rem', fontWeight: 600, background: '#f1f5f9', color: '#64748b', padding: '3px 10px', borderRadius: 999 }}>Not uploaded</span>
  const days = Math.floor((new Date(expiryDate) - new Date()) / 86400000)
  if (days < 0)   return <span style={{ fontSize: '0.72rem', fontWeight: 600, background: '#fee2e2', color: '#dc2626', padding: '3px 10px', borderRadius: 999 }}>Expired</span>
  if (days <= 30) return <span style={{ fontSize: '0.72rem', fontWeight: 600, background: '#fef3c7', color: '#d97706', padding: '3px 10px', borderRadius: 999 }}>Expires in {days}d</span>
  return <span style={{ fontSize: '0.72rem', fontWeight: 600, background: '#dcfce7', color: '#16a34a', padding: '3px 10px', borderRadius: 999 }}>Valid</span>
}

const card = { background: '#fff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 20 }

/* CSS for the "moving" glow on the cards below the KPI row (className added alongside `card` style) */
const DRIVER_CARD_CSS = `
  @keyframes driver-card-float {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-4px); }
  }
  .driver-card {
    animation: driver-card-float 6s ease-in-out infinite;
    transition: box-shadow 0.25s ease;
    box-shadow: 0 0 14px 0px rgba(29,78,216,0.16), 0 1px 3px rgba(15,23,42,0.04);
  }
  .driver-card:hover {
    box-shadow: 0 0 24px 2px rgba(29,78,216,0.28), 0 8px 20px rgba(15,23,42,0.08);
  }
`
const sectionTitle = { fontSize: '0.9rem', fontWeight: 700, color: '#111827', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }

export default function DriverDashboard() {
  const { user } = useAuth()
  const [profile, setProfile]     = useState(null)
  const [trips, setTrips]         = useState([])
  const [alerts, setAlerts]       = useState([])
  const [driverDocs, setDriverDocs] = useState([])
  const [vehicleDocs, setVehicleDocs] = useState([])
  const [loading, setLoading]     = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [spinning, setSpinning]   = useState(false)

  const handleRefresh = () => {
    setSpinning(true)
    setTimeout(() => setSpinning(false), 800)
    setRefreshKey(k => k + 1)
  }

  useEffect(() => {
    if (!user?.driverId) { setLoading(false); return }
    setLoading(true)
    Promise.all([
      driverAPI.getById(user.driverId),
      tripAPI.getAll({ driver_id: user.driverId }),
      alertAPI.getAll({ is_read: false }),
      documentAPI.getAll({ driver_id: user.driverId }),
    ])
      .then(([p, t, a, dd]) => {
        const prof = p.data.data
        const allTrips = t.data.data || []
        setProfile(prof)
        setTrips(allTrips)
        setAlerts((a.data.data || []).slice(0, 4))
        setDriverDocs(dd.data.data || [])
        // vehicle id: prefer driver profile, fall back to active/latest trip vehicle
        const activeT = allTrips.find(tr => tr.status === 'in_progress')
        const vehicleId = prof?.assigned_vehicle_id
          || activeT?.vehicle_id
          || allTrips[0]?.vehicle_id
        if (vehicleId) {
          documentAPI.getAll({ vehicle_id: vehicleId })
            .then(vd => setVehicleDocs(vd.data.data || []))
            .catch(() => {})
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user, refreshKey])

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
  const upcomingTrip   = !activeTrip ? trips.find(t => t.status === 'planned' || t.status === 'scheduled') : null
  const currentTrip    = activeTrip || upcomingTrip
  // Trip model has start_time, not trip_date
  const todayTrips     = trips.filter(t => {
    const d = t.start_time || t.reporting_time || t.createdAt
    return d && new Date(d).toDateString() === today
  })
  const completedToday = todayTrips.filter(t => t.status === 'completed').length
  const distanceToday  = todayTrips.filter(t => t.status === 'completed').reduce((s, t) => s + (parseFloat(t.distance_km) || 0), 0)
  const recentTrips    = trips.filter(t => t.status === 'completed').slice(0, 4)
  // vehicle: from profile or fall back to active trip's vehicle object
  const vehicle        = profile?.assignedVehicle || activeTrip?.vehicle || upcomingTrip?.vehicle

  const findDoc     = (arr, ...types) => arr.find(d => types.some(tp => d.type?.toLowerCase().includes(tp)))
  const licenseDoc  = findDoc(driverDocs, 'license', 'licence')
  const rcDoc       = findDoc(vehicleDocs, 'rc', 'registration')
  const insuranceDoc = findDoc(vehicleDocs, 'insurance')

  const statCards = [
    { Icon: Play,         label: 'Active Trip',    value: activeTrip ? 1 : 0,               sub: activeTrip ? 'In Progress' : 'None active', ...DRIVER_KPI_PALETTE.green },
    { Icon: CheckCircle2, label: 'Completed',      value: completedToday,                    sub: 'Today',                                     ...DRIVER_KPI_PALETTE.purple },
    { Icon: Navigation,   label: 'Distance Today', value: `${distanceToday.toFixed(0)} km`,  sub: 'Total travelled',                           ...DRIVER_KPI_PALETTE.amber },
    { Icon: TrendingUp,   label: 'Safety Score',   value: profile?.safety_score ?? '—',      sub: profile?.safety_level || 'Not calculated',   ...DRIVER_KPI_PALETTE.green },
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
        <button onClick={handleRefresh} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#374151', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>
          <RefreshCw size={14} color="#6b7280" style={{ transition: 'transform 0.8s', transform: spinning ? 'rotate(360deg)' : 'rotate(0deg)' }} />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <KpiCards columns={4} stats={statCards} />
      <style>{DRIVER_CARD_CSS}</style>

      {/* Current Trip + Vehicle */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Current Trip */}
        <div className="driver-card" style={{ ...card, display: 'flex', flexDirection: 'column', animationDelay: '0s' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '0.7fr 1.3fr', gap: 16, flexGrow: 1, minHeight: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['Trip ID', `TR${String(currentTrip.id).padStart(3,'0')}`],
                  ['Vehicle', currentTrip.vehicle?.registration_no || '—'],
                  ['From',    currentTrip.start_location || '—'],
                  ['To',      currentTrip.end_location   || '—'],
                  ['Start',   currentTrip.start_time ? new Date(currentTrip.start_time).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : '—'],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', gap: 8, fontSize: '0.83rem', alignItems: 'flex-start' }}>
                    <span style={{ color: '#9ca3af', minWidth: 58, flexShrink: 0, paddingTop: 1 }}>{l}</span>
                    <span style={{ fontWeight: 600, color: '#111827' }}>{v}</span>
                  </div>
                ))}
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
        <div className="driver-card" style={{ ...card, animationDelay: '0.15s' }}>
          <div style={sectionTitle}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={14} color="#3b82f6" />
            </div>
            Assigned Vehicle
          </div>
          {vehicle ? (
            <>
              {/* Vehicle photo or styled illustration */}
              {vehicle.photo_url ? (
                <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 14, height: 160, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img
                    src={vehicle.photo_url}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    onError={e => { e.target.style.display='none'; e.target.parentNode.style.display='none' }}
                  />
                </div>
              ) : (
                <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)', borderRadius: 10, padding: '18px 16px', marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
                  <div style={{ position: 'absolute', bottom: -30, left: -10, width: 80, height: 80, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 52, height: 52, background: 'rgba(255,255,255,0.15)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {vehicle.type === 'truck' ? <Truck size={26} color="#fff" /> :
                       vehicle.type === 'bus'   ? <Truck size={26} color="#fff" /> :
                       vehicle.type === 'bike'  ? <Zap size={26} color="#fff" /> :
                                                  <Car size={26} color="#fff" />}
                    </div>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem', lineHeight: 1.2 }}>{vehicle.make} {vehicle.model}</div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', marginTop: 3 }}>
                        {vehicle.type ? vehicle.type.charAt(0).toUpperCase() + vehicle.type.slice(1) : 'Vehicle'}
                        {vehicle.fuel_type ? ` · ${vehicle.fuel_type.charAt(0).toUpperCase() + vehicle.fuel_type.slice(1)}` : ''}
                      </div>
                      <div style={{ marginTop: 6 }}>
                        <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999, fontFamily: 'monospace' }}>
                          {vehicle.registration_no}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Always show make/model + reg below photo */}
              {vehicle.photo_url && (
                <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>{vehicle.make} {vehicle.model}</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 2, fontFamily: 'monospace' }}>{vehicle.registration_no}</div>
                </div>
              )}
              {[
                ['Odometer', vehicle.odometer_km ? `${Number(vehicle.odometer_km).toLocaleString()} km` : '—'],
                ['Fuel',     vehicle.fuel_type ? vehicle.fuel_type.charAt(0).toUpperCase() + vehicle.fuel_type.slice(1) : '—'],
                ['Type',     vehicle.type ? vehicle.type.charAt(0).toUpperCase() + vehicle.type.slice(1) : '—'],
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
      <div className="driver-card" style={{ ...card, marginBottom: 16, animationDelay: '0.3s' }}>
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
                    <Link to="/my-trips" style={{ fontSize: '0.78rem', padding: '5px 14px', borderRadius: 6, fontWeight: 700, textDecoration: 'none',
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
        <div className="driver-card" style={{ ...card, animationDelay: '0.45s' }}>
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
        <div className="driver-card" style={{ ...card, animationDelay: '0.6s' }}>
          <div style={{ ...sectionTitle, justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bell size={14} color="#3b82f6" />
              </div>
              Notifications
            </span>
            {alerts.length > 0 && (
              <span style={{ fontSize: '0.72rem', background: '#fee2e2', color: '#dc2626', padding: '3px 9px', borderRadius: 999, fontWeight: 700 }}>
                {alerts.length} unread
              </span>
            )}
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
        <div className="driver-card" style={{ ...card, animationDelay: '0.75s' }}>
          <div style={{ ...sectionTitle, justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={14} color="#3b82f6" />
              </div>
              Vehicle Documents
            </span>
          </div>
          {(() => {
            const docs = [
              ['Registration Certificate (RC)', rcDoc],
              ['Insurance',                     insuranceDoc],
              ['Driver License',                licenseDoc],
            ].filter(([, doc]) => !!doc)
            return docs.length === 0
              ? <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af', fontSize: '0.82rem' }}>No documents uploaded yet</div>
              : docs.map(([name, doc]) => (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f9fafb' }}>
                  <span style={{ fontSize: '0.82rem', color: '#374151' }}>{name}</span>
                  <ExpiryBadge expiryDate={doc?.expiry_date} />
                </div>
              ))
          })()}
          <Link to="/documents" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 12, fontSize: '0.8rem', color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>
            View All <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  )
}