import { apiClient } from './apiClient'

export interface Guild {
  id: string
  name: string
  icon: string | null
  memberCount: number
  hasManageChannels: boolean
}

export interface Channel {
  id: string
  name: string
  type: number
}

export interface Category {
  id: string
  name: string
}

export interface Role {
  id: string
  name: string
  color: number
  memberCount: number
}

export interface Member {
  id: string
  username: string
  discriminator: string
  displayName: string
  avatar: string | null
}

export const discordService = {
  async getGuilds(): Promise<Guild[]> {
    const response = await apiClient.get('/api/tickets/guilds')
    return response.data
  },

  async getChannels(guildId: string): Promise<Channel[]> {
    const response = await apiClient.get(`/api/tickets/guilds/${guildId}/channels`)
    return response.data
  },

  async getCategories(guildId: string): Promise<Category[]> {
    const response = await apiClient.get(`/api/tickets/guilds/${guildId}/categories`)
    return response.data
  },

  async getRoles(guildId: string): Promise<Role[]> {
    const response = await apiClient.get(`/api/tickets/guilds/${guildId}/roles`)
    return response.data
  },

  async getMembers(guildId: string, query?: string): Promise<Member[]> {
    const params = query ? { q: query } : {}
    const response = await apiClient.get(`/api/tickets/guilds/${guildId}/members`, {
      params,
    })
    return response.data
  },

  async createChannel(guildId: string, name: string, categoryId?: string): Promise<Channel> {
    const response = await apiClient.post(`/api/tickets/guilds/${guildId}/channels`, {
      name,
      categoryId,
    })
    return response.data
  },
}

