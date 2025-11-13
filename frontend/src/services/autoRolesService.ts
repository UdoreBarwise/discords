import { apiClient } from './apiClient'

export interface ReactionRole {
  emoji: string
  roleId: string
  roleName?: string
}

export interface AutoRolesConfig {
  guildId: string
  channelId: string
  messageId?: string | null
  embedTitle?: string | null
  embedDescription?: string | null
  embedColor?: string | null
  reactionRoles: ReactionRole[]
}

export const autoRolesService = {
  async getConfig(guildId: string): Promise<AutoRolesConfig | null> {
    const response = await apiClient.get('/api/auto-roles/config', {
      params: { guildId },
    })
    return response.data
  },

  async saveConfig(config: AutoRolesConfig): Promise<void> {
    await apiClient.post('/api/auto-roles/config', config)
  },

  async sendMessage(guildId: string): Promise<string> {
    const response = await apiClient.post('/api/auto-roles/send', { guildId })
    return response.data.messageId
  },

  async deleteConfig(guildId: string): Promise<void> {
    await apiClient.delete('/api/auto-roles/config', {
      params: { guildId },
    })
  },
}

