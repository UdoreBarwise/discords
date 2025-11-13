import { getDatabase } from './database.js'

export interface WelcomeMessageConfig {
  guildId: string
  enabled: boolean
  channelId: string | null
  sendAsDM: boolean
  messageType: 'text' | 'embed'
  messageContent: string | null
  embedTitle: string | null
  embedDescription: string | null
  embedColor: string | null
  embedThumbnail: string | null
  embedImage: string | null
  embedFooter: string | null
}

export const welcomeMessageRepository = {
  async getConfig(guildId: string): Promise<WelcomeMessageConfig | null> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT * FROM welcome_message_config WHERE guild_id = $1',
      [guildId]
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      guildId: row.guild_id,
      enabled: row.enabled,
      channelId: row.channel_id,
      sendAsDM: row.send_as_dm,
      messageType: row.message_type || 'text',
      messageContent: row.message_content,
      embedTitle: row.embed_title,
      embedDescription: row.embed_description,
      embedColor: row.embed_color,
      embedThumbnail: row.embed_thumbnail,
      embedImage: row.embed_image,
      embedFooter: row.embed_footer,
    }
  },

  async saveConfig(config: WelcomeMessageConfig): Promise<void> {
    const pool = getDatabase()
    await pool.query(
      `INSERT INTO welcome_message_config (
        guild_id, enabled, channel_id, send_as_dm, message_type, 
        message_content, embed_title, embed_description, embed_color,
        embed_thumbnail, embed_image, embed_footer, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
      ON CONFLICT(guild_id) DO UPDATE SET
        enabled = EXCLUDED.enabled,
        channel_id = EXCLUDED.channel_id,
        send_as_dm = EXCLUDED.send_as_dm,
        message_type = EXCLUDED.message_type,
        message_content = EXCLUDED.message_content,
        embed_title = EXCLUDED.embed_title,
        embed_description = EXCLUDED.embed_description,
        embed_color = EXCLUDED.embed_color,
        embed_thumbnail = EXCLUDED.embed_thumbnail,
        embed_image = EXCLUDED.embed_image,
        embed_footer = EXCLUDED.embed_footer,
        updated_at = CURRENT_TIMESTAMP`,
      [
        config.guildId,
        config.enabled,
        config.channelId || null,
        config.sendAsDM,
        config.messageType,
        config.messageContent || null,
        config.embedTitle || null,
        config.embedDescription || null,
        config.embedColor || null,
        config.embedThumbnail || null,
        config.embedImage || null,
        config.embedFooter || null,
      ]
    )
  },

  async deleteConfig(guildId: string): Promise<void> {
    const pool = getDatabase()
    await pool.query('DELETE FROM welcome_message_config WHERE guild_id = $1', [
      guildId,
    ])
  },
}

