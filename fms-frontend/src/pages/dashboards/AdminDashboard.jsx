import { useState, useEffect } from 'react'
import { Truck, Users, Route, Wrench, AlertTriangle, Fuel } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { reportAPI, alertAPI, tripAPI, fuelAPI, vehicleAPI } from '../../services/api'
import { LoadingState, EmptyState } from '../../components/Common'

const PIE_COLORS = ['#1d4ed8', '#d97706', '#16a34a', '#7c3aed', '#dc2626']

const tt = {
  contentStyle: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
  labelStyle: { color: '#0f172a', fontWeight: 600 },
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
        setTrips(t.data.data   || [])
        setFuelLogs(f.data.data || [])
        setVehicles(v.data.data || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  /* ── Real chart data ── */

  // Fuel by month from actual logs
  const fuelByMonth = {}
  fuelLogs.forEach(f => {
    if (!f.filled_at) return
    const month = new Date(f.filled_at).toLocaleString('en-IN', { month: 'short' })
    fuelByMonth[month] = (fuelByMonth[month] || 0) + (f.litres || 0)
  })
  const realFuelData = Object.entries(fuelByMonth).map(([month, litres]) => ({ month, litres: parseFloat(litres.toFixed(1)) }))

  // Trips by day of week from actual trips
  const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const tripsByDay = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 }
  trips.forEach(t => {
    if (!t.start_time) return
    const day = new Date(t.start_time).toLocaleString('en-US', { weekday: 'short' })
    if (tripsByDay[day] !== undefined) tripsByDay[day]++
  })
  const realTripsData = dayOrder.map(day => ({ day, trips: tripsByDay[day] }))
  const hasAnyTrips = trips.length > 0

  // Fleet status pie from real vehicles
  const statusCount = { Active: 0, Maintenance: 0, Inactive: 0, Retired: 0 }
  vehicles.forEach(v => {
    if (v.status === 'active')      statusCount.Active++
    else if (v.status === 'maintenance') statusCount.Maintenance++
    else if (v.status === 'inactive')    statusCount.Inactive++
    else if (v.status === 'retired')     statusCount.Retired++
  })
  const pieData = Object.entries(statusCount)
    .filter(([, val]) => val > 0)
    .map(([name, value]) => ({ name, value }))

  // Fuel cost this month
  const fuelCostMonth = fuelLogs
    .filter(f => f.filled_at && new Date(f.filled_at) >= new Date(new Date().setDate(1)))
    .reduce((s, f) => s + parseFloat(f.total_cost || 0), 0)

  // Top fuel consuming vehicles
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
    { label: 'Total Vehicles',    value: summary.totalVehicles,    sub: `${summary.activeVehicles} active`,      icon: Truck,         color: 'blue'  },
    { label: 'Total Drivers',     value: summary.totalDrivers,     sub: `${summary.availableDrivers} available`,  icon: Users,         color: 'blue'  },
    { label: 'Active Trips',      value: trips.filter(t => t.status === 'in_progress').length, sub: 'right now', icon: Route,         color: 'green' },
    { label: 'Fuel Cost (Month)', value: `₹${fuelCostMonth.toFixed(0)}`, sub: 'this month',                      icon: Fuel,          color: 'amber' },
    { label: 'Maintenance Due',   value: summary.maintenanceDue,   sub: 'vehicles overdue',                       icon: Wrench,        color: summary.maintenanceDue > 0 ? 'red' : 'green' },
    { label: 'Alerts',            value: alerts.length,            sub: 'unread',                                 icon: AlertTriangle, color: alerts.length > 0 ? 'red' : 'green' },
  ] : []

  return (
    <div className="page-enter">
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="live-badge"><span className="live-dot" /> System Online</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      {loading ? <LoadingState label="Fetching fleet summary…" /> : (
        <>
          {/* ── 6 Stat Cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginBottom: 16 }}>
            {stats.map((s, i) => (
              <div key={i} className={`stat-card ${s.color}`} style={{ padding: '16px 14px' }}>
                <div className={`stat-icon ${s.color}`}><s.icon size={16} /></div>
                <div className="stat-label" style={{ fontSize: '0.7rem' }}>{s.label}</div>
                <div className="stat-value" style={{ fontSize: '1.5rem' }}>{s.value ?? '—'}</div>
                <div className="stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Charts Row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

            {/* Fuel Consumption — real data */}
            <div className="chart-card">
              <div className="chart-header">
                <div>
                  <div className="chart-title">Fuel Consumption</div>
                  <div className="chart-sub">litres / month</div>
                </div>
              </div>
              {realFuelData.length === 0 ? (
                <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: 'var(--text-muted)' }}>
                  <Fuel size={28} style={{ opacity: 0.25 }} />
                  <p style={{ fontSize: '0.83rem' }}>No fuel logs yet — add a fill-up to see the chart</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={realFuelData}>
                    <defs>
                      <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#1d4ed8" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...tt} itemStyle={{ color: '#1d4ed8' }} />
                    <Area type="monotone" dataKey="litres" stroke="#1d4ed8" fill="url(#fuelGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Trips This Week — real data */}
            <div className="chart-card">
              <div className="chart-header">
                <div>
                  <div className="chart-title">Trips This Week</div>
                  <div className="chart-sub">daily count</div>
                </div>
              </div>
              {!hasAnyTrips ? (
                <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: 'var(--text-muted)' }}>
                  <Route size={28} style={{ opacity: 0.25 }} />
                  <p style={{ fontSize: '0.83rem' }}>No trips recorded yet — start a trip to see the chart</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={realTripsData} barSize={22}>
                    <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip {...tt} itemStyle={{ color: '#16a34a' }} />
                    <Bar dataKey="trips" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── Bottom Row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1fr', gap: 16 }}>

            {/* Fleet Status Pie — real data */}
            <div className="chart-card">
              <div className="chart-title" style={{ marginBottom: 8 }}>Fleet Status</div>
              {pieData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.83rem' }}>
                  <Truck size={28} style={{ opacity: 0.25, marginBottom: 8 }} />
                  <p>No vehicles added yet</p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={68} paddingAngle={3} dataKey="value">
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip {...tt} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 6 }}>
                    {pieData.map((d, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: PIE_COLORS[i] }} />
                        {d.name}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

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
                    }}>
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
                <div className="chart-title" style={{ marginBottom: 10 }}>Top Fuel Consuming</div>
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