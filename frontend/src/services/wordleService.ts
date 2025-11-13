import { apiClient } from './apiClient'

export interface WordleConfig {
  guildId: string
  enabled: boolean
  channelId?: string
  allowedRoleIds?: string[]
  allowedUserIds?: string[]
  dmOnly: boolean
  userCooldownMinutes: number
}

export const wordleService = {
  async getConfig(guildId: string): Promise<WordleConfig> {
    const response = await apiClient.get('/api/wordle/config', {
      params: { guildId },
    })
    return response.data
  },

  async saveConfig(config: WordleConfig): Promise<void> {
    await apiClient.post('/api/wordle/config', config)
  },
}

