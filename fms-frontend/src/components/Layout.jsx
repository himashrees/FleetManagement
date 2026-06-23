import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { LayoutDashboard, Truck, Users, Route, Fuel, Wrench, FileText, Bell, BarChart3, MapPin, LogOut, ChevronLeft, ChevronRight, Shield, Brain, UserCog, History, AlertOctagon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

// Full nav list with role visibility tags
const ALL_NAV = [
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard',      end: true,  roles: ['admin', 'manager', 'driver'] },
  { to: '/vehicles',    icon: Truck,           label: 'Vehicles',                   roles: ['admin', 'manager'] },
  { to: '/drivers',     icon: Users,           label: 'Drivers',                    roles: ['admin', 'manager'] },
  { to: '/trips',       icon: Route,           label: 'Trips',                      roles: ['admin', 'manager'] },
  { to: '/my-trips',    icon: Route,           label: 'My Trips',                   roles: ['driver'] },
  { to: '/trip-history',icon: History,         label: 'Trip History',               roles: ['driver'] },
  { to: '/my-vehicle',  icon: Truck,           label: 'My Vehicle',                 roles: ['driver'] },
  { to: '/report-issue',icon: AlertOctagon,    label: 'Report Issue',               roles: ['driver'] },
  { to: '/fuel',        icon: Fuel,            label: 'Fuel Logs',                  roles: ['admin', 'manager'] },
  { to: '/maintenance', icon: Wrench,          label: 'Maintenance',                roles: ['admin', 'manager'] },
  { to: '/documents',   icon: FileText,        label: 'Documents',                  roles: ['admin', 'manager'] },
  { to: '/alerts',      icon: Bell,            label: 'Alerts',                     roles: ['admin', 'manager'] },
  { to: '/gps',         icon: MapPin,          label: 'GPS Tracking',               roles: ['admin', 'manager'] },
  { to: '/reports',     icon: BarChart3,       label: 'Reports',                    roles: ['admin', 'manager'] },
  { to: '/ml',          icon: Brain,           label: 'ML Insights',                roles: ['admin', 'manager'] },
  { to: '/users',       icon: UserCog,         label: 'User Management',            roles: ['admin'] },
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

  return (
    <div className={`layout ${collapsed ? 'collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon"><Truck size={18} /></div>
          {!collapsed && <span className="brand-name">FLEET<span>OS</span></span>}
          <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
        <div className="sidebar-section-label">{!collapsed && (role === 'driver' ? 'MY WORKSPACE' : 'OPERATIONS')}</div>
        <nav className="sidebar-nav">
          {nav.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={collapsed ? item.label : ''}>
              <item.icon size={17} className="nav-icon" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar"><Shield size={14} /></div>
            {!collapsed && (
              <div className="user-details">
                <div className="user-name">{user?.name}</div>
                <div className="user-role">{user?.role?.toUpperCase()}</div>
              </div>
            )}
          </div>
          <button className="btn-icon" onClick={handleLogout} title="Logout"><LogOut size={15} /></button>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div className="topbar-left">
            <div className="live-indicator"><span className="live-dot" /><span>LIVE</span></div>
          </div>
          <div className="topbar-right">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  )
}