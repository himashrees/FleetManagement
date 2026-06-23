import { useState, useEffect } from 'react'
import { Plus, Play, Square, RefreshCw, X, MapPin, Clock, Truck, Fuel, Receipt, Upload, CheckCircle2, User, Phone } from 'lucide-react'
import { tripAPI, vehicleAPI, driverAPI } from '../services/api'
import { useToast } from '../context/ToastContext'

const STATUS_BADGE = { planned: 'badge-gray', in_progress: 'badge-blue', completed: 'badge-green', cancelled: 'badge-red' }
const EMPTY = {
  vehicle_id: '', driver_id: '', start_location: '', end_location: '',
  reporting_time: '', purpose: '', notes: '',
  customer_name: '', customer_phone: '', pickup_address: '',
}

const END_EMPTY = {
  end_location:      '',
  end_odometer:       '',
  fuel_filled:        null,   // true | false | null (not chosen yet)
  fuel_used:          '',
  fuel_cost:          '',
  fuel_station:       '',
  toll_charges:       '',
  toll_receipt_url:   '',
  fuel_receipt_url:   '',
  notes:              '',
}

// Converts a selected file to base64 for storage, with a size guard
function fileToBase64(file, maxMB, onDone, onError) {
  if (file.size > maxMB * 1024 * 1024) { onError(`File must be under ${maxMB}MB`); return }
  const reader = new FileReader()
  reader.onloadend = () => onDone(reader.result)
  reader.readAsDataURL(file)
}

export default function Trips() {
  const [trips, setTrips]       = useState([])
  const [vehicles, setVehicles] = useState([])
  const [drivers, setDrivers]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [endForm, setEndForm]   = useState(END_EMPTY)
  const [saving, setSaving]     = useState(false)
  const [autoDriver, setAutoDriver] = useState(null)
  const toast = useToast()

  const load = () => {
    setLoading(true)
    Promise.all([tripAPI.getAll(), vehicleAPI.getAll({ status: 'active' }), driverAPI.getAll()])
      .then(([t, v, d]) => {
        setTrips(t.data.data || [])
        setVehicles(v.data.data || [])
        setDrivers(d.data.data || [])
      })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  // When vehicle selected → auto fill driver only (odometer is entered by the driver, not here)
  const handleVehicleChange = (e) => {
    const vid = e.target.value
    const assigned = drivers.find(d => String(d.assigned_vehicle_id) === String(vid))
    setAutoDriver(assigned || null)
    setForm(p => ({
      ...p,
      vehicle_id: vid,
      driver_id:  assigned ? String(assigned.id) : '',
    }))
  }

  const handleStart = async () => {
    if (!form.vehicle_id) { toast.error('Select a vehicle'); return }
    if (!form.driver_id)  { toast.error('Select a driver');  return }
    setSaving(true)
    try {
      await tripAPI.startTrip(form)
      toast.success('Trip started')
      setModal(null)
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to start') }
    finally { setSaving(false) }
  }

  const handleEnd = async () => {
    if (!endForm.end_odometer) { toast.error('Enter end odometer'); return }
    if (endForm.fuel_filled === null) { toast.error('Select whether fuel was filled'); return }
    if (endForm.fuel_filled) {
      if (!endForm.fuel_used) { toast.error('Enter fuel quantity'); return }
      if (!endForm.fuel_cost) { toast.error('Enter fuel cost'); return }
    }
    setSaving(true)
    try {
      await tripAPI.endTrip(selected.id, endForm)
      toast.success('Trip completed successfully')
      setModal(null)
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to complete trip') }
    finally { setSaving(false) }
  }

  const f  = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const ef = k => e => setEndForm(p => ({ ...p, [k]: e.target.value }))

  const handleTollReceipt = (e) => {
    const file = e.target.files[0]
    if (!file) return
    fileToBase64(file, 3,
      (b64) => setEndForm(p => ({ ...p, toll_receipt_url: b64 })),
      (msg) => toast.error(msg))
  }

  const handleFuelReceipt = (e) => {
    const file = e.target.files[0]
    if (!file) return
    fileToBase64(file, 3,
      (b64) => setEndForm(p => ({ ...p, fuel_receipt_url: b64 })),
      (msg) => toast.error(msg))
  }

  const getVehicle = id => vehicles.find(v => String(v.id) === String(id))
  const getDriver  = id => drivers.find(d => String(d.id) === String(id))

  const openStart = () => {
    setForm(EMPTY)
    setAutoDriver(null)
    setModal('start')
  }

  const openComplete = (trip) => {
    setSelected(trip)
    setEndForm({ ...END_EMPTY, end_location: trip.end_location || '' })
    setModal('end')
  }

  const distance = endForm.end_odometer && selected?.start_odometer
    ? (parseFloat(endForm.end_odometer) - parseFloat(selected.start_odometer)).toFixed(1)
    : null

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Trip <span>Management</span></h1>
          <p className="page-sub">{trips.length} total trips</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-icon" onClick={load}><RefreshCw size={14} /></button>
          <button className="btn btn-primary" onClick={openStart}><Play size={14} /> START TRIP</button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Vehicle</th><th>Driver</th>
              <th>From</th><th>To</th><th>Start Time</th>
              <th>Distance</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading...</td></tr>
            ) : trips.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No trips found. Start one!</td></tr>
            ) : trips.map(t => {
              const driver = getDriver(t.driver_id)
              return (
                <tr key={t.id}>
                  <td><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: '0.8rem' }}>#{t.id}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Truck size={12} color="#6b7280" />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{t.vehicle?.registration_no || '—'}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.84rem' }}>
                      {driver?.user?.name || (driver ? `Driver #${driver.id}` : `#${t.driver_id}`)}
                    </span>
                  </td>
                  <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={11} color="#9ca3af" />{t.start_location || '—'}
                    </div>
                  </td>
                  <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={11} color="#2563eb" />{t.end_location || '—'}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} color="#9ca3af" />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#6b7280' }}>
                        {t.start_time ? new Date(t.start_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                      {t.distance_km ? `${parseFloat(t.distance_km).toFixed(1)} km` : '—'}
                    </span>
                  </td>
                  <td><span className={`badge ${STATUS_BADGE[t.status] || 'badge-gray'}`}>{t.status?.replace('_', ' ')}</span></td>
                  <td>
                    {t.status === 'in_progress' && (
                      <button className="btn btn-sm btn-ghost" onClick={() => openComplete(t)}>
                        <Square size={11} /> COMPLETE
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Start Trip Modal */}
      {modal === 'start' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title"><Play size={14} /> START NEW TRIP</div>
              <button className="btn-icon" onClick={() => setModal(null)}><X size={14} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Step 1 — Select Vehicle *</label>
                <select className="input" value={form.vehicle_id} onChange={handleVehicleChange}>
                  <option value="">Choose a vehicle...</option>
                  {vehicles.map(v => {
                    const hasDriver = drivers.find(d => String(d.assigned_vehicle_id) === String(v.id))
                    return (
                      <option key={v.id} value={v.id}>
                        {v.registration_no} — {v.make} {v.model}
                        {hasDriver ? ` ✓ (${hasDriver.user?.name || 'Driver assigned'})` : ' (no driver assigned)'}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Step 2 — Driver *</label>
                {autoDriver ? (
                  <div style={{ padding: '12px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, background: '#16a34a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: '#fff', fontSize: 14 }}>✓</span>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#15803d' }}>
                        {autoDriver.user?.name || `Driver #${autoDriver.id}`}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#166534' }}>
                        Auto-assigned · License: {autoDriver.license_number}
                      </div>
                    </div>
                    <button style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}
                      onClick={() => { setAutoDriver(null); setForm(p => ({ ...p, driver_id: '' })) }}>
                      Change
                    </button>
                  </div>
                ) : (
                  <select className="input" value={form.driver_id} onChange={f('driver_id')}>
                    <option value="">Select driver manually...</option>
                    {drivers.filter(d => d.status === 'available').map(d => (
                      <option key={d.id} value={d.id}>
                        {d.user?.name || `Driver #${d.id}`} — {d.license_number}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Reporting Time</label>
                <input className="input" type="datetime-local" value={form.reporting_time} onChange={f('reporting_time')} />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Start Location</label>
                  <input className="input" value={form.start_location} onChange={f('start_location')} placeholder="e.g. Bengaluru Warehouse" />
                </div>
                <div className="form-group">
                  <label className="form-label">Destination</label>
                  <input className="input" value={form.end_location} onChange={f('end_location')} placeholder="e.g. Mysuru Depot" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Purpose</label>
                <input className="input" value={form.purpose} onChange={f('purpose')} placeholder="Delivery / Transport / Pickup..." />
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="input" value={form.notes} onChange={f('notes')} rows={2} />
              </div>

              <div className="modal-section-title">Customer Details (Optional)</div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <User size={13} color="var(--text-muted)" /> Customer Name
                  </label>
                  <input className="input" value={form.customer_name} onChange={f('customer_name')} placeholder="e.g. Ramesh Traders" />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Phone size={13} color="var(--text-muted)" /> Customer Phone
                  </label>
                  <input className="input" type="tel" value={form.customer_phone} onChange={f('customer_phone')} placeholder="e.g. 9876543210" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={13} color="var(--text-muted)" /> Pickup Address
                </label>
                <input className="input" value={form.pickup_address} onChange={f('pickup_address')} placeholder="Exact pickup address for the customer" />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>CANCEL</button>
              <button className="btn btn-primary" onClick={handleStart} disabled={saving}>
                <Play size={13} />{saving ? 'STARTING...' : 'START TRIP'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Complete Trip Modal — matches Driver Workflow spec exactly ── */}
      {modal === 'end' && selected && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title"><CheckCircle2 size={14} /> COMPLETE TRIP #{selected.id}</div>
              <button className="btn-icon" onClick={() => setModal(null)}><X size={14} /></button>
            </div>

            {/* Trip summary */}
            <div style={{ padding: '12px 14px', background: '#f9fafb', borderRadius: 8, marginBottom: 18, fontSize: '0.82rem', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <span style={{ color: '#9ca3af' }}>Vehicle</span><br />
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontWeight: 600 }}>{selected.vehicle?.registration_no}</span>
              </div>
              <div>
                <span style={{ color: '#9ca3af' }}>Driver</span><br />
                <span style={{ fontWeight: 600 }}>{getDriver(selected.driver_id)?.user?.name || `#${selected.driver_id}`}</span>
              </div>
              <div>
                <span style={{ color: '#9ca3af' }}>From</span><br />
                <span>{selected.start_location || '—'}</span>
              </div>
              <div>
                <span style={{ color: '#9ca3af' }}>Start Odo</span><br />
                <span style={{ fontFamily: 'var(--font-mono)' }}>{selected.start_odometer} km</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* End Odometer */}
              <div className="form-group">
                <label className="form-label">End Odometer (km) *</label>
                <input className="input" type="number" value={endForm.end_odometer} onChange={ef('end_odometer')} placeholder="e.g. 45680" />
                {distance && (
                  <p style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: 4 }}>
                    Distance travelled: {distance} km
                  </p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">End Location</label>
                <input className="input" value={endForm.end_location} onChange={ef('end_location')} placeholder="Trip destination" />
              </div>

              <div className="divider" style={{ borderTop: '1px solid var(--border)', margin: '2px 0' }} />

              {/* Fuel Filled? */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Fuel size={13} color="var(--brand)" /> Fuel Filled?
                </label>
                <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => setEndForm(p => ({ ...p, fuel_filled: true }))}
                    style={{
                      flex: 1, padding: '10px 16px', borderRadius: 'var(--radius)', cursor: 'pointer',
                      border: `1.5px solid ${endForm.fuel_filled === true ? 'var(--green)' : 'var(--border)'}`,
                      background: endForm.fuel_filled === true ? '#f0fdf4' : 'white',
                      color: endForm.fuel_filled === true ? '#15803d' : 'var(--text-secondary)',
                      fontWeight: 600, fontSize: '0.85rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    {endForm.fuel_filled === true && <CheckCircle2 size={14} />} Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEndForm(p => ({
                      ...p, fuel_filled: false, fuel_used: '', fuel_cost: '', fuel_station: '', fuel_receipt_url: '',
                    }))}
                    style={{
                      flex: 1, padding: '10px 16px', borderRadius: 'var(--radius)', cursor: 'pointer',
                      border: `1.5px solid ${endForm.fuel_filled === false ? 'var(--text-secondary)' : 'var(--border)'}`,
                      background: endForm.fuel_filled === false ? '#f3f4f6' : 'white',
                      color: endForm.fuel_filled === false ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: 600, fontSize: '0.85rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    {endForm.fuel_filled === false && <CheckCircle2 size={14} />} No
                  </button>
                </div>
              </div>

              {/* Fuel details — only shown if Yes */}
              {endForm.fuel_filled === true && (
                <div style={{ background: 'var(--bg-canvas)', borderRadius: 'var(--radius)', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Fuel Quantity (L) *</label>
                      <input className="input" type="number" step="0.1" value={endForm.fuel_used} onChange={ef('fuel_used')} placeholder="e.g. 35.5" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Fuel Cost (₹) *</label>
                      <input className="input" type="number" step="0.01" value={endForm.fuel_cost} onChange={ef('fuel_cost')} placeholder="e.g. 3200" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fuel Station</label>
                    <input className="input" value={endForm.fuel_station} onChange={ef('fuel_station')} placeholder="e.g. HP Petrol Pump, Mysuru Road" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Upload Fuel Receipt</label>
                    <label style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      border: '1.5px dashed var(--border-dark)', borderRadius: 'var(--radius)',
                      padding: '12px', cursor: 'pointer', fontSize: '0.84rem', color: 'var(--text-muted)',
                      background: endForm.fuel_receipt_url ? '#f0fdf4' : 'white',
                    }}>
                      {endForm.fuel_receipt_url ? (
                        <><CheckCircle2 size={14} color="var(--green)" /> <span style={{ color: '#15803d' }}>Fuel receipt attached</span></>
                      ) : (
                        <><Upload size={14} /> Click to upload fuel receipt (optional)</>
                      )}
                      <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleFuelReceipt} />
                    </label>
                  </div>
                </div>
              )}

              <div className="divider" style={{ borderTop: '1px solid var(--border)', margin: '2px 0' }} />

              {/* Toll charges */}
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Receipt size={13} color="var(--amber)" /> Toll Charges (₹)
                  </label>
                  <input className="input" type="number" step="0.01" value={endForm.toll_charges} onChange={ef('toll_charges')} placeholder="e.g. 150" />
                </div>
                <div className="form-group">
                  <label className="form-label">Upload Toll Receipt</label>
                  <label style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    border: '1.5px dashed var(--border-dark)', borderRadius: 'var(--radius)',
                    padding: '10px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-muted)',
                    background: endForm.toll_receipt_url ? '#f0fdf4' : 'white', height: '100%',
                  }}>
                    {endForm.toll_receipt_url ? (
                      <><CheckCircle2 size={14} color="var(--green)" /> <span style={{ color: '#15803d' }}>Attached</span></>
                    ) : (
                      <><Upload size={13} /> Optional</>
                    )}
                    <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleTollReceipt} />
                  </label>
                </div>
              </div>

              {/* Remarks */}
              <div className="form-group">
                <label className="form-label">Remarks</label>
                <textarea className="input" value={endForm.notes} onChange={ef('notes')} rows={2} placeholder="Any additional notes about this trip..." />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>CANCEL</button>
              <button className="btn btn-primary" onClick={handleEnd} disabled={saving}>
                <CheckCircle2 size={13} />{saving ? 'COMPLETING...' : 'COMPLETE TRIP'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}