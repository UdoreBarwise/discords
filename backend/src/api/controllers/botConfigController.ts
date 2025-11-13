import { Request, Response } from 'express'
import { botConfigRepository } from '../../database/botConfigRepository.js'
import { initializeBot } from '../../bot/bot.js'

export const botConfigController = {
  async getToken(req: Request, res: Response) {
    try {
      const token = await botConfigRepository.get('discord_bot_token')
      // Don't send the actual token for security, just indicate if it exists
      res.json({ hasToken: !!token })
    } catch (error) {
      console.error('Error getting bot token:', error)
      res.status(500).json({ error: 'Failed to get bot token status' })
    }
  },

  async setToken(req: Request, res: Response) {
    try {
      const { token } = req.body
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Token is required' })
      }
      await botConfigRepository.set('discord_bot_token', token)
      
      // Re-initialize bot with new token
      console.log('Re-initializing bot with new token...')
      initializeBot().catch((error) => {
        console.error('Failed to initialize bot after token update:', error)
      })
      
      res.json({ success: true, message: 'Token saved' })
    } catch (error) {
      console.error('Error saving bot token:', error)
      res.status(500).json({ error: 'Failed to save bot token' })
    }
  },

  async deleteToken(req: Request, res: Response) {
    try {
      await botConfigRepository.delete('discord_bot_token')
      res.json({ success: true, message: 'Token deleted' })
    } catch (error) {
      console.error('Error deleting bot token:', error)
      res.status(500).json({ error: 'Failed to delete bot token' })
    }
  },

  async getDefaultServer(req: Request, res: Response) {
    try {
      const serverId = await botConfigRepository.get('default_server_id')
      res.json({ serverId: serverId || null })
    } catch (error) {
      console.error('Error getting default server:', error)
      res.status(500).json({ error: 'Failed to get default server' })
    }
  },

  async setDefaultServer(req: Request, res: Response) {
    try {
      const { serverId } = req.body
      if (serverId && typeof serverId !== 'string') {
        return res.status(400).json({ error: 'Invalid server ID' })
      }
      if (serverId) {
        await botConfigRepository.set('default_server_id', serverId)
      } else {
        await botConfigRepository.delete('default_server_id')
      }
      res.json({ success: true, message: 'Default server saved' })
    } catch (error) {
      console.error('Error saving default server:', error)
      res.status(500).json({ error: 'Failed to save default server' })
    }
  },

  async getErrorWebhook(req: Request, res: Response) {
    try {
      const webhookUrl = await botConfigRepository.get('error_webhook_url')
      res.json({ webhookUrl: webhookUrl || '' })
    } catch (error) {
      console.error('Error getting error webhook:', error)
      res.status(500).json({ error: 'Failed to get error webhook' })
    }
  },

  async setErrorWebhook(req: Request, res: Response) {
    try {
      const { webhookUrl } = req.body
      if (webhookUrl && typeof webhookUrl !== 'string') {
        return res.status(400).json({ error: 'Invalid webhook URL' })
      }
      if (webhookUrl && webhookUrl.trim()) {
        // Validate webhook URL format
        if (!webhookUrl.startsWith('https://discord.com/api/webhooks/') && !webhookUrl.startsWith('https://discordapp.com/api/webhooks/')) {
          return res.status(400).json({ error: 'Invalid Discord webhook URL format' })
        }
        await botConfigRepository.set('error_webhook_url', webhookUrl.trim())
      } else {
        await botConfigRepository.delete('error_webhook_url')
      }
      res.json({ success: true, message: 'Error webhook saved' })
    } catch (error) {
      console.error('Error saving error webhook:', error)
      res.status(500).json({ error: 'Failed to save error webhook' })
    }
  },

  async getAIResponseChannels(req: Request, res: Response) {
    try {
      const channelIdsJson = await botConfigRepository.get('ai_response_channel_ids')
      let channelIds: string[] = []
      if (channelIdsJson) {
        try {
          channelIds = JSON.parse(channelIdsJson)
        } catch {
          // If parsing fails, try to read old single channel format for backward compatibility
          const oldChannelId = await botConfigRepository.get('ai_response_channel_id')
          if (oldChannelId) {
            channelIds = [oldChannelId]
          }
        }
      } else {
        // Backward compatibility: check for old single channel format
        const oldChannelId = await botConfigRepository.get('ai_response_channel_id')
        if (oldChannelId) {
          channelIds = [oldChannelId]
        }
      }
      res.json({ channelIds })
    } catch (error) {
      console.error('Error getting AI response channels:', error)
      res.status(500).json({ error: 'Failed to get AI response channels' })
    }
  },

  async setAIResponseChannels(req: Request, res: Response) {
    try {
      const { channelIds } = req.body
      if (!Array.isArray(channelIds)) {
        return res.status(400).json({ error: 'Invalid channel IDs - must be an array' })
      }
      if (channelIds.length > 0) {
        await botConfigRepository.set('ai_response_channel_ids', JSON.stringify(channelIds))
      } else {
        await botConfigRepository.delete('ai_response_channel_ids')
      }
      res.json({ success: true, message: 'AI response channels saved' })
    } catch (error) {
      console.error('Error saving AI response channels:', error)
      res.status(500).json({ error: 'Failed to save AI response channels' })
    }
  },

  async getYouTubeApiKey(req: Request, res: Response) {
    try {
      const apiKey = await botConfigRepository.get('youtube_api_key')
      // Don't send the actual key for security, just indicate if it exists
      res.json({ hasApiKey: !!apiKey })
    } catch (error) {
      console.error('Error getting YouTube API key:', error)
      res.status(500).json({ error: 'Failed to get YouTube API key status' })
    }
  },

  async setYouTubeApiKey(req: Request, res: Response) {
    try {
      const { apiKey } = req.body
      if (!apiKey || typeof apiKey !== 'string') {
        return res.status(400).json({ error: 'API key is required' })
      }
      await botConfigRepository.set('youtube_api_key', apiKey)
      res.json({ success: true, message: 'YouTube API key saved' })
    } catch (error) {
      console.error('Error saving YouTube API key:', error)
      res.status(500).json({ error: 'Failed to save YouTube API key' })
    }
  },

  async deleteYouTubeApiKey(req: Request, res: Response) {
    try {
      await botConfigRepository.delete('youtube_api_key')
      res.json({ success: true, message: 'YouTube API key deleted' })
    } catch (error) {
      console.error('Error deleting YouTube API key:', error)
      res.status(500).json({ error: 'Failed to delete YouTube API key' })
    }
  },
}

