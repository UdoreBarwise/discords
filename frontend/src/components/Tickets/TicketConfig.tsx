import { useState, useEffect } from 'react'
import { ticketService, TicketConfig as TicketConfigType } from '../../services/ticketService'
import { discordService, Channel, Category, Role, Member } from '../../services/discordService'
import { useNotifications } from '../../contexts/NotificationContext'
import { useServer } from '../../contexts/ServerContext'
import './TicketConfig.css'

export default function TicketConfig() {
  const { addNotification } = useNotifications()
  const { selectedServerId, isLoading: serverLoading } = useServer()
  const [loading, setLoading] = useState(false)
  const [channels, setChannels] = useState<Channel[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  const [creatingChannel, setCreatingChannel] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [showCreateChannelInput, setShowCreateChannelInput] = useState(false)

  const [config, setConfig] = useState<Partial<TicketConfigType>>({
    guildId: '',
    embedChannelId: '',
    ticketCategoryId: '',
    mentionRoleIds: [],
    mentionUserIds: [],
    messageType: 'embed',
    messageTitle: 'Create a Ticket',
    messageDescription: 'Click the button below to create a support ticket.',
    messageContent: '',
  })

  useEffect(() => {
    if (selectedServerId && !config.guildId) {
      setConfig({ ...config, guildId: selectedServerId })
    }
  }, [selectedServerId])

  useEffect(() => {
    if (config.guildId) {
      loadGuildData(config.guildId)
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

  const loadGuildData = async (guildId: string) => {
    try {
      const [channelsData, categoriesData, rolesData, membersData] = await Promise.all([
        discordService.getChannels(guildId),
        discordService.getCategories(guildId),
        discordService.getRoles(guildId),
        discordService.getMembers(guildId),
      ])
      setChannels(channelsData)
      setCategories(categoriesData)
      setRoles(rolesData)
      setMembers(membersData)
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
      const data = await ticketService.getConfig(guildId)
      if (data) {
        setConfig({
          embedChannelId: data.embedChannelId,
          ticketCategoryId: data.ticketCategoryId,
          mentionRoleIds: data.mentionRoleIds,
          mentionUserIds: data.mentionUserIds,
          messageType: data.messageType || 'embed',
          messageTitle: data.messageTitle || 'Create a Ticket',
          messageDescription: data.messageDescription || 'Click the button below to create a support ticket.',
          messageContent: data.messageContent || '',
        })
      }
    } catch (error: any) {
      console.error('Failed to load config:', error)
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
        message: 'Please set a default server in settings',
      })
      return
    }

    setCreatingChannel(true)
    try {
      const newChannel = await discordService.createChannel(selectedServerId, newChannelName.trim())
      await loadGuildData(selectedServerId)
      setConfig({ ...config, embedChannelId: newChannel.id })
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
    setConfig({ ...config, embedChannelId: e.target.value })
  }

  const handleSave = async () => {
    if (!selectedServerId || !config.embedChannelId || !config.ticketCategoryId) {
      addNotification({
        type: 'warning',
        title: 'Missing Fields',
        message: 'Please select a channel and category',
      })
      return
    }

    setLoading(true)

    try {
      await ticketService.saveConfig({
        guildId: selectedServerId,
        embedChannelId: config.embedChannelId,
        ticketCategoryId: config.ticketCategoryId,
        mentionRoleIds: config.mentionRoleIds || [],
        mentionUserIds: config.mentionUserIds || [],
        messageType: config.messageType || 'embed',
        messageTitle: config.messageTitle,
        messageDescription: config.messageDescription,
        messageContent: config.messageContent,
      })
      addNotification({
        type: 'success',
        title: 'Configuration Saved',
        message: 'Ticket configuration has been saved and embed message created/updated',
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

  const toggleRole = (roleId: string) => {
    const current = config.mentionRoleIds || []
    if (current.includes(roleId)) {
      setConfig({
        ...config,
        mentionRoleIds: current.filter((id) => id !== roleId),
      })
    } else {
      setConfig({
        ...config,
        mentionRoleIds: [...current, roleId],
      })
    }
  }

  const toggleUser = (userId: string) => {
    const current = config.mentionUserIds || []
    if (current.includes(userId)) {
      setConfig({
        ...config,
        mentionUserIds: current.filter((id) => id !== userId),
      })
    } else {
      setConfig({
        ...config,
        mentionUserIds: [...current, userId],
      })
    }
  }

  return (
    <div className="ticket-config">
      <div className="ticket-config-grid">
        {!selectedServerId && !serverLoading ? (
          <div className="ticket-config-section">
            <p>No server selected.</p>
            <p>Please select a default server in Settings to configure tickets.</p>
          </div>
        ) : selectedServerId && (
          <>
            <div className="ticket-config-section">
              <label htmlFor="channel-select">Embed Channel</label>
              <select
                id="channel-select"
                value={showCreateChannelInput ? '__create__' : (config.embedChannelId || '')}
                onChange={handleChannelSelectChange}
                disabled={loading}
              >
                <option value="">Select a channel</option>
                <option value="__create__">+ Create New Channel (Admin-only write)</option>
                {channels.map((channel) => (
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
              <p className="ticket-config-hint">
                The channel where the ticket creation embed will be sent
              </p>
            </div>

            <div className="ticket-config-section">
              <label htmlFor="category-select">Ticket Category</label>
              <select
                id="category-select"
                value={config.ticketCategoryId || ''}
                onChange={(e) =>
                  setConfig({ ...config, ticketCategoryId: e.target.value })
                }
                disabled={loading}
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <p className="ticket-config-hint">
                Tickets will be created in this category
              </p>
            </div>

            <div className="ticket-config-section full-width">
              <label>Mention Roles (when ticket is created)</label>
              <div className="ticket-config-multiselect">
                {roles.map((role) => {
                  const isSelected = config.mentionRoleIds?.includes(role.id)
                  return (
                    <button
                      key={role.id}
                      type="button"
                      className={`ticket-config-tag ${isSelected ? 'selected' : ''}`}
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

            <div className="ticket-config-section full-width">
              <label>Mention Users (when ticket is created)</label>
              <input
                type="text"
                placeholder="Search users..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="ticket-config-search"
              />
              <div className="ticket-config-multiselect">
                {members.map((member) => {
                  const isSelected = config.mentionUserIds?.includes(member.id)
                  return (
                    <button
                      key={member.id}
                      type="button"
                      className={`ticket-config-tag ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleUser(member.id)}
                    >
                      {member.displayName} ({member.username})
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="ticket-config-section">
              <label>Message Type</label>
              <select
                value={config.messageType || 'embed'}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    messageType: e.target.value as 'plain_text' | 'embed',
                  })
                }
                disabled={loading}
              >
                <option value="embed">Embed</option>
                <option value="plain_text">Plain Text</option>
              </select>
              <p className="ticket-config-hint">
                Choose whether to send the ticket creation message as an embed or plain text
              </p>
            </div>

            {config.messageType === 'embed' ? (
              <>
                <div className="ticket-config-section">
                  <label htmlFor="message-title">Message Title</label>
                  <input
                    id="message-title"
                    type="text"
                    value={config.messageTitle || ''}
                    onChange={(e) =>
                      setConfig({ ...config, messageTitle: e.target.value })
                    }
                    placeholder="Create a Ticket"
                    disabled={loading}
                    maxLength={256}
                  />
                  <p className="ticket-config-hint">
                    The title of the embed message
                  </p>
                </div>

                <div className="ticket-config-section">
                  <label htmlFor="message-description">Message Description</label>
                  <textarea
                    id="message-description"
                    value={config.messageDescription || ''}
                    onChange={(e) =>
                      setConfig({ ...config, messageDescription: e.target.value })
                    }
                    placeholder="Click the button below to create a support ticket."
                    disabled={loading}
                    rows={4}
                    maxLength={4096}
                  />
                  <p className="ticket-config-hint">
                    The description text shown in the embed
                  </p>
                </div>
              </>
            ) : (
              <div className="ticket-config-section full-width">
                <label htmlFor="message-content">Message Content</label>
                <textarea
                  id="message-content"
                  value={config.messageContent || ''}
                  onChange={(e) =>
                    setConfig({ ...config, messageContent: e.target.value })
                  }
                  placeholder="Click the button below to create a support ticket."
                  disabled={loading}
                  rows={4}
                  maxLength={2000}
                />
                <p className="ticket-config-hint">
                  The plain text message content (Discord limit: 2000 characters)
                </p>
              </div>
            )}

            <div className="ticket-config-actions full-width">
              <button
                onClick={handleSave}
                disabled={loading || !config.embedChannelId || !config.ticketCategoryId}
                className="ticket-config-button save"
              >
                {loading ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

