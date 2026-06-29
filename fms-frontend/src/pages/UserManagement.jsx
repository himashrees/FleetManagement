import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X, RefreshCw, Shield, ShieldOff, KeyRound, User, Mail, Phone, Search } from 'lucide-react'
import { userAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const ROLE_BADGE = { admin: 'badge-red', manager: 'badge-amber', driver: 'badge-blue' }
const ROLES = ['admin', 'manager', 'driver']
const EMPTY = { name: '', email: '', password: '', role: 'driver', phone: '' }

export default function UserManagement() {
  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [modal, setModal]       = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [pwForm, setPwForm]     = useState('')
  const [saving, setSaving]     = useState(false)
  const { user: currentUser } = useAuth()
  const toast = useToast()

  const load = () => {
    setLoading(true)
    userAPI.getAll()
      .then(r => setUsers(r.data.data))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      if (modal === 'add') {
        await userAPI.create(form)
        toast.success('User created')
      } else {
        await userAPI.update(selected.id, { name: form.name, email: form.email, role: form.role, phone: form.phone })
        toast.success('User updated')
      }
      setModal(null); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed') }
    finally { setSaving(false) }
  }

  const handleToggleActive = async (u) => {
    try {
      await userAPI.toggleActive(u.id)
      toast.success(u.is_active ? 'User deactivated' : 'User reactivated')
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Action failed') }
  }

  const handleResetPassword = async () => {
    if (pwForm.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setSaving(true)
    try {
      await userAPI.resetPassword(selected.id, { newPassword: pwForm })
      toast.success(`Password reset for ${selected.email}`)
      setModal(null); setPwForm('')
    } catch (err) { toast.error(err.response?.data?.message || 'Reset failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setSaving(true)
    try { await userAPI.remove(selected.id); toast.success('User deleted'); setModal(null); load() }
    catch (err) { toast.error(err.response?.data?.message || 'Delete failed') }
    finally { setSaving(false) }
  }

  const filtered = users.filter(u =>
    (!roleFilter || u.role === roleFilter) &&
    (u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">User <span>Management</span></h1>
          <p className="page-sub">{users.length} users — manage accounts, roles & access</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-icon" onClick={load}><RefreshCw size={14} /></button>
          <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setModal('add') }}>
            <Plus size={15} /> CREATE USER
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" placeholder="Search name or email..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32, maxWidth: 240 }} />
        </div>
        <select className="input" value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>User</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No users found</td></tr>
            ) : filtered.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 30, height: 30, background: 'var(--bg-panel)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={14} color="var(--text-muted)" />
                    </div>
                    <span style={{ fontWeight: 500 }}>{u.name}</span>
                    {u.id === currentUser?.id && <span style={{ fontSize: '0.65rem', color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>(you)</span>}
                  </div>
                </td>
                <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{u.email}</span></td>
                <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.phone || '—'}</span></td>
                <td><span className={`badge ${ROLE_BADGE[u.role] || 'badge-gray'}`}>{u.role}</span></td>
                <td>
                  <span className={`badge ${u.is_active ? 'badge-green' : 'badge-gray'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {new Date(u.createdAt).toLocaleDateString('en-IN')}
                </span></td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-icon" title="Edit" onClick={() => { setForm({ ...u, password: '' }); setSelected(u); setModal('edit') }}>
                      <Pencil size={13} />
                    </button>
                    <button className="btn-icon" title="Reset Password" onClick={() => { setSelected(u); setPwForm(''); setModal('resetpw') }}>
                      <KeyRound size={13} />
                    </button>
                    {u.id !== currentUser?.id && (
                      <button className="btn-icon" title={u.is_active ? 'Deactivate' : 'Reactivate'}
                        onClick={() => handleToggleActive(u)}
                        style={{ color: u.is_active ? 'var(--red)' : 'var(--green)' }}>
                        {u.is_active ? <ShieldOff size={13} /> : <Shield size={13} />}
                      </button>
                    )}
                    {u.id !== currentUser?.id && (
                      <button className="btn-icon" title="Delete" style={{ color: 'var(--red)' }} onClick={() => { setSelected(u); setModal('delete') }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{modal === 'add' ? '+ CREATE USER' : 'EDIT USER'}</div>
              <button className="btn-icon" onClick={() => setModal(null)}><X size={14} /></button>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="input" value={form.name} onChange={f('name')} placeholder="Ravi Kumar" />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="input" type="email" value={form.email} onChange={f('email')} placeholder="ravi@fleet.com" />
              </div>
              {modal === 'add' && (
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input className="input" type="password" value={form.password} onChange={f('password')} placeholder="Min 6 characters" />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="input" value={form.phone} onChange={f('phone')} placeholder="9876543210" />
              </div>
              <div className="form-group">
                <label className="form-label">Role *</label>
                <select className="input" value={form.role} onChange={f('role')}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginTop: 8, padding: '10px 14px', background: 'var(--bg-panel)', borderRadius: 'var(--radius)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {form.role === 'admin' && 'Full system access — all pages and user management.'}
              {form.role === 'manager' && 'Operational access — dashboard, vehicles, drivers, trips, fuel, maintenance, documents, alerts, GPS, reports.'}
              {form.role === 'driver' && 'Limited access — dashboard, my trips, my vehicle, fuel logs, documents, alerts.'}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>CANCEL</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'SAVING...' : 'SAVE USER'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {modal === 'resetpw' && selected && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title"><KeyRound size={14} /> RESET PASSWORD</div>
              <button className="btn-icon" onClick={() => setModal(null)}><X size={14} /></button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 14 }}>
              Set a new password for <strong style={{ color: 'var(--text-primary)' }}>{selected.name}</strong> ({selected.email})
            </p>
            <div className="form-group">
              <label className="form-label">New Password *</label>
              <input className="input" type="password" value={pwForm} onChange={e => setPwForm(e.target.value)} placeholder="Min 6 characters" />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>CANCEL</button>
              <button className="btn btn-primary" onClick={handleResetPassword} disabled={saving}>{saving ? 'RESETTING...' : 'RESET PASSWORD'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {modal === 'delete' && selected && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title" style={{ color: 'var(--red)' }}>CONFIRM DELETE</div></div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Permanently delete <strong style={{ color: 'var(--text-primary)' }}>{selected.name}</strong> ({selected.email})? This cannot be undone.
            </p>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>CANCEL</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>{saving ? 'DELETING...' : 'DELETE'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}