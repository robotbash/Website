'use client'

import * as React from 'react'

interface ThemeProviderProps {
  children: React.ReactNode
  attribute?: string
  defaultTheme?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
}

export function ThemeProvider({
  children,
  attribute = 'class',
  defaultTheme = 'system',
  enableSystem = true,
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)

    const applyTheme = (theme: string) => {
      const root = document.documentElement
      root.classList.remove('light', 'dark')

      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        root.classList.add(systemTheme)
        if (attribute === 'class') root.setAttribute('data-theme', systemTheme)
      } else {
        root.classList.add(theme)
        if (attribute === 'class') root.setAttribute('data-theme', theme)
      }
    }

    const stored = localStorage.getItem('theme') ?? defaultTheme
    applyTheme(stored)

    if (enableSystem && stored === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => applyTheme('system')
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [attribute, defaultTheme, enableSystem])

  if (!mounted) return <>{children}</>
  return <>{children}</>
}
