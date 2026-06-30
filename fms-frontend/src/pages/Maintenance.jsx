import { useState, useEffect, useMemo } from 'react'
import {
  Plus, Trash2, RefreshCw, Wrench, Clock, AlertTriangle, CheckCircle2,
  Search, Filter as FilterIcon, RotateCcw, Eye, Pencil, Zap,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight,
} from 'lucide-react'
import { maintenanceAPI, vehicleAPI } from '../services/api'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import { LoadingState, EmptyState, PageHeader } from '../components/Common'

const TYPES = ['oil_change', 'tire', 'brake', 'engine', 'electrical', 'body', 'other']
const PRIORITIES = ['low', 'medium', 'high']
const PER_PAGE_OPTIONS = [10, 25, 50]

const EMPTY = {
  id: null, vehicle_id: '', type: 'other', description: '', status: 'scheduled',
  priority: 'medium', is_emergency: false, emergency_reason: '',
  scheduled_date: '', completed_date: '', cost: '', odometer_km: '',
  workshop_name: '', next_due_km: '', next_due_date: '',
}

const TYPE_LABEL = {
  oil_change: 'Oil Change', tire: 'Tyre Replacement', brake: 'Brake Inspection',
  engine: 'Engine Service', electrical: 'Electrical', body: 'Body', other: 'Other',
}

const TYPE_COLORS = {
  oil_change: { bg: '#fdf4ff', color: '#7e22ce', border: '#e9d5ff' },
  tire:       { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  brake:      { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  engine:     { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  electrical: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  body:       { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
  other:      { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
}

const PRIORITY_COLORS = {
  low:    { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  medium: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  high:   { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
}

function TypeBadge({ type }) {
  const s = TYPE_COLORS[type] || TYPE_COLORS.other
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      padding: '2px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
    }}>{TYPE_LABEL[type] || type}</span>
  )
}

function PriorityBadge({ priority }) {
  const s = PRIORITY_COLORS[priority] || PRIORITY_COLORS.medium
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      padding: '2px 10px', borderRadius: '999px', fontSize: '0.72rem',
      fontWeight: 700, textTransform: 'capitalize',
    }}>{priority || 'medium'}</span>
  )
}

function StatCard({ icon: Icon, label, value, color = 'blue', sub }) {
  const colors = {
    blue:  { bg: '#eff6ff', icon: '#3b82f6', border: '#bfdbfe', glow: 'rgba(59,130,246,0.28)' },
    amber: { bg: '#fff7ed', icon: '#f59e0b', border: '#fed7aa', glow: 'rgba(245,158,11,0.28)' },
    red:   { bg: '#fef2f2', icon: '#ef4444', border: '#fecaca', glow: 'rgba(239,68,68,0.28)'  },
    green: { bg: '#f0fdf4', icon: '#22c55e', border: '#bbf7d0', glow: 'rgba(34,197,94,0.28)'  },
  }
  const c = colors[color]
  return (
    <div
      className="stat-card kpi-card"
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 16px 36px ${c.glow}, 0 3px 10px rgba(0,0,0,0.06)`; e.currentTarget.style.transform = 'translateY(-5px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 2px 8px ${c.glow}`; e.currentTarget.style.transform = 'translateY(0)' }}
      style={{
        borderTop: `3px solid ${c.icon}`,
        boxShadow: `0 2px 8px ${c.glow}`,
        transition: 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.22s ease',
      }}
    >
      <style>{`
        @keyframes kpi-ring-pulse {
          0%   { transform: scale(1);   opacity: 0.7; }
          70%  { transform: scale(1.8); opacity: 0;   }
          100% { transform: scale(1);   opacity: 0;   }
        }
        .kpi-card:hover .kpi-ring { animation: kpi-ring-pulse 1.6s ease-in-out infinite; }
        .kpi-card:hover .kpi-icon { transform: scale(1.14) rotate(-6deg); }
        .kpi-icon { transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1); }
      `}</style>
      <div style={{ position: 'relative', display: 'inline-flex' }}>
        <div className="kpi-icon" style={{
          width: 38, height: 38, borderRadius: 10, background: c.bg,
          border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center',
          justifyContent: 'center', marginBottom: 12, color: c.icon, position: 'relative', zIndex: 1,
        }}>
          <Icon size={18} />
        </div>
        <div className="kpi-ring" style={{
          position: 'absolute', inset: -4, borderRadius: 10,
          border: `2px solid ${c.icon}`, opacity: 0, pointerEvents: 'none',
        }} />
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function validate(form) {
  const e = {}
  if (!form.vehicle_id) e.vehicle_id = 'Select a vehicle'
  if (!form.scheduled_date) e.scheduled_date = 'Pick a scheduled date'
  if (form.is_emergency && !form.emergency_reason.trim()) e.emergency_reason = 'Reason required for emergency repair'
  return e
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0)
  return Math.round((target - today) / 86400000)
}

// Derives the display status (Upcoming / Due Today / Overdue / In Progress / Completed / Cancelled)
function deriveStatus(r) {
  if (r.status === 'completed')   return { label: 'Completed',   color: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' } }
  if (r.status === 'cancelled')   return { label: 'Cancelled',   color: { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' } }
  if (r.status === 'in_progress') return { label: 'In Progress', color: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' } }
  const d = daysUntil(r.scheduled_date)
  if (d === null)  return { label: 'Scheduled', color: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' } }
  if (d < 0)       return { label: 'Overdue',   color: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' } }
  if (d === 0)     return { label: 'Due Today', color: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' } }
  return { label: 'Upcoming', color: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' } }
}

function dueInText(r) {
  if (r.status === 'completed' || r.status === 'cancelled') return null
  const d = daysUntil(r.scheduled_date)
  if (d === null) return null
  if (d < 0)  return { text: `Overdue by ${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'}`, danger: true }
  if (d === 0) return { text: 'Today', danger: true }
  return { text: `${d} day${d === 1 ? '' : 's'}`, danger: false }
}

// km remaining until the due odometer threshold (next_due_km doubles as "due by odometer" for scheduled records)
function kmRemaining(r, vehicleOdo) {
  if (r.next_due_km == null) return null
  const odo = vehicleOdo != null ? vehicleOdo : r.odometer_km
  if (odo == null) return null
  return Math.max(0, parseFloat(r.next_due_km) - parseFloat(odo))
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function pageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set([1, total, current, current - 1, current + 1])
  const sorted = [...pages].filter(p => p >= 1 && p <= total).sort((a, b) => a - b)
  const out = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…')
    out.push(p)
  })
  return out
}

export default function Maintenance() {
  const [records, setRecords]   = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading]   = useState(true)

  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState(EMPTY)
  const [errors, setErrors]     = useState({})
  const [saving, setSaving]     = useState(false)
  const [viewRecord, setViewRecord] = useState(null)

  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter]     = useState('')
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo, setDateTo]             = useState('')

  const [page, setPage]       = useState(1)
  const [perPage, setPerPage] = useState(10)

  const toast = useToast()

  const load = () => {
    setLoading(true)
    Promise.all([maintenanceAPI.getAll(), vehicleAPI.getAll()])
      .then(([r, v]) => { setRecords(r.data.data || []); setVehicles(v.data.data || []) })
      .catch(() => toast.error('Failed to load maintenance data'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])
  useEffect(() => { setPage(1) }, [search, statusFilter, typeFilter, dateFrom, dateTo, perPage])

  const vehicleMap = useMemo(() => {
    const m = {}; vehicles.forEach(v => { m[v.id] = v }); return m
  }, [vehicles])

  const filteredRecords = useMemo(() => {
    let out = records
    if (typeFilter)   out = out.filter(r => r.type === typeFilter)
    if (statusFilter) out = out.filter(r => deriveStatus(r).label === statusFilter)
    if (dateFrom)      out = out.filter(r => r.scheduled_date && r.scheduled_date >= dateFrom)
    if (dateTo)        out = out.filter(r => r.scheduled_date && r.scheduled_date <= dateTo)
    const q = search.trim().toLowerCase()
    if (q) {
      out = out.filter(r => {
        const veh = vehicleMap[r.vehicle_id] || r.vehicle
        return (veh?.registration_no || '').toLowerCase().includes(q)
      })
    }
    return out
  }, [records, typeFilter, statusFilter, dateFrom, dateTo, search, vehicleMap])

  // KPI counts computed off the full (unfiltered) record set — "All Time" style cards
  const kpi = useMemo(() => {
    const total = records.length
    const upcoming = records.filter(r => {
      if (r.status !== 'scheduled') return false
      const d = daysUntil(r.scheduled_date)
      return d !== null && d >= 0 && d <= 30
    }).length
    const overdue = records.filter(r => r.status === 'scheduled' && (daysUntil(r.scheduled_date) ?? 0) < 0).length
    const now = new Date()
    const completed = records.filter(r => {
      if (r.status !== 'completed' || !r.completed_date) return false
      const cd = new Date(r.completed_date)
      return cd.getMonth() === now.getMonth() && cd.getFullYear() === now.getFullYear()
    }).length
    return { total, upcoming, overdue, completed }
  }, [records])

  const totalPages  = Math.max(1, Math.ceil(filteredRecords.length / perPage))
  const currentPage = Math.min(page, totalPages)
  const pageStart   = (currentPage - 1) * perPage
  const pagedRecords = filteredRecords.slice(pageStart, pageStart + perPage)
  const showingFrom = filteredRecords.length === 0 ? 0 : pageStart + 1
  const showingTo   = Math.min(pageStart + perPage, filteredRecords.length)

  const openAddModal = () => { setForm(EMPTY); setErrors({}); setModal(true) }
  const openEditModal = (r) => {
    setForm({
      id: r.id,
      vehicle_id: r.vehicle_id || '',
      type: r.type || 'other',
      description: r.description || '',
      status: r.status || 'scheduled',
      priority: r.priority || 'medium',
      is_emergency: !!r.is_emergency,
      emergency_reason: r.emergency_reason || '',
      scheduled_date: r.scheduled_date || '',
      completed_date: r.completed_date || '',
      cost: r.cost || '',
      odometer_km: r.odometer_km || '',
      workshop_name: r.workshop_name || '',
      next_due_km: r.next_due_km || '',
      next_due_date: r.next_due_date || '',
    })
    setErrors({})
    setModal(true)
  }

  const handleSave = async () => {
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      if (form.id) { await maintenanceAPI.update(form.id, form); toast.success('Maintenance record updated') }
      else         { await maintenanceAPI.create(form); toast.success('Maintenance scheduled') }
      setModal(false); setForm(EMPTY); setErrors({}); load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this maintenance record?')) return
    try { await maintenanceAPI.remove(id); toast.success('Deleted'); load() }
    catch { toast.error('Delete failed') }
  }

  const f = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(p => { const n = { ...p }; delete n[k]; return n })
  }

  const clearFilters = () => { setSearch(''); setStatusFilter(''); setTypeFilter(''); setDateFrom(''); setDateTo('') }
  const hasFilters = search || statusFilter || typeFilter || dateFrom || dateTo

  return (
    <div className="page-enter">
      <PageHeader title="Maintenance" accent="Management" sub={`${filteredRecords.length} records`}>
        <button className="btn-icon" onClick={load} title="Refresh"><RefreshCw size={14} /></button>
        <button className="btn btn-primary" onClick={openAddModal}><Plus size={15} /> Schedule Maintenance</button>
      </PageHeader>

      {/* KPI cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        <StatCard icon={Wrench} label="Total Maintenance" value={kpi.total} color="blue" sub="All time" />
        <StatCard icon={Clock} label="Upcoming" value={kpi.upcoming} color="amber" sub="Next 30 days" />
        <StatCard icon={AlertTriangle} label="Overdue" value={kpi.overdue} color="red" sub="Requires attention" />
        <StatCard icon={CheckCircle2} label="Completed" value={kpi.completed} color="green" sub="This month" />
      </div>

      {/* Filters */}
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10,
        padding: '14px 16px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 200px' }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Search</label>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input" style={{ paddingLeft: 30 }} placeholder="Search by vehicle number"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
          <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ minWidth: 150 }}>
            <option value="">All Status</option>
            {['Upcoming', 'Due Today', 'Overdue', 'In Progress', 'Completed', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Maintenance Type</label>
          <select className="input" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ minWidth: 160 }}>
            <option value="">All Types</option>
            {TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date Range</label>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input className="input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ minWidth: 130 }} />
            <span style={{ color: 'var(--text-muted)' }}>–</span>
            <input className="input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ minWidth: 130 }} />
          </div>
        </div>

        <button className="btn btn-primary" onClick={load}><FilterIcon size={14} /> Filter</button>
        {hasFilters && <button className="btn btn-secondary" onClick={clearFilters}><RotateCcw size={14} /> Reset</button>}
      </div>

      {/* Table */}
      <div className="table-container">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Vehicle Number</th><th>Vehicle Model</th><th>Maintenance Type</th><th>Description</th>
                <th>Scheduled Date</th><th>Due In / Odometer</th><th>Status</th><th>Priority</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10}><LoadingState label="Loading maintenance records…" /></td></tr>
              ) : pagedRecords.length === 0 ? (
                <tr><td colSpan={10}>
                  <EmptyState icon="🔧" title="No maintenance records found"
                    sub={hasFilters ? 'Try adjusting filters' : 'Schedule maintenance to get started'} />
                </td></tr>
              ) : pagedRecords.map((r, i) => {
                const veh = vehicleMap[r.vehicle_id] || r.vehicle
                const due = dueInText(r)
                const km = kmRemaining(r, veh?.odometer_km)
                const st = deriveStatus(r)
                return (
                  <tr key={r.id}>
                    <td style={{ color: 'var(--text-muted)' }}>{pageStart + i + 1}</td>
                    <td><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand)', fontSize: '0.82rem', fontWeight: 700 }}>
                      {veh?.registration_no || `#${r.vehicle_id}`}
                    </span></td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{veh ? `${veh.make || ''} ${veh.model || ''}`.trim() : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                        <TypeBadge type={r.type} />
                        {r.is_emergency && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.68rem', fontWeight: 700, color: '#dc2626' }}>
                            <Zap size={10} /> Emergency
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: 220 }}>{r.description || '—'}</td>
                    <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{formatDate(r.scheduled_date)}</span></td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {due ? (
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: due.danger ? '#dc2626' : '#c2410c' }}>{due.text}</span>
                        ) : <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>—</span>}
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {km != null ? `${km.toLocaleString('en-IN')} km` : '—'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        background: st.color.bg, color: st.color.color, border: `1px solid ${st.color.border}`,
                        padding: '2px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
                      }}>{st.label}</span>
                    </td>
                    <td><PriorityBadge priority={r.priority} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-icon" onClick={() => setViewRecord(r)} title="View" style={{ color: '#0284c7' }}><Eye size={13} /></button>
                        <button className="btn-icon" onClick={() => openEditModal(r)} title="Edit" style={{ color: '#d97706' }}><Pencil size={13} /></button>
                        <button className="btn-icon" onClick={() => handleDelete(r.id)} title="Delete" style={{ color: '#dc2626' }}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filteredRecords.length > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: 10,
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Showing {showingFrom} to {showingTo} of {filteredRecords.length} entries
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <select className="input" style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                value={perPage} onChange={e => setPerPage(parseInt(e.target.value))}>
                {PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n} per page</option>)}
              </select>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn-icon" disabled={currentPage === 1} onClick={() => setPage(1)}><ChevronsLeft size={14} /></button>
                <button className="btn-icon" disabled={currentPage === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /></button>
                {pageList(currentPage, totalPages).map((p, i) => p === '…' ? (
                  <span key={`e${i}`} style={{ padding: '0 6px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>…</span>
                ) : (
                  <button key={p} onClick={() => setPage(p)}
                    className={p === currentPage ? 'btn btn-primary btn-xs' : 'btn-icon'}
                    style={{ minWidth: 30 }}>{p}</button>
                ))}
                <button className="btn-icon" disabled={currentPage === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={14} /></button>
                <button className="btn-icon" disabled={currentPage === totalPages} onClick={() => setPage(totalPages)}><ChevronsRight size={14} /></button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      {modal && (
        <Modal
          title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Wrench size={16} /> {form.id ? 'Edit Maintenance Record' : 'Schedule Maintenance'}</span>}
          onClose={() => setModal(false)}
          wide
          footer={<>
            <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Vehicle *</label>
              <select className="input" value={form.vehicle_id} onChange={f('vehicle_id')}
                style={errors.vehicle_id ? { borderColor: '#dc2626' } : {}}>
                <option value="">Select vehicle</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_no} — {v.make} {v.model}</option>)}
              </select>
              {errors.vehicle_id && <span style={{ color: '#dc2626', fontSize: '0.75rem' }}>{errors.vehicle_id}</span>}
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Maintenance Type</label>
                <select className="input" value={form.type} onChange={f('type')}>
                  {TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="input" value={form.priority} onChange={f('priority')}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="input" value={form.status} onChange={f('status')}>
                  {['scheduled', 'in_progress', 'completed', 'cancelled'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Scheduled Date *</label>
                <input className="input" type="date" value={form.scheduled_date} onChange={f('scheduled_date')}
                  style={errors.scheduled_date ? { borderColor: '#dc2626' } : {}} />
                {errors.scheduled_date && <span style={{ color: '#dc2626', fontSize: '0.75rem' }}>{errors.scheduled_date}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Completed Date</label>
                <input className="input" type="date" value={form.completed_date} onChange={f('completed_date')} />
              </div>
              <div className="form-group">
                <label className="form-label">Cost (₹)</label>
                <input className="input" type="number" min="0" value={form.cost} onChange={f('cost')} />
              </div>
              <div className="form-group">
                <label className="form-label">Odometer at Service (km)</label>
                <input className="input" type="number" min="0" value={form.odometer_km} onChange={f('odometer_km')} />
              </div>
              <div className="form-group">
                <label className="form-label">Due by Odometer (km)</label>
                <input className="input" type="number" min="0" placeholder="e.g. 45000" value={form.next_due_km} onChange={f('next_due_km')} />
              </div>
              <div className="form-group">
                <label className="form-label">Workshop Name</label>
                <input className="input" value={form.workshop_name} onChange={f('workshop_name')} />
              </div>
              <div className="form-group">
                <label className="form-label">Next Due Date</label>
                <input className="input" type="date" value={form.next_due_date} onChange={f('next_due_date')} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="input" rows={2} value={form.description} onChange={f('description')} />
            </div>

            <div style={{
              background: form.is_emergency ? '#fef2f2' : 'var(--bg-canvas)',
              border: `1px solid ${form.is_emergency ? '#fecaca' : 'var(--border)'}`,
              borderRadius: 8, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: form.is_emergency ? '#dc2626' : 'var(--text-primary)' }}>
                <input type="checkbox" checked={form.is_emergency} onChange={f('is_emergency')} />
                <Zap size={14} /> Emergency Repair
              </label>
              {form.is_emergency && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Reason *</label>
                  <textarea className="input" rows={2} placeholder="Why is this an emergency repair?"
                    value={form.emergency_reason} onChange={f('emergency_reason')}
                    style={errors.emergency_reason ? { borderColor: '#dc2626' } : {}} />
                  {errors.emergency_reason && <span style={{ color: '#dc2626', fontSize: '0.75rem' }}>{errors.emergency_reason}</span>}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* View modal */}
      {viewRecord && (() => {
        const veh = vehicleMap[viewRecord.vehicle_id] || viewRecord.vehicle
        const st = deriveStatus(viewRecord)
        return (
          <Modal
            title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Eye size={16} /> Maintenance Details</span>}
            onClose={() => setViewRecord(null)}
            footer={<button className="btn btn-secondary" onClick={() => setViewRecord(null)}>Close</button>}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
              {[
                ['Vehicle',         veh?.registration_no || `#${viewRecord.vehicle_id}`],
                ['Model',           veh ? `${veh.make || ''} ${veh.model || ''}`.trim() : '—'],
                ['Type',            TYPE_LABEL[viewRecord.type] || viewRecord.type],
                ['Priority',        viewRecord.priority || 'medium'],
                ['Status',          st.label],
                ['Scheduled Date',  formatDate(viewRecord.scheduled_date)],
                ['Completed Date',  formatDate(viewRecord.completed_date)],
                ['Cost',            viewRecord.cost ? `₹${parseFloat(viewRecord.cost).toLocaleString('en-IN')}` : '—'],
                ['Odometer',        viewRecord.odometer_km ? `${parseFloat(viewRecord.odometer_km).toLocaleString('en-IN')} km` : '—'],
                ['Due by Odometer', viewRecord.next_due_km ? `${parseFloat(viewRecord.next_due_km).toLocaleString('en-IN')} km` : '—'],
                ['Next Due Date',   formatDate(viewRecord.next_due_date)],
                ['Workshop',        viewRecord.workshop_name || '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: 2 }}>{value}</div>
                </div>
              ))}
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</div>
                <div style={{ fontSize: '0.9rem', marginTop: 2 }}>{viewRecord.description || '—'}</div>
              </div>
              {viewRecord.is_emergency && (
                <div style={{ gridColumn: '1 / -1', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#dc2626', fontWeight: 700, fontSize: '0.82rem', marginBottom: 4 }}>
                    <Zap size={14} /> Emergency Repair
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{viewRecord.emergency_reason || '—'}</div>
                </div>
              )}
            </div>
          </Modal>
        )
      })()}
    </div>
  )
}