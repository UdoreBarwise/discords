import { useState, useEffect } from 'react'
import { diceGameService, DiceGameConfig as DiceGameConfigType } from '../../services/diceGameService'
import { discordService, Guild, Channel } from '../../services/discordService'
import { botService } from '../../services/botService'
import { useNotifications } from '../../contexts/NotificationContext'
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog'
import './DiceGameConfig.css'

export default function DiceGameConfig() {
  const { addNotification } = useNotifications()
  const [loading, setLoading] = useState(false)
  const [guilds, setGuilds] = useState<Guild[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const [config, setConfig] = useState<DiceGameConfigType>({
    guildId: '',
    enabled: false,
    channelId: '',
    userCooldownMinutes: 10,
  })

  useEffect(() => {
    loadGuilds()
    loadDefaultServer()
  }, [])

  useEffect(() => {
    if (config.guildId) {
      loadChannels(config.guildId)
      loadConfig(config.guildId)
    }
  }, [config.guildId])

  const loadDefaultServer = async () => {
    try {
      const defaultServerId = await botService.getDefaultServer()
      if (defaultServerId && !config.guildId) {
        setConfig({ ...config, guildId: defaultServerId })
      }
    } catch (error: any) {
      console.error('Failed to load default server:', {
        error,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code,
      })
    }
  }

  const loadGuilds = async () => {
    try {
      const data = await discordService.getGuilds()
      setGuilds(data)
    } catch (error: any) {
      console.error('Failed to load guilds:', {
        error,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code,
        config: error.config?.url,
      })
      
      let errorMessage = 'Failed to fetch Discord servers'
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
        title: 'Failed to Load Guilds',
        message: errorMessage,
      })
    }
  }

  const loadChannels = async (guildId: string) => {
    try {
      const data = await discordService.getChannels(guildId)
      setChannels(data)
    } catch (error: any) {
      console.error('Failed to load channels:', {
        error,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code,
        guildId,
      })
      
      let errorMessage = 'Failed to fetch channels'
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
        title: 'Failed to Load Channels',
        message: errorMessage,
      })
    }
  }

  const loadConfig = async (guildId: string) => {
    try {
      const data = await diceGameService.getConfig(guildId)
      setConfig(data)
    } catch (error: any) {
      console.error('Failed to load config:', {
        error,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code,
        guildId,
      })
    }
  }

  const handleSaveClick = () => {
    if (!config.guildId) {
      addNotification({
        type: 'warning',
        title: 'Missing Selection',
        message: 'Please select a Discord server',
      })
      return
    }

    if (config.enabled && !config.channelId) {
      addNotification({
        type: 'warning',
        title: 'Missing Channel',
        message: 'Please select a channel when enabling the dice game',
      })
      return
    }

    setShowConfirmDialog(true)
  }

  const handleSave = async () => {
    setShowConfirmDialog(false)
    setLoading(true)

    try {
      await diceGameService.saveConfig(config)
      addNotification({
        type: 'success',
        title: 'Configuration Saved',
        message: 'Dice game configuration has been saved successfully',
      })
    } catch (error: any) {
      console.error('Failed to save config:', {
        error,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code,
      })
      
      let errorMessage = 'Failed to save configuration'
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        errorMessage = 'Cannot connect to server. Please check if the backend is running.'
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.message) {
        errorMessage = error.message
      }
      
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: errorMessage,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dice-game-config">
      <div className="dice-game-section">
        <label htmlFor="guild-select">Discord Server</label>
        <select
          id="guild-select"
          value={config.guildId}
          onChange={(e) => setConfig({ ...config, guildId: e.target.value, channelId: '' })}
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
          <div className="dice-game-section">
            <div className="dice-game-toggle-group">
              <label htmlFor="enable-dice-game" className="dice-game-toggle-label">
                Enable Dice Game
              </label>
              <label className="dice-game-toggle-switch">
                <input
                  id="enable-dice-game"
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  disabled={loading}
                />
                <span className="dice-game-toggle-slider"></span>
              </label>
            </div>
            <p className="dice-game-hint">
              When enabled, users can play dice games using the !dice command
            </p>
          </div>

          {config.enabled && (
            <>
              <div className="dice-game-section">
                <label htmlFor="channel-select">Channel (Optional)</label>
                <select
                  id="channel-select"
                  value={config.channelId || ''}
                  onChange={(e) => setConfig({ ...config, channelId: e.target.value || undefined })}
                  disabled={loading}
                >
                  <option value="">Any channel (no restriction)</option>
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      #{channel.name}
                    </option>
                  ))}
                </select>
                <p className="dice-game-hint">
                  If set, dice game can only be played in this channel. Leave empty to allow any channel.
                </p>
              </div>

              <div className="dice-game-section">
                <label htmlFor="cooldown-input">User Cooldown (minutes)</label>
                <input
                  id="cooldown-input"
                  type="number"
                  min="1"
                  max="1440"
                  value={config.userCooldownMinutes}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      userCooldownMinutes: parseInt(e.target.value) || 10,
                    })
                  }
                  disabled={loading}
                />
                <p className="dice-game-hint">
                  How long users must wait between games (1-1440 minutes)
                </p>
              </div>
            </>
          )}

          <div className="dice-game-actions">
            <button
              onClick={handleSaveClick}
              disabled={loading}
              className="dice-game-button save"
            >
              {loading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </>
      )}

      <div className="dice-game-info">
        <h3>How it works:</h3>
        <ul>
          <li>Users type <code>!dice</code> in Discord to start a game</li>
          <li>The game uses 2 dice (2d6) - each player rolls both dice</li>
          <li>Players choose who goes first (user or bot)</li>
          <li>Game consists of 3 rounds</li>
          <li>Highest total score wins!</li>
          <li>Users must wait for the cooldown period before playing again</li>
        </ul>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Save Configuration"
        message={
          <div>
            <p>Are you sure you want to save this dice game configuration?</p>
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
              Server: <strong>{guilds.find((g) => g.id === config.guildId)?.name || 'Unknown'}</strong>
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
                  Cooldown: <strong>{config.userCooldownMinutes} minutes</strong>
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

