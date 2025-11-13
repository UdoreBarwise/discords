import { apiClient } from './apiClient'

export interface YouTubeNotificationConfig {
  guildId: string
  enabled: boolean
  channelId: string | null
  checkIntervalMinutes: number
}

export interface YouTubeChannel {
  id: number
  guildId: string
  youtubeChannelId: string
  youtubeChannelName: string | null
  lastVideoId: string | null
  lastCheckedAt: string | null
}

export const youtubeNotificationService = {
  async getConfig(guildId: string): Promise<YouTubeNotificationConfig> {
    const response = await apiClient.get('/api/youtube-notifications/config', {
      params: { guildId },
    })
    return response.data
  },

  async saveConfig(config: YouTubeNotificationConfig): Promise<void> {
    await apiClient.post('/api/youtube-notifications/config', config)
  },

  async getChannels(guildId: string): Promise<YouTubeChannel[]> {
    const response = await apiClient.get('/api/youtube-notifications/channels', {
      params: { guildId },
    })
    return response.data
  },

  async addChannel(
    guildId: string,
    youtubeChannelId: string,
    youtubeChannelName?: string
  ): Promise<YouTubeChannel> {
    const response = await apiClient.post('/api/youtube-notifications/channels', {
      guildId,
      youtubeChannelId,
      youtubeChannelName,
    })
    return response.data.channel
  },

  async removeChannel(guildId: string, youtubeChannelId: string): Promise<void> {
    await apiClient.delete('/api/youtube-notifications/channels', {
      data: { guildId, youtubeChannelId },
    })
  },

  async testNotification(guildId: string, youtubeChannelId: string): Promise<void> {
    await apiClient.post('/api/youtube-notifications/test', {
      guildId,
      youtubeChannelId,
    })
  },

  async getLatestVideo(youtubeChannelId: string): Promise<any> {
    const response = await apiClient.get('/api/youtube-notifications/latest-video', {
      params: { youtubeChannelId },
    })
    return response.data.video
  },
}

