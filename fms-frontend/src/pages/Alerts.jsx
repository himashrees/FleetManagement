import { useState, useEffect } from 'react'
import { Bell, CheckCheck, Plus, RefreshCw, AlertTriangle, AlertCircle, Info, Zap, ShieldAlert } from 'lucide-react'
import { alertAPI } from '../services/api'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import { LoadingState, EmptyState, PageHeader } from '../components/Common'

const SEV_BADGE = { low: 'badge-blue', medium: 'badge-amber', high: 'badge-red', critical: 'badge-red' }
const SEV_ICON = { low: Info, medium: AlertCircle, high: AlertTriangle, critical: Zap }
const SEV_COLOR = { low: 'var(--blue)', medium: 'var(--amber)', high: 'var(--red)', critical: 'var(--red)' }

const EMPTY = { vehicle_id: '', driver_id: '', type: 'other', title: '', message: '', severity: 'medium' }

export default function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [checking, setChecking] = useState(false)
  const toast = useToast()

  const load = () => {
    setLoading(true)
    const params = {}
    if (filter === 'unread') params.is_read = false
    if (['low','medium','high','critical'].includes(filter)) params.severity = filter
    alertAPI.getAll(params)
      .then(r => setAlerts(r.data.data || []))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [filter])

  const markRead = async (id) => {
    try { await alertAPI.markRead(id); load() }
    catch { toast.error('Failed') }
  }

  const markAllRead = async () => {
    try { await alertAPI.markAllRead(); toast.success('All marked as read'); load() }
    catch { toast.error('Failed') }
  }

  const handleCreate = async () => {
    setSaving(true)
    try { await alertAPI.create(form); toast.success('Alert created'); setModal(false); load() }
    catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const handleCheckExpiry = async () => {
    setChecking(true)
    try {
      const r = await alertAPI.checkExpiry()
      toast.success(r.data.message || 'Check complete')
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Check failed') }
    finally { setChecking(false) }
  }

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  const unreadCount = alerts.filter(a => !a.is_read).length

  return (
    <div className="page-enter">
      <PageHeader title="System" accent="Alerts" sub={`${unreadCount} unread · ${alerts.length} total`}>
        <button className="btn-icon" onClick={load} title="Refresh"><RefreshCw size={14} /></button>
        <button className="btn btn-secondary" onClick={handleCheckExpiry} disabled={checking}>
          <ShieldAlert size={14} /> {checking ? 'Checking…' : 'Check Expiry Now'}
        </button>
        {unreadCount > 0 && <button className="btn btn-secondary" onClick={markAllRead}><CheckCheck size={14} /> Mark All Read</button>}
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setModal(true) }}><Plus size={15} /> Create Alert</button>
      </PageHeader>

      <div className="filter-bar">
        {['', 'unread', 'low', 'medium', 'high', 'critical'].map(v => (
          <button key={v} className={`btn btn-sm ${filter === v ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(v)}>
            {v === '' ? 'All' : v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState label="Loading alerts…" />
      ) : alerts.length === 0 ? (
        <EmptyState icon="🔔" title="No alerts found" sub="You're all caught up" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {alerts.map(a => {
            const Icon = SEV_ICON[a.severity] || AlertCircle
            return (
              <div key={a.id} className="card" style={{
                borderLeft: `3px solid ${SEV_COLOR[a.severity] || 'var(--amber)'}`,
                padding: '14px 18px',
                display: 'flex', alignItems: 'center', gap: '14px',
                opacity: a.is_read ? 0.6 : 1,
              }}>
                <Icon size={18} color={SEV_COLOR[a.severity]} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{a.title}</span>
                    <span className={`badge ${SEV_BADGE[a.severity] || 'badge-slate'}`}>{a.severity}</span>
                    <span className="badge badge-slate">{a.type}</span>
                  </div>
                  {a.message && <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{a.message}</div>}
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                    {new Date(a.createdAt).toLocaleString('en-IN')}
                    {a.vehicle_id && ` · VEH #${a.vehicle_id}`}
                    {a.driver_id && ` · DRV #${a.driver_id}`}
                  </div>
                </div>
                {!a.is_read && (
                  <button className="btn btn-sm btn-secondary" onClick={() => markRead(a.id)}>
                    <CheckCheck size={12} /> Read
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <Modal
          title={<span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Bell size={15} /> Create Alert</span>}
          onClose={() => setModal(false)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Creating…' : 'Create'}</button>
          </>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group"><label className="form-label">Title *</label><input className="input" value={form.title} onChange={f('title')} placeholder="Alert title" /></div>
            <div className="form-grid-2">
              <div className="form-group"><label className="form-label">Type</label>
                <select className="input" value={form.type} onChange={f('type')}>
                  {['speeding','geofence','maintenance_due','document_expiry','fuel_low','accident','idle','other'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Severity</label>
                <select className="input" value={form.severity} onChange={f('severity')}>
                  {['low','medium','high','critical'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Vehicle ID</label><input className="input" type="number" value={form.vehicle_id} onChange={f('vehicle_id')} /></div>
              <div className="form-group"><label className="form-label">Driver ID</label><input className="input" type="number" value={form.driver_id} onChange={f('driver_id')} /></div>
            </div>
            <div className="form-group"><label className="form-label">Message</label><textarea className="input" value={form.message} onChange={f('message')} rows={3} /></div>
          </div>
        </Modal>
      )}
    </div>
  )
}