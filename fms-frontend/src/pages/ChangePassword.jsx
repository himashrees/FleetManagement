import { useState } from 'react'
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react'
import { authAPI } from '../services/api'
import { useToast } from '../context/ToastContext'

const RULES = [
  { test: (p) => p.length >= 6,        label: 'At least 6 characters' },
  { test: (p) => /[a-zA-Z]/.test(p),   label: 'Contains a letter' },
  { test: (p) => /[0-9]/.test(p),      label: 'Contains a number' },
]

export default function ChangePassword() {
  const toast = useToast()
  const [form, setForm]       = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [show, setShow]       = useState({ current: false, next: false, confirm: false })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  const toggle = (k) => setShow(p => ({ ...p, [k]: !p[k] }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.newPassword !== form.confirmPassword) {
      setError('New passwords do not match')
      return
    }
    if (!RULES.every(r => r.test(form.newPassword))) {
      setError('New password does not meet the requirements below')
      return
    }
    if (form.newPassword === form.currentPassword) {
      setError('New password must be different from your current password')
      return
    }

    setLoading(true)
    try {
      await authAPI.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      })
      toast.success('Password changed successfully')
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '520px', margin: '0 auto', minHeight: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
          Change <span style={{ color: 'var(--brand)' }}>Password</span>
        </h1>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '3px' }}>
          Update the password you use to sign in to FleetOS
        </div>
      </div>

      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '28px', boxShadow: 'var(--shadow-sm)',
      }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div className="notice notice-red">
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Current password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="input"
                type={show.current ? 'text' : 'password'}
                value={form.currentPassword}
                onChange={f('currentPassword')}
                placeholder="Enter your current password"
                style={{ paddingLeft: '34px', paddingRight: '36px' }}
                autoFocus
                required
              />
              <button type="button" onClick={() => toggle('current')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                {show.current ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />

          <div className="form-group">
            <label className="form-label">New password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="input"
                type={show.next ? 'text' : 'password'}
                value={form.newPassword}
                onChange={f('newPassword')}
                placeholder="Enter a new password"
                style={{ paddingLeft: '34px', paddingRight: '36px' }}
                required
              />
              <button type="button" onClick={() => toggle('next')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                {show.next ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {form.newPassword && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                {RULES.map((r, i) => {
                  const ok = r.test(form.newPassword)
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: ok ? 'var(--green)' : 'var(--text-muted)' }}>
                      <CheckCircle2 size={12} style={{ opacity: ok ? 1 : 0.35 }} />
                      {r.label}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Confirm new password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="input"
                type={show.confirm ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={f('confirmPassword')}
                placeholder="Re-enter new password"
                style={{ paddingLeft: '34px', paddingRight: '36px' }}
                required
              />
              <button type="button" onClick={() => toggle('confirm')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                {show.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: '0.95rem', marginTop: '4px', gap: '8px' }}
            disabled={loading}
          >
            <ShieldCheck size={15} />
            {loading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}