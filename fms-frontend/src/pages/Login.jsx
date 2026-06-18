import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Truck, Lock, Mail, Eye, EyeOff, AlertCircle, Shield, Users, Car } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const ROLES = [
  { key: 'admin',   label: 'Admin',         icon: Shield },
  { key: 'manager', label: 'Fleet Manager',  icon: Users },
  { key: 'driver',  label: 'Driver',         icon: Car },
]

export default function Login() {
  const [role, setRole] = useState('admin')
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const user = await login(form.email, form.password)
      if (user?.role && user.role !== role) {
        setError(`This account is registered as "${user.role}", not "${role}".`)
        setLoading(false)
        return
      }
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-canvas)', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }} className="page-enter">
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div className="sidebar-logo" style={{ width: '52px', height: '52px', margin: '0 auto 14px', borderRadius: 'var(--radius-lg)' }}>
            <Truck size={24} />
          </div>
          <h1 className="page-title" style={{ fontSize: '1.8rem' }}>FLEET<span className="accent">OS</span></h1>
          <p className="page-sub">Command Center — Secure Access</p>
        </div>

        <div className="card" style={{ padding: '28px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ display: 'block', marginBottom: '10px' }}>Login as</label>
            <div className="form-grid-3">
              {ROLES.map(r => {
                const Icon = r.icon
                const active = role === r.key
                return (
                  <button key={r.key} type="button" onClick={() => setRole(r.key)} className={`btn ${active ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flexDirection: 'column', gap: '6px', padding: '12px 6px', height: 'auto' }}>
                    <Icon size={16} />
                    <span style={{ fontSize: '0.72rem' }}>{r.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && (
              <div className="notice notice-red">
                <AlertCircle size={15} /> <span>{error}</span>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="search-wrap">
                <Mail size={15} className="search-icon" />
                <input className="input" type="email" placeholder="admin@fleet.com" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label className="form-label">Password</label>
                <Link to="/forgot-password" style={{ fontSize: '0.78rem', color: 'var(--brand)' }}>Forgot password?</Link>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={15} className="search-icon" />
                <input className="input" style={{ paddingLeft: '34px', paddingRight: '36px' }} type={showPw ? 'text' : 'password'} placeholder="••••••••"
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center', padding: '11px' }} disabled={loading}>
              {loading ? 'Authenticating...' : `Access as ${ROLES.find(r => r.key === role)?.label}`}
            </button>
          </form>
        </div>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '16px' }}>FleetOS v1.0 — Restricted Access</p>
      </div>
    </div>
  )
}