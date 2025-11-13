import { useState, useEffect } from 'react'
import { youtubeNotificationService, YouTubeNotificationConfig, YouTubeChannel } from '../../services/youtubeNotificationService'
import { discordService, Channel } from '../../services/discordService'
import { useNotifications } from '../../contexts/NotificationContext'
import { useServer } from '../../contexts/ServerContext'
import { Link } from 'react-router-dom'
import './YouTubeNotificationConfig.css'

export default function YouTubeNotificationConfigComponent() {
  const { addNotification } = useNotifications()
  const { selectedServerId, isLoading: serverLoading } = useServer()
  const [loading, setLoading] = useState(false)
  const [channels, setChannels] = useState<Channel[]>([])
  const [youtubeChannels, setYoutubeChannels] = useState<YouTubeChannel[]>([])
  const [newChannelInput, setNewChannelInput] = useState('')
  const [addingChannel, setAddingChannel] = useState(false)
  const [creatingChannel, setCreatingChannel] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [showCreateChannelInput, setShowCreateChannelInput] = useState(false)
  const [testChannelInput, setTestChannelInput] = useState('')
  const [testChannelSelect, setTestChannelSelect] = useState('')
  const [fetchingVideo, setFetchingVideo] = useState(false)
  const [latestVideo, setLatestVideo] = useState<any>(null)

  const [config, setConfig] = useState<YouTubeNotificationConfig>({
    guildId: '',
    enabled: false,
    channelId: null,
    checkIntervalMinutes: 10,
  })

  useEffect(() => {
    if (selectedServerId && !config.guildId) {
      setConfig((prev) => ({ ...prev, guildId: selectedServerId }))
    }
  }, [selectedServerId])

  useEffect(() => {
    if (config.guildId) {
      loadGuildData(config.guildId)
      loadConfig(config.guildId)
    }
  }, [config.guildId])

  const loadGuildData = async (guildId: string) => {
    try {
      const channelsData = await discordService.getChannels(guildId)
      setChannels(channelsData)
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Load Channels',
        message: error.response?.data?.error || 'Failed to fetch channels',
      })
    }
  }

  const loadConfig = async (guildId: string) => {
    try {
      const configData = await youtubeNotificationService.getConfig(guildId)
      setConfig(configData)
      const channelsData = await youtubeNotificationService.getChannels(guildId)
      setYoutubeChannels(channelsData)
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Load Config',
        message: error.response?.data?.error || 'Failed to load configuration',
      })
    }
  }

  const handleSave = async () => {
    if (!selectedServerId) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please set a default server in settings',
      })
      return
    }

    if (config.enabled && !config.channelId) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please select a Discord channel for notifications',
      })
      return
    }

    setLoading(true)
    try {
      await youtubeNotificationService.saveConfig(config)
      addNotification({
        type: 'success',
        title: 'Config Saved',
        message: 'YouTube notification configuration saved successfully',
      })
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Save',
        message: error.response?.data?.error || 'Failed to save configuration',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddChannel = async () => {
    if (!newChannelInput.trim()) {
      addNotification({
        type: 'warning',
        title: 'Invalid Input',
        message: 'Please enter a YouTube channel ID or URL',
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

    setAddingChannel(true)
    try {
      const channel = await youtubeNotificationService.addChannel(config.guildId, newChannelInput.trim())
      setYoutubeChannels([...youtubeChannels, channel])
      setNewChannelInput('')
      addNotification({
        type: 'success',
        title: 'Channel Added',
        message: `YouTube channel "${channel.youtubeChannelName || channel.youtubeChannelId}" added successfully`,
      })
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Add Channel',
        message: error.response?.data?.error || 'Failed to add YouTube channel',
      })
    } finally {
      setAddingChannel(false)
    }
  }

  const handleRemoveChannel = async (youtubeChannelId: string) => {
    if (!config.guildId) return

    try {
      await youtubeNotificationService.removeChannel(config.guildId, youtubeChannelId)
      setYoutubeChannels(youtubeChannels.filter((ch) => ch.youtubeChannelId !== youtubeChannelId))
      addNotification({
        type: 'success',
        title: 'Channel Removed',
        message: 'YouTube channel removed successfully',
      })
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Remove Channel',
        message: error.response?.data?.error || 'Failed to remove YouTube channel',
      })
    }
  }

  const handleTestNotification = async (youtubeChannelId: string) => {
    if (!config.guildId) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please set a default server in settings',
      })
      return
    }

    setLoading(true)
    try {
      await youtubeNotificationService.testNotification(config.guildId, youtubeChannelId)
      addNotification({
        type: 'success',
        title: 'Test Notification Sent',
        message: 'Check your Discord channel for the test notification',
      })
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Test Failed',
        message: error.response?.data?.error || 'Failed to send test notification',
      })
    } finally {
      setLoading(false)
    }
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
      await loadGuildData(config.guildId)
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

  const handleChannelSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === '__create__') {
      setShowCreateChannelInput(true)
      setNewChannelName('')
      return
    }
    setShowCreateChannelInput(false)
    setConfig({ ...config, channelId: e.target.value || null })
  }

  const handleGetLatestVideo = async () => {
    const channelId = testChannelSelect || testChannelInput.trim()
    if (!channelId) {
      addNotification({
        type: 'warning',
        title: 'Invalid Input',
        message: 'Please select a channel or enter a channel ID/URL',
      })
      return
    }

    setFetchingVideo(true)
    setLatestVideo(null)
    try {
      const video = await youtubeNotificationService.getLatestVideo(channelId)
      setLatestVideo(video)
      addNotification({
        type: 'success',
        title: 'Video Fetched',
        message: `Latest video from ${video.channelTitle} retrieved successfully`,
      })
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Fetch Video',
        message: error.response?.data?.error || 'Failed to get latest video',
      })
    } finally {
      setFetchingVideo(false)
    }
  }

  return (
    <div className="youtube-notification-config">
      <div className="config-section">
        <h2>Server Configuration</h2>
        {!selectedServerId ? (
          <div className="server-warning">
            <p>No default server is set. Please set a default server in{' '}
              <Link to="/settings?tab=token">Settings</Link> to configure YouTube notifications.
            </p>
          </div>
        ) : (
          <div className="form-group">
            <label>Current Server</label>
            <div className="server-display">
              <strong>Server ID: {selectedServerId}</strong>
              <Link to="/settings?tab=token" className="change-server-link">
                Change in Settings
              </Link>
            </div>
          </div>
        )}
      </div>

      {selectedServerId && (
        <>
          <div className="config-section">
            <h2>Notification Settings</h2>
            <div className="form-group">
              <div className="youtube-toggle-group">
                <label htmlFor="enable-youtube-notifications" className="youtube-toggle-label">
                  Enable YouTube Notifications
                </label>
                <label className="youtube-toggle-switch">
                  <input
                    id="enable-youtube-notifications"
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                    disabled={loading}
                  />
                  <span className="youtube-toggle-slider"></span>
                </label>
              </div>
            </div>

            {config.enabled && (
              <>
                <div className="form-group">
                  <label htmlFor="discord-channel">Discord Channel</label>
                  <select
                    id="discord-channel"
                    value={showCreateChannelInput ? '__create__' : (config.channelId || '')}
                    onChange={handleChannelSelectChange}
                    disabled={loading}
                  >
                    <option value="">Select a channel...</option>
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
                        className="button-primary"
                        style={{ padding: '0.75rem 1.5rem' }}
                      >
                        {creatingChannel ? 'Creating...' : 'Create'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="check-interval">Check Interval (minutes)</label>
                  <input
                    id="check-interval"
                    type="number"
                    min="1"
                    max="1440"
                    value={config.checkIntervalMinutes}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        checkIntervalMinutes: parseInt(e.target.value) || 10,
                      })
                    }
                    disabled={loading}
                  />
                  <p className="form-help">
                    How often to check for new videos (1-1440 minutes). Default: 10 minutes.
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="config-section">
            <h2>YouTube Channels</h2>
            <p className="form-help">
              Add YouTube channels to monitor. You can use channel IDs (e.g., UC...), custom URLs (e.g., @channelname),
              or full YouTube URLs.
            </p>

            <div className="form-group">
              <label htmlFor="new-channel">Add YouTube Channel</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  id="new-channel"
                  type="text"
                  value={newChannelInput}
                  onChange={(e) => setNewChannelInput(e.target.value)}
                  placeholder="Channel ID, @handle, or YouTube URL"
                  disabled={loading || addingChannel}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddChannel()
                    }
                  }}
                />
                <button
                  onClick={handleAddChannel}
                  disabled={loading || addingChannel || !newChannelInput.trim()}
                  className="button-primary"
                >
                  {addingChannel ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>

            {youtubeChannels.length > 0 && (
              <div className="youtube-channels-list">
                <h3>Monitored Channels ({youtubeChannels.length})</h3>
                {youtubeChannels.map((channel) => (
                  <div key={channel.id} className="youtube-channel-item">
                    <div className="channel-info">
                      <strong>{channel.youtubeChannelName || channel.youtubeChannelId}</strong>
                      <span className="channel-id">{channel.youtubeChannelId}</span>
                      {channel.lastCheckedAt && (
                        <span className="last-checked">
                          Last checked: {new Date(channel.lastCheckedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="channel-actions">
                      <button
                        onClick={() => handleTestNotification(channel.youtubeChannelId)}
                        disabled={loading || !config.enabled || !config.channelId}
                        className="button-secondary"
                        title="Send a test notification"
                      >
                        Test
                      </button>
                      <button
                        onClick={() => handleRemoveChannel(channel.youtubeChannelId)}
                        disabled={loading}
                        className="button-danger"
                        title="Remove channel"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="config-section">
            <h2>Test Latest Video</h2>
            <p className="form-help">
              Select a channel or enter a channel ID/URL to fetch and preview the latest video without sending a notification.
            </p>

            <div className="form-group">
              <label htmlFor="test-channel-select">Select from Monitored Channels</label>
              <select
                id="test-channel-select"
                value={testChannelSelect}
                onChange={(e) => {
                  setTestChannelSelect(e.target.value)
                  setTestChannelInput('')
                }}
                disabled={loading || fetchingVideo || youtubeChannels.length === 0}
              >
                <option value="">Select a channel...</option>
                {youtubeChannels.map((channel) => (
                  <option key={channel.id} value={channel.youtubeChannelId}>
                    {channel.youtubeChannelName || channel.youtubeChannelId}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="test-channel-input">Or Enter Channel ID/URL</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  id="test-channel-input"
                  type="text"
                  value={testChannelInput}
                  onChange={(e) => {
                    setTestChannelInput(e.target.value)
                    setTestChannelSelect('')
                  }}
                  placeholder="Channel ID, @handle, or YouTube URL"
                  disabled={loading || fetchingVideo}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleGetLatestVideo()
                    }
                  }}
                />
                <button
                  onClick={handleGetLatestVideo}
                  disabled={loading || fetchingVideo || (!testChannelSelect && !testChannelInput.trim())}
                  className="button-primary"
                >
                  {fetchingVideo ? 'Fetching...' : 'Get Latest Video'}
                </button>
              </div>
            </div>

            {latestVideo && (
              <div className="latest-video-preview">
                <h3>Latest Video Preview</h3>
                <div className="video-card">
                  <div className="video-thumbnail">
                    <img src={latestVideo.thumbnail} alt={latestVideo.title} />
                  </div>
                  <div className="video-info">
                    <h4>
                      <a href={latestVideo.url} target="_blank" rel="noopener noreferrer">
                        {latestVideo.title}
                      </a>
                    </h4>
                    <p className="video-channel">{latestVideo.channelTitle}</p>
                    <p className="video-meta">
                      Published: {latestVideo.publishedAtFormatted} • Duration: {latestVideo.duration}
                    </p>
                    {latestVideo.description && (
                      <p className="video-description">{latestVideo.description}</p>
                    )}
                    <div className="video-actions">
                      <a
                        href={latestVideo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="button-secondary"
                        style={{ textDecoration: 'none', display: 'inline-block' }}
                      >
                        Watch on YouTube
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="config-actions">
            <button
              onClick={handleSave}
              disabled={loading}
              className="button-primary"
            >
              {loading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

