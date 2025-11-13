import { getDatabase } from './database.js'

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
  lastMessageAt: Date | null
}

export interface LevelRoleReward {
  guildId: string
  level: number
  roleId: string
}

export interface LeaderboardEntry {
  userId: string
  xp: number
  level: number
  totalMessages: number
  rank: number
}

export const levelingRepository = {
  async getConfig(guildId: string): Promise<LevelingConfig | null> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT * FROM leveling_config WHERE guild_id = $1',
      [guildId]
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      guildId: row.guild_id,
      enabled: row.enabled || false,
      xpPerMessage: row.xp_per_message || 10,
      xpPerReaction: row.xp_per_reaction || 5,
      messageCooldownSeconds: row.message_cooldown_seconds || 60,
      minMessageLength: row.min_message_length || 0,
      whitelistChannels: row.whitelist_channels ? JSON.parse(row.whitelist_channels) : [],
      blacklistChannels: row.blacklist_channels ? JSON.parse(row.blacklist_channels) : [],
      whitelistRoles: row.whitelist_roles ? JSON.parse(row.whitelist_roles) : [],
      blacklistRoles: row.blacklist_roles ? JSON.parse(row.blacklist_roles) : [],
      levelUpChannelId: row.level_up_channel_id || null,
      levelUpMessage: row.level_up_message || null,
    }
  },

  async saveConfig(config: LevelingConfig): Promise<void> {
    const pool = getDatabase()
    await pool.query(
      `INSERT INTO leveling_config (
        guild_id, enabled, xp_per_message, xp_per_reaction, message_cooldown_seconds,
        min_message_length, whitelist_channels, blacklist_channels, whitelist_roles,
        blacklist_roles, level_up_channel_id, level_up_message, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
      ON CONFLICT(guild_id) DO UPDATE SET
        enabled = EXCLUDED.enabled,
        xp_per_message = EXCLUDED.xp_per_message,
        xp_per_reaction = EXCLUDED.xp_per_reaction,
        message_cooldown_seconds = EXCLUDED.message_cooldown_seconds,
        min_message_length = EXCLUDED.min_message_length,
        whitelist_channels = EXCLUDED.whitelist_channels,
        blacklist_channels = EXCLUDED.blacklist_channels,
        whitelist_roles = EXCLUDED.whitelist_roles,
        blacklist_roles = EXCLUDED.blacklist_roles,
        level_up_channel_id = EXCLUDED.level_up_channel_id,
        level_up_message = EXCLUDED.level_up_message,
        updated_at = CURRENT_TIMESTAMP`,
      [
        config.guildId,
        config.enabled,
        config.xpPerMessage,
        config.xpPerReaction,
        config.messageCooldownSeconds,
        config.minMessageLength,
        JSON.stringify(config.whitelistChannels),
        JSON.stringify(config.blacklistChannels),
        JSON.stringify(config.whitelistRoles),
        JSON.stringify(config.blacklistRoles),
        config.levelUpChannelId,
        config.levelUpMessage,
      ]
    )
  },

  async getUserLevel(guildId: string, userId: string): Promise<UserLevel | null> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT * FROM user_levels WHERE guild_id = $1 AND user_id = $2',
      [guildId, userId]
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      guildId: row.guild_id,
      userId: row.user_id,
      xp: parseInt(row.xp) || 0,
      level: parseInt(row.level) || 0,
      totalMessages: parseInt(row.total_messages) || 0,
      lastMessageAt: row.last_message_at ? new Date(row.last_message_at) : null,
    }
  },

  async addXP(guildId: string, userId: string, xpAmount: number, newLevel: number, incrementMessages: boolean = true): Promise<UserLevel> {
    const pool = getDatabase()
    
    // Insert or update user level
    const messageIncrement = incrementMessages ? 1 : 0
    const result = await pool.query(
      `INSERT INTO user_levels (guild_id, user_id, xp, level, total_messages, last_message_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(guild_id, user_id) DO UPDATE SET
         xp = user_levels.xp + $3,
         level = $4,
         total_messages = user_levels.total_messages + $5,
         last_message_at = CASE WHEN $5 = 1 THEN CURRENT_TIMESTAMP ELSE user_levels.last_message_at END,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [guildId, userId, xpAmount, newLevel, messageIncrement]
    )

    const row = result.rows[0]
    return {
      guildId: row.guild_id,
      userId: row.user_id,
      xp: parseInt(row.xp) || 0,
      level: parseInt(row.level) || 0,
      totalMessages: parseInt(row.total_messages) || 0,
      lastMessageAt: row.last_message_at ? new Date(row.last_message_at) : null,
    }
  },

  async getLeaderboard(guildId: string, limit: number = 50): Promise<LeaderboardEntry[]> {
    const pool = getDatabase()
    const result = await pool.query(
      `SELECT 
        user_id,
        xp,
        level,
        total_messages,
        ROW_NUMBER() OVER (ORDER BY xp DESC, level DESC) as rank
       FROM user_levels
       WHERE guild_id = $1
       ORDER BY xp DESC, level DESC
       LIMIT $2`,
      [guildId, limit]
    )

    return result.rows.map((row) => ({
      userId: row.user_id,
      xp: parseInt(row.xp) || 0,
      level: parseInt(row.level) || 0,
      totalMessages: parseInt(row.total_messages) || 0,
      rank: parseInt(row.rank) || 0,
    }))
  },

  async getLevelRoleRewards(guildId: string): Promise<LevelRoleReward[]> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT * FROM level_role_rewards WHERE guild_id = $1 ORDER BY level ASC',
      [guildId]
    )

    return result.rows.map((row) => ({
      guildId: row.guild_id,
      level: parseInt(row.level) || 0,
      roleId: row.role_id,
    }))
  },

  async saveLevelRoleReward(guildId: string, level: number, roleId: string): Promise<void> {
    const pool = getDatabase()
    await pool.query(
      `INSERT INTO level_role_rewards (guild_id, level, role_id)
       VALUES ($1, $2, $3)
       ON CONFLICT(guild_id, level) DO UPDATE SET role_id = EXCLUDED.role_id`,
      [guildId, level, roleId]
    )
  },

  async deleteLevelRoleReward(guildId: string, level: number): Promise<void> {
    const pool = getDatabase()
    await pool.query(
      'DELETE FROM level_role_rewards WHERE guild_id = $1 AND level = $2',
      [guildId, level]
    )
  },
}

