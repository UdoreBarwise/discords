import { useState, useEffect } from 'react'
import { xNotificationService, XNotificationConfig, XAccount } from '../../services/xNotificationService'
import { discordService, Channel } from '../../services/discordService'
import { useNotifications } from '../../contexts/NotificationContext'
import { useServer } from '../../contexts/ServerContext'
import { Link } from 'react-router-dom'
import './XNotificationConfig.css'

export default function XNotificationConfigComponent() {
  const { addNotification } = useNotifications()
  const { selectedServerId, isLoading: serverLoading } = useServer()
  const [loading, setLoading] = useState(false)
  const [channels, setChannels] = useState<Channel[]>([])
  const [xAccounts, setXAccounts] = useState<XAccount[]>([])
  const [newAccountInput, setNewAccountInput] = useState('')
  const [addingAccount, setAddingAccount] = useState(false)
  const [creatingChannel, setCreatingChannel] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [showCreateChannelInput, setShowCreateChannelInput] = useState(false)
  const [testAccountInput, setTestAccountInput] = useState('')
  const [testAccountSelect, setTestAccountSelect] = useState('')
  const [fetchingTweet, setFetchingTweet] = useState(false)
  const [latestTweet, setLatestTweet] = useState<any>(null)

  const [config, setConfig] = useState<XNotificationConfig>({
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
      const configData = await xNotificationService.getConfig(guildId)
      setConfig(configData)
      const accountsData = await xNotificationService.getAccounts(guildId)
      setXAccounts(accountsData)
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
      await xNotificationService.saveConfig(config)
      addNotification({
        type: 'success',
        title: 'Config Saved',
        message: 'X notification configuration saved successfully',
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

  const handleAddAccount = async () => {
    if (!newAccountInput.trim()) {
      addNotification({
        type: 'warning',
        title: 'Invalid Input',
        message: 'Please enter an X username or URL',
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

    setAddingAccount(true)
    try {
      const account = await xNotificationService.addAccount(config.guildId, newAccountInput.trim())
      setXAccounts([...xAccounts, account])
      setNewAccountInput('')
      addNotification({
        type: 'success',
        title: 'Account Added',
        message: `X account "@${account.xUsername}" added successfully`,
      })
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Add Account',
        message: error.response?.data?.error || 'Failed to add X account',
      })
    } finally {
      setAddingAccount(false)
    }
  }

  const handleRemoveAccount = async (xUsername: string) => {
    if (!config.guildId) return

    try {
      await xNotificationService.removeAccount(config.guildId, xUsername)
      setXAccounts(xAccounts.filter((acc) => acc.xUsername !== xUsername))
      addNotification({
        type: 'success',
        title: 'Account Removed',
        message: 'X account removed successfully',
      })
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Remove Account',
        message: error.response?.data?.error || 'Failed to remove X account',
      })
    }
  }

  const handleTestNotification = async (xUsername: string) => {
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
      await xNotificationService.testNotification(config.guildId, xUsername)
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
        message: `Channel "${newChannel.name}" created successfully`,
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

  const handleGetLatestTweet = async () => {
    const username = testAccountSelect || testAccountInput.trim()
    if (!username) {
      addNotification({
        type: 'warning',
        title: 'Invalid Input',
        message: 'Please select an account or enter a username',
      })
      return
    }

    setFetchingTweet(true)
    setLatestTweet(null)
    try {
      const tweet = await xNotificationService.getLatestTweet(username)
      setLatestTweet(tweet)
      addNotification({
        type: 'success',
        title: 'Tweet Fetched',
        message: `Latest tweet from @${tweet.author} retrieved successfully`,
      })
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Fetch Tweet',
        message: error.response?.data?.error || 'Failed to get latest tweet',
      })
    } finally {
      setFetchingTweet(false)
    }
  }

  return (
    <div className="x-notification-config">
      <div className="config-section">
        <h2>Server Configuration</h2>
        {!selectedServerId ? (
          <div className="server-warning">
            <p>No default server is set. Please set a default server in{' '}
              <Link to="/settings?tab=token">Settings</Link> to configure X notifications.
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
              <div className="x-toggle-group">
                <label htmlFor="enable-x-notifications" className="x-toggle-label">
                  Enable X Notifications
                </label>
                <label className="x-toggle-switch">
                  <input
                    id="enable-x-notifications"
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                    disabled={loading}
                  />
                  <span className="x-toggle-slider"></span>
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
                    <option value="__create__">+ Create New Channel</option>
                    {channels
                      .filter((ch) => ch.type === 0)
                      .map((channel) => (
                        <option key={channel.id} value={channel.id}>
                          #{channel.name}
                        </option>
                      ))}
                  </select>
                  {showCreateChannelInput && (
                    <div className="create-channel-input">
                      <input
                        type="text"
                        placeholder="Channel name"
                        value={newChannelName}
                        onChange={(e) => setNewChannelName(e.target.value)}
                        disabled={creatingChannel}
                      />
                      <button
                        onClick={handleCreateChannel}
                        disabled={creatingChannel || !newChannelName.trim()}
                        className="btn btn-primary"
                      >
                        {creatingChannel ? 'Creating...' : 'Create'}
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateChannelInput(false)
                          setNewChannelName('')
                        }}
                        className="btn btn-secondary"
                        disabled={creatingChannel}
                      >
                        Cancel
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
                  <small>How often to check for new tweets (1-1440 minutes)</small>
                </div>

                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="btn btn-primary save-btn"
                >
                  {loading ? 'Saving...' : 'Save Configuration'}
                </button>
              </>
            )}
          </div>

          <div className="config-section">
            <h2>X Accounts</h2>
            <p className="section-description">
              Add X (Twitter) accounts to monitor. You can use usernames (e.g., @elonmusk or elonmusk) or full URLs (e.g., https://x.com/elonmusk).
            </p>

            <div className="add-account-form">
              <input
                type="text"
                placeholder="@username or x.com/username"
                value={newAccountInput}
                onChange={(e) => setNewAccountInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddAccount()}
                disabled={addingAccount || loading}
              />
              <button
                onClick={handleAddAccount}
                disabled={addingAccount || loading || !newAccountInput.trim()}
                className="btn btn-primary"
              >
                {addingAccount ? 'Adding...' : 'Add Account'}
              </button>
            </div>

            {xAccounts.length > 0 && (
              <div className="accounts-list">
                {xAccounts.map((account) => (
                  <div key={account.id} className="account-item">
                    <div className="account-info">
                      <strong>@{account.xUsername}</strong>
                      {account.xDisplayName && (
                        <span className="account-display-name">{account.xDisplayName}</span>
                      )}
                      {account.lastCheckedAt && (
                        <small className="last-checked">
                          Last checked: {new Date(account.lastCheckedAt).toLocaleString()}
                        </small>
                      )}
                    </div>
                    <div className="account-actions">
                      <button
                        onClick={() => handleTestNotification(account.xUsername)}
                        disabled={loading}
                        className="btn btn-secondary btn-sm"
                      >
                        Test
                      </button>
                      <button
                        onClick={() => handleRemoveAccount(account.xUsername)}
                        disabled={loading}
                        className="btn btn-danger btn-sm"
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
            <h2>Test & Preview</h2>
            <p className="section-description">
              Test the notification system or preview the latest tweet from an account.
            </p>

            <div className="test-form">
              <div className="test-input-group">
                <select
                  value={testAccountSelect}
                  onChange={(e) => {
                    setTestAccountSelect(e.target.value)
                    if (e.target.value) setTestAccountInput('')
                  }}
                  disabled={fetchingTweet}
                >
                  <option value="">Select from added accounts...</option>
                  {xAccounts.map((account) => (
                    <option key={account.id} value={account.xUsername}>
                      @{account.xUsername}
                    </option>
                  ))}
                </select>
                <span className="test-or">or</span>
                <input
                  type="text"
                  placeholder="@username or x.com/username"
                  value={testAccountInput}
                  onChange={(e) => {
                    setTestAccountInput(e.target.value)
                    if (e.target.value) setTestAccountSelect('')
                  }}
                  disabled={fetchingTweet || !!testAccountSelect}
                />
              </div>
              <button
                onClick={handleGetLatestTweet}
                disabled={fetchingTweet || (!testAccountSelect && !testAccountInput.trim())}
                className="btn btn-primary"
              >
                {fetchingTweet ? 'Fetching...' : 'Get Latest Tweet'}
              </button>
            </div>

            {latestTweet && (
              <div className="tweet-preview">
                <h3>Latest Tweet Preview</h3>
                <div className="tweet-content">
                  <div className="tweet-header">
                    <strong>@{latestTweet.author}</strong>
                    <span className="tweet-date">
                      {new Date(latestTweet.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="tweet-text">{latestTweet.text}</p>
                  <a
                    href={latestTweet.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tweet-link"
                  >
                    View on X →
                  </a>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}


