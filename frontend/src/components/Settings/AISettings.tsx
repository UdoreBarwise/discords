import { useState, useEffect } from 'react'
import { aiService, AIProvider, AIPersonality, aiPresetService, AIPreset } from '../../services/aiService'
import { useNotifications } from '../../contexts/NotificationContext'
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog'
import './SettingsSection.css'
import '../BotConfig/BotConfig.css'
import '../DiceGame/DiceGameConfig.css'

const PROVIDER_DEFAULT_URLS: Record<AIProvider, string> = {
  deepseek: '',
  ollama: 'http://localhost:11434',
}

export default function AISettings() {
  const { addNotification } = useNotifications()
  const [apiKey, setApiKey] = useState('')
  const [hasApiKey, setHasApiKey] = useState(false)
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showSaveApiKeyDialog, setShowSaveApiKeyDialog] = useState(false)
  const [showToggleDialog, setShowToggleDialog] = useState(false)
  const [showSaveSettingsDialog, setShowSaveSettingsDialog] = useState(false)
  const [pendingEnabled, setPendingEnabled] = useState(false)
  const [presets, setPresets] = useState<AIPreset[]>([])
  const [presetName, setPresetName] = useState('')
  const [showPresetDialog, setShowPresetDialog] = useState(false)
  const [showDeletePresetDialog, setShowDeletePresetDialog] = useState(false)
  const [presetToDelete, setPresetToDelete] = useState<number | null>(null)

  const fetchAvailableModels = async (currentProvider: AIProvider, currentProviderUrl: string) => {
    setLoadingModels(true)
    try {
      const models = await aiService.getAvailableModels(currentProvider, currentProviderUrl || undefined)
      setAvailableModels(models)
      // If current model is not in the list and we have models, select the first available model
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
    // Fetch available models when provider or providerUrl changes
    if (provider !== 'deepseek') {
      const url = providerUrl || PROVIDER_DEFAULT_URLS[provider]
      fetchAvailableModels(provider, url)
    } else {
      // For DeepSeek, use static list
      setAvailableModels(['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'])
    }
    // Update provider URL when provider changes
    if (!providerUrl && provider !== 'deepseek') {
      setProviderUrl(PROVIDER_DEFAULT_URLS[provider])
    }
  }, [provider])

  useEffect(() => {
    // Fetch models when providerUrl changes (but not on initial load)
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
      console.log(`[AISettings] Auto-detected provider "${detectedProvider}" from model "${newModel}"`)
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
      
      // Fetch models for the loaded provider
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

  const handleSaveApiKeyClick = () => {
    if (!apiKey.trim()) {
      addNotification({
        type: 'warning',
        title: 'Invalid API Key',
        message: 'API key cannot be empty',
      })
      return
    }
    setShowSaveApiKeyDialog(true)
  }

  const handleSaveApiKeyConfirm = async () => {
    setShowSaveApiKeyDialog(false)
    setLoading(true)

    try {
      await aiService.setApiKey(apiKey)
      addNotification({
        type: 'success',
        title: 'API Key Saved',
        message: 'API key has been saved successfully',
      })
      setHasApiKey(true)
      setApiKey('')
      await checkApiKeyStatus()
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: error.response?.data?.error || 'Failed to save API key',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = () => {
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    setShowDeleteDialog(false)
    setLoading(true)

    try {
      await aiService.deleteApiKey()
      addNotification({
        type: 'info',
        title: 'API Key Deleted',
        message: 'API key has been removed',
      })
      setHasApiKey(false)
      if (provider === 'deepseek') {
        setEnabled(false)
      }
      setApiKey('')
      await checkApiKeyStatus()
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Delete Failed',
        message: error.response?.data?.error || 'Failed to delete API key',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false)
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
      await aiService.saveConfig(null, enabled, provider, providerUrl, model, temperature, maxTokens, personality, showModelInfo)
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
    <div className="settings-section">
      <h2>AI Configuration</h2>
      
      <div className="settings-subsection">
        <h3>AI Provider</h3>
        <p className="settings-description">
          Choose which AI provider to use. Ollama runs locally on your computer and is free.
        </p>

        <div className="settings-field">
          <label htmlFor="ai-provider-select">Provider</label>
          <select
            id="ai-provider-select"
            value={provider}
            onChange={(e) => setProvider(e.target.value as AIProvider)}
            disabled={loading}
          >
            <option value="deepseek">DeepSeek (Cloud - Requires API Key)</option>
            <option value="ollama">Ollama (Local - Free)</option>
          </select>
          <p className="settings-description" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
            {provider === 'deepseek' && 'Cloud-based AI service. Requires an API key from DeepSeek.'}
            {provider === 'ollama' && 'Ollama is the easiest local AI option. Download from https://ollama.com and run models locally for free.'}
          </p>
        </div>

        {isLocalProvider && (
          <div className="settings-field" style={{ marginTop: '1.5rem' }}>
            <label htmlFor="ai-provider-url">Provider URL</label>
            <input
              id="ai-provider-url"
              type="text"
              value={providerUrl}
              onChange={(e) => setProviderUrl(e.target.value)}
              placeholder={PROVIDER_DEFAULT_URLS[provider]}
              disabled={loading}
            />
            <p className="settings-description" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
              The URL where your local AI server is running. Default: {PROVIDER_DEFAULT_URLS[provider]}
            </p>
          </div>
        )}

        {provider === 'ollama' && (
          <div className="bot-config-info" style={{ marginTop: '1rem', padding: '1rem', background: 'var(--input-bg, #2a2a2a)', borderRadius: '8px' }}>
            <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>How to set up Ollama:</p>
            <ol style={{ marginLeft: '1.5rem', lineHeight: '1.6' }}>
              <li>Download Ollama from <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary, #4a9eff)' }}>https://ollama.com</a></li>
              <li>Install and run Ollama</li>
              <li>Open a terminal and run: <code style={{ background: 'var(--bg-secondary, #1a1a1a)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>ollama pull llama2</code></li>
              <li>Or try other models: <code style={{ background: 'var(--bg-secondary, #1a1a1a)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>ollama pull mistral</code></li>
              <li>Make sure Ollama is running (it should start automatically)</li>
              <li>Select "Ollama" as your provider above and enter the model name you downloaded</li>
            </ol>
            <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', opacity: 0.8 }}>
              Popular models: llama2, llama3, mistral, codellama, phi, gemma
            </p>
          </div>
        )}
      </div>

      {needsApiKey && (
        <div className="bot-config" style={{ marginTop: '2rem' }}>
          <div className="bot-config-status">
            <span className={`status-indicator ${hasApiKey ? 'active' : 'inactive'}`}>
              {hasApiKey ? 'API key is set' : 'No API key set'}
            </span>
          </div>

          <div className="bot-config-input">
            <label htmlFor="ai-api-key">DeepSeek API Key</label>
            <input
              id="ai-api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your DeepSeek API key"
              disabled={loading}
            />
            <div className="bot-config-actions">
              <button
                onClick={handleSaveApiKeyClick}
                disabled={loading || !apiKey.trim()}
                className="bot-config-button save"
              >
                {loading ? 'Saving...' : 'Save API Key'}
              </button>
              {hasApiKey && (
                <button
                  onClick={handleDeleteClick}
                  disabled={loading}
                  className="bot-config-button delete"
                >
                  Delete API Key
                </button>
              )}
            </div>
          </div>

          <div className="bot-config-info">
            <p>To get a DeepSeek API key:</p>
            <ol>
              <li>Visit <a href="https://platform.deepseek.com" target="_blank" rel="noopener noreferrer">DeepSeek Platform</a></li>
              <li>Sign up or log in to your account</li>
              <li>Navigate to the API section</li>
              <li>Create a new API key</li>
              <li>Copy and paste it here and click "Save API Key"</li>
            </ol>
          </div>
        </div>
      )}

      <div className="settings-subsection" style={{ marginTop: '2rem' }}>
        <h3>Model Verification</h3>
        <p className="settings-description">
          When enabled, the AI will truthfully identify itself when asked about its model, provider, or creator. This prevents the AI from hallucinating false information about being ChatGPT or other services.
        </p>

        <div className="settings-field">
          <div className="dice-game-toggle-group">
            <label htmlFor="ai-show-model-info-toggle" className="dice-game-toggle-label">
              Show Model Information
            </label>
            <label className="dice-game-toggle-switch">
              <input
                id="ai-show-model-info-toggle"
                type="checkbox"
                checked={showModelInfo}
                onChange={(e) => setShowModelInfo(e.target.checked)}
                disabled={loading}
              />
              <span className="dice-game-toggle-slider"></span>
            </label>
          </div>
          <p className="settings-description" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
            {showModelInfo 
              ? 'The AI will truthfully state its model and provider when asked (e.g., "I am mistral running on Ollama").'
              : 'The AI may make up false information about its identity. Enable this to ensure accurate responses.'}
          </p>
        </div>
      </div>

      <div className="settings-subsection" style={{ marginTop: '2rem' }}>
        <h3>Presets</h3>
        <p className="settings-description">
          Save and load AI configuration presets for quick switching between different setups.
        </p>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Preset name..."
            disabled={loading}
            style={{
              flex: '1',
              minWidth: '200px',
              padding: '0.75rem',
              fontSize: '1rem',
              background: 'var(--input-bg, #2a2a2a)',
              color: 'var(--text-color, #fff)',
              border: '1px solid var(--border-color, #444)',
              borderRadius: '8px',
            }}
          />
          <button
            onClick={() => setShowPresetDialog(true)}
            disabled={loading || !presetName.trim()}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'var(--primary, #4a9eff)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading || !presetName.trim() ? 'not-allowed' : 'pointer',
              fontWeight: '500',
            }}
          >
            Save Preset
          </button>
        </div>

        {presets.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            {presets.map((preset) => (
              <div
                key={preset.id}
                style={{
                  padding: '1rem',
                  background: 'var(--input-bg, #2a2a2a)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #444)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>{preset.name}</h4>
                  <button
                    onClick={() => {
                      setPresetToDelete(preset.id!)
                      setShowDeletePresetDialog(true)
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--error-bg, #f44336)',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      fontSize: '1.2rem',
                    }}
                    title="Delete preset"
                  >
                    ×
                  </button>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #ccc)', marginBottom: '0.75rem' }}>
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
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: 'var(--primary, #4a9eff)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  Load
                </button>
              </div>
            ))}
          </div>
        )}

        {presets.length === 0 && (
          <p style={{ color: 'var(--text-secondary, #ccc)', fontSize: '0.9rem', fontStyle: 'italic' }}>
            No presets saved yet. Create one above to get started.
          </p>
        )}
      </div>

      <div className="settings-subsection" style={{ marginTop: '2rem' }}>
        <h3>Enable AI</h3>
        <p className="settings-description">
          Toggle AI functionality on or off. When enabled, the bot will respond to mentions and replies.
        </p>
        
        <div className="settings-field">
          <div className="dice-game-toggle-group">
            <label htmlFor="ai-enabled-toggle" className="dice-game-toggle-label">
              Enable AI responses
            </label>
            <label className="dice-game-toggle-switch">
              <input
                id="ai-enabled-toggle"
                type="checkbox"
                checked={enabled}
                onChange={(e) => handleToggleChange(e.target.checked)}
                disabled={loading || !canEnable}
              />
              <span className="dice-game-toggle-slider"></span>
            </label>
          </div>
          {!canEnable && (
            <p className="dice-game-hint" style={{ marginTop: '0.5rem' }}>
              {needsApiKey ? 'You must set an API key before enabling AI.' : 'Please configure your local AI provider first.'}
            </p>
          )}
        </div>
      </div>

      <div className="settings-subsection" style={{ marginTop: '2rem' }}>
        <h3>Model Settings</h3>
        <p className="settings-description">
          Configure which model to use and adjust response parameters.
        </p>

        <div className="settings-field">
          <label htmlFor="ai-model-select">Model</label>
          {loadingModels ? (
            <div style={{ padding: '0.5rem', color: 'var(--text-secondary, #ccc)' }}>
              Loading available models...
            </div>
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
              placeholder="Enter model name (e.g., llama2, mistral)"
              disabled={loading}
            />
          )}
          <p className="settings-description" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
            {provider === 'deepseek' && 'Choose the DeepSeek model that best fits your needs.'}
            {provider === 'ollama' && (
              <>
                {availableModels.length > 0
                  ? 'Models fetched from your Ollama installation.'
                  : 'Enter the model name you downloaded (e.g., llama2, mistral, wizard-vicuna-uncensored)'}
              </>
            )}
          </p>
          {provider === 'ollama' && availableModels.length === 0 && (
            <button
              type="button"
              onClick={() => fetchAvailableModels(provider, providerUrl || PROVIDER_DEFAULT_URLS[provider])}
              disabled={loadingModels}
              style={{
                marginTop: '0.5rem',
                padding: '0.5rem 1rem',
                background: 'var(--primary, #4a9eff)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loadingModels ? 'not-allowed' : 'pointer',
              }}
            >
              {loadingModels ? 'Loading...' : 'Refresh Models'}
            </button>
          )}
        </div>

        <div className="settings-field" style={{ marginTop: '1.5rem' }}>
          <label htmlFor="ai-temperature">Temperature</label>
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
          <p className="settings-description" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
            Controls randomness (0 = deterministic, 2 = very creative). Recommended: 0.7
          </p>
        </div>

        <div className="settings-field" style={{ marginTop: '1.5rem' }}>
          <label htmlFor="ai-max-tokens">Max Tokens</label>
          <input
            id="ai-max-tokens"
            type="number"
            min="1"
            max="4096"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value) || 2000)}
            disabled={loading}
          />
          <p className="settings-description" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
            Maximum length of AI responses (1-4096 tokens). Recommended: 2000
          </p>
        </div>

        <button
          onClick={handleSaveSettingsClick}
          disabled={loading}
          className="settings-save-button"
          style={{ marginTop: '1rem' }}
        >
          {loading ? 'Saving...' : 'Save Model Settings'}
        </button>
      </div>

      <div className="settings-subsection" style={{ marginTop: '2rem' }}>
        <h3>How to Use</h3>
        <p className="settings-description">
          Once configured, you can interact with the AI bot in Discord:
        </p>
        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', color: 'var(--text-secondary, #ccc)' }}>
          <li>Mention the bot: <code style={{ background: 'var(--input-bg, #2a2a2a)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>@BotName your question</code></li>
          <li>Reply to the bot's message to continue the conversation</li>
        </ul>
      </div>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete API Key"
        message="Are you sure you want to delete the API key? AI functionality will be disabled if using DeepSeek."
        confirmText="OK"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showSaveApiKeyDialog}
        title="Save API Key"
        message="Are you sure you want to save this API key?"
        confirmText="Save"
        cancelText="Cancel"
        onConfirm={handleSaveApiKeyConfirm}
        onCancel={() => setShowSaveApiKeyDialog(false)}
        variant="default"
      />

      <ConfirmDialog
        isOpen={showToggleDialog}
        title={pendingEnabled ? 'Enable AI' : 'Disable AI'}
        message={
          <div>
            <p>Are you sure you want to {pendingEnabled ? 'enable' : 'disable'} AI?</p>
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
              AI will be {pendingEnabled ? 'enabled' : 'disabled'} and the bot will {pendingEnabled ? 'respond' : 'not respond'} to mentions and replies.
            </p>
          </div>
        }
        confirmText="Confirm"
        cancelText="Cancel"
        onConfirm={handleToggleConfirm}
        onCancel={handleToggleCancel}
        variant="default"
      />

      <ConfirmDialog
        isOpen={showSaveSettingsDialog}
        title="Save Model Settings"
        message={
          <div>
            <p>Are you sure you want to save these settings?</p>
            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
              <p><strong>Provider:</strong> {provider}</p>
              {isLocalProvider && <p><strong>Provider URL:</strong> {providerUrl || PROVIDER_DEFAULT_URLS[provider]}</p>}
              <p><strong>Model:</strong> {model}</p>
              <p><strong>Personality:</strong> {personality}</p>
              <p><strong>Show Model Info:</strong> {showModelInfo ? 'Yes' : 'No'}</p>
              <p><strong>Temperature:</strong> {temperature}</p>
              <p><strong>Max Tokens:</strong> {maxTokens}</p>
            </div>
          </div>
        }
        confirmText="Save"
        cancelText="Cancel"
        onConfirm={handleSaveSettingsConfirm}
        onCancel={() => setShowSaveSettingsDialog(false)}
        variant="default"
      />

      <ConfirmDialog
        isOpen={showPresetDialog}
        title="Save Preset"
        message={
          <div>
            <p>Save current AI configuration as preset "{presetName}"?</p>
            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
              <p><strong>Provider:</strong> {provider}</p>
              <p><strong>Model:</strong> {model}</p>
              <p><strong>Temperature:</strong> {temperature}</p>
              <p><strong>Max Tokens:</strong> {maxTokens}</p>
            </div>
          </div>
        }
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
