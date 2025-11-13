import { getDatabase } from './database.js'

export interface MemeConfig {
  guildId: string
  enabled: boolean
  channelId?: string
  autoDeleteMessages: boolean
  autoPostEnabled: boolean
  autoPostIntervalHours: number
  lastAutoPostAt?: Date
}

export const memeRepository = {
  async get(guildId: string): Promise<MemeConfig | null> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT * FROM meme_config WHERE guild_id = $1',
      [guildId]
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      guildId: row.guild_id,
      enabled: row.enabled,
      channelId: row.channel_id || undefined,
      autoDeleteMessages: row.auto_delete_messages || false,
      autoPostEnabled: row.auto_post_enabled || false,
      autoPostIntervalHours: row.auto_post_interval_hours || 2,
      lastAutoPostAt: row.last_auto_post_at ? new Date(row.last_auto_post_at) : undefined,
    }
  },

  async set(config: MemeConfig): Promise<void> {
    const pool = getDatabase()
    await pool.query(
      `INSERT INTO meme_config (
        guild_id, enabled, channel_id, auto_delete_messages,
        auto_post_enabled, auto_post_interval_hours, last_auto_post_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      ON CONFLICT(guild_id) DO UPDATE SET
        enabled = EXCLUDED.enabled,
        channel_id = EXCLUDED.channel_id,
        auto_delete_messages = EXCLUDED.auto_delete_messages,
        auto_post_enabled = EXCLUDED.auto_post_enabled,
        auto_post_interval_hours = EXCLUDED.auto_post_interval_hours,
        last_auto_post_at = EXCLUDED.last_auto_post_at,
        updated_at = CURRENT_TIMESTAMP`,
      [
        config.guildId,
        config.enabled,
        config.channelId || null,
        config.autoDeleteMessages,
        config.autoPostEnabled,
        config.autoPostIntervalHours,
        config.lastAutoPostAt || null,
      ]
    )
  },

  async updateLastAutoPost(guildId: string): Promise<void> {
    const pool = getDatabase()
    await pool.query(
      'UPDATE meme_config SET last_auto_post_at = CURRENT_TIMESTAMP WHERE guild_id = $1',
      [guildId]
    )
  },

  async getAllEnabledGuilds(): Promise<string[]> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT guild_id FROM meme_config WHERE enabled = true AND auto_post_enabled = true'
    )
    return result.rows.map(row => row.guild_id)
  },
}

