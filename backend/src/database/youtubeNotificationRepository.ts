import { getDatabase } from './database.js'

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
  lastCheckedAt: Date | null
}

export const youtubeNotificationRepository = {
  async getConfig(guildId: string): Promise<YouTubeNotificationConfig | null> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT * FROM youtube_notification_config WHERE guild_id = $1',
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

  async saveConfig(config: YouTubeNotificationConfig): Promise<void> {
    const pool = getDatabase()
    await pool.query(
      `INSERT INTO youtube_notification_config (guild_id, enabled, channel_id, check_interval_minutes, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT(guild_id) DO UPDATE SET
         enabled = EXCLUDED.enabled,
         channel_id = EXCLUDED.channel_id,
         check_interval_minutes = EXCLUDED.check_interval_minutes,
         updated_at = CURRENT_TIMESTAMP`,
      [config.guildId, config.enabled, config.channelId, config.checkIntervalMinutes]
    )
  },

  async getChannels(guildId: string): Promise<YouTubeChannel[]> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT * FROM youtube_channels WHERE guild_id = $1 ORDER BY created_at ASC',
      [guildId]
    )
    return result.rows.map((row) => ({
      id: row.id,
      guildId: row.guild_id,
      youtubeChannelId: row.youtube_channel_id,
      youtubeChannelName: row.youtube_channel_name,
      lastVideoId: row.last_video_id,
      lastCheckedAt: row.last_checked_at ? new Date(row.last_checked_at) : null,
    }))
  },

  async addChannel(
    guildId: string,
    youtubeChannelId: string,
    youtubeChannelName: string | null
  ): Promise<YouTubeChannel> {
    const pool = getDatabase()
    const result = await pool.query(
      `INSERT INTO youtube_channels (guild_id, youtube_channel_id, youtube_channel_name, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT(guild_id, youtube_channel_id) DO UPDATE SET
         youtube_channel_name = EXCLUDED.youtube_channel_name,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [guildId, youtubeChannelId, youtubeChannelName]
    )
    const row = result.rows[0]
    return {
      id: row.id,
      guildId: row.guild_id,
      youtubeChannelId: row.youtube_channel_id,
      youtubeChannelName: row.youtube_channel_name,
      lastVideoId: row.last_video_id,
      lastCheckedAt: row.last_checked_at ? new Date(row.last_checked_at) : null,
    }
  },

  async removeChannel(guildId: string, youtubeChannelId: string): Promise<void> {
    const pool = getDatabase()
    await pool.query(
      'DELETE FROM youtube_channels WHERE guild_id = $1 AND youtube_channel_id = $2',
      [guildId, youtubeChannelId]
    )
  },

  async updateLastChecked(
    guildId: string,
    youtubeChannelId: string,
    lastVideoId: string
  ): Promise<void> {
    const pool = getDatabase()
    await pool.query(
      `UPDATE youtube_channels 
       SET last_video_id = $1, last_checked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE guild_id = $2 AND youtube_channel_id = $3`,
      [lastVideoId, guildId, youtubeChannelId]
    )
  },

  async getAllEnabledGuilds(): Promise<string[]> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT guild_id FROM youtube_notification_config WHERE enabled = true'
    )
    return result.rows.map((row) => row.guild_id)
  },
}

