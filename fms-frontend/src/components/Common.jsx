export function LoadingState({ label = 'Loading data…' }) {
  return (
    <div className="loading-state">
      <div className="spinner" />
      <span style={{ fontFamily: 'var(--font-mono)' }}>{label}</span>
    </div>
  )
}

export function EmptyState({ icon = '◌', title = 'Nothing here yet', sub = '' }) {
  return (
    <div className="empty-state">
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
