import { getDatabase } from './database.js'

export interface DiceGameConfig {
  guildId: string
  enabled: boolean
  channelId?: string
  userCooldownMinutes: number
}

export const diceGameRepository = {
  async get(guildId: string): Promise<DiceGameConfig | null> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT * FROM dice_game_config WHERE guild_id = $1',
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
      userCooldownMinutes: row.user_cooldown_minutes || 10,
    }
  },

  async set(config: DiceGameConfig): Promise<void> {
    const pool = getDatabase()
    await pool.query(
      `INSERT INTO dice_game_config (guild_id, enabled, channel_id, user_cooldown_minutes, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT(guild_id) DO UPDATE SET
         enabled = EXCLUDED.enabled,
         channel_id = EXCLUDED.channel_id,
         user_cooldown_minutes = EXCLUDED.user_cooldown_minutes,
         updated_at = CURRENT_TIMESTAMP`,
      [
        config.guildId,
        config.enabled,
        config.channelId || null,
        config.userCooldownMinutes,
      ]
    )
  },

  async checkCooldown(guildId: string, userId: string): Promise<number | null> {
    const pool = getDatabase()
    const config = await this.get(guildId)
    if (!config || !config.enabled) {
      return null
    }

    const result = await pool.query(
      'SELECT last_played FROM dice_game_cooldowns WHERE guild_id = $1 AND user_id = $2',
      [guildId, userId]
    )

    if (result.rows.length === 0) {
      return null
    }

    const lastPlayed = new Date(result.rows[0].last_played)
    const now = new Date()
    const diffMinutes = (now.getTime() - lastPlayed.getTime()) / (1000 * 60)
    const cooldownMinutes = config.userCooldownMinutes

    if (diffMinutes < cooldownMinutes) {
      return Math.ceil(cooldownMinutes - diffMinutes)
    }

    return null
  },

  async setCooldown(guildId: string, userId: string): Promise<void> {
    const pool = getDatabase()
    await pool.query(
      `INSERT INTO dice_game_cooldowns (guild_id, user_id, last_played)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT(guild_id, user_id) DO UPDATE SET
         last_played = CURRENT_TIMESTAMP`,
      [guildId, userId]
    )
  },
}

