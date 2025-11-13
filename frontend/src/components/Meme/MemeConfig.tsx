import { useState, useEffect } from 'react'
import { memeService, MemeConfig as MemeConfigType } from '../../services/memeService'
import { discordService, Channel } from '../../services/discordService'
import { useNotifications } from '../../contexts/NotificationContext'
import { useServer } from '../../contexts/ServerContext'
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog'
import './MemeConfig.css'

export default function MemeConfig() {
  const { addNotification } = useNotifications()
  const { selectedServerId, isLoading: serverLoading } = useServer()
  const [loading, setLoading] = useState(false)
  const [channels, setChannels] = useState<Channel[]>([])
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [creatingChannel, setCreatingChannel] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [showCreateChannelInput, setShowCreateChannelInput] = useState(false)

  const [config, setConfig] = useState<MemeConfigType>({
    guildId: '',
    enabled: false,
    channelId: '',
    autoDeleteMessages: false,
    autoPostEnabled: false,
    autoPostIntervalHours: 2,
  })

  useEffect(() => {
    if (selectedServerId && !config.guildId) {
      setConfig({ ...config, guildId: selectedServerId })
    }
  }, [selectedServerId])

  useEffect(() => {
    if (config.guildId) {
      loadChannels(config.guildId)
      loadConfig(config.guildId)
    }
  }, [config.guildId])

  const loadChannels = async (guildId: string) => {
    try {
      const data = await discordService.getChannels(guildId)
      setChannels(data)
    } catch (error: any) {
      console.error('Failed to load channels:', error)
      addNotification({
        type: 'error',
        title: 'Failed to Load Channels',
        message: 'Failed to fetch channels',
      })
    }
  }

  const loadConfig = async (guildId: string) => {
    try {
      const data = await memeService.getConfig(guildId)
      setConfig(data)
    } catch (error: any) {
      console.error('Failed to load config:', error)
    }
  }

  const handleChannelSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === '__create__') {
      setShowCreateChannelInput(true)
      setNewChannelName('')
      return
    }
    setShowCreateChannelInput(false)
    setConfig({ ...config, channelId: e.target.value || undefined })
  }

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) {
      addNotification({
        type: 'warning',
        title: 'Invalid Input',
        message: 'Please enter a channel name',
      })
      return
    }

    if (!config.guildId) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please set a default server in settings',
      })
      return
    }

    setCreatingChannel(true)
    try {
      const newChannel = await discordService.createChannel(config.guildId, newChannelName.trim())
      await loadChannels(config.guildId)
      setConfig({ ...config, channelId: newChannel.id })
      setNewChannelName('')
      setShowCreateChannelInput(false)
      addNotification({
        type: 'success',
        title: 'Channel Created',
        message: `Channel "${newChannel.name}" created successfully with admin-only write permissions`,
      })
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Create Channel',
        message: error.response?.data?.error || 'Failed to create channel',
      })
    } finally {
      setCreatingChannel(false)
    }
  }

  const handleSaveClick = () => {
    if (!selectedServerId) {
      addNotification({
        type: 'warning',
        title: 'Missing Selection',
        message: 'Please select a default server in Settings',
      })
      return
    }

    if (config.enabled && !config.channelId) {
      addNotification({
        type: 'warning',
        title: 'Missing Channel',
        message: 'Please select a channel when enabling the meme feature',
      })
      return
    }

    setShowConfirmDialog(true)
  }

  const handleSave = async () => {
    setShowConfirmDialog(false)
    setLoading(true)

    try {
      await memeService.saveConfig(config)
      addNotification({
        type: 'success',
        title: 'Configuration Saved',
        message: 'Meme configuration has been saved successfully',
      })
    } catch (error: any) {
      console.error('Failed to save config:', error)
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: 'Failed to save configuration',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="meme-config">
      {!selectedServerId && !serverLoading ? (
        <div className="meme-section">
          <p>No server selected.</p>
          <p>Please select a default server in Settings to configure meme settings.</p>
        </div>
      ) : selectedServerId && (
        <>
          <div className="meme-section">
            <div className="meme-toggle-group">
              <label htmlFor="enable-meme" className="meme-toggle-label">
                Enable Meme Feature
              </label>
              <label className="meme-toggle-switch">
                <input
                  id="enable-meme"
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  disabled={loading}
                />
                <span className="meme-toggle-slider"></span>
              </label>
            </div>
            <p className="meme-hint">
              When enabled, users can request dark memes using the !meme command
            </p>
          </div>

          {config.enabled && (
            <>
              <div className="meme-section">
                <label htmlFor="channel-select">Meme Channel</label>
                <select
                  id="channel-select"
                  value={showCreateChannelInput ? '__create__' : (config.channelId || '')}
                  onChange={handleChannelSelectChange}
                  disabled={loading}
                >
                  <option value="">Select a channel</option>
                  <option value="__create__">+ Create New Channel (Admin-only write)</option>
                  {channels
                    .filter((ch) => ch.type === 0)
                    .map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        #{channel.name}
                      </option>
                    ))}
                </select>
                {showCreateChannelInput && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                      placeholder="New channel name"
                      disabled={loading || creatingChannel}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateChannel()
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: 'var(--input-bg, #2a2a2a)',
                        color: 'var(--text-primary, #fff)',
                        border: '1px solid var(--border-color, #444)',
                        borderRadius: '6px',
                        fontSize: '1rem',
                      }}
                    />
                    <button
                      onClick={handleCreateChannel}
                      disabled={loading || creatingChannel || !newChannelName.trim()}
                      className="meme-button save"
                      style={{ padding: '0.75rem 1.5rem' }}
                    >
                      {creatingChannel ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                )}
                <p className="meme-hint">
                  Channel where memes will be posted. Users can only use !meme in this channel.
                </p>
              </div>

              <div className="meme-section">
                <div className="meme-toggle-group">
                  <label htmlFor="auto-delete" className="meme-toggle-label">
                    Auto-Delete Messages
                  </label>
                  <label className="meme-toggle-switch">
                    <input
                      id="auto-delete"
                      type="checkbox"
                      checked={config.autoDeleteMessages}
                      onChange={(e) => setConfig({ ...config, autoDeleteMessages: e.target.checked })}
                      disabled={loading}
                    />
                    <span className="meme-toggle-slider"></span>
                  </label>
                </div>
                <p className="meme-hint">
                  When enabled, the bot will automatically delete all messages in the meme channel (except bot messages and commands)
                </p>
              </div>

              <div className="meme-section">
                <div className="meme-toggle-group">
                  <label htmlFor="auto-post" className="meme-toggle-label">
                    Enable Auto-Posting
                  </label>
                  <label className="meme-toggle-switch">
                    <input
                      id="auto-post"
                      type="checkbox"
                      checked={config.autoPostEnabled}
                      onChange={(e) => setConfig({ ...config, autoPostEnabled: e.target.checked })}
                      disabled={loading}
                    />
                    <span className="meme-toggle-slider"></span>
                  </label>
                </div>
                <p className="meme-hint">
                  When enabled, the bot will automatically post a dark meme every set interval
                </p>
              </div>

              {config.autoPostEnabled && (
                <div className="meme-section">
                  <label htmlFor="interval-input">Auto-Post Interval (hours)</label>
                  <input
                    id="interval-input"
                    type="number"
                    min="1"
                    max="24"
                    value={config.autoPostIntervalHours}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        autoPostIntervalHours: parseInt(e.target.value) || 2,
                      })
                    }
                    disabled={loading}
                  />
                  <p className="meme-hint">
                    How often the bot should automatically post a meme (1-24 hours). Default is 2 hours.
                  </p>
                </div>
              )}
            </>
          )}

          <div className="meme-actions">
            <button
              onClick={handleSaveClick}
              disabled={loading}
              className="meme-button save"
            >
              {loading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </>
      )}

      <div className="meme-info">
        <h3>How it works:</h3>
        <ul>
          <li>Users type <code>!meme</code> in the configured channel to get a dark meme</li>
          <li>Memes are fetched from various dark meme subreddits</li>
          <li>If auto-delete is enabled, all messages in the channel are automatically deleted (except bot messages)</li>
          <li>If auto-posting is enabled, memes are posted automatically at the configured interval</li>
          <li>The channel is not read-only - users can still send messages, but they will be auto-deleted if enabled</li>
        </ul>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Save Configuration"
        message={
          <div>
            <p>Are you sure you want to save this meme configuration?</p>
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
              Server: <strong>{config.guildId || 'Not set'}</strong>
              <br />
              Status: <strong>{config.enabled ? 'Enabled' : 'Disabled'}</strong>
              {config.enabled && config.channelId && (
                <>
                  <br />
                  Channel: <strong>#{channels.find((c) => c.id === config.channelId)?.name || 'Unknown'}</strong>
                </>
              )}
              {config.enabled && (
                <>
                  <br />
                  Auto-Delete: <strong>{config.autoDeleteMessages ? 'Enabled' : 'Disabled'}</strong>
                  <br />
                  Auto-Post: <strong>{config.autoPostEnabled ? `Enabled (every ${config.autoPostIntervalHours} hours)` : 'Disabled'}</strong>
                </>
              )}
            </p>
          </div>
        }
        confirmText="Save"
        cancelText="Cancel"
        onConfirm={handleSave}
        onCancel={() => setShowConfirmDialog(false)}
        variant="default"
      />
    </div>
  )
}

