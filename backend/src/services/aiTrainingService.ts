import { getDatabase } from '../database/database.js'
import crypto from 'crypto'

export type TrainingReaction = 'good' | 'bad'

interface TrainingData {
  id: number
  guildId: string
  userMessage: string
  botResponse: string
  reaction: TrainingReaction
  userId?: string
  messageHash: string
  createdAt: Date
}

export const aiTrainingService = {
  /**
   * Generate a hash from user message for similarity matching
   */
  hashMessage(message: string): string {
    // Normalize message: lowercase, remove extra spaces, remove punctuation
    const normalized = message
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    
    return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16)
  },

  /**
   * Store a training example (reaction to bot response)
   */
  async recordTraining(
    guildId: string,
    userMessage: string,
    botResponse: string,
    reaction: TrainingReaction,
    userId?: string
  ): Promise<void> {
    const db = getDatabase()
    const messageHash = this.hashMessage(userMessage)
    
    await db.query(
      `INSERT INTO ai_training (guild_id, user_message, bot_response, reaction, user_id, message_hash)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [guildId, userMessage, botResponse, reaction, userId || null, messageHash]
    )
    
    console.log(`[AI Training] Recorded ${reaction} reaction for message hash ${messageHash}`)
  },

  /**
   * Get learned patterns for similar messages
   */
  async getLearnedPatterns(
    guildId: string,
    userMessage: string,
    limit: number = 5
  ): Promise<TrainingData[]> {
    const db = getDatabase()
    const messageHash = this.hashMessage(userMessage)
    
    const result = await db.query(
      `SELECT * FROM ai_training 
       WHERE guild_id = $1 AND message_hash = $2 
       ORDER BY created_at DESC 
       LIMIT $3`,
      [guildId, messageHash, limit]
    )
    
    return result.rows.map(row => ({
      id: row.id,
      guildId: row.guild_id,
      userMessage: row.user_message,
      botResponse: row.bot_response,
      reaction: row.reaction as TrainingReaction,
      userId: row.user_id,
      messageHash: row.message_hash,
      createdAt: row.created_at,
    }))
  },

  /**
   * Get overall sentiment for similar messages (more good vs bad reactions)
   */
  async getSentimentForMessage(
    guildId: string,
    userMessage: string
  ): Promise<'good' | 'bad' | 'neutral' | null> {
    const patterns = await this.getLearnedPatterns(guildId, userMessage, 10)
    
    if (patterns.length === 0) {
      return null
    }
    
    const goodCount = patterns.filter(p => p.reaction === 'good').length
    const badCount = patterns.filter(p => p.reaction === 'bad').length
    
    if (goodCount > badCount * 1.5) {
      return 'good'
    } else if (badCount > goodCount * 1.5) {
      return 'bad'
    } else {
      return 'neutral'
    }
  },

  /**
   * Get example responses that were positively received
   */
  async getGoodResponseExamples(
    guildId: string,
    userMessage: string,
    limit: number = 3
  ): Promise<string[]> {
    const patterns = await this.getLearnedPatterns(guildId, userMessage, limit * 2)
    const goodResponses = patterns
      .filter(p => p.reaction === 'good')
      .slice(0, limit)
      .map(p => p.botResponse)
    
    return goodResponses
  },

  /**
   * Get example responses that were negatively received (to avoid)
   */
  async getBadResponseExamples(
    guildId: string,
    userMessage: string,
    limit: number = 3
  ): Promise<string[]> {
    const patterns = await this.getLearnedPatterns(guildId, userMessage, limit * 2)
    const badResponses = patterns
      .filter(p => p.reaction === 'bad')
      .slice(0, limit)
      .map(p => p.botResponse)
    
    return badResponses
  },

  /**
   * Check if training is enabled for a guild
   */
  async isTrainingEnabled(guildId: string): Promise<boolean> {
    // For now, we'll check bot_config for a global setting
    // Later can be per-guild
    const db = getDatabase()
    const result = await db.query(
      `SELECT value FROM bot_config WHERE key = 'ai_training_enabled'`
    )
    
    if (result.rows.length === 0) {
      return false // Default to disabled
    }
    
    return result.rows[0].value === 'true'
  },

  /**
   * Set training enabled/disabled
   */
  async setTrainingEnabled(enabled: boolean): Promise<void> {
    const db = getDatabase()
    await db.query(
      `INSERT INTO bot_config (key, value) 
       VALUES ('ai_training_enabled', $1)
       ON CONFLICT (key) 
       DO UPDATE SET value = $1`,
      [enabled ? 'true' : 'false']
    )
  },
}

