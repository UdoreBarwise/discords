import { getDatabase } from './database.js'

export interface EventsConfig {
  guildId: string
  enabled: boolean
  announcementChannelId: string | null
  randomEventChance: number
}

export interface Event {
  id: number
  guildId: string
  name: string
  description: string | null
  eventType: string
  enabled: boolean
  scheduleType: string
  scheduleData: string | null
  durationMinutes: number
  rewardData: string | null
  eventData: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ActiveEvent {
  id: number
  guildId: string
  eventId: number
  startedAt: Date
  endsAt: Date
  eventData: string | null
}

export interface EventParticipant {
  id: number
  activeEventId: number
  userId: string
  points: number
  rewardsEarned: string | null
}

export interface EventHistory {
  id: number
  guildId: string
  eventId: number
  eventName: string
  eventType: string
  startedAt: Date
  endedAt: Date
  totalParticipants: number
  eventData: string | null
}

export const eventRepository = {
  async getConfig(guildId: string): Promise<EventsConfig | null> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT * FROM events_config WHERE guild_id = $1',
      [guildId]
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      guildId: row.guild_id,
      enabled: row.enabled,
      announcementChannelId: row.announcement_channel_id,
      randomEventChance: parseFloat(row.random_event_chance || '5.0'),
    }
  },

  async saveConfig(config: EventsConfig): Promise<void> {
    const pool = getDatabase()
    await pool.query(
      `INSERT INTO events_config (guild_id, enabled, announcement_channel_id, random_event_chance, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (guild_id) 
       DO UPDATE SET 
         enabled = $2,
         announcement_channel_id = $3,
         random_event_chance = $4,
         updated_at = CURRENT_TIMESTAMP`,
      [config.guildId, config.enabled, config.announcementChannelId, config.randomEventChance]
    )
  },

  async getEvents(guildId: string): Promise<Event[]> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT * FROM events WHERE guild_id = $1 ORDER BY created_at DESC',
      [guildId]
    )

    return result.rows.map(row => ({
      id: row.id,
      guildId: row.guild_id,
      name: row.name,
      description: row.description,
      eventType: row.event_type,
      enabled: row.enabled,
      scheduleType: row.schedule_type,
      scheduleData: row.schedule_data,
      durationMinutes: row.duration_minutes,
      rewardData: row.reward_data,
      eventData: row.event_data,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  },

  async getEvent(id: number): Promise<Event | null> {
    const pool = getDatabase()
    const result = await pool.query('SELECT * FROM events WHERE id = $1', [id])

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      id: row.id,
      guildId: row.guild_id,
      name: row.name,
      description: row.description,
      eventType: row.event_type,
      enabled: row.enabled,
      scheduleType: row.schedule_type,
      scheduleData: row.schedule_data,
      durationMinutes: row.duration_minutes,
      rewardData: row.reward_data,
      eventData: row.event_data,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  },

  async createEvent(event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<Event> {
    const pool = getDatabase()
    const result = await pool.query(
      `INSERT INTO events (guild_id, name, description, event_type, enabled, schedule_type, schedule_data, duration_minutes, reward_data, event_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        event.guildId,
        event.name,
        event.description,
        event.eventType,
        event.enabled,
        event.scheduleType,
        event.scheduleData,
        event.durationMinutes,
        event.rewardData,
        event.eventData,
      ]
    )

    const row = result.rows[0]
    return {
      id: row.id,
      guildId: row.guild_id,
      name: row.name,
      description: row.description,
      eventType: row.event_type,
      enabled: row.enabled,
      scheduleType: row.schedule_type,
      scheduleData: row.schedule_data,
      durationMinutes: row.duration_minutes,
      rewardData: row.reward_data,
      eventData: row.event_data,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  },

  async updateEvent(id: number, event: Partial<Omit<Event, 'id' | 'guildId' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    const pool = getDatabase()
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (event.name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      values.push(event.name)
    }
    if (event.description !== undefined) {
      updates.push(`description = $${paramIndex++}`)
      values.push(event.description)
    }
    if (event.eventType !== undefined) {
      updates.push(`event_type = $${paramIndex++}`)
      values.push(event.eventType)
    }
    if (event.enabled !== undefined) {
      updates.push(`enabled = $${paramIndex++}`)
      values.push(event.enabled)
    }
    if (event.scheduleType !== undefined) {
      updates.push(`schedule_type = $${paramIndex++}`)
      values.push(event.scheduleType)
    }
    if (event.scheduleData !== undefined) {
      updates.push(`schedule_data = $${paramIndex++}`)
      values.push(event.scheduleData)
    }
    if (event.durationMinutes !== undefined) {
      updates.push(`duration_minutes = $${paramIndex++}`)
      values.push(event.durationMinutes)
    }
    if (event.rewardData !== undefined) {
      updates.push(`reward_data = $${paramIndex++}`)
      values.push(event.rewardData)
    }
    if (event.eventData !== undefined) {
      updates.push(`event_data = $${paramIndex++}`)
      values.push(event.eventData)
    }

    if (updates.length === 0) return

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(id)

    await pool.query(
      `UPDATE events SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    )
  },

  async deleteEvent(id: number): Promise<void> {
    const pool = getDatabase()
    await pool.query('DELETE FROM events WHERE id = $1', [id])
  },

  async getActiveEvents(guildId?: string): Promise<ActiveEvent[]> {
    const pool = getDatabase()
    let query = 'SELECT * FROM active_events WHERE ends_at > CURRENT_TIMESTAMP'
    const params: any[] = []

    if (guildId) {
      query += ' AND guild_id = $1'
      params.push(guildId)
    }

    query += ' ORDER BY started_at DESC'

    const result = await pool.query(query, params)

    return result.rows.map(row => ({
      id: row.id,
      guildId: row.guild_id,
      eventId: row.event_id,
      startedAt: row.started_at,
      endsAt: row.ends_at,
      eventData: row.event_data,
    }))
  },

  async createActiveEvent(activeEvent: Omit<ActiveEvent, 'id'>): Promise<ActiveEvent> {
    const pool = getDatabase()
    const result = await pool.query(
      `INSERT INTO active_events (guild_id, event_id, started_at, ends_at, event_data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [activeEvent.guildId, activeEvent.eventId, activeEvent.startedAt, activeEvent.endsAt, activeEvent.eventData]
    )

    const row = result.rows[0]
    return {
      id: row.id,
      guildId: row.guild_id,
      eventId: row.event_id,
      startedAt: row.started_at,
      endsAt: row.ends_at,
      eventData: row.event_data,
    }
  },

  async deleteActiveEvent(id: number): Promise<void> {
    const pool = getDatabase()
    await pool.query('DELETE FROM active_events WHERE id = $1', [id])
  },

  async getEventParticipants(activeEventId: number): Promise<EventParticipant[]> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT * FROM event_participants WHERE active_event_id = $1 ORDER BY points DESC',
      [activeEventId]
    )

    return result.rows.map(row => ({
      id: row.id,
      activeEventId: row.active_event_id,
      userId: row.user_id,
      points: row.points,
      rewardsEarned: row.rewards_earned,
    }))
  },

  async addEventParticipant(activeEventId: number, userId: string, points: number = 0): Promise<EventParticipant> {
    const pool = getDatabase()
    const result = await pool.query(
      `INSERT INTO event_participants (active_event_id, user_id, points)
       VALUES ($1, $2, $3)
       ON CONFLICT (active_event_id, user_id)
       DO UPDATE SET points = event_participants.points + $3, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [activeEventId, userId, points]
    )

    const row = result.rows[0]
    return {
      id: row.id,
      activeEventId: row.active_event_id,
      userId: row.user_id,
      points: row.points,
      rewardsEarned: row.rewards_earned,
    }
  },

  async updateParticipantPoints(activeEventId: number, userId: string, points: number): Promise<void> {
    const pool = getDatabase()
    await pool.query(
      `UPDATE event_participants 
       SET points = $3, updated_at = CURRENT_TIMESTAMP
       WHERE active_event_id = $1 AND user_id = $2`,
      [activeEventId, userId, points]
    )
  },

  async addHistoryEntry(history: Omit<EventHistory, 'id'>): Promise<void> {
    const pool = getDatabase()
    await pool.query(
      `INSERT INTO event_history (guild_id, event_id, event_name, event_type, started_at, ended_at, total_participants, event_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        history.guildId,
        history.eventId,
        history.eventName,
        history.eventType,
        history.startedAt,
        history.endedAt,
        history.totalParticipants,
        history.eventData,
      ]
    )
  },

  async getEventHistory(guildId: string, limit: number = 50): Promise<EventHistory[]> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT * FROM event_history WHERE guild_id = $1 ORDER BY ended_at DESC LIMIT $2',
      [guildId, limit]
    )

    return result.rows.map(row => ({
      id: row.id,
      guildId: row.guild_id,
      eventId: row.event_id,
      eventName: row.event_name,
      eventType: row.event_type,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      totalParticipants: row.total_participants,
      eventData: row.event_data,
    }))
  },

  async getScheduledEvents(): Promise<Event[]> {
    const pool = getDatabase()
    const result = await pool.query(
      `SELECT * FROM events 
       WHERE enabled = true 
       AND schedule_type IN ('daily', 'weekly', 'specific')
       ORDER BY created_at ASC`
    )

    return result.rows.map(row => ({
      id: row.id,
      guildId: row.guild_id,
      name: row.name,
      description: row.description,
      eventType: row.event_type,
      enabled: row.enabled,
      scheduleType: row.schedule_type,
      scheduleData: row.schedule_data,
      durationMinutes: row.duration_minutes,
      rewardData: row.reward_data,
      eventData: row.event_data,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  },
}

