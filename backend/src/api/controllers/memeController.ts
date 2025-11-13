import { Request, Response } from 'express'
import { memeRepository, MemeConfig } from '../../database/memeRepository.js'

export const memeController = {
  async getConfig(req: Request, res: Response) {
    try {
      const { guildId } = req.query
      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      const config = await memeRepository.get(guildId)
      if (!config) {
        return res.json({
          guildId,
          enabled: false,
          channelId: '',
          autoDeleteMessages: false,
          autoPostEnabled: false,
          autoPostIntervalHours: 2,
        })
      }

      res.json(config)
    } catch (error) {
      console.error('Error getting meme config:', error)
      res.status(500).json({ error: 'Failed to get meme config' })
    }
  },

  async saveConfig(req: Request, res: Response) {
    try {
      const { guildId, enabled, channelId, autoDeleteMessages, autoPostEnabled, autoPostIntervalHours } = req.body

      if (!guildId || typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'Invalid configuration data' })
      }

      const config: MemeConfig = {
        guildId,
        enabled,
        channelId: channelId || undefined,
        autoDeleteMessages: autoDeleteMessages || false,
        autoPostEnabled: autoPostEnabled || false,
        autoPostIntervalHours: autoPostIntervalHours || 2,
      }

      await memeRepository.set(config)
      res.json({ success: true, message: 'Configuration saved' })
    } catch (error) {
      console.error('Error saving meme config:', error)
      res.status(500).json({ error: 'Failed to save meme config' })
    }
  },
}

