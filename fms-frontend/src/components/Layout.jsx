import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { LayoutDashboard, Truck, Users, Route, Fuel, Wrench, FileText, Bell, BarChart3, MapPin, LogOut, ChevronLeft, ChevronRight, Brain, UserCog } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const ALL_NAV = [
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard',     end: true,  roles: ['admin', 'manager', 'driver'] },
  { to: '/vehicles',    icon: Truck,           label: 'Vehicles',                  roles: ['admin', 'manager'] },
  { to: '/drivers',     icon: Users,           label: 'Drivers',                   roles: ['admin', 'manager'] },
  { to: '/trips',       icon: Route,           label: 'Trips',                     roles: ['admin', 'manager'] },
  { to: '/my-trips',    icon: Route,           label: 'My Trips',                  roles: ['driver'] },
  { to: '/my-vehicle',  icon: Truck,           label: 'My Vehicle',                roles: ['driver'] },
  { to: '/fuel',        icon: Fuel,            label: 'Fuel Logs',                 roles: ['admin', 'manager', 'driver'] },
  { to: '/maintenance', icon: Wrench,          label: 'Maintenance',               roles: ['admin', 'manager'] },
  { to: '/documents',   icon: FileText,        label: 'Documents',                 roles: ['admin', 'manager', 'driver'] },
  { to: '/alerts',      icon: Bell,            label: 'Alerts',                    roles: ['admin', 'manager', 'driver'] },
  { to: '/gps',         icon: MapPin,          label: 'GPS Tracking',              roles: ['admin', 'manager'] },
  { to: '/reports',     icon: BarChart3,       label: 'Reports',                   roles: ['admin', 'manager'] },
  { to: '/ml',          icon: Brain,           label: 'ML Insights',               roles: ['admin', 'manager'] },
  { to: '/users',       icon: UserCog,         label: 'User Management',           roles: ['admin'] },
]

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const role = user?.role || 'driver'
  const nav = ALL_NAV.filter(item => item.roles.includes(role))

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out')
    navigate('/login')
  }

  const initials = (user?.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="app-shell">
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo"><Truck size={18} /></div>
          {!collapsed && <span className="sidebar-title">FLEET<span>OS</span></span>}
          <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>

        {!collapsed && <div className="sidebar-section">{role === 'driver' ? 'My Workspace' : 'Operations'}</div>}

        <nav className="sidebar-nav">
          {nav.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} title={collapsed ? item.label : ''}>
              <item.icon size={17} className="nav-icon" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-pill">
            <div className="user-avatar">{initials}</div>
            {!collapsed && (
              <div style={{ minWidth: 0 }}>
                <div className="user-name">{user?.name}</div>
                <div className="user-role">{user?.role?.toUpperCase()}</div>
              </div>
            )}
          </div>
          <button className="btn-logout" onClick={handleLogout} title="Logout"><LogOut size={15} /></button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <div className="live-badge"><span className="live-dot" /><span>LIVE</span></div>
          </div>
          <div className="topbar-right">
            <span className="topbar-breadcrumb">
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </header>
        <main className="page-canvas"><Outlet /></main>
      </div>
    </div>
  )
}