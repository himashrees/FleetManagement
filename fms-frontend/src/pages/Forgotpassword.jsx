import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Truck, Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import { authAPI } from '../services/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [devLink, setDevLink] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await authAPI.forgotPassword({ email })
      setSent(true)
      if (res.data.dev_reset_link) setDevLink(res.data.dev_reset_link)
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-canvas)', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }} className="page-enter">
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div className="sidebar-logo" style={{ width: '52px', height: '52px', margin: '0 auto 14px', borderRadius: 'var(--radius-lg)' }}><Truck size={24} /></div>
          <h1 className="page-title" style={{ fontSize: '1.5rem' }}>Forgot <span className="accent">Password</span></h1>
          <p className="page-sub">Enter your email to receive a reset link</p>
        </div>

        <div className="card" style={{ padding: '28px' }}>
          {sent ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', textAlign: 'center' }}>
              <CheckCircle size={36} color="var(--green)" />
              <div>
                <p style={{ fontWeight: 600, marginBottom: '6px' }}>Check your email</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>If an account exists for <strong>{email}</strong>, a reset link has been sent. It expires in 15 minutes.</p>
              </div>
              {devLink && (
                <div className="notice notice-amber" style={{ width: '100%', wordBreak: 'break-all', fontSize: '0.75rem' }}>
                  DEV MODE — Email not configured:<br/>
                  <Link to={devLink.replace(/^.*\/reset-password/, '/reset-password')}>{devLink}</Link>
                </div>
              )}
              <Link to="/login" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                <ArrowLeft size={14} /> Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {error && <div className="notice notice-red"><AlertCircle size={15} /> <span>{error}</span></div>}
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="search-wrap">
                  <Mail size={15} className="search-icon" />
                  <input className="input" type="email" placeholder="admin@fleet.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center', padding: '11px' }} disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <Link to="/login" style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <ArrowLeft size={13} /> Back to login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}