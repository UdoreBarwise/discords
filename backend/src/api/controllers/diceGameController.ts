import { Request, Response } from 'express'
import { diceGameRepository, DiceGameConfig } from '../../database/diceGameRepository.js'

export const diceGameController = {
  async getConfig(req: Request, res: Response) {
    try {
      const { guildId } = req.query
      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      const config = await diceGameRepository.get(guildId)
      if (!config) {
        return res.json({
          guildId,
          enabled: false,
          channelId: '',
          userCooldownMinutes: 10,
        })
      }

      res.json(config)
    } catch (error) {
      console.error('Error getting dice game config:', error)
      res.status(500).json({ error: 'Failed to get dice game config' })
    }
  },

  async saveConfig(req: Request, res: Response) {
    try {
      const { guildId, enabled, channelId, userCooldownMinutes } = req.body

      if (!guildId || typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'Invalid configuration data' })
      }

      const config: DiceGameConfig = {
        guildId,
        enabled,
        channelId: channelId || undefined,
        userCooldownMinutes: userCooldownMinutes || 10,
      }

      await diceGameRepository.set(config)
      res.json({ success: true, message: 'Configuration saved' })
    } catch (error) {
      console.error('Error saving dice game config:', error)
      res.status(500).json({ error: 'Failed to save dice game config' })
    }
  },
}

