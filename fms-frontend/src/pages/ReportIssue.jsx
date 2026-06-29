import { useState, useRef, useEffect } from 'react'
import {
  AlertTriangle, Camera, Send, CheckCircle2, Zap, Wrench, Car,
  ShieldAlert, Fuel, BatteryLow, Mic, Square, Trash2, Info
} from 'lucide-react'
import { alertAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const ISSUE_TYPES = [
  { id: 'mechanical', label: 'Mechanical', icon: Wrench    },
  { id: 'tyre',       label: 'Tyre',       icon: Zap       },
  { id: 'engine',     label: 'Engine',     icon: Wrench    },
  { id: 'accident',   label: 'Accident',   icon: Car       },
  { id: 'fuel',       label: 'Fuel',       icon: Fuel      },
  { id: 'brake',      label: 'Brake',      icon: ShieldAlert },
  { id: 'battery',    label: 'Battery',    icon: BatteryLow },
  { id: 'other',      label: 'Other',      icon: AlertTriangle },
]

const SEVERITY = [
  { id: 'low',      label: 'Low',      color: '#16a34a', bg: '#dcfce7', border: '#86efac' },
  { id: 'medium',   label: 'Medium',   color: '#d97706', bg: '#fef3c7', border: '#fcd34d' },
  { id: 'high',     label: 'High',     color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
  { id: 'critical', label: 'Critical', color: '#be185d', bg: '#fce7f3', border: '#f9a8d4' },
]

const fmtSec = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export default function ReportIssue() {
  const { user } = useAuth()
  const toast    = useToast()
  const fileRef  = useRef(null)

  const [issueType, setIssueType] = useState('')
  const [severity,  setSeverity]  = useState('medium')
  const [title,     setTitle]     = useState('')
  const [message,   setMessage]   = useState('')
  const [photo,     setPhoto]     = useState(null)
  const [preview,   setPreview]   = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [done,      setDone]      = useState(false)

  const [recording,    setRecording]    = useState(false)
  const [audioBlob,    setAudioBlob]    = useState(null)
  const [audioURL,     setAudioURL]     = useState(null)
  const [recordingSec, setRecordingSec] = useState(0)
  const mediaRecRef = useRef(null)
  const chunksRef   = useRef([])
  const timerRef    = useRef(null)

  useEffect(() => () => clearInterval(timerRef.current), [])

  const handlePhoto = (e) => {
    const f = e.target.files[0]; if (!f) return
    setPhoto(f); setPreview(URL.createObjectURL(f))
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob); setAudioURL(URL.createObjectURL(blob))
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start(); mediaRecRef.current = mr
      setRecording(true); setRecordingSec(0)
      timerRef.current = setInterval(() => setRecordingSec(s => s + 1), 1000)
    } catch { toast.error('Microphone access denied') }
  }

  const stopRecording = () => {
    mediaRecRef.current?.stop(); setRecording(false); clearInterval(timerRef.current)
  }

  const clearRecording = () => { setAudioBlob(null); setAudioURL(null); setRecordingSec(0) }

  const handleSubmit = async () => {
    if (!issueType)    { toast.error('Please select an issue type'); return }
    if (!title.trim()) { toast.error('Please enter a title'); return }
    setSaving(true)
    try {
      let voice_note
      if (audioBlob) {
        voice_note = await new Promise(res => {
          const r = new FileReader(); r.onloadend = () => res(r.result); r.readAsDataURL(audioBlob)
        })
      }
      await alertAPI.create({
        type: 'other', severity,
        title: `[${issueType.toUpperCase()}] ${title}`,
        message, driver_id: user?.driverId || undefined, voice_note,
      })
      setDone(true)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report')
    } finally { setSaving(false) }
  }

  const reset = () => {
    setIssueType(''); setSeverity('medium'); setTitle(''); setMessage('')
    setPhoto(null); setPreview(null); setDone(false); clearRecording()
  }

  /* ── Success state ── */
  if (done) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <CheckCircle2 size={40} color="#16a34a" />
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
          Issue Reported!
        </h2>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 28 }}>
          Your report has been submitted successfully. Your fleet manager has been notified and will review it shortly.
        </p>
        <button onClick={reset} className="btn btn-primary" style={{ padding: '11px 32px', fontSize: '0.9rem' }}>
          Report Another Issue
        </button>
      </div>
    </div>
  )

  /* ── Form ── */
  return (
    <div className="page-enter">

      {/* ── Page header ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.55rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', lineHeight: 1.2 }}>
          Report <span style={{ color: 'var(--brand)' }}>Issue</span>
        </h1>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: 4 }}>
          Let your fleet manager know about a vehicle or trip issue
        </p>
      </div>

      {/* ── Main form card ── */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xs)', overflow: 'hidden' }}>

        {/* ── Issue Type ── */}
        <div style={{ padding: '28px 28px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
            Issue Type <span style={{ color: 'var(--text-danger)' }}>*</span>
          </div>
          <style>{`
            .issue-btn {
              display: flex; flex-direction: column; align-items: center;
              justify-content: center; gap: 10px; padding: 20px 12px;
              border-radius: var(--radius-lg); cursor: pointer;
              transition: transform 0.18s cubic-bezier(.34,1.56,.64,1),
                          box-shadow 0.18s ease, border-color 0.15s, background 0.15s;
              font-size: 0.82rem;
            }
            .issue-btn:hover {
              transform: translateY(-3px);
              box-shadow: 0 8px 24px rgba(37,99,235,0.13);
            }
            .issue-btn:active { transform: translateY(-1px); }
            .issue-btn.active {
              transform: translateY(-2px);
              box-shadow: 0 6px 20px rgba(37,99,235,0.18);
            }
            .issue-btn .icon-wrap {
              width: 44px; height: 44px; border-radius: 12px;
              display: flex; align-items: center; justify-content: center;
              transition: transform 0.18s cubic-bezier(.34,1.56,.64,1);
            }
            .issue-btn:hover .icon-wrap { transform: scale(1.15); }
          `}</style>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {ISSUE_TYPES.map(t => {
              const Icon = t.icon
              const active = issueType === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setIssueType(t.id)}
                  className={`issue-btn${active ? ' active' : ''}`}
                  style={{
                    border: `2px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
                    background: active ? 'var(--brand-light)' : 'var(--bg-canvas)',
                    color: active ? 'var(--brand)' : 'var(--text-secondary)',
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  <div className="icon-wrap" style={{
                    background: active ? 'rgba(37,99,235,0.12)' : 'var(--bg-surface)',
                    boxShadow: active ? '0 0 0 3px rgba(37,99,235,0.1)' : 'none',
                  }}>
                    <Icon size={22} />
                  </div>
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Severity ── */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
            Severity Level
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {SEVERITY.map(s => {
              const active = severity === s.id
              return (
                <button key={s.id} onClick={() => setSeverity(s.id)} style={{
                  padding: '12px 8px', borderRadius: 'var(--radius)',
                  border: `2px solid ${active ? s.border : 'var(--border)'}`,
                  background: active ? s.bg : 'var(--bg-canvas)',
                  color: active ? s.color : 'var(--text-muted)',
                  fontWeight: active ? 700 : 500, fontSize: '0.85rem',
                  cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  {active && <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, display: 'inline-block', flexShrink: 0 }} />}
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Title + Description ── */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="form-group">
            <label className="form-label">
              Title <span style={{ color: 'var(--text-danger)' }}>*</span>
            </label>
            <input
              className="input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Brief description of the issue"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="input"
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              placeholder="Describe the issue in detail — what happened, when, and any other relevant information…"
              style={{ resize: 'vertical', minHeight: 110 }}
            />
          </div>
        </div>

        {/* ── Voice Note + Photo (side by side) ── */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* Voice Note */}
          <div className="form-group">
            <label className="form-label">
              Voice Note <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
            </label>
            {!audioURL ? (
              <button onClick={recording ? stopRecording : startRecording} style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '14px 12px', borderRadius: 'var(--radius)',
                border: `1.5px solid ${recording ? '#fca5a5' : 'var(--border)'}`,
                background: recording ? '#fff5f5' : 'var(--bg-canvas)',
                color: recording ? '#dc2626' : 'var(--text-secondary)',
                cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s',
                minHeight: 52,
              }}>
                {recording ? (
                  <>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#dc2626', display: 'inline-block', animation: 'pulse 1s infinite', flexShrink: 0 }} />
                    <Square size={14} /> Stop · {fmtSec(recordingSec)}
                  </>
                ) : (
                  <><Mic size={15} /> Tap to Record Voice Note</>
                )}
              </button>
            ) : (
              <div style={{ border: '1.5px solid #bbf7d0', borderRadius: 'var(--radius)', padding: '14px', background: '#f0fdf4', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Mic size={15} color="#16a34a" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#15803d' }}>Voice note recorded</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{fmtSec(recordingSec)} · Attached to report</div>
                  </div>
                  <button onClick={clearRecording} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.76rem', fontWeight: 600, flexShrink: 0 }}>
                    <Trash2 size={12} /> Remove
                  </button>
                </div>
                <audio controls src={audioURL} style={{ width: '100%', height: 34 }} />
              </div>
            )}
          </div>

          {/* Photo Upload */}
          <div className="form-group">
            <label className="form-label">
              Upload Photo <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
            </label>
            <div onClick={() => fileRef.current?.click()} style={{
              border: '1.5px dashed var(--border-dark)', borderRadius: 'var(--radius)',
              padding: '14px', textAlign: 'center', cursor: 'pointer',
              background: preview ? '#000' : 'var(--bg-canvas)',
              overflow: 'hidden', minHeight: 52,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {preview ? (
                <img src={preview} alt="" style={{ maxHeight: 100, borderRadius: 6, objectFit: 'contain' }} />
              ) : (
                <div style={{ color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <Camera size={22} />
                  <div style={{ fontSize: '0.8rem', fontWeight: 500 }}>Click to upload a photo</div>
                  <div style={{ fontSize: '0.72rem' }}>JPG, PNG up to 5MB</div>
                </div>
              )}
            </div>
            {preview && (
              <button onClick={() => { setPhoto(null); setPreview(null) }}
                style={{ marginTop: 6, fontSize: '0.76rem', color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}>
                Remove photo
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
          </div>
        </div>

        {/* ── Info note + Submit ── */}
        <div style={{ padding: '20px 28px', background: 'var(--bg-canvas)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <Info size={14} style={{ flexShrink: 0 }} />
            Your fleet manager will be notified immediately upon submission.
          </div>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="btn btn-primary"
            style={{ padding: '11px 32px', fontSize: '0.9rem', fontWeight: 700, minWidth: 160, justifyContent: 'center', flexShrink: 0 }}
          >
            <Send size={15} />
            {saving ? 'Submitting…' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  )
}