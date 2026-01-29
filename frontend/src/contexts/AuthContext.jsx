import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const refreshToken = localStorage.getItem('refreshToken')
    const userId = localStorage.getItem('userId')
    const username = localStorage.getItem('username')
    
    if (token && refreshToken && userId && username) {
      setUser({ id: userId, username })
    }
    setLoading(false)
  }, [])

  const login = (token, refreshToken, userId, username) => {
    localStorage.setItem('token', token)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('userId', userId.toString())
    localStorage.setItem('username', username)
    // Clear all notification storage keys (user-specific and legacy)
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('taskNotificationsNotified')) {
        sessionStorage.removeItem(key)
      }
    })
    setUser({ id: userId, username })
  }

  const logout = () => {
    const userId = localStorage.getItem('userId')
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('userId')
    localStorage.removeItem('username')
    // Clear all notification storage keys (user-specific and legacy)
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('taskNotificationsNotified')) {
        sessionStorage.removeItem(key)
      }
    })
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

