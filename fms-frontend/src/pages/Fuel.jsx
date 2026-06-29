import { useState, useEffect, useMemo } from 'react'
import {
  Plus, Trash2, RefreshCw, Fuel as FuelIcon, Droplet, Wallet, TrendingUp,
  Search, Filter as FilterIcon, RotateCcw, Eye, Pencil,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight,
} from 'lucide-react'
import { fuelAPI, vehicleAPI, driverAPI } from '../services/api'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import { LoadingState, EmptyState, PageHeader } from '../components/Common'

const EMPTY = {
  id: null, vehicle_id: '', driver_id: '', litres: '', cost_per_litre: '',
  odometer_km: '', fuel_type: 'diesel', station_name: '',
}

const FUEL_TYPES = ['petrol', 'diesel', 'electric', 'hybrid']
const PER_PAGE_OPTIONS = [10, 25, 50]

const FUEL_TYPE_COLORS = {
  petrol:   { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  diesel:   { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  electric: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  hybrid:   { bg: '#fdf4ff', color: '#7e22ce', border: '#e9d5ff' },
}

function FuelTypeBadge({ type }) {
  const s = FUEL_TYPE_COLORS[type] || { bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' }
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      padding: '2px 10px', borderRadius: '999px', fontSize: '0.72rem',
      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>{type}</span>
  )
}

function StatCard({ icon: Icon, label, value, color = 'blue', sub }) {
  const colors = {
    blue:   { bg: '#eff6ff', icon: '#3b82f6', border: '#bfdbfe' },
    green:  { bg: '#f0fdf4', icon: '#22c55e', border: '#bbf7d0' },
    amber:  { bg: '#fff7ed', icon: '#f59e0b', border: '#fed7aa' },
    purple: { bg: '#f5f3ff', icon: '#7c3aed', border: '#ddd6fe' },
  }
  const c = colors[color]
  return (
    <div className="stat-card" style={{ borderTop: `3px solid ${c.icon}` }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, background: c.bg,
        border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', marginBottom: 12, color: c.icon,
      }}>
        <Icon size={18} />
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function CostPreview({ litres, costPerLitre }) {
  const l = parseFloat(litres), c = parseFloat(costPerLitre)
  if (!l || !c || isNaN(l) || isNaN(c)) return null
  return (
    <div style={{
      background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8,
      padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Estimated Total</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#16a34a', fontSize: '1rem' }}>
        ₹{(l * c).toFixed(2)}
      </span>
    </div>
  )
}

function validate(form) {
  const e = {}
  if (!form.vehicle_id) e.vehicle_id = 'Select a vehicle'
  if (!form.litres || parseFloat(form.litres) <= 0) e.litres = 'Enter litres > 0'
  if (!form.cost_per_litre || parseFloat(form.cost_per_litre) <= 0) e.cost_per_litre = 'Enter cost > 0'
  return e
}

function formatDateTime(d) {
  const dt = new Date(d)
  const datePart = dt.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timePart = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  return `${datePart} ${timePart}`
}

// Builds a compact page-number list with ellipses, e.g. 1 … 4 5 [6] 7 8 … 12
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

export default function Fuel() {
  const [logs, setLogs]         = useState([])
  const [vehicles, setVehicles] = useState([])
  const [drivers, setDrivers]   = useState([])
  const [loading, setLoading]   = useState(true)

  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState(EMPTY)
  const [errors, setErrors]     = useState({})
  const [saving, setSaving]     = useState(false)
  const [viewLog, setViewLog]   = useState(null)

  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState('')      // vehicle id
  const [typeFilter, setTypeFilter] = useState('')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')

  const [page, setPage]       = useState(1)
  const [perPage, setPerPage] = useState(10)

  const toast = useToast()

  const load = () => {
    setLoading(true)
    const params = {}
    if (filter)   params.vehicle_id = filter
    if (dateFrom) params.from = dateFrom
    if (dateTo)   params.to   = dateTo
    Promise.all([fuelAPI.getAll(params), vehicleAPI.getAll(), driverAPI.getAll()])
      .then(([f, v, d]) => {
        setLogs(f.data.data || [])
        setVehicles(v.data.data || [])
        setDrivers(d.data.data || [])
      })
      .catch(() => toast.error('Failed to load fuel data'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter, dateFrom, dateTo])
  useEffect(() => { setPage(1) }, [search, typeFilter, filter, dateFrom, dateTo, perPage])

  const vehicleMap = useMemo(() => {
    const m = {}; vehicles.forEach(v => { m[v.id] = v }); return m
  }, [vehicles])

  const driverMap = useMemo(() => {
    const m = {}; drivers.forEach(d => { m[d.id] = d.user?.name || `Driver #${d.id}` }); return m
  }, [drivers])

  const filteredLogs = useMemo(() => {
    let out = typeFilter ? logs.filter(l => l.fuel_type === typeFilter) : logs
    const q = search.trim().toLowerCase()
    if (q) {
      out = out.filter(l => {
        const veh = vehicleMap[l.vehicle_id]
        const driverName = driverMap[l.driver_id] || ''
        return (veh?.registration_no || '').toLowerCase().includes(q)
          || driverName.toLowerCase().includes(q)
      })
    }
    return out
  }, [logs, typeFilter, search, vehicleMap, driverMap])

  const totalLitres = filteredLogs.reduce((s, l) => s + (parseFloat(l.litres) || 0), 0)
  const totalCost   = filteredLogs.reduce((s, l) => s + parseFloat(l.total_cost || 0), 0)
  const avgCostPerL = totalLitres > 0 ? (totalCost / totalLitres) : 0

  const totalPages   = Math.max(1, Math.ceil(filteredLogs.length / perPage))
  const currentPage  = Math.min(page, totalPages)
  const pageStart    = (currentPage - 1) * perPage
  const pagedLogs    = filteredLogs.slice(pageStart, pageStart + perPage)
  const showingFrom  = filteredLogs.length === 0 ? 0 : pageStart + 1
  const showingTo    = Math.min(pageStart + perPage, filteredLogs.length)

  const handleSave = async () => {
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      if (form.id) {
        await fuelAPI.update(form.id, form)
        toast.success('Fuel log updated')
      } else {
        await fuelAPI.create(form)
        toast.success('Fuel log added')
      }
      setModal(false); setForm(EMPTY); setErrors({}); load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this fuel log?')) return
    try { await fuelAPI.remove(id); toast.success('Deleted'); load() }
    catch { toast.error('Delete failed') }
  }

  const openAddModal = () => { setForm(EMPTY); setErrors({}); setModal(true) }
  const openEditModal = (l) => {
    setForm({
      id: l.id,
      vehicle_id: l.vehicle_id || '',
      driver_id: l.driver_id || '',
      litres: l.litres || '',
      cost_per_litre: l.cost_per_litre || '',
      odometer_km: l.odometer_km || '',
      fuel_type: l.fuel_type || 'diesel',
      station_name: l.station_name || '',
    })
    setErrors({})
    setModal(true)
  }

  const f = (k) => (e) => {
    setForm(p => ({ ...p, [k]: e.target.value }))
    if (errors[k]) setErrors(p => { const n = { ...p }; delete n[k]; return n })
  }

  const clearFilters = () => { setSearch(''); setFilter(''); setTypeFilter(''); setDateFrom(''); setDateTo('') }
  const hasFilters = search || filter || typeFilter || dateFrom || dateTo

  return (
    <div className="page-enter">
      <PageHeader title="Fuel" accent="Logs" sub={`${filteredLogs.length} records`}>
        <button className="btn-icon" onClick={load} title="Refresh"><RefreshCw size={14} /></button>
        <button className="btn btn-primary" onClick={openAddModal}><Plus size={15} /> Add Fuel Log</button>
      </PageHeader>

      {/* KPI cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        <StatCard icon={Droplet} label="Total Fuel Logs" value={filteredLogs.length} color="purple" sub="This period" />
        <StatCard icon={FuelIcon} label="Total Quantity (L)"
          value={totalLitres.toLocaleString('en-IN', { maximumFractionDigits: 2 })} color="green" sub="This period" />
        <StatCard icon={Wallet} label="Total Cost (₹)"
          value={`₹${totalCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`} color="amber" sub="This period" />
        <StatCard icon={TrendingUp} label="Avg. Cost / L"
          value={`₹${avgCostPerL.toFixed(2)}`} color="blue" sub="This period" />
      </div>

      {/* Filters */}
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10,
        padding: '14px 16px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 220px' }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Search</label>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input" style={{ paddingLeft: 30 }} placeholder="Search by vehicle number or driver"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vehicle</label>
          <select className="input" value={filter} onChange={e => setFilter(e.target.value)} style={{ minWidth: 160 }}>
            <option value="">All Vehicles</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_no}</option>)}
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fuel Type</label>
          <select className="input" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ minWidth: 140 }}>
            <option value="">All Fuel Types</option>
            {FUEL_TYPES.map(t => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
          </select>
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
                <th>#</th><th>Date</th><th>Vehicle Number</th><th>Driver</th><th>Fuel Type</th>
                <th>Quantity (L)</th><th>Rate (₹/L)</th><th>Amount (₹)</th><th>Odometer (KM)</th>
                <th>Fuel Station</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11}><LoadingState label="Loading fuel logs…" /></td></tr>
              ) : pagedLogs.length === 0 ? (
                <tr><td colSpan={11}>
                  <EmptyState icon="⛽" title="No fuel logs found"
                    sub={hasFilters ? 'Try adjusting filters' : 'Log a fill-up to see it here'} />
                </td></tr>
              ) : pagedLogs.map((l, i) => {
                const veh = vehicleMap[l.vehicle_id]
                const driverName = driverMap[l.driver_id]
                return (
                  <tr key={l.id}>
                    <td style={{ color: 'var(--text-muted)' }}>{pageStart + i + 1}</td>
                    <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {formatDateTime(l.filled_at)}
                    </span></td>
                    <td>
                      {veh ? (
                        <div>
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand)', fontSize: '0.82rem', fontWeight: 700 }}>{veh.registration_no}</span>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{veh.make} {veh.model}</div>
                        </div>
                      ) : <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>#{l.vehicle_id}</span>}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{driverName || '—'}</td>
                    <td><FuelTypeBadge type={l.fuel_type} /></td>
                    <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{parseFloat(l.litres).toFixed(2)}</span></td>
                    <td><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{l.cost_per_litre ? parseFloat(l.cost_per_litre).toFixed(2) : '—'}</span></td>
                    <td><span style={{ fontFamily: 'var(--font-mono)', color: '#16a34a', fontWeight: 700 }}>{parseFloat(l.total_cost || 0).toFixed(2)}</span></td>
                    <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{l.odometer_km ? parseFloat(l.odometer_km).toLocaleString('en-IN') : '—'}</span></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{l.station_name || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-icon" onClick={() => setViewLog(l)} title="View" style={{ color: '#0284c7' }}><Eye size={13} /></button>
                        <button className="btn-icon" onClick={() => openEditModal(l)} title="Edit" style={{ color: '#d97706' }}><Pencil size={13} /></button>
                        <button className="btn-icon" onClick={() => handleDelete(l.id)} title="Delete" style={{ color: '#dc2626' }}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filteredLogs.length > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: 10,
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Showing {showingFrom} to {showingTo} of {filteredLogs.length} entries
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
          title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FuelIcon size={16} /> {form.id ? 'Edit Fuel Log' : 'Log Fuel Fill-up'}</span>}
          onClose={() => setModal(false)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Log'}</button>
          </>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Vehicle *</label>
                <select className="input" value={form.vehicle_id} onChange={f('vehicle_id')}
                  style={errors.vehicle_id ? { borderColor: '#dc2626' } : {}}>
                  <option value="">Select vehicle</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_no} — {v.make} {v.model}</option>)}
                </select>
                {errors.vehicle_id && <span style={{ color: '#dc2626', fontSize: '0.75rem' }}>{errors.vehicle_id}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Driver</label>
                <select className="input" value={form.driver_id} onChange={f('driver_id')}>
                  <option value="">Unassigned</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.user?.name || `Driver #${d.id}`}</option>)}
                </select>
              </div>
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Litres *</label>
                <input className="input" type="number" step="0.1" min="0" placeholder="e.g. 40.5"
                  value={form.litres} onChange={f('litres')} style={errors.litres ? { borderColor: '#dc2626' } : {}} />
                {errors.litres && <span style={{ color: '#dc2626', fontSize: '0.75rem' }}>{errors.litres}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Cost Per Litre (₹) *</label>
                <input className="input" type="number" step="0.01" min="0" placeholder="e.g. 96.50"
                  value={form.cost_per_litre} onChange={f('cost_per_litre')} style={errors.cost_per_litre ? { borderColor: '#dc2626' } : {}} />
                {errors.cost_per_litre && <span style={{ color: '#dc2626', fontSize: '0.75rem' }}>{errors.cost_per_litre}</span>}
              </div>
            </div>
            <CostPreview litres={form.litres} costPerLitre={form.cost_per_litre} />
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Fuel Type</label>
                <select className="input" value={form.fuel_type} onChange={f('fuel_type')}>
                  {FUEL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Odometer (km)</label>
                <input className="input" type="number" min="0" placeholder="e.g. 54200"
                  value={form.odometer_km} onChange={f('odometer_km')} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Station Name</label>
              <input className="input" value={form.station_name} onChange={f('station_name')} placeholder="HP / Indian Oil / BPCL…" />
            </div>
          </div>
        </Modal>
      )}

      {/* View modal */}
      {viewLog && (
        <Modal
          title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Eye size={16} /> Fuel Log Details</span>}
          onClose={() => setViewLog(null)}
          footer={<button className="btn btn-secondary" onClick={() => setViewLog(null)}>Close</button>}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
            {[
              ['Date',          formatDateTime(viewLog.filled_at)],
              ['Vehicle',       vehicleMap[viewLog.vehicle_id]?.registration_no || `#${viewLog.vehicle_id}`],
              ['Driver',        driverMap[viewLog.driver_id] || '—'],
              ['Fuel Type',     viewLog.fuel_type],
              ['Quantity',      `${parseFloat(viewLog.litres).toFixed(2)} L`],
              ['Rate',          `₹${parseFloat(viewLog.cost_per_litre || 0).toFixed(2)} / L`],
              ['Amount',        `₹${parseFloat(viewLog.total_cost || 0).toFixed(2)}`],
              ['Odometer',      viewLog.odometer_km ? `${parseFloat(viewLog.odometer_km).toLocaleString('en-IN')} km` : '—'],
              ['Fuel Station',  viewLog.station_name || '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}