import { apiClient } from './apiClient'

export type SportType = 'f1' | 'nba' | 'nfl' | 'soccer'
export type F1DataType = 'session_start' | 'session_end' | 'position_change' | 'lap_time' | 'weather_update' | 'team_radio' | 'race_start' | 'race_end'

export interface SportsConfig {
  guildId: string
  enabled: boolean
  sportType: SportType
  channelIds: string[] | null
  allowedRoleIds: string[] | null
  blockedUserIds: string[] | null
  roleListType: 'whitelist' | 'blacklist' | null
  dataTypes: F1DataType[]
  updateIntervalMinutes: number
  mentionRoleId: string | null
}

export const sportsService = {
  async getConfig(guildId: string, sportType: SportType): Promise<SportsConfig | null> {
    try {
      const response = await apiClient.get('/api/sports/config', {
        params: { guildId, sportType },
      })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get sports config')
    }
  },

  async getAllConfigs(guildId: string): Promise<SportsConfig[]> {
    try {
      const response = await apiClient.get('/api/sports/configs', {
        params: { guildId },
      })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get sports configs')
    }
  },

  async saveConfig(config: SportsConfig): Promise<void> {
    try {
      await apiClient.post('/api/sports/config', config)
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to save sports config')
    }
  },

  async deleteConfig(guildId: string, sportType: SportType): Promise<void> {
    try {
      await apiClient.delete('/api/sports/config', {
        params: { guildId, sportType },
      })
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to delete sports config')
    }
  },
}

