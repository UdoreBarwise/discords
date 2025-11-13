import { Request, Response } from 'express'
import { sportsConfigRepository, type SportsConfig, type SportType, type F1DataType } from '../../database/sportsConfigRepository.js'
import { sportsService } from '../../services/sportsService.js'

export const sportsController = {
  // Get config for a specific sport
  getConfig: async (req: Request, res: Response) => {
    try {
      const { guildId, sportType } = req.query
      
      if (!guildId || !sportType) {
        return res.status(400).json({ error: 'guildId and sportType are required' })
      }

      const config = await sportsConfigRepository.getConfig(
        guildId as string,
        sportType as SportType
      )
      
      res.json(config || null)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  // Get all configs for a guild
  getAllConfigs: async (req: Request, res: Response) => {
    try {
      const { guildId } = req.query
      
      if (!guildId) {
        return res.status(400).json({ error: 'guildId is required' })
      }

      const configs = await sportsConfigRepository.getAllConfigs(guildId as string)
      res.json(configs)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  // Save config
  saveConfig: async (req: Request, res: Response) => {
    try {
      const config: SportsConfig = req.body
      
      if (!config.guildId || !config.sportType) {
        return res.status(400).json({ error: 'guildId and sportType are required' })
      }

      await sportsConfigRepository.saveConfig(config)
      
      // Restart polling if enabled
      if (config.enabled) {
        await sportsService.startPolling(config.guildId, config.sportType)
      } else {
        sportsService.stopPolling(config.guildId, config.sportType)
      }
      
      res.json({ success: true, message: 'Sports config saved' })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  // Delete config
  deleteConfig: async (req: Request, res: Response) => {
    try {
      const { guildId, sportType } = req.query
      
      if (!guildId || !sportType) {
        return res.status(400).json({ error: 'guildId and sportType are required' })
      }

      await sportsConfigRepository.deleteConfig(
        guildId as string,
        sportType as SportType
      )
      
      sportsService.stopPolling(guildId as string, sportType as string)
      
      res.json({ success: true, message: 'Sports config deleted' })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },
}

