import { getDatabase } from './database.js'

export interface ScoreboardConfig {
  guildId: string
  enabled: boolean
  channelId?: string
  messageId?: string
  updateIntervalMinutes: number
  gameType: 'all' | 'dice' | 'wordle'
  limitPlayers: number
}

export const scoreboardConfigRepository = {
  async get(guildId: string): Promise<ScoreboardConfig | null> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT * FROM scoreboard_config WHERE guild_id = $1',
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
      messageId: row.message_id || undefined,
      updateIntervalMinutes: row.update_interval_minutes || 5,
      gameType: row.game_type || 'all',
      limitPlayers: row.limit_players || 10,
    }
  },

  async set(config: ScoreboardConfig): Promise<void> {
    const pool = getDatabase()
    await pool.query(
      `INSERT INTO scoreboard_config (guild_id, enabled, channel_id, message_id, update_interval_minutes, game_type, limit_players, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT(guild_id) DO UPDATE SET
         enabled = EXCLUDED.enabled,
         channel_id = EXCLUDED.channel_id,
         message_id = EXCLUDED.message_id,
         update_interval_minutes = EXCLUDED.update_interval_minutes,
         game_type = EXCLUDED.game_type,
         limit_players = EXCLUDED.limit_players,
         updated_at = CURRENT_TIMESTAMP`,
      [
        config.guildId,
        config.enabled,
        config.channelId || null,
        config.messageId || null,
        config.updateIntervalMinutes,
        config.gameType,
        config.limitPlayers,
      ]
    )
  },
}

