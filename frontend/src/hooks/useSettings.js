import { useState, useEffect, useRef } from 'react'
import { settingsService } from '../services/settingsService'
import { defaultSettings } from '../pages/Settings'

const FONT_SIZES = {
  small: { base: '0.875rem', small: '0.75rem', h5: '0.95rem' },
  medium: { base: '1rem', small: '0.875rem', h5: '1.1rem' },
  large: { base: '1.125rem', small: '1rem', h5: '1.25rem' }
}

export function useSettings() {
  const [settings, setSettings] = useState(defaultSettings)
  const [loading, setLoading] = useState(true)
  const fetchRef = useRef(null)

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const data = await settingsService.get()
      setSettings({
        ...defaultSettings,
        ...data,
        exportFields: { ...defaultSettings.exportFields, ...(data.exportFields || {}) },
        uiFields: { ...defaultSettings.uiFields, ...(data.uiFields || {}) },
        searchFields: { ...defaultSettings.searchFields, ...(data.searchFields || {}) },
        keyboardShortcuts: { ...defaultSettings.keyboardShortcuts, ...(data.keyboardShortcuts || {}) }
      })
    } catch (err) {
      console.error('Failed to load settings:', err)
    } finally {
      setLoading(false)
    }
  }

  fetchRef.current = fetchSettings
  useEffect(() => {
    fetchSettings()
  }, [])

  useEffect(() => {
    const onServerBack = () => fetchRef.current?.()
    window.addEventListener('server-back', onServerBack)
    return () => window.removeEventListener('server-back', onServerBack)
  }, [])

  // Apply font size to document
  useEffect(() => {
    const fontSize = settings.fontSize || 'medium'
    const sizes = FONT_SIZES[fontSize] || FONT_SIZES.medium
    document.documentElement.style.setProperty('--font-size-base', sizes.base)
    document.documentElement.style.setProperty('--font-size-small', sizes.small)
    document.documentElement.style.setProperty('--font-size-h5', sizes.h5)
  }, [settings.fontSize])

  return { settings, loading }
}
