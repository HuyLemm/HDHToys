import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api, getToken, setToken, type Staff } from './api'

interface AuthContextValue {
  staff: Staff | null
  loading: boolean
  login: (email: string, matKhau: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getToken()) {
      setLoading(false)
      return
    }
    api.auth
      .me()
      .then(setStaff)
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, matKhau: string) {
    const { token, staff: loggedInStaff } = await api.auth.login(email, matKhau)
    setToken(token)
    setStaff(loggedInStaff)
  }

  function logout() {
    setToken(null)
    setStaff(null)
  }

  return <AuthContext.Provider value={{ staff, loading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
