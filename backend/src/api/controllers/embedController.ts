import { Request, Response } from 'express'
import { embedService, EmbedData } from '../../services/embedService.js'

export const embedController = {
  async sendEmbed(req: Request, res: Response) {
    try {
      const { guildId, channelId, embedData } = req.body

      if (!guildId || !channelId || !embedData) {
        return res.status(400).json({ error: 'guildId, channelId, and embedData are required' })
      }

      const messageId = await embedService.sendEmbed(guildId, channelId, embedData as EmbedData)
      res.json({ success: true, messageId })
    } catch (error: any) {
      console.error('Error sending embed:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
        body: req.body,
      })
      
      // Return appropriate status code based on error type
      const statusCode = error.message?.includes('required') || 
                        error.message?.includes('cannot exceed') ||
                        error.message?.includes('must have') 
                        ? 400 
                        : 500
      
      res.status(statusCode).json({ 
        error: error.message || 'Failed to send embed',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  },
}

