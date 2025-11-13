import { getDatabase } from './database.js'

export interface GameScore {
  guildId: string
  userId: string
  gameType: 'dice' | 'wordle'
  wins: number
  losses: number
  ties: number
  totalGames: number
}

export interface ScoreboardEntry {
  userId: string
  wins: number
  losses: number
  ties: number
  totalGames: number
  winRate: number
}

export const scoreboardRepository = {
  async recordGameResult(
    guildId: string,
    userId: string,
    gameType: 'dice' | 'wordle',
    result: 'win' | 'loss' | 'tie'
  ): Promise<void> {
    const pool = getDatabase()
    
    await pool.query(
      `INSERT INTO game_scores (guild_id, user_id, game_type, wins, losses, ties, total_games, updated_at)
       VALUES ($1, $2, $3, 
         CASE WHEN $4 = 'win' THEN 1 ELSE 0 END,
         CASE WHEN $4 = 'loss' THEN 1 ELSE 0 END,
         CASE WHEN $4 = 'tie' THEN 1 ELSE 0 END,
         1,
         CURRENT_TIMESTAMP)
       ON CONFLICT(guild_id, user_id, game_type) DO UPDATE SET
         wins = game_scores.wins + CASE WHEN $4 = 'win' THEN 1 ELSE 0 END,
         losses = game_scores.losses + CASE WHEN $4 = 'loss' THEN 1 ELSE 0 END,
         ties = game_scores.ties + CASE WHEN $4 = 'tie' THEN 1 ELSE 0 END,
         total_games = game_scores.total_games + 1,
         updated_at = CURRENT_TIMESTAMP`,
      [guildId, userId, gameType, result]
    )
  },

  async getScoreboard(
    guildId: string,
    gameType?: 'dice' | 'wordle',
    limit: number = 50
  ): Promise<ScoreboardEntry[]> {
    const pool = getDatabase()
    
    let query = `
      SELECT 
        user_id,
        SUM(wins) as wins,
        SUM(losses) as losses,
        SUM(ties) as ties,
        SUM(total_games) as total_games,
        CASE 
          WHEN SUM(total_games) > 0 THEN 
            ROUND((SUM(wins)::DECIMAL / SUM(total_games)) * 100, 2)
          ELSE 0
        END as win_rate
      FROM game_scores
      WHERE guild_id = $1
    `
    
    const params: any[] = [guildId]
    
    if (gameType) {
      query += ' AND game_type = $2'
      params.push(gameType)
    }
    
    query += `
      GROUP BY user_id
      ORDER BY SUM(wins) DESC, 
               CASE WHEN SUM(total_games) > 0 THEN (SUM(wins)::DECIMAL / SUM(total_games)) ELSE 0 END DESC,
               SUM(total_games) DESC
      LIMIT $${params.length + 1}
    `
    params.push(limit)
    
    const result = await pool.query(query, params)
    
    return result.rows.map((row) => ({
      userId: row.user_id,
      wins: parseInt(row.wins) || 0,
      losses: parseInt(row.losses) || 0,
      ties: parseInt(row.ties) || 0,
      totalGames: parseInt(row.total_games) || 0,
      winRate: parseFloat(row.win_rate) || 0,
    }))
  },

  async getUserScore(
    guildId: string,
    userId: string,
    gameType?: 'dice' | 'wordle'
  ): Promise<GameScore | null> {
    const pool = getDatabase()
    
    let query = `
      SELECT 
        guild_id,
        user_id,
        game_type,
        SUM(wins) as wins,
        SUM(losses) as losses,
        SUM(ties) as ties,
        SUM(total_games) as total_games
      FROM game_scores
      WHERE guild_id = $1 AND user_id = $2
    `
    
    const params: any[] = [guildId, userId]
    
    if (gameType) {
      query += ' AND game_type = $3'
      params.push(gameType)
    }
    
    query += ' GROUP BY guild_id, user_id, game_type'
    
    const result = await pool.query(query, params)
    
    if (result.rows.length === 0) {
      return null
    }
    
    // If gameType is specified, return single result
    if (gameType) {
      const row = result.rows[0]
      return {
        guildId: row.guild_id,
        userId: row.user_id,
        gameType: row.game_type,
        wins: parseInt(row.wins) || 0,
        losses: parseInt(row.losses) || 0,
        ties: parseInt(row.ties) || 0,
        totalGames: parseInt(row.total_games) || 0,
      }
    }
    
    // Otherwise, aggregate across all game types
    const aggregated = result.rows.reduce(
      (acc, row) => ({
        guildId: row.guild_id,
        userId: row.user_id,
        gameType: 'dice' as 'dice' | 'wordle', // placeholder
        wins: acc.wins + (parseInt(row.wins) || 0),
        losses: acc.losses + (parseInt(row.losses) || 0),
        ties: acc.ties + (parseInt(row.ties) || 0),
        totalGames: acc.totalGames + (parseInt(row.total_games) || 0),
      }),
      {
        guildId: result.rows[0].guild_id,
        userId: result.rows[0].user_id,
        gameType: 'dice' as 'dice' | 'wordle',
        wins: 0,
        losses: 0,
        ties: 0,
        totalGames: 0,
      }
    )
    
    return aggregated
  },
}

