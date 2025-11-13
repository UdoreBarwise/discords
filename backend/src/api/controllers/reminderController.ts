import { Request, Response } from 'express'
import { reminderRepository, Reminder } from '../../database/reminderRepository.js'

export const reminderController = {
  async getReminders(req: Request, res: Response) {
    try {
      const { guildId, userId } = req.query

      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      let reminders: Reminder[]
      if (userId && typeof userId === 'string') {
        reminders = await reminderRepository.getByUser(guildId, userId)
      } else {
        reminders = await reminderRepository.getByGuild(guildId)
      }

      res.json(reminders)
    } catch (error) {
      console.error('Error getting reminders:', error)
      res.status(500).json({ error: 'Failed to get reminders' })
    }
  },

  async createReminder(req: Request, res: Response) {
    try {
      const { guildId, userId, message, timeUtc, daysOfWeek, deliveryMethod, channelId } = req.body

      if (!guildId || !userId || !message || !timeUtc || !deliveryMethod) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      if (deliveryMethod === 'channel' && !channelId) {
        return res.status(400).json({ error: 'channelId is required for channel delivery' })
      }

      // Validate time format (HH:mm)
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
      if (!timeRegex.test(timeUtc)) {
        return res.status(400).json({ error: 'Invalid time format. Use HH:mm in UTC' })
      }

      // Validate days of week if provided
      if (daysOfWeek && Array.isArray(daysOfWeek)) {
        const validDays = daysOfWeek.every((day: number) => day >= 0 && day <= 6)
        if (!validDays) {
          return res.status(400).json({ error: 'Invalid days of week. Must be 0-6 (0=Sunday, 6=Saturday)' })
        }
      }

      const reminder = await reminderRepository.create({
        guildId,
        userId,
        message,
        timeUtc,
        daysOfWeek: daysOfWeek && daysOfWeek.length > 0 ? daysOfWeek : undefined,
        deliveryMethod,
        channelId: channelId || undefined,
        enabled: true,
      })

      res.json({ success: true, reminder })
    } catch (error) {
      console.error('Error creating reminder:', error)
      res.status(500).json({ error: 'Failed to create reminder' })
    }
  },

  async updateReminder(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { message, timeUtc, daysOfWeek, deliveryMethod, channelId, enabled } = req.body

      const reminderId = parseInt(id)
      if (isNaN(reminderId)) {
        return res.status(400).json({ error: 'Invalid reminder ID' })
      }

      const existingReminder = await reminderRepository.get(reminderId)
      if (!existingReminder) {
        return res.status(404).json({ error: 'Reminder not found' })
      }

      const updates: Partial<Reminder> = {}
      if (message !== undefined) updates.message = message
      if (timeUtc !== undefined) {
        const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
        if (!timeRegex.test(timeUtc)) {
          return res.status(400).json({ error: 'Invalid time format. Use HH:mm in UTC' })
        }
        updates.timeUtc = timeUtc
      }
      if (daysOfWeek !== undefined) {
        if (Array.isArray(daysOfWeek)) {
          const validDays = daysOfWeek.every((day: number) => day >= 0 && day <= 6)
          if (!validDays) {
            return res.status(400).json({ error: 'Invalid days of week. Must be 0-6' })
          }
          updates.daysOfWeek = daysOfWeek.length > 0 ? daysOfWeek : undefined
        } else {
          updates.daysOfWeek = undefined
        }
      }
      if (deliveryMethod !== undefined) {
        if (deliveryMethod === 'channel' && !channelId) {
          return res.status(400).json({ error: 'channelId is required for channel delivery' })
        }
        updates.deliveryMethod = deliveryMethod
        if (channelId !== undefined) {
          updates.channelId = channelId || undefined
        }
      }
      if (channelId !== undefined) {
        updates.channelId = channelId || undefined
      }
      if (enabled !== undefined) updates.enabled = enabled

      await reminderRepository.update(reminderId, updates)
      const updatedReminder = await reminderRepository.get(reminderId)

      res.json({ success: true, reminder: updatedReminder })
    } catch (error) {
      console.error('Error updating reminder:', error)
      res.status(500).json({ error: 'Failed to update reminder' })
    }
  },

  async deleteReminder(req: Request, res: Response) {
    try {
      const { id } = req.params
      const reminderId = parseInt(id)

      if (isNaN(reminderId)) {
        return res.status(400).json({ error: 'Invalid reminder ID' })
      }

      const reminder = await reminderRepository.get(reminderId)
      if (!reminder) {
        return res.status(404).json({ error: 'Reminder not found' })
      }

      await reminderRepository.delete(reminderId)
      res.json({ success: true, message: 'Reminder deleted' })
    } catch (error) {
      console.error('Error deleting reminder:', error)
      res.status(500).json({ error: 'Failed to delete reminder' })
    }
  },
}


