import { Request, Response } from 'express'
import { autoModeratorService } from '../../services/autoModeratorService.js'
import { AutoModeratorConfig } from '../../database/autoModeratorRepository.js'

export const autoModeratorController = {
  async getConfig(req: Request, res: Response) {
    try {
      const { guildId } = req.query
      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      const config = await autoModeratorService.getConfig(guildId)
      
      // Return default config if none exists
      if (!config) {
        const defaultConfig: AutoModeratorConfig = {
          guildId,
          enabled: false,
          severityLevel: 'medium',
          whitelistWords: [],
          blacklistWords: [],
          whitelistUsers: [],
          blacklistUsers: [],
          whitelistChannels: [],
          blacklistChannels: [],
          whitelistRoles: [],
          blacklistRoles: [],
          actionOnViolation: 'delete',
          warnOnViolation: true,
          logChannelId: null,
        }
        return res.json(defaultConfig)
      }

      res.json(config)
    } catch (error) {
      console.error('Error getting auto moderator config:', error)
      res.status(500).json({ error: 'Failed to get auto moderator config' })
    }
  },

  async saveConfig(req: Request, res: Response) {
    try {
      const config: AutoModeratorConfig = req.body

      if (!config.guildId) {
        return res.status(400).json({ error: 'guildId is required' })
      }

      // Validate severity level
      if (!['low', 'medium', 'high'].includes(config.severityLevel)) {
        return res.status(400).json({ error: 'Invalid severity level' })
      }

      // Validate action
      if (!['delete', 'warn', 'timeout', 'kick', 'ban'].includes(config.actionOnViolation)) {
        return res.status(400).json({ error: 'Invalid action on violation' })
      }

      await autoModeratorService.saveConfig(config)
      res.json({ success: true, message: 'Auto moderator config saved' })
    } catch (error) {
      console.error('Error saving auto moderator config:', error)
      res.status(500).json({ error: 'Failed to save auto moderator config' })
    }
  },
}

