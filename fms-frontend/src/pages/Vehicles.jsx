import { useState, useEffect, useRef } from 'react'
import { Plus, Search, Pencil, Trash2, Truck, X, RefreshCw, Brain, AlertTriangle, CheckCircle, Camera } from 'lucide-react'
import { vehicleAPI, maintenanceAPI } from '../services/api'
import { mlVehicleAPI } from '../services/mlApi'
import { useToast } from '../context/ToastContext'

const STATUS_BADGE = { active: 'badge-green', inactive: 'badge-slate', maintenance: 'badge-amber', retired: 'badge-red' }
const TYPE_BADGE   = { truck: 'badge-amber', van: 'badge-blue', car: 'badge-green', bus: 'badge-purple', bike: 'badge-slate' }

const EMPTY = {
  registration_no: '', make: '', model: '', year: '',
  type: 'car', fuel_type: 'diesel', status: 'active',
  odometer_km: 0, capacity_kg: '', color: '', vin_number: '',
  insurance_expiry: '', rc_expiry: '', photo_url: '',
}

// Converts any date format to YYYY-MM-DD for PostgreSQL
function toISODate(val) {
  if (!val) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val           // already correct
  if (/^\d{2}-\d{2}-\d{4}$/.test(val)) {                    // DD-MM-YYYY
    const [d, m, y] = val.split('-')
    return `${y}-${m}-${d}`
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {                  // DD/MM/YYYY
    const [d, m, y] = val.split('/')
    return `${y}-${m}-${d}`
  }
  return val
}

function ScoreBadge({ score }) {
  if (score == null) return <span style={{ color: '#9ca3af', fontSize: '0.78rem' }}>—</span>
  const color = score >= 70 ? '#16a34a' : score >= 40 ? '#d97706' : '#dc2626'
  const label = score >= 70 ? 'Good'   : score >= 40 ? 'Fair'    : 'Critical'
  const bg    = score >= 70 ? '#dcfce7': score >= 40 ? '#fef3c7' : '#fee2e2'
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

function VehiclePhoto({ photoUrl, size = 40 }) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt="vehicle"
        style={{ width: size, height: size, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }}
        onError={e => { e.target.style.display = 'none' }}
      />
    )
  }
  return (
    <div style={{ width: size, height: size, background: '#f3f4f6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Truck size={size * 0.45} color="#9ca3af" />
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
  const [detailV,      setDetailV]      = useState(null)
  const [selected,     setSelected]     = useState(null)
  const [form,         setForm]         = useState(EMPTY)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [saving,       setSaving]       = useState(false)
  const fileRef = useRef(null)
  const toast = useToast()

  /* ── Load vehicles ── */
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
      setMlOnline(true)
      setMlLoading(true)
      const maintRes  = await maintenanceAPI.getAll({}).catch(() => ({ data: { data: [] } }))
      const maintList = maintRes.data.data || []
      const requests  = list.map(v => ({
        vehicle_id:           v.id,
        registration_no:      v.registration_no,
        year:                 parseInt(v.year) || 2020,
        odometer_km:          parseFloat(v.odometer_km) || 0,
        fuel_type:            v.fuel_type || 'diesel',
        status:               v.status,
        maintenance_count:    maintList.filter(m => m.vehicle_id === v.id).length,
        overdue_maintenance:  maintList.filter(m => m.vehicle_id === v.id && m.status === 'overdue').length,
        fuel_logs_count:      0,
        avg_fuel_consumption: 0.1,
        last_service_days_ago:30,
        total_trips:          0,
        alerts_count:         0,
      }))
      const res = await mlVehicleAPI.scoreBatch(requests)
      const map = {}
      res.data.forEach(r => { map[r.vehicle_id] = r })
      setHealthMap(map)
    } catch { setMlOnline(false) }
    finally   { setMlLoading(false) }
  }

  useEffect(() => { load() }, [statusFilter])

  /* ── Photo handler ── */
  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Photo must be under 2MB'); return }
    const reader = new FileReader()
    reader.onloadend = () => {
      setPhotoPreview(reader.result)
      setForm(p => ({ ...p, photo_url: reader.result }))
    }
    reader.readAsDataURL(file)
  }

  /* ── Save ── */
  const handleSave = async () => {
    if (!form.registration_no.trim()) { toast.error('Registration number is required'); return }
    setSaving(true)
    try {
      // Build clean payload — convert dates to YYYY-MM-DD
      const payload = {
        registration_no: form.registration_no.trim().toUpperCase(),
        make:            form.make  || undefined,
        model:           form.model || undefined,
        year:            form.year  ? parseInt(form.year)      : undefined,
        type:            form.type,
        fuel_type:       form.fuel_type,
        status:          form.status,
        odometer_km:     form.odometer_km ? parseFloat(form.odometer_km) : 0,
        color:           form.color       || undefined,
        vin_number:      form.vin_number  || undefined,
        capacity_kg:     form.capacity_kg ? parseFloat(form.capacity_kg) : undefined,
        insurance_expiry:toISODate(form.insurance_expiry) || undefined,
        rc_expiry:       toISODate(form.rc_expiry)        || undefined,
        photo_url:       form.photo_url   || undefined,
      }

      // Remove undefined keys so Sequelize doesn't complain
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k])

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

  const openAdd = () => {
    setForm(EMPTY); setPhotoPreview(null); setSelected(null); setModal('add')
  }

  const openEdit = (v) => {
    setForm({
      ...EMPTY, ...v,
      insurance_expiry: v.insurance_expiry || '',
      rc_expiry:        v.rc_expiry        || '',
      photo_url:        v.photo_url        || '',
    })
    setPhotoPreview(v.photo_url || null)
    setSelected(v)
    setModal('edit')
  }

  const f        = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const filtered = vehicles.filter(v =>
    v.registration_no?.toLowerCase().includes(search.toLowerCase()) ||
    v.make?.toLowerCase().includes(search.toLowerCase()) ||
    v.model?.toLowerCase().includes(search.toLowerCase())
  )
  const hs = detailV ? healthMap[detailV.id] : null

  return (
    <div className="page">
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Fleet <span>Vehicles</span></h1>
          <p className="page-sub">{vehicles.length} vehicles in the system</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontFamily: 'monospace' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: mlOnline ? '#16a34a' : '#dc2626', display: 'inline-block' }} />
            <span style={{ color: mlOnline ? '#16a34a' : '#dc2626' }}>ML {mlOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </span>
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={15} /> ADD VEHICLE
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="filter-bar">
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input className="input" placeholder="Search registration, make, model…" value={search}
            onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32, minWidth: 240 }} />
        </div>
        <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="maintenance">Maintenance</option>
          <option value="retired">Retired</option>
        </select>
        <button className="btn-icon" onClick={load}><RefreshCw size={14} /></button>
      </div>

      {/* ── Table ── */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Registration</th>
              <th>Make / Model</th>
              <th>Type</th>
              <th>Fuel</th>
              <th>Odometer</th>
              <th>Insurance Expiry</th>
              <th>Status</th>
              <th><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Brain size={13} color="#7c3aed" /> ML Health</span></th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No vehicles found</td></tr>
            ) : filtered.map(v => (
              <tr key={v.id} style={{ cursor: 'pointer' }} onClick={() => { setDetailV(v); setModal('detail') }}>
                <td onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <VehiclePhoto photoUrl={v.photo_url} size={36} />
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: '0.82rem', fontWeight: 600 }}>
                      {v.registration_no}
                    </span>
                  </div>
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <div style={{ fontWeight: 500 }}>{v.make} {v.model}</div>
                  <div style={{ fontSize: '0.73rem', color: '#9ca3af' }}>{v.year}</div>
                </td>
                <td onClick={e => e.stopPropagation()}><span className={`badge ${TYPE_BADGE[v.type] || 'badge-slate'}`}>{v.type}</span></td>
                <td onClick={e => e.stopPropagation()}><span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>{v.fuel_type}</span></td>
                <td onClick={e => e.stopPropagation()}><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{Number(v.odometer_km).toLocaleString()} km</span></td>
                <td onClick={e => e.stopPropagation()}>
                  {v.insurance_expiry ? (
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: '0.8rem',
                      color: new Date(v.insurance_expiry) < new Date() ? '#dc2626'
                           : new Date(v.insurance_expiry) < new Date(Date.now() + 30*24*60*60*1000) ? '#d97706'
                           : '#374151',
                    }}>
                      {new Date(v.insurance_expiry).toLocaleDateString('en-IN')}
                    </span>
                  ) : <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>—</span>}
                </td>
                <td onClick={e => e.stopPropagation()}><span className={`badge ${STATUS_BADGE[v.status] || 'badge-slate'}`}>{v.status}</span></td>
                <td onClick={e => e.stopPropagation()}>
                  {mlLoading ? <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Calculating...</span>
                    : <ScoreBadge score={healthMap[v.id]?.health_score} />}
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-icon" onClick={() => openEdit(v)}><Pencil size={13} /></button>
                    <button className="btn-icon" style={{ color: '#dc2626' }} onClick={() => { setSelected(v); setModal('delete') }}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Detail + ML Modal ── */}
      {modal === 'detail' && detailV && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <VehiclePhoto photoUrl={detailV.photo_url} size={32} />
                {detailV.registration_no} — Details
              </div>
              <button className="btn-icon" onClick={() => setModal(null)}><X size={14} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: 10, textTransform: 'uppercase', fontFamily: 'monospace' }}>Vehicle Info</p>
                {[
                  ['Make / Model',    `${detailV.make || ''} ${detailV.model || ''}`.trim() || '—'],
                  ['Year',            detailV.year || '—'],
                  ['Type',            detailV.type],
                  ['Fuel Type',       detailV.fuel_type],
                  ['Color',           detailV.color || '—'],
                  ['Odometer',        `${Number(detailV.odometer_km).toLocaleString()} km`],
                  ['Capacity',        detailV.capacity_kg ? `${detailV.capacity_kg} kg` : '—'],
                  ['VIN',             detailV.vin_number || '—'],
                  ['Insurance Expiry',detailV.insurance_expiry ? new Date(detailV.insurance_expiry).toLocaleDateString('en-IN') : '—'],
                  ['RC Expiry',       detailV.rc_expiry ? new Date(detailV.rc_expiry).toLocaleDateString('en-IN') : '—'],
                  ['Status',          detailV.status],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: '0.85rem' }}>
                    <span style={{ color: '#6b7280' }}>{l}</span>
                    <span style={{ fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: 10, textTransform: 'uppercase', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Brain size={13} color="#7c3aed" /> ML Health Analysis
                </p>
                {!mlOnline ? (
                  <div style={{ background: '#fef2f2', borderRadius: 8, padding: 16, fontSize: '0.85rem', color: '#dc2626' }}>
                    ML service offline.<br />Run: <code>cd fms-ml &amp;&amp; python main.py</code>
                  </div>
                ) : !hs ? (
                  <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Loading...</div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, background: '#f9fafb', borderRadius: 10, marginBottom: 16 }}>
                      <svg width="70" height="70" viewBox="0 0 70 70">
                        <circle cx="35" cy="35" r="28" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                        <circle cx="35" cy="35" r="28" fill="none"
                          stroke={hs.health_score >= 70 ? '#16a34a' : hs.health_score >= 40 ? '#d97706' : '#dc2626'}
                          strokeWidth="6"
                          strokeDasharray={`${(hs.health_score / 100) * 175.9} 175.9`}
                          strokeLinecap="round" transform="rotate(-90 35 35)" />
                        <text x="35" y="40" textAnchor="middle" fontSize="16" fontWeight="700"
                          fill={hs.health_score >= 70 ? '#16a34a' : hs.health_score >= 40 ? '#d97706' : '#dc2626'}>
                          {hs.health_score}
                        </text>
                      </svg>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{hs.health_status}</div>
                        <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 4 }}>
                          {detailV.year ? `${new Date().getFullYear() - parseInt(detailV.year)} yrs old` : ''} · {Number(detailV.odometer_km).toLocaleString()} km
                        </div>
                        {hs.replacement_recommended && (
                          <div style={{ marginTop: 6, fontSize: '0.75rem', color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <AlertTriangle size={11} /> Replacement recommended
                          </div>
                        )}
                      </div>
                    </div>
                    {[['Odometer Score', hs.odometer_score], ['Maintenance Score', hs.maintenance_score], ['Usage Score', hs.usage_score]].map(([label, score]) => (
                      <div key={label} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                          <span style={{ color: '#6b7280' }}>{label}</span>
                          <span style={{ fontWeight: 600 }}>{score}/100</span>
                        </div>
                        <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${score}%`, height: '100%', borderRadius: 3, transition: 'width 0.8s ease',
                            background: score >= 70 ? '#16a34a' : score >= 40 ? '#d97706' : '#dc2626' }} />
                        </div>
                      </div>
                    ))}
                    <div style={{ marginTop: 12, padding: '10px 14px', background: '#f9fafb', borderRadius: 8, fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280' }}>Estimated value remaining</span>
                      <span style={{ fontWeight: 700 }}>{hs.estimated_value_pct}%</span>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <p style={{ fontSize: '0.73rem', color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', fontFamily: 'monospace' }}>Recommendations</p>
                      {hs.recommendations?.map((r, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: '0.8rem', marginBottom: 5, color: '#374151' }}>
                          <CheckCircle size={13} color="#7c3aed" style={{ marginTop: 1, flexShrink: 0 }} />{r}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>CLOSE</button>
              <button className="btn btn-primary" onClick={() => openEdit(detailV)}>
                <Pencil size={13} /> EDIT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{modal === 'add' ? '+ ADD VEHICLE' : 'EDIT VEHICLE'}</div>
              <button className="btn-icon" onClick={() => setModal(null)}><X size={14} /></button>
            </div>

            {/* Photo upload */}
            <div style={{ marginBottom: 20, background: 'var(--bg-canvas)', borderRadius: 'var(--radius)', overflow: 'hidden', position: 'relative' }}>
              {photoPreview ? (
                <img src={photoPreview} alt="vehicle" style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ width: '100%', height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, border: '2px dashed var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer' }}
                  onClick={() => fileRef.current?.click()}>
                  <Camera size={28} color="#9ca3af" />
                  <span style={{ fontSize: '0.82rem', color: '#9ca3af' }}>Click to add vehicle photo (optional)</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px' }}>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Optional · JPG/PNG, up to 2MB</span>
                <button type="button" className="btn btn-ghost" style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                  onClick={() => fileRef.current?.click()}>
                  <Camera size={12} /> {photoPreview ? 'Change Photo' : 'Add Photo'}
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
              {photoPreview && (
                <button type="button" onClick={() => { setPhotoPreview(null); setForm(p => ({ ...p, photo_url: '' })) }}
                  style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 6, color: 'white', cursor: 'pointer', padding: '4px 8px', fontSize: '0.75rem' }}>
                  Remove
                </button>
              )}
            </div>

            {/* Form fields */}
            <div className="form-grid">
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
                  {['car','van','truck','bus','bike'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Fuel Type</label>
                <select className="input" value={form.fuel_type} onChange={f('fuel_type')}>
                  {['petrol','diesel','electric','hybrid'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="input" value={form.status} onChange={f('status')}>
                  {['active','inactive','maintenance','retired'].map(t => <option key={t}>{t}</option>)}
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
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">VIN Number</label>
                <input className="input" value={form.vin_number} onChange={f('vin_number')} placeholder="Optional" />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>CANCEL</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'SAVING...' : 'SAVE VEHICLE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      {modal === 'delete' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ color: '#dc2626' }}>CONFIRM DELETE</div>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#374151' }}>
              Delete <strong>{selected?.registration_no}</strong>? This cannot be undone.
            </p>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>CANCEL</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>
                {saving ? 'DELETING...' : 'DELETE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}