import { Request, Response } from 'express'
import { botConfigRepository } from '../../database/botConfigRepository.js'
import { AIProvider, AIPersonality } from '../../services/aiService.js'
import { aiTrainingService } from '../../services/aiTrainingService.js'

export const aiController = {
  async getConfig(req: Request, res: Response) {
    try {
      const [apiKey, enabled, provider, providerUrl, model, temperature, maxTokens, personality, showModelInfo] = await Promise.all([
        botConfigRepository.get('deepseek_api_key'),
        botConfigRepository.get('ai_enabled'),
        botConfigRepository.get('ai_provider'),
        botConfigRepository.get('ai_provider_url'),
        botConfigRepository.get('ai_model'),
        botConfigRepository.get('ai_temperature'),
        botConfigRepository.get('ai_max_tokens'),
        botConfigRepository.get('ai_personality'),
        botConfigRepository.get('ai_show_model_info'),
      ])

      // Fallback to old config keys for backward compatibility
      const [oldModel, oldTemperature, oldMaxTokens] = await Promise.all([
        botConfigRepository.get('deepseek_model'),
        botConfigRepository.get('deepseek_temperature'),
        botConfigRepository.get('deepseek_max_tokens'),
      ])

      const trainingEnabled = await aiTrainingService.isTrainingEnabled('')
      
      res.json({
        hasApiKey: !!apiKey,
        enabled: enabled === 'true',
        provider: (provider || 'deepseek') as AIProvider,
        providerUrl: providerUrl || '',
        model: model || oldModel || 'deepseek-chat',
        temperature: temperature ? parseFloat(temperature) : (oldTemperature ? parseFloat(oldTemperature) : 0.7),
        maxTokens: maxTokens ? parseInt(maxTokens) : (oldMaxTokens ? parseInt(oldMaxTokens) : 2000),
        personality: (personality || 'normal') as AIPersonality,
        showModelInfo: showModelInfo === 'true',
        trainingEnabled,
      })
    } catch (error) {
      console.error('Error getting AI config:', error)
      res.status(500).json({ error: 'Failed to get AI configuration' })
    }
  },

  async saveConfig(req: Request, res: Response) {
    try {
      const { apiKey, enabled, provider, providerUrl, model, temperature, maxTokens, personality, showModelInfo, trainingEnabled } = req.body

      if (apiKey !== undefined) {
        if (apiKey && typeof apiKey !== 'string') {
          return res.status(400).json({ error: 'Invalid API key' })
        }
        if (apiKey) {
          await botConfigRepository.set('deepseek_api_key', apiKey)
        } else {
          await botConfigRepository.delete('deepseek_api_key')
        }
      }

      if (enabled !== undefined) {
        await botConfigRepository.set('ai_enabled', enabled ? 'true' : 'false')
      }

      // Auto-detect and fix provider/model compatibility before saving
      let finalProvider = provider
      if (model !== undefined && model) {
        // Auto-detect provider from model name
        if (model.includes(':') || model.includes('/')) {
          // This is an Ollama model - override provider
          finalProvider = 'ollama'
        } else if (model.startsWith('deepseek-')) {
          // This is a DeepSeek model - override provider
          finalProvider = 'deepseek'
        }
      }

      // Save the provider (use auto-detected one if available, otherwise use explicit one)
      if (finalProvider !== undefined) {
        const validProviders: AIProvider[] = ['deepseek', 'ollama']
        if (validProviders.includes(finalProvider)) {
          await botConfigRepository.set('ai_provider', finalProvider)
        } else {
          return res.status(400).json({ error: 'Invalid provider' })
        }
      } else if (provider !== undefined) {
        const validProviders: AIProvider[] = ['deepseek', 'ollama']
        if (validProviders.includes(provider)) {
          await botConfigRepository.set('ai_provider', provider)
        } else {
          return res.status(400).json({ error: 'Invalid provider' })
        }
      }

      if (providerUrl !== undefined) {
        if (providerUrl && typeof providerUrl === 'string') {
          await botConfigRepository.set('ai_provider_url', providerUrl)
        } else {
          await botConfigRepository.delete('ai_provider_url')
        }
      }

      if (model !== undefined) {
        if (model && typeof model === 'string') {
          await botConfigRepository.set('ai_model', model)
          // Also update old key for backward compatibility
          await botConfigRepository.set('deepseek_model', model)
        } else {
          await botConfigRepository.delete('ai_model')
        }
      }

      if (temperature !== undefined) {
        const temp = parseFloat(temperature)
        if (isNaN(temp) || temp < 0 || temp > 2) {
          return res.status(400).json({ error: 'Temperature must be between 0 and 2' })
        }
        await botConfigRepository.set('ai_temperature', temperature.toString())
        // Also update old key for backward compatibility
        await botConfigRepository.set('deepseek_temperature', temperature.toString())
      }

      if (maxTokens !== undefined) {
        const tokens = parseInt(maxTokens)
        if (isNaN(tokens) || tokens < 1 || tokens > 4096) {
          return res.status(400).json({ error: 'Max tokens must be between 1 and 4096' })
        }
        await botConfigRepository.set('ai_max_tokens', maxTokens.toString())
        // Also update old key for backward compatibility
        await botConfigRepository.set('deepseek_max_tokens', maxTokens.toString())
      }

      if (personality !== undefined) {
        const validPersonalities: AIPersonality[] = ['normal', 'rude', 'professional', 'friendly', 'sarcastic']
        if (validPersonalities.includes(personality)) {
          await botConfigRepository.set('ai_personality', personality)
        } else {
          return res.status(400).json({ error: 'Invalid personality' })
        }
      }

      if (showModelInfo !== undefined) {
        await botConfigRepository.set('ai_show_model_info', showModelInfo ? 'true' : 'false')
      }

      if (trainingEnabled !== undefined) {
        await aiTrainingService.setTrainingEnabled(trainingEnabled)
      }

      res.json({ success: true, message: 'AI configuration saved' })
    } catch (error) {
      console.error('Error saving AI config:', error)
      res.status(500).json({ error: 'Failed to save AI configuration' })
    }
  },

  async deleteApiKey(req: Request, res: Response) {
    try {
      await botConfigRepository.delete('deepseek_api_key')
      // Also disable AI when API key is deleted (only if using DeepSeek)
      const provider = await botConfigRepository.get('ai_provider')
      if (provider === 'deepseek' || !provider) {
        await botConfigRepository.set('ai_enabled', 'false')
      }
      res.json({ success: true, message: 'API key deleted' })
    } catch (error) {
      console.error('Error deleting API key:', error)
      res.status(500).json({ error: 'Failed to delete API key' })
    }
  },

  async getAvailableModels(req: Request, res: Response) {
    try {
      const { provider, providerUrl } = req.query

      if (provider === 'ollama') {
        const baseUrl = (providerUrl as string) || 'http://localhost:11434'
        try {
          const response = await fetch(`${baseUrl}/api/tags`)
          if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status}`)
          }
          const data = (await response.json()) as { models: Array<{ name: string }> }
          const models = data.models?.map((m) => m.name) || []
          res.json({ models })
        } catch (error: any) {
          console.error('Error fetching Ollama models:', error)
          res.status(500).json({ error: `Failed to connect to Ollama: ${error.message}` })
        }
      } else {
        // DeepSeek - return static list
        res.json({ models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'] })
      }
    } catch (error) {
      console.error('Error getting available models:', error)
      res.status(500).json({ error: 'Failed to get available models' })
    }
  },
}

