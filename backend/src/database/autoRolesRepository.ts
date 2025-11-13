import { getDatabase } from './database.js'

export interface ReactionRole {
  emoji: string
  roleId: string
  roleName?: string
}

export interface AutoRolesConfig {
  guildId: string
  channelId: string
  messageId?: string | null
  embedTitle?: string | null
  embedDescription?: string | null
  embedColor?: string | null
  reactionRoles: ReactionRole[]
}

export const autoRolesRepository = {
  async getConfig(guildId: string): Promise<AutoRolesConfig | null> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT * FROM auto_roles_config WHERE guild_id = $1',
      [guildId]
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      guildId: row.guild_id,
      channelId: row.channel_id,
      messageId: row.message_id,
      embedTitle: row.embed_title,
      embedDescription: row.embed_description,
      embedColor: row.embed_color,
      reactionRoles: JSON.parse(row.reaction_roles || '[]'),
    }
  },

  async saveConfig(config: AutoRolesConfig): Promise<void> {
    const pool = getDatabase()
    await pool.query(
      `INSERT INTO auto_roles_config (
        guild_id, channel_id, message_id, embed_title, embed_description, 
        embed_color, reaction_roles, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      ON CONFLICT(guild_id) DO UPDATE SET
        channel_id = EXCLUDED.channel_id,
        message_id = EXCLUDED.message_id,
        embed_title = EXCLUDED.embed_title,
        embed_description = EXCLUDED.embed_description,
        embed_color = EXCLUDED.embed_color,
        reaction_roles = EXCLUDED.reaction_roles,
        updated_at = CURRENT_TIMESTAMP`,
      [
        config.guildId,
        config.channelId,
        config.messageId || null,
        config.embedTitle || null,
        config.embedDescription || null,
        config.embedColor || null,
        JSON.stringify(config.reactionRoles),
      ]
    )
  },

  async deleteConfig(guildId: string): Promise<void> {
    const pool = getDatabase()
    await pool.query('DELETE FROM auto_roles_config WHERE guild_id = $1', [
      guildId,
    ])
  },
}

