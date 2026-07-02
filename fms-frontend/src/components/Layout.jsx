import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard, Truck, Users, Route, Fuel, Wrench,
  FileText, Bell, BarChart3, MapPin, LogOut, ChevronLeft,
  ChevronRight, UserCog, History, AlertOctagon,
  ClipboardList, KeyRound
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

// ── Admin / Manager nav ──────────────────────────────────────────────────────
const ADMIN_NAV = [
  { section: 'OPERATIONS' },
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard',       end: true },
  { to: '/vehicles',    icon: Truck,           label: 'Vehicles'                   },
  { to: '/drivers',     icon: Users,           label: 'Drivers'                    },
  { to: '/trips',       icon: Route,           label: 'Trips'                      },
  { to: '/fuel',        icon: Fuel,            label: 'Fuel Logs'                  },
  { to: '/maintenance', icon: Wrench,          label: 'Maintenance'                },
  { to: '/documents',   icon: FileText,        label: 'Documents'                  },
  { to: '/alerts',      icon: Bell,            label: 'Alerts'                     },
  { section: 'ANALYTICS' },
  { to: '/gps',         icon: MapPin,          label: 'GPS Tracking'               },
  { to: '/reports',     icon: BarChart3,       label: 'Reports'                    },
  { section: 'SETTINGS' },
  { to: '/users',       icon: UserCog,         label: 'User Management', roles: ['admin'] },
]

// ── Manager nav (Fuel Logs → Reports removed) ────────────────────────────────
const MANAGER_NAV = [
  { section: 'OPERATIONS' },
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard',       end: true },
  { to: '/vehicles',    icon: Truck,           label: 'Vehicles'                   },
  { to: '/drivers',     icon: Users,           label: 'Drivers'                    },
  { to: '/trips',       icon: Route,           label: 'Trips'                      },
  { to: '/fuel',        icon: Fuel,            label: 'Fuel Logs'                  },
  { to: '/alerts',      icon: Bell,            label: 'Alerts'                     },
  { section: 'ANALYTICS' },
  { to: '/gps',         icon: MapPin,          label: 'GPS Tracking'               },
]

// ── Driver nav ───────────────────────────────────────────────────────────────
const DRIVER_NAV = [
  { section: 'MY WORKSPACE' },
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard',    end: true },
  { to: '/my-trips',     icon: ClipboardList,   label: 'My Trips'               },
  { to: '/trip-history', icon: History,         label: 'Trip History'           },
  { to: '/my-documents', icon: FileText,        label: 'Documents'              },
  { to: '/report-issue', icon: AlertOctagon,    label: 'Report Issue'           },
  { section: 'ACCOUNT' },
  { to: '/change-password', icon: KeyRound,      label: 'Change Password'        },
]

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuth()
  const toast    = useToast()
  const navigate = useNavigate()

  const role    = user?.role || 'driver'
  const isDriver = role === 'driver'
  const navList  = isDriver ? DRIVER_NAV : role === 'manager' ? MANAGER_NAV : ADMIN_NAV

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out')
    navigate('/login')
  }

  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1)
  const initials  = (user?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-canvas)' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: collapsed ? 64 : 240,
        minWidth: collapsed ? 64 : 240,
        background: 'var(--sidebar-bg)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.2s ease, min-width 0.2s ease',
        overflow: 'hidden', position: 'relative',
        borderRight: '1px solid var(--sidebar-border)',
      }}>

        {/* Brand */}
        <div style={{ padding: '18px 16px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--sidebar-border)', flexShrink: 0 }}>
          <div style={{ width: 34, height: 34, background: 'var(--brand)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Truck size={16} color="#fff" />
          </div>
          {!collapsed && (
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: '#f1f5f9', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
              FLEET<span style={{ color: 'var(--brand)' }}>OS</span>
            </span>
          )}
          {/* Collapse toggle */}
          <button onClick={() => setCollapsed(c => !c)} style={{
            marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
            color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 4, borderRadius: 6, flexShrink: 0,
          }}>
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '12px 0' }}>
          {navList.map((item, i) => {
            // Section header — hidden
            if (item.section) return null
            // Skip admin-only items for non-admin
            if (item.roles && !item.roles.includes(role)) return null

            const Icon = item.icon
            return (
              <NavLink key={item.to} to={item.to} end={item.end}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: collapsed ? '10px 0' : '9px 14px',
                  margin: '1px 8px', borderRadius: 8,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  textDecoration: 'none', transition: 'background 0.12s',
                  background: isActive ? 'var(--brand)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--sidebar-text)',
                })}>
                <Icon size={16} style={{ flexShrink: 0 }} />
                {!collapsed && (
                  <span style={{ fontSize: '0.87rem', fontWeight: 500, whiteSpace: 'nowrap' }}>{item.label}</span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* User info + logout */}
        <div style={{ borderTop: '1px solid var(--sidebar-border)', padding: '12px 10px', flexShrink: 0 }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.82rem', color: '#fff', flexShrink: 0 }}>
                {initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'User'}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--brand)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{roleLabel}</div>
              </div>
              {/* Online dot */}
              <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
            </div>
          )}
          <button onClick={handleLogout} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 8, padding: collapsed ? '8px 0' : '8px 10px', borderRadius: 8,
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#64748b', fontSize: '0.85rem', fontWeight: 500,
            transition: 'background 0.12s, color 0.12s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#f1f5f9' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#64748b' }}>
            <LogOut size={15} />
            {!collapsed && 'Logout'}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Top bar */}
        <header style={{
          height: 52, background: '#fff', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#16a34a' }}>LIVE</span>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </header>

        {/* Page content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}