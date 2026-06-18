import { useState, useEffect } from 'react'
import { Plus, Trash2, RefreshCw, FileText, AlertTriangle, Upload } from 'lucide-react'
import { documentAPI, vehicleAPI, driverAPI } from '../services/api'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import { LoadingState, EmptyState, PageHeader } from '../components/Common'

const TYPE_BADGE = { insurance: 'badge-blue', registration: 'badge-green', permit: 'badge-amber', license: 'badge-purple', pollution: 'badge-green', other: 'badge-slate' }

const EMPTY = { vehicle_id: '', driver_id: '', type: 'insurance', title: '', expiry_date: '', issued_date: '', issuing_authority: '', notes: '' }

export default function Documents() {
  const [docs, setDocs] = useState([])
  const [expiring, setExpiring] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const load = () => {
    setLoading(true)
    Promise.all([documentAPI.getAll(), documentAPI.getExpiring(), vehicleAPI.getAll(), driverAPI.getAll()])
      .then(([d, e, v, dr]) => { setDocs(d.data.data); setExpiring(e.data.data); setVehicles(v.data.data); setDrivers(dr.data.data) })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
      if (file) fd.append('file', file)
      await documentAPI.upload(fd)
      toast.success('Document uploaded')
      setModal(false); setForm(EMPTY); setFile(null); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Upload failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this document?')) return
    try { await documentAPI.remove(id); toast.success('Deleted'); load() }
    catch { toast.error('Delete failed') }
  }

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const isExpiring = (expiry) => {
    if (!expiry) return false
    const d = new Date(expiry)
    const now = new Date()
    const diff = (d - now) / (1000 * 60 * 60 * 24)
    return diff >= 0 && diff <= 30
  }
  const isExpired = (expiry) => expiry && new Date(expiry) < new Date()

  return (
    <div className="page-enter">
      <PageHeader title="Fleet" accent="Documents" sub={`${docs.length} documents · ${expiring.length} expiring soon`}>
        <button className="btn-icon" onClick={load} title="Refresh"><RefreshCw size={14} /></button>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setFile(null); setModal(true) }}><Plus size={15} /> Upload Doc</button>
      </PageHeader>

      {expiring.length > 0 && (
        <div className="notice notice-red" style={{ flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
            <AlertTriangle size={15} /> Expiring within 30 days
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {expiring.slice(0, 6).map(d => (
              <div key={d.id} style={{ padding: '7px 12px', background: 'var(--bg-surface)', border: '1px solid var(--red)', borderRadius: 'var(--radius)', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                <span style={{ fontWeight: 600 }}>{d.title}</span>
                <span style={{ color: 'var(--red)', marginLeft: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.76rem' }}>{d.expiry_date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="table-container">
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Title</th><th>Type</th><th>Vehicle</th><th>Driver</th><th>Issued</th><th>Expiry</th><th>Authority</th><th></th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8}><LoadingState label="Loading documents…" /></td></tr>
              ) : docs.length === 0 ? (
                <tr><td colSpan={8}><EmptyState icon="📄" title="No documents found" sub="Upload a document to get started" /></td></tr>
              ) : docs.map(d => (
                <tr key={d.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <FileText size={13} color="var(--text-muted)" />
                      <span className="td-primary">{d.title}</span>
                      {d.file_path && <a href={d.file_path} target="_blank" rel="noreferrer" style={{ color: 'var(--brand)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>VIEW</a>}
                    </div>
                  </td>
                  <td><span className={`badge ${TYPE_BADGE[d.type] || 'badge-slate'}`}>{d.type}</span></td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: d.vehicle_id ? 'var(--brand)' : 'var(--text-muted)' }}>{d.vehicle_id ? `#${d.vehicle_id}` : '—'}</span></td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: d.driver_id ? 'var(--brand)' : 'var(--text-muted)' }}>{d.driver_id ? `#${d.driver_id}` : '—'}</span></td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{d.issued_date || '—'}</span></td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: isExpired(d.expiry_date) ? 'var(--red)' : isExpiring(d.expiry_date) ? 'var(--amber)' : 'var(--text-secondary)' }}>
                      {d.expiry_date || '—'}
                      {isExpired(d.expiry_date) && ' ⚠'}
                    </span>
                  </td>
                  <td>{d.issuing_authority || '—'}</td>
                  <td><button className="btn-icon" onClick={() => handleDelete(d.id)} style={{ color: 'var(--red)' }}><Trash2 size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal
          title={<span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Upload size={15} /> Upload Document</span>}
          onClose={() => setModal(false)}
          wide
          footer={<>
            <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Uploading…' : 'Upload'}</button>
          </>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group"><label className="form-label">Title *</label><input className="input" value={form.title} onChange={f('title')} placeholder="Document name" /></div>
            <div className="form-grid-2">
              <div className="form-group"><label className="form-label">Type</label>
                <select className="input" value={form.type} onChange={f('type')}>
                  {['insurance','registration','permit','license','pollution','other'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Link to Vehicle</label>
                <select className="input" value={form.vehicle_id} onChange={f('vehicle_id')}>
                  <option value="">None</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_no}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Link to Driver</label>
                <select className="input" value={form.driver_id} onChange={f('driver_id')}>
                  <option value="">None</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>#{d.id} — {d.license_number}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Issuing Authority</label><input className="input" value={form.issuing_authority} onChange={f('issuing_authority')} /></div>
              <div className="form-group"><label className="form-label">Issue Date</label><input className="input" type="date" value={form.issued_date} onChange={f('issued_date')} /></div>
              <div className="form-group"><label className="form-label">Expiry Date</label><input className="input" type="date" value={form.expiry_date} onChange={f('expiry_date')} /></div>
            </div>
            <div className="form-group">
              <label className="form-label">Upload File</label>
              <input type="file" onChange={e => setFile(e.target.files[0])} style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
