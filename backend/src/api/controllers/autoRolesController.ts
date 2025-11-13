import { Request, Response } from 'express'
import { TextChannel } from 'discord.js'
import { autoRolesRepository, AutoRolesConfig } from '../../database/autoRolesRepository.js'
import { autoRolesService } from '../../services/autoRolesService.js'
import { getBotClient } from '../../bot/bot.js'

export const autoRolesController = {
  async getConfig(req: Request, res: Response) {
    try {
      const { guildId } = req.query
      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      const config = await autoRolesRepository.getConfig(guildId)
      res.json(config || null)
    } catch (error) {
      console.error('Error getting auto roles config:', error)
      res.status(500).json({ error: 'Failed to get auto roles config' })
    }
  },

  async saveConfig(req: Request, res: Response) {
    try {
      const config = req.body as AutoRolesConfig

      if (!config.guildId || !config.channelId) {
        return res.status(400).json({ error: 'guildId and channelId are required' })
      }

      if (!config.reactionRoles || !Array.isArray(config.reactionRoles)) {
        return res.status(400).json({ error: 'reactionRoles must be an array' })
      }

      await autoRolesRepository.saveConfig(config)
      res.json({ success: true, message: 'Config saved' })
    } catch (error) {
      console.error('Error saving auto roles config:', error)
      res.status(500).json({ error: 'Failed to save auto roles config' })
    }
  },

  async sendMessage(req: Request, res: Response) {
    try {
      const { guildId } = req.body

      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      const config = await autoRolesRepository.getConfig(guildId)
      if (!config) {
        return res.status(404).json({ error: 'Auto roles config not found' })
      }

      const messageId = await autoRolesService.sendAutoRolesMessage(config)
      res.json({ success: true, messageId })
    } catch (error: any) {
      console.error('Error sending auto roles message:', error)
      res.status(500).json({ error: error.message || 'Failed to send auto roles message' })
    }
  },

  async deleteConfig(req: Request, res: Response) {
    try {
      const { guildId } = req.query
      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      const config = await autoRolesRepository.getConfig(guildId)
      if (config?.messageId) {
        try {
          const client = getBotClient()
          if (client) {
            const guild = await client.guilds.fetch(guildId)
            const channel = (await guild.channels.fetch(config.channelId)) as TextChannel | null
            if (channel) {
              const message = await channel.messages.fetch(config.messageId)
              await message.delete()
            }
          }
        } catch (error) {
          // Message might not exist, ignore error
        }
      }

      await autoRolesRepository.deleteConfig(guildId)
      res.json({ success: true, message: 'Config deleted' })
    } catch (error) {
      console.error('Error deleting auto roles config:', error)
      res.status(500).json({ error: 'Failed to delete auto roles config' })
    }
  },
}

