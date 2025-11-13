import { Request, Response } from 'express'
import { eventService } from '../../services/eventService.js'
import { botConfigRepository } from '../../database/botConfigRepository.js'

export const eventController = {
  async getConfig(req: Request, res: Response) {
    try {
      const guildId = req.query.guildId as string
      if (!guildId) {
        return res.status(400).json({ error: 'guildId is required' })
      }

      const config = await eventService.getConfig(guildId)
      res.json(config)
    } catch (error: any) {
      console.error('Error getting event config:', error)
      res.status(500).json({ error: error.message })
    }
  },

  async saveConfig(req: Request, res: Response) {
    try {
      const config = req.body
      if (!config.guildId) {
        return res.status(400).json({ error: 'guildId is required' })
      }

      await eventService.saveConfig(config)
      res.json({ success: true })
    } catch (error: any) {
      console.error('Error saving event config:', error)
      res.status(500).json({ error: error.message })
    }
  },

  async getEvents(req: Request, res: Response) {
    try {
      const guildId = req.query.guildId as string
      if (!guildId) {
        return res.status(400).json({ error: 'guildId is required' })
      }

      const events = await eventService.getEvents(guildId)
      res.json(events)
    } catch (error: any) {
      console.error('Error getting events:', error)
      res.status(500).json({ error: error.message })
    }
  },

  async getEvent(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id)
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid event ID' })
      }

      const event = await eventService.getEvent(id)
      if (!event) {
        return res.status(404).json({ error: 'Event not found' })
      }

      res.json(event)
    } catch (error: any) {
      console.error('Error getting event:', error)
      res.status(500).json({ error: error.message })
    }
  },

  async createEvent(req: Request, res: Response) {
    try {
      const event = req.body
      if (!event.guildId || !event.name || !event.eventType || !event.scheduleType) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      const createdEvent = await eventService.createEvent(event)
      res.json(createdEvent)
    } catch (error: any) {
      console.error('Error creating event:', error)
      res.status(500).json({ error: error.message })
    }
  },

  async updateEvent(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id)
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid event ID' })
      }

      const event = req.body
      await eventService.updateEvent(id, event)
      res.json({ success: true })
    } catch (error: any) {
      console.error('Error updating event:', error)
      res.status(500).json({ error: error.message })
    }
  },

  async deleteEvent(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id)
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid event ID' })
      }

      await eventService.deleteEvent(id)
      res.json({ success: true })
    } catch (error: any) {
      console.error('Error deleting event:', error)
      res.status(500).json({ error: error.message })
    }
  },

  async getActiveEvents(req: Request, res: Response) {
    try {
      const guildId = req.query.guildId as string
      if (!guildId) {
        return res.status(400).json({ error: 'guildId is required' })
      }

      const activeEvents = await eventService.getActiveEvents(guildId)
      res.json(activeEvents)
    } catch (error: any) {
      console.error('Error getting active events:', error)
      res.status(500).json({ error: error.message })
    }
  },

  async getEventHistory(req: Request, res: Response) {
    try {
      const guildId = req.query.guildId as string
      if (!guildId) {
        return res.status(400).json({ error: 'guildId is required' })
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50
      const history = await eventService.getEventHistory(guildId, limit)
      res.json(history)
    } catch (error: any) {
      console.error('Error getting event history:', error)
      res.status(500).json({ error: error.message })
    }
  },

  async startEvent(req: Request, res: Response) {
    try {
      const eventId = parseInt(req.params.id)
      if (isNaN(eventId)) {
        return res.status(400).json({ error: 'Invalid event ID' })
      }

      const event = await eventService.getEvent(eventId)
      if (!event) {
        return res.status(404).json({ error: 'Event not found' })
      }

      await eventService.startEvent(event.guildId, event)
      res.json({ success: true })
    } catch (error: any) {
      console.error('Error starting event:', error)
      res.status(500).json({ error: error.message })
    }
  },
}

