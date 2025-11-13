import { apiClient } from './apiClient'

export interface WelcomeMessageConfig {
  guildId: string
  enabled: boolean
  channelId: string | null
  sendAsDM: boolean
  messageType: 'text' | 'embed'
  messageContent: string | null
  embedTitle: string | null
  embedDescription: string | null
  embedColor: string | null
  embedThumbnail: string | null
  embedImage: string | null
  embedFooter: string | null
}

export const welcomeMessageService = {
  async getConfig(guildId: string): Promise<WelcomeMessageConfig | null> {
    const response = await apiClient.get('/api/welcome-message/config', {
      params: { guildId },
    })
    return response.data
  },

  async saveConfig(config: WelcomeMessageConfig): Promise<void> {
    await apiClient.post('/api/welcome-message/config', config)
  },

  async deleteConfig(guildId: string): Promise<void> {
    await apiClient.delete('/api/welcome-message/config', {
      params: { guildId },
    })
  },
}

