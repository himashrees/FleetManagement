import { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, User, Car, Shield, Camera } from 'lucide-react'
import { driverAPI, vehicleAPI } from '../services/api'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import { LoadingState, EmptyState, PageHeader } from '../components/Common'

const STATUS_BADGE = { available: 'badge-green', on_trip: 'badge-blue', off_duty: 'badge-slate', suspended: 'badge-red' }
const SAFETY_BADGE = { good: 'badge-green', fair: 'badge-amber', critical: 'badge-red' }

const EMPTY = {
  name: '', email: '', phone: '', license_number: '', license_expiry: '',
  license_type: 'LMV', experience_years: 0, status: 'available',
  address: '', emergency_contact: '', assigned_vehicle_id: '',
}

export default function Drivers() {
  const [drivers, setDrivers]   = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [photoFile, setPhotoFile]       = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [saving, setSaving]     = useState(false)
  const fileInputRef = useRef(null)
  const toast = useToast()

  const load = () => {
    setLoading(true)
    Promise.all([driverAPI.getAll(), vehicleAPI.getAll({ status: 'active' })])
      .then(([d, v]) => { setDrivers(d.data.data); setVehicles(v.data.data) })
      .catch(() => toast.error('Failed to load drivers'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const resetPhoto = () => { setPhotoFile(null); setPhotoPreview(null) }

  const openAdd = () => { setForm(EMPTY); resetPhoto(); setModal('add') }
  const openEdit = (d) => {
    setForm({
      ...d,
      name: d.user?.name || '',
      email: d.user?.email || '',
      phone: d.user?.phone || '',
      assigned_vehicle_id: d.assigned_vehicle_id || '',
    })
    setSelected(d)
    resetPhoto()
    setModal('edit')
  }
  const openDelete = (d) => { setSelected(d); setModal('delete') }

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.assigned_vehicle_id) delete payload.assigned_vehicle_id
      if (!payload.email) delete payload.email
      if (!payload.phone) delete payload.phone
      delete payload.id; delete payload.user; delete payload.assignedVehicle
      delete payload.createdAt; delete payload.updatedAt
      delete payload.safety_score; delete payload.safety_level
      delete payload.safety_breakdown; delete payload.completed_trips

      let driverId = selected?.id
      if (modal === 'add') {
        const r = await driverAPI.create(payload)
        driverId = r.data.data?.id
        toast.success('Driver added')
      } else {
        await driverAPI.update(selected.id, payload)
        toast.success('Driver updated')
      }

      // Upload photo if selected and API supports it
      if (photoFile && driverId && driverAPI.uploadPhoto) {
        const fd = new FormData()
        fd.append('photo', photoFile)
        await driverAPI.uploadPhoto(driverId, fd).catch(() => {})
      }

      setModal(null); load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setSaving(true)
    try { await driverAPI.remove(selected.id); toast.success('Driver deleted'); setModal(null); load() }
    catch { toast.error('Delete failed') }
    finally { setSaving(false) }
  }

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="page-enter">
      <PageHeader title="Fleet" accent="Drivers" sub={`${drivers.length} drivers in the system`}>
        <button className="btn-icon" onClick={load} title="Refresh"><RefreshCw size={14} /></button>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Add Driver</button>
      </PageHeader>

      <div className="table-container">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>License No</th><th>Driver</th><th>Type</th><th>Experience</th>
                <th>Expiry</th><th>Assigned Vehicle</th><th>Status</th><th>Safety</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9}><LoadingState label="Loading drivers…" /></td></tr>
              ) : drivers.length === 0 ? (
                <tr><td colSpan={9}><EmptyState icon="🧑‍✈️" title="No drivers found" sub="Add a driver to get started" /></td></tr>
              ) : drivers.map(d => (
                <tr key={d.id}>
                  <td><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand)', fontSize: '0.82rem', fontWeight: 600 }}>{d.license_number}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* stamp photo or fallback avatar */}
                      {d.photo_path ? (
                        <img src={d.photo_path} alt=""
                          style={{ width: 30, height: 30, borderRadius: 'var(--radius)', objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 30, height: 30, borderRadius: 'var(--radius)', background: 'var(--brand-light)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <User size={13} color="var(--brand)" />
                        </div>
                      )}
                      <div>
                        <div className="td-primary" style={{ fontSize: '0.84rem' }}>{d.user?.name || `User #${d.user_id}`}</div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{d.user?.email || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{d.license_type}</span></td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{d.experience_years} yrs</span></td>
                  <td>
                    {d.license_expiry ? (
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.8rem',
                        color: new Date(d.license_expiry) < new Date() ? 'var(--red)'
                          : (new Date(d.license_expiry) - new Date()) / 86400000 <= 30 ? 'var(--amber)'
                          : 'var(--text-secondary)',
                      }}>{d.license_expiry}</span>
                    ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td>
                    {d.assignedVehicle ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Car size={12} color="var(--brand)" />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--brand)' }}>{d.assignedVehicle.registration_no}</span>
                      </div>
                    ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>}
                  </td>
                  <td><span className={`badge ${STATUS_BADGE[d.status] || 'badge-slate'}`}>{d.status?.replace('_', ' ')}</span></td>
                  <td>
                    {d.safety_score !== undefined ? (
                      <span className={`badge ${SAFETY_BADGE[d.safety_level] || 'badge-slate'}`}>
                        <Shield size={10} /> {d.safety_score}
                      </span>
                    ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn-icon" onClick={() => openEdit(d)}><Pencil size={13} /></button>
                      <button className="btn-icon" onClick={() => openDelete(d)} style={{ color: 'var(--red)' }}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      {(modal === 'add' || modal === 'edit') && (
        <Modal
          title={modal === 'add' ? 'Add Driver' : 'Edit Driver'}
          onClose={() => setModal(null)}
          wide
          footer={<>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Driver'}</button>
          </>}
        >
          {/* ── Stamp-size photo upload ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '76px', height: '76px', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                border: '1.5px dashed var(--border-dark)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: 'var(--bg-canvas)', overflow: 'hidden', flexShrink: 0,
              }}
            >
              {(photoPreview || selected?.photo_path) ? (
                <img src={photoPreview || selected?.photo_path} alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={26} color="var(--text-muted)" />
              )}
            </div>
            <div>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => fileInputRef.current?.click()}>
                <Camera size={13} /> {photoPreview || selected?.photo_path ? 'Change Photo' : 'Upload Driver Photo'}
              </button>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '5px' }}>
                Optional · JPG/PNG, up to 5MB
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: 'none' }} />
          </div>

          {/* ── Form fields ── */}
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Driver Name *</label>
              <input className="input" value={form.name} onChange={f('name')} placeholder="e.g. Ravi Kumar" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="input" type="email" value={form.email} onChange={f('email')} placeholder="driver@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="input" value={form.phone} onChange={f('phone')} placeholder="9876543210" />
            </div>
            <div className="form-group">
              <label className="form-label">License Number *</label>
              <input className="input" value={form.license_number} onChange={f('license_number')} />
            </div>
            <div className="form-group">
              <label className="form-label">License Type</label>
              <select className="input" value={form.license_type} onChange={f('license_type')}>
                {['LMV','HMV','HPMV','PSV','Transport'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">License Expiry</label>
              <input className="input" type="date" value={form.license_expiry} onChange={f('license_expiry')} />
            </div>
            <div className="form-group">
              <label className="form-label">Experience (years)</label>
              <input className="input" type="number" value={form.experience_years} onChange={f('experience_years')} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="input" value={form.status} onChange={f('status')}>
                {['available','on_trip','off_duty','suspended'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Emergency Contact</label>
              <input className="input" value={form.emergency_contact} onChange={f('emergency_contact')} />
            </div>
            <div className="form-group">
              <label className="form-label">Assign Vehicle</label>
              <select className="input" value={form.assigned_vehicle_id} onChange={f('assigned_vehicle_id')}>
                <option value="">None</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.registration_no} — {v.make} {v.model}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '14px' }}>
            <label className="form-label">Address</label>
            <textarea className="input" value={form.address} onChange={f('address')} rows={2} />
          </div>
        </Modal>
      )}

      {/* ── Delete Modal ── */}
      {modal === 'delete' && (
        <Modal
          title="Confirm Delete"
          onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting…' : 'Delete'}</button>
          </>}
        >
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Delete driver <strong style={{ color: 'var(--text-primary)' }}>{selected?.license_number}</strong>? This cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  )
}