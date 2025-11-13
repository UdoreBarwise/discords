import { apiClient } from './apiClient'

export interface LevelingConfig {
  guildId: string
  enabled: boolean
  xpPerMessage: number
  xpPerReaction: number
  messageCooldownSeconds: number
  minMessageLength: number
  whitelistChannels: string[]
  blacklistChannels: string[]
  whitelistRoles: string[]
  blacklistRoles: string[]
  levelUpChannelId: string | null
  levelUpMessage: string | null
}

export interface UserLevel {
  guildId: string
  userId: string
  xp: number
  level: number
  totalMessages: number
  lastMessageAt: string | null
}

export interface LeaderboardEntry {
  userId: string
  xp: number
  level: number
  totalMessages: number
  rank: number
}

export interface LevelRoleReward {
  guildId: string
  level: number
  roleId: string
}

export const levelingService = {
  async getConfig(guildId: string): Promise<LevelingConfig> {
    const response = await apiClient.get('/api/leveling/config', {
      params: { guildId },
    })
    return response.data
  },

  async saveConfig(config: LevelingConfig): Promise<void> {
    await apiClient.post('/api/leveling/config', config)
  },

  async getUserLevel(guildId: string, userId: string): Promise<UserLevel> {
    const response = await apiClient.get('/api/leveling/user', {
      params: { guildId, userId },
    })
    return response.data
  },

  async getLeaderboard(guildId: string, limit?: number): Promise<LeaderboardEntry[]> {
    const response = await apiClient.get('/api/leveling/leaderboard', {
      params: { guildId, limit },
    })
    return response.data
  },

  async getLevelRoleRewards(guildId: string): Promise<LevelRoleReward[]> {
    const response = await apiClient.get('/api/leveling/role-rewards', {
      params: { guildId },
    })
    return response.data
  },

  async saveLevelRoleReward(guildId: string, level: number, roleId: string): Promise<void> {
    await apiClient.post('/api/leveling/role-rewards', {
      guildId,
      level,
      roleId,
    })
  },

  async deleteLevelRoleReward(guildId: string, level: number): Promise<void> {
    await apiClient.delete('/api/leveling/role-rewards', {
      params: { guildId, level },
    })
  },
}

