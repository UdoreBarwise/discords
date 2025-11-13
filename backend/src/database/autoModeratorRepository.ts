import { getDatabase } from './database.js'

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

export const autoModeratorRepository = {
  async getConfig(guildId: string): Promise<AutoModeratorConfig | null> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT * FROM auto_moderator_config WHERE guild_id = $1',
      [guildId]
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      guildId: row.guild_id,
      enabled: row.enabled || false,
      severityLevel: row.severity_level || 'medium',
      whitelistWords: row.whitelist_words ? JSON.parse(row.whitelist_words) : [],
      blacklistWords: row.blacklist_words ? JSON.parse(row.blacklist_words) : [],
      whitelistUsers: row.whitelist_users ? JSON.parse(row.whitelist_users) : [],
      blacklistUsers: row.blacklist_users ? JSON.parse(row.blacklist_users) : [],
      whitelistChannels: row.whitelist_channels ? JSON.parse(row.whitelist_channels) : [],
      blacklistChannels: row.blacklist_channels ? JSON.parse(row.blacklist_channels) : [],
      whitelistRoles: row.whitelist_roles ? JSON.parse(row.whitelist_roles) : [],
      blacklistRoles: row.blacklist_roles ? JSON.parse(row.blacklist_roles) : [],
      actionOnViolation: row.action_on_violation || 'delete',
      warnOnViolation: row.warn_on_violation !== false,
      logChannelId: row.log_channel_id || null,
    }
  },

  async saveConfig(config: AutoModeratorConfig): Promise<void> {
    const pool = getDatabase()
    await pool.query(
      `INSERT INTO auto_moderator_config (
        guild_id, enabled, severity_level, whitelist_words, blacklist_words,
        whitelist_users, blacklist_users, whitelist_channels, blacklist_channels,
        whitelist_roles, blacklist_roles, action_on_violation, warn_on_violation,
        log_channel_id, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)
      ON CONFLICT(guild_id) DO UPDATE SET
        enabled = EXCLUDED.enabled,
        severity_level = EXCLUDED.severity_level,
        whitelist_words = EXCLUDED.whitelist_words,
        blacklist_words = EXCLUDED.blacklist_words,
        whitelist_users = EXCLUDED.whitelist_users,
        blacklist_users = EXCLUDED.blacklist_users,
        whitelist_channels = EXCLUDED.whitelist_channels,
        blacklist_channels = EXCLUDED.blacklist_channels,
        whitelist_roles = EXCLUDED.whitelist_roles,
        blacklist_roles = EXCLUDED.blacklist_roles,
        action_on_violation = EXCLUDED.action_on_violation,
        warn_on_violation = EXCLUDED.warn_on_violation,
        log_channel_id = EXCLUDED.log_channel_id,
        updated_at = CURRENT_TIMESTAMP`,
      [
        config.guildId,
        config.enabled,
        config.severityLevel,
        JSON.stringify(config.whitelistWords),
        JSON.stringify(config.blacklistWords),
        JSON.stringify(config.whitelistUsers),
        JSON.stringify(config.blacklistUsers),
        JSON.stringify(config.whitelistChannels),
        JSON.stringify(config.blacklistChannels),
        JSON.stringify(config.whitelistRoles),
        JSON.stringify(config.blacklistRoles),
        config.actionOnViolation,
        config.warnOnViolation,
        config.logChannelId,
      ]
    )
  },
}

