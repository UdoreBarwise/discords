import { apiClient } from './apiClient'

export interface XNotificationConfig {
  guildId: string
  enabled: boolean
  channelId: string | null
  checkIntervalMinutes: number
}

export interface XAccount {
  id: number
  guildId: string
  xUsername: string
  xDisplayName: string | null
  lastTweetId: string | null
  lastCheckedAt: string | null
}

export const xNotificationService = {
  async getConfig(guildId: string): Promise<XNotificationConfig> {
    const response = await apiClient.get('/api/x-notifications/config', {
      params: { guildId },
    })
    return response.data
  },

  async saveConfig(config: XNotificationConfig): Promise<void> {
    await apiClient.post('/api/x-notifications/config', config)
  },

  async getAccounts(guildId: string): Promise<XAccount[]> {
    const response = await apiClient.get('/api/x-notifications/accounts', {
      params: { guildId },
    })
    return response.data
  },

  async addAccount(guildId: string, xUsername: string): Promise<XAccount> {
    const response = await apiClient.post('/api/x-notifications/accounts', {
      guildId,
      xUsername,
    })
    return response.data.account
  },

  async removeAccount(guildId: string, xUsername: string): Promise<void> {
    await apiClient.delete('/api/x-notifications/accounts', {
      data: { guildId, xUsername },
    })
  },

  async testNotification(guildId: string, xUsername: string): Promise<void> {
    await apiClient.post('/api/x-notifications/test', {
      guildId,
      xUsername,
    })
  },

  async getLatestTweet(xUsername: string): Promise<any> {
    const response = await apiClient.get('/api/x-notifications/latest-tweet', {
      params: { xUsername },
    })
    return response.data.tweet
  },
}


