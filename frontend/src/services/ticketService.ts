import { apiClient } from './apiClient'

export interface TicketConfig {
  guildId: string
  embedChannelId: string
  ticketCategoryId: string
  mentionRoleIds: string[]
  mentionUserIds: string[]
  embedMessageId?: string
  messageType?: 'plain_text' | 'embed'
  messageTitle?: string
  messageDescription?: string
  messageContent?: string
}

export interface Ticket {
  ticketId: string
  guildId: string
  userId: string
  createdAt: string
  closedAt?: string
  status: 'open' | 'closed'
}

export interface TicketLog {
  ticketId: string
  guildId: string
  userId: string
  createdAt: string
  closedAt: string
  closedBy: string
  messageCount: number
  transcript?: string
}

export const ticketService = {
  async getConfig(guildId: string): Promise<TicketConfig | null> {
    const response = await apiClient.get('/api/tickets/config', {
      params: { guildId },
    })
    return response.data
  },

  async saveConfig(config: Omit<TicketConfig, 'embedMessageId'>): Promise<void> {
    await apiClient.post('/api/tickets/config', config)
  },

  async listTickets(guildId?: string): Promise<Ticket[]> {
    const params = guildId ? { guildId } : {}
    const response = await apiClient.get('/api/tickets/list', { params })
    return response.data
  },

  async closeTicket(ticketId: string, closedBy: string): Promise<void> {
    await apiClient.post(`/api/tickets/${ticketId}/close`, { closedBy })
  },

  async getLogs(guildId?: string): Promise<TicketLog[]> {
    const params = guildId ? { guildId } : {}
    const response = await apiClient.get('/api/tickets/logs', { params })
    return response.data
  },
}

