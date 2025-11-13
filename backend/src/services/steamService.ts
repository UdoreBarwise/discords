interface SteamPlayerSummary {
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

interface SteamOwnedGame {
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
}

interface SteamPlayerAchievements {
  steamID: string
  gameName: string
  achievements: Array<{
    apiname: string
    achieved: number
    unlocktime: number
  }>
  success: boolean
}

interface SteamGameInfo {
  appid: number
  name: string
  playtime_forever: number
  playtime_2weeks?: number
  img_icon_url: string
  img_logo_url: string
}

class SteamService {
  private apiKey: string | null = null
  private baseUrl = 'https://api.steampowered.com'
  private communityUrl = 'https://steamcommunity.com'

  constructor() {
    // API key will be set from database config
  }

  setApiKey(apiKey: string | null) {
    this.apiKey = apiKey
  }

  /**
   * Resolve a Steam vanity URL to a Steam ID
   */
  async resolveVanityUrl(vanityUrl: string): Promise<string | null> {
    if (!this.apiKey) {
      throw new Error('Steam API key not configured')
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/ISteamUser/ResolveVanityURL/v0001/?key=${this.apiKey}&vanityurl=${encodeURIComponent(vanityUrl)}`
      )

      if (!response.ok) {
        throw new Error(`Steam API request failed: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.response?.success === 1) {
        return data.response.steamid
      }

      return null
    } catch (error: any) {
      throw new Error(`Failed to resolve Steam vanity URL: ${error.message}`)
    }
  }

  /**
   * Get player summary/profile information
   */
  async getPlayerSummary(steamId: string): Promise<SteamPlayerSummary | null> {
    if (!this.apiKey) {
      throw new Error('Steam API key not configured')
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/ISteamUser/GetPlayerSummaries/v0002/?key=${this.apiKey}&steamids=${steamId}`
      )

      if (!response.ok) {
        throw new Error(`Steam API request failed: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.response?.players && data.response.players.length > 0) {
        return data.response.players[0] as SteamPlayerSummary
      }

      return null
    } catch (error: any) {
      throw new Error(`Failed to get player summary: ${error.message}`)
    }
  }

  /**
   * Get list of games owned by a user
   */
  async getOwnedGames(steamId: string, includeAppInfo: boolean = true): Promise<SteamOwnedGame[]> {
    if (!this.apiKey) {
      throw new Error('Steam API key not configured')
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/IPlayerService/GetOwnedGames/v0001/?key=${this.apiKey}&steamid=${steamId}&include_appinfo=${includeAppInfo ? 1 : 0}&format=json`
      )

      if (!response.ok) {
        throw new Error(`Steam API request failed: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.response?.games) {
        return data.response.games as SteamOwnedGame[]
      }

      return []
    } catch (error: any) {
      throw new Error(`Failed to get owned games: ${error.message}`)
    }
  }

  /**
   * Get recently played games
   */
  async getRecentlyPlayedGames(steamId: string, count: number = 5): Promise<SteamGameInfo[]> {
    const games = await this.getOwnedGames(steamId, true)
    
    // Sort by playtime in last 2 weeks, then by total playtime
    const recentGames = games
      .filter(game => game.playtime_2weeks !== undefined && game.playtime_2weeks > 0)
      .sort((a, b) => {
        const aRecent = a.playtime_2weeks || 0
        const bRecent = b.playtime_2weeks || 0
        if (aRecent !== bRecent) {
          return bRecent - aRecent
        }
        return (b.playtime_forever || 0) - (a.playtime_forever || 0)
      })
      .slice(0, count)
      .map(game => ({
        appid: game.appid,
        name: game.name,
        playtime_forever: game.playtime_forever,
        playtime_2weeks: game.playtime_2weeks,
        img_icon_url: game.img_icon_url,
        img_logo_url: game.img_logo_url,
      }))

    return recentGames
  }

  /**
   * Get player achievements for a specific game
   */
  async getPlayerAchievements(steamId: string, appId: number): Promise<SteamPlayerAchievements | null> {
    if (!this.apiKey) {
      throw new Error('Steam API key not configured')
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${appId}&key=${this.apiKey}&steamid=${steamId}`
      )

      if (!response.ok) {
        throw new Error(`Steam API request failed: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.playerstats) {
        return data.playerstats as SteamPlayerAchievements
      }

      return null
    } catch (error: any) {
      throw new Error(`Failed to get player achievements: ${error.message}`)
    }
  }

  /**
   * Validate if a Steam ID is valid format
   */
  isValidSteamId(steamId: string): boolean {
    // Steam ID64 format: 17 digits
    return /^\d{17}$/.test(steamId)
  }

  /**
   * Convert Steam ID to profile URL
   */
  getProfileUrl(steamId: string): string {
    return `${this.communityUrl}/profiles/${steamId}`
  }

  /**
   * Get game image URL
   */
  getGameImageUrl(appId: number, hash: string, type: 'icon' | 'logo' = 'logo'): string {
    if (type === 'icon') {
      return `https://media.steampowered.com/steamcommunity/public/images/apps/${appId}/${hash}.jpg`
    }
    return `https://media.steampowered.com/steamcommunity/public/images/apps/${appId}/${hash}.jpg`
  }

  /**
   * Format playtime hours
   */
  formatPlaytime(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (hours === 0) {
      return `${mins}m`
    }
    if (mins === 0) {
      return `${hours}h`
    }
    return `${hours}h ${mins}m`
  }
}

export const steamService = new SteamService()

export type {
  SteamPlayerSummary,
  SteamOwnedGame,
  SteamPlayerAchievements,
  SteamGameInfo,
}

