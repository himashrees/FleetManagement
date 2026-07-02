// import { useState, useEffect, useRef } from 'react'
// import { MapPin, RefreshCw, Navigation, Activity, Zap, Map } from 'lucide-react'
// import { gpsAPI, vehicleAPI } from '../services/api'
// import { useToast } from '../context/ToastContext'
// import Modal from '../components/Modal'
// import { LoadingState, EmptyState, PageHeader } from '../components/Common'

// // Leaflet loaded via CDN — no npm install needed
// let L = null

// export default function GpsTracking() {
//   const [positions, setPositions] = useState([])
//   const [vehicles, setVehicles] = useState([])
//   const [loading, setLoading] = useState(true)
//   const [selected, setSelected] = useState(null)
//   const [history, setHistory] = useState([])
//   const [historyLoading, setHistoryLoading] = useState(false)
//   const [pushForm, setPushForm] = useState({ vehicle_id: '', latitude: '', longitude: '', speed_kmh: '' })
//   const [showPush, setShowPush] = useState(false)
//   const [autoRefresh, setAutoRefresh] = useState(false)
//   const [mapReady, setMapReady] = useState(false)
//   const toast = useToast()
//   const intervalRef = useRef(null)
//   const mapRef = useRef(null)
//   const mapInstanceRef = useRef(null)
//   const markersRef = useRef({})
//   const routeLineRef = useRef(null)

//   // Load Leaflet dynamically
//   useEffect(() => {
//     if (window.L) { L = window.L; setMapReady(true); return }
//     const link = document.createElement('link')
//     link.rel = 'stylesheet'
//     link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
//     document.head.appendChild(link)
//     const script = document.createElement('script')
//     script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
//     script.onload = () => { L = window.L; setMapReady(true) }
//     document.head.appendChild(script)
//   }, [])

//   // Init map once Leaflet ready
//   useEffect(() => {
//     if (!mapReady || !mapRef.current || mapInstanceRef.current) return
//     mapInstanceRef.current = L.map(mapRef.current, { zoomControl: true }).setView([12.9716, 77.5946], 11)
//     L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//       attribution: '© OpenStreetMap contributors',
//       maxZoom: 19,
//     }).addTo(mapInstanceRef.current)
//   }, [mapReady])

//   // Update markers when positions change
//   useEffect(() => {
//     if (!mapInstanceRef.current || !L) return
//     const map = mapInstanceRef.current

//     Object.keys(markersRef.current).forEach(id => {
//       if (!positions.find(p => String(p.vehicle.id) === id)) {
//         map.removeLayer(markersRef.current[id])
//         delete markersRef.current[id]
//       }
//     })

//     positions.forEach(p => {
//       const id = String(p.vehicle.id)
//       const lat = parseFloat(p.position.latitude)
//       const lng = parseFloat(p.position.longitude)
//       const isSelected = selected === p.vehicle.id
//       const color = isSelected ? '#1d4ed8' : '#16a34a'

//       const icon = L.divIcon({
//         className: '',
//         html: `<div style="
//           width:36px;height:36px;border-radius:50%;
//           background:${color};border:3px solid #fff;
//           display:flex;align-items:center;justify-content:center;
//           box-shadow:0 2px 10px rgba(0,0,0,0.25);
//           font-size:13px;font-weight:700;color:#fff;
//           cursor:pointer;
//         ">${p.vehicle.registration_no.slice(-3)}</div>`,
//         iconSize: [36, 36],
//         iconAnchor: [18, 18],
//       })

//       if (markersRef.current[id]) {
//         markersRef.current[id].setLatLng([lat, lng]).setIcon(icon)
//       } else {
//         const marker = L.marker([lat, lng], { icon })
//           .addTo(map)
//           .bindPopup(`
//             <div style="font-family:monospace;font-size:12px;min-width:160px">
//               <div style="font-weight:700;color:#1d4ed8;margin-bottom:6px">${p.vehicle.registration_no}</div>
//               <div>Lat: ${lat.toFixed(6)}</div>
//               <div>Lng: ${lng.toFixed(6)}</div>
//               <div>Speed: ${p.position.speed_kmh || 0} km/h</div>
//               <div style="color:#888;margin-top:4px;font-size:11px">${new Date(p.position.logged_at).toLocaleString('en-IN')}</div>
//             </div>
//           `)
//         marker.on('click', () => loadHistory(p.vehicle.id))
//         markersRef.current[id] = marker
//       }
//     })

//     if (positions.length > 0 && Object.keys(markersRef.current).length > 0) {
//       const group = L.featureGroup(Object.values(markersRef.current))
//       map.fitBounds(group.getBounds().pad(0.2))
//     }
//   }, [positions, mapReady, selected])

//   // Draw route history on map
//   useEffect(() => {
//     if (!mapInstanceRef.current || !L) return
//     if (routeLineRef.current) {
//       mapInstanceRef.current.removeLayer(routeLineRef.current)
//       routeLineRef.current = null
//     }
//     if (history.length < 2) return
//     const coords = history.map(h => [parseFloat(h.latitude), parseFloat(h.longitude)])
//     routeLineRef.current = L.polyline(coords, {
//       color: '#1d4ed8', weight: 3, opacity: 0.8, dashArray: '6,4'
//     }).addTo(mapInstanceRef.current)
//     mapInstanceRef.current.fitBounds(routeLineRef.current.getBounds().pad(0.2))
//   }, [history])

//   const load = () => {
//     gpsAPI.getLive()
//       .then(r => setPositions(r.data.data || []))
//       .catch(() => {})
//       .finally(() => setLoading(false))
//   }

//   useEffect(() => {
//     load()
//     vehicleAPI.getAll({ status: 'active' }).then(r => setVehicles(r.data.data)).catch(() => {})
//   }, [])

//   useEffect(() => {
//     if (autoRefresh) {
//       intervalRef.current = setInterval(load, 5000)
//     } else {
//       clearInterval(intervalRef.current)
//     }
//     return () => clearInterval(intervalRef.current)
//   }, [autoRefresh])

//   const loadHistory = (vehicleId) => {
//     setSelected(vehicleId)
//     setHistoryLoading(true)
//     const to = new Date().toISOString()
//     const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
//     gpsAPI.getHistory(vehicleId, { from, to })
//       .then(r => setHistory(r.data.data || []))
//       .catch(() => toast.error('Failed to load history'))
//       .finally(() => setHistoryLoading(false))
//   }

//   const handlePush = async () => {
//     try {
//       await gpsAPI.push(pushForm)
//       toast.success('Location pushed')
//       setShowPush(false)
//       load()
//     } catch (err) {
//       toast.error(err.response?.data?.message || 'Failed to push location')
//     }
//   }

//   const pf = (k) => (e) => setPushForm(p => ({ ...p, [k]: e.target.value }))

//   return (
//     <div className="page-enter">
//       <PageHeader title="GPS" accent="Tracking" sub={`${positions.length} vehicles with recorded positions`}>
//         <button
//           className={`btn btn-sm ${autoRefresh ? 'btn-primary' : 'btn-secondary'}`}
//           onClick={() => setAutoRefresh(!autoRefresh)}
//         >
//           <Activity size={13} /> {autoRefresh ? 'Auto On' : 'Auto Off'}
//         </button>
//         <button className="btn-icon" onClick={load} title="Refresh"><RefreshCw size={14} /></button>
//         <button className="btn btn-primary" onClick={() => setShowPush(true)}>
//           <Zap size={14} /> Push Location
//         </button>
//       </PageHeader>

//       {/* Map */}
//       <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '16px' }}>
//         <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
//           <MapIcon size={14} color="var(--brand)" />
//           <span className="chart-title">Live Map</span>
//           {selected && history.length > 0 && (
//             <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--brand)', marginLeft: 'auto' }}>
//               — Showing 24h route for Veh #{selected}
//             </span>
//           )}
//           {selected && (
//             <button className="btn-icon" style={{ marginLeft: selected && history.length > 0 ? '0' : 'auto', width: '22px', height: '22px', fontSize: '12px' }}
//               onClick={() => { setSelected(null); setHistory([]) }}>✕</button>
//           )}
//         </div>
//         <div ref={mapRef} style={{ height: '420px', width: '100%', background: '#e2e8f0' }}>
//           {!mapReady && (
//             <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
//               <MapPin size={16} style={{ marginRight: '8px' }} /> Loading map…
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Live positions + History table */}
//       <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: '16px' }}>
//         <div>
//           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
//             <span className="live-dot" />
//             <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--green)' }}>
//               Live Positions
//             </span>
//             {autoRefresh && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>auto-refresh 5s</span>}
//           </div>

//           {loading ? (
//             <LoadingState label="Loading positions…" />
//           ) : positions.length === 0 ? (
//             <EmptyState icon="📍" title="No GPS data yet" sub="Push a location using the button above to get started" />
//           ) : (
//             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
//               {positions.map((p, i) => (
//                 <div
//                   key={i}
//                   onClick={() => loadHistory(p.vehicle.id)}
//                   className="card"
//                   style={{
//                     cursor: 'pointer',
//                     borderLeft: `3px solid ${selected === p.vehicle.id ? 'var(--brand)' : 'var(--green)'}`,
//                     background: selected === p.vehicle.id ? 'var(--brand-light)' : 'var(--bg-surface)',
//                   }}
//                 >
//                   <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
//                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//                       <span className="live-dot" />
//                       <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand)', fontWeight: 700 }}>
//                         {p.vehicle.registration_no}
//                       </span>
//                     </div>
//                     {p.position.speed_kmh > 0 && (
//                       <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'var(--blue-bg)', borderRadius: 'var(--radius)', padding: '3px 8px' }}>
//                         <Navigation size={11} color="var(--blue)" />
//                         <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--blue)', fontWeight: 700 }}>
//                           {p.position.speed_kmh} km/h
//                         </span>
//                       </div>
//                     )}
//                   </div>
//                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
//                     <div style={{ background: 'var(--bg-canvas)', borderRadius: 'var(--radius)', padding: '8px 10px' }}>
//                       <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '2px' }}>LATITUDE</div>
//                       <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{parseFloat(p.position.latitude).toFixed(6)}</div>
//                     </div>
//                     <div style={{ background: 'var(--bg-canvas)', borderRadius: 'var(--radius)', padding: '8px 10px' }}>
//                       <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '2px' }}>LONGITUDE</div>
//                       <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{parseFloat(p.position.longitude).toFixed(6)}</div>
//                     </div>
//                   </div>
//                   <div style={{ marginTop: '8px', fontSize: '0.73rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', display: 'flex', justifyContent: 'space-between' }}>
//                     <span>Last seen: {new Date(p.position.logged_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
//                     <span style={{ color: 'var(--brand)' }}>Click for history →</span>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>

//         {selected && (
//           <div>
//             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
//               <span className="chart-title">24h History — Veh #{selected}</span>
//               <button className="btn-icon" style={{ width: '22px', height: '22px', fontSize: '12px' }} onClick={() => { setSelected(null); setHistory([]) }}>✕</button>
//             </div>
//             {historyLoading ? (
//               <LoadingState label="Loading history…" />
//             ) : history.length === 0 ? (
//               <EmptyState title="No history in past 24h" />
//             ) : (
//               <div className="table-container" style={{ maxHeight: '420px', overflowY: 'auto' }}>
//                 <table>
//                   <thead>
//                     <tr><th>Time</th><th>Latitude</th><th>Longitude</th><th>Speed</th></tr>
//                   </thead>
//                   <tbody>
//                     {history.map((h, i) => (
//                       <tr key={i}>
//                         <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
//                           {new Date(h.logged_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
//                         </span></td>
//                         <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{parseFloat(h.latitude).toFixed(5)}</span></td>
//                         <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{parseFloat(h.longitude).toFixed(5)}</span></td>
//                         <td>
//                           {h.speed_kmh > 0
//                             ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: h.speed_kmh > 80 ? 'var(--red)' : 'var(--green)' }}>{h.speed_kmh} km/h</span>
//                             : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
//                           }
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             )}
//           </div>
//         )}
//       </div>

//       {/* Push location modal */}
//       {showPush && (
//         <Modal
//           title={<span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Zap size={15} /> Push GPS Location</span>}
//           onClose={() => setShowPush(false)}
//           footer={<>
//             <button className="btn btn-secondary" onClick={() => setShowPush(false)}>Cancel</button>
//             <button className="btn btn-primary" onClick={handlePush}><Zap size={13} /> Push</button>
//           </>}
//         >
//           <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
//             <div className="form-group">
//               <label className="form-label">Vehicle *</label>
//               <select className="input" value={pushForm.vehicle_id} onChange={pf('vehicle_id')}>
//                 <option value="">Select vehicle</option>
//                 {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_no} — {v.make} {v.model}</option>)}
//               </select>
//             </div>
//             <div className="form-grid-3">
//               <div className="form-group"><label className="form-label">Latitude *</label><input className="input" type="number" step="any" value={pushForm.latitude} onChange={pf('latitude')} placeholder="12.9716" /></div>
//               <div className="form-group"><label className="form-label">Longitude *</label><input className="input" type="number" step="any" value={pushForm.longitude} onChange={pf('longitude')} placeholder="77.5946" /></div>
//               <div className="form-group"><label className="form-label">Speed (km/h)</label><input className="input" type="number" value={pushForm.speed_kmh} onChange={pf('speed_kmh')} placeholder="0" /></div>
//             </div>
//           </div>
//           <div className="notice notice-blue" style={{ marginTop: '14px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
//             Tip: in production, GPS devices push coordinates automatically via POST /api/gps/push
//           </div>
//         </Modal>
//       )}
//     </div>
//   )
// }






import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { MapPin, RefreshCw, Navigation, Activity, Zap, Map as MapIcon, Truck, Clock, AlertTriangle, Wifi, WifiOff, Play, Square } from 'lucide-react'
import { gpsAPI, vehicleAPI } from '../services/api'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import { LoadingState, EmptyState, PageHeader, KpiCards } from '../components/Common'

/* KPI color palette (matches Vehicles page glow cards) */
const GPS_KPI_PALETTE = {
  blue:  { accent: '#1d4ed8', bg: '#dbeafe', border: '#bfdbfe', glow: 'rgba(29,78,216,0.20)' },
  green: { accent: '#16a34a', bg: '#dcfce7', border: '#bbf7d0', glow: 'rgba(22,163,74,0.20)'  },
  amber: { accent: '#b45309', bg: '#fef3c7', border: '#fde68a', glow: 'rgba(180,83,9,0.20)'   },
  red:   { accent: '#dc2626', bg: '#fee2e2', border: '#fecaca', glow: 'rgba(220,38,38,0.20)'  },
}

/* soft ambient glow helper for non-KpiCards cards (e.g. the Live Map card) */
function withAlpha(rgba, alpha) {
  const m = /rgba?\(([^)]+)\)/.exec(rgba)
  if (!m) return rgba
  const [r, g, b] = m[1].split(',').map(p => p.trim())
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

let L = null

// Single shared socket connection — the backend's HTTP server (Socket.io is
// attached to the same server as Express) runs on :5000 in dev.
const SOCKET_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin

// ── Vehicle SVG icons by type ──────────────────────────────────────────────
const VEHICLE_ICONS = {
  truck: (color, reg) => `
    <svg width="52" height="52" viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
      <circle cx="26" cy="26" r="24" fill="${color}" stroke="#fff" stroke-width="3"/>
      <g transform="translate(10,15)">
        <!-- truck body -->
        <rect x="0" y="4" width="22" height="11" rx="2" fill="#fff" opacity="0.95"/>
        <!-- cab -->
        <rect x="14" y="1" width="8" height="7" rx="1.5" fill="#fff" opacity="0.95"/>
        <!-- windshield -->
        <rect x="15" y="2" width="5" height="4" rx="1" fill="${color}" opacity="0.7"/>
        <!-- wheels -->
        <circle cx="5" cy="16" r="2.5" fill="#fff" opacity="0.9"/>
        <circle cx="17" cy="16" r="2.5" fill="#fff" opacity="0.9"/>
        <circle cx="5" cy="16" r="1" fill="${color}"/>
        <circle cx="17" cy="16" r="1" fill="${color}"/>
      </g>
      <text x="26" y="44" text-anchor="middle" font-size="8" font-weight="700" fill="#fff" font-family="monospace">${reg}</text>
    </svg>`,
  bike: (color, reg) => `
    <svg width="46" height="46" viewBox="0 0 46 46" xmlns="http://www.w3.org/2000/svg">
      <circle cx="23" cy="23" r="21" fill="${color}" stroke="#fff" stroke-width="3"/>
      <g transform="translate(8,10)">
        <!-- bike body -->
        <ellipse cx="15" cy="14" rx="9" ry="5" fill="none" stroke="#fff" stroke-width="2" opacity="0.9"/>
        <!-- wheels -->
        <circle cx="6" cy="18" r="4" fill="none" stroke="#fff" stroke-width="2" opacity="0.9"/>
        <circle cx="24" cy="18" r="4" fill="none" stroke="#fff" stroke-width="2" opacity="0.9"/>
        <!-- rider -->
        <circle cx="17" cy="7" r="2.5" fill="#fff" opacity="0.9"/>
        <line x1="17" y1="9" x2="15" y2="13" stroke="#fff" stroke-width="1.5" opacity="0.9"/>
      </g>
    </svg>`,
  van: (color, reg) => `
    <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <circle cx="25" cy="25" r="23" fill="${color}" stroke="#fff" stroke-width="3"/>
      <g transform="translate(8,13)">
        <!-- van body -->
        <rect x="0" y="2" width="26" height="14" rx="3" fill="#fff" opacity="0.95"/>
        <!-- windows -->
        <rect x="2" y="4" width="6" height="5" rx="1" fill="${color}" opacity="0.7"/>
        <rect x="10" y="4" width="6" height="5" rx="1" fill="${color}" opacity="0.7"/>
        <rect x="18" y="4" width="6" height="5" rx="1" fill="${color}" opacity="0.7"/>
        <!-- wheels -->
        <circle cx="6" cy="17.5" r="3" fill="#fff" opacity="0.9"/>
        <circle cx="20" cy="17.5" r="3" fill="#fff" opacity="0.9"/>
        <circle cx="6" cy="17.5" r="1.2" fill="${color}"/>
        <circle cx="20" cy="17.5" r="1.2" fill="${color}"/>
      </g>
    </svg>`,
  default: (color, reg) => `
    <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="22" fill="${color}" stroke="#fff" stroke-width="3"/>
      <g transform="translate(9,13)">
        <rect x="1" y="5" width="24" height="12" rx="3" fill="#fff" opacity="0.95"/>
        <rect x="4" y="1" width="16" height="7" rx="2" fill="#fff" opacity="0.9"/>
        <rect x="6" y="2.5" width="5" height="4" rx="1" fill="${color}" opacity="0.7"/>
        <rect x="15" y="2.5" width="3" height="4" rx="1" fill="${color}" opacity="0.7"/>
        <circle cx="6" cy="18" r="3" fill="#fff" opacity="0.9"/>
        <circle cx="20" cy="18" r="3" fill="#fff" opacity="0.9"/>
        <circle cx="6" cy="18" r="1.2" fill="${color}"/>
        <circle cx="20" cy="18" r="1.2" fill="${color}"/>
      </g>
      <text x="24" y="43" text-anchor="middle" font-size="7" font-weight="700" fill="#fff" font-family="monospace">${reg.slice(-4)}</text>
    </svg>`,
}

function getVehicleIcon(vehicle, isSelected, speed) {
  const reg = vehicle.registration_no?.slice(-4) || '????'
  let color
  if (isSelected) color = '#1d4ed8'
  else if (speed > 80) color = '#dc2626'
  else if (speed > 0) color = '#16a34a'
  else color = '#f59e0b'

  const type = (vehicle.type || '').toLowerCase()
  const svgStr = type.includes('truck') ? VEHICLE_ICONS.truck(color, reg)
    : type.includes('bike') || type.includes('motor') ? VEHICLE_ICONS.bike(color, reg)
    : type.includes('van') ? VEHICLE_ICONS.van(color, reg)
    : VEHICLE_ICONS.default(color, reg)

  const size = type.includes('truck') ? [52, 52] : type.includes('bike') ? [46, 46] : [50, 50]
  return { svgStr, size, color }
}

// ── Speed badge color ──────────────────────────────────────────────────────
function speedColor(kmh) {
  if (kmh > 80) return { bg: '#fef2f2', color: '#dc2626', label: 'Speeding' }
  if (kmh > 40) return { bg: '#eff6ff', color: '#1d4ed8', label: 'Moving' }
  if (kmh > 0)  return { bg: '#f0fdf4', color: '#16a34a', label: 'Slow' }
  return { bg: '#fefce8', color: '#b45309', label: 'Idle' }
}

// ── Vehicle card ───────────────────────────────────────────────────────────
function VehicleCard({ p }) {
  const sp = p.position.speed_kmh || 0
  const sc = speedColor(sp)
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1.5px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '12px 14px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* speed indicator strip */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: sc.color, borderRadius: '3px 0 0 3px' }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: sc.color, boxShadow: `0 0 0 3px ${sc.bg}` }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--brand)', fontSize: '0.88rem' }}>
            {p.vehicle.registration_no}
          </span>
          {p.vehicle.make && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.vehicle.make} {p.vehicle.model}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: sc.bg, borderRadius: '100px', padding: '3px 9px' }}>
          <Navigation size={10} color={sc.color} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: sc.color, fontWeight: 700 }}>
            {sp > 0 ? `${sp} km/h` : sc.label}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
        {[['LAT', parseFloat(p.position.latitude).toFixed(6)], ['LNG', parseFloat(p.position.longitude).toFixed(6)]].map(([k, v]) => (
          <div key={k} style={{ background: 'var(--bg-canvas)', borderRadius: 'var(--radius)', padding: '6px 10px' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '1px' }}>{k}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: '0.71rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          <Clock size={10} style={{ marginRight: 4, verticalAlign: -1 }} />
          {new Date(p.position.logged_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function GpsTracking() {
  const [positions, setPositions] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [pushForm, setPushForm] = useState({ vehicle_id: '', latitude: '', longitude: '', speed_kmh: '' })
  const [showPush, setShowPush] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [mapStyle, setMapStyle] = useState('streets')
  const [lastRefresh, setLastRefresh] = useState(null)
  const [socketConnected, setSocketConnected] = useState(false)
  const [simRunning, setSimRunning] = useState(false)
  const [simLoading, setSimLoading] = useState(false)
  const socketRef = useRef(null)
  const toast = useToast()
  const intervalRef = useRef(null)
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef({})

  // ── Idle-duration tracking ──────────────────────────────────────────────
  // A vehicle only counts as "Idle" once its speed has stayed below the
  // moving threshold continuously for 2+ minutes (per the KPI spec) — a
  // vehicle that just slowed down (e.g. at a red light) shouldn't flicker
  // into the Idle bucket immediately. We track, per vehicle, the timestamp
  // it first dropped below the threshold; once that's been true for 2+ min
  // AND it's still reporting fresh GPS data ("GPS online"), it's Idle.
  const MOVING_THRESHOLD_KMH = 5
  const IDLE_SUSTAIN_MS = 2 * 60 * 1000
  const GPS_ONLINE_WINDOW_MS = 2 * 60 * 1000 // no update in 2min = considered offline, not idle
  const belowThresholdSinceRef = useRef(new Map()) // vehicle_id -> timestamp

  useEffect(() => {
    const now = Date.now()
    const tracker = belowThresholdSinceRef.current
    const seenIds = new Set()
    positions.forEach(p => {
      const id = p.vehicle.id
      seenIds.add(id)
      const speed = p.position.speed_kmh || 0
      if (speed < MOVING_THRESHOLD_KMH) {
        if (!tracker.has(id)) tracker.set(id, now)
      } else {
        tracker.delete(id)
      }
    })
    // Drop vehicles no longer in the live set
    Array.from(tracker.keys()).forEach(id => { if (!seenIds.has(id)) tracker.delete(id) })
  }, [positions])

  // Re-render every 10s so idle counts that cross the 2-minute mark update
  // even without a new GPS position arriving.
  const [, forceTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => forceTick(n => n + 1), 10000)
    return () => clearInterval(t)
  }, [])

  // ── Derived stats ──────────────────────────────────────────────────────
  const now = Date.now()
  const moving = positions.filter(p => (p.position.speed_kmh || 0) > MOVING_THRESHOLD_KMH).length
  const speeding = positions.filter(p => (p.position.speed_kmh || 0) > 80).length
  const idle = positions.filter(p => {
    const id = p.vehicle.id
    const since = belowThresholdSinceRef.current.get(id)
    if (!since) return false
    const gpsOnline = (now - new Date(p.position.logged_at).getTime()) < GPS_ONLINE_WINDOW_MS
    return gpsOnline && (now - since) >= IDLE_SUSTAIN_MS
  }).length

  // ── Load Leaflet ───────────────────────────────────────────────────────
  useEffect(() => {
    if (window.L) { L = window.L; setMapReady(true); return }
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => { L = window.L; setMapReady(true) }
    document.head.appendChild(script)
  }, [])

  // ── Map tile layers ────────────────────────────────────────────────────
  const tileLayers = {
    streets: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  }
  const tileLayerRef = useRef(null)

  // ── Init map ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapInstanceRef.current) return
    mapInstanceRef.current = L.map(mapRef.current, { zoomControl: false }).setView([12.9716, 77.5946], 11)
    L.control.zoom({ position: 'bottomright' }).addTo(mapInstanceRef.current)
    tileLayerRef.current = L.tileLayer(tileLayers.streets, {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(mapInstanceRef.current)
  }, [mapReady])

  // ── Switch tile layer ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !L || !tileLayerRef.current) return
    mapInstanceRef.current.removeLayer(tileLayerRef.current)
    tileLayerRef.current = L.tileLayer(tileLayers[mapStyle], {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(mapInstanceRef.current)
  }, [mapStyle])

  // ── Update markers with SVG vehicle icons ─────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !L) return
    const map = mapInstanceRef.current

    // Remove stale markers
    Object.keys(markersRef.current).forEach(id => {
      if (!positions.find(p => String(p.vehicle.id) === id)) {
        map.removeLayer(markersRef.current[id])
        delete markersRef.current[id]
      }
    })

    positions.forEach(p => {
      const id = String(p.vehicle.id)
      const lat = parseFloat(p.position.latitude)
      const lng = parseFloat(p.position.longitude)
      const sp = p.position.speed_kmh || 0
      const { svgStr, size, color } = getVehicleIcon(p.vehicle, false, sp)

      // Pulse ring for moving vehicles
      const pulseHtml = sp > 0 ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:${size[0]+16}px;height:${size[1]+16}px;border-radius:50%;border:2px solid ${color};opacity:0.4;animation:gps-pulse 2s infinite;pointer-events:none;"></div>` : ''

      const icon = L.divIcon({
        className: '',
        html: `<div style="position:relative;width:${size[0]}px;height:${size[1]}px;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.3))">
          ${pulseHtml}
          ${svgStr}
        </div>`,
        iconSize: size,
        iconAnchor: [size[0] / 2, size[1] / 2],
        popupAnchor: [0, -size[1] / 2],
      })

      const popupContent = `
        <div style="font-family:monospace;font-size:12px;min-width:180px;padding:4px">
          <div style="font-weight:700;color:${color};font-size:13px;margin-bottom:8px;border-bottom:1px solid #eee;padding-bottom:6px">
            🚛 ${p.vehicle.registration_no}
          </div>
          <div style="display:grid;grid-template-columns:auto 1fr;gap:3px 10px;color:#555">
            <span style="color:#888">Make</span><span>${p.vehicle.make || '—'} ${p.vehicle.model || ''}</span>
            <span style="color:#888">Speed</span><span style="color:${sp > 80 ? '#dc2626' : sp > 0 ? '#16a34a' : '#b45309'};font-weight:700">${sp} km/h</span>
            <span style="color:#888">Lat</span><span>${lat.toFixed(6)}</span>
            <span style="color:#888">Lng</span><span>${lng.toFixed(6)}</span>
            <span style="color:#888">Updated</span><span style="color:#888;font-size:11px">${new Date(p.position.logged_at).toLocaleString('en-IN')}</span>
          </div>
        </div>`

      if (markersRef.current[id]) {
        markersRef.current[id].setLatLng([lat, lng]).setIcon(icon)
        markersRef.current[id].getPopup()?.setContent(popupContent)
      } else {
        const marker = L.marker([lat, lng], { icon })
          .addTo(map)
          .bindPopup(popupContent, { maxWidth: 220 })
        markersRef.current[id] = marker
      }
    })

    if (positions.length > 0) {
      const group = L.featureGroup(Object.values(markersRef.current))
      if (Object.values(markersRef.current).length > 0) {
        map.fitBounds(group.getBounds().pad(0.25))
      }
    }
  }, [positions, mapReady])

  const load = () => {
    gpsAPI.getLive()
      .then(r => { setPositions(r.data.data || []); setLastRefresh(new Date()) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    vehicleAPI.getAll({ status: 'active' }).then(r => setVehicles(r.data.data)).catch(() => {})
    gpsAPI.simStatus().then(r => setSimRunning(r.data.data.running)).catch(() => {})
  }, [])

  // ── Live updates via Socket.io ─────────────────────────────────────────
  // This is what makes the map actually "live": instead of waiting up to 5s
  // for a poll, every push (real device or the simulator) lands here within
  // a few hundred ms and updates the map immediately.
  useEffect(() => {
    const socket = io(SOCKET_URL, { withCredentials: true })
    socketRef.current = socket

    socket.on('connect', () => setSocketConnected(true))
    socket.on('disconnect', () => setSocketConnected(false))

    // Sent either as a full snapshot (simulator, one tick = whole fleet) or
    // a partial update (a single driver's phone pushing their own location)
    // — merge by vehicle id either way so neither case wipes the other
    // vehicles off the map.
    socket.on('fleet_update', (incoming) => {
      setPositions(prev => {
        const byId = {}
        prev.forEach(p => { byId[p.vehicle.id] = p })
        incoming.forEach(p => { byId[p.vehicle.id] = p })
        return Object.values(byId)
      })
      setLastRefresh(new Date())
    })

    return () => socket.disconnect()
  }, [])

  // Keep a slow backup poll running (covers the rare case a socket event is
  // missed, e.g. brief reconnect) — much lighter than the old 5s loop.
  useEffect(() => {
    intervalRef.current = setInterval(load, 30000)
    return () => clearInterval(intervalRef.current)
  }, [])

  const toggleSimulator = async () => {
    setSimLoading(true)
    try {
      if (simRunning) {
        await gpsAPI.simStop()
        setSimRunning(false)
        toast.success('Live simulation stopped')
      } else {
        await gpsAPI.simStart()
        setSimRunning(true)
        toast.success('Live simulation started — vehicles will move automatically')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle simulator')
    } finally {
      setSimLoading(false)
    }
  }

  const handlePush = async () => {
    try {
      await gpsAPI.push(pushForm)
      toast.success('Location pushed')
      setShowPush(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to push location')
    }
  }

  const pf = (k) => (e) => setPushForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="page-enter">
      {/* Pulse animation style */}
      <style>{`
        @keyframes gps-pulse {
          0% { transform: translate(-50%,-50%) scale(0.8); opacity: 0.6; }
          100% { transform: translate(-50%,-50%) scale(1.6); opacity: 0; }
        }
      `}</style>

      <PageHeader
        title="GPS"
        accent="Tracking"
        sub={`${positions.length} vehicles tracked · ${moving} moving · ${idle} idle${speeding > 0 ? ` · ${speeding} speeding` : ''}`}
      >
        <button
          className={`btn btn-sm ${socketConnected ? 'btn-primary' : 'btn-secondary'}`}
          disabled
          title={socketConnected ? 'Connected — receiving live updates' : 'Not connected'}
        >
          {socketConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
          {socketConnected ? 'Live' : 'Offline'}
        </button>
        <button
          className={`btn btn-sm ${simRunning ? 'btn-danger' : 'btn-primary'}`}
          onClick={toggleSimulator}
          disabled={simLoading}
          title={simRunning ? 'Stop simulated GPS movement' : 'Start simulated GPS movement (stand-in for real devices)'}
        >
          {simRunning ? <Square size={13} /> : <Play size={13} />}
          {simRunning ? 'Stop Simulation' : 'Start Simulation'}
        </button>
        {lastRefresh && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
        <button className="btn-icon" onClick={load} title="Refresh now"><RefreshCw size={14} /></button>
        <button className="btn btn-primary" onClick={() => setShowPush(true)}>
          <Zap size={14} /> Push Location
        </button>
      </PageHeader>

      {/* ── Stats row ─────────────────────────────────────────────────── */}
      <KpiCards columns={4} stats={[
        { label: 'Total tracked', value: positions.length, Icon: Truck,         ...GPS_KPI_PALETTE.blue },
        { label: 'Moving',        value: moving,            Icon: Navigation,    ...GPS_KPI_PALETTE.green },
        { label: 'Idle',          value: idle,               Icon: Activity,      ...GPS_KPI_PALETTE.amber },
        { label: 'Speeding >80',  value: speeding,           Icon: AlertTriangle, ...GPS_KPI_PALETTE.red },
      ]} />

      {/* ── Map card ───────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '16px' }}>
        {/* Map toolbar */}
        <div style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'var(--bg-surface)',
        }}>
          <MapIcon size={14} color="var(--brand)" />
          <span className="chart-title" style={{ flex: 1 }}>
            Live Map
          </span>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {[['#16a34a', 'Moving'], ['#f59e0b', 'Idle'], ['#dc2626', 'Speeding']].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{l}</span>
              </div>
            ))}
          </div>

          {/* Map style switcher */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {['streets', 'dark', 'satellite'].map(s => (
              <button
                key={s}
                onClick={() => setMapStyle(s)}
                style={{
                  padding: '3px 9px',
                  fontSize: '0.7rem',
                  fontFamily: 'var(--font-mono)',
                  borderRadius: 'var(--radius)',
                  border: `1px solid ${mapStyle === s ? 'var(--brand)' : 'var(--border)'}`,
                  background: mapStyle === s ? 'var(--brand-light)' : 'transparent',
                  color: mapStyle === s ? 'var(--brand)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {s}
              </button>
            ))}
          </div>

        </div>

        <div ref={mapRef} style={{ height: '460px', width: '100%', background: '#e2e8f0' }}>
          {!mapReady && (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '10px', color: 'var(--text-muted)' }}>
              <MapPin size={24} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>Loading map…</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Live vehicle list ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>

        {/* Vehicle list */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span className="live-dot" />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.88rem', fontWeight: 700, color: 'var(--green)' }}>
              Live Positions
            </span>
            {socketConnected && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--green)', background: 'var(--bg-canvas)', padding: '2px 7px', borderRadius: '100px' }}>
                live socket
              </span>
            )}
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {positions.length} vehicle{positions.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <LoadingState label="Loading positions…" />
          ) : positions.length === 0 ? (
            <EmptyState icon="📍" title="No GPS data yet" sub="Push a location using the button above to get started" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {positions.map((p, i) => (
                <VehicleCard key={i} p={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Push location modal ────────────────────────────────────────── */}
      {showPush && (
        <Modal
          title={<span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Zap size={15} /> Push GPS Location</span>}
          onClose={() => setShowPush(false)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setShowPush(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handlePush}><Zap size={13} /> Push</button>
          </>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Vehicle *</label>
              <select className="input" value={pushForm.vehicle_id} onChange={pf('vehicle_id')}>
                <option value="">Select vehicle</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.registration_no} — {v.make} {v.model}</option>
                ))}
              </select>
            </div>
            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label">Latitude *</label>
                <input className="input" type="number" step="any" value={pushForm.latitude} onChange={pf('latitude')} placeholder="12.9716" />
              </div>
              <div className="form-group">
                <label className="form-label">Longitude *</label>
                <input className="input" type="number" step="any" value={pushForm.longitude} onChange={pf('longitude')} placeholder="77.5946" />
              </div>
              <div className="form-group">
                <label className="form-label">Speed (km/h)</label>
                <input className="input" type="number" value={pushForm.speed_kmh} onChange={pf('speed_kmh')} placeholder="0" />
              </div>
            </div>
          </div>
          <div className="notice notice-blue" style={{ marginTop: '14px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
            Tip: in production, GPS devices push coordinates automatically via POST /api/gps/push
          </div>
        </Modal>
      )}
    </div>
  )
}