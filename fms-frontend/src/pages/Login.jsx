import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Truck, Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [form, setForm]       = useState({ email: '', password: '' })
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // System validates credentials, identifies role, and routes accordingly.
      // The single <Dashboard /> component at "/" auto-renders Admin / Manager /
      // Driver views based on the logged-in user's role — no manual selection needed.
      await login(form.email, form.password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-void)',
      backgroundImage: `
        radial-gradient(ellipse at 20% 50%, rgba(245,158,11,0.04) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 20%, rgba(6,182,212,0.04) 0%, transparent 50%)
      `,
      padding: '20px',
    }}>
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
        backgroundSize: '60px 60px', opacity: 0.3,
      }} />

      <div style={{ position: 'relative', width: '100%', maxWidth: '420px', animation: 'slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '56px', height: '56px', background: 'var(--amber)', borderRadius: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px', boxShadow: '0 0 30px rgba(245,158,11,0.35)',
          }}>
            <Truck size={26} color="#000" />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.08em', fontWeight: 700 }}>
            FLEET<span style={{ color: 'var(--amber)' }}>OS</span>
          </h1>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-bright)',
          borderRadius: 'var(--radius-lg)', padding: '32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px var(--border-accent)',
        }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700 }}>
              Welcome back
            </h2>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {error && (
              <div style={{
                background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 'var(--radius)',
                padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px',
                color: 'var(--red)', fontSize: '0.85rem',
              }}>
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="input"
                  type="email"
                  placeholder="you@fleet.com"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  style={{ paddingLeft: '34px' }}
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <label className="form-label">Password</label>
                <Link to="/forgot-password" style={{ fontSize: '0.75rem', color: 'var(--amber)', fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="input"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  style={{ paddingLeft: '34px', paddingRight: '36px' }}
                  required
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: '0.95rem', marginTop: '4px' }}
              disabled={loading}
            >
              {loading ? 'SIGNING IN...' : 'SIGN IN'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}