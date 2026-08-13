const STORAGE_KEY = 'kiosk-theme'

type Theme = 'light' | 'dark' | 'auto'

const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

function apply(theme: Theme) {
  const el = document.documentElement
  if (theme === 'auto') {
    const isDark = mediaQuery.matches
    el.setAttribute('data-theme', isDark ? 'dark' : 'light')
    el.style.colorScheme = isDark ? 'dark' : 'light'
  } else {
    el.setAttribute('data-theme', theme)
    el.style.colorScheme = theme
  }
}

function getSaved(): Theme {
  return (localStorage.getItem(STORAGE_KEY) as Theme) || 'auto'
}

export function getTheme(): Theme {
  return getSaved()
}

export function setTheme(theme: Theme) {
  localStorage.setItem(STORAGE_KEY, theme)
  apply(theme)
}

export function toggleTheme() {
  const current = getSaved()
  const next: Theme = current === 'auto' ? 'dark' : current === 'dark' ? 'light' : 'auto'
  setTheme(next)
  return next
}

export function initTheme() {
  const saved = getSaved()
  apply(saved)
  mediaQuery.addEventListener('change', () => {
    if (getSaved() === 'auto') {
      apply('auto')
    }
  })
}
