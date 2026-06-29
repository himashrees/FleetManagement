import { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, User, Car, Camera, Eye, ArrowLeft, Phone, MapPin, Shield, Clock } from 'lucide-react'
import { driverAPI, vehicleAPI, tripAPI, documentAPI } from '../services/api'
import { mlDriverAPI } from '../services/mlApi'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import { LoadingState, EmptyState } from '../components/Common'

// ─── Constants ───────────────────────────────────────────────────────────────
const STATUS_BADGE = {
  available: { cls: 'badge-green', dot: '#16a34a', label: 'Available' },
  on_trip:   { cls: 'badge-blue',  dot: '#0284c7', label: 'On Trip'   },
  off_duty:  { cls: 'badge-slate', dot: '#64748b', label: 'Off Duty'  },
  suspended: { cls: 'badge-red',   dot: '#dc2626', label: 'Suspended' },
}
const AVAIL_BADGE = { available: 'badge-green', on_trip: 'badge-blue', off_duty: 'badge-slate', suspended: 'badge-red' }

const EMPTY = {
  name: '', email: '', phone: '',
  license_number: '', license_expiry: '', license_type: 'LMV',
  experience_years: 0, status: 'available',
  address: '', emergency_contact: '', assigned_vehicle_id: '', photo_url: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

function daysUntil(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000)
}

function ExpiryChip({ dateStr }) {
  const days = daysUntil(dateStr)
  if (days === null) return <span style={{ color: 'var(--text-muted)' }}>—</span>
  const color = days < 0 ? 'var(--red)' : days <= 30 ? 'var(--amber)' : 'var(--text-secondary)'
  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color }}>{fmtDate(dateStr)}</span>
}

function SafetyRing({ score }) {
  if (score == null) return <span style={{ color: '#9ca3af', fontSize: '0.78rem' }}>—</span>
  const color = score >= 75 ? '#16a34a' : score >= 55 ? '#d97706' : '#dc2626'
  const dash  = (score / 100) * 75.4
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <svg width="44" height="44" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="18" fill="none" stroke="#e5e7eb" strokeWidth="4" />
        <circle cx="22" cy="22" r="18" fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} 113.1`} strokeLinecap="round" transform="rotate(-90 22 22)" />
        <text x="22" y="27" textAnchor="middle" fontSize="10" fontWeight="700" fill={color}>{score}</text>
      </svg>
    </div>
  )
}

// ─── Driver Detail Full Page ──────────────────────────────────────────────────
function DriverDetail({ driver, trips, safetyData, onBack, onEdit, onDelete }) {
  const [tab,       setTab]       = useState('trips')
  const [documents, setDocuments] = useState([])
  const [docLoad,   setDocLoad]   = useState(false)

  useEffect(() => {
    setDocLoad(true)
    documentAPI.getAll({ driver_id: driver.id })
      .then(r => setDocuments(r.data.data || []))
      .catch(() => {})
      .finally(() => setDocLoad(false))
  }, [driver.id])

  const s = STATUS_BADGE[driver.status] || STATUS_BADGE.available
  const completedTrips = trips.filter(t => t.status === 'completed')
  const totalKm = completedTrips.reduce((sum, t) => sum + (parseFloat(t.distance_km) || 0), 0)

  const TABS = [
    { id: 'trips',     label: 'Trips' },
    { id: 'documents', label: 'Documents' },
    { id: 'license',   label: 'License History' },
    { id: 'emergency', label: 'Emergency Contact' },
  ]

  return (
    <div className="page-enter">
      {/* ← back */}
      <button onClick={onBack}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.2rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}>
        <ArrowLeft size={18} />
      </button>

      {/* breadcrumb */}
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Driver Details</h1>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3 }}>Dashboard › Drivers › Driver Details</div>
      </div>

      {/* White card */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 20 }}>

        {/* Top: photo left, info right */}
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 0 }}>

          {/* Photo + stats */}
          <div style={{ padding: '24px 20px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 120, height: 120, borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '2px solid var(--border)', background: 'var(--bg-canvas)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {driver.photo_url
                ? <img src={driver.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <User size={48} color="var(--text-muted)" />}
            </div>

            {/* Status rows */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Status', value: (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span className={`badge ${s.cls}`} style={{ fontSize: 11 }}>{s.label}</span>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
                  </span>
                )},
                { label: 'Availability', value: <span className={`badge ${s.cls}`} style={{ fontSize: 11 }}>{s.label}</span> },
                { label: 'Total Trips',  value: <span style={{ fontSize: 13, fontWeight: 600 }}>{trips.length}</span> },
                { label: 'Date Joined',  value: <span style={{ fontSize: 12 }}>{fmtDate(driver.createdAt)}</span> },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  {value}
                </div>
              ))}
            </div>
          </div>

          {/* Driver info */}
          <div style={{ padding: '24px 28px' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 14 }}>Driver Information</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 40px' }}>
              {[
                { label: 'Driver Name',      value: driver.user?.name },
                { label: 'Date of Birth',    value: '—' },
                { label: 'License Number',   value: driver.license_number, mono: true },
                { label: 'License Type',     value: driver.license_type },
                { label: 'License Expiry',   value: fmtDate(driver.license_expiry) },
                { label: 'Phone Number',     value: driver.user?.phone },
                { label: 'Email',            value: driver.user?.email },
                { label: 'Address',          value: driver.address },
              ].map(({ label, value, mono }) => (
                <div key={label} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: mono ? 'var(--font-mono)' : undefined, wordBreak: 'break-all' }}>{value || '—'}</div>
                </div>
              ))}
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
        <div style={{ padding: '20px 24px', minHeight: 180 }}>

          {/* TRIPS */}
          {tab === 'trips' && (
            trips.length === 0
              ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No trips yet</div>
              : <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr style={{ background: 'var(--bg-canvas)' }}>
                    {['#', 'Trip ID', 'From', 'To', 'Date', 'Status'].map(h => (
                      <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontSize: 12 }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {trips.slice(0, 15).map((t, i) => (
                      <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '9px 12px', color: 'var(--text-muted)' }}>{i + 1}</td>
                        <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', color: 'var(--brand)', fontWeight: 600 }}>TRP{String(t.id).padStart(3, '0')}</td>
                        <td style={{ padding: '9px 12px' }}>{t.start_location || '—'}</td>
                        <td style={{ padding: '9px 12px' }}>{t.end_location   || '—'}</td>
                        <td style={{ padding: '9px 12px', color: 'var(--text-muted)' }}>{t.start_time ? new Date(t.start_time).toLocaleDateString('en-IN') : '—'}</td>
                        <td style={{ padding: '9px 12px' }}>
                          <span className={`badge ${AVAIL_BADGE[t.status] || 'badge-slate'}`} style={{ fontSize: 11 }}>{t.status?.replace('_', ' ')}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
          )}

          {/* DOCUMENTS */}
          {tab === 'documents' && (
            docLoad
              ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Loading…</div>
              : documents.length === 0
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

          {/* LICENSE HISTORY */}
          {tab === 'license' && (
            <div style={{ maxWidth: 500, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'License Number',    value: driver.license_number,  mono: true },
                { label: 'License Type',      value: driver.license_type },
                { label: 'License Expiry',    value: fmtDate(driver.license_expiry) },
                { label: 'Experience',        value: `${driver.experience_years || 0} years` },
                { label: 'Current Status',    value: s.label },
                { label: 'Assigned Vehicle',  value: driver.assignedVehicle?.registration_no
                    ? `${driver.assignedVehicle.registration_no} · ${driver.assignedVehicle.make || ''}`
                    : '—' },
              ].map(({ label, value, mono }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-canvas)', borderRadius: 'var(--radius)', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontFamily: mono ? 'var(--font-mono)' : undefined }}>{value || '—'}</span>
                </div>
              ))}
            </div>
          )}

          {/* EMERGENCY CONTACT */}
          {tab === 'emergency' && (
            <div style={{ maxWidth: 500, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Emergency Contact', value: driver.emergency_contact },
                { label: 'Driver Phone',      value: driver.user?.phone },
                { label: 'Driver Email',      value: driver.user?.email },
                { label: 'Home Address',      value: driver.address },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 14px', background: 'var(--bg-canvas)', borderRadius: 'var(--radius)', fontSize: 13, gap: 12 }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 500, flexShrink: 0 }}>{label}</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600, textAlign: 'right' }}>{value || '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Drivers() {
  const [drivers,      setDrivers]      = useState([])
  const [vehicles,     setVehicles]     = useState([])
  const [allTrips,     setAllTrips]     = useState([])
  const [safetyMap,    setSafetyMap]    = useState({})
  const [mlLoading,    setMlLoading]    = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modal,        setModal]        = useState(null)
  const [detailDriver, setDetailDriver] = useState(null)  // ← full-page detail
  const [selected,     setSelected]     = useState(null)
  const [form,         setForm]         = useState(EMPTY)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [saving,       setSaving]       = useState(false)
  const fileInputRef = useRef(null)
  const toast = useToast()

  const fetchML = async (driverList, tripList) => {
    try {
      const ping = await fetch('http://localhost:8000/health')
      if (!ping.ok) return
      setMlLoading(true)
      const requests = driverList.map(d => ({
        driver_id:               d.id,
        name:                    d.user?.name || `Driver #${d.id}`,
        experience_years:        parseInt(d.experience_years) || 0,
        total_trips:             tripList.filter(t => t.driver_id === d.id).length,
        total_km:                tripList.filter(t => t.driver_id === d.id).reduce((s, t) => s + (parseFloat(t.distance_km) || 0), 0),
        speeding_incidents: 0, harsh_braking_incidents: 0, idle_violations: 0,
        license_expiry: d.license_expiry || null, alerts_count: 0,
        on_time_trips: tripList.filter(t => t.driver_id === d.id && t.status === 'completed').length,
        accidents: 0,
      }))
      const res = await mlDriverAPI.scoreBatch(requests)
      const map = {}; res.data.forEach(r => { map[r.driver_id] = r })
      setSafetyMap(map)
    } catch {}
    finally { setMlLoading(false) }
  }

  const load = () => {
    setLoading(true)
    Promise.all([
      driverAPI.getAll(),
      vehicleAPI.getAll({ status: 'active' }),
      tripAPI.getAll().catch(() => ({ data: { data: [] } })),
    ])
      .then(([d, v, t]) => {
        const dList = d.data.data || []
        const tList = t.data.data || []
        setDrivers(dList); setVehicles(v.data.data || []); setAllTrips(tList)
        fetchML(dList, tList)
      })
      .catch(() => toast.error('Failed to load drivers'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const total    = drivers.length
  const active   = drivers.filter(d => d.status !== 'suspended' && d.status !== 'off_duty').length
  const onTrip   = drivers.filter(d => d.status === 'on_trip').length
  const inactive = drivers.filter(d => d.status === 'suspended' || d.status === 'off_duty').length

  const filtered = drivers.filter(d => {
    const name = (d.user?.name || '').toLowerCase()
    const lic  = (d.license_number || '').toLowerCase()
    const q    = search.toLowerCase()
    return (!q || name.includes(q) || lic.includes(q)) &&
           (!statusFilter || d.status === statusFilter)
  })

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0]; if (!file) return
    if (file.size > 3 * 1024 * 1024) { toast.error('Photo must be under 3MB'); return }
    const reader = new FileReader()
    reader.onloadend = () => { setPhotoPreview(reader.result); setForm(p => ({ ...p, photo_url: reader.result })) }
    reader.readAsDataURL(file)
  }
  const removePhoto = () => { setPhotoPreview(null); setForm(p => ({ ...p, photo_url: '' })) }

  const openAdd  = () => { setForm(EMPTY); setPhotoPreview(null); setSelected(null); setModal('add') }
  const openEdit = (d) => {
    setForm({ ...d, name: d.user?.name || '', email: d.user?.email || '', phone: d.user?.phone || '', assigned_vehicle_id: d.assigned_vehicle_id || '', photo_url: d.photo_url || '' })
    setSelected(d); setPhotoPreview(d.photo_url || null); setModal('edit')
  }
  const openDelete = (d) => { setSelected(d); setModal('delete') }

  const handleSave = async () => {
    if (!form.license_number)           { toast.error('License number is required'); return }
    if (modal === 'add' && !form.name)  { toast.error('Driver name is required');    return }
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.assigned_vehicle_id) delete payload.assigned_vehicle_id
      if (!payload.email)               delete payload.email
      if (!payload.phone)               delete payload.phone
      if (!payload.photo_url)           delete payload.photo_url
      delete payload.id; delete payload.user; delete payload.assignedVehicle
      delete payload.createdAt; delete payload.updatedAt
      if (modal === 'add') { await driverAPI.create(payload); toast.success('Driver added') }
      else                 { await driverAPI.update(selected.id, payload); toast.success('Driver updated') }
      setModal(null); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setSaving(true)
    try { await driverAPI.remove(selected.id); toast.success('Driver deleted'); setModal(null); setDetailDriver(null); load() }
    catch { toast.error('Delete failed') }
    finally { setSaving(false) }
  }

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  /* ── If detail open, render full page ── */
  if (detailDriver) {
    const driverTrips = allTrips.filter(t => t.driver_id === detailDriver.id)
    return (
      <DriverDetail
        driver={detailDriver}
        trips={driverTrips}
        safetyData={safetyMap[detailDriver.id] || null}
        onBack={() => setDetailDriver(null)}
        onEdit={() => { openEdit(detailDriver); setDetailDriver(null) }}
        onDelete={() => { openDelete(detailDriver); setDetailDriver(null) }}
      />
    )
  }

  /* ── List view ── */
  return (
    <div className="page-enter">

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Driver <span style={{ color: 'var(--brand)' }}>Management</span>
          </h1>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>Dashboard › Drivers</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-icon" onClick={load}><RefreshCw size={14} /></button>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={14} /> + Add Driver</button>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total Drivers', value: total,    icon: '👥', color: 'var(--brand)', bg: 'var(--brand-light)', sub: 'All Drivers' },
          { label: 'Active',        value: active,   icon: '✅', color: 'var(--green)', bg: 'var(--green-bg)',   sub: 'Available' },
          { label: 'On Trip',       value: onTrip,   icon: '🚗', color: 'var(--blue)',  bg: 'var(--blue-bg)',    sub: 'Currently on Trip' },
          { label: 'Inactive',      value: inactive, icon: '⚠️', color: 'var(--amber)', bg: 'var(--amber-bg)',   sub: 'Not Available' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px' }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: 3 }}>{s.label}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 13 }}>🔍</span>
          <input className="input" placeholder="Search driver..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
        </div>
        <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="on_trip">On Trip</option>
          <option value="off_duty">Off Duty</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {['#', 'Driver ID', 'Driver Name', 'License Number', 'Phone Number', 'Status', 'Availability', 'Actions'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8}><LoadingState label="Loading drivers…" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8}><EmptyState icon="🧑‍✈️" title="No drivers found" sub={search ? 'Try a different search' : 'Add a driver to get started'} /></td></tr>
              ) : filtered.map((d, i) => {
                const s = STATUS_BADGE[d.status] || STATUS_BADGE.available
                return (
                  <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => setDetailDriver(d)}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{i + 1}</td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--brand)', fontWeight: 700 }}>
                        DRV{String(d.id).padStart(3, '0')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 'var(--radius)', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-canvas)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {d.photo_url
                            ? <img src={d.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <User size={14} color="var(--text-muted)" />}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>{d.user?.name || `User #${d.user_id}`}</div>
                          <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)' }}>{d.user?.email || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{d.license_number}</span></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{d.user?.phone || '—'}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 600 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
                        <span style={{ color: s.dot }}>Active</span>
                      </span>
                    </td>
                    <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="btn-icon" style={{ padding: 6 }} title="View" onClick={() => setDetailDriver(d)}><Eye size={12} /></button>
                        <button className="btn-icon" style={{ padding: 6 }} title="Edit" onClick={() => openEdit(d)}><Pencil size={12} /></button>
                        <button className="btn-icon" style={{ padding: 6, color: 'var(--red)' }} title="Delete" onClick={() => openDelete(d)}><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Showing {filtered.length} of {drivers.length} drivers
        </div>
      </div>

      {/* Add / Edit Modal — unchanged */}
      {(modal === 'add' || modal === 'edit') && (
        <Modal title={modal === 'add' ? 'Add Driver' : 'Edit Driver'} onClose={() => setModal(null)} wide
          footer={<>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Driver'}</button>
          </>}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div onClick={() => fileInputRef.current?.click()}
              style={{ width: 76, height: 76, borderRadius: 'var(--radius-lg)', cursor: 'pointer', border: '1.5px dashed var(--border-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-canvas)', overflow: 'hidden', flexShrink: 0 }}>
              {photoPreview ? <img src={photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={26} color="var(--text-muted)" />}
            </div>
            <div>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => fileInputRef.current?.click()}>
                <Camera size={13} /> {photoPreview ? 'Change Photo' : 'Upload Driver Photo'}
              </button>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 5 }}>Optional · JPG/PNG, up to 3MB</div>
              {photoPreview && <button type="button" onClick={removePhoto} style={{ fontSize: '0.74rem', color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 5 }}>Remove photo</button>}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: 'none' }} />
          </div>
          <div className="form-grid-2">
            <div className="form-group"><label className="form-label">Driver Name *</label><input className="input" value={form.name} onChange={f('name')} placeholder="e.g. Ravi Kumar" /></div>
            <div className="form-group"><label className="form-label">Email</label><input className="input" type="email" value={form.email} onChange={f('email')} placeholder="driver@example.com" /></div>
            <div className="form-group"><label className="form-label">Phone Number</label><input className="input" value={form.phone} onChange={f('phone')} placeholder="9876543210" /></div>
            <div className="form-group"><label className="form-label">License Number *</label><input className="input" value={form.license_number} onChange={f('license_number')} /></div>
            <div className="form-group"><label className="form-label">License Type</label>
              <select className="input" value={form.license_type} onChange={f('license_type')}>{['LMV','HMV','HPMV','PSV','Transport'].map(t => <option key={t}>{t}</option>)}</select></div>
            <div className="form-group"><label className="form-label">License Expiry</label><input className="input" type="date" value={form.license_expiry} onChange={f('license_expiry')} /></div>
            <div className="form-group"><label className="form-label">Experience (years)</label><input className="input" type="number" min="0" value={form.experience_years} onChange={f('experience_years')} /></div>
            <div className="form-group"><label className="form-label">Status</label>
              <select className="input" value={form.status} onChange={f('status')}>{['available','on_trip','off_duty','suspended'].map(t => <option key={t}>{t}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Emergency Contact</label><input className="input" value={form.emergency_contact} onChange={f('emergency_contact')} placeholder="Phone number" /></div>
            <div className="form-group"><label className="form-label">Assign Vehicle</label>
              <select className="input" value={form.assigned_vehicle_id} onChange={f('assigned_vehicle_id')}>
                <option value="">None</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_no} — {v.make} {v.model}</option>)}
              </select></div>
          </div>
          <div className="form-group" style={{ marginTop: 14 }}>
            <label className="form-label">Address</label>
            <textarea className="input" value={form.address} onChange={f('address')} rows={2} placeholder="Home address" />
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
            Delete driver <strong style={{ color: 'var(--text-primary)' }}>{selected?.user?.name || selected?.license_number}</strong>? This cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  )
}