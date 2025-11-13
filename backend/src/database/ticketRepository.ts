import { getDatabase } from './database.js'

export interface Ticket {
  ticketId: string
  guildId: string
  userId: string
  createdAt: Date
  closedAt?: Date
  status: 'open' | 'closed'
}

export interface TicketLog {
  ticketId: string
  guildId: string
  userId: string
  createdAt: Date
  closedAt: Date
  closedBy: string
  messageCount: number
  transcript?: string
}

export const ticketRepository = {
  async create(ticket: Omit<Ticket, 'createdAt' | 'status'>): Promise<void> {
    const pool = getDatabase()
    await pool.query(
      `INSERT INTO tickets (ticket_id, guild_id, user_id, created_at, status)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'open')`,
      [ticket.ticketId, ticket.guildId, ticket.userId]
    )
  },

  async get(ticketId: string): Promise<Ticket | null> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT * FROM tickets WHERE ticket_id = $1',
      [ticketId]
    )
    
    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      ticketId: row.ticket_id,
      guildId: row.guild_id,
      userId: row.user_id,
      createdAt: row.created_at,
      closedAt: row.closed_at || undefined,
      status: row.status,
    }
  },

  async list(guildId?: string): Promise<Ticket[]> {
    const pool = getDatabase()
    let result
    
    if (guildId) {
      result = await pool.query(
        'SELECT * FROM tickets WHERE guild_id = $1 ORDER BY created_at DESC',
        [guildId]
      )
    } else {
      result = await pool.query('SELECT * FROM tickets ORDER BY created_at DESC')
    }

    return result.rows.map((row) => ({
      ticketId: row.ticket_id,
      guildId: row.guild_id,
      userId: row.user_id,
      createdAt: row.created_at,
      closedAt: row.closed_at || undefined,
      status: row.status,
    }))
  },

  async close(ticketId: string): Promise<void> {
    const pool = getDatabase()
    await pool.query(
      `UPDATE tickets SET status = 'closed', closed_at = CURRENT_TIMESTAMP
       WHERE ticket_id = $1`,
      [ticketId]
    )
  },

  async delete(ticketId: string): Promise<void> {
    const pool = getDatabase()
    await pool.query('DELETE FROM tickets WHERE ticket_id = $1', [ticketId])
  },

  async saveLog(log: TicketLog): Promise<void> {
    const pool = getDatabase()
    await pool.query(
      `INSERT INTO ticket_logs (ticket_id, guild_id, user_id, created_at, closed_at, closed_by, message_count, transcript)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        log.ticketId,
        log.guildId,
        log.userId,
        log.createdAt,
        log.closedAt,
        log.closedBy,
        log.messageCount,
        log.transcript || null,
      ]
    )
  },

  async getLogs(guildId?: string): Promise<TicketLog[]> {
    const pool = getDatabase()
    let result
    
    if (guildId) {
      result = await pool.query(
        'SELECT * FROM ticket_logs WHERE guild_id = $1 ORDER BY closed_at DESC',
        [guildId]
      )
    } else {
      result = await pool.query('SELECT * FROM ticket_logs ORDER BY closed_at DESC')
    }

    return result.rows.map((row) => ({
      ticketId: row.ticket_id,
      guildId: row.guild_id,
      userId: row.user_id,
      createdAt: row.created_at,
      closedAt: row.closed_at,
      closedBy: row.closed_by,
      messageCount: row.message_count,
      transcript: row.transcript || undefined,
    }))
  },
}

