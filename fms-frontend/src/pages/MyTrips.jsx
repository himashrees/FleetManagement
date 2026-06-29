import { useState, useRef, useEffect } from 'react'
import { CheckCircle2, Camera, Upload, MapPin, ArrowRight, Info, Play, Square, X, Clock } from 'lucide-react'
import { tripAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

function fileToB64(file, onDone, onError) {
  if (file.size > 5 * 1024 * 1024) { onError('File must be under 5 MB'); return }
  const r = new FileReader()
  r.onloadend = () => onDone(r.result)
  r.readAsDataURL(file)
}

function PhotoBox({ value, onChange, readOnly, label }) {
  const ref = useRef(null)
  return (
    <div>
      {label && <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 5 }}>{label}</div>}
      <div onClick={() => !readOnly && ref.current?.click()} style={{
        border: '1.5px dashed #d1d5db', borderRadius: 8, minHeight: 96,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 6, background: value ? '#f0fdf4' : '#fafafa',
        cursor: readOnly ? 'default' : 'pointer', overflow: 'hidden',
      }}>
        {value
          ? <img src={value} alt="" style={{ width: '100%', maxHeight: 120, objectFit: 'contain' }} />
          : <><Camera size={22} color="#9ca3af" /><span style={{ fontSize: '0.76rem', color: '#9ca3af' }}>Upload Photo</span></>
        }
        {!readOnly && <input ref={ref} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onChange} />}
      </div>
    </div>
  )
}

function ReceiptBox({ value, onChange, label }) {
  return (
    <div>
      {label && <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 5 }}>{label}</div>}
      <label style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 6, border: '1.5px dashed #d1d5db',
        borderRadius: 8, padding: '18px 10px', cursor: 'pointer',
        background: value ? '#f0fdf4' : '#fafafa', minHeight: 78,
      }}>
        {value
          ? <><CheckCircle2 size={16} color="#16a34a" /><span style={{ fontSize: '0.74rem', color: '#16a34a' }}>Receipt attached</span></>
          : <><Upload size={16} color="#9ca3af" /><span style={{ fontSize: '0.74rem', color: '#9ca3af' }}>Upload Receipt</span></>
        }
        <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={onChange} />
      </label>
    </div>
  )
}

const inp = { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: '0.82rem', color: '#111827', background: '#fff', outline: 'none', boxSizing: 'border-box' }
const lbl = { fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 5, display: 'block' }
const col = { background: '#fff', border: '1px solid #e8eaed', borderRadius: 10, padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 14 }
const F = 'Inter, system-ui, sans-serif'

export default function MyTrips() {
  const { user } = useAuth()
  const toast = useToast()

  const [trips, setTrips]         = useState([])
  const [activeTrip, setActiveTrip] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  // Start trip popup
  const [showStartPopup, setShowStartPopup] = useState(false)
  const [pendingTrip, setPendingTrip]       = useState(null)
  const [startOdom,     setStartOdom]       = useState('')
  const [startOdomPic,  setStartOdomPic]    = useState(null)
  const [vehicleBefore, setVehicleBefore]   = useState(null)

  // End trip fields
  const [endOdom,      setEndOdom]      = useState('')
  const [endOdomPic,   setEndOdomPic]   = useState(null)
  const [vehicleAfter, setVehicleAfter] = useState(null)

  // Fuel & toll
  const [fuelStation,  setFuelStation]  = useState('')
  const [fuelLiters,   setFuelLiters]   = useState('')
  const [fuelAmount,   setFuelAmount]   = useState('')
  const [fuelReceipt,  setFuelReceipt]  = useState(null)
  const [otherCharge,  setOtherCharge]  = useState('')
  const [tollLocation, setTollLocation] = useState('')
  const [tollAmount,   setTollAmount]   = useState('')
  const [tollReceipt,  setTollReceipt]  = useState(null)

  const img = setter => e => {
    const f = e.target.files[0]; if (!f) return
    fileToB64(f, b64 => setter(b64), msg => toast.error(msg))
  }

  const totalCharges = (parseFloat(fuelAmount) || 0) + (parseFloat(tollAmount) || 0) + (parseFloat(otherCharge) || 0)

  const load = async () => {
    setLoading(true)
    try {
      const r = await tripAPI.getAll({})
      const all = r.data.data || []
      // Driver sees scheduled (upcoming) + in_progress (ongoing) trips
      const mine = all.filter(t => t.status === 'scheduled' || t.status === 'in_progress')
      setTrips(mine)
      const ongoing = mine.find(t => t.status === 'in_progress')
      if (ongoing) setActiveTrip(ongoing)
      else setActiveTrip(null)
    } catch { toast.error('Failed to load trips') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // Opens the "Start Trip" popup — does NOT change status yet
  const openStartPopup = (trip) => {
    setPendingTrip(trip)
    setStartOdom('')
    setStartOdomPic(null)
    setVehicleBefore(null)
    setError('')
    setShowStartPopup(true)
  }

  // Confirm Start — calls backend, changes status to in_progress
  const handleConfirmStart = async () => {
    if (!startOdom) { setError('Start odometer reading is required'); return }
    setError('')
    setSaving(true)
    try {
      await tripAPI.startTrip(pendingTrip.id, {
        start_odometer:       parseFloat(startOdom),
        start_odometer_photo: startOdomPic || null,
        vehicle_photo_before: vehicleBefore || null,
      })
      toast.success('Trip started! Admin has been notified.')
      setShowStartPopup(false)
      setPendingTrip(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start trip')
    } finally { setSaving(false) }
  }

  const handleComplete = async () => {
    if (!endOdom) { setError('End odometer reading is required'); return }
    setError('')
    setSaving(true)
    try {
      await tripAPI.endTrip(activeTrip.id, {
        end_odometer:        parseFloat(endOdom),
        end_odometer_photo:  endOdomPic   || null,
        vehicle_photo_after: vehicleAfter || null,
        fuel_used:           parseFloat(fuelLiters) || null,
        fuel_cost:           parseFloat(fuelAmount) || null,
        fuel_station:        fuelStation || null,
        fuel_receipt_url:    fuelReceipt || null,
        toll_charges:        parseFloat(tollAmount) || null,
        toll_location:       tollLocation || null,
        toll_receipt_url:    tollReceipt  || null,
        other_charges:       parseFloat(otherCharge) || null,
      })
      toast.success('Trip completed! Admin has been notified.')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete trip')
    } finally { setSaving(false) }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontFamily: F }}>Loading trips…</div>

  // ── No active or scheduled trip ──
  if (!activeTrip && trips.length === 0) {
    return (
      <div style={{ fontFamily: F }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827' }}>My Trips</div>
          <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 2 }}>Your assigned trips</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 12, padding: 40, textAlign: 'center', color: '#9ca3af' }}>
          No trips assigned yet
        </div>
      </div>
    )
  }

  // ── List of scheduled (upcoming) trips — show before any is active ──
  if (!activeTrip) {
    return (
      <div style={{ fontFamily: F }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827' }}>My Trips</div>
          <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 2 }}>Your assigned trips</div>
        </div>

        {trips.map(trip => (
          <div key={trip.id} style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 12, padding: '18px 20px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#2563eb', fontSize: '0.92rem' }}>
                    TRP{String(trip.id).padStart(3, '0')}
                  </span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 10px', borderRadius: 999, background: '#fff7ed', color: '#d97706', border: '1px solid #fed7aa' }}>
                    UPCOMING
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.83rem', color: '#374151', marginBottom: 6 }}>
                  <MapPin size={12} color="#9ca3af" />
                  <span style={{ fontWeight: 600 }}>{trip.start_location || '—'}</span>
                  <ArrowRight size={12} color="#9ca3af" />
                  <span style={{ fontWeight: 600 }}>{trip.end_location || '—'}</span>
                </div>
                {trip.vehicle && (
                  <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginBottom: 4 }}>
                    {trip.vehicle.registration_no} · {trip.vehicle.make} {trip.vehicle.model}
                  </div>
                )}
                {trip.reporting_time && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: '#6b7280' }}>
                    <Clock size={12} />
                    Reporting: {new Date(trip.reporting_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
                {trip.cargo_type && (
                  <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 3 }}>Cargo: {trip.cargo_type}{trip.cargo_weight ? ` · ${trip.cargo_weight} kg` : ''}</div>
                )}
              </div>
              <button onClick={() => openStartPopup(trip)} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px',
                background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8,
                fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer',
              }}>
                <Play size={14} /> Start Trip
              </button>
            </div>
          </div>
        ))}

        {/* Start Trip Popup */}
        {showStartPopup && pendingTrip && (
          <div onClick={() => setShowStartPopup(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>Start Trip</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>TRP{String(pendingTrip.id).padStart(3,'0')} · {pendingTrip.start_location} → {pendingTrip.end_location}</div>
                </div>
                <button onClick={() => setShowStartPopup(false)} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={lbl}>Start Odometer (KM) *</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input style={{ ...inp, borderColor: error && !startOdom ? '#ef4444' : '#e5e7eb' }}
                      type="number" value={startOdom} onChange={e => { setStartOdom(e.target.value); setError('') }}
                      placeholder="Enter current odometer reading" />
                    <span style={{ fontSize: '0.78rem', color: '#9ca3af', flexShrink: 0 }}>km</span>
                  </div>
                </div>
                <PhotoBox value={startOdomPic} onChange={img(setStartOdomPic)} label="Upload Odometer Photo" />
                <PhotoBox value={vehicleBefore} onChange={img(setVehicleBefore)} label="Upload Vehicle Photo (Before)" />
                {error && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: '0.78rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Info size={13} /> {error}
                  </div>
                )}
                <button onClick={handleConfirmStart} disabled={saving} style={{
                  width: '100%', padding: '12px', border: 'none', borderRadius: 8,
                  background: '#16a34a', color: '#fff', fontSize: '0.92rem', fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <Play size={16} /> {saving ? 'Starting…' : 'Confirm Start'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Active / Ongoing trip — show the 4-column workflow ──
  const trip = activeTrip
  const isOngoing = trip.status === 'in_progress'

  return (
    <div style={{ fontFamily: F }}>

      {/* Trip info banner */}
      <div style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 10, padding: '14px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.95rem', color: '#111827' }}>
            TRP{String(trip.id).padStart(3,'0')}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.83rem', color: '#374151' }}>
            <MapPin size={13} color="#9ca3af" />
            <span style={{ fontWeight: 600 }}>{trip.start_location || '—'}</span>
            <ArrowRight size={13} color="#9ca3af" />
            <span style={{ fontWeight: 600 }}>{trip.end_location || '—'}</span>
          </div>
          {trip.vehicle && (
            <>
              <div style={{ width: 1, height: 34, background: '#e5e7eb' }} />
              <div>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>Vehicle</div>
                <div style={{ fontSize: '0.83rem', fontWeight: 700, color: '#111827' }}>{trip.vehicle.registration_no}</div>
                <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{trip.vehicle.make}</div>
              </div>
            </>
          )}
          {trip.cargo_type && (
            <>
              <div style={{ width: 1, height: 34, background: '#e5e7eb' }} />
              <div>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>Load / Cargo</div>
                <div style={{ fontSize: '0.83rem', fontWeight: 700, color: '#111827' }}>{trip.cargo_type}</div>
              </div>
            </>
          )}
          <div style={{ marginLeft: 'auto' }}>
            <span style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 6, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700 }}>
              IN PROGRESS
            </span>
          </div>
        </div>
      </div>

      {/* Progress steps */}
      <div style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 10, padding: '16px 24px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {[
          { n: 1, label: 'Start Trip',   color: '#16a34a', done: true },
          { n: 2, label: 'Fuel Charges', color: '#16a34a', done: false, sub: 'Update if used' },
          { n: 3, label: 'Toll Charges', color: '#7c3aed', done: false, sub: 'Update if used' },
          { n: 4, label: 'End Trip',     color: '#f97316', done: false },
        ].map((s, i) => (
          <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < 3 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: s.done ? s.color : '#f3f4f6', border: `2px solid ${s.done ? s.color : '#e5e7eb'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {s.done ? <CheckCircle2 size={16} color="#fff" /> : <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#9ca3af' }}>{s.n}</span>}
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: s.done ? s.color : '#9ca3af', whiteSpace: 'nowrap' }}>{s.label}</span>
              {s.sub && <span style={{ fontSize: '0.66rem', color: '#9ca3af' }}>{s.sub}</span>}
            </div>
            {i < 3 && <div style={{ flex: 1, height: 2, background: '#e5e7eb', margin: '0 8px', marginBottom: 24 }} />}
          </div>
        ))}
      </div>

      {/* 4-col form — cols 2-4 only active when ongoing */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>

        {/* COL 1: Start Trip — already done */}
        <div style={col}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 12, borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#f0fdf4', border: '2px solid #16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={14} color="#16a34a" />
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#16a34a' }}>Start Trip Details</span>
          </div>
          <div>
            <label style={lbl}>Start Odometer</label>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#111827', fontFamily: 'monospace' }}>
              {trip.start_odometer != null ? `${trip.start_odometer} km` : '—'}
            </div>
          </div>
          <div>
            <label style={lbl}>Started At</label>
            <div style={{ fontSize: '0.82rem', color: '#374151' }}>
              {trip.start_time ? new Date(trip.start_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
            </div>
          </div>
          {trip.start_odometer_photo && (
            <div>
              <label style={lbl}>Odometer Photo</label>
              <img src={trip.start_odometer_photo} alt="" style={{ width: '100%', borderRadius: 6, border: '1px solid #e5e7eb' }} />
            </div>
          )}
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px', fontSize: '0.78rem', color: '#16a34a', fontWeight: 600, textAlign: 'center' }}>
            ✓ Trip Started
          </div>
        </div>

        {/* COL 2: Fuel Charges */}
        <div style={{ ...col, opacity: isOngoing ? 1 : 0.5, pointerEvents: isOngoing ? 'auto' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 12, borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#f0fdf4', border: '2px solid #16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a' }}>2</span>
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#16a34a' }}>Fuel Charges</span>
          </div>
          <div><label style={lbl}>Fuel Station</label><input style={inp} value={fuelStation} onChange={e => setFuelStation(e.target.value)} placeholder="Enter fuel station name" /></div>
          <div><label style={lbl}>Liters (L)</label><input style={inp} type="number" step="0.1" value={fuelLiters} onChange={e => setFuelLiters(e.target.value)} placeholder="Enter liters" /></div>
          <div><label style={lbl}>Amount (₹)</label><input style={inp} type="number" value={fuelAmount} onChange={e => setFuelAmount(e.target.value)} placeholder="Enter amount" /></div>
          <ReceiptBox value={fuelReceipt} onChange={img(setFuelReceipt)} label="Receipt Photo" />
          <div><label style={lbl}>Other Charges (Optional)</label><input style={inp} value={otherCharge} onChange={e => setOtherCharge(e.target.value)} placeholder="Enter other charges" /></div>
        </div>

        {/* COL 3: Toll Charges */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, opacity: isOngoing ? 1 : 0.5, pointerEvents: isOngoing ? 'auto' : 'none' }}>
          <div style={col}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 12, borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#f5f3ff', border: '2px solid #7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7c3aed' }}>3</span>
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#7c3aed' }}>Toll Charges</span>
            </div>
            <div><label style={lbl}>Toll Plaza / Location</label><input style={inp} value={tollLocation} onChange={e => setTollLocation(e.target.value)} placeholder="Enter toll plaza / location" /></div>
            <div><label style={lbl}>Amount (₹)</label><input style={inp} type="number" value={tollAmount} onChange={e => setTollAmount(e.target.value)} placeholder="Enter amount" /></div>
            <ReceiptBox value={tollReceipt} onChange={img(setTollReceipt)} label="Receipt Photo" />
          </div>
          <div style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>Total Charges (₹)</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', fontFamily: 'monospace' }}>
              {totalCharges > 0 ? `₹${totalCharges.toLocaleString('en-IN')}` : '—'}
            </span>
          </div>
        </div>

        {/* COL 4: End Trip */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, opacity: isOngoing ? 1 : 0.5, pointerEvents: isOngoing ? 'auto' : 'none' }}>
          <div style={col}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 12, borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff7ed', border: '2px solid #f97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f97316' }}>4</span>
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f97316' }}>End Trip Details</span>
            </div>
            <div>
              <label style={lbl}>End Odometer (KM)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input style={{ ...inp, borderColor: error && !endOdom ? '#ef4444' : '#e5e7eb' }}
                  type="number" value={endOdom} onChange={e => { setEndOdom(e.target.value); setError('') }}
                  placeholder="Enter end odometer" />
                <span style={{ fontSize: '0.78rem', color: '#9ca3af', flexShrink: 0 }}>km</span>
              </div>
              {endOdom && trip.start_odometer && (
                <div style={{ marginTop: 5, fontSize: '0.76rem', color: '#2563eb', fontWeight: 600 }}>
                  Distance: {Math.max(0, parseFloat(endOdom) - parseFloat(trip.start_odometer)).toFixed(0)} km
                </div>
              )}
            </div>
            <PhotoBox value={endOdomPic}   onChange={img(setEndOdomPic)}   label="Odometer Photo (At End)" />
            <PhotoBox value={vehicleAfter} onChange={img(setVehicleAfter)} label="Vehicle Photo (After)" />
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: '0.78rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Info size={13} /> {error}
            </div>
          )}

          <button onClick={handleComplete} disabled={saving || !isOngoing} style={{
            width: '100%', padding: '14px', border: 'none', borderRadius: 8,
            background: isOngoing ? '#f97316' : '#e5e7eb', color: isOngoing ? '#fff' : '#9ca3af',
            fontSize: '0.92rem', fontWeight: 700, cursor: isOngoing ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: isOngoing ? '0 4px 14px rgba(249,115,22,0.35)' : 'none',
          }}>
            <Square size={17} /> {saving ? 'Completing…' : 'Complete Trip'}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.79rem', color: '#0369a1' }}>
        <Info size={14} style={{ flexShrink: 0 }} />
        Note: Please update all details and upload required photos before completing the trip.
      </div>
    </div>
  )
}