import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemeProvider, useTheme } from '../ThemeContext'

function TestComponent() {
  const { isDark, toggleTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme">{isDark ? 'dark' : 'light'}</span>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  )
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('defaults to light theme', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme')).toHaveTextContent('light')
  })

  it('persists theme to localStorage', () => {
    const { rerender } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(localStorage.getItem('theme')).toBe('light')

    rerender(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )
  })

  it('loads theme from localStorage', () => {
    localStorage.setItem('theme', 'dark')

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
  })
})
