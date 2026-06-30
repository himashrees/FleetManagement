import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { reportAPI } from '../services/api'
import { Truck, Users, Route, Wrench, RefreshCw, Sparkles, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react'
import { LoadingState, PageHeader } from '../components/Common'

const COLORS = ['#1d4ed8', '#0284c7', '#16a34a', '#7c3aed', '#dc2626']

const tooltipStyle = {
  contentStyle: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
}

// ── AI Insight card: parses bullets, tags [RISK]/[SAVE]/[GOOD] with icons ──
function tagStyle(tag) {
  if (tag === 'RISK') return { color: '#dc2626', bg: '#fee2e2', Icon: AlertTriangle }
  if (tag === 'SAVE') return { color: '#d97706', bg: '#fef3c7', Icon: DollarSign }
  if (tag === 'GOOD') return { color: '#16a34a', bg: '#dcfce7', Icon: TrendingUp }
  return null
}

function AIInsightCard({ title, text, loading }) {
  if (loading) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #f5f3ff 0%, #eff6ff 100%)',
        border: '1px solid #e0e7ff', borderRadius: 'var(--radius-md)',
        padding: '14px 16px', marginTop: 14,
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: '0.82rem', color: 'var(--text-muted)',
      }}>
        <Sparkles size={14} style={{ color: '#7c3aed' }} />
        Generating AI insight…
      </div>
    )
  }
  if (!text) return null

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f5f3ff 0%, #eff6ff 100%)',
      border: '1px solid #e0e7ff', borderRadius: 'var(--radius-md)',
      padding: '14px 16px', marginTop: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Sparkles size={14} style={{ color: '#7c3aed' }} />
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title || 'AI Insight'}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {lines.map((line, i) => {
          const clean = line.replace(/^[•\-*]\s*/, '')
          const match = clean.match(/^\[(RISK|SAVE|GOOD)\]\s*(.*)/)
          if (match) {
            const t = tagStyle(match[1])
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  fontSize: '0.68rem', fontWeight: 700, color: t.color,
                  background: t.bg, padding: '2px 7px', borderRadius: 99,
                  flexShrink: 0, marginTop: 1,
                }}>
                  <t.Icon size={10} /> {match[1]}
                </span>
                <span style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{match[2]}</span>
              </div>
            )
          }
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
              <span style={{ color: '#7c3aed', fontSize: '0.83rem', marginTop: 1 }}>•</span>
              <span style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{clean}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Reports() {
  const [summary, setSummary] = useState(null)
  const [fuelReport, setFuelReport] = useState(null)
  const [tripReport, setTripReport] = useState(null)
  const [executive, setExecutive] = useState(null)
  const [execLoading, setExecLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({ from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] })

  const load = () => {
    setLoading(true)
    Promise.all([
      reportAPI.summary(),
      reportAPI.fuel(dateRange),
      reportAPI.trips(dateRange),
    ])
      .then(([s, f, t]) => {
        setSummary(s.data.data)
        setFuelReport(f.data.data)
        setTripReport(t.data.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    setExecLoading(true)
    reportAPI.executive()
      .then(r => setExecutive(r.data.data))
      .catch(() => {})
      .finally(() => setExecLoading(false))
  }
  useEffect(() => { load() }, [])

  const summaryCards = summary ? [
    { label: 'Total Vehicles', value: summary.totalVehicles, sub: `${summary.activeVehicles} active`, icon: Truck, color: 'blue' },
    { label: 'Total Drivers', value: summary.totalDrivers, sub: `${summary.availableDrivers} available`, icon: Users, color: 'blue' },
    { label: 'Trips Today', value: summary.tripsToday, sub: 'this session', icon: Route, color: 'green' },
    { label: 'Maintenance Due', value: summary.maintenanceDue, sub: 'overdue tasks', icon: Wrench, color: summary.maintenanceDue > 0 ? 'red' : 'green' },
  ] : []

  const fleetStatusData = summary ? [
    { name: 'Active', value: summary.activeVehicles || 0 },
    { name: 'Inactive', value: (summary.totalVehicles - summary.activeVehicles) || 0 },
  ] : []

  const driverStatusData = summary ? [
    { name: 'Available', value: summary.availableDrivers || 0 },
    { name: 'Engaged', value: (summary.totalDrivers - summary.availableDrivers) || 0 },
  ] : []

  const rowStyle = { display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg-canvas)', borderRadius: 'var(--radius)' }

  return (
    <div className="page-enter">
      <PageHeader title="Fleet" accent="Reports" sub="Analytics and performance overview">
        <input className="input" type="date" value={dateRange.from} onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))} style={{ maxWidth: '150px' }} />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>to</span>
        <input className="input" type="date" value={dateRange.to} onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))} style={{ maxWidth: '150px' }} />
        <button className="btn btn-primary" onClick={load}><RefreshCw size={14} /> Generate</button>
      </PageHeader>

      {loading ? (
        <LoadingState label="Generating reports…" />
      ) : (
        <>
          <div className="stats-grid">
            {summaryCards.map((s, i) => (
              <div key={i} className={`stat-card ${s.color}`}>
                <div className={`stat-icon ${s.color}`}><s.icon size={18} /></div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value">{s.value ?? '—'}</div>
                <div className="stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Fleet summary AI insight */}
          <div className="card" style={{ marginBottom: '16px' }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>Fleet Health Briefing</h3>
            <AIInsightCard title="Fleet Insight" text={summary?.ai_insight} loading={loading} />
          </div>

          {/* Executive Summary — last 7 days, pulled from /reports/executive */}
          <div className="card" style={{ marginBottom: '16px', border: '1px solid #e0e7ff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Sparkles size={16} style={{ color: '#7c3aed' }} />
              <h3 className="chart-title" style={{ marginBottom: 0 }}>Executive Summary</h3>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                {executive?.period || 'Last 7 days'}
              </span>
            </div>
            {executive && (
              <div style={{ display: 'flex', gap: 16, marginTop: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Vehicles: <strong>{executive.fleet?.activeVehicles}/{executive.fleet?.totalVehicles}</strong> active
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Fuel: <strong>{parseFloat(executive.fuel?.totalLitres || 0).toFixed(1)} L</strong> · ₹{parseFloat(executive.fuel?.totalCost || 0).toFixed(0)}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Trips: <strong>{executive.trips?.totalTrips}</strong> · {parseFloat(executive.trips?.totalKm || 0).toFixed(1)} km
                </span>
              </div>
            )}
            <AIInsightCard title="Weekly Executive Summary" text={executive?.ai_insight} loading={execLoading} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="card">
              <h3 className="chart-title" style={{ marginBottom: '14px' }}>Fuel Report</h3>
              {fuelReport && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={rowStyle}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total Records</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand)', fontWeight: 700 }}>{fuelReport.records}</span>
                  </div>
                  <div style={rowStyle}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total Litres</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--blue)', fontWeight: 700 }}>{parseFloat(fuelReport.totalLitres).toFixed(1)} L</span>
                  </div>
                  <div style={rowStyle}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total Cost</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--green)', fontWeight: 700 }}>₹{parseFloat(fuelReport.totalCost).toFixed(2)}</span>
                  </div>
                </div>
              )}
              <AIInsightCard title="Fuel Insight" text={fuelReport?.ai_insight} loading={loading} />
            </div>

            <div className="card">
              <h3 className="chart-title" style={{ marginBottom: '14px' }}>Trip Report</h3>
              {tripReport && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={rowStyle}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Completed Trips</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand)', fontWeight: 700 }}>{tripReport.totalTrips}</span>
                  </div>
                  <div style={rowStyle}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total Distance</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--blue)', fontWeight: 700 }}>{parseFloat(tripReport.totalKm || 0).toFixed(1)} km</span>
                  </div>
                  <div style={rowStyle}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Avg Distance / Trip</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--green)', fontWeight: 700 }}>
                      {tripReport.totalTrips > 0 ? (tripReport.totalKm / tripReport.totalTrips).toFixed(1) : 0} km
                    </span>
                  </div>
                </div>
              )}
              <AIInsightCard title="Trip Insight" text={tripReport?.ai_insight} loading={loading} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="card">
              <h3 className="chart-title" style={{ marginBottom: '8px' }}>Vehicle Status Distribution</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={fleetStatusData} cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={4} dataKey="value">
                    {fleetStatusData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 className="chart-title" style={{ marginBottom: '8px' }}>Driver Status Distribution</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={driverStatusData} cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={4} dataKey="value">
                    {driverStatusData.map((_, i) => <Cell key={i} fill={COLORS[i + 1]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  )
}