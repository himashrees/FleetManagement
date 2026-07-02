import { useState, useEffect, useRef } from 'react'
import { Truck, Users, Route, Wrench, AlertTriangle, Fuel, TrendingUp } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid
} from 'recharts'
import { reportAPI, alertAPI, tripAPI, fuelAPI, vehicleAPI } from '../../services/api'
import { LoadingState, EmptyState, KpiCards } from '../../components/Common'

const PIE_COLORS = ['#1d4ed8', '#d97706', '#16a34a', '#7c3aed', '#dc2626']

/* ── Shared KPI color palette (matches Vehicles page glow cards) ── */
const KPI_PALETTE = {
  blue:  { accent: '#1d4ed8', bg: '#dbeafe', border: '#bfdbfe', glow: 'rgba(29,78,216,0.20)' },
  green: { accent: '#16a34a', bg: '#dcfce7', border: '#bbf7d0', glow: 'rgba(22,163,74,0.20)' },
  sky:   { accent: '#0284c7', bg: '#e0f2fe', border: '#bae6fd', glow: 'rgba(2,132,199,0.20)' },
  amber: { accent: '#d97706', bg: '#fef3c7', border: '#fde68a', glow: 'rgba(217,119,6,0.20)' },
  red:   { accent: '#dc2626', bg: '#fee2e2', border: '#fecaca', glow: 'rgba(220,38,38,0.20)' },
}

const tt = {
  contentStyle: {
    background: '#fff', border: '1px solid #e2e8f0',
    borderRadius: '10px', fontSize: '12px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    padding: '8px 14px',
  },
  labelStyle: { color: '#0f172a', fontWeight: 700, marginBottom: 4 },
  cursor: { fill: 'rgba(29,78,216,0.04)' },
}

/* ── Custom Fuel Tooltip ── */
function FuelTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0',
      borderRadius: 10, padding: '8px 14px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      fontSize: 12,
    }}>
      <p style={{ fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{label}</p>
      <p style={{ color: '#1d4ed8', fontWeight: 600 }}>⛽ {payload[0].value} L</p>
    </div>
  )
}

/* ── Custom Trips Tooltip ── */
function TripsTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0',
      borderRadius: 10, padding: '8px 14px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      fontSize: 12,
    }}>
      <p style={{ fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{label}</p>
      <p style={{ color: '#16a34a', fontWeight: 600 }}>🚛 {payload[0].value} trip{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  )
}

/* ── Custom Bar shape with rounded top + gradient ── */
function GradientBar(props) {
  const { x, y, width, height, value } = props
  if (!value) return null
  const r = 5
  return (
    <g>
      <defs>
        <linearGradient id={`barGrad-${x}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16a34a" stopOpacity={1} />
          <stop offset="100%" stopColor="#4ade80" stopOpacity={0.7} />
        </linearGradient>
      </defs>
      <path
        d={`M${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} L${x},${y + height} Z`}
        fill={`url(#barGrad-${x})`}
        filter="drop-shadow(0 2px 4px rgba(22,163,74,0.3))"
      />
    </g>
  )
}

export default function AdminDashboard() {
  const [summary,  setSummary]  = useState(null)
  const [alerts,   setAlerts]   = useState([])
  const [trips,    setTrips]    = useState([])
  const [fuelLogs, setFuelLogs] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([
      reportAPI.summary(),
      alertAPI.getAll({ is_read: false }),
      tripAPI.getAll(),
      fuelAPI.getAll(),
      vehicleAPI.getAll(),
    ])
      .then(([s, a, t, f, v]) => {
        setSummary(s.data.data)
        setAlerts(a.data.data?.slice(0, 5) || [])
        setTrips(t.data.data || [])
        setFuelLogs(f.data.data || [])
        setVehicles(v.data.data || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  /* ── Fuel by day (current week) ── */
  const fuelDayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const startOfWeek = new Date()
  const dow = (startOfWeek.getDay() + 6) % 7 // Mon=0 ... Sun=6
  startOfWeek.setDate(startOfWeek.getDate() - dow)
  startOfWeek.setHours(0, 0, 0, 0)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(endOfWeek.getDate() + 7)

  const fuelByDay = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 }
  fuelLogs.forEach(f => {
    if (!f.filled_at) return
    const d = new Date(f.filled_at)
    if (d < startOfWeek || d >= endOfWeek) return
    const day = d.toLocaleString('en-US', { weekday: 'short' })
    if (fuelByDay[day] !== undefined) fuelByDay[day] += (f.litres || 0)
  })
  const realFuelData = fuelDayOrder.map(day => ({
    month: day, litres: parseFloat(fuelByDay[day].toFixed(1))
  }))

  /* ── Trips by day of week (current week only) ── */
  const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const tripsByDay = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 }
  trips.forEach(t => {
    if (!t.start_time) return
    const d = new Date(t.start_time)
    if (d < startOfWeek || d >= endOfWeek) return
    const day = d.toLocaleString('en-US', { weekday: 'short' })
    if (tripsByDay[day] !== undefined) tripsByDay[day]++
  })
  const realTripsData = dayOrder.map(day => ({ day, trips: tripsByDay[day] }))
  const maxTrips = Math.max(...realTripsData.map(d => d.trips), 1)
  const hasAnyTrips = trips.length > 0

  /* ── Fleet status pie ── */
  const statusCount = { Active: 0, Maintenance: 0, Inactive: 0, Retired: 0 }
  vehicles.forEach(v => {
    if (v.status === 'active')           statusCount.Active++
    else if (v.status === 'maintenance') statusCount.Maintenance++
    else if (v.status === 'inactive')    statusCount.Inactive++
    else if (v.status === 'retired')     statusCount.Retired++
  })
  const pieData = Object.entries(statusCount)
    .filter(([, val]) => val > 0)
    .map(([name, value]) => ({ name, value }))

  /* ── Fuel cost this month ── */
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const fuelCostMonth = fuelLogs
    .filter(f => f.filled_at && new Date(f.filled_at) >= startOfMonth)
    .reduce((s, f) => s + parseFloat(f.total_cost || 0), 0)

  /* ── Top fuel consuming vehicles ── */
  const vehicleFuelMap = {}
  fuelLogs.forEach(f => {
    vehicleFuelMap[f.vehicle_id] = (vehicleFuelMap[f.vehicle_id] || 0) + (f.litres || 0)
  })
  const topFuelVehicles = Object.entries(vehicleFuelMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([vid, litres]) => {
      const veh = vehicles.find(v => String(v.id) === String(vid))
      return { label: veh?.registration_no || `Vehicle #${vid}`, litres: parseFloat(litres.toFixed(1)) }
    })

  const recentTrips = trips.slice(0, 5)
  const severityBadge = { low: 'badge-blue', medium: 'badge-amber', high: 'badge-red', critical: 'badge-red' }

  const stats = summary ? [
    { label: 'Total Vehicles',    value: summary.totalVehicles,                                     sub: `${summary.activeVehicles} active`,     Icon: Truck,         ...KPI_PALETTE.blue },
    { label: 'Total Drivers',     value: summary.totalDrivers,                                      sub: `${summary.availableDrivers} available`, Icon: Users,         ...KPI_PALETTE.sky },
    { label: 'Active Trips',      value: trips.filter(t => t.status === 'in_progress').length,       sub: 'right now',                            Icon: Route,         ...KPI_PALETTE.green },
    { label: 'Fuel Cost (Month)', value: `₹${fuelCostMonth.toFixed(0)}`,                             sub: 'this month',                           Icon: Fuel,          ...KPI_PALETTE.amber },
    { label: 'Maintenance Due',   value: summary.maintenanceDue,                                     sub: 'vehicles overdue',                     Icon: Wrench,        ...KPI_PALETTE[summary.maintenanceDue > 0 ? 'red' : 'green'] },
    { label: 'Alerts',            value: alerts.length,                                              sub: 'unread',                               Icon: AlertTriangle, ...KPI_PALETTE[alerts.length > 0 ? 'red' : 'green'] },
  ] : []

  return (
    <div className="page-enter">
      {/* pulse-ring keyframe injected once */}
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.7; }
          70%  { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes bar-rise {
          from { transform: scaleY(0); transform-origin: bottom; }
          to   { transform: scaleY(1); transform-origin: bottom; }
        }
        @keyframes badge-pop {
          0%   { transform: scale(0.6); opacity: 0; }
          60%  { transform: scale(1.12); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes shimmer-sweep {
          0%   { background-position: -150% 0; }
          100% { background-position: 250% 0; }
        }
        .chart-card {
          animation: none;
          transition: transform 0.28s cubic-bezier(0.34,1.3,0.64,1), box-shadow 0.28s ease, border-color 0.28s ease;
          position: relative;
          overflow: hidden;
        }
        .chart-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 32px rgba(15,23,42,0.1), 0 4px 10px rgba(15,23,42,0.06);
          border-color: rgba(29,78,216,0.25);
        }
        .chart-card::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(29,78,216,0.5), transparent);
          background-size: 200% 100%;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .chart-card:hover::after {
          opacity: 1;
          animation: shimmer-sweep 1.6s linear infinite;
        }
        .chart-card .recharts-bar-rectangle {
          transition: filter 0.18s ease, transform 0.18s ease;
          transform-origin: bottom;
        }
        .chart-card .recharts-bar-rectangle:hover {
          filter: brightness(1.12);
          transform: scaleY(1.015);
          cursor: pointer;
        }
        .chart-badge-pop { animation: badge-pop 0.45s cubic-bezier(0.34,1.3,0.64,1); }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>
            Fleet <span style={{ color: 'var(--brand)' }}>Dashboard</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 2 }}>
            Complete fleet overview — every vehicle, driver, and metric
          </p>
        </div>
      </div>

      {loading ? <LoadingState label="Fetching fleet summary…" /> : (
        <>
          {/* ── 6 Stat Cards ── */}
          <KpiCards stats={stats} columns={6} />

          {/* ── Charts Row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

            {/* ── Fuel Consumption — improved ── */}
            <div className="chart-card">
              <div className="chart-header" style={{ marginBottom: 4 }}>
                <div>
                  <div className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Fuel size={15} style={{ color: '#1d4ed8' }} />
                    Fuel Consumption
                  </div>
                  <div className="chart-sub">litres per day · current week</div>
                </div>
                {realFuelData.some(d => d.litres > 0) && (
                  <div className="chart-badge-pop" style={{
                    fontSize: '0.75rem', fontWeight: 700,
                    background: 'var(--brand-light)', color: 'var(--brand)',
                    padding: '3px 10px', borderRadius: 99,
                  }}>
                    {realFuelData.reduce((s, d) => s + d.litres, 0).toFixed(0)} L total
                  </div>
                )}
              </div>

              {!realFuelData.some(d => d.litres > 0) ? (
                <div style={{ height: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: 'var(--text-muted)' }}>
                  <Fuel size={28} style={{ opacity: 0.25 }} />
                  <p style={{ fontSize: '0.83rem' }}>No fuel logs yet — add a fill-up to see the chart</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={realFuelData} barSize={32} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      {realFuelData.map((d, i) => (
                        <linearGradient key={i} id={`fuelBar${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor="#1d4ed8" stopOpacity={1} />
                          <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.75} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      axisLine={false} tickLine={false}
                      tickFormatter={v => `${v}L`}
                    />
                    <Tooltip content={<FuelTooltip />} cursor={{ fill: 'rgba(29,78,216,0.05)', radius: 6 }} />
                    <Bar dataKey="litres" radius={[6, 6, 0, 0]} animationDuration={900} animationEasing="ease-out">
                      {realFuelData.map((_, i) => (
                        <Cell key={i} fill={`url(#fuelBar${i})`}
                          style={{ filter: 'drop-shadow(0 2px 5px rgba(29,78,216,0.3))' }}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* ── Trips This Week — improved ── */}
            <div className="chart-card">
              <div className="chart-header" style={{ marginBottom: 4 }}>
                <div>
                  <div className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TrendingUp size={15} style={{ color: '#16a34a' }} />
                    Trips This Week
                  </div>
                  <div className="chart-sub">daily count · current week</div>
                </div>
                {hasAnyTrips && (
                  <div className="chart-badge-pop" style={{
                    fontSize: '0.75rem', fontWeight: 700,
                    background: 'var(--green-bg)', color: 'var(--green)',
                    padding: '3px 10px', borderRadius: 99,
                  }}>
                    {trips.length} total trips
                  </div>
                )}
              </div>

              {!hasAnyTrips ? (
                <div style={{ height: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: 'var(--text-muted)' }}>
                  <Route size={28} style={{ opacity: 0.25 }} />
                  <p style={{ fontSize: '0.83rem' }}>No trips recorded yet — start a trip to see the chart</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={realTripsData} barSize={28} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      {realTripsData.map((d, i) => (
                        <linearGradient key={i} id={`tripGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor={d.trips === maxTrips ? '#16a34a' : '#4ade80'} stopOpacity={1} />
                          <stop offset="100%" stopColor={d.trips === maxTrips ? '#16a34a' : '#86efac'} stopOpacity={0.7} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      axisLine={false} tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<TripsTooltip />} cursor={{ fill: 'rgba(22,163,74,0.05)', radius: 6 }} />
                    <Bar dataKey="trips" radius={[6, 6, 0, 0]} animationDuration={900} animationEasing="ease-out">
                      {realTripsData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.trips === maxTrips ? '#16a34a' : '#86efac'}
                          style={{ filter: entry.trips === maxTrips ? 'drop-shadow(0 3px 6px rgba(22,163,74,0.4))' : 'none' }}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── Bottom Row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>

            {/* Recent Trips */}
            <div className="chart-card">
              <div className="chart-header">
                <div className="chart-title">Recent Trips</div>
                <span className="badge badge-blue">{trips.length} total</span>
              </div>
              {recentTrips.length === 0 ? (
                <EmptyState icon="🗺️" title="No trips yet" sub="Start a trip to see it here" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {recentTrips.map(t => (
                    <div key={t.id} style={{
                      padding: '9px 12px', background: 'var(--bg-canvas)',
                      borderRadius: 'var(--radius)', display: 'flex',
                      justifyContent: 'space-between', alignItems: 'center',
                      transition: 'background 0.15s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-canvas)'}
                    >
                      <div>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand)', fontWeight: 600, fontSize: '0.8rem' }}>
                          #{t.id}
                        </span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 1 }}>
                          {t.start_location || '—'} → {t.end_location || '—'}
                        </div>
                      </div>
                      <span className={`badge ${
                        t.status === 'completed'   ? 'badge-green' :
                        t.status === 'in_progress' ? 'badge-blue'  : 'badge-slate'
                      }`}>
                        {t.status === 'in_progress' ? 'On-Going' : t.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Fuel + Alerts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Top Fuel Consuming */}
              <div className="chart-card" style={{ flex: 1 }}>
                <div className="chart-title" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Fuel size={13} style={{ color: 'var(--amber)' }} />
                  Top Fuel Consuming
                </div>
                {topFuelVehicles.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
                    No fuel data yet
                  </div>
                ) : (
                  topFuelVehicles.map((v, i) => (
                    <div key={v.label} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '7px 0',
                      borderBottom: i < topFuelVehicles.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--brand)' }}>
                        {v.label}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600 }}>
                        {v.litres} L
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Recent Alerts */}
              <div className="chart-card" style={{ flex: 1 }}>
                <div className="chart-header">
                  <div className="chart-title">Recent Alerts</div>
                  {alerts.length > 0 && (
                    <span className="badge badge-red">
                      <AlertTriangle size={10} /> {alerts.length}
                    </span>
                  )}
                </div>
                {alerts.length === 0 ? (
                  <EmptyState icon="✓" title="All clear" sub="No unread alerts" />
                ) : (
                  alerts.slice(0, 3).map(a => (
                    <div key={a.id} style={{
                      padding: '8px 10px', background: 'var(--bg-canvas)',
                      borderRadius: 'var(--radius)',
                      borderLeft: `3px solid ${a.severity === 'critical' || a.severity === 'high' ? 'var(--red)' : 'var(--amber)'}`,
                      marginBottom: 6,
                    }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{a.title}</div>
                      <span className={`badge ${severityBadge[a.severity] || 'badge-amber'}`} style={{ marginTop: 3 }}>
                        {a.severity}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}