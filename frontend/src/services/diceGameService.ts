import { apiClient } from './apiClient'

export interface DiceGameConfig {
  guildId: string
  enabled: boolean
  channelId?: string
  userCooldownMinutes: number
}

export const diceGameService = {
  async getConfig(guildId: string): Promise<DiceGameConfig> {
    const response = await apiClient.get('/api/dice/config', {
      params: { guildId },
    })
    return response.data
  },

  async saveConfig(config: DiceGameConfig): Promise<void> {
    await apiClient.post('/api/dice/config', config)
  },
}

