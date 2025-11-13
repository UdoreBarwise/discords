import { Request, Response } from 'express'
import { settingsRepository } from '../../database/settingsRepository.js'

export const themeController = {
  async getThemeColors(req: Request, res: Response) {
    try {
      const primary = await settingsRepository.get('theme_primary') || '#4a9eff'
      const secondary = await settingsRepository.get('theme_secondary') || '#1a1a1a'
      const background = await settingsRepository.get('theme_background') || '#242424'
      const text = await settingsRepository.get('theme_text') || '#ffffff'
      const heading = await settingsRepository.get('theme_heading') || '#4a9eff'
      const card = await settingsRepository.get('theme_card') || '#2a2a2a'
      const input = await settingsRepository.get('theme_input') || '#2a2a2a'
      const border = await settingsRepository.get('theme_border') || '#333333'
      const hover = await settingsRepository.get('theme_hover') || '#3a3a3a'
      const textSecondary = await settingsRepository.get('theme_textSecondary') || '#cccccc'
      
      res.json({
        colors: {
          primary,
          secondary,
          background,
          text,
          heading,
          card,
          input,
          border,
          hover,
          textSecondary,
        },
      })
    } catch (error) {
      console.error('Error getting theme colors:', error)
      res.status(500).json({ error: 'Failed to get theme colors' })
    }
  },

  async saveThemeColors(req: Request, res: Response) {
    try {
      const { colors } = req.body
      
      if (!colors || typeof colors !== 'object') {
        return res.status(400).json({ error: 'Colors object is required' })
      }

      const { primary, secondary, background, text, heading, card, input, border, hover, textSecondary } = colors

      if (!primary || !secondary || !background || !text || !heading || !card || !input || !border || !hover || !textSecondary) {
        return res.status(400).json({ error: 'All color values are required' })
      }

      // Validate hex colors
      const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
      const colorValues = [primary, secondary, background, text, heading, card, input, border, hover, textSecondary]
      if (!colorValues.every(color => hexRegex.test(color))) {
        return res.status(400).json({ error: 'Invalid color format. Use hex colors (e.g., #ffffff)' })
      }

      await settingsRepository.set('theme_primary', primary)
      await settingsRepository.set('theme_secondary', secondary)
      await settingsRepository.set('theme_background', background)
      await settingsRepository.set('theme_text', text)
      await settingsRepository.set('theme_heading', heading)
      await settingsRepository.set('theme_card', card)
      await settingsRepository.set('theme_input', input)
      await settingsRepository.set('theme_border', border)
      await settingsRepository.set('theme_hover', hover)
      await settingsRepository.set('theme_textSecondary', textSecondary)

      res.json({ success: true, colors })
    } catch (error) {
      console.error('Error saving theme colors:', error)
      res.status(500).json({ error: 'Failed to save theme colors' })
    }
  },
}

