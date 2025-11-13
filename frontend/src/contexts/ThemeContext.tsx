import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { themeService } from '../services/themeService'
import { ThemeColors } from '../types/theme'

interface ThemeContextType {
  colors: ThemeColors
  updateColors: (colors: ThemeColors) => Promise<void>
  refreshColors: () => Promise<void>
}

const defaultColors: ThemeColors = {
  primary: '#4a9eff',
  secondary: '#1a1a1a',
  background: '#242424',
  text: '#ffffff',
  heading: '#4a9eff',
  card: '#2a2a2a',
  input: '#2a2a2a',
  border: '#333333',
  hover: '#3a3a3a',
  textSecondary: '#cccccc',
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colors, setColors] = useState<ThemeColors>(defaultColors)

  const applyColors = (themeColors: ThemeColors) => {
    const root = document.documentElement
    root.style.setProperty('--primary-color', themeColors.primary)
    root.style.setProperty('--secondary-color', themeColors.secondary)
    root.style.setProperty('--background-color', themeColors.background)
    root.style.setProperty('--text-color', themeColors.text)
    root.style.setProperty('--heading-color', themeColors.heading)
    root.style.setProperty('--card-bg', themeColors.card)
    root.style.setProperty('--input-bg', themeColors.input)
    root.style.setProperty('--border-color', themeColors.border)
    root.style.setProperty('--hover-bg', themeColors.hover)
    root.style.setProperty('--text-secondary', themeColors.textSecondary)
    setColors(themeColors)
  }

  useEffect(() => {
    // Load theme colors from backend on mount
    themeService.getThemeColors().then((savedColors) => {
      if (savedColors) {
        applyColors(savedColors)
      } else {
        applyColors(defaultColors)
      }
    })
  }, [])

  const updateColors = async (newColors: ThemeColors) => {
    try {
      await themeService.saveThemeColors(newColors)
      applyColors(newColors)
    } catch (error) {
      console.error('Failed to update colors:', error)
      throw error
    }
  }

  const refreshColors = async () => {
    const savedColors = await themeService.getThemeColors()
    if (savedColors) {
      applyColors(savedColors)
    }
  }

  return (
    <ThemeContext.Provider value={{ colors, updateColors, refreshColors }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

