export function LoadingState({ label = 'Loading data…' }) {
  return (
    <div className="loading-state">
      <div className="spinner" />
      <span style={{ fontFamily: 'var(--font-mono)' }}>{label}</span>
    </div>
  )
}

export function EmptyState({ icon = '◌', title = 'Nothing here yet', sub = '', compact = false }) {
  return (
    <div className={`empty-state${compact ? ' compact' : ''}`}>
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      {sub && <div className="empty-sub">{sub}</div>}
    </div>
  )
}

export function PageHeader({ eyebrow, title, accent, sub, children }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title} {accent && <span className="accent">{accent}</span>}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  )
}

/* bump the alpha of an 'rgba(r,g,b,a)' string, e.g. for a stronger hover glow */
function withAlpha(rgba, alpha) {
  const m = /rgba?\(([^)]+)\)/.exec(rgba)
  if (!m) return rgba
  const [r, g, b] = m[1].split(',').map(p => p.trim())
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * KpiCards — the glowing stat-card row (originally built for the Vehicles page),
 * made reusable for any page. Every card carries a full, all-around ambient glow
 * in its own accent color (not just a top line / hover-only shadow), the icon
 * ring pulses continuously, and each card gently floats — so the row reads as
 * "alive" rather than static.
 *
 * stats: [{ label, value, Icon, sub, accent, bg, border, glow }]
 * columns: number of grid columns (defaults to stats.length)
 */
export function KpiCards({ stats, columns }) {
  const cols = columns || stats.length
  return (
    <>
      <style>{`
        @keyframes kpi-ring-pulse {
          0%   { transform: scale(1);    opacity: 0.55; }
          70%  { transform: scale(1.6);  opacity: 0; }
          100% { transform: scale(1.6);  opacity: 0; }
        }
        @keyframes kpi-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-3px); }
        }
        .kpi-card-outer {
          border-radius: var(--radius-lg);
          transition: box-shadow 0.25s, transform 0.25s;
        }
        .kpi-card-outer:hover { transform: translateY(-2px); }
        .kpi-card-inner {
          position: relative; overflow: hidden; cursor: default;
          border-radius: var(--radius-lg); height: 100%;
          animation: kpi-float 5s ease-in-out infinite;
        }
        .kpi-ring { opacity: 0; }
        .kpi-card-outer:hover .kpi-ring { animation: kpi-ring-pulse 2.2s ease-in-out infinite; }
        .kpi-card-outer:hover .kpi-icon-box { transform: scale(1.1); }
        .kpi-icon-box { transition: transform 0.2s; }
      `}</style>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14, marginBottom: 24 }}>
        {stats.map((s, i) => {
          const baseShadow  = `0 0 12px 0px ${withAlpha(s.glow, 0.18)}, 0 1px 3px rgba(15,23,42,0.04)`
          const hoverShadow = `0 0 20px 1px ${withAlpha(s.glow, 0.30)}, 0 8px 20px rgba(15,23,42,0.07)`
          return (
            <div key={s.label ?? i} className="kpi-card-outer" style={{ boxShadow: baseShadow, border: `1px solid ${s.border}`, borderRadius: 'var(--radius-lg)' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = hoverShadow }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = baseShadow }}
            >
              <div className="kpi-card-inner" style={{
                background: '#ffffff',
                padding: '20px 20px 18px',
                animationDelay: `${i * 0.15}s`,
              }}>
                {/* diagonal bg wash */}
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${s.bg}70 0%, transparent 55%)`, pointerEvents: 'none' }} />
                {/* top accent line */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${s.accent}, ${s.accent}60)` }} />

                {/* icon row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, position: 'relative' }}>
                  <div style={{ position: 'relative', display: 'inline-flex' }}>
                    <div className="kpi-icon-box" style={{
                      width: 44, height: 44, borderRadius: 'var(--radius-md)',
                      background: s.bg, border: `1.5px solid ${s.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: s.accent,
                      boxShadow: `0 2px 8px ${s.glow}`,
                      position: 'relative', zIndex: 1,
                    }}>
                      {s.Icon && <s.Icon size={19} strokeWidth={2} />}
                    </div>
                    <div className="kpi-ring" style={{
                      position: 'absolute', inset: -5, borderRadius: 'var(--radius-md)',
                      border: `2px solid ${s.accent}`, opacity: 0, pointerEvents: 'none',
                    }} />
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: '2.2rem',
                    fontWeight: 800, color: s.accent, lineHeight: 1,
                    letterSpacing: '-0.04em', position: 'relative',
                  }}>{s.value}</div>
                </div>

                {/* label + sub */}
                <div style={{ position: 'relative' }}>
                  <div style={{ fontSize: '0.73rem', fontWeight: 700, color: s.accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{s.label}</div>
                  {s.sub && <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 400 }}>{s.sub}</div>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}