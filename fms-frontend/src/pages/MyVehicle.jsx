import { useState, useEffect } from 'react'
import { Truck, FileText, Calendar, Fuel, Navigation, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { driverAPI, documentAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { LoadingState } from '../components/Common'

function ExpiryBadge({ date }) {
  if (!date) return <span style={pill('#f1f5f9','#94a3b8')}>Not uploaded</span>
  const days = Math.floor((new Date(date) - new Date()) / 86400000)
  if (days < 0)   return <span style={pill('#fee2e2','#dc2626')}>⚠ Expired</span>
  if (days <= 30) return <span style={pill('#fef3c7','#d97706')}>Expires in {days}d</span>
  return <span style={pill('#dcfce7','#16a34a')}>✓ Valid</span>
}
function pill(bg, color) {
  return { background: bg, color, fontSize: '0.73rem', fontWeight: 600, padding: '4px 12px', borderRadius: '999px' }
}

export default function MyVehicle() {
  const { user } = useAuth()
  const toast    = useToast()
  const [profile,  setProfile]  = useState(null)
  const [vDocs,    setVDocs]    = useState([])
  const [loading,  setLoading]  = useState(true)

  const load = () => {
    if (!user?.driverId) { setLoading(false); return }
    setLoading(true)
    driverAPI.getById(user.driverId)
      .then(r => {
        const p = r.data.data
        setProfile(p)
        if (p?.assigned_vehicle_id) {
          return documentAPI.getAll({ vehicle_id: p.assigned_vehicle_id })
            .then(vd => setVDocs(vd.data.data || []))
        }
      })
      .catch(() => toast.error('Failed to load vehicle info'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [user])

  const vehicle = profile?.assignedVehicle
  const findDoc = (...types) => vDocs.find(d => types.some(tp => d.type?.toLowerCase().includes(tp)))
  const rcDoc       = findDoc('rc','registration')
  const insurDoc    = findDoc('insurance')

  if (loading) return <LoadingState label="Loading your vehicle…" />

  return (
    <div style={{ padding: '24px', maxWidth: '860px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
            My <span style={{ color: '#1d4ed8' }}>Vehicle</span>
          </h1>
          <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '3px' }}>Your assigned vehicle & documents</div>
        </div>
        <button onClick={load} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', color: '#64748b' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {!vehicle ? (
        <div style={{ textAlign: 'center', padding: '100px 20px', color: '#9ca3af' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '12px', opacity: 0.3 }}>🚛</div>
          <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '6px', color: '#64748b' }}>No vehicle assigned</div>
          <div style={{ fontSize: '0.85rem' }}>Contact your fleet manager to get a vehicle assigned to you</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Vehicle card */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
            {/* Photo / hero */}
            <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)', padding: '32px', display: 'flex', alignItems: 'center', gap: '24px' }}>
              {vehicle.photo_path ? (
                <img src={vehicle.photo_path} alt="Vehicle" style={{ width: '110px', height: '80px', objectFit: 'cover', borderRadius: '10px', border: '2px solid rgba(255,255,255,0.2)' }} />
              ) : (
                <div style={{ width: '110px', height: '80px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.2)' }}>
                  <Truck size={40} color="rgba(255,255,255,0.6)" />
                </div>
              )}
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: '1.3rem', fontWeight: 800, color: '#fff', letterSpacing: '0.05em' }}>{vehicle.registration_no}</div>
                <div style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.85)', marginTop: '4px' }}>{vehicle.make} {vehicle.model}</div>
                <div style={{ marginTop: '8px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '3px 12px', borderRadius: '999px',
                    background: vehicle.status === 'active' ? '#16a34a' : vehicle.status === 'in_use' ? '#2563eb' : '#d97706',
                    color: '#fff' }}>
                    {vehicle.status === 'in_use' ? 'In Use' : vehicle.status === 'active' ? 'Active' : vehicle.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Details grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
              {[
                { icon: <Truck size={18} color="#1d4ed8" />,       label: 'Type',       value: vehicle.type || '—' },
                { icon: <Fuel size={18} color="#16a34a" />,         label: 'Fuel Type',  value: vehicle.fuel_type || '—' },
                { icon: <Calendar size={18} color="#7c3aed" />,     label: 'Year',       value: vehicle.year || '—' },
                { icon: <Navigation size={18} color="#d97706" />,   label: 'Odometer',   value: vehicle.odometer_km ? `${Number(vehicle.odometer_km).toLocaleString()} km` : '—' },
                { icon: <CheckCircle2 size={18} color="#16a34a" />, label: 'Last Service', value: vehicle.last_service_date || '—' },
                { icon: <Truck size={18} color="#64748b" />,        label: 'Color',      value: vehicle.color || '—' },
              ].map((item, i) => (
                <div key={i} style={{ padding: '18px 20px', borderTop: '1px solid #f1f5f9', borderRight: i % 3 !== 2 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                    {item.icon}
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</span>
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', textTransform: 'capitalize' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Documents */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '16px', fontSize: '0.95rem' }}>
              <FileText size={16} color="#1d4ed8" /> Vehicle Documents
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                ['Registration Certificate (RC)', rcDoc],
                ['Insurance',                     insurDoc],
              ].map(([name, doc], i) => (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: i < 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a' }}>{name}</div>
                    {doc?.expiry_date && (
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '2px' }}>
                        Expires: {new Date(doc.expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                  <ExpiryBadge date={doc?.expiry_date} />
                </div>
              ))}
            </div>
          </div>

          {/* Insurance / RC expiry warning */}
          {[rcDoc, insurDoc].some(d => {
            if (!d?.expiry_date) return false
            return (new Date(d.expiry_date) - new Date()) / 86400000 <= 30
          }) && (
            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.85rem', color: '#92400e', fontWeight: 500 }}>
                One or more vehicle documents are expiring soon. Please inform your fleet manager to renew them.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}