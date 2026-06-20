// import { useState, useEffect } from 'react'
// import { Plus, Trash2, RefreshCw, FileText, AlertTriangle, Upload } from 'lucide-react'
// import { documentAPI, vehicleAPI, driverAPI } from '../services/api'
// import { useToast } from '../context/ToastContext'
// import Modal from '../components/Modal'
// import { LoadingState, EmptyState, PageHeader } from '../components/Common'

// const TYPE_BADGE = { insurance: 'badge-blue', registration: 'badge-green', permit: 'badge-amber', license: 'badge-purple', pollution: 'badge-green', other: 'badge-slate' }

// const EMPTY = { vehicle_id: '', driver_id: '', type: 'insurance', title: '', expiry_date: '', issued_date: '', issuing_authority: '', notes: '' }

// export default function Documents() {
//   const [docs, setDocs] = useState([])
//   const [expiring, setExpiring] = useState([])
//   const [vehicles, setVehicles] = useState([])
//   const [drivers, setDrivers] = useState([])
//   const [loading, setLoading] = useState(true)
//   const [modal, setModal] = useState(false)
//   const [form, setForm] = useState(EMPTY)
//   const [file, setFile] = useState(null)
//   const [saving, setSaving] = useState(false)
//   const toast = useToast()

//   const load = () => {
//     setLoading(true)
//     Promise.all([documentAPI.getAll(), documentAPI.getExpiring(), vehicleAPI.getAll(), driverAPI.getAll()])
//       .then(([d, e, v, dr]) => { setDocs(d.data.data); setExpiring(e.data.data); setVehicles(v.data.data); setDrivers(dr.data.data) })
//       .catch(() => toast.error('Failed to load'))
//       .finally(() => setLoading(false))
//   }
//   useEffect(() => { load() }, [])

//   const handleSave = async () => {
//     setSaving(true)
//     try {
//       const fd = new FormData()
//       Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
//       if (file) fd.append('file', file)
//       await documentAPI.upload(fd)
//       toast.success('Document uploaded')
//       setModal(false); setForm(EMPTY); setFile(null); load()
//     } catch (err) { toast.error(err.response?.data?.message || 'Upload failed') }
//     finally { setSaving(false) }
//   }

//   const handleDelete = async (id) => {
//     if (!confirm('Delete this document?')) return
//     try { await documentAPI.remove(id); toast.success('Deleted'); load() }
//     catch { toast.error('Delete failed') }
//   }

//   const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

//   const isExpiring = (expiry) => {
//     if (!expiry) return false
//     const d = new Date(expiry)
//     const now = new Date()
//     const diff = (d - now) / (1000 * 60 * 60 * 24)
//     return diff >= 0 && diff <= 30
//   }
//   const isExpired = (expiry) => expiry && new Date(expiry) < new Date()

//   return (
//     <div className="page-enter">
//       <PageHeader title="Fleet" accent="Documents" sub={`${docs.length} documents · ${expiring.length} expiring soon`}>
//         <button className="btn-icon" onClick={load} title="Refresh"><RefreshCw size={14} /></button>
//         <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setFile(null); setModal(true) }}><Plus size={15} /> Upload Doc</button>
//       </PageHeader>

//       {expiring.length > 0 && (
//         <div className="notice notice-red" style={{ flexDirection: 'column', gap: '10px' }}>
//           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
//             <AlertTriangle size={15} /> Expiring within 30 days
//           </div>
//           <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
//             {expiring.slice(0, 6).map(d => (
//               <div key={d.id} style={{ padding: '7px 12px', background: 'var(--bg-surface)', border: '1px solid var(--red)', borderRadius: 'var(--radius)', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
//                 <span style={{ fontWeight: 600 }}>{d.title}</span>
//                 <span style={{ color: 'var(--red)', marginLeft: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.76rem' }}>{d.expiry_date}</span>
//               </div>
//             ))}
//           </div>
//         </div>
//       )}

//       <div className="table-container">
//         <div className="table-scroll">
//           <table>
//             <thead>
//               <tr><th>Title</th><th>Type</th><th>Vehicle</th><th>Driver</th><th>Issued</th><th>Expiry</th><th>Authority</th><th></th></tr>
//             </thead>
//             <tbody>
//               {loading ? (
//                 <tr><td colSpan={8}><LoadingState label="Loading documents…" /></td></tr>
//               ) : docs.length === 0 ? (
//                 <tr><td colSpan={8}><EmptyState icon="📄" title="No documents found" sub="Upload a document to get started" /></td></tr>
//               ) : docs.map(d => (
//                 <tr key={d.id}>
//                   <td>
//                     <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
//                       <FileText size={13} color="var(--text-muted)" />
//                       <span className="td-primary">{d.title}</span>
//                       {d.file_path && <a href={d.file_path} target="_blank" rel="noreferrer" style={{ color: 'var(--brand)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>VIEW</a>}
//                     </div>
//                   </td>
//                   <td><span className={`badge ${TYPE_BADGE[d.type] || 'badge-slate'}`}>{d.type}</span></td>
//                   <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: d.vehicle_id ? 'var(--brand)' : 'var(--text-muted)' }}>{d.vehicle_id ? `#${d.vehicle_id}` : '—'}</span></td>
//                   <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: d.driver_id ? 'var(--brand)' : 'var(--text-muted)' }}>{d.driver_id ? `#${d.driver_id}` : '—'}</span></td>
//                   <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{d.issued_date || '—'}</span></td>
//                   <td>
//                     <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: isExpired(d.expiry_date) ? 'var(--red)' : isExpiring(d.expiry_date) ? 'var(--amber)' : 'var(--text-secondary)' }}>
//                       {d.expiry_date || '—'}
//                       {isExpired(d.expiry_date) && ' ⚠'}
//                     </span>
//                   </td>
//                   <td>{d.issuing_authority || '—'}</td>
//                   <td><button className="btn-icon" onClick={() => handleDelete(d.id)} style={{ color: 'var(--red)' }}><Trash2 size={13} /></button></td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {modal && (
//         <Modal
//           title={<span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Upload size={15} /> Upload Document</span>}
//           onClose={() => setModal(false)}
//           wide
//           footer={<>
//             <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
//             <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Uploading…' : 'Upload'}</button>
//           </>}
//         >
//           <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
//             <div className="form-group"><label className="form-label">Title *</label><input className="input" value={form.title} onChange={f('title')} placeholder="Document name" /></div>
//             <div className="form-grid-2">
//               <div className="form-group"><label className="form-label">Type</label>
//                 <select className="input" value={form.type} onChange={f('type')}>
//                   {['insurance','registration','permit','license','pollution','other'].map(t => <option key={t}>{t}</option>)}
//                 </select>
//               </div>
//               <div className="form-group"><label className="form-label">Link to Vehicle</label>
//                 <select className="input" value={form.vehicle_id} onChange={f('vehicle_id')}>
//                   <option value="">None</option>
//                   {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_no}</option>)}
//                 </select>
//               </div>
//               <div className="form-group"><label className="form-label">Link to Driver</label>
//                 <select className="input" value={form.driver_id} onChange={f('driver_id')}>
//                   <option value="">None</option>
//                   {drivers.map(d => <option key={d.id} value={d.id}>#{d.id} — {d.license_number}</option>)}
//                 </select>
//               </div>
//               <div className="form-group"><label className="form-label">Issuing Authority</label><input className="input" value={form.issuing_authority} onChange={f('issuing_authority')} /></div>
//               <div className="form-group"><label className="form-label">Issue Date</label><input className="input" type="date" value={form.issued_date} onChange={f('issued_date')} /></div>
//               <div className="form-group"><label className="form-label">Expiry Date</label><input className="input" type="date" value={form.expiry_date} onChange={f('expiry_date')} /></div>
//             </div>
//             <div className="form-group">
//               <label className="form-label">Upload File</label>
//               <input type="file" onChange={e => setFile(e.target.files[0])} style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }} />
//             </div>
//           </div>
//         </Modal>
//       )}
//     </div>
//   )
// }




import { useState, useEffect } from 'react'
import { Plus, Trash2, RefreshCw, FileText, AlertTriangle, Upload, Eye, XCircle, Clock, CheckCircle, Filter, X } from 'lucide-react'
import { documentAPI, vehicleAPI, driverAPI } from '../services/api'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import { LoadingState, EmptyState, PageHeader } from '../components/Common'

// ── helpers ───────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const fileUrl = (fp) => {
  if (!fp) return null
  if (fp.startsWith('http')) return fp
  return `${API_BASE}${fp.startsWith('/') ? '' : '/'}${fp}`
}

const TYPE_BADGE = {
  insurance:    'badge-blue',
  registration: 'badge-green',
  permit:       'badge-amber',
  license:      'badge-purple',
  pollution:    'badge-green',
  other:        'badge-slate',
}

const EMPTY = {
  vehicle_id: '', driver_id: '', type: 'insurance',
  title: '', expiry_date: '', issued_date: '',
  issuing_authority: '', notes: '',
}

const daysUntil = (expiry) => {
  if (!expiry) return null
  return Math.ceil((new Date(expiry) - new Date()) / (1000 * 60 * 60 * 24))
}

const getStatus = (expiry) => {
  const d = daysUntil(expiry)
  if (d === null) return 'no-expiry'
  if (d < 0)      return 'expired'
  if (d <= 7)     return 'critical'
  if (d <= 30)    return 'expiring'
  return 'valid'
}

const STATUS_META = {
  'expired':   { label: 'Expired',       color: 'var(--red)',        bg: 'rgba(239,68,68,0.10)',  icon: XCircle },
  'critical':  { label: 'Critical',      color: '#f97316',           bg: 'rgba(249,115,22,0.10)', icon: AlertTriangle },
  'expiring':  { label: 'Expiring Soon', color: 'var(--amber)',      bg: 'rgba(245,158,11,0.10)', icon: Clock },
  'valid':     { label: 'Valid',         color: 'var(--green)',      bg: 'rgba(16,185,129,0.10)', icon: CheckCircle },
  'no-expiry': { label: '—',            color: 'var(--text-muted)', bg: 'transparent',           icon: null },
}

// ── component ─────────────────────────────────────────────────────────────────
export default function Documents() {
  const [docs,       setDocs]       = useState([])
  const [vehicles,   setVehicles]   = useState([])
  const [drivers,    setDrivers]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [form,       setForm]       = useState(EMPTY)
  const [file,       setFile]       = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [extracting, setExtracting] = useState(false)   // AI reading PDF
  const [extracted,  setExtracted]  = useState(null)    // AI result
  const [filter,     setFilter]     = useState('all')
  const [search,     setSearch]     = useState('')
  const toast = useToast()

  const load = () => {
    setLoading(true)
    Promise.all([documentAPI.getAll(), vehicleAPI.getAll(), driverAPI.getAll()])
      .then(([d, v, dr]) => {
        setDocs(d.data.data)
        setVehicles(v.data.data)
        setDrivers(dr.data.data)
      })
      .catch(() => toast.error('Failed to load documents'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  // ── derived counts ────────────────────────────────────────────────────────
  const counts = docs.reduce((acc, d) => {
    const s = getStatus(d.expiry_date)
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})

  const expired  = docs.filter(d => getStatus(d.expiry_date) === 'expired')
  const critical = docs.filter(d => getStatus(d.expiry_date) === 'critical')
  const expiring = docs.filter(d => getStatus(d.expiry_date) === 'expiring')

  // ── filtered list ─────────────────────────────────────────────────────────
  const visible = docs.filter(d => {
    const matchStatus = filter === 'all' || getStatus(d.expiry_date) === filter
    const q = search.toLowerCase()
    const matchSearch = !q ||
      d.title?.toLowerCase().includes(q) ||
      d.type?.toLowerCase().includes(q) ||
      d.issuing_authority?.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  // ── handlers ──────────────────────────────────────────────────────────────
  const openModal = () => {
    setForm(EMPTY)
    setFile(null)
    setExtracted(null)
    setModal(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
      if (file) fd.append('file', file)
      await documentAPI.upload(fd)
      toast.success('Document uploaded successfully')
      setModal(false); setForm(EMPTY); setFile(null); setExtracted(null); load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Permanently delete this document?')) return
    try { await documentAPI.remove(id); toast.success('Document deleted'); load() }
    catch { toast.error('Delete failed') }
  }

  // ── PDF date extraction ───────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const picked = e.target.files[0]
    if (!picked) return
    setFile(picked)
    setExtracted(null)

    // Only attempt extraction on PDFs
    if (!picked.name.toLowerCase().endsWith('.pdf')) return

    setExtracting(true)
    try {
      const fd = new FormData()
      fd.append('file', picked)
      const res = await fetch(`${API_BASE}/api/documents/extract-dates`, {
        method: 'POST',
        credentials: 'include',
        body: fd,
      })
      const json = await res.json()
      if (json.success && json.data) {
        const { issued_date, expiry_date, issuing_authority, title } = json.data
        setExtracted(json.data)
        // Only auto-fill fields that are currently empty
        setForm(prev => ({
          ...prev,
          ...(issued_date       && !prev.issued_date       ? { issued_date }       : {}),
          ...(expiry_date       && !prev.expiry_date       ? { expiry_date }       : {}),
          ...(issuing_authority && !prev.issuing_authority ? { issuing_authority } : {}),
          ...(title             && !prev.title             ? { title }             : {}),
        }))
        toast.success('Dates extracted from PDF automatically')
      }
    } catch {
      // Silent — user can fill manually
    } finally {
      setExtracting(false)
    }
  }

  // ── file preview ──────────────────────────────────────────────────────────
  const openPreview = async (fp) => {
    const url = fileUrl(fp)
    if (!url) return
    const ext = fp.split('.').pop().toLowerCase()
    const isViewable = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)
    if (!isViewable) { window.open(url, '_blank', 'noopener,noreferrer'); return }
    try {
      const resp = await fetch(url, { credentials: 'include' })
      if (!resp.ok) throw new Error('fetch failed')
      const blob = await resp.blob()
      const blobUrl = URL.createObjectURL(blob)
      setPreviewUrl({ blobUrl, originalUrl: url, ext })
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer')
      toast.error('Could not load preview — opened in new tab instead')
    }
  }

  const closePreview = () => {
    if (previewUrl?.blobUrl) URL.revokeObjectURL(previewUrl.blobUrl)
    setPreviewUrl(null)
  }

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  // ── alert banner config ───────────────────────────────────────────────────
  const alertGroups = [
    { key: 'expired',  items: expired,  label: 'Expired',           style: { borderColor: 'var(--red)',   background: 'rgba(239,68,68,0.07)'  }, textColor: 'var(--red)'   },
    { key: 'critical', items: critical, label: 'Expiring in ≤7 days', style: { borderColor: '#f97316',     background: 'rgba(249,115,22,0.07)' }, textColor: '#f97316'      },
    { key: 'expiring', items: expiring, label: 'Expiring in ≤30 days',style: { borderColor: 'var(--amber)',background: 'rgba(245,158,11,0.07)' }, textColor: 'var(--amber)' },
  ]

  // ── auto-fill indicator helpers ───────────────────────────────────────────
  const wasAutoFilled = (field) => extracted?.[field] && form[field] === extracted[field]

  return (
    <div className="page-enter">
      <PageHeader
        title="Fleet"
        accent="Documents"
        sub={`${docs.length} total · ${expired.length + critical.length + expiring.length} need attention`}
      >
        <button className="btn-icon" onClick={load} title="Refresh"><RefreshCw size={14} /></button>
        <button className="btn btn-primary" onClick={openModal}><Plus size={15} /> Upload Doc</button>
      </PageHeader>

      {/* ── alert banners ── */}
      {alertGroups.filter(g => g.items.length > 0).map(g => (
        <div key={g.key} className="notice" style={{ ...g.style, flexDirection: 'column', gap: '10px', marginBottom: '10px', border: '1px solid', borderRadius: 'var(--radius)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: g.textColor }}>
            <AlertTriangle size={14} /> {g.label} ({g.items.length})
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {g.items.slice(0, 8).map(d => {
              const days = daysUntil(d.expiry_date)
              return (
                <div key={d.id} style={{ padding: '6px 12px', background: 'var(--bg-surface)', border: `1px solid ${g.textColor}`, borderRadius: 'var(--radius)', fontSize: '0.82rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 600 }}>{d.title}</span>
                  <span style={{ color: g.textColor, fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                    {days < 0 ? `${Math.abs(days)}d ago` : days === 0 ? 'Today' : `${days}d left`}
                  </span>
                  {d.file_path && (
                    <button onClick={() => openPreview(d.file_path)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', padding: 0, display: 'flex' }} title="View">
                      <Eye size={12} />
                    </button>
                  )}
                </div>
              )
            })}
            {g.items.length > 8 && (
              <button onClick={() => setFilter(g.key)} style={{ padding: '6px 12px', background: 'none', border: `1px dashed ${g.textColor}`, borderRadius: 'var(--radius)', fontSize: '0.82rem', color: g.textColor, cursor: 'pointer' }}>
                +{g.items.length - 8} more →
              </button>
            )}
          </div>
        </div>
      ))}

      {/* ── filter bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0 10px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          <Filter size={13} /> Filter:
        </div>
        {[
          { key: 'all',      label: 'All',      count: docs.length },
          { key: 'expired',  label: 'Expired',  count: counts.expired  || 0, color: 'var(--red)'   },
          { key: 'critical', label: '≤7 days',  count: counts.critical || 0, color: '#f97316'      },
          { key: 'expiring', label: '≤30 days', count: counts.expiring || 0, color: 'var(--amber)' },
          { key: 'valid',    label: 'Valid',     count: counts.valid    || 0, color: 'var(--green)' },
        ].map(btn => (
          <button key={btn.key} onClick={() => setFilter(btn.key)} style={{
            padding: '4px 12px', borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: '0.82rem',
            border:      `1px solid ${filter === btn.key ? (btn.color || 'var(--brand)') : 'var(--border)'}`,
            background:  filter === btn.key ? (btn.color ? `${btn.color}22` : 'var(--bg-accent)') : 'var(--bg-surface)',
            color:       filter === btn.key ? (btn.color || 'var(--brand)') : 'var(--text-secondary)',
            fontWeight:  filter === btn.key ? 600 : 400,
            display: 'flex', alignItems: 'center', gap: '5px',
          }}>
            {btn.label}
            {btn.count > 0 && (
              <span style={{
                background: filter === btn.key ? (btn.color || 'var(--brand)') : 'var(--bg-hover)',
                color: filter === btn.key ? '#fff' : 'var(--text-muted)',
                borderRadius: '999px', padding: '1px 6px', fontSize: '0.72rem', fontWeight: 700,
              }}>{btn.count}</span>
            )}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input className="input" placeholder="Search documents…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingRight: search ? '28px' : undefined, minWidth: '200px', height: '30px', fontSize: '0.83rem' }} />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── table ── */}
      <div className="table-container">
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Title</th><th>Type</th><th>Status</th><th>Vehicle</th><th>Driver</th><th>Issued</th><th>Expiry</th><th>Authority</th><th></th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9}><LoadingState label="Loading documents…" /></td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan={9}>
                  <EmptyState
                    icon="📄"
                    title={filter !== 'all' ? `No ${filter} documents` : 'No documents found'}
                    sub={filter !== 'all'
                      ? <button onClick={() => setFilter('all')} style={{ color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>Clear filter</button>
                      : 'Upload a document to get started'}
                  />
                </td></tr>
              ) : visible.map(d => {
                const status = getStatus(d.expiry_date)
                const meta   = STATUS_META[status]
                const days   = daysUntil(d.expiry_date)
                const url    = fileUrl(d.file_path)
                return (
                  <tr key={d.id} style={
                    status === 'expired'  ? { background: 'rgba(239,68,68,0.04)'  } :
                    status === 'critical' ? { background: 'rgba(249,115,22,0.04)' } :
                    status === 'expiring' ? { background: 'rgba(245,158,11,0.04)' } : {}
                  }>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <FileText size={13} color="var(--text-muted)" />
                        <span className="td-primary">{d.title}</span>
                        {url && (
                          <button onClick={() => openPreview(d.file_path)} title="View / download file" style={{
                            display: 'inline-flex', alignItems: 'center', gap: '3px',
                            background: 'var(--bg-accent)', border: '1px solid var(--border)',
                            borderRadius: '4px', padding: '2px 7px', cursor: 'pointer',
                            color: 'var(--brand)', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', fontWeight: 600, lineHeight: 1,
                          }}>
                            <Eye size={10} /> VIEW
                          </button>
                        )}
                      </div>
                    </td>
                    <td><span className={`badge ${TYPE_BADGE[d.type] || 'badge-slate'}`}>{d.type}</span></td>
                    <td>
                      {status !== 'no-expiry' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: '999px', background: meta.bg, color: meta.color, fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {meta.icon && <meta.icon size={11} />}
                          {status === 'expired' ? `${Math.abs(days)}d ago` : days === 0 ? 'Today' : `${days}d`}
                        </span>
                      )}
                    </td>
                    <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: d.vehicle_id ? 'var(--brand)' : 'var(--text-muted)' }}>{d.vehicle_id ? `#${d.vehicle_id}` : '—'}</span></td>
                    <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: d.driver_id  ? 'var(--brand)' : 'var(--text-muted)' }}>{d.driver_id  ? `#${d.driver_id}`  : '—'}</span></td>
                    <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{d.issued_date || '—'}</span></td>
                    <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: meta.color }}>{d.expiry_date || '—'}</span></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.83rem' }}>{d.issuing_authority || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {url && (
                          <a href={url} download title="Download" style={{ display: 'inline-flex', alignItems: 'center', padding: '4px', borderRadius: '4px', color: 'var(--text-muted)', textDecoration: 'none' }}>↓</a>
                        )}
                        <button className="btn-icon" onClick={() => handleDelete(d.id)} style={{ color: 'var(--red)' }} title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {visible.length > 0 && (
          <div style={{ padding: '8px 14px', fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
            Showing {visible.length} of {docs.length} documents
            {filter !== 'all' && <button onClick={() => setFilter('all')} style={{ marginLeft: '8px', color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem' }}>Clear filter ×</button>}
          </div>
        )}
      </div>

      {/* ── upload modal ── */}
      {modal && (
        <Modal
          title={<span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Upload size={15} /> Upload Document</span>}
          onClose={() => setModal(false)}
          wide
          footer={<>
            <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || extracting}>
              {saving ? 'Uploading…' : 'Upload'}
            </button>
          </>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* ── attach file FIRST so extraction runs before user fills form ── */}
            <div className="form-group">
              <label className="form-label">Attach File</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx"
                  onChange={handleFileChange}
                  style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', flex: 1 }}
                />
                {extracting && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--amber)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    Reading PDF…
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                PDF files will have dates extracted automatically. Max 10 MB.
              </span>

              {/* AI extraction result banner */}
              {!extracting && extracted && (
                <div style={{ marginTop: '8px', padding: '10px 12px', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius)', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--green)', marginBottom: '2px' }}>✦ AI extracted from PDF</span>
                  {extracted.issued_date       && <span>Issue date: <b style={{ color: 'var(--text-primary)' }}>{extracted.issued_date}</b></span>}
                  {extracted.expiry_date       && <span>Expiry date: <b style={{ color: 'var(--text-primary)' }}>{extracted.expiry_date}</b></span>}
                  {extracted.issuing_authority && <span>Authority: <b style={{ color: 'var(--text-primary)' }}>{extracted.issuing_authority}</b></span>}
                  {extracted.title             && <span>Title: <b style={{ color: 'var(--text-primary)' }}>{extracted.title}</b></span>}
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Fields auto-filled below — edit freely if needed.</span>
                </div>
              )}
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>

            {/* ── title ── */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                Title *
                {wasAutoFilled('title') && <span style={{ fontSize: '0.7rem', color: 'var(--green)', fontWeight: 700 }}>✦ auto-filled</span>}
              </label>
              <input className="input" value={form.title} onChange={f('title')} placeholder="e.g. Vehicle Insurance – KA25AB1234"
                style={wasAutoFilled('title') ? { borderColor: 'var(--green)', background: 'rgba(16,185,129,0.05)' } : {}} />
            </div>

            <div className="form-grid-2">
              {/* type */}
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="input" value={form.type} onChange={f('type')}>
                  {['insurance','registration','permit','license','pollution','other'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              {/* vehicle */}
              <div className="form-group">
                <label className="form-label">Link to Vehicle</label>
                <select className="input" value={form.vehicle_id} onChange={f('vehicle_id')}>
                  <option value="">None</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_no}</option>)}
                </select>
              </div>

              {/* driver */}
              <div className="form-group">
                <label className="form-label">Link to Driver</label>
                <select className="input" value={form.driver_id} onChange={f('driver_id')}>
                  <option value="">None</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>#{d.id} — {d.license_number}</option>)}
                </select>
              </div>

              {/* issuing authority */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Issuing Authority
                  {wasAutoFilled('issuing_authority') && <span style={{ fontSize: '0.7rem', color: 'var(--green)', fontWeight: 700 }}>✦ auto-filled</span>}
                </label>
                <input className="input" value={form.issuing_authority} onChange={f('issuing_authority')} placeholder="e.g. RTO Mumbai"
                  style={wasAutoFilled('issuing_authority') ? { borderColor: 'var(--green)', background: 'rgba(16,185,129,0.05)' } : {}} />
              </div>

              {/* issue date */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Issue Date
                  {extracting && <span style={{ fontSize: '0.7rem', color: 'var(--amber)', fontWeight: 600 }}>extracting…</span>}
                  {!extracting && wasAutoFilled('issued_date') && <span style={{ fontSize: '0.7rem', color: 'var(--green)', fontWeight: 700 }}>✦ auto-filled</span>}
                </label>
                <input className="input" type="date" value={form.issued_date} onChange={f('issued_date')}
                  style={wasAutoFilled('issued_date') ? { borderColor: 'var(--green)', background: 'rgba(16,185,129,0.05)' } : {}} />
              </div>

              {/* expiry date */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Expiry Date
                  {extracting && <span style={{ fontSize: '0.7rem', color: 'var(--amber)', fontWeight: 600 }}>extracting…</span>}
                  {!extracting && wasAutoFilled('expiry_date') && <span style={{ fontSize: '0.7rem', color: 'var(--green)', fontWeight: 700 }}>✦ auto-filled</span>}
                </label>
                <input className="input" type="date" value={form.expiry_date} onChange={f('expiry_date')}
                  style={wasAutoFilled('expiry_date') ? { borderColor: 'var(--green)', background: 'rgba(16,185,129,0.05)' } : {}} />
              </div>
            </div>

            {/* notes */}
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="input" value={form.notes} onChange={f('notes')} rows={2} placeholder="Optional notes…" style={{ resize: 'vertical' }} />
            </div>

          </div>
        </Modal>
      )}

      {/* ── file preview modal ── */}
      {previewUrl && (
        <div onClick={closePreview} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius)', width: '100%', maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Document Preview</span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <a href={previewUrl.originalUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: 'var(--brand)', textDecoration: 'none', fontFamily: 'var(--font-mono)', border: '1px solid var(--brand)', borderRadius: '4px', padding: '3px 10px' }}>Open in new tab ↗</a>
                <a href={previewUrl.blobUrl} download style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textDecoration: 'none', fontFamily: 'var(--font-mono)', border: '1px solid var(--border)', borderRadius: '4px', padding: '3px 10px' }}>Download ↓</a>
                <button onClick={closePreview} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '4px' }}><X size={16} /></button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '500px' }}>
              {['png','jpg','jpeg','gif','webp','svg'].includes(previewUrl.ext) ? (
                <img src={previewUrl.blobUrl} alt="Document" style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }} />
              ) : (
                <object data={previewUrl.blobUrl} type="application/pdf" style={{ width: '100%', height: '75vh', border: 'none' }}>
                  <div style={{ color: '#fff', textAlign: 'center', padding: '40px' }}>
                    <p style={{ marginBottom: '12px' }}>Unable to render preview in this browser.</p>
                    <a href={previewUrl.originalUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand)', fontSize: '0.9rem' }}>Open in new tab ↗</a>
                  </div>
                </object>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
