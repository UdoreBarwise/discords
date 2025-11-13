import { Request, Response } from 'express'
import { scoreboardConfigRepository } from '../../database/scoreboardConfigRepository.js'
import { scoreboardService } from '../../services/scoreboardService.js'

export const scoreboardConfigController = {
  async getConfig(req: Request, res: Response) {
    try {
      const { guildId } = req.query

      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      const config = await scoreboardConfigRepository.get(guildId)
      res.json(config || {
        guildId,
        enabled: false,
        updateIntervalMinutes: 5,
        gameType: 'all',
        limitPlayers: 10,
      })
    } catch (error: any) {
      console.error('Error getting scoreboard config:', error)
      res.status(500).json({ error: 'Failed to get scoreboard config' })
    }
  },

  async saveConfig(req: Request, res: Response) {
    try {
      const { guildId, enabled, channelId, updateIntervalMinutes, gameType, limitPlayers } = req.body

      if (!guildId) {
        return res.status(400).json({ error: 'guildId is required' })
      }

      await scoreboardConfigRepository.set({
        guildId,
        enabled: enabled ?? false,
        channelId: channelId || undefined,
        updateIntervalMinutes: updateIntervalMinutes || 5,
        gameType: gameType || 'all',
        limitPlayers: limitPlayers || 10,
      })

      // Update leaderboard immediately if enabled
      if (enabled) {
        scoreboardService.updateLeaderboardMessage(guildId).catch(console.error)
      }

      res.json({ success: true, message: 'Scoreboard config saved' })
    } catch (error: any) {
      console.error('Error saving scoreboard config:', error)
      res.status(500).json({ error: 'Failed to save scoreboard config' })
    }
  },
}

