import { useState, useEffect } from 'react'
import { aiService, AIProvider, AIPersonality, aiPresetService, AIPreset } from '../../services/aiService'
import { useNotifications } from '../../contexts/NotificationContext'
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog'
import './AIGlobalSettings.css'

const PROVIDER_DEFAULT_URLS: Record<AIProvider, string> = {
  deepseek: '',
  ollama: 'http://localhost:11434',
}

export default function AIGlobalSettings() {
  const { addNotification } = useNotifications()
  const [enabled, setEnabled] = useState(false)
  const [provider, setProvider] = useState<AIProvider>('deepseek')
  const [providerUrl, setProviderUrl] = useState('')
  const [model, setModel] = useState('deepseek-chat')
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(2000)
  const [personality, setPersonality] = useState<AIPersonality>('normal')
  const [showModelInfo, setShowModelInfo] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showToggleDialog, setShowToggleDialog] = useState(false)
  const [showSaveSettingsDialog, setShowSaveSettingsDialog] = useState(false)
  const [pendingEnabled, setPendingEnabled] = useState(false)
  const [presets, setPresets] = useState<AIPreset[]>([])
  const [presetName, setPresetName] = useState('')
  const [showPresetDialog, setShowPresetDialog] = useState(false)
  const [showDeletePresetDialog, setShowDeletePresetDialog] = useState(false)
  const [presetToDelete, setPresetToDelete] = useState<number | null>(null)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [trainingEnabled, setTrainingEnabled] = useState(false)

  const fetchAvailableModels = async (currentProvider: AIProvider, currentProviderUrl: string) => {
    setLoadingModels(true)
    try {
      const models = await aiService.getAvailableModels(currentProvider, currentProviderUrl || undefined)
      setAvailableModels(models)
      if (models.length > 0) {
        setModel((prevModel) => (models.includes(prevModel) ? prevModel : models[0]))
      }
    } catch (error: any) {
      console.error('Failed to fetch models:', error)
      if (currentProvider === 'ollama') {
        addNotification({
          type: 'warning',
          title: 'Could not fetch models',
          message: 'Make sure Ollama is running. You can still enter a model name manually.',
        })
      }
      setAvailableModels([])
    } finally {
      setLoadingModels(false)
    }
  }

  useEffect(() => {
    checkApiKeyStatus()
    loadConfig()
    loadPresets()
  }, [])

  const loadPresets = async () => {
    try {
      const data = await aiPresetService.getAll()
      setPresets(data)
    } catch (error) {
      console.error('Failed to load presets:', error)
    }
  }

  useEffect(() => {
    if (provider !== 'deepseek') {
      const url = providerUrl || PROVIDER_DEFAULT_URLS[provider]
      fetchAvailableModels(provider, url)
    } else {
      setAvailableModels(['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'])
    }
    if (!providerUrl && provider !== 'deepseek') {
      setProviderUrl(PROVIDER_DEFAULT_URLS[provider])
    }
  }, [provider])

  useEffect(() => {
    if (provider !== 'deepseek' && providerUrl) {
      fetchAvailableModels(provider, providerUrl)
    }
  }, [providerUrl])

  // Auto-detect provider from model name
  const detectProviderFromModel = (modelName: string): AIProvider | null => {
    if (!modelName || modelName.trim() === '') return null
    
    // Models with : or / are typically Ollama (e.g., "dolphin-phi:latest", "mistral:7b")
    if (modelName.includes(':') || modelName.includes('/')) {
      return 'ollama'
    }
    
    // Models starting with "deepseek-" are DeepSeek models
    if (modelName.startsWith('deepseek-')) {
      return 'deepseek'
    }
    
    return null
  }

  const handleModelChange = (newModel: string) => {
    setModel(newModel)
    
    // Auto-detect provider from model name
    const detectedProvider = detectProviderFromModel(newModel)
    if (detectedProvider && detectedProvider !== provider) {
      console.log(`[AIGlobalSettings] Auto-detected provider "${detectedProvider}" from model "${newModel}"`)
      setProvider(detectedProvider)
      
      // Update provider URL if switching to a local provider
      if (detectedProvider !== 'deepseek' && !providerUrl) {
        setProviderUrl(PROVIDER_DEFAULT_URLS[detectedProvider])
      }
      
      addNotification({
        type: 'info',
        title: 'Provider Auto-Switched',
        message: `Provider automatically changed to "${detectedProvider}" based on model name.`,
      })
    }
  }

  const checkApiKeyStatus = async () => {
    try {
      const status = await aiService.hasApiKey()
      setHasApiKey(status)
    } catch (error) {
      console.error('Failed to check API key status:', error)
    }
  }

  const loadConfig = async () => {
    try {
      const config = await aiService.getConfig()
      const loadedProvider = config.provider || 'deepseek'
      const loadedProviderUrl = config.providerUrl || ''
      
      setEnabled(config.enabled)
      setProvider(loadedProvider)
      setProviderUrl(loadedProviderUrl)
      setModel(config.model || 'deepseek-chat')
      setTemperature(config.temperature || 0.7)
      setMaxTokens(config.maxTokens || 2000)
      setPersonality(config.personality || 'normal')
      setShowModelInfo(config.showModelInfo || false)
      setTrainingEnabled(config.trainingEnabled || false)
      
      if (loadedProvider !== 'deepseek') {
        const url = loadedProviderUrl || PROVIDER_DEFAULT_URLS[loadedProvider]
        fetchAvailableModels(loadedProvider, url)
      } else {
        setAvailableModels(['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'])
      }
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Load AI Configuration',
        message: error.response?.data?.error || 'Failed to fetch AI configuration',
      })
    }
  }

  const handleToggleChange = (checked: boolean) => {
    setPendingEnabled(checked)
    setShowToggleDialog(true)
  }

  const handleToggleConfirm = async () => {
    setShowToggleDialog(false)
    setEnabled(pendingEnabled)
    setLoading(true)

    try {
      await aiService.saveConfig(null, pendingEnabled)
      addNotification({
        type: 'success',
        title: 'AI Settings Saved',
        message: `AI has been ${pendingEnabled ? 'enabled' : 'disabled'} successfully`,
      })
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: error.response?.data?.error || 'Failed to save AI settings',
      })
      setEnabled(!pendingEnabled)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleCancel = () => {
    setShowToggleDialog(false)
    setPendingEnabled(enabled)
  }

  const handleSaveSettingsClick = () => {
    setShowSaveSettingsDialog(true)
  }

  const handleSaveSettingsConfirm = async () => {
    setShowSaveSettingsDialog(false)
    setLoading(true)

    try {
      await aiService.saveConfig(null, enabled, provider, providerUrl, model, temperature, maxTokens, personality, showModelInfo, trainingEnabled)
      addNotification({
        type: 'success',
        title: 'AI Settings Saved',
        message: 'AI configuration has been saved successfully',
      })
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: error.response?.data?.error || 'Failed to save AI settings',
      })
    } finally {
      setLoading(false)
    }
  }

  const needsApiKey = provider === 'deepseek'
  const isLocalProvider = provider !== 'deepseek'
  const canEnable = isLocalProvider || hasApiKey

  return (
    <div className="ai-global-settings">
      <h2>Global AI Settings</h2>
      
      <div className="ai-global-grid">
        {/* Enable Toggle */}
        <div className="ai-global-card">
          <label className="ai-global-label">Enable AI</label>
          <div className="dice-game-toggle-group">
            <label className="dice-game-toggle-switch">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => handleToggleChange(e.target.checked)}
                disabled={loading || !canEnable}
              />
              <span className="dice-game-toggle-slider"></span>
            </label>
          </div>
          {!canEnable && (
            <p className="ai-global-hint">
              {needsApiKey ? 'Set API key in Settings' : 'Configure provider first'}
            </p>
          )}
        </div>

        {/* Provider */}
        <div className="ai-global-card">
          <label className="ai-global-label" htmlFor="ai-provider-select">Provider</label>
          <select
            id="ai-provider-select"
            value={provider}
            onChange={(e) => setProvider(e.target.value as AIProvider)}
            disabled={loading}
          >
            <option value="deepseek">DeepSeek (Cloud)</option>
            <option value="ollama">Ollama (Local)</option>
          </select>
        </div>

        {/* Provider URL (for local) */}
        {isLocalProvider && (
          <div className="ai-global-card">
            <label className="ai-global-label" htmlFor="ai-provider-url">Provider URL</label>
            <input
              id="ai-provider-url"
              type="text"
              value={providerUrl}
              onChange={(e) => setProviderUrl(e.target.value)}
              placeholder={PROVIDER_DEFAULT_URLS[provider]}
              disabled={loading}
            />
          </div>
        )}

        {/* Model */}
        <div className="ai-global-card">
          <label className="ai-global-label" htmlFor="ai-model-select">Model</label>
          {loadingModels ? (
            <div className="ai-global-loading">Loading...</div>
          ) : availableModels.length > 0 ? (
            <select
              id="ai-model-select"
              value={model}
              onChange={(e) => handleModelChange(e.target.value)}
              disabled={loading}
            >
              {availableModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="ai-model-select"
              type="text"
              value={model}
              onChange={(e) => handleModelChange(e.target.value)}
              placeholder="Enter model name"
              disabled={loading}
            />
          )}
        </div>

        {/* Temperature */}
        <div className="ai-global-card">
          <label className="ai-global-label" htmlFor="ai-temperature">Temperature</label>
          <input
            id="ai-temperature"
            type="number"
            min="0"
            max="2"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value) || 0.7)}
            disabled={loading}
          />
        </div>

        {/* Max Tokens */}
        <div className="ai-global-card">
          <label className="ai-global-label" htmlFor="ai-max-tokens">Max Tokens</label>
          <input
            id="ai-max-tokens"
            type="number"
            min="1"
            max="4096"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value) || 2000)}
            disabled={loading}
          />
        </div>

        {/* Personality */}
        <div className="ai-global-card">
          <label className="ai-global-label" htmlFor="ai-personality-select">Personality</label>
          <select
            id="ai-personality-select"
            value={personality}
            onChange={(e) => setPersonality(e.target.value as AIPersonality)}
            disabled={loading}
          >
            <option value="normal">Normal</option>
            <option value="rude">Rude</option>
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
            <option value="sarcastic">Sarcastic</option>
          </select>
        </div>

        {/* Show Model Info */}
        <div className="ai-global-card">
          <label className="ai-global-label">Show Model Info</label>
          <div className="dice-game-toggle-group">
            <label className="dice-game-toggle-switch">
              <input
                type="checkbox"
                checked={showModelInfo}
                onChange={(e) => setShowModelInfo(e.target.checked)}
                disabled={loading}
              />
              <span className="dice-game-toggle-slider"></span>
            </label>
          </div>
        </div>

        {/* Training Mode */}
        <div className="ai-global-card">
          <label className="ai-global-label">Training Mode</label>
          <div className="dice-game-toggle-group">
            <label className="dice-game-toggle-switch">
              <input
                type="checkbox"
                checked={trainingEnabled}
                onChange={(e) => setTrainingEnabled(e.target.checked)}
                disabled={loading}
              />
              <span className="dice-game-toggle-slider"></span>
            </label>
          </div>
          <p className="ai-global-hint">Learn from 👍/👎 reactions on bot messages</p>
        </div>
      </div>

      {/* Presets */}
      <div className="ai-global-presets">
        <div className="ai-global-presets-header">
          <h3>Presets</h3>
          <div className="ai-global-presets-input">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset name..."
              disabled={loading}
            />
            <button
              onClick={() => setShowPresetDialog(true)}
              disabled={loading || !presetName.trim()}
            >
              Save
            </button>
          </div>
        </div>
        {presets.length > 0 && (
          <div className="ai-global-presets-grid">
            {presets.map((preset) => (
              <div key={preset.id} className="ai-global-preset-card">
                <div className="ai-global-preset-header">
                  <h4>{preset.name}</h4>
                  <button
                    onClick={() => {
                      setPresetToDelete(preset.id!)
                      setShowDeletePresetDialog(true)
                    }}
                    className="ai-global-preset-delete"
                    title="Delete preset"
                  >
                    ×
                  </button>
                </div>
                <div className="ai-global-preset-info">
                  <div>{preset.provider} • {preset.model}</div>
                  <div>Temp: {preset.temperature} • Tokens: {preset.maxTokens}</div>
                </div>
                <button
                  onClick={async () => {
                    setProvider(preset.provider)
                    setProviderUrl(preset.providerUrl || '')
                    setModel(preset.model)
                    setTemperature(preset.temperature)
                    setMaxTokens(preset.maxTokens)
                    setPersonality(preset.personality)
                    addNotification({
                      type: 'success',
                      title: 'Preset Loaded',
                      message: `Loaded preset "${preset.name}"`,
                    })
                  }}
                  className="ai-global-preset-load"
                >
                  Load
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleSaveSettingsClick}
        disabled={loading}
        className="ai-global-save-button"
      >
        {loading ? 'Saving...' : 'Save Settings'}
      </button>

      <ConfirmDialog
        isOpen={showToggleDialog}
        title={pendingEnabled ? 'Enable AI' : 'Disable AI'}
        message={`Are you sure you want to ${pendingEnabled ? 'enable' : 'disable'} AI?`}
        confirmText="Confirm"
        cancelText="Cancel"
        onConfirm={handleToggleConfirm}
        onCancel={handleToggleCancel}
        variant="default"
      />

      <ConfirmDialog
        isOpen={showSaveSettingsDialog}
        title="Save Settings"
        message="Are you sure you want to save these settings?"
        confirmText="Save"
        cancelText="Cancel"
        onConfirm={handleSaveSettingsConfirm}
        onCancel={() => setShowSaveSettingsDialog(false)}
        variant="default"
      />

      <ConfirmDialog
        isOpen={showPresetDialog}
        title="Save Preset"
        message={`Save current AI configuration as preset "${presetName}"?`}
        confirmText="Save"
        cancelText="Cancel"
        onConfirm={async () => {
          setShowPresetDialog(false)
          setLoading(true)
          try {
            await aiPresetService.create({
              name: presetName,
              provider,
              providerUrl: providerUrl || undefined,
              model,
              temperature,
              maxTokens,
              personality,
            })
            addNotification({
              type: 'success',
              title: 'Preset Saved',
              message: `Preset "${presetName}" has been saved successfully`,
            })
            setPresetName('')
            await loadPresets()
          } catch (error: any) {
            addNotification({
              type: 'error',
              title: 'Save Failed',
              message: error.response?.data?.error || 'Failed to save preset',
            })
          } finally {
            setLoading(false)
          }
        }}
        onCancel={() => setShowPresetDialog(false)}
        variant="default"
      />

      <ConfirmDialog
        isOpen={showDeletePresetDialog}
        title="Delete Preset"
        message="Are you sure you want to delete this preset? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={async () => {
          if (presetToDelete) {
            setShowDeletePresetDialog(false)
            setLoading(true)
            try {
              await aiPresetService.delete(presetToDelete)
              addNotification({
                type: 'success',
                title: 'Preset Deleted',
                message: 'Preset has been deleted successfully',
              })
              await loadPresets()
            } catch (error: any) {
              addNotification({
                type: 'error',
                title: 'Delete Failed',
                message: error.response?.data?.error || 'Failed to delete preset',
              })
            } finally {
              setLoading(false)
              setPresetToDelete(null)
            }
          }
        }}
        onCancel={() => {
          setShowDeletePresetDialog(false)
          setPresetToDelete(null)
        }}
        variant="danger"
      />
    </div>
  )
}

