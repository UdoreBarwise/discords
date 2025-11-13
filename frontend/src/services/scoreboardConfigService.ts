import { apiClient } from './apiClient'

export interface ScoreboardConfig {
  guildId: string
  enabled: boolean
  channelId?: string
  messageId?: string
  updateIntervalMinutes: number
  gameType: 'all' | 'dice' | 'wordle'
  limitPlayers: number
}

export const scoreboardConfigService = {
  async getConfig(guildId: string): Promise<ScoreboardConfig> {
    const response = await apiClient.get('/api/scoreboard/config', {
      params: { guildId },
    })
    return response.data
  },

  async saveConfig(config: ScoreboardConfig): Promise<void> {
    await apiClient.post('/api/scoreboard/config', config)
  },
}

