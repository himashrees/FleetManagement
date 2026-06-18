import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Truck, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { authAPI } from '../services/api'

export default function ResetPassword() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      await authAPI.resetPassword({ token, newPassword: form.password })
      setDone(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed — link may have expired')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-canvas)', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }} className="page-enter">
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div className="sidebar-logo" style={{ width: '52px', height: '52px', margin: '0 auto 14px', borderRadius: 'var(--radius-lg)' }}><Truck size={24} /></div>
          <h1 className="page-title" style={{ fontSize: '1.5rem' }}>Reset <span className="accent">Password</span></h1>
          <p className="page-sub">Choose a new password</p>
        </div>

        <div className="card" style={{ padding: '28px' }}>
          {done ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', textAlign: 'center' }}>
              <CheckCircle size={36} color="var(--green)" />
              <p style={{ fontWeight: 600 }}>Password reset successful</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Redirecting to login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {error && <div className="notice notice-red"><AlertCircle size={15} /> <span>{error}</span></div>}
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} className="search-icon" />
                  <input className="input" style={{ paddingLeft: '34px', paddingRight: '36px' }} type={showPw ? 'text' : 'password'} placeholder="••••••••"
                    value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input className="input" type={showPw ? 'text' : 'password'} placeholder="••••••••" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center', padding: '11px' }} disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
              <Link to="/login" style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Back to login</Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}