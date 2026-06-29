import { useState, useEffect, useRef } from 'react'
import { Plus, Search, Pencil, Trash2, Truck, RefreshCw, Camera, ArrowLeft, Eye } from 'lucide-react'
import { vehicleAPI, maintenanceAPI, fuelAPI, tripAPI, documentAPI } from '../services/api'
import { mlVehicleAPI } from '../services/mlApi'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import { LoadingState, EmptyState } from '../components/Common'

const STATUS_BADGE = { active: 'badge-green', inactive: 'badge-slate', maintenance: 'badge-amber', retired: 'badge-red' }
const TYPE_BADGE   = { truck: 'badge-amber', van: 'badge-blue', car: 'badge-green', bus: 'badge-purple', bike: 'badge-slate' }

const EMPTY = {
  registration_no: '', make: '', model: '', year: '',
  type: 'car', fuel_type: 'diesel', status: 'active',
  odometer_km: 0, capacity_kg: '', color: '', vin_number: '',
  insurance_expiry: '', rc_expiry: '', photo_url: '',
}

function toISO(val) {
  if (!val) return undefined
  val = String(val).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val
  if (/^\d{2}-\d{2}-\d{4}$/.test(val)) { const [d, m, y] = val.split('-'); return `${y}-${m}-${d}` }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) { const [d, m, y] = val.split('/'); return `${y}-${m}-${d}` }
  return undefined
}

function ScoreBadge({ score }) {
  if (score == null) return <span style={{ color: '#9ca3af', fontSize: '0.78rem' }}>—</span>
  const color = score >= 70 ? '#16a34a' : score >= 40 ? '#d97706' : '#dc2626'
  const label = score >= 70 ? 'Good' : score >= 40 ? 'Fair' : 'Critical'
  const bg    = score >= 70 ? '#dcfce7' : score >= 40 ? '#fef3c7' : '#fee2e2'
  const dash  = (score / 100) * 81.7
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width="34" height="34" viewBox="0 0 34 34">
        <circle cx="17" cy="17" r="13" fill="none" stroke="#e5e7eb" strokeWidth="3" />
        <circle cx="17" cy="17" r="13" fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${dash} 81.7`} strokeLinecap="round" transform="rotate(-90 17 17)" />
        <text x="17" y="21" textAnchor="middle" fontSize="7" fontWeight="700" fill={color}>{score}</text>
      </svg>
      <span style={{ fontSize: '0.73rem', fontWeight: 600, color, background: bg, padding: '2px 8px', borderRadius: '999px' }}>{label}</span>
    </div>
  )
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
const expiryColor = (d) => {
  if (!d) return '#6b7280'
  const days = (new Date(d) - new Date()) / 86400000
  return days < 0 ? '#dc2626' : days < 30 ? '#d97706' : '#374151'
}

/* ── Vehicle Detail Full Page ─────────────────────────────── */
function VehicleDetail({ vehicle, healthScore, onBack, onEdit, onDelete }) {
  const [tab,         setTab]         = useState('service')
  const [maintenance, setMaintenance] = useState([])
  const [fuelLogs,    setFuelLogs]    = useState([])
  const [trips,       setTrips]       = useState([])
  const [documents,   setDocuments]   = useState([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      maintenanceAPI.getAll({ vehicle_id: vehicle.id }),
      fuelAPI.getAll({ vehicle_id: vehicle.id }),
      tripAPI.getAll({ vehicle_id: vehicle.id }),
      documentAPI.getAll({ vehicle_id: vehicle.id }),
    ]).then(([m, f, t, d]) => {
      setMaintenance(m.data.data || [])
      setFuelLogs(f.data.data   || [])
      setTrips(t.data.data      || [])
      setDocuments(d.data.data  || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [vehicle.id])

  const TABS = [
    { id: 'service',     label: 'Service History' },
    { id: 'documents',   label: 'Documents' },
    { id: 'trips',       label: 'Trips' },
    { id: 'fuel',        label: 'Fuel Logs' },
    { id: 'maintenance', label: 'Maintenance' },
  ]

  return (
    <div className="page-enter">
      {/* ← back */}
      <button onClick={onBack}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.2rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}>
        <ArrowLeft size={18} />
      </button>

      {/* breadcrumb + title */}
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Vehicle Details</h1>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3 }}>Dashboard › Vehicles › Vehicle Details</div>
      </div>

      {/* White card */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 20 }}>

        {/* Top section: photo left, info right */}
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 0 }}>

          {/* Photo + status strip */}
          <div style={{ padding: '20px', borderRight: '1px solid var(--border)' }}>
            {vehicle.photo_url
              ? <img src={vehicle.photo_url} alt="vehicle" style={{ width: '100%', height: 160, objectFit: 'contain', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: '#f9fafb' }} />
              : <div style={{ width: '100%', height: 160, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: '#f0f4ff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <Truck size={48} color="#93c5fd" />
                  <span style={{ fontSize: 12, color: '#93c5fd' }}>No photo</span>
                </div>
            }

            {/* Status rows below photo */}
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Status', value: (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span className={`badge ${STATUS_BADGE[vehicle.status] || 'badge-slate'}`} style={{ fontSize: 11 }}>{vehicle.status}</span>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: vehicle.status === 'active' ? '#16a34a' : '#9ca3af', display: 'inline-block' }} />
                  </span>
                )},
                { label: 'Availability', value: (
                  vehicle.on_trip ? (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', borderRadius: 999, padding: '4px 12px', letterSpacing: '0.03em' }}>ON TRIP</span>
                  ) : vehicle.status === 'active' ? (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', background: '#dcfce7', borderRadius: 999, padding: '4px 12px', letterSpacing: '0.03em' }}>AVAILABLE</span>
                  ) : (
                    <span style={{ fontSize: 13, color: '#9ca3af' }}>—</span>
                  )
                )},
                { label: 'Insurance Expiry', value: <span style={{ fontSize: 13, color: expiryColor(vehicle.insurance_expiry) }}>{fmtDate(vehicle.insurance_expiry)}</span> },
                { label: 'RC Expiry',        value: <span style={{ fontSize: 13, color: expiryColor(vehicle.rc_expiry) }}>{fmtDate(vehicle.rc_expiry)}</span> },
                { label: 'Last Service',     value: <span style={{ fontSize: 13 }}>{fmtDate(vehicle.updatedAt)}</span> },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  {value}
                </div>
              ))}
            </div>
          </div>

          {/* Vehicle info */}
          <div style={{ padding: '20px 28px' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 14 }}>Vehicle Information</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 40px' }}>
              {[
                { label: 'Registration Number', value: vehicle.registration_no, mono: true },
                { label: 'Vehicle Model',        value: `${vehicle.make || ''} ${vehicle.model || ''}`.trim() },
                { label: 'Vehicle Type',         value: vehicle.type },
                { label: 'Fuel Type',            value: vehicle.fuel_type },
                { label: 'Manufacturing Year',   value: vehicle.year },
                { label: 'Color',                value: vehicle.color },
                { label: 'Chassis Number',       value: vehicle.vin_number, mono: true },
              ].map(({ label, value, mono }) => (
                <div key={label} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 7 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: mono ? 'var(--font-mono)' : undefined }}>{value || '—'}</div>
                </div>
              ))}
              {healthScore != null && (
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 7 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>ML Health Score</div>
                  <ScoreBadge score={healthScore} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '0 20px', background: 'var(--bg-canvas)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '11px 16px', fontSize: '0.82rem', fontWeight: 600,
              color: tab === t.id ? 'var(--brand)' : 'var(--text-muted)',
              borderBottom: tab === t.id ? '2px solid var(--brand)' : '2px solid transparent',
              background: 'none', border: 'none', cursor: 'pointer',
              whiteSpace: 'nowrap', transition: 'color 0.15s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ padding: '20px 24px', minHeight: 200 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Loading…</div>
          ) : (
            <>
              {/* SERVICE HISTORY */}
              {tab === 'service' && (
                maintenance.length === 0
                  ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No service history yet</div>
                  : <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead><tr style={{ background: 'var(--bg-canvas)' }}>
                        {['#', 'Service Date', 'Service Type', 'Workshop', 'Cost (₹)', 'Next Service', 'Actions'].map(h => (
                          <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {maintenance.map((m, i) => (
                          <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '9px 12px', color: 'var(--text-muted)' }}>{i + 1}</td>
                            <td style={{ padding: '9px 12px' }}>{fmtDate(m.scheduled_date)}</td>
                            <td style={{ padding: '9px 12px', textTransform: 'capitalize' }}>{m.type?.replace('_', ' ') || '—'}</td>
                            <td style={{ padding: '9px 12px' }}>{m.workshop_name || '—'}</td>
                            <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)' }}>{m.cost ? `${Number(m.cost).toLocaleString()}` : '—'}</td>
                            <td style={{ padding: '9px 12px' }}>{fmtDate(m.next_due_date)}</td>
                            <td style={{ padding: '9px 12px' }}>
                              <button style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', color: 'var(--brand)', display: 'flex' }}><Eye size={12} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
              )}

              {/* DOCUMENTS */}
              {tab === 'documents' && (
                documents.length === 0
                  ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No documents uploaded</div>
                  : <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead><tr style={{ background: 'var(--bg-canvas)' }}>
                        {['#', 'Title', 'Type', 'Expiry Date', 'Status'].map(h => (
                          <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontSize: 12 }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {documents.map((d, i) => {
                          const days = d.expiry_date ? (new Date(d.expiry_date) - new Date()) / 86400000 : null
                          const ec = days === null ? '#6b7280' : days < 0 ? '#dc2626' : days < 30 ? '#d97706' : '#16a34a'
                          const es = days === null ? '—' : days < 0 ? 'Expired' : days < 30 ? 'Expiring Soon' : 'Valid'
                          return (
                            <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '9px 12px', color: 'var(--text-muted)' }}>{i + 1}</td>
                              <td style={{ padding: '9px 12px', fontWeight: 500 }}>{d.title}</td>
                              <td style={{ padding: '9px 12px', textTransform: 'capitalize' }}>{d.document_type?.replace('_', ' ')}</td>
                              <td style={{ padding: '9px 12px', color: ec }}>{fmtDate(d.expiry_date)}</td>
                              <td style={{ padding: '9px 12px' }}><span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: ec + '20', color: ec }}>{es}</span></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
              )}

              {/* TRIPS */}
              {tab === 'trips' && (
                trips.length === 0
                  ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No trips recorded</div>
                  : <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead><tr style={{ background: 'var(--bg-canvas)' }}>
                        {['#', 'Trip ID', 'From', 'To', 'Distance', 'Date', 'Status'].map(h => (
                          <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontSize: 12 }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {trips.slice(0, 15).map((t, i) => (
                          <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '9px 12px', color: 'var(--text-muted)' }}>{i + 1}</td>
                            <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', color: 'var(--brand)', fontWeight: 600 }}>TRP{String(t.id).padStart(3,'0')}</td>
                            <td style={{ padding: '9px 12px' }}>{t.start_location || '—'}</td>
                            <td style={{ padding: '9px 12px' }}>{t.end_location   || '—'}</td>
                            <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)' }}>{t.distance_km ? `${parseFloat(t.distance_km).toFixed(1)} km` : '—'}</td>
                            <td style={{ padding: '9px 12px', color: 'var(--text-muted)' }}>{t.start_time ? new Date(t.start_time).toLocaleDateString('en-IN') : '—'}</td>
                            <td style={{ padding: '9px 12px' }}><span className={`badge ${STATUS_BADGE[t.status] || 'badge-slate'}`}>{t.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
              )}

              {/* FUEL LOGS */}
              {tab === 'fuel' && (
                fuelLogs.length === 0
                  ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No fuel logs yet</div>
                  : <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead><tr style={{ background: 'var(--bg-canvas)' }}>
                        {['#', 'Date', 'Litres', 'Cost/L', 'Total', 'Station'].map(h => (
                          <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontSize: 12 }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {fuelLogs.slice(0, 15).map((fl, i) => (
                          <tr key={fl.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '9px 12px', color: 'var(--text-muted)' }}>{i + 1}</td>
                            <td style={{ padding: '9px 12px', color: 'var(--text-muted)' }}>{fl.filled_at ? new Date(fl.filled_at).toLocaleDateString('en-IN') : '—'}</td>
                            <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)' }}>{fl.litres ? `${fl.litres}L` : '—'}</td>
                            <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)' }}>{fl.cost_per_litre ? `₹${fl.cost_per_litre}` : '—'}</td>
                            <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fl.total_cost ? `₹${Number(fl.total_cost).toLocaleString()}` : '—'}</td>
                            <td style={{ padding: '9px 12px' }}>{fl.station_name || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
              )}

              {/* MAINTENANCE */}
              {tab === 'maintenance' && (
                maintenance.length === 0
                  ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No maintenance records</div>
                  : <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead><tr style={{ background: 'var(--bg-canvas)' }}>
                        {['#', 'Type', 'Scheduled', 'Status', 'Cost', 'Next Due'].map(h => (
                          <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontSize: 12 }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {maintenance.map((m, i) => (
                          <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '9px 12px', color: 'var(--text-muted)' }}>{i + 1}</td>
                            <td style={{ padding: '9px 12px', textTransform: 'capitalize' }}>{m.type?.replace('_', ' ')}</td>
                            <td style={{ padding: '9px 12px', color: 'var(--text-muted)' }}>{fmtDate(m.scheduled_date)}</td>
                            <td style={{ padding: '9px 12px' }}><span className={`badge ${STATUS_BADGE[m.status] || 'badge-slate'}`}>{m.status}</span></td>
                            <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)' }}>{m.cost ? `₹${Number(m.cost).toLocaleString()}` : '—'}</td>
                            <td style={{ padding: '9px 12px', color: expiryColor(m.next_due_date) }}>{fmtDate(m.next_due_date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════ */
export default function Vehicles() {
  const [vehicles,     setVehicles]     = useState([])
  const [healthMap,    setHealthMap]    = useState({})
  const [mlLoading,    setMlLoading]    = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modal,        setModal]        = useState(null)
  const [selected,     setSelected]     = useState(null)
  const [detailVehicle,setDetailVehicle]= useState(null)   // ← drives full-page detail
  const [form,         setForm]         = useState(EMPTY)
  const [preview,      setPreview]      = useState(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)
  const [saving,       setSaving]       = useState(false)
  const fileRef = useRef(null)
  const toast   = useToast()

  const load = () => {
    setLoading(true)
    Promise.all([
      vehicleAPI.getAll({ status: statusFilter || undefined }),
      tripAPI.getAll({ status: 'in_progress' }),
    ])
      .then(([vRes, tRes]) => {
        const list = vRes.data.data || []
        const activeTrips = tRes.data.data || []
        const onTripIds = new Set(activeTrips.map(t => t.vehicle_id))
        const merged = list.map(v => ({ ...v, on_trip: onTripIds.has(v.id) }))
        setVehicles(merged)
        return merged
      })
      .then(list => fetchML(list))
      .catch(() => toast.error('Failed to load vehicles'))
      .finally(() => setLoading(false))
  }

  const fetchML = async (list) => {
    try {
      const ping = await fetch('http://localhost:8000/health')
      if (!ping.ok) return
      setMlLoading(true)
      const maintRes  = await maintenanceAPI.getAll({}).catch(() => ({ data: { data: [] } }))
      const maintList = maintRes.data.data || []
      const requests  = list.map(v => ({
        vehicle_id: v.id, registration_no: v.registration_no,
        year: parseInt(v.year) || 2020, odometer_km: parseFloat(v.odometer_km) || 0,
        fuel_type: v.fuel_type || 'diesel', status: v.status,
        maintenance_count:   maintList.filter(m => m.vehicle_id === v.id).length,
        overdue_maintenance: maintList.filter(m => m.vehicle_id === v.id && m.status === 'overdue').length,
        fuel_logs_count: 0, avg_fuel_consumption: 0.1,
        last_service_days_ago: 30, total_trips: 0, alerts_count: 0,
      }))
      const res = await mlVehicleAPI.scoreBatch(requests)
      const map = {}; res.data.forEach(r => { map[r.vehicle_id] = r })
      setHealthMap(map)
    } catch {}
    finally { setMlLoading(false) }
  }

  useEffect(() => { load() }, [statusFilter])

  const openAdd = () => { setForm(EMPTY); setPreview(null); setPhotoRemoved(false); setSelected(null); setModal('add') }
  const openEdit = (v) => {
    setForm({
      registration_no: v.registration_no || '', make: v.make || '', model: v.model || '',
      year: v.year || '', type: v.type || 'car', fuel_type: v.fuel_type || 'diesel',
      status: v.status || 'active', odometer_km: v.odometer_km || 0,
      capacity_kg: v.capacity_kg || '', color: v.color || '', vin_number: v.vin_number || '',
      insurance_expiry: v.insurance_expiry || '', rc_expiry: v.rc_expiry || '', photo_url: v.photo_url || '',
    })
    setPreview(v.photo_url || null); setPhotoRemoved(false)
    setSelected(v); setModal('edit')
  }
  const openDelete = (v) => { setSelected(v); setModal('delete') }

  const handlePhoto = (e) => {
    const file = e.target.files[0]; if (!file) return
    if (file.size > 3 * 1024 * 1024) { toast.error('Photo must be under 3MB'); return }
    const reader = new FileReader()
    reader.onloadend = () => { setPreview(reader.result); setForm(p => ({ ...p, photo_url: reader.result })); setPhotoRemoved(false) }
    reader.readAsDataURL(file); e.target.value = ''
  }

  const handleSave = async () => {
    if (!form.registration_no.trim()) { toast.error('Registration number is required'); return }
    setSaving(true)
    try {
      const payload = {}
      if (form.registration_no) payload.registration_no = form.registration_no.trim().toUpperCase()
      if (form.make)            payload.make            = form.make
      if (form.model)           payload.model           = form.model
      if (form.year)            payload.year            = parseInt(form.year)
      if (form.type)            payload.type            = form.type
      if (form.fuel_type)       payload.fuel_type       = form.fuel_type
      if (form.status)          payload.status          = form.status
      payload.odometer_km = parseFloat(form.odometer_km) || 0
      if (form.color)           payload.color           = form.color
      if (form.vin_number)      payload.vin_number      = form.vin_number
      if (form.capacity_kg)     payload.capacity_kg     = parseFloat(form.capacity_kg)
      if (form.photo_url)       payload.photo_url       = form.photo_url
      else if (photoRemoved)    payload.photo_url       = ''
      const ins = toISO(form.insurance_expiry); const rc = toISO(form.rc_expiry)
      if (ins) payload.insurance_expiry = ins
      if (rc)  payload.rc_expiry        = rc
      if (modal === 'add') { await vehicleAPI.create(payload); toast.success('Vehicle added') }
      else                 { await vehicleAPI.update(selected.id, payload); toast.success('Vehicle updated') }
      setModal(null); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await vehicleAPI.remove(selected.id); toast.success('Deleted')
      setModal(null); setDetailVehicle(null); load()
    } catch { toast.error('Delete failed') }
    finally { setSaving(false) }
  }

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const filtered = vehicles.filter(v =>
    v.registration_no?.toLowerCase().includes(search.toLowerCase()) ||
    v.make?.toLowerCase().includes(search.toLowerCase()) ||
    v.model?.toLowerCase().includes(search.toLowerCase())
  )

  const expiryColor = (d) => {
    if (!d) return '#9ca3af'
    const days = (new Date(d) - new Date()) / 86400000
    return days < 0 ? '#dc2626' : days < 30 ? '#d97706' : '#374151'
  }

  const total       = vehicles.length
  const active      = vehicles.filter(v => v.status === 'active').length
  const maintenance = vehicles.filter(v => v.status === 'maintenance').length
  const inactive     = vehicles.filter(v => v.status === 'inactive' || v.status === 'retired').length
  const onTrip       = vehicles.filter(v => v.on_trip).length

  /* ── If detail view is open, render it full page ── */
  if (detailVehicle) {
    return (
      <VehicleDetail
        vehicle={detailVehicle}
        healthScore={healthMap[detailVehicle.id]?.health_score}
        onBack={() => setDetailVehicle(null)}
        onEdit={() => { openEdit(detailVehicle); setDetailVehicle(null) }}
        onDelete={() => { openDelete(detailVehicle); setDetailVehicle(null) }}
      />
    )
  }

  /* ── List view ── */
  return (
    <div className="page-enter">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Vehicle <span style={{ color: 'var(--brand)' }}>Management</span>
          </h1>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>Dashboard › Vehicles</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn-icon" onClick={load} title="Refresh"><RefreshCw size={14} /></button>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Add Vehicle</button>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total Vehicles', value: total,       icon: '🚚', sub: 'All Vehicles',  color: 'var(--brand)', bg: 'var(--brand-light)' },
          { label: 'Active',         value: active,      icon: '✅', sub: 'In Operation',  color: 'var(--green)', bg: 'var(--green-bg)'   },
          { label: 'On Trip',        value: onTrip,      icon: '🚛', sub: 'Currently on Trip', color: '#1d4ed8',      bg: '#eff6ff'            },
          { label: 'In Maintenance', value: maintenance, icon: '🔧', sub: 'Under Service', color: 'var(--amber)', bg: 'var(--amber-bg)'   },
          { label: 'Inactive',       value: inactive,    icon: '⚠️', sub: 'Not in Use',    color: 'var(--red)',   bg: 'var(--red-bg)'     },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px' }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 700, color: s.color, lineHeight: 1.1 }}>{s.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input className="input" placeholder="Search vehicle..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
        </div>
        <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="">All Status</option>
          {['active', 'inactive', 'maintenance', 'retired'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Registration No.</th><th>Vehicle Model</th><th>Vehicle Type</th>
                <th>Fuel Type</th><th>Status</th><th>Availability</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8}><LoadingState label="Loading vehicles…" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8}><EmptyState icon="🚚" title="No vehicles found" sub="Add a vehicle to get started" /></td></tr>
              ) : filtered.map((v, i) => (
                <tr key={v.id} style={{ cursor: 'pointer' }} onClick={() => setDetailVehicle(v)}>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{i + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {v.photo_url
                        ? <img src={v.photo_url} alt="" style={{ width: 30, height: 30, borderRadius: 'var(--radius)', objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} />
                        : <div style={{ width: 30, height: 30, borderRadius: 'var(--radius)', background: 'var(--brand-light)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Truck size={13} color="var(--brand)" />
                          </div>
                      }
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand)', fontSize: '0.82rem', fontWeight: 600 }}>{v.registration_no}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: '0.84rem', color: 'var(--text-primary)' }}>{v.make} {v.model}</div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{v.year || '—'}</div>
                  </td>
                  <td><span className={`badge ${TYPE_BADGE[v.type] || 'badge-slate'}`}>{v.type}</span></td>
                  <td><span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>{v.fuel_type}</span></td>
                  <td><span className={`badge ${STATUS_BADGE[v.status] || 'badge-slate'}`}>{v.status}</span></td>
                  <td>
                    {v.on_trip ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', borderRadius: 999, padding: '4px 12px', letterSpacing: '0.03em' }}>ON TRIP</span>
                    ) : v.status === 'active' ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', background: '#dcfce7', borderRadius: 999, padding: '4px 12px', letterSpacing: '0.03em' }}>AVAILABLE</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-icon" title="View" onClick={() => setDetailVehicle(v)}><Eye size={13} /></button>
                      <button className="btn-icon" onClick={() => openEdit(v)}><Pencil size={13} /></button>
                      <button className="btn-icon" onClick={() => openDelete(v)} style={{ color: 'var(--red)' }}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal — unchanged */}
      {(modal === 'add' || modal === 'edit') && (
        <Modal title={modal === 'add' ? 'Add Vehicle' : 'Edit Vehicle'} onClose={() => setModal(null)} wide
          footer={<>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Vehicle'}</button>
          </>}
        >
          <div style={{ marginBottom: 20, borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1.5px dashed var(--border-dark)' }}>
            {preview
              ? <img src={preview} alt="vehicle" style={{ width: '100%', height: 180, objectFit: 'contain', display: 'block', background: 'var(--bg-canvas)' }} />
              : <div onClick={() => fileRef.current?.click()}
                  style={{ width: '100%', height: 180, background: 'var(--bg-canvas)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                  <Camera size={28} color="var(--text-muted)" />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Click to upload or drag and drop</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PNG, JPG up to 3MB</span>
                </div>
            }
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-canvas)' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Optional · JPG/PNG, up to 3MB</span>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => fileRef.current?.click()}>
                <Camera size={12} /> {preview ? 'Change Photo' : 'Add Photo'}
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
          </div>
          <div className="form-grid-2">
            <div className="form-group"><label className="form-label">Registration No *</label><input className="input" value={form.registration_no} onChange={f('registration_no')} placeholder="KA01AB1234" /></div>
            <div className="form-group"><label className="form-label">Make</label><input className="input" value={form.make} onChange={f('make')} placeholder="Tata" /></div>
            <div className="form-group"><label className="form-label">Model</label><input className="input" value={form.model} onChange={f('model')} placeholder="Prima 5530S" /></div>
            <div className="form-group"><label className="form-label">Year</label><input className="input" type="number" value={form.year} onChange={f('year')} placeholder="2022" /></div>
            <div className="form-group"><label className="form-label">Color</label><input className="input" value={form.color} onChange={f('color')} placeholder="White" /></div>
            <div className="form-group"><label className="form-label">Type</label>
              <select className="input" value={form.type} onChange={f('type')}>{['car','van','truck','bus','bike'].map(t => <option key={t}>{t}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Fuel Type</label>
              <select className="input" value={form.fuel_type} onChange={f('fuel_type')}>{['petrol','diesel','electric','hybrid'].map(t => <option key={t}>{t}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Status</label>
              <select className="input" value={form.status} onChange={f('status')}>{['active','inactive','maintenance','retired'].map(t => <option key={t}>{t}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Odometer (km)</label><input className="input" type="number" value={form.odometer_km} onChange={f('odometer_km')} /></div>
            <div className="form-group"><label className="form-label">Capacity (kg)</label><input className="input" type="number" value={form.capacity_kg} onChange={f('capacity_kg')} placeholder="Optional" /></div>
            <div className="form-group"><label className="form-label">Insurance Expiry</label><input className="input" type="date" value={form.insurance_expiry} onChange={f('insurance_expiry')} /></div>
            <div className="form-group"><label className="form-label">RC Expiry</label><input className="input" type="date" value={form.rc_expiry} onChange={f('rc_expiry')} /></div>
          </div>
          <div className="form-group" style={{ marginTop: 14 }}>
            <label className="form-label">VIN Number (Optional)</label>
            <input className="input" value={form.vin_number} onChange={f('vin_number')} placeholder="17-char VIN" />
          </div>
        </Modal>
      )}

      {modal === 'delete' && (
        <Modal title="Confirm Delete" onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting…' : 'Delete'}</button>
          </>}
        >
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Delete <strong style={{ color: 'var(--text-primary)' }}>{selected?.registration_no}</strong>? This cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  )
}