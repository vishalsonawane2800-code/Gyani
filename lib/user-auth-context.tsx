'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

// Separate from the admin AuthProvider on purpose — this one wraps the
// public site, has no forced redirects, and uses its own localStorage key
// so the two sessions don't interfere.

export interface SiteUser {
  id: string
  email: string
  name: string
}

interface UserAuthContextType {
  user: SiteUser | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, name: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

const UserAuthContext = createContext<UserAuthContextType | undefined>(undefined)

const TOKEN_KEY = 'site_user_token'
const USER_KEY = 'site_user_profile'

export function UserAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SiteUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY)
      const storedUser = localStorage.getItem(USER_KEY)
      if (storedToken && storedUser) {
        setToken(storedToken)
        setUser(JSON.parse(storedUser) as SiteUser)
      }
    } catch {
      // ignore corrupted storage
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email: string, name: string) => {
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      })
      const data = await res.json()
      if (!res.ok) return { success: false, error: data.error || 'Login failed' }

      setToken(data.token)
      setUser(data.user)
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      return { success: true }
    } catch {
      return { success: false, error: 'Network error. Please try again.' }
    }
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }, [])

  return (
    <UserAuthContext.Provider
      value={{ user, token, isLoading, isAuthenticated: !!token, login, logout }}
    >
      {children}
    </UserAuthContext.Provider>
  )
}

export function useUserAuth() {
  const ctx = useContext(UserAuthContext)
  if (!ctx) throw new Error('useUserAuth must be used within a UserAuthProvider')
  return ctx
}
