// import { useState, useEffect } from 'react'
// import { Plus, Pencil, Trash2, RefreshCw, Wrench, AlertTriangle } from 'lucide-react'
// import { maintenanceAPI, vehicleAPI } from '../services/api'
// import { useToast } from '../context/ToastContext'
// import Modal from '../components/Modal'
// import { LoadingState, EmptyState, PageHeader } from '../components/Common'

// const STATUS_BADGE = { scheduled: 'badge-amber', in_progress: 'badge-blue', completed: 'badge-green', cancelled: 'badge-red' }

// const EMPTY = { vehicle_id: '', type: 'other', description: '', status: 'scheduled', scheduled_date: '', cost: '', odometer_km: '', workshop_name: '', next_due_date: '' }

// export default function Maintenance() {
//   const [records, setRecords] = useState([])
//   const [upcoming, setUpcoming] = useState([])
//   const [vehicles, setVehicles] = useState([])
//   const [loading, setLoading] = useState(true)
//   const [modal, setModal] = useState(null)
//   const [selected, setSelected] = useState(null)
//   const [form, setForm] = useState(EMPTY)
//   const [saving, setSaving] = useState(false)
//   const toast = useToast()

//   const load = () => {
//     setLoading(true)
//     Promise.all([maintenanceAPI.getAll(), maintenanceAPI.getUpcoming(), vehicleAPI.getAll()])
//       .then(([r, u, v]) => { setRecords(r.data.data); setUpcoming(u.data.data); setVehicles(v.data.data) })
//       .catch(() => toast.error('Failed to load'))
//       .finally(() => setLoading(false))
//   }
//   useEffect(() => { load() }, [])

//   const openAdd = () => { setForm(EMPTY); setModal('add') }
//   const openEdit = (r) => { setForm({ ...r, scheduled_date: r.scheduled_date || '', completed_date: r.completed_date || '', next_due_date: r.next_due_date || '' }); setSelected(r); setModal('edit') }

//   const handleSave = async () => {
//     setSaving(true)
//     try {
//       if (modal === 'add') { await maintenanceAPI.create(form); toast.success('Record added') }
//       else { await maintenanceAPI.update(selected.id, form); toast.success('Updated') }
//       setModal(null); load()
//     } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
//     finally { setSaving(false) }
//   }

//   const handleDelete = async (id) => {
//     if (!confirm('Delete this maintenance record?')) return
//     try { await maintenanceAPI.remove(id); toast.success('Deleted'); load() }
//     catch { toast.error('Delete failed') }
//   }

//   const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

//   return (
//     <div className="page-enter">
//       <PageHeader title="Fleet" accent="Maintenance" sub={`${records.length} total records · ${upcoming.length} upcoming`}>
//         <button className="btn-icon" onClick={load} title="Refresh"><RefreshCw size={14} /></button>
//         <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Schedule</button>
//       </PageHeader>

//       {upcoming.length > 0 && (
//         <div className="notice notice-amber" style={{ flexDirection: 'column', gap: '10px' }}>
//           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
//             <AlertTriangle size={15} /> Upcoming Maintenance ({upcoming.length})
//           </div>
//           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
//             {upcoming.slice(0, 5).map(r => (
//               <div key={r.id} style={{ padding: '7px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
//                 <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontWeight: 600 }}>{r.vehicle?.registration_no || `#${r.vehicle_id}`}</span>
//                 <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>—</span>
//                 <span>{r.type}</span>
//                 <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.76rem' }}>{r.scheduled_date}</span>
//               </div>
//             ))}
//           </div>
//         </div>
//       )}

//       <div className="table-container">
//         <div className="table-scroll">
//           <table>
//             <thead>
//               <tr><th>Vehicle</th><th>Type</th><th>Scheduled</th><th>Status</th><th>Cost</th><th>Workshop</th><th>Next Due</th><th>Actions</th></tr>
//             </thead>
//             <tbody>
//               {loading ? (
//                 <tr><td colSpan={8}><LoadingState label="Loading maintenance records…" /></td></tr>
//               ) : records.length === 0 ? (
//                 <tr><td colSpan={8}><EmptyState icon="🔧" title="No records found" sub="Schedule maintenance to get started" /></td></tr>
//               ) : records.map(r => (
//                 <tr key={r.id}>
//                   <td><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand)', fontSize: '0.82rem', fontWeight: 600 }}>{r.vehicle?.registration_no || `#${r.vehicle_id}`}</span></td>
//                   <td><span className="badge badge-blue"><Wrench size={10} />{r.type}</span></td>
//                   <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.scheduled_date || '—'}</span></td>
//                   <td><span className={`badge ${STATUS_BADGE[r.status] || 'badge-slate'}`}>{r.status?.replace('_', ' ')}</span></td>
//                   <td><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>{r.cost ? `₹${parseFloat(r.cost).toLocaleString()}` : '—'}</span></td>
//                   <td>{r.workshop_name || '—'}</td>
//                   <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.next_due_date || '—'}</span></td>
//                   <td>
//                     <div style={{ display: 'flex', gap: '6px' }}>
//                       <button className="btn-icon" onClick={() => openEdit(r)}><Pencil size={13} /></button>
//                       <button className="btn-icon" onClick={() => handleDelete(r.id)} style={{ color: 'var(--red)' }}><Trash2 size={13} /></button>
//                     </div>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {(modal === 'add' || modal === 'edit') && (
//         <Modal
//           title={modal === 'add' ? 'Schedule Maintenance' : 'Edit Record'}
//           onClose={() => setModal(null)}
//           wide
//           footer={<>
//             <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
//             <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
//           </>}
//         >
//           <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
//             <div className="form-group"><label className="form-label">Vehicle *</label>
//               <select className="input" value={form.vehicle_id} onChange={f('vehicle_id')}>
//                 <option value="">Select vehicle</option>
//                 {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_no} — {v.make} {v.model}</option>)}
//               </select>
//             </div>
//             <div className="form-grid-2">
//               <div className="form-group"><label className="form-label">Type</label>
//                 <select className="input" value={form.type} onChange={f('type')}>
//                   {['oil_change','tire','brake','engine','electrical','body','other'].map(t => <option key={t}>{t}</option>)}
//                 </select>
//               </div>
//               <div className="form-group"><label className="form-label">Status</label>
//                 <select className="input" value={form.status} onChange={f('status')}>
//                   {['scheduled','in_progress','completed','cancelled'].map(t => <option key={t}>{t}</option>)}
//                 </select>
//               </div>
//               <div className="form-group"><label className="form-label">Scheduled Date</label><input className="input" type="date" value={form.scheduled_date} onChange={f('scheduled_date')} /></div>
//               <div className="form-group"><label className="form-label">Completed Date</label><input className="input" type="date" value={form.completed_date || ''} onChange={f('completed_date')} /></div>
//               <div className="form-group"><label className="form-label">Cost (₹)</label><input className="input" type="number" value={form.cost} onChange={f('cost')} /></div>
//               <div className="form-group"><label className="form-label">Odometer (km)</label><input className="input" type="number" value={form.odometer_km} onChange={f('odometer_km')} /></div>
//             </div>
//             <div className="form-group"><label className="form-label">Workshop Name</label><input className="input" value={form.workshop_name} onChange={f('workshop_name')} /></div>
//             <div className="form-group"><label className="form-label">Next Due Date</label><input className="input" type="date" value={form.next_due_date} onChange={f('next_due_date')} /></div>
//             <div className="form-group"><label className="form-label">Description</label><textarea className="input" value={form.description} onChange={f('description')} rows={2} /></div>
//           </div>
//         </Modal>
//       )}
//     </div>
//   )
// }
import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, Wrench, AlertTriangle } from 'lucide-react'
import { maintenanceAPI, vehicleAPI } from '../services/api'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import { LoadingState, EmptyState, PageHeader } from '../components/Common'

const STATUS_BADGE = { scheduled: 'badge-amber', in_progress: 'badge-blue', completed: 'badge-green', cancelled: 'badge-red' }

const EMPTY = {
  vehicle_id: '',
  type: 'other',
  description: '',
  status: 'scheduled',
  scheduled_date: '',
  cost: '',
  odometer_km: '',
  workshop_name: '',
  next_due_date: ''
}

export default function Maintenance() {
  const [records, setRecords] = useState([])
  const [upcoming, setUpcoming] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const load = () => {
    setLoading(true)
    Promise.all([maintenanceAPI.getAll(), maintenanceAPI.getUpcoming(), vehicleAPI.getAll()])
      .then(([r, u, v]) => { setRecords(r.data.data); setUpcoming(u.data.data); setVehicles(v.data.data) })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openAdd = () => { setForm(EMPTY); setModal('add') }
  const openEdit = (r) => { setForm({ ...r, scheduled_date: r.scheduled_date || '', completed_date: r.completed_date || '', next_due_date: r.next_due_date || '' }); setSelected(r); setModal('edit') }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (modal === 'add') { await maintenanceAPI.create(form); toast.success('Record added') }
      else { await maintenanceAPI.update(selected.id, form); toast.success('Updated') }
      setModal(null); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this maintenance record?')) return
    try { await maintenanceAPI.remove(id); toast.success('Deleted'); load() }
    catch { toast.error('Delete failed') }
  }

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="page-enter">
      <PageHeader title="Fleet" accent="Maintenance" sub={`${records.length} total records · ${upcoming.length} upcoming`}>
        <button className="btn-icon" onClick={load} title="Refresh"><RefreshCw size={14} /></button>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Schedule</button>
      </PageHeader>

      {upcoming.length > 0 && (
        <div className="notice notice-amber" style={{ flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
            <AlertTriangle size={15} /> Upcoming Maintenance ({upcoming.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {upcoming.slice(0, 5).map(r => (
              <div key={r.id} style={{ padding: '7px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontWeight: 600 }}>{r.vehicle?.registration_no || `#${r.vehicle_id}`}</span>
                <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>—</span>
                <span>{r.type}</span>
                <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.76rem' }}>{r.scheduled_date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="table-container">
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Vehicle</th><th>Type</th><th>Scheduled</th><th>Status</th><th>Cost</th><th>Workshop</th><th>Next Due</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8}><LoadingState label="Loading maintenance records…" /></td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={8}><EmptyState icon="🔧" title="No records found" sub="Schedule maintenance to get started" /></td></tr>
              ) : records.map(r => (
                <tr key={r.id}>
                  <td><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand)', fontSize: '0.82rem', fontWeight: 600 }}>{r.vehicle?.registration_no || `#${r.vehicle_id}`}</span></td>
                  <td><span className="badge badge-blue"><Wrench size={10} />{r.type}</span></td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.scheduled_date || '—'}</span></td>
                  <td><span className={`badge ${STATUS_BADGE[r.status] || 'badge-slate'}`}>{r.status?.replace('_', ' ')}</span></td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>{r.cost ? `₹${parseFloat(r.cost).toLocaleString()}` : '—'}</span></td>
                  <td>{r.workshop_name || '—'}</td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.next_due_date || '—'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn-icon" onClick={() => openEdit(r)}><Pencil size={13} /></button>
                      <button className="btn-icon" onClick={() => handleDelete(r.id)} style={{ color: 'var(--red)' }}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(modal === 'add' || modal === 'edit') && (
        <Modal
          title={modal === 'add' ? 'Schedule Maintenance' : 'Edit Record'}
          onClose={() => setModal(null)}
          wide
          footer={<>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group"><label className="form-label">Vehicle *</label>
              <select className="input" value={form.vehicle_id} onChange={f('vehicle_id')}>
                <option value="">Select vehicle</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_no} — {v.make} {v.model}</option>)}
              </select>
            </div>
            <div className="form-grid-2">
              <div className="form-group"><label className="form-label">Type</label>
                <select className="input" value={form.type} onChange={f('type')}>
                  {['oil_change','tire','brake','engine','electrical','body','other'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Status</label>
                <select className="input" value={form.status} onChange={f('status')}>
                  {['scheduled','in_progress','completed','cancelled'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Scheduled Date</label><input className="input" type="date" value={form.scheduled_date} onChange={f('scheduled_date')} /></div>
              <div className="form-group"><label className="form-label">Completed Date</label><input className="input" type="date" value={form.completed_date || ''} onChange={f('completed_date')} /></div>
              <div className="form-group"><label className="form-label">Cost (₹)</label><input className="input" type="number" value={form.cost} onChange={f('cost')} /></div>
              <div className="form-group"><label className="form-label">Odometer (km)</label><input className="input" type="number" value={form.odometer_km} onChange={f('odometer_km')} /></div>
            </div>
            <div className="form-group"><label className="form-label">Workshop Name</label><input className="input" value={form.workshop_name} onChange={f('workshop_name')} /></div>
            <div className="form-group"><label className="form-label">Next Due Date</label><input className="input" type="date" value={form.next_due_date} onChange={f('next_due_date')} /></div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="input" value={form.description} onChange={f('description')} rows={2} /></div>
          </div>
        </Modal>
      )}
    </div>
  )
}


