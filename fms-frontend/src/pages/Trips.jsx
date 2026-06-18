import { useState, useEffect } from 'react'
import { Plus, Play, Square, X, RefreshCw, MapPin, Clock, Truck, Ban, Pencil } from 'lucide-react'
import { tripAPI, vehicleAPI, driverAPI } from '../services/api'
import { useToast } from '../context/ToastContext'

const STATUS_BADGE = {
  planned:     'badge-slate',
  in_progress: 'badge-blue',
  completed:   'badge-green',
  cancelled:   'badge-red',
}

const EMPTY_FORM = {
  vehicle_id: '', driver_id: '', start_location: '', end_location: '',
  start_odometer: '', purpose: '', notes: '',
}

export default function Trips() {
  const [trips,    setTrips]    = useState([])
  const [vehicles, setVehicles] = useState([])
  const [drivers,  setDrivers]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(null)   // 'schedule' | 'edit' | 'start' | 'end' | 'cancel'
  const [selected, setSelected] = useState(null)
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [endForm,  setEndForm]  = useState({ end_odometer: '', fuel_used: '', end_location: '' })
  const [saving,   setSaving]   = useState(false)
  const [autoDriver, setAutoDriver] = useState(null)
  const toast = useToast()

  /* ── load ── */
  const load = () => {
    setLoading(true)
    Promise.all([
      tripAPI.getAll(),
      vehicleAPI.getAll({ status: 'active' }),
      driverAPI.getAll(),
    ])
      .then(([t, v, d]) => {
        setTrips(t.data.data || [])
        setVehicles(v.data.data || [])
        setDrivers(d.data.data || [])
      })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  /* ── vehicle pick → auto-fill driver + odometer ── */
  const handleVehicleChange = (e) => {
    const vid = e.target.value
    const vehicle  = vehicles.find(v => String(v.id) === String(vid))
    const assigned = drivers.find(d =>
      String(d.assigned_vehicle_id) === String(vid) && d.status === 'available'
    )
    setAutoDriver(assigned || null)
    setForm(p => ({
      ...p,
      vehicle_id:     vid,
      driver_id:      assigned ? String(assigned.id) : '',
      start_odometer: vehicle?.odometer_km ? String(vehicle.odometer_km) : '',
    }))
  }

  const f  = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const ef = k => e => setEndForm(p => ({ ...p, [k]: e.target.value }))

  const getVehicle = id => vehicles.find(v => String(v.id) === String(id))
  const getDriver  = id => drivers.find(d => String(d.id) === String(id))

  /* ── SCHEDULE (create planned trip) ── */
  const handleSchedule = async () => {
    if (!form.vehicle_id) { toast.error('Select a vehicle'); return }
    if (!form.driver_id)  { toast.error('Select a driver');  return }
    setSaving(true)
    try {
      await tripAPI.create(form)
      toast.success('Trip scheduled — driver has been notified')
      setModal(null); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to schedule') }
    finally { setSaving(false) }
  }

  /* ── EDIT planned trip ── */
  const handleUpdate = async () => {
    setSaving(true)
    try {
      await tripAPI.update(selected.id, form)
      toast.success('Trip updated')
      setModal(null); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update') }
    finally { setSaving(false) }
  }

  /* ── START planned trip ── */
  const handleStart = async () => {
    setSaving(true)
    try {
      await tripAPI.startTrip(selected.id, { start_odometer: form.start_odometer })
      toast.success('Trip started')
      setModal(null); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to start') }
    finally { setSaving(false) }
  }

  /* ── END in-progress trip ── */
  const handleEnd = async () => {
    if (!endForm.end_odometer) { toast.error('Enter end odometer'); return }
    setSaving(true)
    try {
      await tripAPI.endTrip(selected.id, endForm)
      toast.success('Trip completed')
      setModal(null); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to end') }
    finally { setSaving(false) }
  }

  /* ── CANCEL trip ── */
  const handleCancel = async () => {
    setSaving(true)
    try {
      await tripAPI.cancelTrip(selected.id)
      toast.success('Trip cancelled')
      setModal(null); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to cancel') }
    finally { setSaving(false) }
  }

  const openSchedule = () => {
    setForm(EMPTY_FORM); setAutoDriver(null); setModal('schedule')
  }

  /* ── available drivers count ── */
  const availableDrivers = drivers.filter(d => d.status === 'available')
  const onTripCount      = drivers.filter(d => d.status === 'on_trip').length

  return (
    <div className="page-enter">

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Trip <span className="accent">Management</span></h1>
          <p className="page-sub">{trips.length} total trips · {onTripCount} currently on road</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-icon" onClick={load}><RefreshCw size={14} /></button>
          <button className="btn btn-primary" onClick={openSchedule}>
            <Plus size={14} /> SCHEDULE TRIP
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="table-container">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Vehicle</th><th>Driver</th>
                <th>From</th><th>To</th><th>Scheduled / Started</th>
                <th>Distance</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading...</td></tr>
              ) : trips.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No trips yet. Schedule one!</td></tr>
              ) : trips.map(t => {
                const driver = getDriver(t.driver_id)
                return (
                  <tr key={t.id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: '0.8rem' }}>#{t.id}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Truck size={12} color="#6b7280" />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                          {t.vehicle?.registration_no || '—'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.84rem' }}>
                        {driver?.user?.name || (driver ? `Driver #${driver.id}` : `#${t.driver_id}`)}
                      </span>
                    </td>
                    <td style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={11} color="#9ca3af" />{t.start_location || '—'}
                      </div>
                    </td>
                    <td style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={11} color="#2563eb" />{t.end_location || '—'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} color="#9ca3af" />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#6b7280' }}>
                          {(t.start_time || t.createdAt)
                            ? new Date(t.start_time || t.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                        {t.distance_km ? `${parseFloat(t.distance_km).toFixed(1)} km` : '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[t.status] || 'badge-slate'}`}>
                        {t.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }}>
                        {/* Edit — only for planned */}
                        {t.status === 'planned' && (
                          <button className="btn-icon" title="Edit" onClick={() => {
                            setSelected(t)
                            setForm({
                              vehicle_id: t.vehicle_id, driver_id: t.driver_id,
                              start_location: t.start_location || '', end_location: t.end_location || '',
                              start_odometer: t.start_odometer || '', purpose: t.purpose || '', notes: t.notes || '',
                            })
                            setModal('edit')
                          }}>
                            <Pencil size={13} />
                          </button>
                        )}
                        {/* Start — only for planned */}
                        {t.status === 'planned' && (
                          <button className="btn-icon" title="Start trip" style={{ color: '#16a34a' }} onClick={() => {
                            setSelected(t)
                            setForm(p => ({ ...p, start_odometer: t.start_odometer || '' }))
                            setModal('start')
                          }}>
                            <Play size={13} />
                          </button>
                        )}
                        {/* End — only for in_progress */}
                        {t.status === 'in_progress' && (
                          <button className="btn-icon" title="End trip" style={{ color: '#2563eb' }} onClick={() => {
                            setSelected(t)
                            setEndForm({ end_odometer: '', fuel_used: '', end_location: t.end_location || '' })
                            setModal('end')
                          }}>
                            <Square size={13} />
                          </button>
                        )}
                        {/* Cancel — planned or in_progress */}
                        {(t.status === 'planned' || t.status === 'in_progress') && (
                          <button className="btn-icon" title="Cancel trip" style={{ color: '#dc2626' }} onClick={() => {
                            setSelected(t); setModal('cancel')
                          }}>
                            <Ban size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          MODAL: Schedule new trip
      ════════════════════════════════════════════ */}
      {modal === 'schedule' && (
        <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="modal modal-wide">
            <div className="modal-header">
              <h2 className="modal-title"><Plus size={15} /> Schedule New Trip</h2>
              <button className="btn-icon" onClick={() => setModal(null)}><X size={14} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Vehicle */}
              <div className="form-group">
                <label className="form-label">Vehicle *</label>
                <select className="input" value={form.vehicle_id} onChange={handleVehicleChange}>
                  <option value="">Choose a vehicle...</option>
                  {vehicles.map(v => {
                    const hasDriver = drivers.find(d => String(d.assigned_vehicle_id) === String(v.id) && d.status === 'available')
                    return (
                      <option key={v.id} value={v.id}>
                        {v.registration_no} — {v.make} {v.model}
                        {hasDriver ? ` ✓ (${hasDriver.user?.name || 'driver assigned'})` : ' (no available driver)'}
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* Driver */}
              <div className="form-group">
                <label className="form-label">Driver *</label>
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
                  <>
                    <select className="input" value={form.driver_id} onChange={f('driver_id')}>
                      <option value="">Select available driver...</option>
                      {availableDrivers.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.user?.name || `Driver #${d.id}`} — {d.license_number}
                        </option>
                      ))}
                    </select>
                    {availableDrivers.length === 0 && (
                      <p style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: 4 }}>
                        ⚠ No available drivers right now. All are on trip or off duty.
                      </p>
                    )}
                    {onTripCount > 0 && (
                      <p style={{ fontSize: '0.73rem', color: '#9ca3af', marginTop: 4 }}>
                        {onTripCount} driver(s) currently on trip are hidden.
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Locations */}
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">From (Start Location)</label>
                  <input className="input" value={form.start_location} onChange={f('start_location')} placeholder="e.g. Bengaluru Warehouse" />
                </div>
                <div className="form-group">
                  <label className="form-label">To (Destination)</label>
                  <input className="input" value={form.end_location} onChange={f('end_location')} placeholder="e.g. Mysuru Depot" />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Start Odometer (km)</label>
                  <input className="input" type="number" value={form.start_odometer} onChange={f('start_odometer')}
                    placeholder={form.vehicle_id ? `Current: ${getVehicle(form.vehicle_id)?.odometer_km || 0} km` : '0'} />
                </div>
                <div className="form-group">
                  <label className="form-label">Purpose</label>
                  <input className="input" value={form.purpose} onChange={f('purpose')} placeholder="Delivery / Transport / Pickup..." />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="input" value={form.notes} onChange={f('notes')} rows={2} />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSchedule} disabled={saving}>
                <Plus size={13} />{saving ? 'Scheduling...' : 'Schedule Trip'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          MODAL: Edit planned trip
      ════════════════════════════════════════════ */}
      {modal === 'edit' && selected && (
        <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="modal modal-wide">
            <div className="modal-header">
              <h2 className="modal-title"><Pencil size={15} /> Edit Trip #{selected.id}</h2>
              <button className="btn-icon" onClick={() => setModal(null)}><X size={14} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">From</label>
                  <input className="input" value={form.start_location} onChange={f('start_location')} />
                </div>
                <div className="form-group">
                  <label className="form-label">To</label>
                  <input className="input" value={form.end_location} onChange={f('end_location')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Start Odometer (km)</label>
                  <input className="input" type="number" value={form.start_odometer} onChange={f('start_odometer')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Purpose</label>
                  <input className="input" value={form.purpose} onChange={f('purpose')} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="input" value={form.notes} onChange={f('notes')} rows={2} />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpdate} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          MODAL: Start trip confirmation
      ════════════════════════════════════════════ */}
      {modal === 'start' && selected && (
        <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title"><Play size={14} /> Start Trip #{selected.id}</h2>
              <button className="btn-icon" onClick={() => setModal(null)}><X size={14} /></button>
            </div>

            {/* Summary */}
            <div style={{ padding: '12px 14px', background: 'var(--bg-canvas)', borderRadius: 8, marginBottom: 16, fontSize: '0.83rem', display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              <div><span style={{ color: '#9ca3af' }}>Vehicle</span><br />
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontWeight: 600 }}>{selected.vehicle?.registration_no || `#${selected.vehicle_id}`}</span>
              </div>
              <div><span style={{ color: '#9ca3af' }}>Driver</span><br />
                <span style={{ fontWeight: 600 }}>{getDriver(selected.driver_id)?.user?.name || `#${selected.driver_id}`}</span>
              </div>
              <div><span style={{ color: '#9ca3af' }}>Route</span><br />
                <span>{selected.start_location || '—'} → {selected.end_location || '—'}</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Start Odometer (km)</label>
              <input className="input" type="number" value={form.start_odometer}
                onChange={f('start_odometer')}
                placeholder={selected.start_odometer || 'Enter current odometer'} />
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleStart} disabled={saving}
                style={{ background: '#16a34a', borderColor: '#16a34a' }}>
                <Play size={13} />{saving ? 'Starting...' : 'Confirm Start'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          MODAL: End trip
      ════════════════════════════════════════════ */}
      {modal === 'end' && selected && (
        <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title"><Square size={14} /> End Trip #{selected.id}</h2>
              <button className="btn-icon" onClick={() => setModal(null)}><X size={14} /></button>
            </div>

            <div style={{ padding: '12px 14px', background: 'var(--bg-canvas)', borderRadius: 8, marginBottom: 16, fontSize: '0.82rem', display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              <div><span style={{ color: '#9ca3af' }}>Vehicle</span><br />
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontWeight: 600 }}>{selected.vehicle?.registration_no}</span>
              </div>
              <div><span style={{ color: '#9ca3af' }}>Driver</span><br />
                <span style={{ fontWeight: 600 }}>{getDriver(selected.driver_id)?.user?.name || `#${selected.driver_id}`}</span>
              </div>
              <div><span style={{ color: '#9ca3af' }}>Start Odo</span><br />
                <span style={{ fontFamily: 'var(--font-mono)' }}>{selected.start_odometer} km</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">End Location</label>
                <input className="input" value={endForm.end_location} onChange={ef('end_location')} />
              </div>
              <div className="form-group">
                <label className="form-label">End Odometer (km) *</label>
                <input className="input" type="number" value={endForm.end_odometer} onChange={ef('end_odometer')} />
                {endForm.end_odometer && selected.start_odometer && (
                  <p style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                    Distance: {(parseFloat(endForm.end_odometer) - parseFloat(selected.start_odometer)).toFixed(1)} km
                  </p>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Fuel Used (litres)</label>
                <input className="input" type="number" value={endForm.fuel_used} onChange={ef('fuel_used')} />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEnd} disabled={saving}>
                <Square size={13} />{saving ? 'Completing...' : 'Complete Trip'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          MODAL: Cancel confirmation
      ════════════════════════════════════════════ */}
      {modal === 'cancel' && selected && (
        <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: 'var(--red)' }}><Ban size={15} /> Cancel Trip</h2>
              <button className="btn-icon" onClick={() => setModal(null)}><X size={14} /></button>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
              Cancel <strong>Trip #{selected.id}</strong>?
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {selected.start_location} → {selected.end_location}<br />
              Driver: {getDriver(selected.driver_id)?.user?.name || `#${selected.driver_id}`}
            </p>
            {selected.status === 'in_progress' && (
              <div className="notice notice-amber" style={{ marginTop: 12 }}>
                ⚠ This trip is currently in progress. The driver will be marked available.
              </div>
            )}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Keep Trip</button>
              <button className="btn btn-danger" onClick={handleCancel} disabled={saving}>
                {saving ? 'Cancelling...' : 'Yes, Cancel Trip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}