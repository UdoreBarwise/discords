import { apiClient } from './apiClient'

export interface ScoreboardEntry {
  userId: string
  username: string
  avatar: string | null
  wins: number
  losses: number
  ties: number
  totalGames: number
  winRate: number
}

export interface UserScore {
  guildId: string
  userId: string
  gameType: 'dice' | 'wordle' | 'all'
  wins: number
  losses: number
  ties: number
  totalGames: number
}

export const scoreboardService = {
  async getScoreboard(
    guildId: string,
    gameType?: 'dice' | 'wordle',
    limit?: number
  ): Promise<ScoreboardEntry[]> {
    const response = await apiClient.get('/api/scoreboard', {
      params: {
        guildId,
        ...(gameType && { gameType }),
        ...(limit && { limit }),
      },
    })
    return response.data
  },

  async getUserScore(
    guildId: string,
    userId: string,
    gameType?: 'dice' | 'wordle'
  ): Promise<UserScore> {
    const response = await apiClient.get('/api/scoreboard/user', {
      params: {
        guildId,
        userId,
        ...(gameType && { gameType }),
      },
    })
    return response.data
  },
}

