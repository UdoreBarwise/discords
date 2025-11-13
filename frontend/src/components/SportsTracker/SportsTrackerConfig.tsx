import { useState, useEffect } from 'react'
import { sportsService, type SportsConfig, type SportType } from '../../services/sportsService'
import { discordService, type Channel, type Role, type Member } from '../../services/discordService'
import { useNotifications } from '../../contexts/NotificationContext'
import { useServer } from '../../contexts/ServerContext'
import './SportsTrackerConfig.css'

export default function SportsTrackerConfig() {
  const { addNotification } = useNotifications()
  const { selectedServerId, isLoading: serverLoading } = useServer()
  const [loading, setLoading] = useState(false)
  const [channels, setChannels] = useState<Channel[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedSport, setSelectedSport] = useState<SportType>('f1')
  const [showCreateChannelInput, setShowCreateChannelInput] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [creatingChannel, setCreatingChannel] = useState(false)
  const [config, setConfig] = useState<Partial<SportsConfig>>({
    guildId: '',
    enabled: false,
    sportType: 'f1',
    channelIds: null,
    allowedRoleIds: null,
    blockedUserIds: null,
    roleListType: null,
    dataTypes: [],
    updateIntervalMinutes: 5,
    mentionRoleId: null,
  })

  useEffect(() => {
    if (selectedServerId) {
      setConfig((prev) => ({ ...prev, guildId: selectedServerId }))
      loadGuildData(selectedServerId)
      loadConfig(selectedServerId, selectedSport)
    }
  }, [selectedServerId, selectedSport])

  const loadGuildData = async (guildId: string) => {
    try {
      const [channelsData, rolesData, membersData] = await Promise.all([
        discordService.getChannels(guildId),
        discordService.getRoles(guildId),
        discordService.getMembers(guildId).catch(() => []),
      ])
      setChannels(channelsData)
      setRoles(rolesData)
      setMembers(membersData)
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Load Guild Data',
        message: error.response?.data?.error || 'Failed to fetch guild data',
      })
    }
  }

  const loadConfig = async (guildId: string, sportType: SportType) => {
    try {
      const existingConfig = await sportsService.getConfig(guildId, sportType)
      if (existingConfig) {
        setConfig(existingConfig)
      } else {
        setConfig({
          guildId,
          enabled: false,
          sportType,
          channelIds: null,
          allowedRoleIds: null,
          blockedUserIds: null,
          roleListType: null,
          dataTypes: [],
          updateIntervalMinutes: 5,
          mentionRoleId: null,
        })
      }
    } catch (error: any) {
      setConfig({
        guildId,
        enabled: false,
        sportType,
        channelIds: null,
        allowedRoleIds: null,
        blockedUserIds: null,
        roleListType: null,
        dataTypes: [],
        updateIntervalMinutes: 5,
        mentionRoleId: null,
      })
    }
  }

  const handleChannelSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const channelId = e.target.value
    if (channelId === '__create__') {
      setShowCreateChannelInput(true)
      setNewChannelName('')
      return
    }
    setShowCreateChannelInput(false)
    const currentChannels = config.channelIds || []
    if (channelId && !currentChannels.includes(channelId)) {
      setConfig({
        ...config,
        channelIds: [...currentChannels, channelId],
      })
    }
  }

  const handleRemoveChannel = (channelId: string) => {
    const currentChannels = config.channelIds || []
    setConfig({
      ...config,
      channelIds: currentChannels.filter(id => id !== channelId),
    })
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

    if (!selectedServerId) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please select a server first',
      })
      return
    }

    setCreatingChannel(true)
    try {
      const newChannel = await discordService.createChannel(selectedServerId, newChannelName.trim())
      await loadGuildData(selectedServerId)
      const currentChannels = config.channelIds || []
      setConfig({
        ...config,
        channelIds: [...currentChannels, newChannel.id],
      })
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

  const toggleRole = (roleId: string) => {
    const currentRoles = config.allowedRoleIds || []
    if (currentRoles.includes(roleId)) {
      setConfig({
        ...config,
        allowedRoleIds: currentRoles.filter(id => id !== roleId),
      })
    } else {
      setConfig({
        ...config,
        allowedRoleIds: [...currentRoles, roleId],
      })
    }
  }

  const toggleBlockedUser = (userId: string) => {
    const currentUsers = config.blockedUserIds || []
    if (currentUsers.includes(userId)) {
      setConfig({
        ...config,
        blockedUserIds: currentUsers.filter(id => id !== userId),
      })
    } else {
      setConfig({
        ...config,
        blockedUserIds: [...currentUsers, userId],
      })
    }
  }

  const handleSave = async () => {
    if (!config.guildId) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please select a server',
      })
      return
    }

    try {
      setLoading(true)
      await sportsService.saveConfig(config as SportsConfig)
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'F1 commands configuration saved!',
      })
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Save',
        message: error.message || 'Failed to save configuration',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!config.guildId) return

    if (!confirm('Are you sure you want to delete this sports tracking configuration?')) {
      return
    }

    try {
      setLoading(true)
      await sportsService.deleteConfig(config.guildId, selectedSport)
      setConfig({
        guildId: config.guildId,
        enabled: false,
        sportType: selectedSport,
        channelIds: null,
        allowedRoleIds: null,
        blockedUserIds: null,
        roleListType: null,
        dataTypes: [],
        updateIntervalMinutes: 5,
        mentionRoleId: null,
      })
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Sports tracking configuration deleted!',
      })
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Delete',
        message: error.message || 'Failed to delete configuration',
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredMembers = members.filter(member => {
    const searchLower = memberSearch.toLowerCase()
    return (
      member.username.toLowerCase().includes(searchLower) ||
      (member.displayName && member.displayName.toLowerCase().includes(searchLower))
    )
  })

  return (
    <div className="sports-tracker-config">
      <div className="config-header">
        <h2>F1 Commands Configuration</h2>
        <p className="description">
          Enable or disable F1 Discord bot commands. Use <code>/f1</code> commands in Discord to get race information.
        </p>
      </div>

      {serverLoading ? (
        <div className="loading-message">Loading server...</div>
      ) : !selectedServerId ? (
        <div className="error-message">
          No default server selected. Please select a default server in the Settings tab.
        </div>
      ) : (
        <div className="config-form">
        <div className="form-group">
          <label htmlFor="sportType">Sport Type</label>
          <select
            id="sportType"
            value={selectedSport}
            onChange={(e) => {
              const sportType = e.target.value as SportType
              setSelectedSport(sportType)
              if (config.guildId) {
                loadConfig(config.guildId, sportType)
              }
            }}
            disabled={loading}
          >
            <option value="f1">Formula 1</option>
            <option value="nba" disabled>NBA (Coming Soon)</option>
            <option value="nfl" disabled>NFL (Coming Soon)</option>
            <option value="soccer" disabled>Soccer (Coming Soon)</option>
          </select>
        </div>

        {selectedSport === 'f1' && (
          <>
            <div className="form-group">
              <div className="sports-toggle-group">
                <label htmlFor="enable-f1-commands" className="sports-toggle-label">
                  Enable F1 Commands
                </label>
                <label className="sports-toggle-switch">
                  <input
                    type="checkbox"
                    id="enable-f1-commands"
                    checked={config.enabled || false}
                    onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                    disabled={loading}
                  />
                  <span className="sports-toggle-slider"></span>
                </label>
              </div>
              <small>When enabled, users can use <code>/f1</code> commands in Discord to get race information</small>
            </div>

            {config.enabled && (
              <>
                <div className="form-group">
                  <label htmlFor="channel-select">Allowed Channels (Optional)</label>
                  <p className="form-hint">
                    Select channels where F1 commands can be used. Leave empty to allow all channels.
                  </p>
                  <select
                    id="channel-select"
                    value=""
                    onChange={handleChannelSelectChange}
                    disabled={loading || creatingChannel}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      fontSize: '1rem',
                      background: 'var(--input-bg, #2a2a2a)',
                      color: 'var(--text-primary, #fff)',
                      border: '1px solid var(--border-color, #444)',
                      borderRadius: '8px',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <option value="">Select a channel to add...</option>
                    {channels
                      .filter((ch) => ch.type === 0 && !config.channelIds?.includes(ch.id))
                      .map((channel) => (
                        <option key={channel.id} value={channel.id}>
                          #{channel.name}
                        </option>
                      ))}
                    <option value="__create__">+ Create New Channel</option>
                  </select>

                  {showCreateChannelInput && (
                    <div style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                      <div style={{ flex: 1 }}>
                        <label htmlFor="new-channel-name" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                          New Channel Name
                        </label>
                        <input
                          id="new-channel-name"
                          type="text"
                          value={newChannelName}
                          onChange={(e) => setNewChannelName(e.target.value)}
                          placeholder="Enter channel name..."
                          disabled={creatingChannel}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            fontSize: '1rem',
                            background: 'var(--input-bg, #2a2a2a)',
                            color: 'var(--text-primary, #fff)',
                            border: '1px solid var(--border-color, #444)',
                            borderRadius: '8px',
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleCreateChannel()
                            }
                            if (e.key === 'Escape') {
                              setShowCreateChannelInput(false)
                              setNewChannelName('')
                            }
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleCreateChannel}
                        disabled={creatingChannel || !newChannelName.trim()}
                        className="btn btn-primary"
                        style={{ marginBottom: 0 }}
                      >
                        {creatingChannel ? 'Creating...' : 'Create'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateChannelInput(false)
                          setNewChannelName('')
                        }}
                        disabled={creatingChannel}
                        className="btn"
                        style={{ marginBottom: 0 }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {config.channelIds && config.channelIds.length > 0 && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary, #ccc)' }}>
                        Selected Channels:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {config.channelIds.map((channelId) => {
                          const channel = channels.find((ch) => ch.id === channelId)
                          return (
                            <div
                              key={channelId}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 0.75rem',
                                background: 'var(--primary-color, #5865f2)',
                                borderRadius: '6px',
                                fontSize: '0.9rem',
                              }}
                            >
                              <span>#{channel?.name || channelId}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveChannel(channelId)}
                                disabled={loading}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--text-primary, #fff)',
                                  cursor: 'pointer',
                                  padding: '0',
                                  fontSize: '1.2rem',
                                  lineHeight: '1',
                                }}
                                title="Remove channel"
                              >
                                ×
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="roleListType">Role List Type</label>
                  <select
                    id="roleListType"
                    value={config.roleListType || ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        roleListType: e.target.value === '' ? null : (e.target.value as 'whitelist' | 'blacklist'),
                      })
                    }
                    disabled={loading}
                  >
                    <option value="">No role restrictions</option>
                    <option value="whitelist">Whitelist (only selected roles)</option>
                    <option value="blacklist">Blacklist (block selected roles)</option>
                  </select>
                  <small>Choose how role restrictions work. Whitelist: only selected roles can use commands. Blacklist: selected roles cannot use commands.</small>
                </div>

                {(config.roleListType === 'whitelist' || config.roleListType === 'blacklist') && (
                  <div className="form-group">
                    <label>
                      {config.roleListType === 'whitelist' ? 'Allowed Roles' : 'Blocked Roles'}
                    </label>
                    <p className="form-hint">
                      {config.roleListType === 'whitelist'
                        ? 'Select roles that can use F1 commands. Leave empty to allow all users.'
                        : 'Select roles that cannot use F1 commands.'}
                    </p>
                    {config.allowedRoleIds && config.allowedRoleIds.length > 0 && (
                      <div className="selected-count">
                        {config.allowedRoleIds.length} role{config.allowedRoleIds.length !== 1 ? 's' : ''} selected
                      </div>
                    )}
                    <div className="multiselect-grid">
                      {roles.map((role) => {
                        const isSelected = config.allowedRoleIds?.includes(role.id) || false
                        return (
                          <button
                            key={role.id}
                            type="button"
                            className={`multiselect-tag ${isSelected ? 'selected' : ''}`}
                            onClick={() => toggleRole(role.id)}
                            disabled={loading}
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
                )}

                <div className="form-group">
                  <label>Blocked Users</label>
                  <p className="form-hint">Search and select users to block from using F1 commands.</p>
                  {config.blockedUserIds && config.blockedUserIds.length > 0 && (
                    <div className="selected-count error">
                      {config.blockedUserIds.length} user{config.blockedUserIds.length !== 1 ? 's' : ''} blocked
                    </div>
                  )}
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    disabled={loading}
                    style={{ marginBottom: '0.5rem' }}
                  />
                  <div className="multiselect-grid">
                    {filteredMembers.slice(0, 20).map((member) => {
                      const isSelected = config.blockedUserIds?.includes(member.id) || false
                      return (
                        <button
                          key={member.id}
                          type="button"
                          className={`multiselect-tag ${isSelected ? 'selected blocked' : ''}`}
                          onClick={() => toggleBlockedUser(member.id)}
                          disabled={loading}
                        >
                          {member.displayName || member.username}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        <div className="f1-commands-info">
          <h3>Available F1 Commands</h3>
          <ul>
            <li><code>/f1 positions</code> - Get current race positions</li>
            <li><code>/f1 starting-grid</code> - Get the starting grid for the race</li>
            <li><code>/f1 race-info</code> - Get current race information</li>
            <li><code>/f1 leader</code> - Get who is currently in the lead</li>
            <li><code>/f1 standings</code> - Get current drivers championship standings</li>
          </ul>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || !config.guildId || serverLoading}
            className="btn btn-primary"
          >
            {loading ? 'Saving...' : 'Save Configuration'}
          </button>
          {config.enabled && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading || serverLoading}
              className="btn btn-danger"
            >
              Delete Configuration
            </button>
          )}
        </div>
      </div>
      )}
    </div>
  )
}
