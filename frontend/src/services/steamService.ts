import { apiClient } from './apiClient'

export interface SteamPlayerSummary {
  steamid: string
  personaname: string
  profileurl: string
  avatar: string
  avatarmedium: string
  avatarfull: string
  personastate: number
  communityvisibilitystate: number
  profilestate: number
  lastlogoff: number
  commentpermission?: number
  realname?: string
  primaryclanid?: string
  timecreated?: number
  gameid?: string
  gameserverip?: string
  gameextrainfo?: string
  loccountrycode?: string
  locstatecode?: string
  loccityid?: number
}

export interface SteamOwnedGame {
  appid: number
  name: string
  playtime_forever: number
  img_icon_url: string
  img_logo_url: string
  has_community_visible_stats?: boolean
  playtime_windows_forever?: number
  playtime_mac_forever?: number
  playtime_linux_forever?: number
  playtime_disconnected?: number
  rtime_last_played?: number
  playtime_2weeks?: number
}

export const steamService = {
  async getApiKey(): Promise<string | null> {
    try {
      const response = await apiClient.get('/api/steam/api-key')
      return response.data.apiKey || null
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get Steam API key')
    }
  },

  async setApiKey(apiKey: string): Promise<void> {
    try {
      await apiClient.post('/api/steam/api-key', { apiKey })
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to set Steam API key')
    }
  },

  async deleteApiKey(): Promise<void> {
    try {
      await apiClient.delete('/api/steam/api-key')
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to delete Steam API key')
    }
  },

  async linkUser(discordUserId: string, steamId: string, guildId?: string, vanityUrl?: string): Promise<void> {
    try {
      await apiClient.post('/api/steam/link', {
        discordUserId,
        steamId,
        guildId,
        vanityUrl,
      })
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to link Steam account')
    }
  },

  async unlinkUser(discordUserId: string, guildId?: string): Promise<void> {
    try {
      await apiClient.post('/api/steam/unlink', {
        discordUserId,
        guildId,
      })
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to unlink Steam account')
    }
  },

  async getProfile(discordUserId?: string, guildId?: string, steamId?: string): Promise<SteamPlayerSummary> {
    try {
      const response = await apiClient.get('/api/steam/profile', {
        params: {
          discordUserId,
          guildId,
          steamId,
        },
      })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get Steam profile')
    }
  },

  async getOwnedGames(discordUserId?: string, guildId?: string, steamId?: string): Promise<{ games: SteamOwnedGame[]; count: number }> {
    try {
      const response = await apiClient.get('/api/steam/games', {
        params: {
          discordUserId,
          guildId,
          steamId,
        },
      })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get owned games')
    }
  },

  async getRecentlyPlayed(discordUserId?: string, guildId?: string, steamId?: string, count?: number): Promise<{ games: SteamOwnedGame[]; count: number }> {
    try {
      const response = await apiClient.get('/api/steam/recent', {
        params: {
          discordUserId,
          guildId,
          steamId,
          count,
        },
      })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get recently played games')
    }
  },

  async resolveVanityUrl(vanityUrl: string): Promise<{ steamId: string; vanityUrl: string }> {
    try {
      const response = await apiClient.get('/api/steam/resolve', {
        params: { vanityUrl },
      })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to resolve vanity URL')
    }
  },

  async getLinkedSteamId(discordUserId: string, guildId?: string): Promise<{ steamId: string }> {
    try {
      const response = await apiClient.get('/api/steam/linked', {
        params: {
          discordUserId,
          guildId,
        },
      })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get linked Steam ID')
    }
  },
}

