import { Request, Response } from 'express'
import { aiPresetRepository, AIPreset } from '../../database/aiPresetRepository.js'

export const aiPresetController = {
  async getAll(req: Request, res: Response) {
    try {
      const presets = await aiPresetRepository.getAll()
      res.json(presets)
    } catch (error) {
      console.error('Error getting AI presets:', error)
      res.status(500).json({ error: 'Failed to get AI presets' })
    }
  },

  async get(req: Request, res: Response) {
    try {
      const { id } = req.params
      const preset = await aiPresetRepository.get(parseInt(id))
      if (!preset) {
        return res.status(404).json({ error: 'Preset not found' })
      }
      res.json(preset)
    } catch (error) {
      console.error('Error getting AI preset:', error)
      res.status(500).json({ error: 'Failed to get AI preset' })
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { name, provider, providerUrl, model, temperature, maxTokens, personality } = req.body

      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Preset name is required' })
      }
      if (!provider || typeof provider !== 'string') {
        return res.status(400).json({ error: 'Provider is required' })
      }
      if (!model || typeof model !== 'string') {
        return res.status(400).json({ error: 'Model is required' })
      }

      // Check if name already exists
      const existing = await aiPresetRepository.getByName(name)
      if (existing) {
        return res.status(400).json({ error: 'Preset with this name already exists' })
      }

      const preset: AIPreset = {
        name,
        provider,
        providerUrl,
        model,
        temperature: temperature !== undefined ? parseFloat(temperature) : 0.7,
        maxTokens: maxTokens !== undefined ? parseInt(maxTokens) : 2000,
        personality: personality || 'normal',
      }

      const created = await aiPresetRepository.create(preset)
      res.json(created)
    } catch (error: any) {
      console.error('Error creating AI preset:', error)
      if (error.code === '23505') {
        // Unique constraint violation
        return res.status(400).json({ error: 'Preset with this name already exists' })
      }
      res.status(500).json({ error: 'Failed to create AI preset' })
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { name, provider, providerUrl, model, temperature, maxTokens, personality } = req.body

      const preset = await aiPresetRepository.get(parseInt(id))
      if (!preset) {
        return res.status(404).json({ error: 'Preset not found' })
      }

      // If name is being changed, check if new name already exists
      if (name && name !== preset.name) {
        const existing = await aiPresetRepository.getByName(name)
        if (existing) {
          return res.status(400).json({ error: 'Preset with this name already exists' })
        }
      }

      const updates: Partial<AIPreset> = {}
      if (name !== undefined) updates.name = name
      if (provider !== undefined) updates.provider = provider
      if (providerUrl !== undefined) updates.providerUrl = providerUrl
      if (model !== undefined) updates.model = model
      if (temperature !== undefined) updates.temperature = parseFloat(temperature)
      if (maxTokens !== undefined) updates.maxTokens = parseInt(maxTokens)
      if (personality !== undefined) updates.personality = personality

      const updated = await aiPresetRepository.update(parseInt(id), updates)
      res.json(updated)
    } catch (error: any) {
      console.error('Error updating AI preset:', error)
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Preset with this name already exists' })
      }
      res.status(500).json({ error: 'Failed to update AI preset' })
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params
      await aiPresetRepository.delete(parseInt(id))
      res.json({ success: true, message: 'Preset deleted' })
    } catch (error) {
      console.error('Error deleting AI preset:', error)
      res.status(500).json({ error: 'Failed to delete AI preset' })
    }
  },
}

