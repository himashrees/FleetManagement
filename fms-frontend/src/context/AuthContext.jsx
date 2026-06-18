import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI, driverAPI } from '../services/api'

const AuthContext = createContext(null)

async function enrichWithDriverId(userData) {
  if (!userData || userData.role !== 'driver') return userData
  try {
    const res = await driverAPI.getAll()
    const drivers = res.data.data || []
    const myDriver = drivers.find(d => d.user_id === userData.id)
    if (myDriver) return { ...userData, driverId: myDriver.id, driverProfile: myDriver }
  } catch {}
  return userData
}

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authAPI.me()
      .then(r => enrichWithDriverId(r.data.data))
      .then(u => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const r    = await authAPI.login({ email, password })
    const enriched = await enrichWithDriverId(r.data.data)
    setUser(enriched)
    return enriched
  }

  const logout = async () => {
    await authAPI.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)