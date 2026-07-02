import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Truck, Lock, Mail, User as UserIcon, Phone, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react'
import { authAPI } from '../services/api'

const ROLES = [
  { value: 'driver',  label: 'Driver' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin',   label: 'Admin' },
]

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '', role: 'driver' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const navigate = useNavigate()

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      await authAPI.register({ name: form.name, email: form.email, phone: form.phone, password: form.password, role: form.role })
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1d4ed8 130%)',
      padding: '20px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.06,
        backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      <div style={{
        position: 'relative', width: '100%', maxWidth: '440px',
        background: 'rgba(255,255,255,0.98)', borderRadius: 'var(--radius-xl)',
        padding: '40px 36px', boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
        animation: 'slideUp 0.35s cubic-bezier(0.34,1.3,0.64,1)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '52px', height: '52px', background: 'var(--brand)', borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px', boxShadow: '0 8px 20px rgba(29,78,216,0.35)',
          }}>
            <Truck size={24} color="#fff" />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Create your <span style={{ color: 'var(--brand)' }}>account</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', marginTop: '4px' }}>
            Sign up as a driver, manager, or admin.
          </p>
        </div>

        {done ? (
          <div className="notice notice-blue" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px', padding: '24px' }}>
            <CheckCircle2 size={28} color="var(--blue)" />
            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Account created</div>
            <div style={{ fontSize: '0.85rem' }}>You can now sign in with your email and password.</div>
            <button className="btn btn-primary" style={{ marginTop: '10px' }} onClick={() => navigate('/login')}>
              Go to Login <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {error && (
              <div className="notice notice-red">
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Full name</label>
              <div className="search-wrap">
                <UserIcon size={15} className="search-icon" />
                <input className="input" value={form.name} onChange={f('name')} placeholder="Ravi Kumar" required autoFocus />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Account type</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {ROLES.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, role: r.value }))}
                    style={{
                      flex: 1, padding: '9px', borderRadius: 'var(--radius)', cursor: 'pointer',
                      fontSize: '0.85rem', fontWeight: 600, textAlign: 'center',
                      border: form.role === r.value ? '1px solid var(--brand)' : '1px solid var(--border)',
                      background: form.role === r.value ? 'var(--brand-light)' : 'var(--bg-input)',
                      color: form.role === r.value ? 'var(--brand-dark)' : 'var(--text-secondary)',
                      transition: 'var(--transition)',
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email address</label>
              <div className="search-wrap">
                <Mail size={15} className="search-icon" />
                <input className="input" type="email" value={form.email} onChange={f('email')} placeholder="you@company.com" required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Phone</label>
              <div className="search-wrap">
                <Phone size={15} className="search-icon" />
                <input className="input" value={form.phone} onChange={f('phone')} placeholder="9876543210" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="search-wrap" style={{ position: 'relative' }}>
                <Lock size={15} className="search-icon" />
                <input className="input" type={showPw ? 'text' : 'password'} value={form.password} onChange={f('password')} placeholder="At least 6 characters" required style={{ paddingRight: '38px' }} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm password</label>
              <input className="input" type={showPw ? 'text' : 'password'} value={form.confirmPassword} onChange={f('confirmPassword')} placeholder="Re-enter password" required />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ justifyContent: 'center', marginTop: '4px', padding: '11px' }}>
              {loading ? 'Creating account…' : <>Create account <ArrowRight size={15} /></>}
            </button>

            <p style={{ textAlign: 'center', fontSize: '0.83rem', color: 'var(--text-muted)' }}>
              Already have an account? <Link to="/login" style={{ color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}