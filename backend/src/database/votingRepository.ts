import { getDatabase } from './database.js'

export interface VotingPoll {
  id: number
  pollId: string
  guildId: string
  channelId: string
  messageId: string
  title: string
  description?: string
  options: string[]
  createdBy: string
  createdAt: Date
  expiresAt?: Date
  closed: boolean
}

export interface VotingVote {
  id: number
  pollId: string
  userId: string
  optionIndex: number
  createdAt: Date
}

export const votingRepository = {
  async createPoll(poll: Omit<VotingPoll, 'id' | 'createdAt'>): Promise<VotingPoll> {
    const pool = getDatabase()
    const result = await pool.query(
      `INSERT INTO voting_polls (poll_id, guild_id, channel_id, message_id, title, description, options, created_by, expires_at, closed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        poll.pollId,
        poll.guildId,
        poll.channelId,
        poll.messageId,
        poll.title,
        poll.description || null,
        JSON.stringify(poll.options),
        poll.createdBy,
        poll.expiresAt || null,
        poll.closed || false,
      ]
    )

    const row = result.rows[0]
    return {
      id: row.id,
      pollId: row.poll_id,
      guildId: row.guild_id,
      channelId: row.channel_id,
      messageId: row.message_id,
      title: row.title,
      description: row.description,
      options: JSON.parse(row.options),
      createdBy: row.created_by,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      closed: row.closed,
    }
  },

  async getPoll(pollId: string): Promise<VotingPoll | null> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT * FROM voting_polls WHERE poll_id = $1',
      [pollId]
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      id: row.id,
      pollId: row.poll_id,
      guildId: row.guild_id,
      channelId: row.channel_id,
      messageId: row.message_id,
      title: row.title,
      description: row.description,
      options: JSON.parse(row.options),
      createdBy: row.created_by,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      closed: row.closed,
    }
  },

  async getPollByMessage(guildId: string, channelId: string, messageId: string): Promise<VotingPoll | null> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT * FROM voting_polls WHERE guild_id = $1 AND channel_id = $2 AND message_id = $3',
      [guildId, channelId, messageId]
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      id: row.id,
      pollId: row.poll_id,
      guildId: row.guild_id,
      channelId: row.channel_id,
      messageId: row.message_id,
      title: row.title,
      description: row.description,
      options: JSON.parse(row.options),
      createdBy: row.created_by,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      closed: row.closed,
    }
  },

  async getPollsByGuild(guildId: string, includeClosed: boolean = false): Promise<VotingPoll[]> {
    const pool = getDatabase()
    let query = 'SELECT * FROM voting_polls WHERE guild_id = $1'
    const params: any[] = [guildId]

    if (!includeClosed) {
      query += ' AND closed = false'
    }

    query += ' ORDER BY created_at DESC'

    const result = await pool.query(query, params)

    return result.rows.map((row) => ({
      id: row.id,
      pollId: row.poll_id,
      guildId: row.guild_id,
      channelId: row.channel_id,
      messageId: row.message_id,
      title: row.title,
      description: row.description,
      options: JSON.parse(row.options),
      createdBy: row.created_by,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      closed: row.closed,
    }))
  },

  async closePoll(pollId: string): Promise<void> {
    const pool = getDatabase()
    await pool.query(
      'UPDATE voting_polls SET closed = true WHERE poll_id = $1',
      [pollId]
    )
  },

  async addVote(pollId: string, userId: string, optionIndex: number): Promise<void> {
    const pool = getDatabase()
    // Check if user already voted (for anonymous voting, we only track if they voted, not what they voted)
    // But we'll allow changing votes by updating the existing vote
    await pool.query(
      `INSERT INTO voting_votes (poll_id, user_id, option_index)
       VALUES ($1, $2, $3)
       ON CONFLICT(poll_id, user_id) DO UPDATE SET
         option_index = EXCLUDED.option_index,
         created_at = CURRENT_TIMESTAMP`,
      [pollId, userId, optionIndex]
    )
  },

  async hasVoted(pollId: string, userId: string): Promise<boolean> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT 1 FROM voting_votes WHERE poll_id = $1 AND user_id = $2 LIMIT 1',
      [pollId, userId]
    )
    return result.rows.length > 0
  },

  async getVoteCounts(pollId: string): Promise<Record<number, number>> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT option_index, COUNT(*) as count FROM voting_votes WHERE poll_id = $1 GROUP BY option_index',
      [pollId]
    )

    const counts: Record<number, number> = {}
    result.rows.forEach((row) => {
      counts[row.option_index] = parseInt(row.count, 10)
    })

    return counts
  },

  async getTotalVotes(pollId: string): Promise<number> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM voting_votes WHERE poll_id = $1',
      [pollId]
    )
    return parseInt(result.rows[0].count, 10)
  },

  async deletePoll(pollId: string): Promise<void> {
    const pool = getDatabase()
    await pool.query('DELETE FROM voting_votes WHERE poll_id = $1', [pollId])
    await pool.query('DELETE FROM voting_polls WHERE poll_id = $1', [pollId])
  },
}

