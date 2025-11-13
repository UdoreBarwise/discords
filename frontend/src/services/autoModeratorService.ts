import { apiClient } from './apiClient'

export interface AutoModeratorConfig {
  guildId: string
  enabled: boolean
  severityLevel: 'low' | 'medium' | 'high'
  whitelistWords: string[]
  blacklistWords: string[]
  whitelistUsers: string[]
  blacklistUsers: string[]
  whitelistChannels: string[]
  blacklistChannels: string[]
  whitelistRoles: string[]
  blacklistRoles: string[]
  actionOnViolation: 'delete' | 'warn' | 'timeout' | 'kick' | 'ban'
  warnOnViolation: boolean
  logChannelId: string | null
}

export const autoModeratorService = {
  async getConfig(guildId: string): Promise<AutoModeratorConfig> {
    const response = await apiClient.get('/api/auto-moderator/config', {
      params: { guildId },
    })
    return response.data
  },

  async saveConfig(config: AutoModeratorConfig): Promise<void> {
    await apiClient.post('/api/auto-moderator/config', config)
  },
}

