import { useState, useEffect } from 'react'
import { welcomeMessageService, WelcomeMessageConfig as WelcomeMessageConfigType } from '../../services/welcomeMessageService'
import { discordService, Guild, Channel } from '../../services/discordService'
import { botService } from '../../services/botService'
import { useNotifications } from '../../contexts/NotificationContext'
import './WelcomeMessageConfig.css'

export default function WelcomeMessageConfig() {
  const { addNotification } = useNotifications()
  const [loading, setLoading] = useState(false)
  const [guilds, setGuilds] = useState<Guild[]>([])
  const [channels, setChannels] = useState<Channel[]>([])

  const [config, setConfig] = useState<WelcomeMessageConfigType>({
    guildId: '',
    enabled: false,
    channelId: null,
    sendAsDM: false,
    messageType: 'text',
    messageContent: 'Welcome to {server}, {user}!',
    embedTitle: null,
    embedDescription: null,
    embedColor: null,
    embedThumbnail: null,
    embedImage: null,
    embedFooter: null,
  })

  useEffect(() => {
    loadGuilds()
    loadDefaultServer()
  }, [])

  useEffect(() => {
    if (config.guildId) {
      loadGuildData(config.guildId)
      loadConfig(config.guildId)
    }
  }, [config.guildId])

  const loadDefaultServer = async () => {
    try {
      const defaultServerId = await botService.getDefaultServer()
      if (defaultServerId && !config.guildId) {
        setConfig({ ...config, guildId: defaultServerId })
      }
    } catch (error) {
      console.error('Failed to load default server:', error)
    }
  }

  const loadGuilds = async () => {
    try {
      const data = await discordService.getGuilds()
      setGuilds(data)
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Load Guilds',
        message: error.response?.data?.error || 'Failed to fetch Discord servers',
      })
    }
  }

  const loadGuildData = async (guildId: string) => {
    try {
      const channelsData = await discordService.getChannels(guildId)
      setChannels(channelsData)
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Load Data',
        message: error.response?.data?.error || 'Failed to fetch guild data',
      })
    }
  }

  const loadConfig = async (guildId: string) => {
    try {
      const data = await welcomeMessageService.getConfig(guildId)
      if (data) {
        setConfig(data)
      } else {
        setConfig({
          guildId,
          enabled: false,
          channelId: null,
          sendAsDM: false,
          messageType: 'text',
          messageContent: 'Welcome to {server}, {user}!',
          embedTitle: null,
          embedDescription: null,
          embedColor: null,
          embedThumbnail: null,
          embedImage: null,
          embedFooter: null,
        })
      }
    } catch (error: any) {
      console.error('Failed to load config:', error)
    }
  }

  const handleSave = async () => {
    if (!config.guildId) {
      addNotification({
        type: 'warning',
        title: 'Missing Selection',
        message: 'Please select a Discord server',
      })
      return
    }

    if (!config.sendAsDM && !config.channelId) {
      addNotification({
        type: 'warning',
        title: 'Missing Selection',
        message: 'Please select a channel or enable DM mode',
      })
      return
    }

    setLoading(true)
    try {
      await welcomeMessageService.saveConfig(config)
      addNotification({
        type: 'success',
        title: 'Configuration Saved',
        message: 'Welcome message configuration has been saved successfully',
      })
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: error.response?.data?.error || 'Failed to save configuration',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="welcome-message-config">
      <div className="welcome-message-section">
        <label htmlFor="guild-select">Discord Server</label>
        <select
          id="guild-select"
          value={config.guildId}
          onChange={(e) => setConfig({ ...config, guildId: e.target.value, channelId: null })}
          disabled={loading}
        >
          <option value="">Select a server</option>
          {guilds.map((guild) => (
            <option key={guild.id} value={guild.id}>
              {guild.name}
            </option>
          ))}
        </select>
      </div>

      {config.guildId && (
        <>
          <div className="welcome-message-section">
            <div className="welcome-message-toggle-group">
              <label htmlFor="enable-welcome" className="welcome-message-toggle-label">
                Enable Welcome Messages
              </label>
              <label className="welcome-message-toggle-switch">
                <input
                  id="enable-welcome"
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  disabled={loading}
                />
                <span className="welcome-message-toggle-slider"></span>
              </label>
            </div>
          </div>

          {config.enabled && (
            <>
              <div className="welcome-message-section">
                <div className="welcome-message-toggle-group">
                  <label htmlFor="send-as-dm" className="welcome-message-toggle-label">
                    Send as Direct Message
                  </label>
                  <label className="welcome-message-toggle-switch">
                    <input
                      id="send-as-dm"
                      type="checkbox"
                      checked={config.sendAsDM}
                      onChange={(e) => setConfig({ ...config, sendAsDM: e.target.checked, channelId: e.target.checked ? null : config.channelId })}
                      disabled={loading}
                    />
                    <span className="welcome-message-toggle-slider"></span>
                  </label>
                </div>
                <p className="welcome-message-hint">
                  When enabled, welcome messages will be sent as DMs instead of in a channel
                </p>
              </div>

              {!config.sendAsDM && (
                <div className="welcome-message-section">
                  <label htmlFor="channel-select">Welcome Channel</label>
                  <select
                    id="channel-select"
                    value={config.channelId || ''}
                    onChange={(e) => setConfig({ ...config, channelId: e.target.value || null })}
                    disabled={loading}
                  >
                    <option value="">Select a channel</option>
                    {channels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        #{channel.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="welcome-message-section">
                <label htmlFor="message-type">Message Type</label>
                <select
                  id="message-type"
                  value={config.messageType}
                  onChange={(e) => setConfig({ ...config, messageType: e.target.value as 'text' | 'embed' })}
                  disabled={loading}
                >
                  <option value="text">Text Message</option>
                  <option value="embed">Embed Message</option>
                </select>
              </div>

              {config.messageType === 'text' ? (
                <div className="welcome-message-section">
                  <label htmlFor="message-content">Message Content</label>
                  <textarea
                    id="message-content"
                    value={config.messageContent || ''}
                    onChange={(e) => setConfig({ ...config, messageContent: e.target.value })}
                    disabled={loading}
                    placeholder="Welcome to {server}, {user}!"
                    rows={4}
                  />
                  <p className="welcome-message-hint">
                    Available variables: {'{user}'}, {'{username}'}, {'{displayName}'}, {'{tag}'}, {'{server}'}, {'{memberCount}'}, {'{mention}'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="welcome-message-section">
                    <label htmlFor="embed-title">Embed Title</label>
                    <input
                      id="embed-title"
                      type="text"
                      value={config.embedTitle || ''}
                      onChange={(e) => setConfig({ ...config, embedTitle: e.target.value || null })}
                      disabled={loading}
                      placeholder="Welcome to {server}!"
                    />
                  </div>

                  <div className="welcome-message-section">
                    <label htmlFor="embed-description">Embed Description</label>
                    <textarea
                      id="embed-description"
                      value={config.embedDescription || ''}
                      onChange={(e) => setConfig({ ...config, embedDescription: e.target.value || null })}
                      disabled={loading}
                      placeholder="Welcome {user}! We're glad to have you here."
                      rows={4}
                    />
                    <p className="welcome-message-hint">
                      Available variables: {'{user}'}, {'{username}'}, {'{displayName}'}, {'{tag}'}, {'{server}'}, {'{memberCount}'}, {'{mention}'}
                    </p>
                  </div>

                  <div className="welcome-message-section">
                    <label htmlFor="embed-color">Embed Color (Hex)</label>
                    <div className="welcome-message-color-input">
                      <input
                        id="embed-color"
                        type="color"
                        value={config.embedColor || '#5865f2'}
                        onChange={(e) => setConfig({ ...config, embedColor: e.target.value })}
                        disabled={loading}
                      />
                      <input
                        type="text"
                        value={config.embedColor || '#5865f2'}
                        onChange={(e) => setConfig({ ...config, embedColor: e.target.value || null })}
                        disabled={loading}
                        placeholder="#5865f2"
                        pattern="^#[0-9A-Fa-f]{6}$"
                      />
                    </div>
                  </div>

                  <div className="welcome-message-section">
                    <label htmlFor="embed-thumbnail">Embed Thumbnail URL</label>
                    <input
                      id="embed-thumbnail"
                      type="url"
                      value={config.embedThumbnail || ''}
                      onChange={(e) => setConfig({ ...config, embedThumbnail: e.target.value || null })}
                      disabled={loading}
                      placeholder="https://example.com/image.png"
                    />
                  </div>

                  <div className="welcome-message-section">
                    <label htmlFor="embed-image">Embed Image URL</label>
                    <input
                      id="embed-image"
                      type="url"
                      value={config.embedImage || ''}
                      onChange={(e) => setConfig({ ...config, embedImage: e.target.value || null })}
                      disabled={loading}
                      placeholder="https://example.com/image.png"
                    />
                  </div>

                  <div className="welcome-message-section">
                    <label htmlFor="embed-footer">Embed Footer</label>
                    <input
                      id="embed-footer"
                      type="text"
                      value={config.embedFooter || ''}
                      onChange={(e) => setConfig({ ...config, embedFooter: e.target.value || null })}
                      disabled={loading}
                      placeholder="Member #{memberCount}"
                    />
                  </div>
                </>
              )}

              <div className="welcome-message-actions">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="welcome-message-button save"
                >
                  {loading ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </>
          )}
        </>
      )}

      <div className="welcome-message-info">
        <h3>How it works:</h3>
        <ul>
          <li>Welcome messages are automatically sent when a new member joins your server</li>
          <li>You can send messages as DMs or in a specific channel</li>
          <li>Choose between text messages or rich embed messages</li>
          <li>Use variables to personalize messages: {'{user}'}, {'{username}'}, {'{displayName}'}, {'{tag}'}, {'{server}'}, {'{memberCount}'}, {'{mention}'}</li>
          <li>Text messages support all variables</li>
          <li>Embed messages support variables in title, description, and footer</li>
        </ul>
      </div>
    </div>
  )
}

