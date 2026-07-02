import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Truck, Lock, Mail, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const REMEMBER_KEY = 'fleetos_remembered_email'

export default function Login() {
  const [form, setForm]         = useState({ email: '', password: '' })
  const [remember, setRemember] = useState(false)
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const { login } = useAuth()
  const navigate  = useNavigate()

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY)
    if (saved) {
      setForm(p => ({ ...p, email: saved }))
      setRemember(true)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // System validates credentials, identifies role, and routes accordingly.
      // The single <Dashboard /> component at "/" auto-renders Admin / Manager /
      // Driver views based on the logged-in user's role — no manual selection needed.
      await login(form.email, form.password)
      if (remember) localStorage.setItem(REMEMBER_KEY, form.email)
      else localStorage.removeItem(REMEMBER_KEY)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-shell">

      {/* Left — brand panel */}
      <div className="login-brand">
        <div className="login-brand-photo" />
        <div className="login-brand-scrim" />

        <div className="login-brand-content">
          <div className="login-brand-top">
            <div className="login-mark">
              <Truck size={18} color="#fff" />
            </div>
            <span className="login-wordmark">FLEET<span>OS</span></span>
          </div>

          <div className="login-brand-mid">
            <span className="login-eyebrow">FLEET OPERATIONS PLATFORM</span>
            <h1 className="login-headline">
              Every vehicle.<br />One command center.
            </h1>
            <p className="login-subhead">
              Track trips, maintenance, fuel, and compliance across your entire fleet — in real time, from a single dashboard.
            </p>
          </div>

          <div className="login-brand-foot">© {new Date().getFullYear()} FleetOS — Fleet Management System</div>
        </div>
      </div>

      {/* Right — form panel */}
      <div className="login-formside">
        <div className="login-formwrap">

          <div className="login-mobile-brand">
            <div className="login-mark login-mark-solo"><Truck size={20} color="#fff" /></div>
            <span className="login-wordmark login-wordmark-dark">FLEET<span>OS</span></span>
          </div>

          <div className="login-formhead">
            <h2>Welcome back</h2>
            <p>Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            {error && (
              <div className="login-error" role="alert">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="login-field">
              <label htmlFor="email">Email address</label>
              <div className="login-inputwrap">
                <Mail size={16} className="login-inputicon" />
                <input
                  id="email"
                  type="email"
                  placeholder="you@fleet.com"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="login-field">
              <div className="login-field-head">
                <label htmlFor="password">Password</label>
                <Link to="/forgot-password" className="login-link">Forgot password?</Link>
              </div>
              <div className="login-inputwrap">
                <Lock size={16} className="login-inputicon" />
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required
                />
                <button type="button" className="login-eyebtn" onClick={() => setShowPw(!showPw)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <label className="login-remember">
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
              <span>Remember my email on this device</span>
            </label>

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Signing in…' : <>Sign in <ArrowRight size={16} /></>}
            </button>

            <p className="login-switch">
              Don't have an account? <Link to="/register">Create one</Link>
            </p>
          </form>

          <div className="login-trust">
            <ShieldCheck size={13} />
            <span>Your session is encrypted and access is role-based</span>
          </div>
        </div>
      </div>

      <style>{`
        .login-shell { min-height: 100vh; display: flex; }

        /* ── Brand panel ── */
        .login-brand {
          flex: 1 1 48%; position: relative; overflow: hidden;
          display: flex; color: #fff;
        }
        .login-brand-photo {
          position: absolute; inset: 0;
          background-image: url('https://images.unsplash.com/photo-1772440223098-cc23f6f01209?auto=format&fit=crop&w=1400&q=80');
          background-size: cover; background-position: center;
          transform: scale(1.02);
        }
        .login-brand-scrim {
          position: absolute; inset: 0;
          background:
            linear-gradient(190deg, rgba(6,10,20,0.55) 0%, rgba(8,13,26,0.86) 42%, rgba(8,13,26,0.97) 100%);
        }
        .login-brand-content {
          position: relative; width: 100%; display: flex; flex-direction: column;
          justify-content: space-between; padding: 44px 52px;
        }
        .login-brand-top { display: flex; align-items: center; gap: 10px; }
        .login-mark {
          width: 34px; height: 34px; border-radius: 9px; background: var(--brand);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          box-shadow: 0 6px 16px rgba(29,78,216,0.45);
        }
        .login-wordmark {
          font-family: var(--font-display); font-weight: 700; font-size: 1.05rem;
          letter-spacing: 0.06em; color: #f8fafc;
        }
        .login-wordmark span { color: #5b9bff; }

        .login-brand-mid { max-width: 460px; }
        .login-eyebrow {
          display: block; font-family: var(--font-mono); font-size: 0.7rem; font-weight: 600;
          letter-spacing: 0.14em; color: #7fa8f5; margin-bottom: 14px;
        }
        .login-headline {
          font-family: var(--font-display); font-size: 2.35rem; font-weight: 700;
          line-height: 1.16; letter-spacing: -0.02em; margin: 0 0 14px; color: #fff;
        }
        .login-subhead {
          font-family: var(--font-sans); font-size: 0.95rem; line-height: 1.65;
          color: #b7c2d6; margin: 0 0 30px; max-width: 400px;
        }

        .login-brand-foot {
          position: relative; font-size: 0.72rem; color: #66738f; font-family: var(--font-mono);
        }

        /* ── Form panel ── */
        .login-formside {
          flex: 1 1 52%; display: flex; align-items: center; justify-content: center;
          background: var(--bg-canvas); padding: 24px;
        }
        .login-formwrap { width: 100%; max-width: 380px; }
        .login-mobile-brand { display: none; align-items: center; gap: 10px; margin-bottom: 32px; }
        .login-mark-solo { background: var(--brand); }
        .login-wordmark-dark { color: var(--text-primary); }
        .login-wordmark-dark span { color: var(--brand); }

        .login-formhead { margin-bottom: 30px; }
        .login-formhead h2 {
          font-family: var(--font-display); font-size: 1.55rem; font-weight: 700;
          color: var(--text-primary); margin: 0 0 5px; letter-spacing: -0.01em;
        }
        .login-formhead p { font-size: 0.87rem; color: var(--text-muted); margin: 0; }

        .login-form { display: flex; flex-direction: column; gap: 17px; }

        .login-error {
          display: flex; align-items: flex-start; gap: 8px; padding: 10px 13px;
          background: var(--red-bg); border-left: 3px solid var(--red); border-radius: 8px;
          color: #991b1b; font-size: 0.83rem;
        }

        .login-field { display: flex; flex-direction: column; gap: 6px; }
        .login-field-head { display: flex; justify-content: space-between; align-items: baseline; }
        .login-field label {
          font-size: 0.78rem; font-weight: 600; color: var(--text-secondary);
        }
        .login-link { font-size: 0.78rem; color: var(--brand); font-weight: 600; text-decoration: none; }
        .login-link:hover { text-decoration: underline; }

        .login-inputwrap { position: relative; display: flex; align-items: center; }
        .login-inputicon { position: absolute; left: 13px; color: var(--text-muted); pointer-events: none; }
        .login-inputwrap input {
          width: 100%; height: 44px; padding: 0 14px 0 38px;
          background: #fff; border: 1.5px solid var(--border); border-radius: 9px;
          font-size: 0.9rem; color: var(--text-primary); font-family: var(--font-sans);
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .login-inputwrap input::placeholder { color: var(--text-disabled); }
        .login-inputwrap input:focus {
          outline: none; border-color: var(--brand); box-shadow: 0 0 0 3px var(--brand-glow);
        }
        .login-eyebtn {
          position: absolute; right: 10px; background: none; border: none; cursor: pointer;
          color: var(--text-muted); display: flex; padding: 4px; border-radius: 6px;
        }
        .login-eyebtn:hover { color: var(--text-secondary); }
        .login-eyebtn:focus-visible, .login-inputwrap input:focus-visible {
          outline: 2px solid var(--brand); outline-offset: 2px;
        }

        .login-remember { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }
        .login-remember input {
          width: 15px; height: 15px; accent-color: var(--brand); cursor: pointer;
        }
        .login-remember span { font-size: 0.82rem; color: var(--text-secondary); }

        .login-submit {
          height: 46px; border: none; border-radius: 9px; cursor: pointer;
          background: var(--brand); color: #fff; font-weight: 700; font-size: 0.9rem;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 8px 20px rgba(29,78,216,0.28);
          transition: background 0.15s, transform 0.1s;
        }
        .login-submit:hover:not(:disabled) { background: var(--brand-dark); }
        .login-submit:active:not(:disabled) { transform: translateY(1px); }
        .login-submit:disabled { opacity: 0.7; cursor: not-allowed; }
        .login-submit:focus-visible { outline: 2px solid var(--brand-dark); outline-offset: 2px; }

        .login-switch { text-align: center; font-size: 0.82rem; color: var(--text-muted); margin: 2px 0 0; }
        .login-switch a { color: var(--brand); font-weight: 600; text-decoration: none; }
        .login-switch a:hover { text-decoration: underline; }

        .login-trust {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          margin-top: 26px; font-size: 0.74rem; color: var(--text-disabled);
        }

        .login-formwrap { animation: loginRise 0.45s cubic-bezier(0.22,1,0.36,1); }
        @keyframes loginRise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

        @media (prefers-reduced-motion: reduce) {
          .login-formwrap { animation: none !important; }
        }

        @media (max-width: 900px) {
          .login-brand { display: none; }
          .login-mobile-brand { display: flex; }
        }
      `}</style>
    </div>
  )
}