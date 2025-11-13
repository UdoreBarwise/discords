import { getDatabase } from './database.js'

export interface ExchangeRateConfig {
  id?: number
  guildId: string
  defaultBaseCurrency: string
  enabled: boolean
  channelId?: string
  createdAt?: Date
  updatedAt?: Date
}

class ExchangeRateRepository {
  async getConfig(guildId: string): Promise<ExchangeRateConfig | null> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT * FROM exchange_rate_config WHERE guild_id = $1',
      [guildId]
    )
    if (!result.rows[0]) {
      return null
    }
    const row = result.rows[0]
    return {
      id: row.id,
      guildId: row.guild_id,
      defaultBaseCurrency: row.default_base_currency,
      enabled: row.enabled,
      channelId: row.channel_id || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  async createConfig(config: ExchangeRateConfig): Promise<ExchangeRateConfig> {
    const pool = getDatabase()
    const result = await pool.query(
      `INSERT INTO exchange_rate_config (guild_id, default_base_currency, enabled, channel_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [config.guildId, config.defaultBaseCurrency, config.enabled, config.channelId || null]
    )
    const row = result.rows[0]
    return {
      id: row.id,
      guildId: row.guild_id,
      defaultBaseCurrency: row.default_base_currency,
      enabled: row.enabled,
      channelId: row.channel_id || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  async updateConfig(guildId: string, updates: Partial<ExchangeRateConfig>): Promise<ExchangeRateConfig> {
    const pool = getDatabase()
    const fields: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (updates.defaultBaseCurrency !== undefined) {
      fields.push(`default_base_currency = $${paramCount++}`)
      values.push(updates.defaultBaseCurrency)
    }
    if (updates.enabled !== undefined) {
      fields.push(`enabled = $${paramCount++}`)
      values.push(updates.enabled)
    }
    if (updates.channelId !== undefined) {
      fields.push(`channel_id = $${paramCount++}`)
      values.push(updates.channelId || null)
    }

    if (fields.length === 0) {
      return this.getConfig(guildId) as Promise<ExchangeRateConfig>
    }

    fields.push(`updated_at = NOW()`)
    values.push(guildId)

    const result = await pool.query(
      `UPDATE exchange_rate_config
       SET ${fields.join(', ')}
       WHERE guild_id = $${paramCount}
       RETURNING *`,
      values
    )

    const row = result.rows[0]
    return {
      id: row.id,
      guildId: row.guild_id,
      defaultBaseCurrency: row.default_base_currency,
      enabled: row.enabled,
      channelId: row.channel_id || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  async deleteConfig(guildId: string): Promise<void> {
    const pool = getDatabase()
    await pool.query(
      'DELETE FROM exchange_rate_config WHERE guild_id = $1',
      [guildId]
    )
  }
}

export const exchangeRateRepository = new ExchangeRateRepository()

