import { useState, useEffect, useMemo } from 'react'
import {
  Plus, RefreshCw, ArrowLeft, Search, Eye, MapPin, User,
  CheckCircle2, Ban, Clock, Route, Truck, Activity,
  CalendarCheck, XCircle, ChevronRight,
} from 'lucide-react'
import { tripAPI, vehicleAPI, driverAPI } from '../services/api'
import { useToast } from '../context/ToastContext'
import { LoadingState, EmptyState } from '../components/Common'

// scheduled = admin created, waiting for driver to start
// in_progress = driver started
// completed = driver ended
// cancelled = cancelled
const STATUS_BADGE  = { scheduled: 'badge-amber', in_progress: 'badge-blue', completed: 'badge-green', cancelled: 'badge-red' }
const STATUS_LABEL  = { scheduled: 'Upcoming', in_progress: 'Ongoing', completed: 'Completed', cancelled: 'Cancelled' }
const PRIORITY_BADGE = { low: 'badge-slate', normal: 'badge-blue', high: 'badge-amber', urgent: 'badge-red' }

const EMPTY = {
  vehicle_id: '', driver_id: '', start_location: '', end_location: '',
  reporting_time: '', purpose: '', notes: '', priority: 'normal',
  estimated_distance: '', cargo_type: '', cargo_weight: '',
  customer_name: '', customer_phone: '', pickup_address: '',
}

function tripCode(id) { return `TRP${String(id).padStart(3, '0')}` }

function Breadcrumb({ items }) {
  return (
    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
      {items.map((item, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {i > 0 && <span>/</span>}
          <span style={i === items.length - 1 ? { color: 'var(--text-secondary)', fontWeight: 600 } : {}}>{item}</span>
        </span>
      ))}
    </div>
  )
}

/* ── Stat card with gradient + hover lift + glow ── */

const STAT_CSS = `
  @keyframes trp-ring-pulse {
    0%   { transform: scale(1);   opacity: 0.7; }
    70%  { transform: scale(1.8); opacity: 0;   }
    100% { transform: scale(1);   opacity: 0;   }
  }
  .trp-kpi-card:hover .trp-kpi-ring { animation: trp-ring-pulse 1.6s ease-in-out infinite; }
  .trp-kpi-card:hover .trp-kpi-icon { transform: scale(1.14) rotate(-6deg); }
  .trp-kpi-icon { transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1); }
`

/* ── KPI card — same style as Drivers page ── */
const KPI_THEMES = {
  purple: { accent: '#7c3aed', bg: '#ede9fe', border: '#c4b5fd', glow: 'rgba(124,58,237,0.22)' },
  amber:  { accent: '#d97706', bg: '#fef3c7', border: '#fde68a', glow: 'rgba(217,119,6,0.22)'  },
  blue:   { accent: '#0284c7', bg: '#e0f2fe', border: '#bae6fd', glow: 'rgba(2,132,199,0.22)'  },
  green:  { accent: '#16a34a', bg: '#dcfce7', border: '#bbf7d0', glow: 'rgba(22,163,74,0.22)'  },
  red:    { accent: '#dc2626', bg: '#fee2e2', border: '#fca5a5', glow: 'rgba(220,38,38,0.22)'  },
}

function StatCard({ icon: Icon, label, value, color, sub }) {
  const s = KPI_THEMES[color] || KPI_THEMES.purple
  return (
    <div
      className="trp-kpi-card"
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 16px 40px ${s.glow}, 0 3px 10px rgba(0,0,0,0.07)`; e.currentTarget.style.transform = 'translateY(-5px) scale(1.025)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 2px 8px ${s.glow}`; e.currentTarget.style.transform = 'translateY(0) scale(1)' }}
      style={{
        background: '#fff', border: `1px solid ${s.border}`,
        borderRadius: 'var(--radius-lg)', padding: '20px 20px 18px',
        position: 'relative', overflow: 'hidden', cursor: 'default',
        boxShadow: `0 2px 8px ${s.glow}`,
        transition: 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.22s ease',
      }}
    >
      {/* diagonal bg wash */}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${s.bg}80 0%, transparent 60%)`, pointerEvents: 'none' }} />
      {/* top accent stripe */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${s.accent}, ${s.accent}55)` }} />

      {/* icon left + value right */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, position: 'relative' }}>
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <div className="trp-kpi-icon" style={{
            width: 46, height: 46, borderRadius: 'var(--radius-md)',
            background: s.bg, border: `1.5px solid ${s.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: s.accent, boxShadow: `0 3px 10px ${s.glow}`,
            position: 'relative', zIndex: 1,
          }}>
            <Icon size={20} strokeWidth={2} />
          </div>
          <div className="trp-kpi-ring" style={{
            position: 'absolute', inset: -5, borderRadius: 'var(--radius-md)',
            border: `2px solid ${s.accent}`, opacity: 0, pointerEvents: 'none',
          }} />
        </div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: '2.4rem',
          fontWeight: 800, color: s.accent, lineHeight: 1,
          letterSpacing: '-0.04em', position: 'relative',
        }}>{value}</div>
      </div>

      {/* label + sub */}
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: '0.73rem', fontWeight: 700, color: s.accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 400 }}>{sub}</div>}
      </div>
    </div>
  )
}

function Card({ title, children, style }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 18, ...style }}>
      {title && <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>{title}</div>}
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      {children}
    </div>
  )
}

export default function Trips() {
  const [view, setView]             = useState('list')
  const [showCreate, setShowCreate] = useState(false)
  const [trips, setTrips]           = useState([])
  const [vehicles, setVehicles]     = useState([])
  const [drivers, setDrivers]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [page, setPage]             = useState(1)
  const pageSize = 8

  const [form, setForm]             = useState(EMPTY)
  const [autoDriver, setAutoDriver] = useState(null)
  const [saving, setSaving]         = useState(false)

  const [selected, setSelected]         = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const toast = useToast()

  const load = () => {
    setLoading(true)
    Promise.all([tripAPI.getAll(), vehicleAPI.getAll({ status: 'active' }), driverAPI.getAll()])
      .then(([t, v, d]) => {
        setTrips(t.data.data || [])
        setVehicles(v.data.data || [])
        setDrivers(d.data.data || [])
      })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const getDriver = id => drivers.find(d => String(d.id) === String(id))

  const counts = useMemo(() => ({
    total:     trips.length,
    upcoming:  trips.filter(t => t.status === 'scheduled').length,
    ongoing:   trips.filter(t => t.status === 'in_progress').length,
    completed: trips.filter(t => t.status === 'completed').length,
    cancelled: trips.filter(t => t.status === 'cancelled').length,
  }), [trips])

  const filteredTrips = useMemo(() => {
    if (!search.trim()) return trips
    const q = search.toLowerCase()
    return trips.filter(t => {
      const driver = getDriver(t.driver_id)
      return [tripCode(t.id), t.vehicle?.registration_no, driver?.user?.name, t.start_location, t.end_location, t.purpose, t.status]
        .filter(Boolean).join(' ').toLowerCase().includes(q)
    })
  }, [trips, search, drivers])

  const totalPages = Math.max(1, Math.ceil(filteredTrips.length / pageSize))
  const pageTrips  = filteredTrips.slice((page - 1) * pageSize, page * pageSize)
  useEffect(() => { setPage(1) }, [search])

  const openCreate = () => { setForm(EMPTY); setAutoDriver(null); setShowCreate(true) }

  const handleVehicleChange = (e) => {
    const vid = e.target.value
    const assigned = drivers.find(d => String(d.assigned_vehicle_id) === String(vid))
    setAutoDriver(assigned || null)
    setForm(p => ({ ...p, vehicle_id: vid, driver_id: assigned ? String(assigned.id) : '' }))
  }
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  // Admin schedules a trip — status becomes 'scheduled', driver is notified
  const handleSchedule = async () => {
    if (!form.vehicle_id) { toast.error('Select a vehicle'); return }
    if (!form.driver_id)  { toast.error('Select a driver');  return }
    setSaving(true)
    try {
      await tripAPI.scheduleTrip(form)
      toast.success('Trip scheduled — driver notified!')
      setShowCreate(false)
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to schedule') }
    finally { setSaving(false) }
  }

  const handleCancel = async (trip) => {
    if (!window.confirm(`Cancel ${tripCode(trip.id)}?`)) return
    try {
      await tripAPI.cancelTrip(trip.id)
      toast.success('Trip cancelled')
      if (view === 'detail') setView('list')
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to cancel') }
  }

  const openDetail = async (trip) => {
    setView('detail')
    setDetailLoading(true)
    try {
      const res = await tripAPI.getById(trip.id)
      setSelected(res.data.data)
    } catch {
      toast.error('Failed to load trip details')
      setSelected(trip)
    } finally { setDetailLoading(false) }
  }

  const fullDriver = selected ? getDriver(selected.driver_id) : null


  // ============================== DETAIL VIEW ==============================
  if (view === 'detail') {
    const t = selected
    const isScheduled  = t?.status === 'scheduled'
    const isInProgress = t?.status === 'in_progress'
    const isCompleted  = t?.status === 'completed'

    const startOdometer = t?.start_odometer != null
      ? t.start_odometer
      : (t?.vehicle?.odometer_km ?? null)

    const fmtDt = (v) => v
      ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '—'

    const card  = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '24px 28px' }
    const secTi = { fontSize: '0.95rem', fontWeight: 700, color: '#111827', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #f3f4f6' }
    const lbl   = { fontSize: '0.68rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }
    const val   = { fontSize: '0.92rem', fontWeight: 500, color: '#111827' }
    const div   = { borderTop: '1px solid #f3f4f6', margin: '20px 0' }

    const F = ({ label, value, mono, color, children }) => (
      <div>
        <div style={lbl}>{label}</div>
        {children
          ? children
          : <div style={{ ...val, fontFamily: mono ? 'monospace' : undefined, color: color || '#111827' }}>{value ?? '—'}</div>}
      </div>
    )

    const priorityMeta = {
      low:    { bg: '#f3f4f6', color: '#6b7280',  text: 'LOW'    },
      normal: { bg: '#dbeafe', color: '#1d4ed8',  text: 'NORMAL' },
      high:   { bg: '#fef3c7', color: '#d97706',  text: 'HIGH'   },
      urgent: { bg: '#fee2e2', color: '#dc2626',  text: 'URGENT' },
    }[t?.priority || 'normal'] || { bg: '#dbeafe', color: '#1d4ed8', text: 'NORMAL' }

    const statusMeta = {
      scheduled:   { bg: '#fef3c7', color: '#d97706', text: 'UPCOMING'   },
      in_progress: { bg: '#dbeafe', color: '#1d4ed8',  text: 'ONGOING'    },
      completed:   { bg: '#dcfce7', color: '#16a34a',  text: 'COMPLETED'  },
      cancelled:   { bg: '#fee2e2', color: '#dc2626',  text: 'CANCELLED'  },
    }[t?.status] || { bg: '#f3f4f6', color: '#6b7280', text: t?.status || '—' }

    const pill = (meta) => (
      <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 999, background: meta.bg, color: meta.color, fontSize: '0.75rem', fontWeight: 700 }}>
        {meta.text}
      </span>
    )

    return (
      <div style={{ background: '#f4f6f8', minHeight: '100%' }} className="page">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={() => setView('list')} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}>
              <ArrowLeft size={16} />
            </button>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: 3 }}>Dashboard / Trips / Trip Details</div>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: '#111827' }}>Trip Details</h1>
            </div>
          </div>
          {t && (t.status === 'scheduled' || t.status === 'in_progress') && (
            <button onClick={() => handleCancel(t)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', border: '1px solid #fca5a5', borderRadius: 8, background: '#fff', color: '#dc2626', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
              Cancel Trip
            </button>
          )}
        </div>

        {detailLoading || !t ? (
          <LoadingState label="Loading trip…" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Row 1 — Trip Info + Assigned Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

              <div style={card}>
                <div style={secTi}>Trip Information</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <F label="Trip ID">
                    <div style={{ fontFamily: 'monospace', fontSize: '1.05rem', fontWeight: 800, color: '#d97706' }}>{tripCode(t.id)}</div>
                  </F>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <F label="From">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.92rem', fontWeight: 500, color: '#111827' }}>
                        <MapPin size={13} color="#10b981" /> {t.start_location || '—'}
                      </div>
                    </F>
                    <F label="To">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.92rem', fontWeight: 500, color: '#111827' }}>
                        <MapPin size={13} color="#3b82f6" /> {t.end_location || '—'}
                      </div>
                    </F>
                  </div>
                  <F label="Reporting Time" value={fmtDt(t.reporting_time)} mono />
                  <F label="Purpose" value={t.purpose || '—'} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <F label="Priority">{pill(priorityMeta)}</F>
                    <F label="Status">{pill(statusMeta)}</F>
                  </div>
                </div>
              </div>

              <div style={card}>
                <div style={secTi}>Assigned Details</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <F label="Driver">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <User size={16} color="#3b82f6" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#111827' }}>{t.driver?.user?.name || `Driver #${t.driver_id}`}</div>
                        <div style={{ fontSize: '0.76rem', color: '#6b7280', marginTop: 1 }}>{fullDriver?.user?.phone || t.driver?.license_number || '—'}</div>
                      </div>
                    </div>
                  </F>
                  <F label="Vehicle">
                    <div style={{ marginTop: 4 }}>
                      <div style={{ fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 800, color: '#3b82f6' }}>{t.vehicle?.registration_no || '—'}</div>
                      <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 2 }}>{[t.vehicle?.make, t.vehicle?.model].filter(Boolean).join(' ') || '—'}</div>
                    </div>
                  </F>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <F label="Estimated Distance" value={t.estimated_distance ? `${t.estimated_distance}  km` : '—'} mono />
                    <F label="Start Odometer">
                      <div style={{ marginTop: 4 }}>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.92rem', fontWeight: 600, color: '#111827' }}>
                          {startOdometer != null ? `${startOdometer}  km` : '—'}
                        </div>
                        {t.start_odometer != null
                          ? <div style={{ fontSize: '0.68rem', color: '#16a34a', marginTop: 3 }}>Recorded at trip start</div>
                          : t.vehicle?.odometer_km != null
                            ? <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: 3 }}>From vehicle (not started yet)</div>
                            : null}
                      </div>
                    </F>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2 — Cargo & Customer */}
            <div style={card}>
              <div style={secTi}>Cargo & Customer</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                <F label="Cargo Type"     value={t.cargo_type    || '—'} />
                <F label="Cargo Weight"   value={t.cargo_weight  ? `${t.cargo_weight} kg` : '—'} mono />
                <F label="Customer Name"  value={t.customer_name  || '—'} />
                <F label="Customer Phone" value={t.customer_phone || '—'} mono />
              </div>
              {t.pickup_address && (
                <>
                  <div style={div} />
                  <F label="Pickup Address" value={t.pickup_address} />
                </>
              )}
            </div>

            {/* Row 3 — Trip Progress + Route */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

              <div style={card}>
                <div style={secTi}>Trip Progress</div>
                {isScheduled && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Clock size={14} color="#d97706" />
                    <span style={{ fontSize: '0.84rem', color: '#d97706', fontWeight: 600 }}>Waiting for driver to start trip…</span>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <F label="Started At"       value={fmtDt(t.start_time)} mono />
                  <F label="Ended At"         value={fmtDt(t.end_time)}   mono />
                  <F label="Distance Covered" value={t.distance_km ? `${parseFloat(t.distance_km).toFixed(1)} km` : '—'} mono />
                  <F label="End Odometer"     value={t.end_odometer != null ? `${t.end_odometer} km` : '—'} mono />
                </div>
                {isCompleted && (
                  <>
                    <div style={div} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                      <F label="Fuel Filled">
                        {t.fuel_filled
                          ? <div><div style={{ fontWeight: 700, color: '#16a34a', fontSize: '0.92rem' }}>Yes</div><div style={{ fontSize: '0.76rem', color: '#6b7280', marginTop: 2 }}>{t.fuel_used} L · Rs. {t.fuel_cost}</div></div>
                          : <div style={{ color: '#6b7280', fontWeight: 500, fontSize: '0.92rem' }}>No</div>}
                      </F>
                      <F label="Toll Charges" value={t.toll_charges ? `Rs. ${t.toll_charges}` : '—'} mono />
                    </div>
                  </>
                )}
              </div>

              <div style={card}>
                <div style={secTi}>Route</div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 3px #dcfce7' }} />
                    <div style={{ width: 2, height: 44, background: '#e5e7eb', margin: '4px 0' }} />
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 0 3px #fee2e2' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1 }}>
                    <div style={{ marginBottom: 28 }}>
                      <div style={lbl}>FROM</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <MapPin size={13} color="#22c55e" />
                        <span style={{ fontWeight: 600, fontSize: '0.92rem', color: '#111827' }}>{t.start_location || 'Not set'}</span>
                      </div>
                    </div>
                    <div>
                      <div style={lbl}>TO</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <MapPin size={13} color="#ef4444" />
                        <span style={{ fontWeight: 600, fontSize: '0.92rem', color: '#111827' }}>{t.end_location || 'Not set'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {t.estimated_distance && (
                  <>
                    <div style={div} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb', borderRadius: 8, padding: '10px 14px' }}>
                      <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>Estimated Distance</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#111827' }}>{t.estimated_distance} km</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Row 4 — Notes */}
            {t.notes && (
              <div style={card}>
                <div style={secTi}>Notes</div>
                <p style={{ fontSize: '0.9rem', color: '#374151', margin: 0, lineHeight: 1.7 }}>{t.notes}</p>
              </div>
            )}

          </div>
        )}
      </div>
    )
  }

  // ============================== LIST VIEW ==============================
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Breadcrumb items={['Dashboard', 'Trips']} />
          <h1 className="page-title" style={{ margin: 0 }}>Trip Management</h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-icon" onClick={load} title="Refresh"><RefreshCw size={14} /></button>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> Create Trip</button>
        </div>
      </div>

      <style>{STAT_CSS}</style>
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 20 }}>
        <StatCard icon={Route}        label="Total Trips"     value={counts.total}     color="purple" sub="All Time"    />
        <StatCard icon={CalendarCheck} label="Upcoming Trips" value={counts.upcoming}  color="amber"  sub="Scheduled"  />
        <StatCard icon={Activity}     label="Ongoing Trips"   value={counts.ongoing}   color="blue"   sub="In Progress" />
        <StatCard icon={CheckCircle2} label="Completed"       value={counts.completed} color="green"  sub="Completed"  />
        <StatCard icon={XCircle}      label="Cancelled Trips" value={counts.cancelled} color="red"    sub="Cancelled"  />
      </div>

      <div style={{ position: 'relative', maxWidth: 320, marginBottom: 16 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
        <input className="input" style={{ paddingLeft: 34 }} placeholder="Search trip, vehicle, driver…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="table-container">
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>#</th><th>Trip ID</th><th>From</th><th>To</th><th>Driver</th><th>Vehicle</th><th>Reporting Time</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9}><LoadingState label="Loading trips…" /></td></tr>
              ) : pageTrips.length === 0 ? (
                <tr><td colSpan={9}><EmptyState icon="🚚" title="No trips found" sub={search ? 'Try a different search' : 'Create one to get started'} /></td></tr>
              ) : pageTrips.map((t, i) => {
                const driver = getDriver(t.driver_id)
                return (
                  <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => openDetail(t)}>
                    <td>{(page - 1) * pageSize + i + 1}</td>
                    <td><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: '0.8rem' }}>{tripCode(t.id)}</span></td>
                    <td style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.start_location || '—'}</td>
                    <td style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.end_location || '—'}</td>
                    <td style={{ fontSize: '0.84rem' }}>{driver?.user?.name || (driver ? `Driver #${driver.id}` : `#${t.driver_id}`)}</td>
                    <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{t.vehicle?.registration_no || '—'}</span></td>
                    <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {t.reporting_time ? new Date(t.reporting_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </span></td>
                    <td><span className={`badge ${STATUS_BADGE[t.status] || 'badge-slate'}`}>{STATUS_LABEL[t.status] || t.status}</span></td>
                    <td onClick={e => e.stopPropagation()}>
                      <button className="btn-icon" onClick={() => openDetail(t)} title="View details"><Eye size={14} /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && filteredTrips.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <span>Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredTrips.length)} of {filteredTrips.length} entries</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-icon" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 6).map(p => (
              <button key={p} className="btn-icon" onClick={() => setPage(p)}
                style={p === page ? { background: 'var(--brand)', color: 'white' } : {}}>{p}</button>
            ))}
            <button className="btn-icon" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      )}

      {/* Schedule Trip Modal */}
      {showCreate && (
        <div onClick={() => setShowCreate(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px 14px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>Schedule Trip</div>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: '1rem', color: '#6b7280' }}>✕</button>
            </div>

            <div style={{ padding: '0 24px 20px', display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>

              {/* From / To */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>From Location</label>
                  <input style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} value={form.start_location} onChange={f('start_location')} placeholder="e.g. Bengaluru Warehouse" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>To Location</label>
                  <input style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} value={form.end_location} onChange={f('end_location')} placeholder="e.g. Mysuru Depot" />
                </div>
              </div>

              {/* Driver / Vehicle */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>Driver *</label>
                  {autoDriver ? (
                    <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle2 size={15} color="#16a34a" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{autoDriver.user?.name || `Driver #${autoDriver.id}`}</div>
                        <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Auto-assigned · {autoDriver.license_number}</div>
                      </div>
                      <button style={{ fontSize: '0.72rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}
                        onClick={() => { setAutoDriver(null); setForm(p => ({ ...p, driver_id: '' })) }}>Change</button>
                    </div>
                  ) : (
                    <select style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} value={form.driver_id} onChange={f('driver_id')}>
                      <option value="">Select driver...</option>
                      {drivers.filter(d => d.status === 'available').map(d => (
                        <option key={d.id} value={d.id}>{d.user?.name || `Driver #${d.id}`} — {d.license_number}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>Vehicle *</label>
                  <select style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} value={form.vehicle_id} onChange={handleVehicleChange}>
                    <option value="">Select vehicle...</option>
                    {vehicles.filter(v => !v.on_trip && v.status === 'active').map(v => (
                      <option key={v.id} value={v.id}>{v.registration_no} — {v.make} {v.model}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Purpose */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>Purpose</label>
                <select style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} value={form.purpose} onChange={f('purpose')}>
                  <option value="">Select purpose...</option>
                  <option value="Delivery">Delivery</option>
                  <option value="Pickup">Pickup</option>
                  <option value="Transport">Transport</option>
                  <option value="Service">Service / Maintenance</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Distance + Reporting Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>Estimated Distance (km)</label>
                  <input style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} type="number" value={form.estimated_distance} onChange={f('estimated_distance')} placeholder="e.g. 140" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>Reporting Time</label>
                  <input style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} type="datetime-local" value={form.reporting_time} onChange={f('reporting_time')} />
                </div>
              </div>

              {/* Priority */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>Priority</label>
                <select style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} value={form.priority} onChange={f('priority')}>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Cargo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>Cargo Type</label>
                  <input style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} value={form.cargo_type} onChange={f('cargo_type')} placeholder="e.g. Electronics, FMCG" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>Cargo Weight (kg)</label>
                  <input style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} type="number" value={form.cargo_weight} onChange={f('cargo_weight')} placeholder="e.g. 500" />
                </div>
              </div>

              {/* Customer */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>Customer Name</label>
                  <input style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} value={form.customer_name} onChange={f('customer_name')} placeholder="e.g. Ramesh Traders" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>Customer Phone</label>
                  <input style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} type="tel" value={form.customer_phone} onChange={f('customer_phone')} placeholder="e.g. 9876543210" />
                </div>
              </div>

              {/* Pickup address */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>Pickup Address</label>
                <input style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} value={form.pickup_address} onChange={f('pickup_address')} placeholder="Exact pickup address" />
              </div>

              {/* Notes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>Notes</label>
                <textarea style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} rows={2} value={form.notes} onChange={f('notes')} placeholder="Any special instructions…" />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 24px', borderTop: '1px solid #e5e7eb' }}>
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSchedule} disabled={saving}>
                {saving ? 'Scheduling…' : 'Schedule Trip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}