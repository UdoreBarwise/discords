import { getDatabase } from './database.js'

export interface SteamUser {
  id: number
  discord_user_id: string
  guild_id: string | null
  steam_id: string
  steam_vanity_url: string | null
  created_at: Date
  updated_at: Date
}

export const steamRepository = {
  /**
   * Link a Discord user to a Steam ID
   */
  async linkUser(discordUserId: string, steamId: string, guildId: string | null = null, vanityUrl: string | null = null): Promise<SteamUser> {
    const pool = getDatabase()
    
    // Use a subquery to handle the unique constraint with NULLs
    // First, try to update existing record
    const updateResult = await pool.query(
      `UPDATE steam_users 
       SET steam_id = $3, steam_vanity_url = $4, updated_at = CURRENT_TIMESTAMP
       WHERE discord_user_id = $1 AND (guild_id = $2 OR (guild_id IS NULL AND $2 IS NULL))
       RETURNING *`,
      [discordUserId, guildId, steamId, vanityUrl]
    )

    if (updateResult.rows.length > 0) {
      return updateResult.rows[0] as SteamUser
    }

    // If no update, insert new record
    const insertResult = await pool.query(
      `INSERT INTO steam_users (discord_user_id, guild_id, steam_id, steam_vanity_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [discordUserId, guildId, steamId, vanityUrl]
    )

    return insertResult.rows[0] as SteamUser
  },

  /**
   * Get Steam ID for a Discord user
   */
  async getSteamId(discordUserId: string, guildId: string | null = null): Promise<string | null> {
    const pool = getDatabase()
    
    const result = await pool.query(
      `SELECT steam_id FROM steam_users 
       WHERE discord_user_id = $1 AND (guild_id = $2 OR (guild_id IS NULL AND $2 IS NULL))
       ORDER BY updated_at DESC LIMIT 1`,
      [discordUserId, guildId]
    )

    return result.rows[0]?.steam_id || null
  },

  /**
   * Get all Steam users for a guild
   */
  async getGuildUsers(guildId: string): Promise<SteamUser[]> {
    const pool = getDatabase()
    
    const result = await pool.query(
      `SELECT * FROM steam_users WHERE guild_id = $1 ORDER BY updated_at DESC`,
      [guildId]
    )

    return result.rows as SteamUser[]
  },

  /**
   * Unlink a Discord user's Steam account
   */
  async unlinkUser(discordUserId: string, guildId: string | null = null): Promise<void> {
    const pool = getDatabase()
    
    await pool.query(
      `DELETE FROM steam_users 
       WHERE discord_user_id = $1 AND (guild_id = $2 OR (guild_id IS NULL AND $2 IS NULL))`,
      [discordUserId, guildId]
    )
  },

  /**
   * Check if a Steam ID is already linked
   */
  async isSteamIdLinked(steamId: string, guildId: string | null = null): Promise<boolean> {
    const pool = getDatabase()
    
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM steam_users 
       WHERE steam_id = $1 AND (guild_id = $2 OR (guild_id IS NULL AND $2 IS NULL))`,
      [steamId, guildId]
    )

    return parseInt(result.rows[0].count) > 0
  },
}

