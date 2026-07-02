import { useState, useEffect, useMemo } from 'react'
import {
  Bell, CheckCheck, Plus, RefreshCw, AlertTriangle,
  AlertCircle, Info, Zap, ShieldAlert, Search,
  Eye, Trash2, RotateCcw, Download, X
} from 'lucide-react'
import { alertAPI, vehicleAPI, driverAPI } from '../services/api'
import { useToast } from '../context/ToastContext'
import { KpiCards } from '../components/Common'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

/* ── constants ─────────────────────────────────────────────── */
const SEV_COLOR   = { low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' }
const SEV_BG      = { low: '#f0fdf4', medium: '#fffbeb', high: '#fff7ed', critical: '#fef2f2' }
const SEV_TEXT    = { low: '#15803d', medium: '#b45309', high: '#c2410c', critical: '#b91c1c' }
const SEV_BORDER  = { low: '#86efac', medium: '#fcd34d', high: '#fdba74', critical: '#fca5a5' }

/* ── KPI color palette (matches Vehicles page glow cards) ── */
const ALERT_KPI_PALETTE = {
  indigo: { accent: '#6366f1', bg: '#eef2ff', border: '#c7d2fe', glow: 'rgba(99,102,241,0.20)' },
  red:    { accent: '#ef4444', bg: '#fef2f2', border: '#fecaca', glow: 'rgba(239,68,68,0.20)'  },
  orange: { accent: '#f97316', bg: '#fff7ed', border: '#fed7aa', glow: 'rgba(249,115,22,0.20)' },
  blue:   { accent: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', glow: 'rgba(59,130,246,0.20)' },
  green:  { accent: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0', glow: 'rgba(34,197,94,0.20)'  },
}

/* bump the alpha of an 'rgba(r,g,b,a)' string, for a slightly stronger hover glow */
function withAlpha(rgba, alpha) {
  const m = /rgba?\(([^)]+)\)/.exec(rgba)
  if (!m) return rgba
  const [r, g, b] = m[1].split(',').map(p => p.trim())
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const TYPE_ICON = {
  speeding:        '🚨',
  geofence:        '📍',
  maintenance_due: '🔧',
  document_expiry: '📄',
  fuel_low:        '⛽',
  accident:        '💥',
  idle:            '⏸️',
  other:           '⚠️',
}

const ALERT_TYPES = ['speeding','geofence','maintenance_due','document_expiry','fuel_low','accident','idle','other']
const SEV_LEVELS  = ['low','medium','high','critical']
const STATUS_OPTS = ['all','unread','read']

const EMPTY_FORM = { vehicle_id: '', driver_id: '', type: 'other', title: '', message: '', severity: 'medium' }

/* ── helpers ────────────────────────────────────────────────── */
const fmtTime = (d) => new Date(d).toLocaleString('en-IN', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hour12: true,
})

const SevBadge = ({ sev }) => (
  <span style={{
    fontSize: 11, fontWeight: 600, padding: '2px 8px',
    borderRadius: 4,
    background: SEV_BG[sev]   || '#f3f4f6',
    color:      SEV_TEXT[sev]  || '#374151',
    border:     `1px solid ${SEV_BORDER[sev] || '#e5e7eb'}`,
    textTransform: 'capitalize',
  }}>{sev}</span>
)

const StatusBadge = ({ read }) => (
  <span style={{
    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
    background: read ? '#f0fdf4' : '#fef2f2',
    color:      read ? '#15803d' : '#b91c1c',
    border:     `1px solid ${read ? '#86efac' : '#fca5a5'}`,
  }}>{read ? 'Resolved' : 'Active'}</span>
)

/* ══════════════════════════════════════════════════════════════ */
export default function Alerts() {
  const [alerts,   setAlerts]   = useState([])
  const [vehicles, setVehicles] = useState([])
  const [drivers,  setDrivers]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)   // 'create' | false
  const [viewAlert, setViewAlert] = useState(null)   // alert object being viewed, or null
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [saving,   setSaving]   = useState(false)
  const [checking, setChecking] = useState(false)

  /* filters */
  const [search,      setSearch]      = useState('')
  const [typeFilter,  setTypeFilter]  = useState('all')
  const [sevFilter,   setSevFilter]   = useState('all')
  const [statFilter,  setStatFilter]  = useState('all')
  const [dateFrom,    setDateFrom]    = useState('')
  const [dateTo,      setDateTo]      = useState('')

  /* pagination */
  const [page,     setPage]     = useState(1)
  const PER_PAGE = 10

  const toast = useToast()

  /* ── load ──────────────────────────────────────────────────── */
  const load = () => {
    setLoading(true)
    Promise.all([
      alertAPI.getAll({}),
      vehicleAPI.getAll({}),
      driverAPI.getAll(),
    ])
      .then(([ar, vr, dr]) => {
        setAlerts(ar.data.data   || [])
        setVehicles(vr.data.data || [])
        setDrivers(dr.data.data  || [])
      })
      .catch(() => toast.error('Failed to load alerts'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  /* ── actions ───────────────────────────────────────────────── */
  const markRead = async (id) => {
    try { await alertAPI.markRead(id); load() }
    catch { toast.error('Failed to mark read') }
  }

  const markAllRead = async () => {
    try { await alertAPI.markAllRead(); toast.success('All marked as read'); load() }
    catch { toast.error('Failed') }
  }

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try { await alertAPI.create(form); toast.success('Alert created'); setModal(false); load() }
    catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const handleCheckExpiry = async () => {
    setChecking(true)
    try { const r = await alertAPI.checkExpiry(); toast.success(r.data.message || 'Check complete'); load() }
    catch (err) { toast.error(err.response?.data?.message || 'Check failed') }
    finally { setChecking(false) }
  }

  const handleRemove = async (id) => {
    if (!window.confirm('Delete this alert?')) return
    try { await alertAPI.remove(id); toast.success('Deleted'); load() }
    catch { toast.error('Failed to delete') }
  }

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  /* ── derived data ──────────────────────────────────────────── */
  const getVehicleReg = (id) => vehicles.find(v => String(v.id) === String(id))?.registration_no || (id ? `VEH #${id}` : '—')
  // Resolves the vehicle to show for an alert: use the alert's own vehicle_id if set,
  // otherwise fall back to the reporting driver's currently assigned vehicle
  // (covers older alerts created before vehicle_id was auto-filled on the backend).
  const getAlertVehicleReg = (a) => {
    if (a.vehicle_id) return getVehicleReg(a.vehicle_id)
    const driver = drivers.find(d => String(d.id) === String(a.driver_id))
    if (driver?.assigned_vehicle_id) return getVehicleReg(driver.assigned_vehicle_id)
    return '—'
  }
  const getDriverName = (id) => {
    const d = drivers.find(d => String(d.id) === String(id))
    return d ? (d.user?.name || `Driver #${id}`) : (id ? `DRV #${id}` : '—')
  }

  /* KPI stats */
  const totalAlerts    = alerts.length
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length
  const highAlerts     = alerts.filter(a => a.severity === 'high').length
  const mediumAlerts   = alerts.filter(a => a.severity === 'medium').length
  const resolvedAlerts = alerts.filter(a => a.is_read).length
  const unreadCount    = alerts.filter(a => !a.is_read).length

  /* pie — by type */
  const typeData = useMemo(() => {
    const counts = {}
    alerts.forEach(a => { counts[a.type] = (counts[a.type] || 0) + 1 })
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value, pct: Math.round(value / totalAlerts * 100) }))
      .sort((a, b) => b.value - a.value)
  }, [alerts])

  /* pie — by severity */
  const sevData = useMemo(() => {
    return SEV_LEVELS
      .map(s => ({ name: s, value: alerts.filter(a => a.severity === s).length }))
      .filter(d => d.value > 0)
  }, [alerts])

  /* trend — last 7 days */
  const trendData = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const label = d.toLocaleDateString('en-IN', { weekday: 'short' })
      const count = alerts.filter(a => {
        const ad = new Date(a.createdAt)
        return ad.toDateString() === d.toDateString()
      }).length
      days.push({ day: label, count })
    }
    return days
  }, [alerts])

  /* type pie colors */
  const TYPE_COLORS = ['#ef4444','#f97316','#3b82f6','#f59e0b','#8b5cf6','#6b7280']

  /* ── filtered + paginated list ─────────────────────────────── */
  const filtered = useMemo(() => {
    return alerts.filter(a => {
      if (search) {
        const q = search.toLowerCase()
        if (
          !a.title?.toLowerCase().includes(q) &&
          !a.type?.toLowerCase().includes(q) &&
          !getAlertVehicleReg(a)?.toLowerCase().includes(q) &&
          !getDriverName(a.driver_id)?.toLowerCase().includes(q)
        ) return false
      }
      if (typeFilter !== 'all' && a.type !== typeFilter)         return false
      if (sevFilter  !== 'all' && a.severity !== sevFilter)      return false
      if (statFilter === 'unread' && a.is_read)                  return false
      if (statFilter === 'read'   && !a.is_read)                 return false
      if (dateFrom && new Date(a.createdAt) < new Date(dateFrom)) return false
      if (dateTo   && new Date(a.createdAt) > new Date(dateTo + 'T23:59:59')) return false
      return true
    })
  }, [alerts, search, typeFilter, sevFilter, statFilter, dateFrom, dateTo])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const resetFilters = () => {
    setSearch(''); setTypeFilter('all'); setSevFilter('all')
    setStatFilter('all'); setDateFrom(''); setDateTo(''); setPage(1)
  }

  /* ── render ─────────────────────────────────────────────────── */
  return (
    <div className="page" style={{ fontFamily: 'var(--font-sans)' }}>

      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Alerts <span>Management</span></h1>
          <p className="page-sub" style={{ color: '#6b7280', fontSize: 13 }}>
            Dashboard › Alerts Management
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-icon" onClick={load} title="Refresh"><RefreshCw size={14} /></button>
          <button className="btn btn-secondary" onClick={handleCheckExpiry} disabled={checking} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldAlert size={14} /> {checking ? 'Checking…' : 'Check Expiry'}
          </button>
          {unreadCount > 0 && (
            <button className="btn btn-secondary" onClick={markAllRead} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCheck size={14} /> Mark All Read
            </button>
          )}
          <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setModal(true) }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} /> Create Alert
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <KpiCards columns={5} stats={[
        { label: 'Total Alerts',    value: totalAlerts,    sub: 'This month',             Icon: Bell,          ...ALERT_KPI_PALETTE.indigo },
        { label: 'Critical Alerts', value: criticalAlerts, sub: 'Needs immediate action', Icon: ShieldAlert,   ...ALERT_KPI_PALETTE.red },
        { label: 'High Priority',   value: highAlerts,     sub: 'High priority alerts',   Icon: AlertTriangle, ...ALERT_KPI_PALETTE.orange },
        { label: 'Medium Priority', value: mediumAlerts,   sub: 'Medium priority alerts', Icon: Info,          ...ALERT_KPI_PALETTE.blue },
        { label: 'Resolved',        value: resolvedAlerts, sub: 'Alerts resolved',        Icon: CheckCheck,    ...ALERT_KPI_PALETTE.green },
      ]} />

      {/* ── Charts Row ── */}
      <style>{`
        @keyframes kpi-ring-pulse {
          0%   { transform: scale(1);   opacity: 0.7; }
          70%  { transform: scale(1.8); opacity: 0;   }
          100% { transform: scale(1);   opacity: 0;   }
        }
        .kpi-card:hover .kpi-ring { animation: kpi-ring-pulse 1.6s ease-in-out infinite; }
        .kpi-card:hover .kpi-icon { transform: scale(1.18) rotate(-8deg); }
        .kpi-icon {
          transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease;
        }
        .kpi-card:hover .kpi-icon { box-shadow: 0 6px 16px var(--icon-glow, rgba(0,0,0,0.18)); }
        .alert-chart-card {
          transition: transform 0.25s cubic-bezier(0.34,1.3,0.64,1), box-shadow 0.25s ease, border-color 0.25s ease;
        }
        .alert-chart-card:hover {
          transform: translateY(-4px);
        }
        .alert-chart-card.glow-indigo:hover { box-shadow: 0 0 20px 1px ${withAlpha(ALERT_KPI_PALETTE.indigo.glow, 0.30)}, 0 8px 20px rgba(15,23,42,0.07); }
        .alert-chart-card.glow-blue:hover   { box-shadow: 0 0 20px 1px ${withAlpha(ALERT_KPI_PALETTE.blue.glow, 0.30)}, 0 8px 20px rgba(15,23,42,0.07); }
        .alert-chart-card.glow-orange:hover { box-shadow: 0 0 20px 1px ${withAlpha(ALERT_KPI_PALETTE.orange.glow, 0.30)}, 0 8px 20px rgba(15,23,42,0.07); }
      `}</style>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1fr', gap: 16, marginBottom: 24 }}>

        {/* Alerts by Type — Pie */}
        <div className="alert-chart-card glow-indigo" style={{
          background: '#fff', border: `1px solid ${ALERT_KPI_PALETTE.indigo.border}`, borderRadius: 12, padding: '16px 20px',
          boxShadow: `0 0 12px 0px ${withAlpha(ALERT_KPI_PALETTE.indigo.glow, 0.18)}, 0 1px 3px rgba(15,23,42,0.04)`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Alerts by Type</span>
          </div>
          {totalAlerts === 0 ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: '40px 0' }}>No data yet</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <ResponsiveContainer width={110} height={110}>
                <PieChart>
                  <Pie data={typeData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" paddingAngle={2}>
                    {typeData.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                  </Pie>
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 13, fontWeight: 700, fill: '#111827' }}>{totalAlerts}</text>
                  <text x="50%" y="65%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 9, fill: '#6b7280' }}>Total</text>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {typeData.slice(0, 5).map((d, i) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: TYPE_COLORS[i % TYPE_COLORS.length], flexShrink: 0 }} />
                    <span style={{ flex: 1, color: '#374151', textTransform: 'capitalize' }}>{d.name.replace('_', ' ')}</span>
                    <span style={{ color: '#6b7280', fontWeight: 600 }}>{d.value} ({d.pct}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Trend — Area chart */}
        <div className="alert-chart-card glow-blue" style={{
          background: '#fff', border: `1px solid ${ALERT_KPI_PALETTE.blue.border}`, borderRadius: 12, padding: '16px 20px',
          boxShadow: `0 0 12px 0px ${withAlpha(ALERT_KPI_PALETTE.blue.glow, 0.18)}, 0 1px 3px rgba(15,23,42,0.04)`,
        }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Alerts Trend (Last 7 Days)</div>
          <ResponsiveContainer width="100%" height={110}>
            <AreaChart data={trendData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="alertGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
              <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#alertGrad)"
                dot={{ r: 3, fill: '#3b82f6' }} label={{ position: 'top', fontSize: 10, fill: '#374151' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Alerts by Severity — Pie */}
        <div className="alert-chart-card glow-orange" style={{
          background: '#fff', border: `1px solid ${ALERT_KPI_PALETTE.orange.border}`, borderRadius: 12, padding: '16px 20px',
          boxShadow: `0 0 12px 0px ${withAlpha(ALERT_KPI_PALETTE.orange.glow, 0.18)}, 0 1px 3px rgba(15,23,42,0.04)`,
        }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Alerts by Priority</div>
          {totalAlerts === 0 ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: '40px 0' }}>No data yet</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <ResponsiveContainer width={110} height={110}>
                <PieChart>
                  <Pie data={sevData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" paddingAngle={2}>
                    {sevData.map(d => <Cell key={d.name} fill={SEV_COLOR[d.name]} />)}
                  </Pie>
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 13, fontWeight: 700, fill: '#111827' }}>{totalAlerts}</text>
                  <text x="50%" y="65%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 9, fill: '#6b7280' }}>Total</text>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {sevData.map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: SEV_COLOR[d.name], flexShrink: 0 }} />
                    <span style={{ flex: 1, color: '#374151', textTransform: 'capitalize' }}>{d.name}</span>
                    <span style={{ color: '#6b7280', fontWeight: 600 }}>{d.value} ({Math.round(d.value / totalAlerts * 100)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 20px', marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr auto auto', gap: 10, alignItems: 'end' }}>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              className="input"
              style={{ paddingLeft: 32, fontSize: 13 }}
              placeholder="Search by type, vehicle or driver..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>

          {/* Type */}
          <div>
            <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Alert Type</label>
            <select className="input" style={{ fontSize: 13 }} value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}>
              <option value="all">All Types</option>
              {ALERT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Priority</label>
            <select className="input" style={{ fontSize: 13 }} value={sevFilter} onChange={e => { setSevFilter(e.target.value); setPage(1) }}>
              <option value="all">All Priorities</option>
              {SEV_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Status */}
          <div>
            <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Status</label>
            <select className="input" style={{ fontSize: 13 }} value={statFilter} onChange={e => { setStatFilter(e.target.value); setPage(1) }}>
              <option value="all">All Status</option>
              <option value="unread">Active</option>
              <option value="read">Resolved</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>From</label>
            <input className="input" style={{ fontSize: 13 }} type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }} />
          </div>

          {/* Date To */}
          <div>
            <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>To</label>
            <input className="input" style={{ fontSize: 13 }} type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }} />
          </div>

          {/* Filter btn */}
          <button className="btn btn-primary" style={{ height: 38, display: 'flex', alignItems: 'center', gap: 6, marginTop: 18 }} onClick={() => setPage(1)}>
            <Search size={13} /> Filter
          </button>

          {/* Reset btn */}
          <button className="btn btn-secondary" style={{ height: 38, display: 'flex', alignItems: 'center', gap: 6, marginTop: 18 }} onClick={resetFilters}>
            <RotateCcw size={13} /> Reset
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #f3f4f6' }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>
            Recent Alerts
            <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 12, marginLeft: 8 }}>
              Showing {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
            </span>
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af', fontSize: 14 }}>Loading alerts…</div>
        ) : paginated.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
            <Bell size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
            <div style={{ fontSize: 14 }}>No alerts found</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Try adjusting your filters</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {['#','Alert ID','Alert Type','Vehicle','Driver','Priority','Alert Time','Status','Action'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((a, idx) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f3f4f6', background: a.is_read ? '#fafafa' : '#fff' }}>
                    <td style={{ padding: '12px 14px', color: '#9ca3af', fontSize: 12 }}>{(page - 1) * PER_PAGE + idx + 1}</td>
                    <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#374151', whiteSpace: 'nowrap' }}>
                      ALT-{String(a.id).padStart(4, '0')}
                    </td>
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{TYPE_ICON[a.type] || '⚠️'}</span>
                        <span style={{ color: '#111827', fontWeight: 500, textTransform: 'capitalize' }}>{a.type?.replace('_', ' ') || '—'}</span>
                      </span>
                      {a.title && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{a.title}</div>}
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#374151' }}>
                      {getAlertVehicleReg(a)}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#374151' }}>{getDriverName(a.driver_id)}</td>
                    <td style={{ padding: '12px 14px' }}><SevBadge sev={a.severity} /></td>
                    <td style={{ padding: '12px 14px', color: '#6b7280', fontSize: 12, whiteSpace: 'nowrap' }}>{fmtTime(a.createdAt)}</td>
                    <td style={{ padding: '12px 14px' }}><StatusBadge read={a.is_read} /></td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          title="View details"
                          onClick={() => setViewAlert(a)}
                          style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: '#3b82f6', display: 'flex', alignItems: 'center' }}>
                          <Eye size={13} />
                        </button>
                        {!a.is_read && (
                          <button
                            title="Mark as read"
                            onClick={() => markRead(a.id)}
                            style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: '#22c55e', display: 'flex', alignItems: 'center' }}>
                            <CheckCheck size={13} />
                          </button>
                        )}
                        {a.is_read && (
                          <button
                            title="Already resolved"
                            disabled
                            style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 6px', cursor: 'not-allowed', color: '#d1d5db', display: 'flex', alignItems: 'center' }}>
                            <RotateCcw size={13} />
                          </button>
                        )}
                        <button
                          title="Delete"
                          onClick={() => handleRemove(a.id)}
                          style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > PER_PAGE && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid #f3f4f6' }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              Showing {(page - 1) * PER_PAGE + 1} to {Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} alerts
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                style={{ padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: 6, background: page === 1 ? '#f9fafb' : '#fff', color: page === 1 ? '#d1d5db' : '#374151', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 12 }}>
                «
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: 6, background: page === 1 ? '#f9fafb' : '#fff', color: page === 1 ? '#d1d5db' : '#374151', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 12 }}>
                ‹
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
                return (
                  <button key={p} onClick={() => setPage(p)}
                    style={{ padding: '4px 10px', border: '1px solid', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                      borderColor: p === page ? '#3b82f6' : '#e5e7eb',
                      background:  p === page ? '#3b82f6' : '#fff',
                      color:       p === page ? '#fff'    : '#374151' }}>
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: 6, background: page === totalPages ? '#f9fafb' : '#fff', color: page === totalPages ? '#d1d5db' : '#374151', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: 12 }}>
                ›
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                style={{ padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: 6, background: page === totalPages ? '#f9fafb' : '#fff', color: page === totalPages ? '#d1d5db' : '#374151', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: 12 }}>
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Create Alert Modal ── */}
      {modal && (
        <div className="overlay" onClick={() => setModal(false)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={16} /> Create Alert
              </h2>
              <button className="btn-icon" onClick={() => setModal(false)}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="input" value={form.title} onChange={f('title')} placeholder="Alert title" />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="input" value={form.type} onChange={f('type')}>
                    {ALERT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Severity</label>
                  <select className="input" value={form.severity} onChange={f('severity')}>
                    {SEV_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Vehicle</label>
                  <select className="input" value={form.vehicle_id} onChange={f('vehicle_id')}>
                    <option value="">None</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_no}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Driver</label>
                  <select className="input" value={form.driver_id} onChange={f('driver_id')}>
                    <option value="">None</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.user?.name || `Driver #${d.id}`}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea className="input" value={form.message} onChange={f('message')} rows={3} placeholder="Describe the alert..." />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? 'Creating…' : 'Create Alert'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Alert Details Modal ── */}
      {viewAlert && (
        <div className="overlay" onClick={() => setViewAlert(null)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{TYPE_ICON[viewAlert.type] || '⚠️'}</span>
                ALT-{String(viewAlert.id).padStart(4, '0')}
              </h2>
              <button className="btn-icon" onClick={() => setViewAlert(null)}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <SevBadge sev={viewAlert.severity} />
                <StatusBadge read={viewAlert.is_read} />
                <span style={{ fontSize: 12, color: '#6b7280', alignSelf: 'center' }}>{fmtTime(viewAlert.createdAt)}</span>
              </div>

              <div className="form-grid">
                <div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Vehicle</div>
                  <div style={{ fontSize: 13, color: '#111827' }}>{getAlertVehicleReg(viewAlert)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Driver</div>
                  <div style={{ fontSize: 13, color: '#111827' }}>{getDriverName(viewAlert.driver_id)}</div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Title</label>
                <div style={{ fontSize: 14, color: '#111827', fontWeight: 500 }}>{viewAlert.title || '—'}</div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <div style={{
                  fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap',
                  background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8,
                  padding: '10px 12px', minHeight: 40,
                }}>
                  {viewAlert.message || 'No description provided.'}
                </div>
              </div>

              {viewAlert.voice_note && (
                <div className="form-group">
                  <label className="form-label">Voice Note</label>
                  <audio controls src={viewAlert.voice_note} style={{ width: '100%', height: 36 }} />
                </div>
              )}
            </div>

            <div className="modal-footer">
              {!viewAlert.is_read && (
                <button className="btn btn-ghost" onClick={() => { markRead(viewAlert.id); setViewAlert(null) }}>
                  Mark as Read
                </button>
              )}
              <button className="btn btn-primary" onClick={() => setViewAlert(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}