import { apiClient } from './apiClient'

export const botService = {
  async hasToken(): Promise<boolean> {
    try {
      const response = await apiClient.get<{ hasToken: boolean }>('/api/bot/token')
      return response.data.hasToken
    } catch (error) {
      console.error('Failed to check bot token:', error)
      return false
    }
  },

  async setToken(token: string): Promise<void> {
    try {
      await apiClient.post('/api/bot/token', { token })
    } catch (error) {
      console.error('Failed to save bot token:', error)
      throw error
    }
  },

  async deleteToken(): Promise<void> {
    try {
      await apiClient.delete('/api/bot/token')
    } catch (error) {
      console.error('Failed to delete bot token:', error)
      throw error
    }
  },

  async getDefaultServer(): Promise<string | null> {
    try {
      const response = await apiClient.get<{ serverId: string | null }>('/api/bot/default-server')
      return response.data.serverId
    } catch (error) {
      console.error('Failed to get default server:', error)
      return null
    }
  },

  async setDefaultServer(serverId: string | null): Promise<void> {
    try {
      await apiClient.post('/api/bot/default-server', { serverId })
    } catch (error) {
      console.error('Failed to save default server:', error)
      throw error
    }
  },

  async getErrorWebhook(): Promise<string> {
    try {
      const response = await apiClient.get<{ webhookUrl: string }>('/api/bot/error-webhook')
      return response.data.webhookUrl || ''
    } catch (error) {
      console.error('Failed to get error webhook:', error)
      return ''
    }
  },

  async setErrorWebhook(webhookUrl: string): Promise<void> {
    try {
      await apiClient.post('/api/bot/error-webhook', { webhookUrl })
    } catch (error) {
      console.error('Failed to save error webhook:', error)
      throw error
    }
  },

  async getAIResponseChannels(): Promise<string[]> {
    try {
      const response = await apiClient.get<{ channelIds: string[] }>('/api/bot/ai-response-channels')
      return response.data.channelIds || []
    } catch (error) {
      console.error('Failed to get AI response channels:', error)
      return []
    }
  },

  async setAIResponseChannels(channelIds: string[]): Promise<void> {
    try {
      await apiClient.post('/api/bot/ai-response-channels', { channelIds })
    } catch (error) {
      console.error('Failed to save AI response channels:', error)
      throw error
    }
  },

  async hasYouTubeApiKey(): Promise<boolean> {
    try {
      const response = await apiClient.get<{ hasApiKey: boolean }>('/api/bot/youtube-api-key')
      return response.data.hasApiKey
    } catch (error) {
      console.error('Failed to check YouTube API key:', error)
      return false
    }
  },

  async setYouTubeApiKey(apiKey: string): Promise<void> {
    try {
      await apiClient.post('/api/bot/youtube-api-key', { apiKey })
    } catch (error) {
      console.error('Failed to save YouTube API key:', error)
      throw error
    }
  },

  async deleteYouTubeApiKey(): Promise<void> {
    try {
      await apiClient.delete('/api/bot/youtube-api-key')
    } catch (error) {
      console.error('Failed to delete YouTube API key:', error)
      throw error
    }
  },
}

