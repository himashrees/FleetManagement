import { useAuth } from '../context/AuthContext'
import AdminDashboard from './dashboards/AdminDashboard'
import ManagerDashboard from './dashboards/ManagerDashboard'
import DriverDashboard from './dashboards/DriverDashboard'

export default function Dashboard() {
  const { user } = useAuth()

  if (user?.role === 'manager') return <ManagerDashboard />
  if (user?.role === 'driver')  return <DriverDashboard />
  return <AdminDashboard />
}