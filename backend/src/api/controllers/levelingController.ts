import { Request, Response } from 'express'
import { levelingService } from '../../services/levelingService.js'
import { LevelingConfig, LevelRoleReward } from '../../database/levelingRepository.js'

export const levelingController = {
  async getConfig(req: Request, res: Response) {
    try {
      const { guildId } = req.query
      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      const config = await levelingService.getConfig(guildId)
      
      // Return default config if none exists
      if (!config) {
        const defaultConfig: LevelingConfig = {
          guildId,
          enabled: false,
          xpPerMessage: 10,
          xpPerReaction: 5,
          messageCooldownSeconds: 60,
          minMessageLength: 0,
          whitelistChannels: [],
          blacklistChannels: [],
          whitelistRoles: [],
          blacklistRoles: [],
          levelUpChannelId: null,
          levelUpMessage: null,
        }
        return res.json(defaultConfig)
      }

      res.json(config)
    } catch (error) {
      console.error('Error getting leveling config:', error)
      res.status(500).json({ error: 'Failed to get leveling config' })
    }
  },

  async saveConfig(req: Request, res: Response) {
    try {
      const config: LevelingConfig = req.body

      if (!config.guildId) {
        return res.status(400).json({ error: 'guildId is required' })
      }

      // Validate numeric fields
      if (typeof config.xpPerMessage !== 'number' || config.xpPerMessage < 0) {
        return res.status(400).json({ error: 'xpPerMessage must be a non-negative number' })
      }
      if (typeof config.xpPerReaction !== 'number' || config.xpPerReaction < 0) {
        return res.status(400).json({ error: 'xpPerReaction must be a non-negative number' })
      }
      if (typeof config.messageCooldownSeconds !== 'number' || config.messageCooldownSeconds < 0) {
        return res.status(400).json({ error: 'messageCooldownSeconds must be a non-negative number' })
      }
      if (typeof config.minMessageLength !== 'number' || config.minMessageLength < 0) {
        return res.status(400).json({ error: 'minMessageLength must be a non-negative number' })
      }

      await levelingService.saveConfig(config)
      res.json({ success: true, message: 'Leveling config saved' })
    } catch (error) {
      console.error('Error saving leveling config:', error)
      res.status(500).json({ error: 'Failed to save leveling config' })
    }
  },

  async getUserLevel(req: Request, res: Response) {
    try {
      const { guildId, userId } = req.query

      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: 'userId is required' })
      }

      const userLevel = await levelingService.getUserLevel(guildId, userId)

      if (!userLevel) {
        return res.json({
          guildId,
          userId,
          xp: 0,
          level: 0,
          totalMessages: 0,
          lastMessageAt: null,
        })
      }

      res.json(userLevel)
    } catch (error) {
      console.error('Error getting user level:', error)
      res.status(500).json({ error: 'Failed to get user level' })
    }
  },

  async getLeaderboard(req: Request, res: Response) {
    try {
      const { guildId } = req.query
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50

      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      if (isNaN(limit) || limit < 1 || limit > 100) {
        return res.status(400).json({ error: 'limit must be between 1 and 100' })
      }

      const leaderboard = await levelingService.getLeaderboard(guildId, limit)
      res.json(leaderboard)
    } catch (error) {
      console.error('Error getting leaderboard:', error)
      res.status(500).json({ error: 'Failed to get leaderboard' })
    }
  },

  async getLevelRoleRewards(req: Request, res: Response) {
    try {
      const { guildId } = req.query

      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      const rewards = await levelingService.getLevelRoleRewards(guildId)
      res.json(rewards)
    } catch (error) {
      console.error('Error getting level role rewards:', error)
      res.status(500).json({ error: 'Failed to get level role rewards' })
    }
  },

  async saveLevelRoleReward(req: Request, res: Response) {
    try {
      const { guildId, level, roleId } = req.body

      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      if (typeof level !== 'number' || level < 1) {
        return res.status(400).json({ error: 'level must be a positive number' })
      }

      if (!roleId || typeof roleId !== 'string') {
        return res.status(400).json({ error: 'roleId is required' })
      }

      await levelingService.saveLevelRoleReward(guildId, level, roleId)
      res.json({ success: true, message: 'Level role reward saved' })
    } catch (error) {
      console.error('Error saving level role reward:', error)
      res.status(500).json({ error: 'Failed to save level role reward' })
    }
  },

  async deleteLevelRoleReward(req: Request, res: Response) {
    try {
      const { guildId, level } = req.query

      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      if (!level || isNaN(parseInt(level as string))) {
        return res.status(400).json({ error: 'level is required and must be a number' })
      }

      await levelingService.deleteLevelRoleReward(guildId, parseInt(level as string))
      res.json({ success: true, message: 'Level role reward deleted' })
    } catch (error) {
      console.error('Error deleting level role reward:', error)
      res.status(500).json({ error: 'Failed to delete level role reward' })
    }
  },
}

