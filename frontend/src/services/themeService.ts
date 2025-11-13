import { apiClient } from './apiClient'
import { ThemeColors } from '../types/theme'

export const themeService = {
  async getThemeColors(): Promise<ThemeColors | null> {
    try {
      const response = await apiClient.get<{ colors: ThemeColors }>('/api/theme/colors')
      return response.data.colors
    } catch (error) {
      console.error('Failed to fetch theme colors:', error)
      return null
    }
  },

  async saveThemeColors(colors: ThemeColors): Promise<void> {
    try {
      await apiClient.post('/api/theme/colors', { colors })
    } catch (error) {
      console.error('Failed to save theme colors:', error)
      throw error
    }
  },
}

