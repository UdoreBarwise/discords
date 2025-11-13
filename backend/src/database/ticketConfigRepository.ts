import { getDatabase } from './database.js'

export interface TicketConfig {
  guildId: string
  embedChannelId: string
  ticketCategoryId: string
  mentionRoleIds: string[]
  mentionUserIds: string[]
  embedMessageId?: string
  messageType?: 'plain_text' | 'embed'
  messageTitle?: string
  messageDescription?: string
  messageContent?: string
}

export const ticketConfigRepository = {
  async get(guildId: string): Promise<TicketConfig | null> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT * FROM ticket_config WHERE guild_id = $1',
      [guildId]
    )
    
    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      guildId: row.guild_id,
      embedChannelId: row.embed_channel_id,
      ticketCategoryId: row.ticket_category_id,
      mentionRoleIds: JSON.parse(row.mention_role_ids || '[]'),
      mentionUserIds: JSON.parse(row.mention_user_ids || '[]'),
      embedMessageId: row.embed_message_id || undefined,
      messageType: (row.message_type || 'embed') as 'plain_text' | 'embed',
      messageTitle: row.message_title || undefined,
      messageDescription: row.message_description || undefined,
      messageContent: row.message_content || undefined,
    }
  },

  async set(config: TicketConfig): Promise<void> {
    const pool = getDatabase()
    await pool.query(
      `INSERT INTO ticket_config (guild_id, embed_channel_id, ticket_category_id, mention_role_ids, mention_user_ids, embed_message_id, message_type, message_title, message_description, message_content, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
       ON CONFLICT(guild_id) DO UPDATE SET
         embed_channel_id = EXCLUDED.embed_channel_id,
         ticket_category_id = EXCLUDED.ticket_category_id,
         mention_role_ids = EXCLUDED.mention_role_ids,
         mention_user_ids = EXCLUDED.mention_user_ids,
         embed_message_id = EXCLUDED.embed_message_id,
         message_type = EXCLUDED.message_type,
         message_title = EXCLUDED.message_title,
         message_description = EXCLUDED.message_description,
         message_content = EXCLUDED.message_content,
         updated_at = CURRENT_TIMESTAMP`,
      [
        config.guildId,
        config.embedChannelId,
        config.ticketCategoryId,
        JSON.stringify(config.mentionRoleIds),
        JSON.stringify(config.mentionUserIds),
        config.embedMessageId || null,
        config.messageType || 'embed',
        config.messageTitle || null,
        config.messageDescription || null,
        config.messageContent || null,
      ]
    )
  },

  async delete(guildId: string): Promise<void> {
    const pool = getDatabase()
    await pool.query('DELETE FROM ticket_config WHERE guild_id = $1', [guildId])
  },
}

