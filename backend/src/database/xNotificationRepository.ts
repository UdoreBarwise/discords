import { getDatabase } from './database.js'

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
  lastCheckedAt: Date | null
}

export const xNotificationRepository = {
  async getConfig(guildId: string): Promise<XNotificationConfig | null> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT * FROM x_notification_config WHERE guild_id = $1',
      [guildId]
    )
    if (result.rows.length === 0) return null
    const row = result.rows[0]
    return {
      guildId: row.guild_id,
      enabled: row.enabled,
      channelId: row.channel_id,
      checkIntervalMinutes: row.check_interval_minutes,
    }
  },

  async saveConfig(config: XNotificationConfig): Promise<void> {
    const pool = getDatabase()
    await pool.query(
      `INSERT INTO x_notification_config (guild_id, enabled, channel_id, check_interval_minutes, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT(guild_id) DO UPDATE SET
         enabled = EXCLUDED.enabled,
         channel_id = EXCLUDED.channel_id,
         check_interval_minutes = EXCLUDED.check_interval_minutes,
         updated_at = CURRENT_TIMESTAMP`,
      [config.guildId, config.enabled, config.channelId, config.checkIntervalMinutes]
    )
  },

  async getAccounts(guildId: string): Promise<XAccount[]> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT * FROM x_accounts WHERE guild_id = $1 ORDER BY created_at ASC',
      [guildId]
    )
    return result.rows.map((row) => ({
      id: row.id,
      guildId: row.guild_id,
      xUsername: row.x_username,
      xDisplayName: row.x_display_name,
      lastTweetId: row.last_tweet_id,
      lastCheckedAt: row.last_checked_at ? new Date(row.last_checked_at) : null,
    }))
  },

  async addAccount(
    guildId: string,
    xUsername: string,
    xDisplayName: string | null
  ): Promise<XAccount> {
    const pool = getDatabase()
    const result = await pool.query(
      `INSERT INTO x_accounts (guild_id, x_username, x_display_name, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT(guild_id, x_username) DO UPDATE SET
         x_display_name = EXCLUDED.x_display_name,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [guildId, xUsername, xDisplayName]
    )
    const row = result.rows[0]
    return {
      id: row.id,
      guildId: row.guild_id,
      xUsername: row.x_username,
      xDisplayName: row.x_display_name,
      lastTweetId: row.last_tweet_id,
      lastCheckedAt: row.last_checked_at ? new Date(row.last_checked_at) : null,
    }
  },

  async removeAccount(guildId: string, xUsername: string): Promise<void> {
    const pool = getDatabase()
    await pool.query(
      'DELETE FROM x_accounts WHERE guild_id = $1 AND x_username = $2',
      [guildId, xUsername]
    )
  },

  async updateLastChecked(
    guildId: string,
    xUsername: string,
    lastTweetId: string
  ): Promise<void> {
    const pool = getDatabase()
    await pool.query(
      `UPDATE x_accounts 
       SET last_tweet_id = $1, last_checked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE guild_id = $2 AND x_username = $3`,
      [lastTweetId, guildId, xUsername]
    )
  },

  async getAllEnabledGuilds(): Promise<string[]> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT guild_id FROM x_notification_config WHERE enabled = true'
    )
    return result.rows.map((row) => row.guild_id)
  },
}


