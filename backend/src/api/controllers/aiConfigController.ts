import { Request, Response } from 'express'
import { aiConfigRepository, AIConfig } from '../../database/aiConfigRepository.js'

export const aiConfigController = {
  async getConfig(req: Request, res: Response) {
    try {
      const { guildId } = req.query
      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      const config = await aiConfigRepository.get(guildId)
      if (!config) {
        return res.json({
          guildId,
          allowedChannelIds: [],
          rateLimitPerMinute: 5,
          rateLimitPerHour: 50,
          blockedUserIds: [],
          allowedRoleIds: [],
          channelConfigs: {},
        })
      }

      res.json(config)
    } catch (error) {
      console.error('Error getting AI config:', error)
      res.status(500).json({ error: 'Failed to get AI config' })
    }
  },

  async saveConfig(req: Request, res: Response) {
    try {
      const { guildId, allowedChannelIds, rateLimitPerMinute, rateLimitPerHour, blockedUserIds, allowedRoleIds, channelConfigs } = req.body

      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      const config: AIConfig = {
        guildId,
        allowedChannelIds: Array.isArray(allowedChannelIds) ? allowedChannelIds : undefined,
        rateLimitPerMinute: rateLimitPerMinute || 5,
        rateLimitPerHour: rateLimitPerHour || 50,
        blockedUserIds: Array.isArray(blockedUserIds) ? blockedUserIds : undefined,
        allowedRoleIds: Array.isArray(allowedRoleIds) ? allowedRoleIds : undefined,
        channelConfigs: channelConfigs && typeof channelConfigs === 'object' ? channelConfigs : undefined,
      }

      await aiConfigRepository.set(config)
      res.json({ success: true, message: 'AI configuration saved' })
    } catch (error) {
      console.error('Error saving AI config:', error)
      res.status(500).json({ error: 'Failed to save AI config' })
    }
  },
}

