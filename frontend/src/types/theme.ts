export interface ThemeColors {
  primary: string
  secondary: string
  background: string
  text: string
  heading: string
  card: string
  input: string
  border: string
  hover: string
  textSecondary: string
}

export interface ThemePreset {
  name: string
  description: string
  colors: ThemeColors
}

export interface ThemeConfig {
  colors: ThemeColors
}

