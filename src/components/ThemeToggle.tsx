import { useLayoutEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const themeKey = 'habittism-theme'

function initialTheme() {
  try {
    const saved = localStorage.getItem(themeKey)
    if (saved === 'dark' || saved === 'light') return saved
  } catch { /* Use the system theme when preferences are unavailable. */ }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState(initialTheme)

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#1c231e' : '#f5f4ed')
  }, [theme])

  const next = theme === 'dark' ? 'light' : 'dark'
  const label = `Switch to ${next} mode`
  return (
    <button type="button" className="icon-button" aria-label={label} title={label} onClick={() => {
      setTheme(next)
      try { localStorage.setItem(themeKey, next) } catch { /* Keep the choice for this session. */ }
    }}>
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
