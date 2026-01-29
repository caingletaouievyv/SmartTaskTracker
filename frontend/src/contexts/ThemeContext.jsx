import { createContext, useContext, useState, useEffect } from 'react'
import { settingsService } from '../services/settingsService'

const ThemeContext = createContext()

const ACCENT_COLORS = {
  gray: { primary: '#6c757d', name: 'Gray' },
  blue: { primary: '#0d6efd', name: 'Blue' },
  purple: { primary: '#6f42c1', name: 'Purple' },
  green: { primary: '#198754', name: 'Green' },
  orange: { primary: '#fd7e14', name: 'Orange' },
  red: { primary: '#dc3545', name: 'Red' },
  teal: { primary: '#20c997', name: 'Teal' }
}

const hexToRgb = (hex) => {
  if (!hex) return null
  const cleaned = hex.replace('#', '')
  const full = cleaned.length === 3
    ? cleaned.split('').map(c => c + c).join('')
    : cleaned
  if (full.length !== 6) return null
  const num = parseInt(full, 16)
  if (Number.isNaN(num)) return null
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `${r}, ${g}, ${b}`
}

const isAuthenticated = () => {
  return !!localStorage.getItem('token')
}

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  const [accentColor, setAccentColor] = useState('gray')

  useEffect(() => {
    if (!isAuthenticated()) return

    const loadTheme = async () => {
      try {
        const settings = await settingsService.get()
        if (settings) {
          const theme = settings.theme || 'dark'
          setIsDark(theme === 'dark')
          setAccentColor(settings.accentColor || 'gray')
        }
      } catch (err) {
        // Silently fail - use system preference
      }
    }
    loadTheme()
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  useEffect(() => {
    const color = ACCENT_COLORS[accentColor]?.primary || ACCENT_COLORS.gray.primary
    document.documentElement.style.setProperty('--bs-primary', color)
    const rgb = hexToRgb(color)
    if (rgb) {
      document.documentElement.style.setProperty('--bs-primary-rgb', rgb)
    }
  }, [accentColor])

  const toggleTheme = async () => {
    const newTheme = !isDark
    setIsDark(newTheme)
    if (!isAuthenticated()) return
    try {
      const currentSettings = await settingsService.get()
      await settingsService.update({
        ...currentSettings,
        theme: newTheme ? 'dark' : 'light'
      })
    } catch (err) {
      // Silently fail
    }
  }

  const updateAccentColor = async (color) => {
    setAccentColor(color)
    if (!isAuthenticated()) return
    try {
      const currentSettings = await settingsService.get()
      await settingsService.update({
        ...currentSettings,
        accentColor: color
      })
    } catch (err) {
      // Silently fail
    }
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, accentColor, setAccentColor: updateAccentColor, accentColors: ACCENT_COLORS }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
