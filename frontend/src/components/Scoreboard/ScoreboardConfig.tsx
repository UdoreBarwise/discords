import { useState, useEffect } from 'react'
import { scoreboardConfigService, ScoreboardConfig as ScoreboardConfigType } from '../../services/scoreboardConfigService'
import { discordService, Guild, Channel } from '../../services/discordService'
import { botService } from '../../services/botService'
import { useNotifications } from '../../contexts/NotificationContext'
import './ScoreboardConfig.css'

export default function ScoreboardConfig() {
  const { addNotification } = useNotifications()
  const [loading, setLoading] = useState(false)
  const [guilds, setGuilds] = useState<Guild[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [saving, setSaving] = useState(false)

  const [config, setConfig] = useState<ScoreboardConfigType>({
    guildId: '',
    enabled: false,
    channelId: '',
    updateIntervalMinutes: 5,
    gameType: 'all',
    limitPlayers: 10,
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
      console.error('Failed to load default server:', error)
    }
  }

  const loadGuilds = async () => {
    try {
      const data = await discordService.getGuilds()
      setGuilds(data)
    } catch (error: any) {
      addNotification('error', `Failed to load servers: ${error.message}`)
    }
  }

  const loadChannels = async (guildId: string) => {
    try {
      const data = await discordService.getChannels(guildId)
      setChannels(data.filter((c) => c.type === 0)) // Only text channels
    } catch (error: any) {
      addNotification('error', `Failed to load channels: ${error.message}`)
    }
  }

  const loadConfig = async (guildId: string) => {
    try {
      setLoading(true)
      const data = await scoreboardConfigService.getConfig(guildId)
      setConfig(data)
    } catch (error: any) {
      addNotification('error', `Failed to load scoreboard config: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!config.guildId) {
      addNotification('error', 'Please select a server')
      return
    }

    if (config.enabled && !config.channelId) {
      addNotification('error', 'Please select a channel when enabling scoreboard')
      return
    }

    try {
      setSaving(true)
      await scoreboardConfigService.saveConfig(config)
      addNotification('success', 'Scoreboard configuration saved successfully')
    } catch (error: any) {
      addNotification('error', `Failed to save scoreboard config: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="scoreboard-config">
      <div className="scoreboard-config-header">
        <h2>Scoreboard Configuration</h2>
        <p>Configure the leaderboard channel and auto-update settings</p>
      </div>

      <div className="scoreboard-config-form">
        <div className="form-group">
          <label htmlFor="guild-select">Server</label>
          <select
            id="guild-select"
            value={config.guildId}
            onChange={(e) => setConfig({ ...config, guildId: e.target.value })}
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

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
            />
            Enable Scoreboard
          </label>
          <p className="form-hint">Enable automatic leaderboard updates in a channel</p>
        </div>

        {config.enabled && (
          <>
            <div className="form-group">
              <label htmlFor="channel-select">Leaderboard Channel</label>
              <select
                id="channel-select"
                value={config.channelId || ''}
                onChange={(e) => setConfig({ ...config, channelId: e.target.value })}
                disabled={loading || !config.guildId}
              >
                <option value="">Select a channel</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    #{channel.name}
                  </option>
                ))}
              </select>
              <p className="form-hint">The channel where the leaderboard will be posted and updated</p>
            </div>

            <div className="form-group">
              <label htmlFor="update-interval">Update Interval (minutes)</label>
              <input
                id="update-interval"
                type="number"
                min="1"
                max="60"
                value={config.updateIntervalMinutes}
                onChange={(e) =>
                  setConfig({ ...config, updateIntervalMinutes: parseInt(e.target.value) || 5 })
                }
              />
              <p className="form-hint">How often the leaderboard should be updated (1-60 minutes)</p>
            </div>

            <div className="form-group">
              <label htmlFor="game-type">Game Type</label>
              <select
                id="game-type"
                value={config.gameType}
                onChange={(e) =>
                  setConfig({ ...config, gameType: e.target.value as 'all' | 'dice' | 'wordle' })
                }
              >
                <option value="all">All Games</option>
                <option value="dice">Dice Game Only</option>
                <option value="wordle">Wordle Only</option>
              </select>
              <p className="form-hint">Which game types to include in the leaderboard</p>
            </div>

            <div className="form-group">
              <label htmlFor="limit-players">Number of Players to Show</label>
              <input
                id="limit-players"
                type="number"
                min="1"
                max="50"
                value={config.limitPlayers}
                onChange={(e) =>
                  setConfig({ ...config, limitPlayers: parseInt(e.target.value) || 10 })
                }
              />
              <p className="form-hint">How many top players to display (1-50)</p>
            </div>
          </>
        )}

        <div className="form-actions">
          <button
            onClick={handleSave}
            disabled={loading || saving || !config.guildId}
            className="btn-primary"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  )
}

