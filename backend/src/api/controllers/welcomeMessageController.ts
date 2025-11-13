import { Request, Response } from 'express'
import { welcomeMessageRepository, WelcomeMessageConfig } from '../../database/welcomeMessageRepository.js'

export const welcomeMessageController = {
  async getConfig(req: Request, res: Response) {
    try {
      const { guildId } = req.query
      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      const config = await welcomeMessageRepository.getConfig(guildId)
      res.json(config || null)
    } catch (error) {
      console.error('Error getting welcome message config:', error)
      res.status(500).json({ error: 'Failed to get welcome message config' })
    }
  },

  async saveConfig(req: Request, res: Response) {
    try {
      const config = req.body as WelcomeMessageConfig

      if (!config.guildId) {
        return res.status(400).json({ error: 'guildId is required' })
      }

      if (!config.sendAsDM && !config.channelId) {
        return res.status(400).json({ error: 'channelId is required when sendAsDM is false' })
      }

      await welcomeMessageRepository.saveConfig(config)
      res.json({ success: true, message: 'Config saved' })
    } catch (error) {
      console.error('Error saving welcome message config:', error)
      res.status(500).json({ error: 'Failed to save welcome message config' })
    }
  },

  async deleteConfig(req: Request, res: Response) {
    try {
      const { guildId } = req.query
      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      await welcomeMessageRepository.deleteConfig(guildId)
      res.json({ success: true, message: 'Config deleted' })
    } catch (error) {
      console.error('Error deleting welcome message config:', error)
      res.status(500).json({ error: 'Failed to delete welcome message config' })
    }
  },
}

