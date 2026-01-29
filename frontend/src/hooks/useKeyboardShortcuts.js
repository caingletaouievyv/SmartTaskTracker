import { useEffect } from 'react'

export function useKeyboardShortcuts(shortcuts) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in input, textarea, or contenteditable
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      ) {
        return
      }

      const key = e.key.toLowerCase()
      const handler = shortcuts[key]
      
      if (handler) {
        e.preventDefault()
        handler()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}
