import { useState, useEffect, useRef } from 'react'
import { RefreshCw, FileText, AlertTriangle, Upload, Eye, Download,
         XCircle, Clock, CheckCircle, X, Trash2, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { documentAPI, vehicleAPI, driverAPI } from '../services/api'
import { useToast } from '../context/ToastContext'
import { LoadingState, KpiCards } from '../components/Common'

/* ── KPI color palette (matches Vehicles page glow cards) ── */
const DOC_KPI_PALETTE = {
  blue:   { accent: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', glow: 'rgba(59,130,246,0.20)' },
  green:  { accent: '#10b981', bg: '#f0fdf4', border: '#bbf7d0', glow: 'rgba(16,185,129,0.20)' },
  amber:  { accent: '#f59e0b', bg: '#fffbeb', border: '#fde68a', glow: 'rgba(245,158,11,0.20)' },
  red:    { accent: '#ef4444', bg: '#fef2f2', border: '#fecaca', glow: 'rgba(239,68,68,0.20)'  },
  purple: { accent: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe', glow: 'rgba(139,92,246,0.20)' },
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const fileUrl  = (fp) => { if (!fp) return null; if (fp.startsWith('http')) return fp; return `${API_BASE}${fp.startsWith('/') ? '' : '/'}${fp}` }

const TYPE_COLORS = { insurance: '#3b82f6', registration: '#10b981', permit: '#f59e0b', license: '#8b5cf6', pollution: '#06b6d4', other: '#64748b' }
const TYPE_LABELS = { insurance: 'Insurance', registration: 'Registration', permit: 'Permit', license: 'License', pollution: 'Pollution', other: 'Other' }

const EMPTY = { vehicle_id: '', driver_id: '', type: 'insurance', entity_type: 'vehicle', title: '', document_no: '', expiry_date: '', issued_date: '', issuing_authority: '', notes: '' }

const daysUntil = (e) => e ? Math.ceil((new Date(e) - new Date()) / 86400000) : null
const getStatus = (e) => { const d = daysUntil(e); if (d === null) return 'permanent'; if (d < 0) return 'expired'; if (d <= 30) return 'expiring'; return 'valid' }
const STATUS_META = {
  expired:   { label: 'Expired',       bg: '#fee2e2', color: '#dc2626' },
  expiring:  { label: 'Expiring Soon', bg: '#fef3c7', color: '#d97706' },
  valid:     { label: 'Valid',         bg: '#dcfce7', color: '#16a34a' },
  permanent: { label: 'Permanent',     bg: '#dbeafe', color: '#1d4ed8' },
}
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const PAGE_SIZE = 10

export default function Documents() {
  const [docs,       setDocs]       = useState([])
  const [vehicles,   setVehicles]   = useState([])
  const [drivers,    setDrivers]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [dragOver,   setDragOver]   = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [form,       setForm]       = useState(EMPTY)
  const [file,       setFile]       = useState(null)
  const [saving,       setSaving]       = useState(false)
  const [extracting,   setExtracting]   = useState(false)
  const [extractStep,  setExtractStep]  = useState(0)   // 0=idle 1=uploading 2=scanning 3=extracting 4=done
  const [extracted,    setExtracted]    = useState(null)
  const [tabFilter,  setTabFilter]  = useState('all')    // all | vehicle | driver | other
  const [typeFilter, setTypeFilter] = useState('all')
  const [entityFilter, setEntityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expiryFilter, setExpiryFilter] = useState('all')
  const [search,     setSearch]     = useState('')
  const [page,       setPage]       = useState(1)
  const toast = useToast()
  const uploadSectionRef = useRef(null)
  const scrollToUpload = () => uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const load = () => {
    setLoading(true)
    Promise.all([documentAPI.getAll(), vehicleAPI.getAll(), driverAPI.getAll()])
      .then(([d, v, dr]) => { setDocs(d.data.data || []); setVehicles(v.data.data || []); setDrivers(dr.data.data || []) })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  // counts
  const counts = {
    total:    docs.length,
    valid:    docs.filter(d => getStatus(d.expiry_date) === 'valid').length,
    expiring: docs.filter(d => getStatus(d.expiry_date) === 'expiring').length,
    expired:  docs.filter(d => getStatus(d.expiry_date) === 'expired').length,
    types:    new Set(docs.map(d => d.type)).size,
    compliance: docs.length === 0 ? 100 : Math.round((docs.filter(d => ['valid','permanent'].includes(getStatus(d.expiry_date))).length / docs.length) * 100),
  }

  const expiringSoon = docs.filter(d => getStatus(d.expiry_date) === 'expiring').sort((a,b) => new Date(a.expiry_date) - new Date(b.expiry_date))
  const typeCounts   = docs.reduce((acc, d) => { acc[d.type] = (acc[d.type] || 0) + 1; return acc }, {})

  // filter
  const visible = docs.filter(d => {
    if (tabFilter === 'vehicle' && !d.vehicle_id) return false
    if (tabFilter === 'driver'  && !d.driver_id)  return false
    if (tabFilter === 'other'   && (d.vehicle_id || d.driver_id)) return false
    if (typeFilter !== 'all'   && d.type !== typeFilter) return false
    if (statusFilter !== 'all' && getStatus(d.expiry_date) !== statusFilter) return false
    if (search.trim()) { const q = search.toLowerCase(); if (!`${d.title} ${d.type} ${d.issuing_authority} ${d.document_no}`.toLowerCase().includes(q)) return false }
    return true
  })
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const pageItems  = visible.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const resetForm = () => { setForm(EMPTY); setFile(null); setExtracted(null); setExtractStep(0) }

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
      if (file) fd.append('file', file)
      await documentAPI.upload(fd)
      toast.success('Document uploaded successfully')
      resetForm(); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Upload failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Permanently delete this document?')) return
    try { await documentAPI.remove(id); toast.success('Deleted'); load() }
    catch { toast.error('Delete failed') }
  }

  const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp']
  const runExtraction = async (picked) => {
    setExtracting(true)
    setExtractStep(1)   // Uploading
    try {
      const fd = new FormData(); fd.append('file', picked)
      setExtractStep(2)  // Scanning Document
      const res  = await fetch(`${API_BASE}/api/documents/extract-dates`, { method: 'POST', credentials: 'include', body: fd })
      setExtractStep(3)  // Extracting Details
      const json = await res.json()
      if (json.success && json.data) {
        setExtracted(json.data)
        const d = json.data

        // Map doc_type from AI to our enum values
        const TYPE_MAP = { insurance: 'insurance', registration: 'registration', permit: 'permit', license: 'license', pollution: 'pollution', other: 'other' }
        const mappedType = d.doc_type && TYPE_MAP[d.doc_type.toLowerCase()] ? TYPE_MAP[d.doc_type.toLowerCase()] : null

        // Map entity_type
        const mappedEntity = d.entity_type === 'driver' ? 'driver' : d.entity_type === 'vehicle' ? 'vehicle' : null

        // Match registration_no to a vehicle id
        let matchedVehicleId = ''
        if (d.registration_no) {
          const norm = d.registration_no.replace(/\s/g, '').toUpperCase()
          const match = vehicles.find(v => v.registration_no.replace(/\s/g, '').toUpperCase() === norm)
          if (match) matchedVehicleId = String(match.id)
        }

        // Match driver_name to a driver id
        let matchedDriverId = ''
        if (d.driver_name) {
          const norm = d.driver_name.toLowerCase().trim()
          const match = drivers.find(dr => (dr.user?.name || '').toLowerCase().includes(norm) || norm.includes((dr.user?.name || '').toLowerCase()))
          if (match) matchedDriverId = String(match.id)
        }

        setForm(prev => ({
          ...prev,
          ...(d.issued_date       ? { issued_date: d.issued_date }             : {}),
          ...(d.expiry_date       ? { expiry_date: d.expiry_date }             : {}),
          ...(d.issuing_authority ? { issuing_authority: d.issuing_authority } : {}),
          ...(d.title             ? { title: d.title }                         : {}),
          ...(d.document_no      ? { document_no: d.document_no }             : {}),
          ...(d.notes            ? { notes: d.notes }                         : {}),
          ...(mappedType         ? { type: mappedType }                        : {}),
          ...(mappedEntity       ? { entity_type: mappedEntity }               : {}),
          ...(matchedVehicleId   ? { vehicle_id: matchedVehicleId, driver_id: '' } : {}),
          ...(matchedDriverId && mappedEntity === 'driver' ? { driver_id: matchedDriverId, vehicle_id: '' } : {}),
        }))

        setExtractStep(4)  // Fields Auto-filled
        const filled = [
          mappedType                               && 'Document Type',
          mappedEntity                             && 'Entity Type',
          (matchedVehicleId || matchedDriverId)    && 'Entity',
          d.issued_date                            && 'Issue Date',
          d.expiry_date                            && 'Expiry Date',
          d.issuing_authority                      && 'Issuing Authority',
          d.title                                  && 'Title',
          d.document_no                            && 'Document No.',
          d.notes                                  && 'Notes',
        ].filter(Boolean)
        toast.success('AI extracted: ' + filled.join(', '))
      } else if (json.message) {
        setExtractStep(0)
        toast.error(json.message)
      }
    } catch { setExtractStep(0) } finally { setExtracting(false) }
  }

  const handleFileChange = (e) => {
    const picked = e.target.files[0]; if (!picked) return
    setFile(picked); setExtracted(null)
    const ext = picked.name.split('.').pop().toLowerCase()
    if (ext === 'pdf' || IMAGE_EXTS.includes(ext)) runExtraction(picked)
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    const picked = e.dataTransfer.files?.[0]; if (!picked) return
    setFile(picked); setExtracted(null)
    const ext = picked.name.split('.').pop().toLowerCase()
    if (ext === 'pdf' || IMAGE_EXTS.includes(ext)) runExtraction(picked)
    else toast.error('Only PNG, JPG, or PDF files are supported')
  }

  const openPreview = async (fp) => {
    const url = fileUrl(fp); if (!url) return
    const ext = fp.split('.').pop().toLowerCase()
    if (!['pdf','png','jpg','jpeg','gif','webp'].includes(ext)) { window.open(url, '_blank', 'noopener,noreferrer'); return }
    try {
      const resp = await fetch(url, { credentials: 'include' })
      if (!resp.ok) throw new Error()
      const blob = await resp.blob()
      setPreviewUrl({ blobUrl: URL.createObjectURL(blob), originalUrl: url, ext })
    } catch { window.open(url, '_blank', 'noopener,noreferrer') }
  }
  const closePreview = () => { if (previewUrl?.blobUrl) URL.revokeObjectURL(previewUrl.blobUrl); setPreviewUrl(null) }

  const s = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }
  const th = { padding: '10px 14px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', background: '#f9fafb', whiteSpace: 'nowrap' }
  const td = { padding: '12px 14px', fontSize: '0.83rem', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' }

  return (
    <div className="page">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#111827' }}>Document Management</h1>
          <p style={{ fontSize: '0.84rem', color: '#6b7280', margin: '4px 0 0' }}>
            Dashboard &gt; Documents
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={load} style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.83rem', color: '#374151', fontWeight: 600 }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button onClick={scrollToUpload} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Upload size={14} /> Upload Document
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <KpiCards columns={6} stats={[
        { label: 'Total Documents',  value: counts.total,            sub: 'All Documents',     Icon: FileText, ...DOC_KPI_PALETTE.blue },
        { label: 'Valid Documents',  value: counts.valid,            sub: 'Up to date',        Icon: FileText, ...DOC_KPI_PALETTE.green },
        { label: 'Expiring Soon',    value: counts.expiring,         sub: 'Within 30 days',    Icon: FileText, ...DOC_KPI_PALETTE.amber },
        { label: 'Expired',          value: counts.expired,          sub: 'Require Attention', Icon: FileText, ...DOC_KPI_PALETTE.red },
        { label: 'Document Types',   value: counts.types,            sub: 'Categories',        Icon: FileText, ...DOC_KPI_PALETTE.purple },
        { label: 'Compliance Score', value: `${counts.compliance}%`, sub: counts.compliance >= 80 ? 'Good' : 'Fair', Icon: FileText, ...DOC_KPI_PALETTE[counts.compliance >= 80 ? 'green' : 'amber'] },
      ]} />

      {/* Main: Table + Sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start' }}>

        {/* LEFT */}
        <div>
          {/* Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: '#f3f4f6', borderRadius: 8, padding: 3, marginBottom: 14, width: 'fit-content' }}>
            {[
              { key: 'all',     label: 'All Documents' },
              { key: 'vehicle', label: 'Vehicle Documents' },
              { key: 'driver',  label: 'Driver Documents' },
              { key: 'other',   label: 'Other Documents' },
            ].map(t => (
              <button key={t.key} onClick={() => { setTabFilter(t.key); setPage(1) }}
                style={{ padding: '7px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem',
                  background: tabFilter === t.key ? '#fff' : 'transparent',
                  color: tabFilter === t.key ? '#3b82f6' : '#6b7280',
                  boxShadow: tabFilter === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}>{t.label}</button>
            ))}
          </div>

          {/* Filters Row */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {[
              { label: 'Document Type', val: typeFilter,   setter: setTypeFilter,   options: [['all','All Types'], ...Object.entries(TYPE_LABELS)] },
              { label: 'Status',        val: statusFilter, setter: setStatusFilter, options: [['all','All Status'], ['valid','Valid'], ['expiring','Expiring Soon'], ['expired','Expired'], ['permanent','Permanent']] },
              { label: 'Expiry Filter', val: expiryFilter, setter: setExpiryFilter, options: [['all','All'], ['30','Next 30 days'], ['7','Next 7 days']] },
            ].map(({ label, val, setter, options }) => (
              <select key={label} value={val} onChange={e => { setter(e.target.value); setPage(1) }}
                style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: '0.82rem', color: '#374151', background: '#fff', cursor: 'pointer' }}>
                {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ))}
            <button onClick={() => { setTypeFilter('all'); setStatusFilter('all'); setExpiryFilter('all'); setSearch('') }}
              style={{ padding: '7px 12px', border: '1px solid #e5e7eb', borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: '0.82rem', color: '#6b7280', fontWeight: 600 }}>
              Reset
            </button>
            <div style={{ position: 'relative', marginLeft: 'auto' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search documents..."
                style={{ paddingLeft: 30, padding: '7px 10px 7px 30px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: '0.82rem', width: 220, outline: 'none' }} />
            </div>
          </div>

          {/* Table */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading documents…</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr>
                    {['#','Document Name','Document Type','Entity Type','Entity Name / No.','Issue Date','Expiry Date','Status','Actions'].map(h => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageItems.length === 0 ? (
                    <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>No documents found</td></tr>
                  ) : pageItems.map((d, i) => {
                    const status  = getStatus(d.expiry_date)
                    const meta    = STATUS_META[status]
                    const url     = fileUrl(d.file_path)
                    const vehicle = vehicles.find(v => String(v.id) === String(d.vehicle_id))
                    const driver  = drivers.find(dr => String(dr.id) === String(d.driver_id))
                    const entityType = d.vehicle_id ? 'Vehicle' : d.driver_id ? 'Driver' : '—'
                    const entityName = vehicle?.registration_no || driver?.user?.name || '—'
                    return (
                      <tr key={d.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                        <td style={td}><span style={{ color: '#9ca3af', fontSize: '0.78rem' }}>{(page-1)*PAGE_SIZE+i+1}</span></td>
                        <td style={td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 6, background: `${TYPE_COLORS[d.type]||'#64748b'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <FileText size={13} color={TYPE_COLORS[d.type]||'#64748b'} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#111827' }}>{d.title}</div>
                              {d.document_no && <div style={{ fontSize: '0.72rem', color: '#9ca3af', fontFamily: 'monospace' }}>{d.document_no}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={td}>
                          <span style={{ padding: '3px 9px', borderRadius: 999, background: `${TYPE_COLORS[d.type]||'#64748b'}18`, color: TYPE_COLORS[d.type]||'#64748b', fontSize: '0.74rem', fontWeight: 700, textTransform: 'capitalize' }}>
                            {TYPE_LABELS[d.type] || d.type}
                          </span>
                        </td>
                        <td style={{ ...td, color: '#374151' }}>{entityType}</td>
                        <td style={{ ...td, color: '#374151', fontFamily: 'monospace', fontSize: '0.8rem' }}>{entityName}</td>
                        <td style={{ ...td, color: '#6b7280' }}>{fmtDate(d.issued_date)}</td>
                        <td style={{ ...td, color: meta.color, fontWeight: status !== 'permanent' ? 600 : 400 }}>{d.expiry_date ? fmtDate(d.expiry_date) : '—'}</td>
                        <td style={td}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, background: meta.bg, color: meta.color, fontSize: '0.74rem', fontWeight: 700 }}>
                            {meta.label}
                          </span>
                        </td>
                        <td style={td}>
                          <div style={{ display: 'flex', gap: 5 }}>
                            {url && <button onClick={() => openPreview(d.file_path)} style={{ padding: '4px 8px', border: '1px solid #dbeafe', borderRadius: 5, background: '#eff6ff', cursor: 'pointer', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.75rem', fontWeight: 600 }}><Eye size={11} /></button>}
                            {url && <a href={url} download style={{ padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: 5, background: '#fff', cursor: 'pointer', color: '#374151', display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none' }}><Download size={11} /></a>}
                            <button onClick={() => handleDelete(d.id)} style={{ padding: '4px 8px', border: '1px solid #fee2e2', borderRadius: 5, background: '#fff', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.75rem' }}><Trash2 size={11} /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}

            {/* Pagination */}
            {visible.length > PAGE_SIZE && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderTop: '1px solid #f3f4f6', fontSize: '0.8rem', color: '#6b7280' }}>
                <span>Showing {(page-1)*PAGE_SIZE+1} to {Math.min(page*PAGE_SIZE, visible.length)} of {visible.length} entries</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                    style={{ padding: '3px 8px', border: '1px solid #e5e7eb', borderRadius: 4, background: '#fff', cursor: page===1 ? 'not-allowed' : 'pointer', color: page===1 ? '#d1d5db' : '#374151' }}>‹</button>
                  {Array.from({length: Math.min(totalPages,5)}, (_,i) => i+1).map(p => (
                    <button key={p} onClick={() => setPage(p)}
                      style={{ padding: '3px 8px', border: `1px solid ${p===page?'#3b82f6':'#e5e7eb'}`, borderRadius: 4, background: p===page?'#3b82f6':'#fff', cursor: 'pointer', color: p===page?'#fff':'#374151', fontWeight: p===page?700:400 }}>{p}</button>
                  ))}
                  {totalPages > 5 && <span style={{ padding: '3px 4px' }}>…</span>}
                  {totalPages > 5 && <button onClick={() => setPage(totalPages)} style={{ padding: '3px 8px', border: '1px solid #e5e7eb', borderRadius: 4, background: '#fff', cursor: 'pointer', color: '#374151' }}>{totalPages}</button>}
                  <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
                    style={{ padding: '3px 8px', border: '1px solid #e5e7eb', borderRadius: 4, background: '#fff', cursor: page===totalPages ? 'not-allowed' : 'pointer', color: page===totalPages ? '#d1d5db' : '#374151' }}>›</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Expiry Overview */}
          <div style={{ ...s, padding: 18 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 16, color: '#111827' }}>Document Expiry Overview</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                <svg viewBox="0 0 80 80" style={{ width: 80, height: 80, transform: 'rotate(-90deg)' }}>
                  <circle cx="40" cy="40" r="30" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                  <circle cx="40" cy="40" r="30" fill="none" stroke="#10b981" strokeWidth="10"
                    strokeDasharray={`${2*Math.PI*30*counts.compliance/100} ${2*Math.PI*30*(1-counts.compliance/100)}`} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#111827' }}>{docs.length}</span>
                  <span style={{ fontSize: '0.58rem', color: '#9ca3af' }}>Total</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.78rem' }}>
                {[
                  { label: 'Valid (>30 days)', color: '#10b981', count: counts.valid },
                  { label: 'Expiring Soon',    color: '#f59e0b', count: counts.expiring },
                  { label: 'Expired',          color: '#ef4444', count: counts.expired },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 2, background: r.color, flexShrink: 0 }} />
                    <span style={{ color: '#374151', flex: 1 }}>{r.label}</span>
                    <span style={{ fontWeight: 700, color: r.color }}>{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upcoming Expiry */}
          <div style={{ ...s, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>Upcoming Expiry</div>
              <button onClick={() => setStatusFilter('expiring')} style={{ fontSize: '0.74rem', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View All</button>
            </div>
            {expiringSoon.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: '#9ca3af', textAlign: 'center', padding: '14px 0' }}>No expiring documents</p>
            ) : expiringSoon.slice(0, 5).map(d => {
              const days  = daysUntil(d.expiry_date)
              const color = days <= 7 ? '#ef4444' : days <= 15 ? '#f97316' : '#f59e0b'
              const vehicle = vehicles.find(v => String(v.id) === String(d.vehicle_id))
              return (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '9px 0', borderBottom: '1px solid #f9fafb' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 5, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <FileText size={12} color={color} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#111827' }}>{d.title}{vehicle ? ` – ${vehicle.registration_no}` : ''}</div>
                      <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Expires in {days} days</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color, whiteSpace: 'nowrap', marginTop: 2 }}>{fmtDate(d.expiry_date)}</span>
                </div>
              )
            })}
          </div>

          {/* Document Types */}
          <div style={{ ...s, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>Document Types</div>
              <button onClick={() => setTypeFilter('all')} style={{ fontSize: '0.74rem', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View All</button>
            </div>
            {Object.entries(typeCounts).sort((a,b) => b[1]-a[1]).map(([type, count]) => (
              <div key={type} onClick={() => setTypeFilter(type)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', cursor: 'pointer', borderBottom: '1px solid #f9fafb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: TYPE_COLORS[type]||'#64748b', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.83rem', color: '#374151', textTransform: 'capitalize' }}>{TYPE_LABELS[type]||type}</span>
                </div>
                <span style={{ fontSize: '0.83rem', fontWeight: 700, color: '#111827' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Inline Upload Section — Document Upload | Document Details */}
      <div ref={uploadSectionRef} style={{ ...s, marginTop: 20, padding: 22 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 28 }}>

          {/* Document Upload */}
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#111827', marginBottom: 12 }}>Document Upload</div>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragOver ? '#3b82f6' : extractStep === 4 ? '#10b981' : '#d1d5db'}`,
                borderRadius: 10, padding: '22px 16px',
                textAlign: 'center',
                background: dragOver ? '#eff6ff' : extractStep === 4 ? '#f0fdf4' : '#f9fafb',
                transition: 'all .2s',
              }}>
              <Upload size={26} color={dragOver ? '#3b82f6' : extractStep === 4 ? '#10b981' : '#9ca3af'} style={{ marginBottom: 10 }} />
              <p style={{ fontSize: '0.85rem', color: '#374151', margin: '0 0 4px', fontWeight: 600 }}>Drag &amp; drop files here</p>
              <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: '0 0 4px' }}>or</p>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 7, background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: extracting ? 'not-allowed' : 'pointer', margin: '6px 0 10px', opacity: extracting ? 0.6 : 1 }}>
                + Choose Files
                <input type="file" accept=".pdf,.png,.jpg,.jpeg,.gif,.webp" onChange={handleFileChange} disabled={extracting} style={{ display: 'none' }} />
              </label>
              <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: 0 }}>PNG, JPG, PDF up to 10MB</p>
              {file && <div style={{ marginTop: 6, fontSize: '0.73rem', color: '#6b7280', wordBreak: 'break-word', fontStyle: 'italic' }}>{file.name}</div>}
            </div>

            {/* Staged Progress Stepper */}
            {extractStep > 0 && (
              <div style={{ marginTop: 14, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {extractStep < 4 ? 'AI Processing…' : 'Extraction Complete'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Uploading',          icon: '' },
                    { label: 'Scanning Document',  icon: '' },
                    { label: 'Extracting Details', icon: '' },
                    { label: 'Fields Auto-filled', icon: '' },
                  ].map((step, idx) => {
                    const stepNum  = idx + 1
                    const isDone   = extractStep > stepNum
                    const isActive = extractStep === stepNum
                    return (
                      <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.7rem', fontWeight: 800,
                          background: isDone ? '#10b981' : isActive ? '#3b82f6' : '#f3f4f6',
                          color: extractStep < stepNum ? '#9ca3af' : '#fff',
                          boxShadow: isActive ? '0 0 0 3px #bfdbfe' : 'none',
                          transition: 'all 0.3s',
                        }}>
                          {isDone ? '✓' : isActive ? (
                            <span style={{ display: 'inline-block', animation: 'spin 0.8s linear infinite', fontSize: '0.65rem' }}>⟳</span>
                          ) : stepNum}
                        </div>
                        <span style={{
                          fontSize: '0.82rem',
                          fontWeight: isActive ? 700 : isDone ? 600 : 400,
                          color: isDone ? '#10b981' : isActive ? '#1d4ed8' : '#9ca3af',
                          transition: 'all 0.3s',
                        }}>
                          {step.label}
                        </span>
                        {isActive && (
                          <span style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: '#3b82f6', animation: 'pulse 1s ease-in-out infinite' }} />
                        )}
                      </div>
                    )
                  })}
                </div>
                {extractStep === 4 && (
                  <div style={{ marginTop: 10, padding: '8px 10px', background: '#f0fdf4', borderRadius: 7, fontSize: '0.78rem', color: '#15803d', fontWeight: 600, border: '1px solid #bbf7d0' }}>
                    Review the auto-filled fields below and click <strong>Upload Document</strong>
                  </div>
                )}
              </div>
            )}

            {/* CSS animations inline */}
            <style>{`
              @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
              @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
            `}</style>
          </div>

          {/* Document Details */}
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#111827', marginBottom: 12 }}>Document Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                  Document Type * {extracted?.doc_type && <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 400 }}>+ auto-filled</span>}
                </label>
                <select value={form.type} onChange={f('type')} style={{ width: '100%', padding: '9px 10px', border: `1px solid ${extracted?.doc_type ? '#10b981' : '#e5e7eb'}`, borderRadius: 7, fontSize: '0.84rem', outline: 'none', background: extracted?.doc_type ? '#f0fdf4' : '#fff' }}>
                  {Object.entries(TYPE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                  Entity Type * {extracted?.entity_type && <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 400 }}>+ auto-filled</span>}
                </label>
                <select value={form.entity_type} onChange={f('entity_type')} style={{ width: '100%', padding: '9px 10px', border: `1px solid ${extracted?.entity_type ? '#10b981' : '#e5e7eb'}`, borderRadius: 7, fontSize: '0.84rem', outline: 'none', background: extracted?.entity_type ? '#f0fdf4' : '#fff' }}>
                  <option value="vehicle">Vehicle</option>
                  <option value="driver">Driver</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                  Entity Name / Number * {((extracted?.registration_no && form.vehicle_id) || (extracted?.driver_name && form.driver_id)) && <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 400 }}>+ auto-filled</span>}
                </label>
                {form.entity_type === 'vehicle' ? (
                  <select value={form.vehicle_id} onChange={f('vehicle_id')} style={{ width: '100%', padding: '9px 10px', border: `1px solid ${extracted?.registration_no && form.vehicle_id ? '#10b981' : '#e5e7eb'}`, borderRadius: 7, fontSize: '0.84rem', outline: 'none', background: extracted?.registration_no && form.vehicle_id ? '#f0fdf4' : '#fff' }}>
                    <option value="">Select Vehicle</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_no} — {v.make}</option>)}
                  </select>
                ) : (
                  <select value={form.driver_id} onChange={f('driver_id')} style={{ width: '100%', padding: '9px 10px', border: `1px solid ${extracted?.driver_name && form.driver_id ? '#10b981' : '#e5e7eb'}`, borderRadius: 7, fontSize: '0.84rem', outline: 'none', background: extracted?.driver_name && form.driver_id ? '#f0fdf4' : '#fff' }}>
                    <option value="">Select Driver</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.user?.name || `Driver #${d.id}`}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                  Expiry Date * {extracted?.expiry_date && <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 400 }}>+ auto-filled</span>}
                </label>
                <input type="date" value={form.expiry_date} onChange={f('expiry_date')}
                  style={{ width: '100%', padding: '9px 10px', border: `1px solid ${extracted?.expiry_date && form.expiry_date ? '#10b981' : '#e5e7eb'}`, borderRadius: 7, fontSize: '0.84rem', outline: 'none', background: extracted?.expiry_date && form.expiry_date ? '#f0fdf4' : '#fff' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                  Issue Date {extracted?.issued_date && <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 400 }}>+ auto-filled</span>}
                </label>
                <input type="date" value={form.issued_date} onChange={f('issued_date')}
                  style={{ width: '100%', padding: '9px 10px', border: `1px solid ${extracted?.issued_date && form.issued_date ? '#10b981' : '#e5e7eb'}`, borderRadius: 7, fontSize: '0.84rem', outline: 'none', background: extracted?.issued_date && form.issued_date ? '#f0fdf4' : '#fff' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                  Document Title * {extracted?.title && <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 400 }}>+ auto-filled</span>}
                </label>
                <input value={form.title} onChange={f('title')} placeholder="e.g. Insurance Certificate"
                  style={{ width: '100%', padding: '9px 10px', border: `1px solid ${extracted?.title && form.title ? '#10b981' : '#e5e7eb'}`, borderRadius: 7, fontSize: '0.84rem', outline: 'none', background: extracted?.title && form.title ? '#f0fdf4' : '#fff' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                  Document No. {extracted?.document_no && <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 400 }}>+ auto-filled</span>}
                </label>
                <input value={form.document_no} onChange={f('document_no')} placeholder="e.g. INS/2026/123456"
                  style={{ width: '100%', padding: '9px 10px', border: `1px solid ${extracted?.document_no && form.document_no ? '#10b981' : '#e5e7eb'}`, borderRadius: 7, fontSize: '0.84rem', outline: 'none', background: extracted?.document_no && form.document_no ? '#f0fdf4' : '#fff' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                  Issuing Authority {extracted?.issuing_authority && <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 400 }}>+ auto-filled</span>}
                </label>
                <input value={form.issuing_authority} onChange={f('issuing_authority')} placeholder="e.g. IRDAI / RTO Mysore"
                  style={{ width: '100%', padding: '9px 10px', border: `1px solid ${extracted?.issuing_authority && form.issuing_authority ? '#10b981' : '#e5e7eb'}`, borderRadius: 7, fontSize: '0.84rem', outline: 'none', background: extracted?.issuing_authority && form.issuing_authority ? '#f0fdf4' : '#fff' }} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                  Description / Notes {extracted?.notes && <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 400 }}>+ auto-filled</span>}
                </label>
                <input value={form.notes} onChange={f('notes')} placeholder="Enter description (optional)"
                  style={{ width: '100%', padding: '9px 10px', border: `1px solid ${extracted?.notes && form.notes ? '#10b981' : '#e5e7eb'}`, borderRadius: 7, fontSize: '0.84rem', outline: 'none', background: extracted?.notes && form.notes ? '#f0fdf4' : '#fff' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <button onClick={resetForm} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: '0.84rem', color: '#374151', fontWeight: 600 }}>
                Reset
              </button>
              <button onClick={handleSave} disabled={saving || extracting} style={{
                padding: '9px 20px', borderRadius: 8, border: 'none', background: (saving || extracting) ? '#93c5fd' : '#3b82f6',
                color: '#fff', fontWeight: 700, fontSize: '0.84rem', cursor: (saving || extracting) ? 'not-allowed' : 'pointer',
              }}>
                {saving ? 'Uploading…' : extracting ? 'Scanning…' : '⬆ Upload Document'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewUrl && (
        <div onClick={closePreview} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 900, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
              <span style={{ fontWeight: 700 }}>Document Preview</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={previewUrl.blobUrl} download style={{ fontSize: '0.8rem', color: '#374151', textDecoration: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 10px' }}>Download</a>
                <button onClick={closePreview} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={16} /></button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
              {['png','jpg','jpeg','gif','webp'].includes(previewUrl.ext)
                ? <img src={previewUrl.blobUrl} alt="" style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }} />
                : <object data={previewUrl.blobUrl} type="application/pdf" style={{ width: '100%', height: '75vh', border: 'none' }}><a href={previewUrl.originalUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#fff' }}>Open PDF</a></object>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}