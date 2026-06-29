import { useState, useEffect } from 'react'
import { Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import { tripAPI } from '../services/api'
import { useToast } from '../context/ToastContext'
import { LoadingState } from '../components/Common'

const STATUS_STYLE = {
  in_progress: { label: 'Ongoing',   color: '#d97706', bg: '#fef3c7', dot: '#d97706' },
  completed:   { label: 'Completed', color: '#16a34a', bg: '#dcfce7', dot: '#16a34a' },
  cancelled:   { label: 'Cancelled', color: '#dc2626', bg: '#fee2e2', dot: '#dc2626' },
  planned:     { label: 'Planned',   color: '#6b7280', bg: '#f3f4f6', dot: '#6b7280' },
}

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.planned
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700,
      background: s.bg, color: s.color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />
      {s.label}
    </span>
  )
}

const PAGE_SIZE = 5

export default function TripHistory() {
  const [trips,    setTrips]   = useState([])
  const [loading,  setLoading] = useState(true)
  const [search,   setSearch]  = useState('')
  const [statusF,  setStatusF] = useState('all')
  const [vehicleF, setVehicleF] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const [page,     setPage]     = useState(1)
  const [detailTrip, setDetailTrip] = useState(null)
  const toast = useToast()

  const load = () => {
    setLoading(true)
    tripAPI.getAll()
      .then(r => setTrips(r.data.data || []))
      .catch(() => toast.error('Failed to load trips'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const total     = trips.length
  const ongoing   = trips.filter(t => t.status === 'in_progress').length
  const completed = trips.filter(t => t.status === 'completed').length
  const cancelled = trips.filter(t => t.status === 'cancelled').length

  const vehicles = [...new Set(trips.map(t => t.vehicle?.registration_no).filter(Boolean))]

  const filtered = trips.filter(t => {
    const q = search.toLowerCase()
    const tripId = `TRP-${String(t.id).padStart(9, '0')}`
    const matchQ = !q
      || tripId.toLowerCase().includes(q)
      || (t.start_location || '').toLowerCase().includes(q)
      || (t.end_location   || '').toLowerCase().includes(q)
      || (t.vehicle?.registration_no || '').toLowerCase().includes(q)
      || (t.cargo_type || '').toLowerCase().includes(q)
    const matchS  = statusF  === 'all' || t.status === statusF
    const matchV  = vehicleF === 'all' || t.vehicle?.registration_no === vehicleF
    const tripDate = t.start_time ? new Date(t.start_time) : null
    const matchFrom = !dateFrom || (tripDate && tripDate >= new Date(dateFrom))
    const matchTo   = !dateTo   || (tripDate && tripDate <= new Date(dateTo + 'T23:59:59'))
    return matchQ && matchS && matchV && matchFrom && matchTo
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
  const fmtTime = d => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'

  // ── Detail view ──
  if (detailTrip) {
    const t = detailTrip
    return (
      <div>
        <button onClick={() => setDetailTrip(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500, marginBottom: 20, padding: 0 }}>
          <ChevronLeft size={16} /> Back to Trip History
        </button>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24 }}>
          Trip <span style={{ color: 'var(--brand)' }}>Details</span>
        </h1>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand)', fontWeight: 700, fontSize: '0.9rem' }}>
                TRP-{String(t.id).padStart(9, '0')}
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0f172a', marginTop: 4 }}>
                {t.start_location || '—'} → {t.end_location || '—'}
              </div>
            </div>
            <StatusBadge status={t.status} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {[
              { label: 'Vehicle',        val: t.vehicle?.registration_no ? `${t.vehicle.registration_no} · ${t.vehicle.make || ''} ${t.vehicle.model || ''}`.trim() : '—' },
              { label: 'Date',           val: fmtDate(t.start_time) },
              { label: 'Distance',       val: t.distance_km ? `${parseFloat(t.distance_km).toFixed(1)} km` : '—' },
              { label: 'Load / Cargo',   val: t.cargo_type || '—' },
              { label: 'Start Time',     val: fmtTime(t.start_time) },
              { label: 'End Time',       val: fmtTime(t.end_time) },
              { label: 'Start Odometer', val: t.start_odometer ? `${Number(t.start_odometer).toLocaleString('en-IN')} km` : '—' },
              { label: 'End Odometer',   val: t.end_odometer  ? `${Number(t.end_odometer).toLocaleString('en-IN')} km`  : '—' },
              { label: 'Purpose',        val: t.purpose || '—' },
              { label: 'Priority',       val: t.priority || '—' },
              { label: 'Customer',       val: t.customer_name || '—' },
              { label: 'Fuel Used',      val: t.fuel_used ? `${t.fuel_used} L` : '—' },
            ].map(({ label, val }) => (
              <div key={label} style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: 10 }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{label}</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a' }}>{val}</div>
              </div>
            ))}
          </div>

          {t.notes && (
            <div style={{ marginTop: 16, padding: '14px 16px', background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a' }}>
              <div style={{ fontSize: '0.7rem', color: '#92400e', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Notes</div>
              <div style={{ fontSize: '0.88rem', color: '#78350f' }}>{t.notes}</div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── List view ──
  return (
    <div>
      {/* Title */}
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24, letterSpacing: '-0.02em' }}>
        Trip <span style={{ color: 'var(--brand)' }}>History</span>
      </h1>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input className="input" placeholder="Search by Trip ID, Route, or Load..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{ paddingLeft: 32 }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Status</span>
          <select className="input" value={statusF} onChange={e => { setStatusF(e.target.value); setPage(1) }} style={{ minWidth: 120 }}>
            <option value="all">All</option>
            <option value="in_progress">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Date Range</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <input className="input" type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }} style={{ width: 140 }} />
            <input className="input" type="date" value={dateTo}   onChange={e => { setDateTo(e.target.value);   setPage(1) }} style={{ width: 140 }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Vehicle</span>
          <select className="input" value={vehicleF} onChange={e => { setVehicleF(e.target.value); setPage(1) }} style={{ minWidth: 130 }}>
            <option value="all">All</option>
            {vehicles.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          {
            label: 'Total Trips', value: total, color: '#1d4ed8', iconBg: '#eff6ff', border: '#bfdbfe',
            icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            ),
          },
          {
            label: 'Ongoing', value: ongoing, color: '#d97706', iconBg: '#fef3c7', border: '#fde68a',
            icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" fill="#d97706" fillOpacity="0.15"/>
              </svg>
            ),
          },
          {
            label: 'Completed', value: completed, color: '#16a34a', iconBg: '#dcfce7', border: '#86efac',
            icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" fill="#16a34a" fillOpacity="0.1"/>
                <polyline points="7 13 10 16 17 9"/>
              </svg>
            ),
          },
          {
            label: 'Cancelled', value: cancelled, color: '#dc2626', iconBg: '#fee2e2', border: '#fca5a5',
            icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" fill="#dc2626" fillOpacity="0.1"/>
                <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            ),
          },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: `1px solid ${s.border}`, borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ width: 48, height: 48, borderRadius: 13, background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 2px 8px ${s.iconBg}` }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['Trip ID', 'Route', 'Vehicle', 'Load / Cargo', 'Date & Time', 'Distance', 'Status', 'Action'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8}><LoadingState label="Loading trips…" /></td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={8}>
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📋</div>
                  <div style={{ fontWeight: 600, color: '#64748b', marginBottom: 4 }}>No trips found</div>
                  <div style={{ fontSize: '0.85rem' }}>Try adjusting your filters</div>
                </div>
              </td></tr>
            ) : paginated.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>

                <td style={{ padding: '14px 16px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand)', fontWeight: 700, fontSize: '0.8rem' }}>
                    TRP-{String(t.id).padStart(9, '0')}
                  </span>
                </td>

                <td style={{ padding: '14px 16px', minWidth: 140 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.83rem', fontWeight: 500, color: '#0f172a' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a', display: 'inline-block', flexShrink: 0 }} />
                      {t.start_location || '—'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.83rem', color: '#64748b' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', display: 'inline-block', flexShrink: 0 }} />
                      {t.end_location || '—'}
                    </div>
                  </div>
                </td>

                <td style={{ padding: '14px 16px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>{t.vehicle?.registration_no || '—'}</div>
                  {t.vehicle?.make && <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>{t.vehicle.make} {t.vehicle.model || ''}</div>}
                </td>

                <td style={{ padding: '14px 16px', fontSize: '0.83rem', color: '#374151' }}>{t.cargo_type || '—'}</td>

                <td style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: '0.83rem', fontWeight: 500, color: '#0f172a' }}>{fmtDate(t.start_time)}</div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{fmtTime(t.start_time)}</div>
                </td>

                <td style={{ padding: '14px 16px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>
                    {t.distance_km ? `${parseFloat(t.distance_km).toFixed(0)} km` : '—'}
                  </span>
                </td>

                <td style={{ padding: '14px 16px' }}><StatusBadge status={t.status} /></td>

                <td style={{ padding: '14px 16px' }}>
                  <button onClick={() => setDetailTrip(t)} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <Eye size={13} /> View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Showing {Math.min((page-1)*PAGE_SIZE+1, filtered.length)}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length} trips
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: page === 1 ? '#cbd5e1' : '#374151' }}>
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.82rem', fontWeight: p === page ? 700 : 400, background: p === page ? 'var(--brand)' : '#fff', color: p === page ? '#fff' : '#374151' }}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: page === totalPages ? '#cbd5e1' : '#374151' }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}