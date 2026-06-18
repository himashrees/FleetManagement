import { useState, useEffect, useRef } from 'react'
import { MapPin, RefreshCw, Navigation, Activity, Zap, Map } from 'lucide-react'
import { gpsAPI, vehicleAPI } from '../services/api'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import { LoadingState, EmptyState, PageHeader } from '../components/Common'

// Leaflet loaded via CDN — no npm install needed
let L = null

export default function GpsTracking() {
  const [positions, setPositions] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [pushForm, setPushForm] = useState({ vehicle_id: '', latitude: '', longitude: '', speed_kmh: '' })
  const [showPush, setShowPush] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const toast = useToast()
  const intervalRef = useRef(null)
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef({})
  const routeLineRef = useRef(null)

  // Load Leaflet dynamically
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

  // Init map once Leaflet ready
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapInstanceRef.current) return
    mapInstanceRef.current = L.map(mapRef.current, { zoomControl: true }).setView([12.9716, 77.5946], 11)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapInstanceRef.current)
  }, [mapReady])

  // Update markers when positions change
  useEffect(() => {
    if (!mapInstanceRef.current || !L) return
    const map = mapInstanceRef.current

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
      const isSelected = selected === p.vehicle.id
      const color = isSelected ? '#1d4ed8' : '#16a34a'

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:36px;height:36px;border-radius:50%;
          background:${color};border:3px solid #fff;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 2px 10px rgba(0,0,0,0.25);
          font-size:13px;font-weight:700;color:#fff;
          cursor:pointer;
        ">${p.vehicle.registration_no.slice(-3)}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      })

      if (markersRef.current[id]) {
        markersRef.current[id].setLatLng([lat, lng]).setIcon(icon)
      } else {
        const marker = L.marker([lat, lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:monospace;font-size:12px;min-width:160px">
              <div style="font-weight:700;color:#1d4ed8;margin-bottom:6px">${p.vehicle.registration_no}</div>
              <div>Lat: ${lat.toFixed(6)}</div>
              <div>Lng: ${lng.toFixed(6)}</div>
              <div>Speed: ${p.position.speed_kmh || 0} km/h</div>
              <div style="color:#888;margin-top:4px;font-size:11px">${new Date(p.position.logged_at).toLocaleString('en-IN')}</div>
            </div>
          `)
        marker.on('click', () => loadHistory(p.vehicle.id))
        markersRef.current[id] = marker
      }
    })

    if (positions.length > 0 && Object.keys(markersRef.current).length > 0) {
      const group = L.featureGroup(Object.values(markersRef.current))
      map.fitBounds(group.getBounds().pad(0.2))
    }
  }, [positions, mapReady, selected])

  // Draw route history on map
  useEffect(() => {
    if (!mapInstanceRef.current || !L) return
    if (routeLineRef.current) {
      mapInstanceRef.current.removeLayer(routeLineRef.current)
      routeLineRef.current = null
    }
    if (history.length < 2) return
    const coords = history.map(h => [parseFloat(h.latitude), parseFloat(h.longitude)])
    routeLineRef.current = L.polyline(coords, {
      color: '#1d4ed8', weight: 3, opacity: 0.8, dashArray: '6,4'
    }).addTo(mapInstanceRef.current)
    mapInstanceRef.current.fitBounds(routeLineRef.current.getBounds().pad(0.2))
  }, [history])

  const load = () => {
    gpsAPI.getLive()
      .then(r => setPositions(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    vehicleAPI.getAll({ status: 'active' }).then(r => setVehicles(r.data.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(load, 5000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [autoRefresh])

  const loadHistory = (vehicleId) => {
    setSelected(vehicleId)
    setHistoryLoading(true)
    const to = new Date().toISOString()
    const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    gpsAPI.getHistory(vehicleId, { from, to })
      .then(r => setHistory(r.data.data || []))
      .catch(() => toast.error('Failed to load history'))
      .finally(() => setHistoryLoading(false))
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
      <PageHeader title="GPS" accent="Tracking" sub={`${positions.length} vehicles with recorded positions`}>
        <button
          className={`btn btn-sm ${autoRefresh ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setAutoRefresh(!autoRefresh)}
        >
          <Activity size={13} /> {autoRefresh ? 'Auto On' : 'Auto Off'}
        </button>
        <button className="btn-icon" onClick={load} title="Refresh"><RefreshCw size={14} /></button>
        <button className="btn btn-primary" onClick={() => setShowPush(true)}>
          <Zap size={14} /> Push Location
        </button>
      </PageHeader>

      {/* Map */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '16px' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Map size={14} color="var(--brand)" />
          <span className="chart-title">Live Map</span>
          {selected && history.length > 0 && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--brand)', marginLeft: 'auto' }}>
              — Showing 24h route for Veh #{selected}
            </span>
          )}
          {selected && (
            <button className="btn-icon" style={{ marginLeft: selected && history.length > 0 ? '0' : 'auto', width: '22px', height: '22px', fontSize: '12px' }}
              onClick={() => { setSelected(null); setHistory([]) }}>✕</button>
          )}
        </div>
        <div ref={mapRef} style={{ height: '420px', width: '100%', background: '#e2e8f0' }}>
          {!mapReady && (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
              <MapPin size={16} style={{ marginRight: '8px' }} /> Loading map…
            </div>
          )}
        </div>
      </div>

      {/* Live positions + History table */}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span className="live-dot" />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--green)' }}>
              Live Positions
            </span>
            {autoRefresh && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>auto-refresh 5s</span>}
          </div>

          {loading ? (
            <LoadingState label="Loading positions…" />
          ) : positions.length === 0 ? (
            <EmptyState icon="📍" title="No GPS data yet" sub="Push a location using the button above to get started" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {positions.map((p, i) => (
                <div
                  key={i}
                  onClick={() => loadHistory(p.vehicle.id)}
                  className="card"
                  style={{
                    cursor: 'pointer',
                    borderLeft: `3px solid ${selected === p.vehicle.id ? 'var(--brand)' : 'var(--green)'}`,
                    background: selected === p.vehicle.id ? 'var(--brand-light)' : 'var(--bg-surface)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="live-dot" />
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand)', fontWeight: 700 }}>
                        {p.vehicle.registration_no}
                      </span>
                    </div>
                    {p.position.speed_kmh > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'var(--blue-bg)', borderRadius: 'var(--radius)', padding: '3px 8px' }}>
                        <Navigation size={11} color="var(--blue)" />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--blue)', fontWeight: 700 }}>
                          {p.position.speed_kmh} km/h
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ background: 'var(--bg-canvas)', borderRadius: 'var(--radius)', padding: '8px 10px' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '2px' }}>LATITUDE</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{parseFloat(p.position.latitude).toFixed(6)}</div>
                    </div>
                    <div style={{ background: 'var(--bg-canvas)', borderRadius: 'var(--radius)', padding: '8px 10px' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '2px' }}>LONGITUDE</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{parseFloat(p.position.longitude).toFixed(6)}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '0.73rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Last seen: {new Date(p.position.logged_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    <span style={{ color: 'var(--brand)' }}>Click for history →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span className="chart-title">24h History — Veh #{selected}</span>
              <button className="btn-icon" style={{ width: '22px', height: '22px', fontSize: '12px' }} onClick={() => { setSelected(null); setHistory([]) }}>✕</button>
            </div>
            {historyLoading ? (
              <LoadingState label="Loading history…" />
            ) : history.length === 0 ? (
              <EmptyState title="No history in past 24h" />
            ) : (
              <div className="table-container" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr><th>Time</th><th>Latitude</th><th>Longitude</th><th>Speed</th></tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={i}>
                        <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          {new Date(h.logged_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span></td>
                        <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{parseFloat(h.latitude).toFixed(5)}</span></td>
                        <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{parseFloat(h.longitude).toFixed(5)}</span></td>
                        <td>
                          {h.speed_kmh > 0
                            ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: h.speed_kmh > 80 ? 'var(--red)' : 'var(--green)' }}>{h.speed_kmh} km/h</span>
                            : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Push location modal */}
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
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_no} — {v.make} {v.model}</option>)}
              </select>
            </div>
            <div className="form-grid-3">
              <div className="form-group"><label className="form-label">Latitude *</label><input className="input" type="number" step="any" value={pushForm.latitude} onChange={pf('latitude')} placeholder="12.9716" /></div>
              <div className="form-group"><label className="form-label">Longitude *</label><input className="input" type="number" step="any" value={pushForm.longitude} onChange={pf('longitude')} placeholder="77.5946" /></div>
              <div className="form-group"><label className="form-label">Speed (km/h)</label><input className="input" type="number" value={pushForm.speed_kmh} onChange={pf('speed_kmh')} placeholder="0" /></div>
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
