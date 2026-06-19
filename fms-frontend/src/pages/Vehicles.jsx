import { useState, useEffect, useRef } from 'react'
import { Plus, Search, Pencil, Trash2, Truck, RefreshCw, Brain, AlertTriangle, CheckCircle, Camera } from 'lucide-react'
import { vehicleAPI, maintenanceAPI } from '../services/api'
import { mlVehicleAPI } from '../services/mlApi'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import { LoadingState, EmptyState, PageHeader } from '../components/Common'

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
  const label = score >= 70 ? 'Good'    : score >= 40 ? 'Fair'    : 'Critical'
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

export default function Vehicles() {
  const [vehicles,     setVehicles]     = useState([])
  const [healthMap,    setHealthMap]    = useState({})
  const [mlOnline,     setMlOnline]     = useState(false)
  const [mlLoading,    setMlLoading]    = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modal,        setModal]        = useState(null)
  const [selected,     setSelected]     = useState(null)
  const [form,         setForm]         = useState(EMPTY)
  const [preview,      setPreview]      = useState(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)
  const [saving,       setSaving]       = useState(false)
  const fileRef = useRef(null)
  const toast   = useToast()

  const load = () => {
    setLoading(true)
    vehicleAPI.getAll({ status: statusFilter || undefined })
      .then(r => { setVehicles(r.data.data || []); return r.data.data || [] })
      .then(list => fetchML(list))
      .catch(() => toast.error('Failed to load vehicles'))
      .finally(() => setLoading(false))
  }

  const fetchML = async (list) => {
    try {
      const ping = await fetch('http://localhost:8000/health')
      if (!ping.ok) { setMlOnline(false); return }
      setMlOnline(true); setMlLoading(true)
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
    } catch { setMlOnline(false) }
    finally   { setMlLoading(false) }
  }

  useEffect(() => { load() }, [statusFilter])

  const openAdd = () => {
    setForm(EMPTY); setPreview(null); setPhotoRemoved(false); setSelected(null); setModal('add')
  }

  const openEdit = (v) => {
    setForm({
      registration_no:  v.registration_no  || '',
      make:             v.make             || '',
      model:            v.model            || '',
      year:             v.year             || '',
      type:             v.type             || 'car',
      fuel_type:        v.fuel_type        || 'diesel',
      status:           v.status           || 'active',
      odometer_km:      v.odometer_km      || 0,
      capacity_kg:      v.capacity_kg      || '',
      color:            v.color            || '',
      vin_number:       v.vin_number       || '',
      insurance_expiry: v.insurance_expiry || '',
      rc_expiry:        v.rc_expiry        || '',
      photo_url:        v.photo_url        || '',
    })
    setPreview(v.photo_url || null)
    setPhotoRemoved(false)
    setSelected(v); setModal('edit')
  }

  const openDelete = (v) => { setSelected(v); setModal('delete') }

  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) { toast.error('Photo must be under 3MB'); return }
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result)
      setForm(p => ({ ...p, photo_url: reader.result }))
      setPhotoRemoved(false)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
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
      payload.odometer_km       = parseFloat(form.odometer_km) || 0
      if (form.color)           payload.color           = form.color
      if (form.vin_number)      payload.vin_number      = form.vin_number
      if (form.capacity_kg)     payload.capacity_kg     = parseFloat(form.capacity_kg)
      if (form.photo_url)       payload.photo_url       = form.photo_url
      else if (photoRemoved)    payload.photo_url       = ''
      const ins = toISO(form.insurance_expiry)
      const rc  = toISO(form.rc_expiry)
      if (ins) payload.insurance_expiry = ins
      if (rc)  payload.rc_expiry        = rc
      if (modal === 'add') { await vehicleAPI.create(payload); toast.success('Vehicle added') }
      else                 { await vehicleAPI.update(selected.id, payload); toast.success('Vehicle updated') }
      setModal(null); load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setSaving(true)
    try { await vehicleAPI.remove(selected.id); toast.success('Deleted'); setModal(null); load() }
    catch { toast.error('Delete failed') }
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

  return (
    <div className="page-enter">
      <PageHeader title="Fleet" accent="Vehicles" sub={`${vehicles.length} vehicles in the system`}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontFamily: 'monospace' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: mlOnline ? '#16a34a' : '#dc2626', display: 'inline-block' }} />
          <span style={{ color: mlOnline ? '#16a34a' : '#dc2626' }}>ML {mlOnline ? 'ONLINE' : 'OFFLINE'}</span>
        </span>
        <button className="btn-icon" onClick={load} title="Refresh"><RefreshCw size={14} /></button>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Add Vehicle</button>
      </PageHeader>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input className="input" placeholder="Search reg, make, model…" value={search}
            onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32, minWidth: 220 }} />
        </div>
        <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="">All Status</option>
          {['active', 'inactive', 'maintenance', 'retired'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="table-container">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Registration</th><th>Make / Model</th><th>Type</th>
                <th>Fuel</th><th>Odometer</th><th>Insurance Expiry</th><th>Status</th>
                <th><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Brain size={13} color="#7c3aed" /> ML Health</span></th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9}><LoadingState label="Loading vehicles…" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9}><EmptyState icon="🚚" title="No vehicles found" sub="Add a vehicle to get started" /></td></tr>
              ) : filtered.map(v => (
                <tr key={v.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {v.photo_url ? (
                        <img src={v.photo_url} alt="" style={{ width: 30, height: 30, borderRadius: 'var(--radius)', objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 30, height: 30, borderRadius: 'var(--radius)', background: 'var(--brand-light)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Truck size={13} color="var(--brand)" />
                        </div>
                      )}
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand)', fontSize: '0.82rem', fontWeight: 600 }}>{v.registration_no}</span>
                    </div>
                  </td>
                  <td>
                    <div className="td-primary" style={{ fontSize: '0.84rem' }}>{v.make} {v.model}</div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{v.year}</div>
                  </td>
                  <td><span className={`badge ${TYPE_BADGE[v.type] || 'badge-slate'}`}>{v.type}</span></td>
                  <td><span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>{v.fuel_type}</span></td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{Number(v.odometer_km).toLocaleString()} km</span></td>
                  <td>
                    {v.insurance_expiry
                      ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: expiryColor(v.insurance_expiry) }}>
                          {new Date(v.insurance_expiry).toLocaleDateString('en-IN')}
                        </span>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td><span className={`badge ${STATUS_BADGE[v.status] || 'badge-slate'}`}>{v.status}</span></td>
                  <td>
                    {mlLoading ? <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Calculating...</span>
                      : <ScoreBadge score={healthMap[v.id]?.health_score} />}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
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

      {(modal === 'add' || modal === 'edit') && (
        <Modal
          title={modal === 'add' ? 'Add Vehicle' : 'Edit Vehicle'}
          onClose={() => setModal(null)}
          wide
          footer={<>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Vehicle'}
            </button>
          </>}
        >
          {/* Photo upload */}
          <div style={{ marginBottom: 20, borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1.5px dashed var(--border-dark)' }}>
            {preview ? (
              <img src={preview} alt="vehicle" style={{ width: '100%', height: 180, objectFit: 'contain', display: 'block', background: 'var(--bg-canvas)' }} />
            ) : (
              <div onClick={() => fileRef.current?.click()}
                style={{ width: '100%', height: 180, background: 'var(--bg-canvas)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                <Camera size={28} color="var(--text-muted)" />
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Click to add vehicle photo (optional)</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-canvas)' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Optional · JPG/PNG, up to 3MB</span>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => fileRef.current?.click()}>
                <Camera size={12} /> {preview ? 'Change Photo' : 'Add Photo'}
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Registration No *</label>
              <input className="input" value={form.registration_no} onChange={f('registration_no')} placeholder="KA01AB1234" />
            </div>
            <div className="form-group">
              <label className="form-label">Make</label>
              <input className="input" value={form.make} onChange={f('make')} placeholder="Tata" />
            </div>
            <div className="form-group">
              <label className="form-label">Model</label>
              <input className="input" value={form.model} onChange={f('model')} placeholder="Prima 5530S" />
            </div>
            <div className="form-group">
              <label className="form-label">Year</label>
              <input className="input" type="number" value={form.year} onChange={f('year')} placeholder="2022" />
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <input className="input" value={form.color} onChange={f('color')} placeholder="White" />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="input" value={form.type} onChange={f('type')}>
                {['car', 'van', 'truck', 'bus', 'bike'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Fuel Type</label>
              <select className="input" value={form.fuel_type} onChange={f('fuel_type')}>
                {['petrol', 'diesel', 'electric', 'hybrid'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="input" value={form.status} onChange={f('status')}>
                {['active', 'inactive', 'maintenance', 'retired'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Odometer (km)</label>
              <input className="input" type="number" value={form.odometer_km} onChange={f('odometer_km')} />
            </div>
            <div className="form-group">
              <label className="form-label">Capacity (kg)</label>
              <input className="input" type="number" value={form.capacity_kg} onChange={f('capacity_kg')} placeholder="Optional" />
            </div>
            <div className="form-group">
              <label className="form-label">Insurance Expiry</label>
              <input className="input" type="date" value={form.insurance_expiry} onChange={f('insurance_expiry')} />
            </div>
            <div className="form-group">
              <label className="form-label">RC Expiry</label>
              <input className="input" type="date" value={form.rc_expiry} onChange={f('rc_expiry')} />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: 14 }}>
            <label className="form-label">VIN Number (Optional)</label>
            <input className="input" value={form.vin_number} onChange={f('vin_number')} placeholder="17-char VIN" />
          </div>
        </Modal>
      )}

      {modal === 'delete' && (
        <Modal
          title="Confirm Delete"
          onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>
              {saving ? 'Deleting…' : 'Delete'}
            </button>
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