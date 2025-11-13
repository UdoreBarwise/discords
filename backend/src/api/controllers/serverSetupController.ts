import { Request, Response } from 'express'
import { serverSetupService, SetupOptions } from '../../services/serverSetupService.js'

export const serverSetupController = {
  async setupServer(req: Request, res: Response) {
    try {
      const { guildId } = req.params
      const options: SetupOptions = req.body

      if (!guildId) {
        return res.status(400).json({ error: 'guildId is required' })
      }

      const result = await serverSetupService.setupServer(guildId, options)

      res.json({
        success: true,
        message: 'Server setup completed successfully',
        result,
      })
    } catch (error: any) {
      console.error('Error setting up server:', error)
      res.status(500).json({
        error: error.message || 'Failed to setup server',
      })
    }
  },
}

