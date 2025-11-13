import { getDatabase } from './database.js'

export interface ChannelConfig {
  provider?: string
  providerUrl?: string
  model?: string
  personality?: string
}

export interface AIConfig {
  guildId: string
  allowedChannelIds?: string[]
  rateLimitPerMinute: number
  rateLimitPerHour: number
  blockedUserIds?: string[]
  allowedRoleIds?: string[]
  channelConfigs?: Record<string, ChannelConfig>
}

export const aiConfigRepository = {
  async get(guildId: string): Promise<AIConfig | null> {
    const pool = getDatabase()
    const result = await pool.query('SELECT * FROM ai_config WHERE guild_id = $1', [guildId])

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      guildId: row.guild_id,
      allowedChannelIds: row.allowed_channel_ids ? JSON.parse(row.allowed_channel_ids) : undefined,
      rateLimitPerMinute: row.rate_limit_per_minute || 5,
      rateLimitPerHour: row.rate_limit_per_hour || 50,
      blockedUserIds: row.blocked_user_ids ? JSON.parse(row.blocked_user_ids) : undefined,
      allowedRoleIds: row.allowed_role_ids ? JSON.parse(row.allowed_role_ids) : undefined,
      channelConfigs: row.channel_configs ? JSON.parse(row.channel_configs) : undefined,
    }
  },

  async set(config: AIConfig): Promise<void> {
    const pool = getDatabase()
    // Add channel_configs column if it doesn't exist
    await pool.query(`
      ALTER TABLE ai_config 
      ADD COLUMN IF NOT EXISTS channel_configs TEXT
    `).catch(() => {}) // Ignore error if column already exists
    
    await pool.query(
      `INSERT INTO ai_config (guild_id, allowed_channel_ids, rate_limit_per_minute, rate_limit_per_hour, blocked_user_ids, allowed_role_ids, channel_configs, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT(guild_id) DO UPDATE SET
         allowed_channel_ids = EXCLUDED.allowed_channel_ids,
         rate_limit_per_minute = EXCLUDED.rate_limit_per_minute,
         rate_limit_per_hour = EXCLUDED.rate_limit_per_hour,
         blocked_user_ids = EXCLUDED.blocked_user_ids,
         allowed_role_ids = EXCLUDED.allowed_role_ids,
         channel_configs = EXCLUDED.channel_configs,
         updated_at = CURRENT_TIMESTAMP`,
      [
        config.guildId,
        config.allowedChannelIds ? JSON.stringify(config.allowedChannelIds) : null,
        config.rateLimitPerMinute,
        config.rateLimitPerHour,
        config.blockedUserIds ? JSON.stringify(config.blockedUserIds) : undefined,
        config.allowedRoleIds ? JSON.stringify(config.allowedRoleIds) : undefined,
        config.channelConfigs ? JSON.stringify(config.channelConfigs) : null,
      ]
    )
  },

  async checkRateLimit(guildId: string, userId: string, perMinute: number, perHour: number): Promise<boolean> {
    const pool = getDatabase()
    const now = new Date()
    const minuteAgo = new Date(now.getTime() - 60000)
    const hourAgo = new Date(now.getTime() - 3600000)

    // Check per-minute limit
    const minuteResult = await pool.query(
      `SELECT SUM(message_count) as total
       FROM ai_rate_limits
       WHERE guild_id = $1 AND user_id = $2 AND window_type = 'minute' AND window_start > $3`,
      [guildId, userId, minuteAgo]
    )
    const minuteTotal = parseInt(minuteResult.rows[0]?.total || '0')
    if (minuteTotal >= perMinute) {
      return false
    }

    // Check per-hour limit
    const hourResult = await pool.query(
      `SELECT SUM(message_count) as total
       FROM ai_rate_limits
       WHERE guild_id = $1 AND user_id = $2 AND window_type = 'hour' AND window_start > $3`,
      [guildId, userId, hourAgo]
    )
    const hourTotal = parseInt(hourResult.rows[0]?.total || '0')
    if (hourTotal >= perHour) {
      return false
    }

    // Record this request
    await pool.query(
      `INSERT INTO ai_rate_limits (guild_id, user_id, message_count, window_start, window_type)
       VALUES ($1, $2, 1, $3, 'minute')
       ON CONFLICT(guild_id, user_id, window_start, window_type) DO UPDATE SET
         message_count = ai_rate_limits.message_count + 1`,
      [guildId, userId, now]
    )

    await pool.query(
      `INSERT INTO ai_rate_limits (guild_id, user_id, message_count, window_start, window_type)
       VALUES ($1, $2, 1, $3, 'hour')
       ON CONFLICT(guild_id, user_id, window_start, window_type) DO UPDATE SET
         message_count = ai_rate_limits.message_count + 1`,
      [guildId, userId, now]
    )

    return true
  },
}

