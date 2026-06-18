import { useState, useEffect } from 'react'
import { Plus, Trash2, RefreshCw, Fuel as FuelIcon, Droplet, Wallet } from 'lucide-react'
import { fuelAPI, vehicleAPI } from '../services/api'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import { LoadingState, EmptyState, PageHeader } from '../components/Common'

const EMPTY = { vehicle_id: '', driver_id: '', litres: '', cost_per_litre: '', odometer_km: '', fuel_type: 'diesel', station_name: '' }

export default function Fuel() {
  const [logs, setLogs] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('')
  const toast = useToast()

  const load = () => {
    setLoading(true)
    Promise.all([fuelAPI.getAll(filter ? { vehicle_id: filter } : {}), vehicleAPI.getAll()])
      .then(([f, v]) => { setLogs(f.data.data); setVehicles(v.data.data) })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [filter])

  const handleSave = async () => {
    setSaving(true)
    try { await fuelAPI.create(form); toast.success('Fuel log added'); setModal(false); load() }
    catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this fuel log?')) return
    try { await fuelAPI.remove(id); toast.success('Deleted'); load() }
    catch { toast.error('Delete failed') }
  }

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const totalLitres = logs.reduce((s, l) => s + (l.litres || 0), 0)
  const totalCost = logs.reduce((s, l) => s + parseFloat(l.total_cost || 0), 0)

  return (
    <div className="page-enter">
      <PageHeader title="Fuel" accent="Logs" sub={`${logs.length} records`}>
        <button className="btn-icon" onClick={load} title="Refresh"><RefreshCw size={14} /></button>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setModal(true) }}><Plus size={15} /> Log Fuel</button>
      </PageHeader>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card blue">
          <div className="stat-icon blue"><FuelIcon size={18} /></div>
          <div className="stat-label">Total Records</div>
          <div className="stat-value">{logs.length}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon blue"><Droplet size={18} /></div>
          <div className="stat-label">Total Litres</div>
          <div className="stat-value">{totalLitres.toFixed(1)}<span style={{ fontSize: '1rem' }}> L</span></div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon green"><Wallet size={18} /></div>
          <div className="stat-label">Total Cost</div>
          <div className="stat-value">₹{totalCost.toFixed(0)}</div>
        </div>
      </div>

      <div className="filter-bar">
        <select className="input" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All vehicles</option>
          {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_no}</option>)}
        </select>
      </div>

      <div className="table-container">
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Date</th><th>Vehicle</th><th>Fuel Type</th><th>Litres</th><th>Cost/L</th><th>Total</th><th>Odometer</th><th>Station</th><th></th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9}><LoadingState label="Loading fuel logs…" /></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={9}><EmptyState icon="⛽" title="No fuel logs found" sub="Log a fill-up to see it here" /></td></tr>
              ) : logs.map(l => (
                <tr key={l.id}>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(l.filled_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</span></td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand)', fontSize: '0.82rem', fontWeight: 600 }}>#{l.vehicle_id}</span></td>
                  <td><span className="badge badge-blue">{l.fuel_type}</span></td>
                  <td><span style={{ fontFamily: 'var(--font-mono)' }}>{l.litres} L</span></td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>₹{l.cost_per_litre || '—'}</span></td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--green)', fontWeight: 700 }}>₹{parseFloat(l.total_cost || 0).toFixed(2)}</span></td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{l.odometer_km ? `${l.odometer_km.toLocaleString()} km` : '—'}</span></td>
                  <td>{l.station_name || '—'}</td>
                  <td><button className="btn-icon" onClick={() => handleDelete(l.id)} style={{ color: 'var(--red)' }}><Trash2 size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal
          title={<span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FuelIcon size={16} /> Log Fuel</span>}
          onClose={() => setModal(false)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Log'}</button>
          </>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group"><label className="form-label">Vehicle *</label>
              <select className="input" value={form.vehicle_id} onChange={f('vehicle_id')}>
                <option value="">Select vehicle</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_no} — {v.make} {v.model}</option>)}
              </select>
            </div>
            <div className="form-grid-2">
              <div className="form-group"><label className="form-label">Litres *</label><input className="input" type="number" step="0.1" value={form.litres} onChange={f('litres')} /></div>
              <div className="form-group"><label className="form-label">Cost Per Litre (₹)</label><input className="input" type="number" step="0.01" value={form.cost_per_litre} onChange={f('cost_per_litre')} /></div>
              <div className="form-group"><label className="form-label">Fuel Type</label>
                <select className="input" value={form.fuel_type} onChange={f('fuel_type')}>
                  {['petrol','diesel','electric','hybrid'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Odometer (km)</label><input className="input" type="number" value={form.odometer_km} onChange={f('odometer_km')} /></div>
            </div>
            <div className="form-group"><label className="form-label">Station Name</label><input className="input" value={form.station_name} onChange={f('station_name')} placeholder="HP / Indian Oil…" /></div>
          </div>
        </Modal>
      )}
    </div>
  )
}
