import { apiClient } from './apiClient'

export interface SetupOptions {
  nukeServer?: boolean
  configureTickets?: boolean
  configureAutoRoles?: boolean
  configureAIChannels?: boolean
  configureYouTubeNotifications?: boolean
  configureDiceGame?: boolean
  configureWordle?: boolean
  configureBotConfig?: boolean
  roleNames?: {
    admin?: string
    moderator?: string
    supportStaff?: string
    member?: string
    chatToAI?: string
    playDice?: string
    playWordle?: string
    youtubeNotifications?: string
    botConfig?: string
  }
  channelNames?: {
    general?: string
    welcome?: string
    tickets?: string
    games?: string
    support?: string
    autoRoles?: string
    aiNormal?: string
    aiRude?: string
    aiProfessional?: string
    aiFriendly?: string
    aiSarcastic?: string
    youtubeNotifications?: string
    diceGame?: string
    wordle?: string
    botConfig?: string
  }
}

export interface SetupResult {
  roles: {
    admin?: string
    moderator?: string
    supportStaff?: string
    member?: string
    chatToAI?: string
    playDice?: string
    playWordle?: string
    youtubeNotifications?: string
    botConfig?: string
  }
  categories: {
    info?: string
    general?: string
    ai?: string
    admin?: string
    config?: string
  }
  channels: {
    general?: string
    welcome?: string
    ticketsEmbed?: string
    autoRoles?: string
    aiNormal?: string
    aiRude?: string
    aiProfessional?: string
    aiFriendly?: string
    aiSarcastic?: string
    youtubeNotifications?: string
    diceGame?: string
    wordle?: string
    auditLog?: string
    botConfig?: string
  }
  welcomeMessageId?: string
  configuredServices: string[]
}

export interface SetupResponse {
  success: boolean
  message: string
  result: SetupResult
}

export const serverSetupService = {
  async setupServer(guildId: string, options: SetupOptions): Promise<SetupResponse> {
    const response = await apiClient.post<SetupResponse>(
      `/api/server-setup/${guildId}`,
      options
    )
    return response.data
  },
}

