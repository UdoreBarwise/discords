import { getDatabase } from './database.js'

export interface Reminder {
  id: number
  guildId: string
  userId: string
  message: string
  timeUtc: string // HH:mm format in UTC
  daysOfWeek?: number[] // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  deliveryMethod: 'dm' | 'channel'
  channelId?: string
  enabled: boolean
  lastTriggeredAt?: Date
  createdAt: Date
  updatedAt: Date
}

export const reminderRepository = {
  async create(reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt' | 'lastTriggeredAt'>): Promise<Reminder> {
    const pool = getDatabase()
    const result = await pool.query(
      `INSERT INTO reminders (
        guild_id, user_id, message, time_utc, days_of_week,
        delivery_method, channel_id, enabled
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        reminder.guildId,
        reminder.userId,
        reminder.message,
        reminder.timeUtc,
        reminder.daysOfWeek ? JSON.stringify(reminder.daysOfWeek) : null,
        reminder.deliveryMethod,
        reminder.channelId || null,
        reminder.enabled,
      ]
    )

    const row = result.rows[0]
    return this.mapRowToReminder(row)
  },

  async get(id: number): Promise<Reminder | null> {
    const pool = getDatabase()
    const result = await pool.query('SELECT * FROM reminders WHERE id = $1', [id])

    if (result.rows.length === 0) {
      return null
    }

    return this.mapRowToReminder(result.rows[0])
  },

  async getByGuild(guildId: string): Promise<Reminder[]> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT * FROM reminders WHERE guild_id = $1 ORDER BY created_at DESC',
      [guildId]
    )

    return result.rows.map(row => this.mapRowToReminder(row))
  },

  async getByUser(guildId: string, userId: string): Promise<Reminder[]> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT * FROM reminders WHERE guild_id = $1 AND user_id = $2 ORDER BY created_at DESC',
      [guildId, userId]
    )

    return result.rows.map(row => this.mapRowToReminder(row))
  },

  async getAllEnabled(): Promise<Reminder[]> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT * FROM reminders WHERE enabled = true ORDER BY guild_id, time_utc'
    )

    return result.rows.map(row => this.mapRowToReminder(row))
  },

  async update(id: number, updates: Partial<Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    const pool = getDatabase()
    const fields: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (updates.message !== undefined) {
      fields.push(`message = $${paramIndex++}`)
      values.push(updates.message)
    }
    if (updates.timeUtc !== undefined) {
      fields.push(`time_utc = $${paramIndex++}`)
      values.push(updates.timeUtc)
    }
    if (updates.daysOfWeek !== undefined) {
      fields.push(`days_of_week = $${paramIndex++}`)
      values.push(updates.daysOfWeek ? JSON.stringify(updates.daysOfWeek) : null)
    }
    if (updates.deliveryMethod !== undefined) {
      fields.push(`delivery_method = $${paramIndex++}`)
      values.push(updates.deliveryMethod)
    }
    if (updates.channelId !== undefined) {
      fields.push(`channel_id = $${paramIndex++}`)
      values.push(updates.channelId || null)
    }
    if (updates.enabled !== undefined) {
      fields.push(`enabled = $${paramIndex++}`)
      values.push(updates.enabled)
    }

    if (fields.length === 0) {
      return
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(id)

    await pool.query(
      `UPDATE reminders SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    )
  },

  async delete(id: number): Promise<void> {
    const pool = getDatabase()
    await pool.query('DELETE FROM reminders WHERE id = $1', [id])
  },

  async updateLastTriggered(id: number): Promise<void> {
    const pool = getDatabase()
    await pool.query(
      'UPDATE reminders SET last_triggered_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    )
  },

  mapRowToReminder(row: any): Reminder {
    return {
      id: row.id,
      guildId: row.guild_id,
      userId: row.user_id,
      message: row.message,
      timeUtc: row.time_utc,
      daysOfWeek: row.days_of_week ? JSON.parse(row.days_of_week) : undefined,
      deliveryMethod: row.delivery_method,
      channelId: row.channel_id || undefined,
      enabled: row.enabled,
      lastTriggeredAt: row.last_triggered_at ? new Date(row.last_triggered_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  },
}


