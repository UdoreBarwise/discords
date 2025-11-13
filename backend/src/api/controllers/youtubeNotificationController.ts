import { Request, Response } from 'express'
import { youtubeNotificationRepository } from '../../database/youtubeNotificationRepository.js'
import { youtubeNotificationService } from '../../services/youtubeNotificationService.js'
import { getBotClient } from '../../bot/bot.js'

export const youtubeNotificationController = {
  async getConfig(req: Request, res: Response) {
    try {
      const { guildId } = req.query
      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      const config = await youtubeNotificationRepository.getConfig(guildId)
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
      console.error('Error getting YouTube notification config:', error)
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

      await youtubeNotificationRepository.saveConfig({
        guildId,
        enabled,
        channelId: channelId || null,
        checkIntervalMinutes: interval,
      })

      res.json({ success: true, message: 'Config saved' })
    } catch (error) {
      console.error('Error saving YouTube notification config:', error)
      res.status(500).json({ error: 'Failed to save config' })
    }
  },

  async getChannels(req: Request, res: Response) {
    try {
      const { guildId } = req.query
      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      const channels = await youtubeNotificationRepository.getChannels(guildId)
      res.json(channels)
    } catch (error) {
      console.error('Error getting YouTube channels:', error)
      res.status(500).json({ error: 'Failed to get channels' })
    }
  },

  async addChannel(req: Request, res: Response) {
    try {
      const { guildId, youtubeChannelId, youtubeChannelName } = req.body

      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      if (!youtubeChannelId || typeof youtubeChannelId !== 'string') {
        return res.status(400).json({ error: 'youtubeChannelId is required' })
      }

      // Try to resolve channel ID if it's not already a channel ID
      let resolvedChannelId: string
      let channelName: string | null = youtubeChannelName || null

      try {
        resolvedChannelId = (await youtubeNotificationService.resolveChannelId(youtubeChannelId)) || youtubeChannelId
        
        // If we resolved it and don't have a name, fetch it
        if (!channelName && resolvedChannelId !== youtubeChannelId) {
          const channelInfo = await youtubeNotificationService.getChannelInfo(resolvedChannelId)
          if (channelInfo) {
            channelName = channelInfo.snippet.title
          }
        }
      } catch (error: any) {
        return res.status(400).json({ error: `Failed to resolve channel: ${error.message}` })
      }

      // Validate that the channel exists
      try {
        const channelInfo = await youtubeNotificationService.getChannelInfo(resolvedChannelId)
        if (!channelInfo) {
          return res.status(400).json({ error: 'YouTube channel not found' })
        }
        if (!channelName) {
          channelName = channelInfo.snippet.title
        }
      } catch (error: any) {
        return res.status(400).json({ error: `Failed to validate channel: ${error.message}` })
      }

      const channel = await youtubeNotificationRepository.addChannel(
        guildId,
        resolvedChannelId,
        channelName
      )

      res.json({ success: true, channel })
    } catch (error: any) {
      console.error('Error adding YouTube channel:', error)
      res.status(500).json({ error: error.message || 'Failed to add channel' })
    }
  },

  async removeChannel(req: Request, res: Response) {
    try {
      const { guildId, youtubeChannelId } = req.body

      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      if (!youtubeChannelId || typeof youtubeChannelId !== 'string') {
        return res.status(400).json({ error: 'youtubeChannelId is required' })
      }

      await youtubeNotificationRepository.removeChannel(guildId, youtubeChannelId)
      res.json({ success: true, message: 'Channel removed' })
    } catch (error) {
      console.error('Error removing YouTube channel:', error)
      res.status(500).json({ error: 'Failed to remove channel' })
    }
  },

  async testNotification(req: Request, res: Response) {
    try {
      const { guildId, youtubeChannelId } = req.body

      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      if (!youtubeChannelId || typeof youtubeChannelId !== 'string') {
        return res.status(400).json({ error: 'youtubeChannelId is required' })
      }

      const config = await youtubeNotificationRepository.getConfig(guildId)
      if (!config || !config.enabled || !config.channelId) {
        return res.status(400).json({ error: 'YouTube notifications not configured for this server' })
      }

      const latestVideo = await youtubeNotificationService.getLatestVideo(youtubeChannelId)
      if (!latestVideo) {
        return res.status(404).json({ error: 'No videos found for this channel' })
      }

      const videoId = latestVideo.id
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
      
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

      await channel.send(videoUrl)

      res.json({ success: true, message: 'Test notification sent' })
    } catch (error: any) {
      console.error('Error sending test notification:', error)
      res.status(500).json({ error: error.message || 'Failed to send test notification' })
    }
  },

  async getLatestVideo(req: Request, res: Response) {
    try {
      const { youtubeChannelId } = req.query

      if (!youtubeChannelId || typeof youtubeChannelId !== 'string') {
        return res.status(400).json({ error: 'youtubeChannelId is required' })
      }

      // Try to resolve channel ID if it's not already a channel ID
      let resolvedChannelId: string
      try {
        resolvedChannelId = (await youtubeNotificationService.resolveChannelId(youtubeChannelId)) || youtubeChannelId
      } catch (error: any) {
        return res.status(400).json({ error: `Failed to resolve channel: ${error.message}` })
      }

      const latestVideo = await youtubeNotificationService.getLatestVideo(resolvedChannelId)
      if (!latestVideo) {
        return res.status(404).json({ error: 'No videos found for this channel' })
      }

      const videoId = latestVideo.id
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
      const description = latestVideo.snippet.description
      const truncatedDescription = description.length > 500
        ? description.substring(0, 497) + '...'
        : description

      const publishedDate = new Date(latestVideo.snippet.publishedAt)
      const formattedDate = publishedDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      res.json({
        success: true,
        video: {
          id: videoId,
          title: latestVideo.snippet.title,
          description: truncatedDescription,
          url: videoUrl,
          thumbnail: latestVideo.snippet.thumbnails.high.url,
          channelTitle: latestVideo.snippet.channelTitle,
          publishedAt: latestVideo.snippet.publishedAt,
          publishedAtFormatted: formattedDate,
          duration: latestVideo.contentDetails?.duration 
            ? youtubeNotificationService.formatDuration(latestVideo.contentDetails.duration)
            : 'N/A',
        },
      })
    } catch (error: any) {
      console.error('Error getting latest video:', error)
      res.status(500).json({ error: error.message || 'Failed to get latest video' })
    }
  },
}

