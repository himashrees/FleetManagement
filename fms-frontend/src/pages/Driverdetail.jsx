import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User } from 'lucide-react'
import { driverAPI, tripAPI, documentAPI } from '../services/api'
import { useToast } from '../context/ToastContext'
import { LoadingState } from '../components/Common'

const STATUS_COLOR = { active: '#16a34a', inactive: '#6b7280', suspended: '#dc2626' }
const STATUS_BG    = { active: '#dcfce7', inactive: '#f1f5f9', suspended: '#fee2e2' }

const AVAIL_COLOR  = { on_trip: '#1d4ed8', available: '#16a34a', off_duty: '#6b7280' }
const AVAIL_BG     = { on_trip: '#dbeafe', available: '#dcfce7', off_duty: '#f1f5f9' }
const AVAIL_LABEL  = { on_trip: 'ON TRIP', available: 'AVAILABLE', off_duty: 'OFF DUTY' }

const TABS = ['Trips', 'Documents', 'License History', 'Emergency Contact']

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>{label}</span>
      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827' }}>{value || '—'}</span>
    </div>
  )
}

export default function DriverDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [driver, setDriver]       = useState(null)
  const [trips, setTrips]         = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState('Trips')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      driverAPI.getById(id),
      tripAPI.getAll({ driver_id: id }),
      documentAPI.getAll({ driver_id: id }),
    ]).then(([d, t, doc]) => {
      setDriver(d.data.data)
      setTrips(t.data.data || [])
      setDocuments(doc.data.data || [])
    }).catch(() => toast.error('Failed to load driver details'))
    .finally(() => setLoading(false))
  }, [id])

  if (loading) return <LoadingState label="Loading driver details…" />
  if (!driver) return <div style={{ padding: 40, color: '#6b7280' }}>Driver not found.</div>

  const completedTrips = trips.filter(t => t.status === 'completed').length
  const totalKm = trips.reduce((s, t) => s + (parseFloat(t.distance_km) || 0), 0)

  const expiryColor = (d) => {
    if (!d) return '#6b7280'
    const days = (new Date(d) - new Date()) / 86400000
    return days < 0 ? '#dc2626' : days < 30 ? '#d97706' : '#111827'
  }

  return (
    <div className="page-enter" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <button onClick={() => navigate('/drivers')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '0.85rem', marginBottom: 16 }}>
        <ArrowLeft size={15} /> Back to Drivers
      </button>

      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 4 }}>Driver Details</h1>
      <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginBottom: 20 }}>Dashboard › Drivers › Driver Details</div>

      {/* Top section */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, marginBottom: 24 }}>
        {/* Left — photo + stats */}
        <div>
          <div style={{ width: '100%', height: 190, borderRadius: 12, overflow: 'hidden', background: '#f1f5f9', border: '1px solid #e5e7eb', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {driver.photo_url
              ? <img src={driver.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <User size={56} color="#d1d5db" />}
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px' }}>
            {/* Status — ACTIVE/SUSPENDED only, plain text + dot like Vehicle Details */}
            {/* driver.status stores availability (on_trip/available/off_duty/suspended)  */}
            {/* account is ACTIVE for all non-suspended states                            */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Status</span>
              <span style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase',
                color: driver.status === 'suspended' ? STATUS_COLOR.suspended : STATUS_COLOR.active,
              }}>
                {driver.status === 'suspended' ? 'SUSPENDED' : 'ACTIVE'}
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                  background: driver.status === 'suspended' ? STATUS_COLOR.suspended : STATUS_COLOR.active,
                }} />
              </span>
            </div>
            {/* Availability — on_trip / available / off_duty as coloured pill */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Availability</span>
              <span style={{
                background: AVAIL_BG[driver.status]  || AVAIL_BG.available,
                color:      AVAIL_COLOR[driver.status]|| AVAIL_COLOR.available,
                padding: '2px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700,
              }}>
                {AVAIL_LABEL[driver.status] || 'AVAILABLE'}
              </span>
            </div>
            <InfoRow label="Total Trips"  value={completedTrips} />
            <InfoRow label="Total KM"     value={`${totalKm.toFixed(0)} km`} />
            <InfoRow label="Experience"   value={`${driver.experience_years || 0} years`} />
            <InfoRow label="Date Joined"  value={driver.createdAt ? new Date(driver.createdAt).toLocaleDateString('en-IN') : '—'} />
          </div>
        </div>

        {/* Right — driver info */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '20px 24px' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 16 }}>Driver Information</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
            {[
              ['Driver Name',      driver.user?.name],
              ['Phone Number',     driver.user?.phone],
              ['License Number',   driver.license_number],
              ['Email',            driver.user?.email],
              ['License Type',     driver.license_type],
              ['Address',          driver.address],
              ['License Expiry',   driver.license_expiry ? <span style={{ color: expiryColor(driver.license_expiry) }}>{new Date(driver.license_expiry).toLocaleDateString('en-IN')}</span> : '—'],
              ['Emergency Contact',driver.emergency_contact],
              ['Assigned Vehicle', driver.assignedVehicle ? `${driver.assignedVehicle.registration_no} — ${driver.assignedVehicle.make} ${driver.assignedVehicle.model}` : 'None'],
            ].map(([label, value]) => (
              <InfoRow key={label} label={label} value={value} />
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '12px 20px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: '0.82rem', fontWeight: tab === t ? 700 : 500,
              color: tab === t ? '#2563eb' : '#6b7280',
              borderBottom: tab === t ? '2px solid #2563eb' : '2px solid transparent',
            }}>{t}</button>
          ))}
        </div>

        <div style={{ padding: '16px 20px' }}>
          {/* Trips */}
          {tab === 'Trips' && (
            trips.length === 0
              ? <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No trips recorded</div>
              : <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#f9fafb' }}>
                    {['#','Trip ID','From','To','Date','Distance','Status'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {trips.map((t, i) => (
                      <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontSize: '0.82rem', color: '#9ca3af' }}>{i+1}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700, color: '#2563eb' }}>TRP{String(t.id).padStart(3,'0')}</td>
                        <td style={{ padding: '10px 12px', fontSize: '0.82rem' }}>{t.start_location || '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: '0.82rem' }}>{t.end_location || '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: '0.82rem' }}>{t.start_time ? new Date(t.start_time).toLocaleDateString('en-IN') : '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: '0.82rem', fontWeight: 600 }}>{t.distance_km ? `${parseFloat(t.distance_km).toFixed(1)} km` : '—'}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            background: t.status === 'completed' ? '#f0fdf4' : t.status === 'in_progress' ? '#eff6ff' : '#fef3c7',
                            color:      t.status === 'completed' ? '#16a34a' : t.status === 'in_progress' ? '#1d4ed8' : '#d97706',
                            padding: '2px 8px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize',
                          }}>{t.status?.replace('_',' ')}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
          )}

          {/* Documents */}
          {tab === 'Documents' && (
            documents.length === 0
              ? <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No documents uploaded</div>
              : <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#f9fafb' }}>
                    {['#','Title','Type','Issued By','Issue Date','Expiry','Status'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {documents.map((d, i) => {
                      const expired = d.expiry_date && new Date(d.expiry_date) < new Date()
                      const expiringSoon = !expired && d.expiry_date && (new Date(d.expiry_date) - new Date()) / 86400000 <= 30
                      return (
                        <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', fontSize: '0.82rem', color: '#9ca3af' }}>{i+1}</td>
                          <td style={{ padding: '10px 12px', fontSize: '0.82rem', fontWeight: 600 }}>{d.title}</td>
                          <td style={{ padding: '10px 12px', fontSize: '0.82rem', textTransform: 'capitalize' }}>{d.type}</td>
                          <td style={{ padding: '10px 12px', fontSize: '0.82rem' }}>{d.issuing_authority || '—'}</td>
                          <td style={{ padding: '10px 12px', fontSize: '0.82rem' }}>{d.issued_date ? new Date(d.issued_date).toLocaleDateString('en-IN') : '—'}</td>
                          <td style={{ padding: '10px 12px', fontSize: '0.82rem', color: expired ? '#dc2626' : expiringSoon ? '#d97706' : '#111827', fontWeight: 600 }}>
                            {d.expiry_date ? new Date(d.expiry_date).toLocaleDateString('en-IN') : '—'}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ background: expired ? '#fee2e2' : expiringSoon ? '#fef3c7' : '#f0fdf4', color: expired ? '#dc2626' : expiringSoon ? '#d97706' : '#16a34a', padding: '2px 8px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700 }}>
                              {expired ? 'Expired' : expiringSoon ? 'Expiring Soon' : 'Valid'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
          )}

          {/* License History */}
          {tab === 'License History' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px', maxWidth: 600 }}>
              {[
                ['License Number',  driver.license_number],
                ['License Type',    driver.license_type],
                ['License Expiry',  driver.license_expiry ? new Date(driver.license_expiry).toLocaleDateString('en-IN') : '—'],
                ['Experience',      `${driver.experience_years || 0} years`],
              ].map(([label, value]) => (
                <InfoRow key={label} label={label} value={value} />
              ))}
            </div>
          )}

          {/* Emergency Contact */}
          {tab === 'Emergency Contact' && (
            <div style={{ maxWidth: 400 }}>
              <InfoRow label="Emergency Contact" value={driver.emergency_contact || '—'} />
              <InfoRow label="Address"           value={driver.address || '—'} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}