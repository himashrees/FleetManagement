import { useState, useEffect } from 'react'
import { RefreshCw, MapPin, Search, Clock, Fuel, Navigation } from 'lucide-react'
import { tripAPI } from '../services/api'
import { useToast } from '../context/ToastContext'
import { LoadingState } from '../components/Common'

export default function TripHistory() {
  const toast = useToast()
  const [trips, setTrips]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [expanded, setExpanded] = useState(null)

  const load = () => {
    setLoading(true)
    tripAPI.getAll()
      .then(r => setTrips((r.data.data || []).filter(t => t.status === 'completed' || t.status === 'cancelled')))
      .catch(() => toast.error('Failed to load trip history'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const filtered = trips.filter(t =>
    (t.start_location || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.end_location   || '').toLowerCase().includes(search.toLowerCase()) ||
    String(t.id).includes(search)
  )

  const duration = (t) => {
    if (!t.actual_start_time || !t.end_time) return '—'
    const mins = Math.round((new Date(t.end_time) - new Date(t.actual_start_time)) / 60000)
    if (mins < 60) return `${mins}m`
    return `${Math.floor(mins/60)}h ${mins%60}m`
  }

  const totalDistance = trips.filter(t => t.status === 'completed').reduce((s, t) => s + (parseFloat(t.distance_km) || 0), 0)
  const totalTrips    = trips.filter(t => t.status === 'completed').length

  return (
    <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
            Trip <span style={{ color: '#1d4ed8' }}>History</span>
          </h1>
          <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '3px' }}>{trips.length} completed trips</div>
        </div>
        <button onClick={load} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', color: '#64748b' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total Trips',      value: totalTrips,                    icon: '🗺️' },
          { label: 'Total Distance',   value: `${totalDistance.toFixed(0)} km`, icon: '📍' },
          { label: 'Avg per Trip',     value: totalTrips ? `${(totalDistance / totalTrips).toFixed(1)} km` : '—', icon: '📊' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
            <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>{s.icon}</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>{s.value}</div>
            <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by location or trip ID…"
          style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1px solid #e2e8f0', borderRadius: '9px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
      </div>

      {loading ? <LoadingState label="Loading trip history…" /> : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#9ca3af' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px', opacity: 0.4 }}>📋</div>
          <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '6px', color: '#64748b' }}>No completed trips yet</div>
          <div style={{ fontSize: '0.85rem' }}>Your finished trips will appear here</div>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Trip ID','Date','From → To','Vehicle','Distance','Fuel Used','Duration','Status'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => (
                <>
                  <tr key={t.id} onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: expanded === t.id ? '#eff6ff' : i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#1d4ed8', fontWeight: 700, fontSize: '0.85rem' }}>
                      TR{String(t.id).padStart(3,'0')}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '0.83rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {t.trip_date || (t.actual_start_time ? new Date(t.actual_start_time).toLocaleDateString('en-IN') : '—')}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '0.83rem', maxWidth: '200px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                        <span style={{ color: '#16a34a', fontWeight: 500 }}>{t.start_location || '—'}</span>
                        <span style={{ color: '#9ca3af' }}>→</span>
                        <span style={{ color: '#dc2626', fontWeight: 500 }}>{t.end_location || '—'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: '0.82rem', color: '#1d4ed8' }}>
                      {t.vehicle?.registration_no || '—'}
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: '0.83rem', fontWeight: 600 }}>
                      {t.distance_km ? `${parseFloat(t.distance_km).toFixed(1)} km` : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '0.83rem', color: '#64748b' }}>
                      {t.fuel_used ? `${t.fuel_used} L` : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '0.83rem', color: '#64748b' }}>
                      {duration(t)}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: '0.73rem', fontWeight: 600, padding: '3px 10px', borderRadius: '999px',
                        background: t.status === 'completed' ? '#dcfce7' : '#fee2e2',
                        color:      t.status === 'completed' ? '#16a34a' : '#dc2626' }}>
                        {t.status === 'completed' ? '✓ Completed' : 'Cancelled'}
                      </span>
                    </td>
                  </tr>
                  {expanded === t.id && (
                    <tr key={`${t.id}-detail`}>
                      <td colSpan={8} style={{ padding: '0 14px 14px' }}>
                        <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px 18px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', fontSize: '0.83rem' }}>
                          {[
                            ['Purpose',       t.purpose || '—'],
                            ['Start Odometer', t.start_odometer ? `${Number(t.start_odometer).toLocaleString()} km` : '—'],
                            ['End Odometer',  t.end_odometer ? `${Number(t.end_odometer).toLocaleString()} km` : '—'],
                            ['Start Time',    t.actual_start_time ? new Date(t.actual_start_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'],
                            ['End Time',      t.end_time ? new Date(t.end_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'],
                            ['Fuel Used',     t.fuel_used ? `${t.fuel_used} litres` : '—'],
                            ['Distance',      t.distance_km ? `${parseFloat(t.distance_km).toFixed(1)} km` : '—'],
                            ['Driver',        t.driver?.user?.name || '—'],
                          ].map(([l, v]) => (
                            <div key={l}>
                              <div style={{ color: '#9ca3af', fontSize: '0.72rem', marginBottom: '3px', textTransform: 'uppercase' }}>{l}</div>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>{v}</div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}