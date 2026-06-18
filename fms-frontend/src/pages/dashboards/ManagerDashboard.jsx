import { useState, useEffect } from 'react'
import { Truck, Users, Route, Wrench, AlertTriangle, Fuel, MapPin } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { reportAPI, alertAPI, vehicleAPI, driverAPI, tripAPI, maintenanceAPI, fuelAPI } from '../../services/api'
import { LoadingState, EmptyState } from '../../components/Common'
import { useAuth } from '../../context/AuthContext'

const demoFuelWeek = [
  { day:'W1', cost:18000 },{ day:'W2', cost:24000 },
  { day:'W3', cost:21000 },{ day:'W4', cost:28000 },
]

const tt = {
  contentStyle:{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'12px' },
  labelStyle:{ color:'#0f172a', fontWeight:600 },
}

export default function ManagerDashboard() {
  const { user }  = useAuth()
  const [summary,   setSummary]   = useState(null)
  const [alerts,    setAlerts]    = useState([])
  const [vehicles,  setVehicles]  = useState([])
  const [drivers,   setDrivers]   = useState([])
  const [trips,     setTrips]     = useState([])
  const [upcoming,  setUpcoming]  = useState([])
  const [fuelLogs,  setFuelLogs]  = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      reportAPI.summary(),
      alertAPI.getAll({ is_read: false }),
      vehicleAPI.getAll(),
      driverAPI.getAll(),
      tripAPI.getAll(),
      maintenanceAPI.getUpcoming(),
      fuelAPI.getAll(),
    ])
      .then(([s, a, v, d, t, m, f]) => {
        setSummary(s.data.data)
        setAlerts(a.data.data?.slice(0, 5) || [])
        setVehicles(v.data.data || [])
        setDrivers(d.data.data || [])
        setTrips(t.data.data || [])
        setUpcoming(m.data.data?.slice(0, 5) || [])
        setFuelLogs(f.data.data || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const fuelMonth = fuelLogs.reduce((s, f) => s + parseFloat(f.total_cost || 0), 0)
  const activeTrips = trips.filter(t => t.status === 'in_progress')
  const driversAvailable = drivers.filter(d => d.status === 'available').length
  const driversOnTrip    = drivers.filter(d => d.status === 'on_trip').length

  const severityBadge = { low:'badge-blue', medium:'badge-amber', high:'badge-red', critical:'badge-red' }

  const stats = [
    { label:'My Vehicles',    value: vehicles.length,       sub:`${vehicles.filter(v=>v.status==='active').length} active`,  icon:Truck,         color:'blue'  },
    { label:'My Drivers',     value: drivers.length,        sub:`${driversAvailable} available`,                              icon:Users,         color:'blue'  },
    { label:'Active Trips',   value: activeTrips.length,    sub:'in progress now',                                            icon:Route,         color:'green' },
    { label:'Fuel Cost (Month)', value:`₹${(fuelMonth/1000).toFixed(0)}K`, sub:'this month',                                  icon:Fuel,          color:'amber' },
    { label:'Maintenance',    value: upcoming.length,       sub:'upcoming scheduled',                                         icon:Wrench,        color: upcoming.length > 0 ? 'amber' : 'green' },
    { label:'Alerts',         value: alerts.length,         sub:'unread',                                                     icon:AlertTriangle, color: alerts.length > 0 ? 'red' : 'green' },
  ]

  return (
    <div className="page-enter">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'1.5rem', fontWeight:700 }}>
            Operations <span style={{ color:'var(--brand)' }}>Dashboard</span>
          </h1>
          <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', marginTop:2 }}>
            Today's fleet activity — what needs your attention
          </p>
        </div>
        <span className="live-badge"><span className="live-dot" /> Live</span>
      </div>

      {loading ? <LoadingState label="Loading operations data…" /> : (
        <>
          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12, marginBottom:16 }}>
            {stats.map((s, i) => (
              <div key={i} className={`stat-card ${s.color}`} style={{ padding:'16px 14px' }}>
                <div className={`stat-icon ${s.color}`}><s.icon size={16} /></div>
                <div className="stat-label" style={{ fontSize:'0.7rem' }}>{s.label}</div>
                <div className="stat-value" style={{ fontSize:'1.4rem' }}>{s.value}</div>
                <div className="stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Active Trips + Fuel Chart */}
          <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:16, marginBottom:16 }}>
            <div className="chart-card">
              <div className="chart-header">
                <div className="chart-title">Today's Trips</div>
                <MapPin size={14} color="var(--brand)" />
              </div>
              {trips.filter(t => t.status !== 'cancelled').length === 0
                ? <EmptyState icon="🗺️" title="No trips today" sub="All vehicles are idle" />
                : (
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {trips.filter(t => t.status !== 'cancelled').slice(0, 6).map(t => (
                      <div key={t.id} style={{
                        padding:'9px 12px', background:'var(--bg-canvas)',
                        borderRadius:'var(--radius)', display:'flex',
                        justifyContent:'space-between', alignItems:'center',
                      }}>
                        <div>
                          <span style={{ fontFamily:'var(--font-mono)', color:'var(--brand)', fontWeight:600, fontSize:'0.82rem' }}>
                            {t.vehicle?.registration_no || `#${t.vehicle_id}`}
                          </span>
                          <div style={{ fontSize:'0.75rem', color:'var(--text-secondary)', marginTop:1 }}>
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
                )
              }
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <div>
                  <div className="chart-title">Fuel Usage (This Month)</div>
                  <div className="chart-sub">weekly cost ₹</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={demoFuelWeek} barSize={28}>
                  <XAxis dataKey="day" tick={{ fill:'#94a3b8', fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:'#94a3b8', fontSize:11 }} axisLine={false} tickLine={false} />
                  <Tooltip {...tt} formatter={v => [`₹${v.toLocaleString()}`, 'Cost']} />
                  <Bar dataKey="cost" fill="#7c3aed" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Maintenance + Alerts */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div className="chart-card">
              <div className="chart-header">
                <div className="chart-title">Upcoming Maintenance</div>
                <Wrench size={14} color="var(--amber)" />
              </div>
              {upcoming.length === 0
                ? <EmptyState icon="✓" title="Nothing scheduled" sub="No upcoming maintenance" />
                : upcoming.map(m => (
                  <div key={m.id} style={{
                    padding:'9px 12px', background:'var(--bg-canvas)',
                    borderRadius:'var(--radius)', display:'flex',
                    justifyContent:'space-between', alignItems:'center', marginBottom:6,
                  }}>
                    <div>
                      <span style={{ fontFamily:'var(--font-mono)', color:'var(--amber)', fontWeight:600, fontSize:'0.82rem' }}>
                        {m.vehicle?.registration_no || `#${m.vehicle_id}`}
                      </span>
                      <div style={{ fontSize:'0.74rem', color:'var(--text-muted)' }}>{m.type?.replace('_',' ')}</div>
                    </div>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.76rem', color:'var(--text-muted)' }}>
                      {m.scheduled_date}
                    </span>
                  </div>
                ))
              }
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <div className="chart-title">Recent Alerts</div>
                {alerts.length > 0 && <span className="badge badge-red"><AlertTriangle size={10} /> {alerts.length}</span>}
              </div>
              {alerts.length === 0
                ? <EmptyState icon="✓" title="All clear" sub="No unread alerts" />
                : alerts.map(a => (
                  <div key={a.id} style={{
                    padding:'9px 12px', background:'var(--bg-canvas)',
                    borderRadius:'var(--radius)',
                    borderLeft:`3px solid ${a.severity === 'critical' || a.severity === 'high' ? 'var(--red)' : 'var(--amber)'}`,
                    display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6,
                  }}>
                    <div>
                      <div style={{ fontSize:'0.84rem', fontWeight:600 }}>{a.title}</div>
                      <div style={{ fontSize:'0.73rem', color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>{a.type}</div>
                    </div>
                    <span className={`badge ${severityBadge[a.severity] || 'badge-amber'}`}>{a.severity}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </>
      )}
    </div>
  )
}