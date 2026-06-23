import { useState, useEffect, useRef } from 'react'
import { Square, RefreshCw, X, MapPin, Clock, Truck, Fuel, Receipt,
         Upload, CheckCircle2, Camera, ArrowRight, Play } from 'lucide-react'
import { tripAPI } from '../services/api'
import { useToast } from '../context/ToastContext'
import { LoadingState, EmptyState, PageHeader } from '../components/Common'

const STATUS_BADGE = {
  planned:     'badge-amber',
  in_progress: 'badge-blue',
  completed:   'badge-green',
  cancelled:   'badge-red',
}

function fileToBase64(file, maxMB, onDone, onError) {
  if (file.size > maxMB * 1024 * 1024) { onError(`File must be under ${maxMB}MB`); return }
  const reader = new FileReader()
  reader.onloadend = () => onDone(reader.result)
  reader.readAsDataURL(file)
}

function OdoPhotoUpload({ label, value, onChange }) {
  const ref = useRef(null)
  return (
    <div>
      <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>{label}</div>
      <div
        onClick={() => ref.current?.click()}
        style={{
          border: '1.5px dashed var(--border-dark)', borderRadius: 8,
          background: value ? '#f0fdf4' : 'var(--bg-canvas)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 6, cursor: 'pointer',
          overflow: 'hidden', minHeight: 100,
        }}
      >
        {value ? (
          <img src={value} alt="odometer" style={{ width: '100%', maxHeight: 140, objectFit: 'contain' }} />
        ) : (
          <>
            <Camera size={22} color="#9ca3af" />
            <span style={{ fontSize: '0.76rem', color: '#9ca3af' }}>Tap to upload photo</span>
          </>
        )}
      </div>
      {value && (
        <div style={{ fontSize: '0.72rem', color: '#16a34a', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          <CheckCircle2 size={11} /> Photo attached
        </div>
      )}
      <input ref={ref} type="file" accept="image/*" capture="environment"
        style={{ display: 'none' }} onChange={onChange} />
    </div>
  )
}

export default function MyTrips() {
  const [trips,   setTrips]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null) // 'start' | 'end'
  const [selected, setSelected] = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [completed, setCompleted] = useState(null) // trip summary after completion

  // Start form
  const [startForm, setStartForm] = useState({ start_odometer: '', start_odometer_photo: '' })
  // End form
  const [endForm, setEndForm] = useState({
    end_location: '', end_odometer: '', end_odometer_photo: '',
    fuel_filled: null, fuel_used: '', fuel_cost: '', fuel_station: '',
    toll_charges: '', toll_receipt_url: '', fuel_receipt_url: '', notes: '',
  })

  const toast = useToast()

  const load = () => {
    setLoading(true)
    tripAPI.getAll()
      .then(r => setTrips((r.data.data || []).filter(t => t.status === 'planned' || t.status === 'in_progress')))
      .catch(() => toast.error('Failed to load trips'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const sf = k => e => setStartForm(p => ({ ...p, [k]: e.target.value }))
  const ef = k => e => setEndForm(p => ({ ...p, [k]: e.target.value }))

  /* ── START TRIP ── */
  const openStart = (trip) => {
    setSelected(trip)
    setStartForm({ start_odometer: trip.start_odometer || '', start_odometer_photo: '' })
    setModal('start')
  }

  const handleStart = async () => {
    if (!startForm.start_odometer) { toast.error('Enter start odometer reading'); return }
    setSaving(true)
    try {
      await tripAPI.startTrip(selected.id, startForm)
      toast.success('Trip started! Odometer updated ✓')
      setModal(null); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to start') }
    finally { setSaving(false) }
  }

  /* ── END TRIP ── */
  const openEnd = (trip) => {
    setSelected(trip)
    setEndForm({
      end_location: trip.end_location || '', end_odometer: '',
      end_odometer_photo: '', fuel_filled: null,
      fuel_used: '', fuel_cost: '', fuel_station: '',
      toll_charges: '', toll_receipt_url: '', fuel_receipt_url: '', notes: '',
    })
    setModal('end')
  }

  const handleEnd = async () => {
    if (!endForm.end_odometer)       { toast.error('Enter end odometer reading'); return }
    if (endForm.fuel_filled === null) { toast.error('Select whether fuel was filled'); return }
    if (endForm.fuel_filled) {
      if (!endForm.fuel_used) { toast.error('Enter fuel quantity'); return }
      if (!endForm.fuel_cost) { toast.error('Enter fuel cost'); return }
    }
    setSaving(true)
    try {
      const res = await tripAPI.endTrip(selected.id, endForm)
      setCompleted({ ...res.data.data, ...endForm })
      setModal('summary')
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to complete') }
    finally { setSaving(false) }
  }

  const distance = endForm.end_odometer && selected?.start_odometer
    ? (parseFloat(endForm.end_odometer) - parseFloat(selected.start_odometer)).toFixed(1)
    : null

  return (
    <div className="page-enter">
      <PageHeader title="My" accent="Trips" sub={`${trips.length} active or planned`}>
        <button className="btn-icon" onClick={load}><RefreshCw size={14} /></button>
      </PageHeader>

      {loading ? <LoadingState label="Loading your trips…" /> :
       trips.length === 0 ? <EmptyState icon="🚚" title="No active trips" sub="Your fleet manager hasn't scheduled a trip yet" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {trips.map(t => (
            <div key={t.id} className="chart-card"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ width: 42, height: 42, background: 'var(--brand-light)', borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={18} color="var(--brand)" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: '0.88rem' }}>
                    {t.vehicle?.registration_no || '—'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.84rem',
                    color: 'var(--text-secondary)', marginTop: 2 }}>
                    <MapPin size={12} color="#9ca3af" /> {t.start_location || '—'}
                    <ArrowRight size={11} color="#9ca3af" />
                    <MapPin size={12} color="#2563eb" /> {t.end_location || '—'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem',
                    color: 'var(--text-muted)', marginTop: 4 }}>
                    <Clock size={11} />
                    {t.trip_date || '—'}
                    {t.scheduled_start_time && ` · ${t.scheduled_start_time}`}
                    {' · '}Start Odo: <strong style={{ fontFamily: 'var(--font-mono)' }}>{t.start_odometer || '—'} km</strong>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={`badge ${STATUS_BADGE[t.status] || 'badge-slate'}`}>
                  {t.status?.replace('_', ' ')}
                </span>
                {t.status === 'planned' && (
                  <button className="btn btn-primary" style={{ fontSize: '0.82rem', padding: '8px 16px' }}
                    onClick={() => openStart(t)}>
                    <Play size={13} /> Start Trip
                  </button>
                )}
                {t.status === 'in_progress' && (
                  <button className="btn btn-primary" style={{ fontSize: '0.82rem', padding: '8px 16px',
                    background: '#16a34a', borderColor: '#16a34a' }}
                    onClick={() => openEnd(t)}>
                    <Square size={13} /> Complete Trip
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════ START TRIP MODAL ════ */}
      {modal === 'start' && selected && (
        <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title"><Play size={14} /> Start Trip #{selected.id}</div>
              <button className="btn-icon" onClick={() => setModal(null)}><X size={14} /></button>
            </div>

            {/* Trip summary */}
            <div style={{ padding: '12px 14px', background: 'var(--bg-canvas)', borderRadius: 8,
              marginBottom: 18, fontSize: '0.82rem', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: '#9ca3af', fontSize: '0.7rem' }}>VEHICLE</div>
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontWeight: 700 }}>
                  {selected.vehicle?.registration_no}
                </div>
              </div>
              <div>
                <div style={{ color: '#9ca3af', fontSize: '0.7rem' }}>ROUTE</div>
                <div>{selected.start_location || '—'} → {selected.end_location || '—'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Odometer reading */}
              <div className="form-group">
                <label className="form-label">Start Odometer Reading (km) *</label>
                <input className="input" type="number" value={startForm.start_odometer}
                  onChange={sf('start_odometer')} placeholder="e.g. 18500" />
                <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 4 }}>
                  This will update the vehicle odometer for admin/manager instantly
                </div>
              </div>

              {/* Odometer photo */}
              <OdoPhotoUpload
                label="📷 Upload Odometer Photo (Recommended)"
                value={startForm.start_odometer_photo}
                onChange={e => {
                  const file = e.target.files[0]
                  if (!file) return
                  fileToBase64(file, 3,
                    b64 => setStartForm(p => ({ ...p, start_odometer_photo: b64 })),
                    msg => toast.error(msg)
                  )
                }}
              />
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleStart} disabled={saving}
                style={{ background: '#16a34a', borderColor: '#16a34a' }}>
                <Play size={13} />{saving ? 'Starting...' : 'Start Trip'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ COMPLETE TRIP MODAL ════ */}
      {modal === 'end' && selected && (
        <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="modal modal-wide">
            <div className="modal-header">
              <div className="modal-title"><CheckCircle2 size={14} /> Complete Trip #{selected.id}</div>
              <button className="btn-icon" onClick={() => setModal(null)}><X size={14} /></button>
            </div>

            <div style={{ padding: '12px 14px', background: 'var(--bg-canvas)', borderRadius: 8,
              marginBottom: 18, fontSize: '0.82rem', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: '#9ca3af', fontSize: '0.7rem' }}>VEHICLE</div>
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontWeight: 700 }}>
                  {selected.vehicle?.registration_no}
                </div>
              </div>
              <div>
                <div style={{ color: '#9ca3af', fontSize: '0.7rem' }}>FROM</div>
                <div>{selected.start_location || '—'}</div>
              </div>
              <div>
                <div style={{ color: '#9ca3af', fontSize: '0.7rem' }}>START ODO</div>
                <div style={{ fontFamily: 'var(--font-mono)' }}>{selected.start_odometer} km</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* End odometer + photo side by side */}
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">End Odometer (km) *</label>
                  <input className="input" type="number" value={endForm.end_odometer}
                    onChange={ef('end_odometer')} placeholder="e.g. 45680" />
                  {distance && (
                    <p style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                      Distance: {distance} km
                    </p>
                  )}
                  <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 4 }}>
                    Vehicle odometer will auto-update for admin
                  </div>
                </div>
                <OdoPhotoUpload
                  label="📷 End Odometer Photo (Recommended)"
                  value={endForm.end_odometer_photo}
                  onChange={e => {
                    const file = e.target.files[0]
                    if (!file) return
                    fileToBase64(file, 3,
                      b64 => setEndForm(p => ({ ...p, end_odometer_photo: b64 })),
                      msg => toast.error(msg)
                    )
                  }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">End Location</label>
                <input className="input" value={endForm.end_location} onChange={ef('end_location')} />
              </div>

              <div style={{ borderTop: '1px solid var(--border)' }} />

              {/* Fuel filled? */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Fuel size={13} color="var(--brand)" /> Fuel Filled?
                </label>
                <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                  {[true, false].map(val => (
                    <button key={String(val)} type="button"
                      onClick={() => setEndForm(p => ({
                        ...p, fuel_filled: val,
                        ...(val === false ? { fuel_used: '', fuel_cost: '', fuel_station: '', fuel_receipt_url: '' } : {})
                      }))}
                      style={{
                        flex: 1, padding: '10px 16px', borderRadius: 'var(--radius)', cursor: 'pointer',
                        border: `1.5px solid ${endForm.fuel_filled === val ? (val ? '#16a34a' : '#6b7280') : 'var(--border)'}`,
                        background: endForm.fuel_filled === val ? (val ? '#f0fdf4' : '#f3f4f6') : 'white',
                        color: endForm.fuel_filled === val ? (val ? '#15803d' : '#374151') : 'var(--text-secondary)',
                        fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: 6,
                      }}>
                      {endForm.fuel_filled === val && <CheckCircle2 size={14} />}
                      {val ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
              </div>

              {endForm.fuel_filled === true && (
                <div style={{ background: 'var(--bg-canvas)', borderRadius: 8, padding: 14,
                  display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Fuel Quantity (L) *</label>
                      <input className="input" type="number" step="0.1" value={endForm.fuel_used}
                        onChange={ef('fuel_used')} placeholder="e.g. 35.5" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Fuel Cost (₹) *</label>
                      <input className="input" type="number" step="0.01" value={endForm.fuel_cost}
                        onChange={ef('fuel_cost')} placeholder="e.g. 3200" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fuel Station</label>
                    <input className="input" value={endForm.fuel_station} onChange={ef('fuel_station')}
                      placeholder="e.g. HP Petrol Pump, Mysuru" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Upload Fuel Receipt</label>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      border: '1.5px dashed var(--border-dark)', borderRadius: 8, padding: '12px',
                      cursor: 'pointer', fontSize: '0.84rem', color: 'var(--text-muted)',
                      background: endForm.fuel_receipt_url ? '#f0fdf4' : 'white' }}>
                      {endForm.fuel_receipt_url
                        ? <><CheckCircle2 size={14} color="#16a34a" /> <span style={{ color: '#15803d' }}>Receipt attached</span></>
                        : <><Upload size={14} /> Upload fuel receipt (optional)</>}
                      <input type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                        onChange={e => {
                          const file = e.target.files[0]; if (!file) return
                          fileToBase64(file, 3, b64 => setEndForm(p => ({ ...p, fuel_receipt_url: b64 })), msg => toast.error(msg))
                        }} />
                    </label>
                  </div>
                </div>
              )}

              <div style={{ borderTop: '1px solid var(--border)' }} />

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Receipt size={13} color="var(--amber)" /> Toll Charges (₹)
                  </label>
                  <input className="input" type="number" step="0.01" value={endForm.toll_charges}
                    onChange={ef('toll_charges')} placeholder="e.g. 150" />
                </div>
                <div className="form-group">
                  <label className="form-label">Upload Toll Receipt</label>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    border: '1.5px dashed var(--border-dark)', borderRadius: 8, padding: '10px',
                    cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-muted)',
                    background: endForm.toll_receipt_url ? '#f0fdf4' : 'white' }}>
                    {endForm.toll_receipt_url
                      ? <><CheckCircle2 size={14} color="#16a34a" /> Attached</>
                      : <><Upload size={13} /> Optional</>}
                    <input type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                      onChange={e => {
                        const file = e.target.files[0]; if (!file) return
                        fileToBase64(file, 3, b64 => setEndForm(p => ({ ...p, toll_receipt_url: b64 })), msg => toast.error(msg))
                      }} />
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Remarks</label>
                <textarea className="input" value={endForm.notes} onChange={ef('notes')} rows={2}
                  placeholder="Any additional notes..." />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEnd} disabled={saving}>
                <CheckCircle2 size={13} />{saving ? 'Completing...' : 'Complete Trip'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ TRIP SUMMARY MODAL ════ */}
      {modal === 'summary' && completed && (
        <div className="overlay">
          <div className="modal" style={{ maxWidth: 440, textAlign: 'center' }}>
            <div style={{ padding: '24px 0 8px' }}>
              <div style={{ width: 64, height: 64, background: '#dcfce7', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <CheckCircle2 size={32} color="#16a34a" />
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#15803d', marginBottom: 4 }}>
                Trip Completed!
              </div>
              <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>Here's your trip summary</div>
            </div>

            <div style={{ background: 'var(--bg-canvas)', borderRadius: 10, padding: 16, margin: '16px 0',
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, textAlign: 'left' }}>
              {[
                ['Trip ID', `#${selected?.id}`],
                ['Distance', distance ? `${distance} km` : '—'],
                ['End Odometer', `${endForm.end_odometer} km`],
                ['Fuel Quantity', endForm.fuel_filled ? `${endForm.fuel_used} L` : '—'],
                ['Fuel Cost', endForm.fuel_filled ? `₹${endForm.fuel_cost}` : '—'],
                ['Toll', endForm.toll_charges ? `₹${endForm.toll_charges}` : '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.88rem' }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: 16 }}>
              ✓ Vehicle odometer updated for admin/manager
              {endForm.fuel_filled && <><br />✓ Fuel log auto-created in system</>}
            </div>

            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setModal(null)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}