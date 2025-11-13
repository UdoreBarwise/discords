import { apiClient } from './apiClient'

export type AIProvider = 'deepseek' | 'ollama' | 'lmstudio' | 'localai'
export type AIPersonality = 'normal' | 'rude' | 'professional' | 'friendly' | 'sarcastic'

export interface AIConfig {
  hasApiKey: boolean
  enabled: boolean
  provider: AIProvider
  providerUrl: string
  model: string
  temperature: number
  maxTokens: number
  personality: AIPersonality
  showModelInfo: boolean
  trainingEnabled?: boolean
}

export const aiService = {
  async getConfig(): Promise<AIConfig> {
    try {
      const response = await apiClient.get<AIConfig>('/api/ai/config')
      return response.data
    } catch (error) {
      console.error('Failed to get AI config:', error)
      throw error
    }
  },

  async saveConfig(
    apiKey: string | null,
    enabled: boolean | null,
    provider?: AIProvider,
    providerUrl?: string,
    model?: string,
    temperature?: number,
    maxTokens?: number,
    personality?: AIPersonality,
    showModelInfo?: boolean,
    trainingEnabled?: boolean
  ): Promise<void> {
    try {
      const body: any = {}
      if (apiKey !== null) body.apiKey = apiKey
      if (enabled !== null) body.enabled = enabled
      if (provider !== undefined) body.provider = provider
      if (providerUrl !== undefined) body.providerUrl = providerUrl
      if (model !== undefined) body.model = model
      if (temperature !== undefined) body.temperature = temperature
      if (maxTokens !== undefined) body.maxTokens = maxTokens
      if (personality !== undefined) body.personality = personality
      if (showModelInfo !== undefined) body.showModelInfo = showModelInfo
      if (trainingEnabled !== undefined) body.trainingEnabled = trainingEnabled
      await apiClient.post('/api/ai/config', body)
    } catch (error) {
      console.error('Failed to save AI config:', error)
      throw error
    }
  },

  async setApiKey(apiKey: string): Promise<void> {
    try {
      await apiClient.post('/api/ai/config', { apiKey, enabled: undefined })
    } catch (error) {
      console.error('Failed to save API key:', error)
      throw error
    }
  },

  async deleteApiKey(): Promise<void> {
    try {
      await apiClient.delete('/api/ai/api-key')
    } catch (error) {
      console.error('Failed to delete API key:', error)
      throw error
    }
  },

  async hasApiKey(): Promise<boolean> {
    try {
      const config = await this.getConfig()
      return config.hasApiKey
    } catch (error) {
      console.error('Failed to check API key status:', error)
      return false
    }
  },

  async getGuildConfig(guildId: string): Promise<AIGuildConfig> {
    try {
      const response = await apiClient.get<AIGuildConfig>('/api/ai/guild-config', {
        params: { guildId },
      })
      return response.data
    } catch (error) {
      console.error('Failed to get AI guild config:', error)
      throw error
    }
  },

  async saveGuildConfig(config: AIGuildConfig): Promise<void> {
    try {
      await apiClient.post('/api/ai/guild-config', config)
    } catch (error) {
      console.error('Failed to save AI guild config:', error)
      throw error
    }
  },

  async getAvailableModels(provider: AIProvider, providerUrl?: string): Promise<string[]> {
    try {
      const params: any = { provider }
      if (providerUrl) params.providerUrl = providerUrl
      const response = await apiClient.get<{ models: string[] }>('/api/ai/models', { params })
      return response.data.models || []
    } catch (error) {
      console.error('Failed to get available models:', error)
      // Return fallback models if API fails
      const fallback: Record<AIProvider, string[]> = {
        deepseek: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
        ollama: [],
        lmstudio: ['local-model'],
        localai: ['gpt-3.5-turbo'],
      }
      return fallback[provider] || []
    }
  },
}

export interface AIPreset {
  id?: number
  name: string
  provider: AIProvider
  providerUrl?: string
  model: string
  temperature: number
  maxTokens: number
  personality: AIPersonality
  createdAt?: string
  updatedAt?: string
}

export const aiPresetService = {
  async getAll(): Promise<AIPreset[]> {
    try {
      const response = await apiClient.get<AIPreset[]>('/api/ai/presets')
      return response.data
    } catch (error) {
      console.error('Failed to get presets:', error)
      throw error
    }
  },

  async get(id: number): Promise<AIPreset> {
    try {
      const response = await apiClient.get<AIPreset>(`/api/ai/presets/${id}`)
      return response.data
    } catch (error) {
      console.error('Failed to get preset:', error)
      throw error
    }
  },

  async create(preset: Omit<AIPreset, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIPreset> {
    try {
      const response = await apiClient.post<AIPreset>('/api/ai/presets', preset)
      return response.data
    } catch (error) {
      console.error('Failed to create preset:', error)
      throw error
    }
  },

  async update(id: number, preset: Partial<AIPreset>): Promise<AIPreset> {
    try {
      const response = await apiClient.put<AIPreset>(`/api/ai/presets/${id}`, preset)
      return response.data
    } catch (error) {
      console.error('Failed to update preset:', error)
      throw error
    }
  },

  async delete(id: number): Promise<void> {
    try {
      await apiClient.delete(`/api/ai/presets/${id}`)
    } catch (error) {
      console.error('Failed to delete preset:', error)
      throw error
    }
  },
}

export interface ChannelConfig {
  provider?: AIProvider
  providerUrl?: string
  model?: string
  personality?: AIPersonality
}

export interface AIGuildConfig {
  guildId: string
  allowedChannelIds?: string[]
  rateLimitPerMinute: number
  rateLimitPerHour: number
  blockedUserIds?: string[]
  allowedRoleIds?: string[]
  channelConfigs?: Record<string, ChannelConfig>
}

