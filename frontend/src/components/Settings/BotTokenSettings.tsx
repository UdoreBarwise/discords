import { useState, useEffect } from 'react'
import BotConfig from '../BotConfig/BotConfig'
import { botService } from '../../services/botService'
import { discordService, Guild } from '../../services/discordService'
import { useNotifications } from '../../contexts/NotificationContext'
import { useServer } from '../../contexts/ServerContext'
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog'
import './SettingsSection.css'

export default function BotTokenSettings() {
  const { addNotification } = useNotifications()
  const { selectedServerId, setSelectedServerId } = useServer()
  const [guilds, setGuilds] = useState<Guild[]>([])
  const [errorWebhookUrl, setErrorWebhookUrl] = useState('')
  const [youtubeApiKey, setYoutubeApiKey] = useState('')
  const [hasYoutubeApiKey, setHasYoutubeApiKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingWebhook, setSavingWebhook] = useState(false)
  const [savingYoutubeKey, setSavingYoutubeKey] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [guildsData, webhookUrl, hasYoutubeKey] = await Promise.all([
        discordService.getGuilds(),
        botService.getErrorWebhook(),
        botService.hasYouTubeApiKey(),
      ])
      setGuilds(guildsData)
      setErrorWebhookUrl(webhookUrl)
      setHasYoutubeApiKey(hasYoutubeKey)
    } catch (error: any) {
      console.error('Failed to load data:', {
        error,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code,
        config: error.config?.url,
      })
      
      let errorMessage = 'Failed to fetch data'
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        errorMessage = 'Cannot connect to server. Please check if the backend is running.'
      } else if (error.response?.status === 503) {
        errorMessage = error.response?.data?.error || 'Bot client not initialized. Please set your bot token first.'
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.message) {
        errorMessage = error.message
      }
      
      addNotification({
        type: 'error',
        title: 'Failed to Load Data',
        message: errorMessage,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveClick = () => {
    setShowConfirmDialog(true)
  }

  const handleSaveDefaultServer = async () => {
    setShowConfirmDialog(false)
    setSaving(true)
    try {
      await botService.setDefaultServer(selectedServerId)
      setSelectedServerId(selectedServerId)
      addNotification({
        type: 'success',
        title: 'Default Server Saved',
        message: 'Default server has been saved successfully',
      })
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: error.response?.data?.error || 'Failed to save default server',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveErrorWebhook = async () => {
    setSavingWebhook(true)
    try {
      await botService.setErrorWebhook(errorWebhookUrl)
      addNotification({
        type: 'success',
        title: 'Error Webhook Saved',
        message: 'Error webhook URL has been saved successfully',
      })
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: error.response?.data?.error || 'Failed to save error webhook',
      })
    } finally {
      setSavingWebhook(false)
    }
  }

  const handleSaveYoutubeApiKey = async () => {
    if (!youtubeApiKey.trim()) {
      addNotification({
        type: 'warning',
        title: 'Invalid API Key',
        message: 'API key cannot be empty',
      })
      return
    }

    setSavingYoutubeKey(true)
    try {
      await botService.setYouTubeApiKey(youtubeApiKey)
      addNotification({
        type: 'success',
        title: 'YouTube API Key Saved',
        message: 'YouTube API key has been saved successfully',
      })
      setHasYoutubeApiKey(true)
      setYoutubeApiKey('')
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: error.response?.data?.error || 'Failed to save YouTube API key',
      })
    } finally {
      setSavingYoutubeKey(false)
    }
  }

  const handleDeleteYoutubeApiKey = async () => {
    setSavingYoutubeKey(true)
    try {
      await botService.deleteYouTubeApiKey()
      addNotification({
        type: 'info',
        title: 'YouTube API Key Deleted',
        message: 'YouTube API key has been removed',
      })
      setHasYoutubeApiKey(false)
      setYoutubeApiKey('')
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Delete Failed',
        message: error.response?.data?.error || 'Failed to delete YouTube API key',
      })
    } finally {
      setSavingYoutubeKey(false)
    }
  }

  return (
    <div className="settings-section">
      <BotConfig />
      
      <div className="settings-subsection" style={{ marginTop: '2rem' }}>
        <h3>Default Server</h3>
        <p className="settings-description">
          Select a default Discord server that will be used throughout the application. All pages will automatically use this server.
        </p>
        
        <div className="settings-field">
          <label htmlFor="default-server-select">Default Server</label>
          <select
            id="default-server-select"
            value={selectedServerId || ''}
            onChange={(e) => setSelectedServerId(e.target.value || null)}
            disabled={loading || saving}
          >
            <option value="">No default server selected</option>
            {guilds.map((guild) => (
              <option key={guild.id} value={guild.id}>
                {guild.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSaveClick}
          disabled={loading || saving}
          className="settings-save-button"
        >
          {saving ? 'Saving...' : 'Save Default Server'}
        </button>
      </div>

      <div className="settings-subsection" style={{ marginTop: '2rem' }}>
        <h3>Error Webhook (Optional)</h3>
        <p className="settings-description">
          Configure a Discord webhook URL to receive error logs. All errors will be posted to this webhook for monitoring and debugging.
        </p>
        
        <div className="settings-field">
          <label htmlFor="error-webhook-url">Discord Webhook URL</label>
          <input
            id="error-webhook-url"
            type="text"
            value={errorWebhookUrl}
            onChange={(e) => setErrorWebhookUrl(e.target.value)}
            placeholder="https://discord.com/api/webhooks/..."
            disabled={loading || savingWebhook}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              background: 'var(--input-bg, #2a2a2a)',
              color: 'var(--text-primary, #fff)',
              border: '1px solid var(--border-color, #444)',
              borderRadius: '8px',
            }}
          />
          <p className="settings-description" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
            Leave empty to disable error logging to Discord. Errors will still be logged to the console.
          </p>
        </div>

        <button
          onClick={handleSaveErrorWebhook}
          disabled={loading || savingWebhook}
          className="settings-save-button"
          style={{ marginTop: '1rem' }}
        >
          {savingWebhook ? 'Saving...' : 'Save Error Webhook'}
        </button>
      </div>

      <div className="settings-subsection" style={{ marginTop: '2rem' }}>
        <h3>YouTube API Key</h3>
        <p className="settings-description">
          Configure a YouTube Data API v3 key to enable YouTube notification features. Get your API key from{' '}
          <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">
            Google Cloud Console
          </a>.
        </p>
        
        <div className="settings-field">
          <div style={{ marginBottom: '0.5rem' }}>
            <span className={`status-indicator ${hasYoutubeApiKey ? 'active' : 'inactive'}`} style={{ fontSize: '0.9rem' }}>
              {hasYoutubeApiKey ? 'YouTube API key is set' : 'No YouTube API key set'}
            </span>
          </div>
          <label htmlFor="youtube-api-key">YouTube API Key</label>
          <input
            id="youtube-api-key"
            type="password"
            value={youtubeApiKey}
            onChange={(e) => setYoutubeApiKey(e.target.value)}
            placeholder="Enter your YouTube API key"
            disabled={loading || savingYoutubeKey}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              background: 'var(--input-bg, #2a2a2a)',
              color: 'var(--text-primary, #fff)',
              border: '1px solid var(--border-color, #444)',
              borderRadius: '8px',
            }}
          />
          <p className="settings-description" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
            Required for YouTube notification features. The API key is stored securely and never displayed.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button
            onClick={handleSaveYoutubeApiKey}
            disabled={loading || savingYoutubeKey || !youtubeApiKey.trim()}
            className="settings-save-button"
          >
            {savingYoutubeKey ? 'Saving...' : 'Save API Key'}
          </button>
          {hasYoutubeApiKey && (
            <button
              onClick={handleDeleteYoutubeApiKey}
              disabled={loading || savingYoutubeKey}
              className="settings-save-button"
              style={{ background: 'var(--danger-color, #dc3545)' }}
            >
              Delete API Key
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Save Default Server"
        message={
          <div>
            <p>Are you sure you want to save this as the default server?</p>
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
              {selectedServerId ? (
                <>
                  Server: <strong>{guilds.find((g) => g.id === selectedServerId)?.name || 'Unknown'}</strong>
                  <br />
                  This server will be used throughout the application.
                </>
              ) : (
                <>No default server will be set. Please select a server to use the application features.</>
              )}
            </p>
          </div>
        }
        confirmText="Save"
        cancelText="Cancel"
        onConfirm={handleSaveDefaultServer}
        onCancel={() => setShowConfirmDialog(false)}
        variant="default"
      />
    </div>
  )
}

