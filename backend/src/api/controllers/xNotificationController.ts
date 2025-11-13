import { Request, Response } from 'express'
import { xNotificationRepository } from '../../database/xNotificationRepository.js'
import { xNotificationService } from '../../services/xNotificationService.js'
import { getBotClient } from '../../bot/bot.js'

export const xNotificationController = {
  async getConfig(req: Request, res: Response) {
    try {
      const { guildId } = req.query
      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      const config = await xNotificationRepository.getConfig(guildId)
      if (!config) {
        return res.json({
          guildId,
          enabled: false,
          channelId: null,
          checkIntervalMinutes: 10,
        })
      }

      res.json(config)
    } catch (error) {
      console.error('Error getting X notification config:', error)
      res.status(500).json({ error: 'Failed to get config' })
    }
  },

  async saveConfig(req: Request, res: Response) {
    try {
      const { guildId, enabled, channelId, checkIntervalMinutes } = req.body

      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'enabled must be a boolean' })
      }

      const interval = checkIntervalMinutes ? parseInt(checkIntervalMinutes) : 10
      if (isNaN(interval) || interval < 1 || interval > 1440) {
        return res.status(400).json({ error: 'checkIntervalMinutes must be between 1 and 1440' })
      }

      await xNotificationRepository.saveConfig({
        guildId,
        enabled,
        channelId: channelId || null,
        checkIntervalMinutes: interval,
      })

      res.json({ success: true, message: 'Config saved' })
    } catch (error) {
      console.error('Error saving X notification config:', error)
      res.status(500).json({ error: 'Failed to save config' })
    }
  },

  async getAccounts(req: Request, res: Response) {
    try {
      const { guildId } = req.query
      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      const accounts = await xNotificationRepository.getAccounts(guildId)
      res.json(accounts)
    } catch (error) {
      console.error('Error getting X accounts:', error)
      res.status(500).json({ error: 'Failed to get accounts' })
    }
  },

  async addAccount(req: Request, res: Response) {
    try {
      const { guildId, xUsername, xDisplayName } = req.body

      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      if (!xUsername || typeof xUsername !== 'string') {
        return res.status(400).json({ error: 'xUsername is required' })
      }

      // Resolve username
      let resolvedUsername: string
      let displayName: string | null = xDisplayName || null

      try {
        resolvedUsername = await xNotificationService.resolveUsername(xUsername)

        // If we don't have a display name, fetch it
        if (!displayName) {
          const accountInfo = await xNotificationService.getAccountInfo(resolvedUsername)
          displayName = accountInfo.displayName
        }
      } catch (error: any) {
        return res.status(400).json({ error: `Failed to resolve username: ${error.message}` })
      }

      // Validate that the account exists
      try {
        const accountInfo = await xNotificationService.getAccountInfo(resolvedUsername)
        if (!displayName && accountInfo.displayName) {
          displayName = accountInfo.displayName
        }
      } catch (error: any) {
        // Continue even if we can't fetch display name
        console.warn(`Could not fetch display name for @${resolvedUsername}:`, error.message)
      }

      const account = await xNotificationRepository.addAccount(
        guildId,
        resolvedUsername,
        displayName
      )

      res.json({ success: true, account })
    } catch (error: any) {
      console.error('Error adding X account:', error)
      res.status(500).json({ error: error.message || 'Failed to add account' })
    }
  },

  async removeAccount(req: Request, res: Response) {
    try {
      const { guildId, xUsername } = req.body

      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      if (!xUsername || typeof xUsername !== 'string') {
        return res.status(400).json({ error: 'xUsername is required' })
      }

      // Resolve username to ensure consistency
      const resolvedUsername = await xNotificationService.resolveUsername(xUsername)

      await xNotificationRepository.removeAccount(guildId, resolvedUsername)
      res.json({ success: true, message: 'Account removed' })
    } catch (error: any) {
      console.error('Error removing X account:', error)
      res.status(500).json({ error: error.message || 'Failed to remove account' })
    }
  },

  async testNotification(req: Request, res: Response) {
    try {
      const { guildId, xUsername } = req.body

      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      if (!xUsername || typeof xUsername !== 'string') {
        return res.status(400).json({ error: 'xUsername is required' })
      }

      const config = await xNotificationRepository.getConfig(guildId)
      if (!config || !config.enabled || !config.channelId) {
        return res.status(400).json({ error: 'X notifications not configured for this server' })
      }

      const resolvedUsername = await xNotificationService.resolveUsername(xUsername)
      const latestTweet = await xNotificationService.getLatestTweet(resolvedUsername)
      if (!latestTweet) {
        return res.status(404).json({ error: 'No tweets found for this account' })
      }

      const botClient = getBotClient()
      if (!botClient) {
        return res.status(500).json({ error: 'Bot client not initialized' })
      }

      const guild = botClient.guilds.cache.get(guildId)
      if (!guild) {
        return res.status(404).json({ error: 'Guild not found' })
      }

      const channel = guild.channels.cache.get(config.channelId)
      if (!channel || !channel.isTextBased()) {
        return res.status(404).json({ error: 'Channel not found or not a text channel' })
      }

      await channel.send(latestTweet.url)

      res.json({ success: true, message: 'Test notification sent' })
    } catch (error: any) {
      console.error('Error sending test notification:', error)
      res.status(500).json({ error: error.message || 'Failed to send test notification' })
    }
  },

  async getLatestTweet(req: Request, res: Response) {
    try {
      const { xUsername } = req.query

      if (!xUsername || typeof xUsername !== 'string') {
        return res.status(400).json({ error: 'xUsername is required' })
      }

      // Resolve username
      let resolvedUsername: string
      try {
        resolvedUsername = await xNotificationService.resolveUsername(xUsername)
      } catch (error: any) {
        return res.status(400).json({ error: `Failed to resolve username: ${error.message}` })
      }

      const latestTweet = await xNotificationService.getLatestTweet(resolvedUsername)
      if (!latestTweet) {
        return res.status(404).json({ error: 'No tweets found for this account' })
      }

      res.json({
        success: true,
        tweet: {
          id: latestTweet.id,
          text: latestTweet.text,
          url: latestTweet.url,
          createdAt: latestTweet.createdAt,
          author: latestTweet.author,
        },
      })
    } catch (error: any) {
      console.error('Error getting latest tweet:', error)
      res.status(500).json({ error: error.message || 'Failed to get latest tweet' })
    }
  },
}


