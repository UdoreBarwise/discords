import { Request, Response } from 'express'
import { wordleRepository, WordleConfig } from '../../database/wordleRepository.js'

export const wordleController = {
  async getConfig(req: Request, res: Response) {
    try {
      const { guildId } = req.query
      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      const config = await wordleRepository.get(guildId)
      if (!config) {
        return res.json({
          guildId,
          enabled: false,
          channelId: '',
          allowedRoleIds: [],
          allowedUserIds: [],
          dmOnly: false,
          userCooldownMinutes: 60,
        })
      }

      res.json(config)
    } catch (error) {
      console.error('Error getting wordle config:', error)
      res.status(500).json({ error: 'Failed to get wordle config' })
    }
  },

  async saveConfig(req: Request, res: Response) {
    try {
      const { guildId, enabled, channelId, allowedRoleIds, allowedUserIds, dmOnly, userCooldownMinutes } = req.body

      if (!guildId || typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'Invalid configuration data' })
      }

      const config: WordleConfig = {
        guildId,
        enabled,
        channelId: channelId || undefined,
        allowedRoleIds: Array.isArray(allowedRoleIds) && allowedRoleIds.length > 0 ? allowedRoleIds : undefined,
        allowedUserIds: Array.isArray(allowedUserIds) && allowedUserIds.length > 0 ? allowedUserIds : undefined,
        dmOnly: dmOnly || false,
        userCooldownMinutes: userCooldownMinutes || 60,
      }

      await wordleRepository.set(config)
      res.json({ success: true, message: 'Configuration saved' })
    } catch (error) {
      console.error('Error saving wordle config:', error)
      res.status(500).json({ error: 'Failed to save wordle config' })
    }
  },
}

