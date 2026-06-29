import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Truck, RefreshCw } from 'lucide-react'
import { vehicleAPI, maintenanceAPI, tripAPI, fuelAPI, documentAPI } from '../services/api'
import { useToast } from '../context/ToastContext'
import { LoadingState } from '../components/Common'

const STATUS_COLOR = { active: '#16a34a', inactive: '#6b7280', maintenance: '#d97706', retired: '#dc2626' }
const STATUS_BG    = { active: '#dcfce7', inactive: '#f1f5f9', maintenance: '#fef3c7', retired: '#fee2e2' }

const TABS = ['Service History', 'Documents', 'Trips', 'Fuel Logs', 'Maintenance']

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>{label}</span>
      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827' }}>{value || '—'}</span>
    </div>
  )
}

export default function VehicleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [vehicle, setVehicle]         = useState(null)
  const [maintenance, setMaintenance] = useState([])
  const [trips, setTrips]             = useState([])
  const [fuel, setFuel]               = useState([])
  const [documents, setDocuments]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [tab, setTab]                 = useState('Service History')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      vehicleAPI.getById(id),
      maintenanceAPI.getAll({ vehicle_id: id }),
      tripAPI.getAll({ vehicle_id: id }),
      fuelAPI.getAll({ vehicle_id: id }),
      documentAPI.getAll({ vehicle_id: id }),
    ]).then(([v, m, t, f, d]) => {
      setVehicle(v.data.data)
      setMaintenance(m.data.data || [])
      setTrips(t.data.data || [])
      setFuel(f.data.data || [])
      setDocuments(d.data.data || [])
    }).catch(() => toast.error('Failed to load vehicle details'))
    .finally(() => setLoading(false))
  }, [id])

  if (loading) return <LoadingState label="Loading vehicle details…" />
  if (!vehicle) return <div style={{ padding: 40, color: '#6b7280' }}>Vehicle not found.</div>

  const expiryColor = (d) => {
    if (!d) return '#6b7280'
    const days = (new Date(d) - new Date()) / 86400000
    return days < 0 ? '#dc2626' : days < 30 ? '#d97706' : '#111827'
  }

  const lastService = maintenance.filter(m => m.status === 'completed').sort((a, b) => new Date(b.completed_date) - new Date(a.completed_date))[0]

  return (
    <div className="page-enter" style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Back */}
      <button onClick={() => navigate('/vehicles')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '0.85rem', marginBottom: 16 }}>
        <ArrowLeft size={15} /> Back to Vehicles
      </button>

      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 4 }}>Vehicle Details</h1>
      <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginBottom: 20 }}>Dashboard › Vehicles › Vehicle Details</div>

      {/* Top section */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, marginBottom: 24 }}>
        {/* Left — photo + status */}
        <div>
          <div style={{ width: '100%', height: 190, borderRadius: 12, overflow: 'hidden', background: '#f1f5f9', border: '1px solid #e5e7eb', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {vehicle.photo_url
              ? <img src={vehicle.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <Truck size={56} color="#d1d5db" />}
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Status</span>
              <span style={{ background: STATUS_BG[vehicle.status], color: STATUS_COLOR[vehicle.status], padding: '2px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize' }}>
                {vehicle.status}
              </span>
            </div>
            <InfoRow label="Insurance Expiry" value={vehicle.insurance_expiry ? <span style={{ color: expiryColor(vehicle.insurance_expiry) }}>{new Date(vehicle.insurance_expiry).toLocaleDateString('en-IN')}</span> : '—'} />
            <InfoRow label="RC Expiry"         value={vehicle.rc_expiry ? <span style={{ color: expiryColor(vehicle.rc_expiry) }}>{new Date(vehicle.rc_expiry).toLocaleDateString('en-IN')}</span> : '—'} />
            <InfoRow label="Last Service"      value={lastService?.completed_date ? new Date(lastService.completed_date).toLocaleDateString('en-IN') : '—'} />
          </div>
        </div>

        {/* Right — info */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '20px 24px' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 16 }}>Vehicle Information</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
            {[
              ['Registration Number', vehicle.registration_no],
              ['Vehicle Model',       `${vehicle.make || ''} ${vehicle.model || ''}`.trim()],
              ['Vehicle Type',        vehicle.type],
              ['Fuel Type',           vehicle.fuel_type],
              ['Manufacturing Year',  vehicle.year],
              ['Color',               vehicle.color],
              ['Odometer (km)',        vehicle.odometer_km ? `${parseFloat(vehicle.odometer_km).toLocaleString('en-IN')} km` : '—'],
              ['Capacity (kg)',        vehicle.capacity_kg || '—'],
              ['Chassis / VIN',       vehicle.vin_number || '—'],
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
          {/* Service History */}
          {tab === 'Service History' && (
            maintenance.filter(m => m.status === 'completed').length === 0
              ? <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No service history yet</div>
              : <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#f9fafb' }}>
                    {['#','Service Date','Service Type','Workshop','Cost (₹)','Next Service','Status'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {maintenance.filter(m => m.status === 'completed').map((m, i) => (
                      <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontSize: '0.82rem', color: '#9ca3af' }}>{i+1}</td>
                        <td style={{ padding: '10px 12px', fontSize: '0.82rem' }}>{m.completed_date ? new Date(m.completed_date).toLocaleDateString('en-IN') : '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: '0.82rem', textTransform: 'capitalize' }}>{m.type?.replace('_',' ')}</td>
                        <td style={{ padding: '10px 12px', fontSize: '0.82rem' }}>{m.workshop_name || '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: '0.82rem', fontWeight: 600 }}>{m.cost ? `₹${parseFloat(m.cost).toLocaleString('en-IN')}` : '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: '0.82rem', color: '#6b7280' }}>{m.next_due_date ? new Date(m.next_due_date).toLocaleDateString('en-IN') : '—'}</td>
                        <td style={{ padding: '10px 12px' }}><span style={{ background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700 }}>Completed</span></td>
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
                    {['#','Title','Type','Issued By','Issue Date','Expiry Date','Status'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {documents.map((d, i) => {
                      const expired = d.expiry_date && new Date(d.expiry_date) < new Date()
                      const expiringSoon = d.expiry_date && !expired && (new Date(d.expiry_date) - new Date()) / 86400000 <= 30
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

          {/* Fuel Logs */}
          {tab === 'Fuel Logs' && (
            fuel.length === 0
              ? <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No fuel logs recorded</div>
              : <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#f9fafb' }}>
                    {['#','Date','Fuel Type','Litres','Cost/L','Total Cost','Station'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {fuel.map((f, i) => (
                      <tr key={f.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontSize: '0.82rem', color: '#9ca3af' }}>{i+1}</td>
                        <td style={{ padding: '10px 12px', fontSize: '0.82rem' }}>{f.filled_at ? new Date(f.filled_at).toLocaleDateString('en-IN') : '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: '0.82rem', textTransform: 'capitalize' }}>{f.fuel_type}</td>
                        <td style={{ padding: '10px 12px', fontSize: '0.82rem', fontWeight: 600 }}>{f.litres} L</td>
                        <td style={{ padding: '10px 12px', fontSize: '0.82rem' }}>₹{f.cost_per_litre}</td>
                        <td style={{ padding: '10px 12px', fontSize: '0.82rem', fontWeight: 700, color: '#16a34a' }}>₹{parseFloat(f.total_cost).toLocaleString('en-IN')}</td>
                        <td style={{ padding: '10px 12px', fontSize: '0.82rem' }}>{f.station_name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
          )}

          {/* Maintenance */}
          {tab === 'Maintenance' && (
            maintenance.length === 0
              ? <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No maintenance records</div>
              : <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#f9fafb' }}>
                    {['#','Type','Scheduled','Status','Cost','Workshop','Next Due'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {maintenance.map((m, i) => (
                      <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontSize: '0.82rem', color: '#9ca3af' }}>{i+1}</td>
                        <td style={{ padding: '10px 12px', fontSize: '0.82rem', textTransform: 'capitalize' }}>{m.type?.replace('_',' ')}</td>
                        <td style={{ padding: '10px 12px', fontSize: '0.82rem' }}>{m.scheduled_date ? new Date(m.scheduled_date).toLocaleDateString('en-IN') : '—'}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            background: m.status === 'completed' ? '#f0fdf4' : m.status === 'in_progress' ? '#eff6ff' : '#fef3c7',
                            color:      m.status === 'completed' ? '#16a34a' : m.status === 'in_progress' ? '#1d4ed8' : '#d97706',
                            padding: '2px 8px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize',
                          }}>{m.status?.replace('_',' ')}</span>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '0.82rem', fontWeight: 600 }}>{m.cost ? `₹${parseFloat(m.cost).toLocaleString('en-IN')}` : '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: '0.82rem' }}>{m.workshop_name || '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: '0.82rem', color: '#6b7280' }}>{m.next_due_date ? new Date(m.next_due_date).toLocaleDateString('en-IN') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
          )}
        </div>
      </div>
    </div>
  )
}