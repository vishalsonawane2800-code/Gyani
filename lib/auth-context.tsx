'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface AuthContextType {
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  mustResetPassword: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string; mustResetPassword?: boolean }>
  logout: () => void
  resetPassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
  getAuthHeaders: () => Record<string, string>
  authFetch: (url: string, options?: RequestInit) => Promise<Response>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = 'admin_token'
const MUST_RESET_KEY = 'admin_must_reset'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mustResetPassword, setMustResetPassword] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Check for existing token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    const storedMustReset = localStorage.getItem(MUST_RESET_KEY) === 'true'
    if (storedToken) {
      setToken(storedToken)
      setMustResetPassword(storedMustReset)
    }
    setIsLoading(false)
  }, [])

  // Redirect logic
  useEffect(() => {
    if (isLoading) return

    const isLoginPage = pathname === '/admin/login'
    const isResetPage = pathname === '/admin/reset-password'

    if (!token && !isLoginPage) {
      // Not logged in and not on login page -> redirect to login
      router.push('/admin/login')
    } else if (token && mustResetPassword && !isResetPage && !isLoginPage) {
      // Logged in but must reset password -> redirect to reset page
      router.push('/admin/reset-password')
    } else if (token && !mustResetPassword && (isLoginPage || isResetPage)) {
      // Logged in and doesn't need to reset -> redirect to dashboard
      router.push('/admin')
    }
  }, [token, isLoading, pathname, mustResetPassword, router])

  const login = useCallback(async (username: string, password: string) => {
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed' }
      }

      setToken(data.token)
      setMustResetPassword(data.mustResetPassword || false)
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(MUST_RESET_KEY, String(data.mustResetPassword || false))

      return { success: true, mustResetPassword: data.mustResetPassword }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' }
    }
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setMustResetPassword(false)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(MUST_RESET_KEY)
    router.push('/admin/login')
  }, [router])

  const resetPassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!token) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        // The API expects snake_case + an explicit confirm_password field.
        // Sending camelCase here previously caused every reset attempt to
        // fail with "Current password, new password, and confirm password
        // are required".
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to reset password' }
      }

      // Update token if a new one was returned
      if (data.token) {
        setToken(data.token)
        localStorage.setItem(TOKEN_KEY, data.token)
      }
      
      setMustResetPassword(false)
      localStorage.setItem(MUST_RESET_KEY, 'false')

      return { success: true }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' }
    }
  }, [token])

  const getAuthHeaders = useCallback(() => {
    if (!token) return {}
    return { 'Authorization': `Bearer ${token}` }
  }, [token])

  // Authenticated fetch wrapper - automatically adds auth headers and handles 401
  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers)
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
    })

    // If unauthorized, logout and redirect
    if (response.status === 401) {
      logout()
      throw new Error('Session expired. Please login again.')
    }

    return response
  }, [token, logout])

  const value = {
    token,
    isAuthenticated: !!token,
    isLoading,
    mustResetPassword,
    login,
    logout,
    resetPassword,
    getAuthHeaders,
    authFetch,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
