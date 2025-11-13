import { useState, useEffect } from 'react'
import { autoRolesService, AutoRolesConfig as AutoRolesConfigType, ReactionRole } from '../../services/autoRolesService'
import { discordService, Guild, Channel, Role } from '../../services/discordService'
import { ticketService } from '../../services/ticketService'
import { botService } from '../../services/botService'
import { useNotifications } from '../../contexts/NotificationContext'
import { Link } from 'react-router-dom'
import './AutoRolesConfig.css'

export default function AutoRolesConfigComponent() {
  const { addNotification } = useNotifications()
  const [loading, setLoading] = useState(false)
  const [guilds, setGuilds] = useState<Guild[]>([])
  const [defaultServerId, setDefaultServerId] = useState<string | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [ticketSupportRoleIds, setTicketSupportRoleIds] = useState<string[]>([])
  const [creatingChannel, setCreatingChannel] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [showCreateChannelInput, setShowCreateChannelInput] = useState(false)

  const [config, setConfig] = useState<Partial<AutoRolesConfigType>>({
    guildId: '',
    channelId: '',
    embedTitle: 'Auto Roles',
    embedDescription: 'React to the messages below to get roles!',
    embedColor: '#5865f2',
    reactionRoles: [],
  })

  const [newReactionRole, setNewReactionRole] = useState<Partial<ReactionRole>>({
    emoji: '',
    roleId: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (defaultServerId) {
      setConfig((prev) => ({ ...prev, guildId: defaultServerId }))
      loadGuildData(defaultServerId)
      loadConfig(defaultServerId)
    }
  }, [defaultServerId])

  const loadData = async () => {
    try {
      const [guildsData, defaultServer] = await Promise.all([
        discordService.getGuilds(),
        botService.getDefaultServer(),
      ])
      setGuilds(guildsData)
      setDefaultServerId(defaultServer)
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Load Data',
        message: error.response?.data?.error || 'Failed to fetch data',
      })
    }
  }

  const loadGuildData = async (guildId: string) => {
    try {
      const [channelsData, rolesData, ticketConfig] = await Promise.all([
        discordService.getChannels(guildId),
        discordService.getRoles(guildId),
        ticketService.getConfig(guildId).catch(() => null),
      ])
      setChannels(channelsData)
      setRoles(rolesData)
      // Get ticket support role IDs to exclude from auto roles
      if (ticketConfig?.mentionRoleIds) {
        setTicketSupportRoleIds(ticketConfig.mentionRoleIds)
      } else {
        setTicketSupportRoleIds([])
      }
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
      const data = await autoRolesService.getConfig(guildId)
      if (data) {
        setConfig({
          guildId: data.guildId,
          channelId: data.channelId,
          embedTitle: data.embedTitle || 'Auto Roles',
          embedDescription: data.embedDescription || 'React to the messages below to get roles!',
          embedColor: data.embedColor || '#5865f2',
          reactionRoles: data.reactionRoles || [],
        })
      } else {
        setConfig((prev) => ({
          ...prev,
          channelId: '',
          embedTitle: 'Auto Roles',
          embedDescription: 'React to the messages below to get roles!',
          embedColor: '#5865f2',
          reactionRoles: [],
        }))
      }
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Load Config',
        message: error.response?.data?.error || 'Failed to load auto roles config',
      })
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
    setConfig({ ...config, channelId: e.target.value })
  }

  const handleSave = async () => {
    if (!config.guildId) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please set a default server in settings',
      })
      return
    }

    if (!config.channelId) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please select a channel',
      })
      return
    }

    if (!config.reactionRoles || config.reactionRoles.length === 0) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please add at least one reaction role',
      })
      return
    }

    // Filter out ticket support roles before saving
    const validReactionRoles = config.reactionRoles.filter(
      (rr) => !ticketSupportRoleIds.includes(rr.roleId)
    )

    if (validReactionRoles.length !== config.reactionRoles.length) {
      const removedCount = config.reactionRoles.length - validReactionRoles.length
      addNotification({
        type: 'warning',
        title: 'Ticket Support Roles Removed',
        message: `${removedCount} ticket support role(s) were removed from the configuration. These roles cannot be assigned via auto roles.`,
      })
      setConfig({ ...config, reactionRoles: validReactionRoles })
    }

    if (validReactionRoles.length === 0) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'No valid reaction roles remaining after filtering out ticket support roles',
      })
      return
    }

    setLoading(true)
    try {
      await autoRolesService.saveConfig({ ...config, reactionRoles: validReactionRoles } as AutoRolesConfigType)
      addNotification({
        type: 'success',
        title: 'Config Saved',
        message: 'Auto roles configuration saved successfully',
      })
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Save',
        message: error.response?.data?.error || 'Failed to save auto roles config',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
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
      await autoRolesService.sendMessage(config.guildId!)
      addNotification({
        type: 'success',
        title: 'Message Sent',
        message: 'Auto roles message sent successfully',
      })
      // Reload config to get the new message ID
      await loadConfig(config.guildId!)
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Send',
        message: error.response?.data?.error || 'Failed to send auto roles message',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddReactionRole = () => {
    if (!newReactionRole.emoji || !newReactionRole.roleId) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please enter both emoji and role',
      })
      return
    }

    // Prevent adding ticket support roles
    if (ticketSupportRoleIds.includes(newReactionRole.roleId!)) {
      addNotification({
        type: 'error',
        title: 'Invalid Role',
        message: 'Ticket support roles cannot be assigned via auto roles. Users can still create tickets via interactions.',
      })
      return
    }

    const role = roles.find((r) => r.id === newReactionRole.roleId)
    const reactionRoles = [...(config.reactionRoles || []), {
      emoji: newReactionRole.emoji!,
      roleId: newReactionRole.roleId!,
      roleName: role?.name,
    }]

    setConfig({ ...config, reactionRoles })
    setNewReactionRole({ emoji: '', roleId: '' })
  }

  const handleRemoveReactionRole = (index: number) => {
    const reactionRoles = [...(config.reactionRoles || [])]
    reactionRoles.splice(index, 1)
    setConfig({ ...config, reactionRoles })
  }

  const handleDelete = async () => {
    if (!config.guildId) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please select a server',
      })
      return
    }

    if (!window.confirm('Are you sure you want to delete the auto roles configuration?')) {
      return
    }

    setLoading(true)
    try {
      await autoRolesService.deleteConfig(config.guildId!)
      addNotification({
        type: 'success',
        title: 'Config Deleted',
        message: 'Auto roles configuration deleted successfully',
      })
      setConfig({
        guildId: config.guildId,
        channelId: '',
        embedTitle: 'Auto Roles',
        embedDescription: 'React to the messages below to get roles!',
        embedColor: '#5865f2',
        reactionRoles: [],
      })
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Delete',
        message: error.response?.data?.error || 'Failed to delete auto roles config',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auto-roles-config">
      <div className="config-section">
        <h2>Server Configuration</h2>
        {!defaultServerId ? (
          <div className="server-warning">
            <p>No default server is set. Please set a default server in{' '}
              <Link to="/settings?tab=token">Settings</Link> to configure auto roles.
            </p>
          </div>
        ) : (
          <div className="form-group">
            <label>Current Server</label>
            <div className="server-display">
              <strong>{guilds.find((g) => g.id === config.guildId)?.name || 'Unknown Server'}</strong>
              <Link to="/settings?tab=token" className="change-server-link">
                Change in Settings
              </Link>
            </div>
          </div>
        )}
      </div>

      {defaultServerId && config.guildId && (
        <>
          <div className="config-section">
            <h2>Channel Settings</h2>
            <div className="form-group">
              <label>Channel</label>
              <select
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
                      {channel.name}
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
          </div>

          <div className="config-section">
            <h2>Embed Settings</h2>
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={config.embedTitle || ''}
                onChange={(e) => setConfig({ ...config, embedTitle: e.target.value })}
                disabled={loading}
                placeholder="Auto Roles"
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={config.embedDescription || ''}
                onChange={(e) => setConfig({ ...config, embedDescription: e.target.value })}
                disabled={loading}
                placeholder="React to the messages below to get roles!"
                rows={3}
              />
            </div>
            <div className="form-group">
              <label>Color</label>
              <input
                type="color"
                value={config.embedColor || '#5865f2'}
                onChange={(e) => setConfig({ ...config, embedColor: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          <div className="config-section">
            <h2>Reaction Roles</h2>
            <div className="reaction-roles-list">
              {config.reactionRoles && config.reactionRoles.length > 0 ? (
                <div className="reaction-roles-items">
                  {config.reactionRoles.map((rr, index) => {
                    const role = roles.find((r) => r.id === rr.roleId)
                    const isTicketSupportRole = ticketSupportRoleIds.includes(rr.roleId)
                    return (
                      <div key={index} className="reaction-role-item">
                        <span className="reaction-emoji">{rr.emoji}</span>
                        <span className="reaction-role-name">
                          {role?.name || rr.roleName || 'Unknown Role'}
                          {isTicketSupportRole && (
                            <span style={{ 
                              marginLeft: '0.5rem', 
                              fontSize: '0.75rem', 
                              color: 'var(--warning-text, #ffa500)',
                              fontStyle: 'italic'
                            }}>
                              (Ticket support role - will be removed)
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveReactionRole(index)}
                          disabled={loading}
                          className="remove-button"
                        >
                          Remove
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="no-items">No reaction roles added yet</p>
              )}
            </div>

            <div className="add-reaction-role">
              <div className="form-row">
                <div className="form-group">
                  <label>Emoji</label>
                  <input
                    type="text"
                    value={newReactionRole.emoji || ''}
                    onChange={(e) => setNewReactionRole({ ...newReactionRole, emoji: e.target.value })}
                    disabled={loading}
                    placeholder="😀 or :smile:"
                  />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select
                    value={newReactionRole.roleId || ''}
                    onChange={(e) => setNewReactionRole({ ...newReactionRole, roleId: e.target.value })}
                    disabled={loading}
                  >
                    <option value="">Select a role...</option>
                    {roles
                      .filter((role) => !ticketSupportRoleIds.includes(role.id))
                      .map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                  </select>
                  {ticketSupportRoleIds.length > 0 && (
                    <p className="form-help" style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary, #aaa)' }}>
                      Note: Ticket support roles are excluded from auto roles to prevent users from giving themselves access to ticket channels. Users can still create tickets via interactions.
                    </p>
                  )}
                </div>
                <div className="form-group">
                  <button
                    type="button"
                    onClick={handleAddReactionRole}
                    disabled={loading}
                    className="add-button"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="config-actions">
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="save-button"
            >
              Save Config
            </button>
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={loading || !config.channelId || !config.reactionRoles || config.reactionRoles.length === 0}
              className="send-button"
            >
              {config.messageId ? 'Update Message' : 'Send Message'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading || !config.messageId}
              className="delete-button"
            >
              Delete Config
            </button>
          </div>
        </>
      )}
    </div>
  )
}

