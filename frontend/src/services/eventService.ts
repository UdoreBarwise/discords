import { apiClient } from './apiClient.js'

export interface EventsConfig {
  guildId: string
  enabled: boolean
  announcementChannelId: string | null
  randomEventChance: number
}

export interface Event {
  id?: number
  guildId: string
  name: string
  description: string | null
  eventType: string
  enabled: boolean
  scheduleType: string
  scheduleData: string | null
  durationMinutes: number
  rewardData: string | null
  eventData: string | null
}

export interface ActiveEvent {
  id: number
  guildId: string
  eventId: number
  startedAt: string
  endsAt: string
  eventData: string | null
}

export interface EventHistory {
  id: number
  guildId: string
  eventId: number
  eventName: string
  eventType: string
  startedAt: string
  endedAt: string
  totalParticipants: number
  eventData: string | null
}

export const eventService = {
  async getConfig(guildId: string): Promise<EventsConfig | null> {
    const response = await apiClient.get(`/api/events/config?guildId=${guildId}`)
    return response.data
  },

  async saveConfig(config: EventsConfig): Promise<void> {
    await apiClient.post('/api/events/config', config)
  },

  async getEvents(guildId: string): Promise<Event[]> {
    const response = await apiClient.get(`/api/events?guildId=${guildId}`)
    return response.data
  },

  async getEvent(id: number): Promise<Event> {
    const response = await apiClient.get(`/api/events/${id}`)
    return response.data
  },

  async createEvent(event: Omit<Event, 'id'>): Promise<Event> {
    const response = await apiClient.post('/api/events', event)
    return response.data
  },

  async updateEvent(id: number, event: Partial<Event>): Promise<void> {
    await apiClient.put(`/api/events/${id}`, event)
  },

  async deleteEvent(id: number): Promise<void> {
    await apiClient.delete(`/api/events/${id}`)
  },

  async getActiveEvents(guildId: string): Promise<ActiveEvent[]> {
    const response = await apiClient.get(`/api/events/active?guildId=${guildId}`)
    return response.data
  },

  async getEventHistory(guildId: string, limit: number = 50): Promise<EventHistory[]> {
    const response = await apiClient.get(`/api/events/history?guildId=${guildId}&limit=${limit}`)
    return response.data
  },

  async startEvent(id: number): Promise<void> {
    await apiClient.post(`/api/events/${id}/start`)
  },
}

