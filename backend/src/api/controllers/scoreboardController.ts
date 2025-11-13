import { Request, Response } from 'express'
import { scoreboardRepository } from '../../database/scoreboardRepository.js'
import { getBotClient } from '../../bot/bot.js'

export const scoreboardController = {
  async getScoreboard(req: Request, res: Response) {
    try {
      const { guildId, gameType, limit } = req.query

      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      const gameTypeFilter = gameType === 'dice' || gameType === 'wordle' ? gameType : undefined
      const limitNum = limit ? parseInt(limit as string) : 50

      const scoreboard = await scoreboardRepository.getScoreboard(guildId, gameTypeFilter, limitNum)

      // Fetch user information from Discord
      const client = getBotClient()
      const entriesWithUsers = await Promise.all(
        scoreboard.map(async (entry) => {
          let username = entry.userId
          let avatar: string | null = null

          if (client) {
            try {
              const guild = await client.guilds.fetch(guildId)
              const member = await guild.members.fetch(entry.userId).catch(() => null)
              if (member) {
                username = member.displayName || member.user.username
                avatar = member.user.displayAvatarURL({ size: 64 })
              }
            } catch (error) {
              // If we can't fetch user info, just use the user ID
            }
          }

          return {
            ...entry,
            username,
            avatar,
          }
        })
      )

      res.json(entriesWithUsers)
    } catch (error) {
      console.error('Error getting scoreboard:', error)
      res.status(500).json({ error: 'Failed to get scoreboard' })
    }
  },

  async getUserScore(req: Request, res: Response) {
    try {
      const { guildId, userId, gameType } = req.query

      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: 'userId is required' })
      }

      const gameTypeFilter = gameType === 'dice' || gameType === 'wordle' ? gameType : undefined

      const score = await scoreboardRepository.getUserScore(guildId, userId, gameTypeFilter)

      if (!score) {
        return res.json({
          guildId,
          userId,
          gameType: gameTypeFilter || 'all',
          wins: 0,
          losses: 0,
          ties: 0,
          totalGames: 0,
        })
      }

      res.json(score)
    } catch (error) {
      console.error('Error getting user score:', error)
      res.status(500).json({ error: 'Failed to get user score' })
    }
  },
}

