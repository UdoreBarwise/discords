import { Request, Response } from 'express'
import { steamService } from '../../services/steamService.js'
import { steamRepository } from '../../database/steamRepository.js'
import { botConfigRepository } from '../../database/botConfigRepository.js'

export const steamController = {
  // Get Steam API key
  getApiKey: async (req: Request, res: Response) => {
    try {
      const apiKey = await botConfigRepository.get('steam_api_key')
      res.json({ apiKey: apiKey || null })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  // Set Steam API key
  setApiKey: async (req: Request, res: Response) => {
    try {
      const { apiKey } = req.body
      
      if (!apiKey) {
        return res.status(400).json({ error: 'API key is required' })
      }

      await botConfigRepository.set('steam_api_key', apiKey)
      steamService.setApiKey(apiKey)
      
      res.json({ success: true, message: 'Steam API key saved' })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  // Delete Steam API key
  deleteApiKey: async (req: Request, res: Response) => {
    try {
      await botConfigRepository.delete('steam_api_key')
      steamService.setApiKey(null)
      res.json({ success: true, message: 'Steam API key deleted' })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  // Link Discord user to Steam ID
  linkUser: async (req: Request, res: Response) => {
    try {
      const { discordUserId, steamId, vanityUrl, guildId } = req.body
      
      if (!discordUserId || !steamId) {
        return res.status(400).json({ error: 'discordUserId and steamId are required' })
      }

      // Validate Steam ID format
      if (!steamService.isValidSteamId(steamId)) {
        return res.status(400).json({ error: 'Invalid Steam ID format' })
      }

      await steamRepository.linkUser(discordUserId, steamId, guildId || null, vanityUrl || null)
      
      res.json({ success: true, message: 'Steam account linked successfully' })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  // Unlink Discord user from Steam
  unlinkUser: async (req: Request, res: Response) => {
    try {
      const { discordUserId, guildId } = req.body
      
      if (!discordUserId) {
        return res.status(400).json({ error: 'discordUserId is required' })
      }

      await steamRepository.unlinkUser(discordUserId, guildId || null)
      
      res.json({ success: true, message: 'Steam account unlinked successfully' })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  // Get user's Steam profile
  getProfile: async (req: Request, res: Response) => {
    try {
      const { discordUserId, guildId, steamId } = req.query
      
      let targetSteamId = steamId as string | null
      
      // If no direct Steam ID provided, try to get from linked account
      if (!targetSteamId && discordUserId) {
        targetSteamId = await steamRepository.getSteamId(
          discordUserId as string,
          (guildId as string) || null
        )
      }

      if (!targetSteamId) {
        return res.status(404).json({ error: 'Steam ID not found. Please link your Steam account first.' })
      }

      const profile = await steamService.getPlayerSummary(targetSteamId)
      
      if (!profile) {
        return res.status(404).json({ error: 'Steam profile not found' })
      }

      res.json(profile)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  // Get user's owned games
  getOwnedGames: async (req: Request, res: Response) => {
    try {
      const { discordUserId, guildId, steamId } = req.query
      
      let targetSteamId = steamId as string | null
      
      if (!targetSteamId && discordUserId) {
        targetSteamId = await steamRepository.getSteamId(
          discordUserId as string,
          (guildId as string) || null
        )
      }

      if (!targetSteamId) {
        return res.status(404).json({ error: 'Steam ID not found. Please link your Steam account first.' })
      }

      const games = await steamService.getOwnedGames(targetSteamId)
      res.json({ games, count: games.length })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  // Get user's recently played games
  getRecentlyPlayed: async (req: Request, res: Response) => {
    try {
      const { discordUserId, guildId, steamId, count } = req.query
      
      let targetSteamId = steamId as string | null
      
      if (!targetSteamId && discordUserId) {
        targetSteamId = await steamRepository.getSteamId(
          discordUserId as string,
          (guildId as string) || null
        )
      }

      if (!targetSteamId) {
        return res.status(404).json({ error: 'Steam ID not found. Please link your Steam account first.' })
      }

      const games = await steamService.getRecentlyPlayedGames(
        targetSteamId,
        count ? parseInt(count as string) : 5
      )
      
      res.json({ games, count: games.length })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  // Resolve vanity URL to Steam ID
  resolveVanityUrl: async (req: Request, res: Response) => {
    try {
      const { vanityUrl } = req.query
      
      if (!vanityUrl) {
        return res.status(400).json({ error: 'vanityUrl is required' })
      }

      const steamId = await steamService.resolveVanityUrl(vanityUrl as string)
      
      if (!steamId) {
        return res.status(404).json({ error: 'Steam profile not found' })
      }

      res.json({ steamId, vanityUrl })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  // Get linked Steam ID for a Discord user
  getLinkedSteamId: async (req: Request, res: Response) => {
    try {
      const { discordUserId, guildId } = req.query
      
      if (!discordUserId) {
        return res.status(400).json({ error: 'discordUserId is required' })
      }

      const steamId = await steamRepository.getSteamId(
        discordUserId as string,
        (guildId as string) || null
      )
      
      if (!steamId) {
        return res.status(404).json({ error: 'No Steam account linked' })
      }

      res.json({ steamId })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },
}

