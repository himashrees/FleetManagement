import { useState, useEffect } from 'react'
import { User, Truck, FileText, Eye, Download, RefreshCw, FileWarning, CheckCircle, Clock, XCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { driverAPI, documentAPI, tripAPI } from '../services/api'
import { LoadingState } from '../components/Common'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const fileUrl  = (fp) => { if (!fp) return null; if (fp.startsWith('http')) return fp; return `${API_BASE}${fp.startsWith('/') ? '' : '/'}${fp}` }

const TYPE_COLORS = { insurance: '#3b82f6', registration: '#10b981', permit: '#f59e0b', license: '#8b5cf6', pollution: '#06b6d4', other: '#64748b' }
const TYPE_LABELS = { insurance: 'Insurance', registration: 'Registration', permit: 'Permit', license: 'License', pollution: 'Compliance', other: 'Other' }

const daysUntil = (e) => e ? Math.ceil((new Date(e) - new Date()) / 86400000) : null
const getStatus = (e) => { const d = daysUntil(e); if (d === null) return 'permanent'; if (d < 0) return 'expired'; if (d <= 30) return 'expiring'; return 'valid' }

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

function StatusBadge({ expiry }) {
  const status = getStatus(expiry)
  const meta = {
    valid:     { label: 'Valid',         bg: '#dcfce7', color: '#16a34a' },
    expiring:  { label: 'Expiring Soon', bg: '#fef3c7', color: '#d97706' },
    expired:   { label: 'Expired',       bg: '#fee2e2', color: '#dc2626' },
    permanent: { label: 'Permanent',     bg: '#dbeafe', color: '#1d4ed8' },
  }[status]
  return <span style={{ fontSize: '0.76rem', fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: meta.bg, color: meta.color, display: 'inline-block', whiteSpace: 'nowrap' }}>{meta.label}</span>
}

function DocTable({ title, icon: Icon, iconColor, iconBg, docs, onView }) {
  const th = { padding: '11px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '0.78rem', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }
  const td = { padding: '13px 16px', borderBottom: '1px solid #f1f5f9', fontSize: '0.84rem', verticalAlign: 'middle' }

  return (
    <div style={{ marginBottom: 32 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={iconColor} />
        </div>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#111827' }}>{title}</h2>
        <span style={{ fontSize: '0.78rem', color: '#9ca3af', background: '#f3f4f6', padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>{docs.length}</span>
      </div>

      {docs.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>
          No documents uploaded yet
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Document Name','Document Type','Document No.','Issue Date','Expiry Date','Status','Action'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {docs.map(d => {
                const url = fileUrl(d.file_path)
                return (
                  <tr key={d.id} style={{ transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 6, background: `${TYPE_COLORS[d.type]||'#64748b'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <FileText size={14} color={TYPE_COLORS[d.type]||'#64748b'} />
                        </div>
                        <span style={{ fontWeight: 600, color: '#111827', fontSize: '0.86rem' }}>{d.title}</span>
                      </div>
                    </td>
                    <td style={td}>
                      <span style={{ color: '#475569' }}>{TYPE_LABELS[d.type] || d.type || '—'}</span>
                    </td>
                    <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.8rem', color: '#475569' }}>{d.document_no || '—'}</td>
                    <td style={{ ...td, color: '#64748b' }}>{fmtDate(d.issued_date)}</td>
                    <td style={{ ...td, color: '#64748b' }}>{d.expiry_date ? fmtDate(d.expiry_date) : '—'}</td>
                    <td style={td}><StatusBadge expiry={d.expiry_date} /></td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {url ? (
                          <button onClick={() => onView(d.file_path)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontWeight: 600, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 7, padding: '5px 12px', cursor: 'pointer' }}>
                            <Eye size={13} /> View
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>No file</span>
                        )}
                        {url && (
                          <a href={url} download
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontWeight: 600, color: '#475569', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 7, padding: '5px 12px', textDecoration: 'none' }}>
                            <Download size={13} /> Download
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function MyDocuments() {
  const { user } = useAuth()
  const toast    = useToast()
  const [profile,     setProfile]     = useState(null)
  const [driverDocs,  setDriverDocs]  = useState([])
  const [vehicleDocs, setVehicleDocs] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [previewUrl,  setPreviewUrl]  = useState(null)

  const load = () => {
    if (!user?.driverId) { setLoading(false); return }
    setLoading(true)

    Promise.all([
      driverAPI.getById(user.driverId),
      tripAPI.getAll({ driver_id: user.driverId }),
    ])
      .then(([driverRes, tripsRes]) => {
        const p = driverRes.data.data
        setProfile(p)

        const allTrips = tripsRes.data.data || []

        // 1. Prefer the permanently assigned vehicle on the driver profile
        // 2. Otherwise, only show vehicle docs once the driver has actually started a trip
        //    (status === 'in_progress'). A merely "scheduled" trip — or any other trip —
        //    does not mean the driver is currently using that vehicle, so it must not be
        //    used to surface that vehicle's documents.
        const activeTrip = allTrips.find(t => t.status === 'in_progress')

        const vehicleId = p?.assigned_vehicle_id
          || activeTrip?.vehicle_id
          || null

        // Patch profile so the info strip shows the vehicle
        if (!p?.assignedVehicle && activeTrip?.vehicle) {
          p.assignedVehicle = activeTrip.vehicle
        }

        return Promise.all([
          documentAPI.getAll({ driver_id: user.driverId }),
          vehicleId
            ? documentAPI.getAll({ vehicle_id: vehicleId })
            : Promise.resolve({ data: { data: [] } }),
        ])
      })
      .then(([dd, vd]) => {
        setDriverDocs(dd.data.data || [])
        setVehicleDocs(vd.data.data || [])
      })
      .catch(() => toast.error('Failed to load documents'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [user])

  const openPreview = async (fp) => {
    const url = fileUrl(fp); if (!url) return
    const ext = fp.split('.').pop().toLowerCase()
    if (!['pdf','png','jpg','jpeg','gif','webp'].includes(ext)) { window.open(url, '_blank'); return }
    try {
      const resp = await fetch(url, { credentials: 'include' })
      if (!resp.ok) throw new Error()
      const blob = await resp.blob()
      setPreviewUrl({ blobUrl: URL.createObjectURL(blob), ext })
    } catch { window.open(url, '_blank') }
  }
  const closePreview = () => { if (previewUrl?.blobUrl) URL.revokeObjectURL(previewUrl.blobUrl); setPreviewUrl(null) }

  if (loading) return <LoadingState label="Loading your documents…" />

  if (!user?.driverId) return (
    <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
      <FileWarning size={36} style={{ marginBottom: 12, color: '#d97706' }} />
      <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 6 }}>No driver profile linked</div>
      <div style={{ fontSize: '0.85rem' }}>Contact your fleet manager to get set up.</div>
    </div>
  )

  const vehicle = profile?.assignedVehicle

  // expiry warnings
  const warnings = [...driverDocs, ...vehicleDocs].filter(d => ['expiring','expired'].includes(getStatus(d.expiry_date)))

  return (
    <div className="page">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#111827' }}>My Documents</h1>
          <p style={{ fontSize: '0.84rem', color: '#6b7280', margin: '4px 0 0' }}>View your driver and vehicle documents</p>
        </div>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: '0.83rem', color: '#374151', fontWeight: 600 }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Expiry warning banner */}
      {warnings.length > 0 && (
        <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Clock size={16} color="#ca8a04" style={{ marginTop: 1, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#854d0e', marginBottom: 4 }}>Attention Required</div>
            <div style={{ fontSize: '0.82rem', color: '#92400e' }}>
              {warnings.map(d => `${d.title} (${getStatus(d.expiry_date) === 'expired' ? 'EXPIRED' : `expires ${fmtDate(d.expiry_date)}`})`).join(' · ')}
            </div>
          </div>
        </div>
      )}

      {/* Driver + Vehicle info strip */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 24px', marginBottom: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingRight: 24, borderRight: '1px solid #f3f4f6' }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <User size={24} color="#3b82f6" />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Driver</div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#111827' }}>{user?.name || '—'}</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>DL: {profile?.license_number || '—'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingLeft: 24 }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Truck size={24} color="#3b82f6" />
          </div>
          {vehicle ? (
            <div>
              <div style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Vehicle</div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#111827', fontFamily: 'monospace' }}>{vehicle.registration_no}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>{vehicle.make} {vehicle.model}</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Vehicle</div>
              <div style={{ fontWeight: 600, color: '#9ca3af', fontSize: '0.88rem' }}>No vehicle assigned</div>
            </div>
          )}
        </div>
      </div>

      {/* Driver Documents */}
      <DocTable
        title="Driver Documents"
        icon={User}
        iconColor="#3b82f6"
        iconBg="#eff6ff"
        docs={driverDocs}
        onView={openPreview}
      />

      {/* Vehicle Documents */}
      <DocTable
        title="Vehicle Documents"
        icon={Truck}
        iconColor="#3b82f6"
        iconBg="#eff6ff"
        docs={vehicleDocs}
        onView={openPreview}
      />

      {/* Preview Modal */}
      {previewUrl && (
        <div onClick={closePreview} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 900, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
              <span style={{ fontWeight: 700 }}>Document Preview</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={previewUrl.blobUrl} download style={{ fontSize: '0.8rem', color: '#374151', textDecoration: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 10px' }}>Download</a>
                <button onClick={closePreview} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#6b7280', display: 'flex' }}>✕</button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
              {['png','jpg','jpeg','gif','webp'].includes(previewUrl.ext)
                ? <img src={previewUrl.blobUrl} alt="" style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }} />
                : <object data={previewUrl.blobUrl} type="application/pdf" style={{ width: '100%', height: '75vh', border: 'none' }}><a href={previewUrl.blobUrl} style={{ color: '#fff' }}>Open PDF</a></object>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}