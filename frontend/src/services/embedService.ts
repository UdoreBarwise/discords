import { apiClient } from './apiClient'

export interface EmbedData {
  title?: string
  description?: string
  color?: string
  footer?: string
  thumbnail?: string
  image?: string
  author?: {
    name?: string
    iconUrl?: string
    url?: string
  }
  fields?: Array<{
    name: string
    value: string
    inline?: boolean
  }>
  timestamp?: boolean
}

export const embedService = {
  async sendEmbed(
    guildId: string,
    channelId: string,
    embedData: EmbedData
  ): Promise<string> {
    const response = await apiClient.post('/api/embed/send', {
      guildId,
      channelId,
      embedData,
    })
    return response.data.messageId
  },
}

