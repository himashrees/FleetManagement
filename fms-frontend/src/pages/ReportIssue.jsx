import { useState, useRef, useEffect } from 'react'
import { AlertTriangle, Camera, Send, CheckCircle2, Zap, Wrench, Car, ShieldAlert, Fuel, BatteryLow, Mic, Square, Play, Trash2 } from 'lucide-react'
import { alertAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const ISSUE_TYPES = [
  { id: 'mechanical', label: 'Mechanical', icon: <Wrench size={20} /> },
  { id: 'tyre',       label: 'Tyre',       icon: <Zap size={20} /> },
  { id: 'engine',     label: 'Engine',     icon: <Wrench size={20} /> },
  { id: 'accident',   label: 'Accident',   icon: <Car size={20} /> },
  { id: 'fuel',       label: 'Fuel',       icon: <Fuel size={20} /> },
  { id: 'brake',      label: 'Brake',      icon: <ShieldAlert size={20} /> },
  { id: 'battery',    label: 'Battery',    icon: <BatteryLow size={20} /> },
  { id: 'other',      label: 'Other',      icon: <AlertTriangle size={20} /> },
]

const SEVERITY = ['low', 'medium', 'high', 'critical']

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

  // Voice
  const [recording,    setRecording]    = useState(false)
  const [audioBlob,    setAudioBlob]    = useState(null)
  const [audioURL,     setAudioURL]     = useState(null)
  const [recordingSec, setRecordingSec] = useState(0)
  const mediaRecRef  = useRef(null)
  const chunksRef    = useRef([])
  const timerRef     = useRef(null)

  useEffect(() => () => clearInterval(timerRef.current), [])

  const handlePhoto = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setPhoto(f)
    setPreview(URL.createObjectURL(f))
  }

  /* ── Start recording ── */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioURL(URL.createObjectURL(blob))
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start()
      mediaRecRef.current = mr
      setRecording(true)
      setRecordingSec(0)
      timerRef.current = setInterval(() => setRecordingSec(s => s + 1), 1000)
    } catch {
      toast.error('Microphone access denied. Please allow microphone.')
    }
  }

  /* ── Stop recording ── */
  const stopRecording = () => {
    mediaRecRef.current?.stop()
    setRecording(false)
    clearInterval(timerRef.current)
  }

  const clearRecording = () => {
    setAudioBlob(null)
    setAudioURL(null)
    setRecordingSec(0)
  }

  const fmtSec = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!issueType)    { toast.error('Please select an issue type'); return }
    if (!title.trim()) { toast.error('Please enter a title'); return }
    setSaving(true)
    try {
      let voice_note = undefined
      if (audioBlob) {
        // Convert blob to base64
        voice_note = await new Promise((res) => {
          const reader = new FileReader()
          reader.onloadend = () => res(reader.result)
          reader.readAsDataURL(audioBlob)
        })
      }
      await alertAPI.create({
        type:      'other',
        severity,
        title:     `[${issueType.toUpperCase()}] ${title}`,
        message,
        driver_id: user?.driverId || undefined,
        voice_note,
      })
      setDone(true)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report')
    } finally { setSaving(false) }
  }

  const reset = () => {
    setIssueType(''); setSeverity('medium'); setTitle(''); setMessage('')
    setPhoto(null); setPreview(null); setDone(false)
    clearRecording()
  }

  if (done) return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto', textAlign: 'center', paddingTop: '80px' }}>
      <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: '#dcfce7',
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
        <CheckCircle2 size={34} color="#16a34a" />
      </div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px' }}>Issue Reported</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '24px' }}>
        Your report has been submitted. Your fleet manager will review it and take action.
      </p>
      <button onClick={reset} style={{ background: '#1d4ed8', color: '#fff', border: 'none',
        borderRadius: '10px', padding: '11px 28px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
        Report Another Issue
      </button>
    </div>
  )

  return (
    <div style={{ padding: '24px', maxWidth: '640px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
          Report <span style={{ color: '#2c26dc' }}>Issue</span>
        </h1>
        <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '3px' }}>
          Let your fleet manager know about a vehicle or trip issue
        </div>
      </div>

      {/* Issue Type */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '10px' }}>Issue Type *</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {ISSUE_TYPES.map(t => (
            <button key={t.id} onClick={() => setIssueType(t.id)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
              padding: '14px 8px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.15s',
              border: issueType === t.id ? '2px solid #1d4ed8' : '2px solid #e2e8f0',
              background: issueType === t.id ? '#eff6ff' : '#fff',
              color: issueType === t.id ? '#1d4ed8' : '#6b7280',
              fontWeight: issueType === t.id ? 700 : 500, fontSize: '0.78rem',
            }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Severity */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '10px' }}>Severity</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {SEVERITY.map(s => {
            const colors = { low: ['#dcfce7','#16a34a'], medium: ['#fef3c7','#d97706'], high: ['#fee2e2','#dc2626'], critical: ['#fce7f3','#be185d'] }
            const [bg, color] = colors[s]
            return (
              <button key={s} onClick={() => setSeverity(s)} style={{
                flex: 1, padding: '8px', borderRadius: '8px', cursor: 'pointer',
                fontWeight: 600, fontSize: '0.8rem', textTransform: 'capitalize',
                border: severity === s ? `2px solid ${color}` : '2px solid #e2e8f0',
                background: severity === s ? bg : '#fff',
                color: severity === s ? color : '#9ca3af',
              }}>{s}</button>
            )
          })}
        </div>
      </div>

      {/* Title */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '7px' }}>Title *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Brief description of the issue"
          style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }} />
      </div>

      {/* Description */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '7px' }}>Description</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4}
          placeholder="Describe the issue in detail — what happened, when, and any other relevant information…"
          style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px',
            fontSize: '0.88rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
      </div>

      {/* ── Voice Note ── */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '7px' }}>
          Voice Note <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Optional)</span>
        </label>

        {!audioURL ? (
          /* Record button */
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              padding: '14px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem',
              border: `2px solid ${recording ? '#dc2626' : '#e2e8f0'}`,
              background: recording ? '#fee2e2' : '#f8fafc',
              color: recording ? '#dc2626' : '#6b7280',
              transition: 'all 0.2s',
            }}
          >
            {recording ? (
              <>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#dc2626',
                  display: 'inline-block', animation: 'pulse 1s infinite' }} />
                <Square size={15} /> Stop Recording — {fmtSec(recordingSec)}
              </>
            ) : (
              <><Mic size={15} /> Tap to Record Voice Note</>
            )}
          </button>
        ) : (
          /* Playback + delete */
          <div style={{ border: '2px solid #e2e8f0', borderRadius: '12px', padding: '14px',
            background: '#f0fdf4', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#dcfce7',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Mic size={16} color="#16a34a" />
              </div>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#15803d' }}>Voice note recorded</div>
                <div style={{ fontSize: '0.74rem', color: '#6b7280' }}>{fmtSec(recordingSec)} · Will be sent with report</div>
              </div>
              <button onClick={clearRecording} style={{ marginLeft: 'auto', background: 'none', border: 'none',
                cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem' }}>
                <Trash2 size={13} /> Remove
              </button>
            </div>
            <audio controls src={audioURL} style={{ width: '100%', height: 36 }} />
          </div>
        )}
      </div>

      {/* Photo upload */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '7px' }}>
          Upload Photo <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Optional)</span>
        </label>
        <div onClick={() => fileRef.current?.click()} style={{
          border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '24px', textAlign: 'center', cursor: 'pointer',
          background: preview ? '#000' : '#f8fafc', position: 'relative', overflow: 'hidden', minHeight: '100px',
        }}>
          {preview ? (
            <img src={preview} alt="Preview" style={{ maxHeight: '180px', borderRadius: '8px', objectFit: 'contain' }} />
          ) : (
            <div style={{ color: '#94a3b8' }}>
              <Camera size={28} style={{ marginBottom: '8px', opacity: 0.5 }} />
              <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>Click to upload a photo</div>
              <div style={{ fontSize: '0.75rem', marginTop: '3px' }}>JPG, PNG up to 5MB</div>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
        {preview && (
          <button onClick={() => { setPhoto(null); setPreview(null) }} style={{ marginTop: '6px',
            fontSize: '0.78rem', color: '#3b26dc', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Remove photo
          </button>
        )}
      </div>

      {/* Submit */}
      <button onClick={handleSubmit} disabled={saving} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        background: saving ? '#94a3b8' : '#5726dc', color: '#fff', border: 'none', borderRadius: '12px',
        padding: '13px', fontWeight: 700, fontSize: '0.95rem', cursor: saving ? 'not-allowed' : 'pointer',
      }}>
        <Send size={16} />
        {saving ? 'Submitting…' : 'Submit Report'}
      </button>
    </div>
  )
}