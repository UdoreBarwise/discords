import { apiClient } from './apiClient'

export interface Reminder {
  id: number
  guildId: string
  userId: string
  message: string
  timeUtc: string // HH:mm format in UTC
  daysOfWeek?: number[] // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  deliveryMethod: 'dm' | 'channel'
  channelId?: string
  enabled: boolean
  lastTriggeredAt?: string
  createdAt: string
  updatedAt: string
}

export const reminderService = {
  async getReminders(guildId: string, userId?: string): Promise<Reminder[]> {
    const response = await apiClient.get('/api/reminders', {
      params: { guildId, ...(userId && { userId }) },
    })
    return response.data
  },

  async createReminder(reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt' | 'lastTriggeredAt'>): Promise<Reminder> {
    const response = await apiClient.post('/api/reminders', reminder)
    return response.data.reminder
  },

  async updateReminder(id: number, updates: Partial<Reminder>): Promise<Reminder> {
    const response = await apiClient.put(`/api/reminders/${id}`, updates)
    return response.data.reminder
  },

  async deleteReminder(id: number): Promise<void> {
    await apiClient.delete(`/api/reminders/${id}`)
  },
}


