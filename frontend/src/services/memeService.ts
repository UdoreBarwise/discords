import { apiClient } from './apiClient'

export interface MemeConfig {
  guildId: string
  enabled: boolean
  channelId?: string
  autoDeleteMessages: boolean
  autoPostEnabled: boolean
  autoPostIntervalHours: number
}

export const memeService = {
  async getConfig(guildId: string): Promise<MemeConfig> {
    const response = await apiClient.get('/api/meme/config', {
      params: { guildId },
    })
    return response.data
  },

  async saveConfig(config: MemeConfig): Promise<void> {
    await apiClient.post('/api/meme/config', config)
  },
}

