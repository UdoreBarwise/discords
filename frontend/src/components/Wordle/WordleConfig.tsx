import { useState, useEffect } from 'react'
import { wordleService, WordleConfig as WordleConfigType } from '../../services/wordleService'
import { discordService, Guild, Channel, Role, Member } from '../../services/discordService'
import { botService } from '../../services/botService'
import { useNotifications } from '../../contexts/NotificationContext'
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog'
import './WordleConfig.css'

export default function WordleConfig() {
  const { addNotification } = useNotifications()
  const [loading, setLoading] = useState(false)
  const [guilds, setGuilds] = useState<Guild[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const [config, setConfig] = useState<WordleConfigType>({
    guildId: '',
    enabled: false,
    channelId: '',
    allowedRoleIds: [],
    allowedUserIds: [],
    dmOnly: false,
    userCooldownMinutes: 60,
  })

  useEffect(() => {
    loadGuilds()
    loadDefaultServer()
  }, [])

  useEffect(() => {
    if (config.guildId) {
      loadChannels(config.guildId)
      loadRoles(config.guildId)
      loadMembers(config.guildId)
      loadConfig(config.guildId)
    }
  }, [config.guildId])

  useEffect(() => {
    if (config.guildId && memberSearch) {
      const timeout = setTimeout(() => {
        searchMembers(config.guildId!, memberSearch)
      }, 300)
      return () => clearTimeout(timeout)
    } else if (config.guildId && !memberSearch) {
      searchMembers(config.guildId, '')
    }
  }, [memberSearch, config.guildId])

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

  const loadChannels = async (guildId: string) => {
    try {
      const data = await discordService.getChannels(guildId)
      setChannels(data)
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Load Channels',
        message: error.response?.data?.error || 'Failed to fetch channels',
      })
    }
  }

  const loadRoles = async (guildId: string) => {
    try {
      const data = await discordService.getRoles(guildId)
      setRoles(data)
    } catch (error: any) {
      console.error('Failed to load roles:', error)
    }
  }

  const loadMembers = async (guildId: string) => {
    try {
      const data = await discordService.getMembers(guildId)
      setMembers(data)
    } catch (error: any) {
      console.error('Failed to load members:', error)
    }
  }

  const searchMembers = async (guildId: string, query: string) => {
    try {
      const data = await discordService.getMembers(guildId, query)
      setMembers(data)
    } catch (error) {
      console.error('Failed to search members:', error)
    }
  }

  const loadConfig = async (guildId: string) => {
    try {
      const data = await wordleService.getConfig(guildId)
      setConfig(data)
    } catch (error: any) {
      console.error('Failed to load config:', error)
    }
  }

  const toggleRole = (roleId: string) => {
    const current = config.allowedRoleIds || []
    if (current.includes(roleId)) {
      setConfig({
        ...config,
        allowedRoleIds: current.filter((id) => id !== roleId),
      })
    } else {
      setConfig({
        ...config,
        allowedRoleIds: [...current, roleId],
      })
    }
  }

  const toggleUser = (userId: string) => {
    const current = config.allowedUserIds || []
    if (current.includes(userId)) {
      setConfig({
        ...config,
        allowedUserIds: current.filter((id) => id !== userId),
      })
    } else {
      setConfig({
        ...config,
        allowedUserIds: [...current, userId],
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

    if (config.enabled && !config.channelId && !config.dmOnly) {
      addNotification({
        type: 'warning',
        title: 'Missing Configuration',
        message: 'Please select a channel or enable DM-only mode when enabling Wordle',
      })
      return
    }

    setShowConfirmDialog(true)
  }

  const handleSave = async () => {
    setShowConfirmDialog(false)
    setLoading(true)

    try {
      await wordleService.saveConfig(config)
      addNotification({
        type: 'success',
        title: 'Configuration Saved',
        message: 'Wordle configuration has been saved successfully',
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
    <div className="wordle-config">
      <div className="wordle-section">
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
          <div className="wordle-section">
            <div className="wordle-toggle-group">
              <label htmlFor="enable-wordle" className="wordle-toggle-label">
                Enable Wordle
              </label>
              <label className="wordle-toggle-switch">
                <input
                  id="enable-wordle"
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  disabled={loading}
                />
                <span className="wordle-toggle-slider"></span>
              </label>
            </div>
            <p className="wordle-hint">
              When enabled, users can play Wordle using the !wordle command
            </p>
          </div>

          {config.enabled && (
            <>
              <div className="wordle-section">
                <div className="wordle-toggle-group">
                  <label htmlFor="dm-only" className="wordle-toggle-label">
                    DM Only Mode
                  </label>
                  <label className="wordle-toggle-switch">
                    <input
                      id="dm-only"
                      type="checkbox"
                      checked={config.dmOnly}
                      onChange={(e) => setConfig({ ...config, dmOnly: e.target.checked })}
                      disabled={loading}
                    />
                    <span className="wordle-toggle-slider"></span>
                  </label>
                </div>
                <p className="wordle-hint">
                  If enabled, Wordle games will only be played in DMs. Channel selection will be ignored.
                </p>
              </div>

              {!config.dmOnly && (
                <div className="wordle-section">
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
                  <p className="wordle-hint">
                    If set, Wordle can only be played in this channel. Leave empty to allow any channel.
                  </p>
                </div>
              )}

              <div className="wordle-section">
                <label>Allowed Roles (Optional)</label>
                <p className="wordle-hint">
                  If roles are selected, only users with these roles can play. Leave empty to allow all users.
                </p>
                <div className="wordle-multiselect">
                  {roles.map((role) => {
                    const isSelected = config.allowedRoleIds?.includes(role.id)
                    return (
                      <button
                        key={role.id}
                        type="button"
                        className={`wordle-tag ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleRole(role.id)}
                        style={{
                          borderLeftColor: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : undefined,
                        }}
                      >
                        {role.name} ({role.memberCount})
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="wordle-section">
                <label>Allowed Users (Optional)</label>
                <p className="wordle-hint">
                  If users are selected, only these users can play. Leave empty to allow all users.
                </p>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="wordle-search"
                />
                <div className="wordle-multiselect">
                  {members.map((member) => {
                    const isSelected = config.allowedUserIds?.includes(member.id)
                    return (
                      <button
                        key={member.id}
                        type="button"
                        className={`wordle-tag ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleUser(member.id)}
                      >
                        {member.displayName} ({member.username})
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="wordle-section">
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
                      userCooldownMinutes: parseInt(e.target.value) || 60,
                    })
                  }
                  disabled={loading}
                />
                <p className="wordle-hint">
                  How long users must wait between games (1-1440 minutes)
                </p>
              </div>
            </>
          )}

          <div className="wordle-actions">
            <button
              onClick={handleSaveClick}
              disabled={loading}
              className="wordle-button save"
            >
              {loading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </>
      )}

      <div className="wordle-info">
        <h3>How it works:</h3>
        <ul>
          <li>Users type <code>!wordle</code> in Discord to start a game</li>
          <li>Players have 6 guesses to find the 5-letter word</li>
          <li>After each guess, players get feedback on which letters are correct</li>
          <li>Green indicates correct letter in correct position</li>
          <li>Yellow indicates correct letter in wrong position</li>
          <li>Gray indicates letter is not in the word</li>
          <li>Users must wait for the cooldown period before playing again</li>
        </ul>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Save Configuration"
        message={
          <div>
            <p>Are you sure you want to save this Wordle configuration?</p>
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
              Server: <strong>{guilds.find((g) => g.id === config.guildId)?.name || 'Unknown'}</strong>
              <br />
              Status: <strong>{config.enabled ? 'Enabled' : 'Disabled'}</strong>
              {config.enabled && (
                <>
                  <br />
                  DM Only: <strong>{config.dmOnly ? 'Yes' : 'No'}</strong>
                  {!config.dmOnly && config.channelId && (
                    <>
                      <br />
                      Channel: <strong>#{channels.find((c) => c.id === config.channelId)?.name || 'Unknown'}</strong>
                    </>
                  )}
                  <br />
                  Cooldown: <strong>{config.userCooldownMinutes} minutes</strong>
                  {config.allowedRoleIds && config.allowedRoleIds.length > 0 && (
                    <>
                      <br />
                      Allowed Roles: <strong>{config.allowedRoleIds.length}</strong>
                    </>
                  )}
                  {config.allowedUserIds && config.allowedUserIds.length > 0 && (
                    <>
                      <br />
                      Allowed Users: <strong>{config.allowedUserIds.length}</strong>
                    </>
                  )}
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

