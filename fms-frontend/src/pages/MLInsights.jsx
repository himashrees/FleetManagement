import { useState, useEffect } from 'react'
import { Brain, Fuel, Wrench, AlertTriangle, TrendingUp, TrendingDown, Minus, RefreshCw, Info } from 'lucide-react'
import { vehicleAPI, fuelAPI, maintenanceAPI } from '../services/api'
import { mlFuelAPI, mlMaintenanceAPI } from '../services/mlApi'
import { useToast } from '../context/ToastContext'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { LoadingState, PageHeader } from '../components/Common'

const tooltipStyle = {
  contentStyle: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
}

export default function MLInsights() {
  const [vehicles, setVehicles] = useState([])
  const [fuelPredictions, setFuelPredictions] = useState([])
  const [maintenancePredictions, setMaintenancePredictions] = useState([])
  const [loading, setLoading] = useState(true)
  const [mlOnline, setMlOnline] = useState(false)
  const toast = useToast()

  const checkML = async () => {
    try {
      const res = await fetch('http://localhost:8000/health')
      setMlOnline(res.ok)
      return res.ok
    } catch {
      setMlOnline(false)
      return false
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const online = await checkML()
      if (!online) { setLoading(false); return }

      const [vRes, fRes, mRes] = await Promise.all([
        vehicleAPI.getAll({ status: 'active' }),
        fuelAPI.getAll({}),
        maintenanceAPI.getAll({}),
      ])

      const vList = vRes.data.data || []
      const fList = fRes.data.data || []
      const mList = mRes.data.data || []
      setVehicles(vList)

      const fuelRequests = vList.map(v => ({
        vehicle_id: v.id,
        fuel_logs: fList
          .filter(f => f.vehicle_id === v.id)
          .map(f => ({
            vehicle_id: f.vehicle_id,
            litres: f.litres,
            odometer_km: f.odometer_km || 0,
            filled_at: f.filled_at || f.createdAt,
            fuel_type: f.fuel_type || 'diesel',
          })),
        predict_days: 30,
      }))

      const fuelRes = await mlFuelAPI.predictBatch(fuelRequests)
      setFuelPredictions(fuelRes.data)

      const maintRequests = vList.map(v => ({
        vehicle_id: v.id,
        registration_no: v.registration_no,
        current_odometer_km: v.odometer_km || 0,
        last_service_date: null,
        maintenance_records: mList
          .filter(m => m.vehicle_id === v.id)
          .map(m => ({
            type: m.type,
            completed_date: m.completed_date,
            odometer_km: m.odometer_km,
            cost: m.cost,
            next_due_km: m.next_due_km,
            next_due_date: m.next_due_date,
          })),
      }))

      const maintRes = await mlMaintenanceAPI.predictBatch(maintRequests)
      setMaintenancePredictions(maintRes.data)

    } catch (err) {
      toast.error('Failed to load ML predictions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const riskColor = { low: 'var(--green)', medium: 'var(--amber)', high: 'var(--red)', critical: 'var(--red)' }
  const riskBadge = { low: 'badge-green', medium: 'badge-amber', high: 'badge-red', critical: 'badge-red' }
  const trendIcon = { improving: TrendingDown, stable: Minus, degrading: TrendingUp }
  const trendColor = { improving: 'var(--green)', stable: 'var(--blue)', degrading: 'var(--red)' }

  const totalPredictedCostFuel = fuelPredictions.reduce((s, p) => s + (p.predicted_cost_inr || 0), 0)
  const totalPredictedCostMaint = maintenancePredictions.reduce((s, p) => s + (p.estimated_cost_inr || 0), 0)
  const criticalVehicles = maintenancePredictions.filter(p => p.risk_level === 'critical' || p.risk_level === 'high')

  // Predictions made with < 2 fuel logs fall back to fleet-average estimates
  // (the ML service flags this via the "anomalies" field + low confidence).
  const isEstimate = (p) => (p.anomalies || []).some(a => a.toLowerCase().includes('insufficient data')) || p.confidence <= 0.3
  const estimatedCount = fuelPredictions.filter(isEstimate).length

  return (
    <div className="page-enter">
      <PageHeader title="ML" accent="Insights" sub="AI-powered predictions for fuel, maintenance and anomalies">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: mlOnline ? 'var(--green)' : 'var(--red)', display: 'inline-block' }} />
          <span style={{ color: mlOnline ? 'var(--green)' : 'var(--red)' }}>ML Service {mlOnline ? 'Online' : 'Offline'}</span>
        </div>
        <button className="btn-icon" onClick={loadData} title="Refresh"><RefreshCw size={14} /></button>
      </PageHeader>

      {!mlOnline && !loading && (
        <div className="notice notice-red" style={{ marginBottom: '20px' }}>
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 700, marginBottom: '6px' }}>ML Service Offline</div>
            <div style={{ fontSize: '0.85rem', marginBottom: '8px' }}>
              Start the ML service to enable predictions:
            </div>
            <code style={{ display: 'block', padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius)', fontSize: '0.8rem', color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>
              cd fms-ml &amp;&amp; pip install -r requirements.txt &amp;&amp; python main.py
            </code>
          </div>
        </div>
      )}

      {mlOnline && !loading && (
        <>
          {estimatedCount > 0 && (
            <div className="notice notice-blue" style={{ marginBottom: '20px' }}>
              <Info size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              <div>
                <strong>{estimatedCount} of {fuelPredictions.length} vehicle{fuelPredictions.length > 1 ? 's' : ''}</strong> {estimatedCount > 1 ? 'have' : 'has'} fewer than 2 fuel log entries, so the figures below are <strong>fleet-average estimates</strong>, not real predictions.
                Log a couple of fuel fill-ups for each vehicle on the <strong>Fuel Logs</strong> page to get accurate, vehicle-specific forecasts.
              </div>
            </div>
          )}

          <div className="stats-grid" style={{ marginBottom: '20px' }}>
            <div className="stat-card amber">
              <div className="stat-label">Predicted Fuel Cost (30d)</div>
              <div className="stat-value">₹{totalPredictedCostFuel.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
              <div className="stat-sub">
                across {vehicles.length} vehicles
                {estimatedCount > 0 && <span className="badge badge-blue" style={{ marginLeft: '8px' }}>ESTIMATE</span>}
              </div>
            </div>
            <div className="stat-card red">
              <div className="stat-label">Maintenance Cost Due</div>
              <div className="stat-value">₹{totalPredictedCostMaint.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
              <div className="stat-sub">estimated pending</div>
            </div>
            <div className="stat-card red">
              <div className="stat-label">High Risk Vehicles</div>
              <div className="stat-value">{criticalVehicles.length}</div>
              <div className="stat-sub">need immediate attention</div>
            </div>
            <div className="stat-card green">
              <div className="stat-label">Fleet Health Score</div>
              <div className="stat-value">
                {maintenancePredictions.length > 0
                  ? Math.round(100 - (maintenancePredictions.reduce((s, p) => s + p.risk_score, 0) / maintenancePredictions.length))
                  : '—'}%
              </div>
              <div className="stat-sub">overall fleet condition</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div className="chart-card">
              <div className="chart-title" style={{ marginBottom: '16px' }}>Predicted Fuel (30 Days) — Litres</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={fuelPredictions.slice(0, 8).map(p => ({
                  vehicle: vehicles.find(v => v.id === p.vehicle_id)?.registration_no?.slice(-6) || `V${p.vehicle_id}`,
                  litres: p.predicted_litres_next_period,
                }))}>
                  <XAxis dataKey="vehicle" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipStyle} itemStyle={{ color: '#d97706' }} />
                  <Bar dataKey="litres" fill="#d97706" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <div className="chart-title" style={{ marginBottom: '16px' }}>Vehicle Risk Overview</div>
              {maintenancePredictions.length === 0 ? (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No maintenance data yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '4px 0' }}>
                  {maintenancePredictions.slice(0, 6).map((p, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600 }}>{p.registration_no}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: riskColor[p.risk_level] }}>{p.risk_score} · {p.risk_level}</span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--bg-canvas)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${p.risk_score}%`, height: '100%', background: riskColor[p.risk_level], borderRadius: '4px', transition: 'width 0.3s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="chart-title" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wrench size={15} color="var(--amber)" /> Maintenance Risk Predictions
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Risk Level</th>
                    <th>Risk Score</th>
                    <th>Overdue Items</th>
                    <th>Est. Cost</th>
                    <th>Next Service</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenancePredictions.map((p, i) => (
                    <tr key={i}>
                      <td><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand)', fontWeight: 600 }}>{p.registration_no}</span></td>
                      <td>
                        <span className={`badge ${riskBadge[p.risk_level]}`}>{p.risk_level}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '6px', background: 'var(--bg-canvas)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${p.risk_score}%`, height: '100%', background: riskColor[p.risk_level], borderRadius: '3px' }} />
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', minWidth: '32px' }}>{p.risk_score}</span>
                        </div>
                      </td>
                      <td>
                        {p.overdue_items.length === 0
                          ? <span style={{ color: 'var(--green)', fontSize: '0.8rem' }}>None</span>
                          : <span style={{ color: 'var(--red)', fontSize: '0.8rem' }}>{p.overdue_items.length} item{p.overdue_items.length > 1 ? 's' : ''}</span>
                        }
                      </td>
                      <td><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>₹{p.estimated_cost_inr.toLocaleString('en-IN')}</span></td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: p.predicted_next_service_days === 0 ? 'var(--red)' : 'var(--text-muted)' }}>
                          {p.predicted_next_service_days === 0 ? 'Now' : `${p.predicted_next_service_days}d`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="chart-title" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Fuel size={15} color="var(--amber)" /> Fuel Consumption Predictions (Next 30 Days)
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Avg L/km</th>
                    <th>Predicted Litres</th>
                    <th>Predicted Cost</th>
                    <th>Efficiency Trend</th>
                    <th>Next Fillup</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {fuelPredictions.map((p, i) => {
                    const TrendIcon = trendIcon[p.efficiency_trend] || Minus
                    const v = vehicles.find(vv => vv.id === p.vehicle_id)
                    return (
                      <tr key={i}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand)', fontWeight: 600 }}>{v?.registration_no || `V${p.vehicle_id}`}</span>
                            {isEstimate(p) && <span className="badge badge-blue" title="Fewer than 2 fuel logs — using fleet-average estimate">EST</span>}
                          </div>
                        </td>
                        <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{p.avg_consumption_per_km}</span></td>
                        <td><span style={{ fontFamily: 'var(--font-mono)' }}>{p.predicted_litres_next_period} L</span></td>
                        <td><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)' }}>₹{p.predicted_cost_inr.toLocaleString('en-IN')}</span></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: trendColor[p.efficiency_trend] }}>
                            <TrendIcon size={13} />
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', textTransform: 'capitalize' }}>{p.efficiency_trend}</span>
                          </div>
                        </td>
                        <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.next_fillup_estimate_days}d</span></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ flex: 1, height: '4px', background: 'var(--bg-canvas)', borderRadius: '2px', overflow: 'hidden', minWidth: '50px' }}>
                              <div style={{ width: `${p.confidence * 100}%`, height: '100%', background: 'var(--blue)', borderRadius: '2px' }} />
                            </div>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--blue)' }}>{Math.round(p.confidence * 100)}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {loading && <LoadingState label="Running ML predictions…" />}
    </div>
  )
}