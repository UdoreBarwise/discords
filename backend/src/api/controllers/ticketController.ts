import { Request, Response } from 'express'
import { ticketConfigRepository } from '../../database/ticketConfigRepository.js'
import { ticketRepository } from '../../database/ticketRepository.js'
import { ticketService } from '../../services/ticketService.js'

export const ticketController = {
  async getConfig(req: Request, res: Response) {
    try {
      const { guildId } = req.query
      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      const config = await ticketConfigRepository.get(guildId)
      if (!config) {
        return res.json(null)
      }

      res.json(config)
    } catch (error) {
      console.error('Error getting ticket config:', error)
      res.status(500).json({ error: 'Failed to get ticket config' })
    }
  },

  async saveConfig(req: Request, res: Response) {
    try {
      const {
        guildId,
        embedChannelId,
        ticketCategoryId,
        mentionRoleIds,
        mentionUserIds,
        messageType,
        messageTitle,
        messageDescription,
        messageContent,
      } = req.body

      if (
        !guildId ||
        !embedChannelId ||
        !ticketCategoryId ||
        !Array.isArray(mentionRoleIds) ||
        !Array.isArray(mentionUserIds)
      ) {
        return res.status(400).json({ error: 'Invalid configuration data' })
      }

      const config = {
        guildId,
        embedChannelId,
        ticketCategoryId,
        mentionRoleIds,
        mentionUserIds,
        messageType: messageType || 'embed',
        messageTitle,
        messageDescription,
        messageContent,
      }

      await ticketConfigRepository.set(config)

      // Create or update embed message
      try {
        const embedMessageId = await ticketService.createOrUpdateEmbed(guildId)
        await ticketConfigRepository.set({
          ...config,
          embedMessageId,
        })
      } catch (error) {
        console.error('Error creating embed:', error)
        // Continue even if embed creation fails
      }

      res.json({ success: true, message: 'Configuration saved' })
    } catch (error) {
      console.error('Error saving ticket config:', error)
      res.status(500).json({ error: 'Failed to save ticket config' })
    }
  },

  async listTickets(req: Request, res: Response) {
    try {
      const { guildId } = req.query
      const tickets = await ticketRepository.list(
        guildId ? (guildId as string) : undefined
      )
      res.json(tickets)
    } catch (error) {
      console.error('Error listing tickets:', error)
      res.status(500).json({ error: 'Failed to list tickets' })
    }
  },

  async closeTicket(req: Request, res: Response) {
    try {
      const { ticketId } = req.params
      const { closedBy } = req.body

      if (!closedBy) {
        return res.status(400).json({ error: 'closedBy is required' })
      }

      await ticketService.closeTicket(ticketId, closedBy)
      res.json({ success: true, message: 'Ticket closed' })
    } catch (error: any) {
      console.error('Error closing ticket:', error)
      res.status(500).json({ error: error.message || 'Failed to close ticket' })
    }
  },

  async getLogs(req: Request, res: Response) {
    try {
      const { guildId } = req.query
      const logs = await ticketRepository.getLogs(
        guildId ? (guildId as string) : undefined
      )
      res.json(logs)
    } catch (error) {
      console.error('Error getting ticket logs:', error)
      res.status(500).json({ error: 'Failed to get ticket logs' })
    }
  },
}

