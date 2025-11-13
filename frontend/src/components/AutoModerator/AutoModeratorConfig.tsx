import { useState, useEffect } from 'react'
import { autoModeratorService, AutoModeratorConfig as AutoModeratorConfigType } from '../../services/autoModeratorService'
import { discordService, Guild, Channel, Role, Member } from '../../services/discordService'
import { botService } from '../../services/botService'
import { useNotifications } from '../../contexts/NotificationContext'
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog'
import { HiChevronDown, HiChevronUp } from 'react-icons/hi'
import './AutoModeratorConfig.css'

export default function AutoModeratorConfig() {
  const { addNotification } = useNotifications()
  const [loading, setLoading] = useState(false)
  const [guilds, setGuilds] = useState<Guild[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmDialogState, setConfirmDialogState] = useState<{
    type: 'save' | 'removeWord' | 'removeUser' | 'removeChannel' | 'removeRole' | 'toggleUser' | 'toggleChannel' | 'toggleRole' | 'enable' | null
    data?: any
  }>({ type: null })
  const [newWhitelistWord, setNewWhitelistWord] = useState('')
  const [newBlacklistWord, setNewBlacklistWord] = useState('')
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    words: false,
    users: false,
    channels: false,
    roles: false,
  })

  const [config, setConfig] = useState<AutoModeratorConfigType>({
    guildId: '',
    enabled: false,
    severityLevel: 'medium',
    whitelistWords: [],
    blacklistWords: [],
    whitelistUsers: [],
    blacklistUsers: [],
    whitelistChannels: [],
    blacklistChannels: [],
    whitelistRoles: [],
    blacklistRoles: [],
    actionOnViolation: 'delete',
    warnOnViolation: true,
    logChannelId: null,
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

  const loadGuildData = async (guildId: string) => {
    try {
      const [channelsData, rolesData] = await Promise.all([
        discordService.getChannels(guildId),
        discordService.getRoles(guildId),
      ])
      setChannels(channelsData)
      setRoles(rolesData)
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Load Data',
        message: error.response?.data?.error || 'Failed to fetch guild data',
      })
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
      const data = await autoModeratorService.getConfig(guildId)
      setConfig(data)
    } catch (error: any) {
      console.error('Failed to load config:', error)
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
    setConfirmDialogState({ type: 'save' })
    setShowConfirmDialog(true)
  }

  const handleEnableToggle = (enabled: boolean) => {
    setConfirmDialogState({ type: 'enable', data: { enabled } })
    setShowConfirmDialog(true)
  }

  const handleConfirmEnable = () => {
    setShowConfirmDialog(false)
    setConfig({ ...config, enabled: confirmDialogState.data.enabled })
    setConfirmDialogState({ type: null })
  }

  const handleSave = async () => {
    setShowConfirmDialog(false)
    setLoading(true)

    try {
      await autoModeratorService.saveConfig(config)
      addNotification({
        type: 'success',
        title: 'Configuration Saved',
        message: 'Auto moderator configuration has been saved successfully',
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

  const addWordToList = (listType: 'whitelistWords' | 'blacklistWords') => {
    const word = (listType === 'whitelistWords' ? newWhitelistWord : newBlacklistWord).trim().toLowerCase()
    if (!word) return
    if (config[listType].includes(word)) {
      addNotification({
        type: 'warning',
        title: 'Duplicate Word',
        message: 'This word is already in the list',
      })
      return
    }
    setConfig({ ...config, [listType]: [...config[listType], word] })
    if (listType === 'whitelistWords') {
      setNewWhitelistWord('')
    } else {
      setNewBlacklistWord('')
    }
  }

  const handleRemoveWord = (listType: 'whitelistWords' | 'blacklistWords', word: string) => {
    setConfirmDialogState({ type: 'removeWord', data: { listType, word } })
    setShowConfirmDialog(true)
  }

  const confirmRemoveWord = () => {
    const { listType, word } = confirmDialogState.data
    setConfig({
      ...config,
      [listType]: config[listType].filter((w) => w !== word),
    })
    setShowConfirmDialog(false)
    setConfirmDialogState({ type: null })
  }

  const handleToggleUser = (userId: string, listType: 'whitelistUsers' | 'blacklistUsers') => {
    const otherListType = listType === 'whitelistUsers' ? 'blacklistUsers' : 'whitelistUsers'
    const isInList = config[listType].includes(userId)
    const member = members.find((m) => m.id === userId)
    const memberName = member ? (member.displayName || member.username) : userId

    if (isInList) {
      setConfirmDialogState({ type: 'removeUser', data: { userId, listType, memberName } })
    } else {
      setConfirmDialogState({ type: 'toggleUser', data: { userId, listType, memberName, otherListType } })
    }
    setShowConfirmDialog(true)
  }

  const confirmToggleUser = () => {
    const { userId, listType, otherListType } = confirmDialogState.data
    const isInList = config[listType].includes(userId)
    
    if (isInList) {
      setConfig({
        ...config,
        [listType]: config[listType].filter((id) => id !== userId),
      })
    } else {
      setConfig({
        ...config,
        [listType]: [...config[listType], userId],
        [otherListType]: config[otherListType].filter((id) => id !== userId),
      })
    }
    setShowConfirmDialog(false)
    setConfirmDialogState({ type: null })
  }

  const confirmRemoveUser = () => {
    const { userId, listType } = confirmDialogState.data
    setConfig({
      ...config,
      [listType]: config[listType].filter((id) => id !== userId),
    })
    setShowConfirmDialog(false)
    setConfirmDialogState({ type: null })
  }

  const handleToggleChannel = (channelId: string, listType: 'whitelistChannels' | 'blacklistChannels') => {
    const otherListType = listType === 'whitelistChannels' ? 'blacklistChannels' : 'whitelistChannels'
    const isInList = config[listType].includes(channelId)
    const channel = channels.find((c) => c.id === channelId)
    const channelName = channel ? `#${channel.name}` : channelId

    if (isInList) {
      setConfirmDialogState({ type: 'removeChannel', data: { channelId, listType, channelName } })
    } else {
      setConfirmDialogState({ type: 'toggleChannel', data: { channelId, listType, channelName, otherListType } })
    }
    setShowConfirmDialog(true)
  }

  const confirmToggleChannel = () => {
    const { channelId, listType, otherListType } = confirmDialogState.data
    const isInList = config[listType].includes(channelId)
    
    if (isInList) {
      setConfig({
        ...config,
        [listType]: config[listType].filter((id) => id !== channelId),
      })
    } else {
      setConfig({
        ...config,
        [listType]: [...config[listType], channelId],
        [otherListType]: config[otherListType].filter((id) => id !== channelId),
      })
    }
    setShowConfirmDialog(false)
    setConfirmDialogState({ type: null })
  }

  const confirmRemoveChannel = () => {
    const { channelId, listType } = confirmDialogState.data
    setConfig({
      ...config,
      [listType]: config[listType].filter((id) => id !== channelId),
    })
    setShowConfirmDialog(false)
    setConfirmDialogState({ type: null })
  }

  const handleToggleRole = (roleId: string, listType: 'whitelistRoles' | 'blacklistRoles') => {
    const otherListType = listType === 'whitelistRoles' ? 'blacklistRoles' : 'whitelistRoles'
    const isInList = config[listType].includes(roleId)
    const role = roles.find((r) => r.id === roleId)
    const roleName = role ? role.name : roleId

    if (isInList) {
      setConfirmDialogState({ type: 'removeRole', data: { roleId, listType, roleName } })
    } else {
      setConfirmDialogState({ type: 'toggleRole', data: { roleId, listType, roleName, otherListType } })
    }
    setShowConfirmDialog(true)
  }

  const confirmToggleRole = () => {
    const { roleId, listType, otherListType } = confirmDialogState.data
    const isInList = config[listType].includes(roleId)
    
    if (isInList) {
      setConfig({
        ...config,
        [listType]: config[listType].filter((id) => id !== roleId),
      })
    } else {
      setConfig({
        ...config,
        [listType]: [...config[listType], roleId],
        [otherListType]: config[otherListType].filter((id) => id !== roleId),
      })
    }
    setShowConfirmDialog(false)
    setConfirmDialogState({ type: null })
  }

  const confirmRemoveRole = () => {
    const { roleId, listType } = confirmDialogState.data
    setConfig({
      ...config,
      [listType]: config[listType].filter((id) => id !== roleId),
    })
    setShowConfirmDialog(false)
    setConfirmDialogState({ type: null })
  }

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  return (
    <div className="auto-moderator-config">
      <div className="auto-moderator-section">
        <label htmlFor="guild-select">Discord Server</label>
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

      {config.guildId && (
        <>
          <div className="auto-moderator-section">
            <div className="auto-moderator-toggle-group">
              <label htmlFor="enable-auto-moderator" className="auto-moderator-toggle-label">
                Enable Auto Moderator
              </label>
              <label className="auto-moderator-toggle-switch">
                <input
                  id="enable-auto-moderator"
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => handleEnableToggle(e.target.checked)}
                  disabled={loading}
                />
                <span className="auto-moderator-toggle-slider"></span>
              </label>
            </div>
          </div>

          {config.enabled && (
            <>
              <div className="auto-moderator-section">
                <label htmlFor="severity-level">Severity Level</label>
                <select
                  id="severity-level"
                  value={config.severityLevel}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      severityLevel: e.target.value as 'low' | 'medium' | 'high',
                    })
                  }
                  disabled={loading}
                >
                  <option value="low">Low - Basic filtering</option>
                  <option value="medium">Medium - Standard filtering</option>
                  <option value="high">High - Aggressive filtering</option>
                </select>
                <p className="auto-moderator-hint">
                  Severity level determines the default word blacklist. You can add custom words below.
                </p>
              </div>

              <div className="auto-moderator-section">
                <label htmlFor="action-on-violation">Action on Violation</label>
                <select
                  id="action-on-violation"
                  value={config.actionOnViolation}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      actionOnViolation: e.target.value as AutoModeratorConfigType['actionOnViolation'],
                    })
                  }
                  disabled={loading}
                >
                  <option value="delete">Delete Message</option>
                  <option value="warn">Warn User</option>
                  <option value="timeout">Timeout User (15 min)</option>
                  <option value="kick">Kick User</option>
                  <option value="ban">Ban User</option>
                </select>
              </div>

              <div className="auto-moderator-section">
                <div className="auto-moderator-toggle-group">
                  <label htmlFor="warn-on-violation" className="auto-moderator-toggle-label">
                    Show Warning Message
                  </label>
                  <label className="auto-moderator-toggle-switch">
                    <input
                      id="warn-on-violation"
                      type="checkbox"
                      checked={config.warnOnViolation}
                      onChange={(e) => setConfig({ ...config, warnOnViolation: e.target.checked })}
                      disabled={loading}
                    />
                    <span className="auto-moderator-toggle-slider"></span>
                  </label>
                </div>
                <p className="auto-moderator-hint">
                  When enabled, a warning message will be shown when a violation occurs
                </p>
              </div>

              <div className="auto-moderator-section">
                <label htmlFor="log-channel">Log Channel (Optional)</label>
                <select
                  id="log-channel"
                  value={config.logChannelId || ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      logChannelId: e.target.value || null,
                    })
                  }
                  disabled={loading}
                >
                  <option value="">No logging</option>
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      #{channel.name}
                    </option>
                  ))}
                </select>
                <p className="auto-moderator-hint">
                  Select a channel to log moderation actions. Leave empty to disable logging.
                </p>
              </div>

              <div className="auto-moderator-section-group">
                <div
                  className="auto-moderator-collapsible-header"
                  onClick={() => toggleSection('words')}
                >
                  <h3>Word Filters</h3>
                  {collapsedSections.words ? (
                    <HiChevronDown className="auto-moderator-collapsible-icon" />
                  ) : (
                    <HiChevronUp className="auto-moderator-collapsible-icon" />
                  )}
                </div>
                <div className={`auto-moderator-collapsible-content ${collapsedSections.words ? 'collapsed' : ''}`}>
                  <div className="auto-moderator-section">
                    <label>Whitelist Words</label>
                    <p className="auto-moderator-hint">
                      Words that are always allowed, even if they appear in the blacklist
                    </p>
                <div className="auto-moderator-word-input">
                  <input
                    type="text"
                    placeholder="Enter word to whitelist..."
                    value={newWhitelistWord}
                    onChange={(e) => setNewWhitelistWord(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addWordToList('whitelistWords')
                      }
                    }}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => addWordToList('whitelistWords')}
                    disabled={loading || !newWhitelistWord.trim()}
                    className="auto-moderator-add-button"
                  >
                    Add
                  </button>
                </div>
                {config.whitelistWords.length > 0 && (
                  <div className="auto-moderator-word-list">
                    {config.whitelistWords.map((word) => (
                      <span key={word} className="auto-moderator-word-tag">
                        {word}
                        <button
                          type="button"
                          onClick={() => handleRemoveWord('whitelistWords', word)}
                          className="auto-moderator-word-remove"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                  </div>

                  <div className="auto-moderator-section">
                    <label>Blacklist Words (Custom)</label>
                    <p className="auto-moderator-hint">
                      Additional words to block. Default words are based on severity level.
                    </p>
                <div className="auto-moderator-word-input">
                  <input
                    type="text"
                    placeholder="Enter word to blacklist..."
                    value={newBlacklistWord}
                    onChange={(e) => setNewBlacklistWord(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addWordToList('blacklistWords')
                      }
                    }}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => addWordToList('blacklistWords')}
                    disabled={loading || !newBlacklistWord.trim()}
                    className="auto-moderator-add-button"
                  >
                    Add
                  </button>
                </div>
                {config.blacklistWords.length > 0 && (
                  <div className="auto-moderator-word-list">
                    {config.blacklistWords.map((word) => (
                      <span key={word} className="auto-moderator-word-tag blacklist">
                        {word}
                        <button
                          type="button"
                          onClick={() => handleRemoveWord('blacklistWords', word)}
                          className="auto-moderator-word-remove"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                  </div>
                </div>
              </div>

              <div className="auto-moderator-section-group">
                <div
                  className="auto-moderator-collapsible-header"
                  onClick={() => toggleSection('users')}
                >
                  <h3>User Filters</h3>
                  {collapsedSections.users ? (
                    <HiChevronDown className="auto-moderator-collapsible-icon" />
                  ) : (
                    <HiChevronUp className="auto-moderator-collapsible-icon" />
                  )}
                </div>
                <div className={`auto-moderator-collapsible-content ${collapsedSections.users ? 'collapsed' : ''}`}>
                  <div className="auto-moderator-section">
                    <label>Whitelist Users</label>
                <p className="auto-moderator-hint">
                  Users who are exempt from moderation. Search and select users.
                </p>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  disabled={loading}
                  style={{ marginBottom: '0.5rem' }}
                />
                {config.whitelistUsers.length > 0 && (
                  <div className="auto-moderator-selected-list">
                    {config.whitelistUsers.map((userId) => {
                      const member = members.find((m) => m.id === userId)
                      return (
                        <span key={userId} className="auto-moderator-selected-tag whitelist">
                          {member ? `${member.displayName || member.username}` : userId}
                          <button
                            type="button"
                            onClick={() => handleToggleUser(userId, 'whitelistUsers')}
                            className="auto-moderator-word-remove"
                          >
                            ×
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}
                <div className="auto-moderator-multiselect">
                  {members
                    .filter((m) => !config.whitelistUsers.includes(m.id))
                    .slice(0, 20)
                    .map((member) => {
                      const isBlacklisted = config.blacklistUsers.includes(member.id)
                      return (
                        <button
                          key={member.id}
                          type="button"
                          className={`auto-moderator-tag ${isBlacklisted ? 'blocked' : ''}`}
                          onClick={() => handleToggleUser(member.id, 'whitelistUsers')}
                          disabled={isBlacklisted}
                        >
                          {member.displayName || member.username}
                        </button>
                      )
                    })}
                </div>
              </div>

              <div className="auto-moderator-section">
                <label>Blacklist Users</label>
                <p className="auto-moderator-hint">
                  Users who are always moderated, regardless of other settings.
                </p>
                {config.blacklistUsers.length > 0 && (
                  <div className="auto-moderator-selected-list">
                    {config.blacklistUsers.map((userId) => {
                      const member = members.find((m) => m.id === userId)
                      return (
                        <span key={userId} className="auto-moderator-selected-tag blacklist">
                          {member ? `${member.displayName || member.username}` : userId}
                          <button
                            type="button"
                            onClick={() => handleToggleUser(userId, 'blacklistUsers')}
                            className="auto-moderator-word-remove"
                          >
                            ×
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}
                <div className="auto-moderator-multiselect">
                  {members
                    .filter((m) => !config.blacklistUsers.includes(m.id))
                    .slice(0, 20)
                    .map((member) => {
                      const isWhitelisted = config.whitelistUsers.includes(member.id)
                      return (
                        <button
                          key={member.id}
                          type="button"
                          className={`auto-moderator-tag ${isWhitelisted ? 'whitelisted' : ''}`}
                          onClick={() => handleToggleUser(member.id, 'blacklistUsers')}
                          disabled={isWhitelisted}
                        >
                          {member.displayName || member.username}
                        </button>
                      )
                    })}
                </div>
                  </div>
                </div>
              </div>

              <div className="auto-moderator-section-group">
                <div
                  className="auto-moderator-collapsible-header"
                  onClick={() => toggleSection('channels')}
                >
                  <h3>Channel Filters</h3>
                  {collapsedSections.channels ? (
                    <HiChevronDown className="auto-moderator-collapsible-icon" />
                  ) : (
                    <HiChevronUp className="auto-moderator-collapsible-icon" />
                  )}
                </div>
                <div className={`auto-moderator-collapsible-content ${collapsedSections.channels ? 'collapsed' : ''}`}>
                  <div className="auto-moderator-section">
                    <label>Whitelist Channels</label>
                    <p className="auto-moderator-hint">
                      Channels where moderation is disabled.
                    </p>
                {config.whitelistChannels.length > 0 && (
                  <div className="auto-moderator-selected-list">
                    {config.whitelistChannels.map((channelId) => {
                      const channel = channels.find((c) => c.id === channelId)
                      return (
                        <span key={channelId} className="auto-moderator-selected-tag whitelist">
                          {channel ? `#${channel.name}` : channelId}
                          <button
                            type="button"
                            onClick={() => handleToggleChannel(channelId, 'whitelistChannels')}
                            className="auto-moderator-word-remove"
                          >
                            ×
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}
                <div className="auto-moderator-multiselect">
                  {channels
                    .filter((c) => !config.whitelistChannels.includes(c.id))
                    .slice(0, 20)
                    .map((channel) => {
                      const isBlacklisted = config.blacklistChannels.includes(channel.id)
                      return (
                        <button
                          key={channel.id}
                          type="button"
                          className={`auto-moderator-tag ${isBlacklisted ? 'blocked' : ''}`}
                          onClick={() => handleToggleChannel(channel.id, 'whitelistChannels')}
                          disabled={isBlacklisted}
                        >
                          #{channel.name}
                        </button>
                      )
                    })}
                </div>
              </div>

              <div className="auto-moderator-section">
                <label>Blacklist Channels</label>
                <p className="auto-moderator-hint">
                  Channels where moderation is always active.
                </p>
                {config.blacklistChannels.length > 0 && (
                  <div className="auto-moderator-selected-list">
                    {config.blacklistChannels.map((channelId) => {
                      const channel = channels.find((c) => c.id === channelId)
                      return (
                        <span key={channelId} className="auto-moderator-selected-tag blacklist">
                          {channel ? `#${channel.name}` : channelId}
                          <button
                            type="button"
                            onClick={() => handleToggleChannel(channelId, 'blacklistChannels')}
                            className="auto-moderator-word-remove"
                          >
                            ×
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}
                <div className="auto-moderator-multiselect">
                  {channels
                    .filter((c) => !config.blacklistChannels.includes(c.id))
                    .slice(0, 20)
                    .map((channel) => {
                      const isWhitelisted = config.whitelistChannels.includes(channel.id)
                      return (
                        <button
                          key={channel.id}
                          type="button"
                          className={`auto-moderator-tag ${isWhitelisted ? 'whitelisted' : ''}`}
                          onClick={() => handleToggleChannel(channel.id, 'blacklistChannels')}
                          disabled={isWhitelisted}
                        >
                          #{channel.name}
                        </button>
                      )
                    })}
                </div>
              </div>

              <div className="auto-moderator-section">
                <label>Whitelist Roles</label>
                <p className="auto-moderator-hint">
                  Users with these roles are exempt from moderation.
                </p>
                {config.whitelistRoles.length > 0 && (
                  <div className="auto-moderator-selected-list">
                    {config.whitelistRoles.map((roleId) => {
                      const role = roles.find((r) => r.id === roleId)
                      return (
                        <span key={roleId} className="auto-moderator-selected-tag whitelist">
                          {role ? role.name : roleId}
                          <button
                            type="button"
                            onClick={() => handleToggleRole(roleId, 'whitelistRoles')}
                            className="auto-moderator-word-remove"
                          >
                            ×
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}
                <div className="auto-moderator-multiselect">
                  {roles
                    .filter((r) => !config.whitelistRoles.includes(r.id))
                    .slice(0, 20)
                    .map((role) => {
                      const isBlacklisted = config.blacklistRoles.includes(role.id)
                      return (
                        <button
                          key={role.id}
                          type="button"
                          className={`auto-moderator-tag ${isBlacklisted ? 'blocked' : ''}`}
                          onClick={() => handleToggleRole(role.id, 'whitelistRoles')}
                          disabled={isBlacklisted}
                        >
                          {role.name}
                        </button>
                      )
                    })}
                </div>
                  </div>

                  <div className="auto-moderator-section">
                    <label>Blacklist Roles</label>
                    <p className="auto-moderator-hint">
                      Users with these roles are always moderated.
                    </p>
                {config.blacklistRoles.length > 0 && (
                  <div className="auto-moderator-selected-list">
                    {config.blacklistRoles.map((roleId) => {
                      const role = roles.find((r) => r.id === roleId)
                      return (
                        <span key={roleId} className="auto-moderator-selected-tag blacklist">
                          {role ? role.name : roleId}
                          <button
                            type="button"
                            onClick={() => handleToggleRole(roleId, 'blacklistRoles')}
                            className="auto-moderator-word-remove"
                          >
                            ×
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}
                <div className="auto-moderator-multiselect">
                  {roles
                    .filter((r) => !config.blacklistRoles.includes(r.id))
                    .slice(0, 20)
                    .map((role) => {
                      const isWhitelisted = config.whitelistRoles.includes(role.id)
                      return (
                        <button
                          key={role.id}
                          type="button"
                          className={`auto-moderator-tag ${isWhitelisted ? 'whitelisted' : ''}`}
                          onClick={() => handleToggleRole(role.id, 'blacklistRoles')}
                          disabled={isWhitelisted}
                        >
                          {role.name}
                        </button>
                      )
                    })}
                </div>
                  </div>
                </div>
              </div>

              <div className="auto-moderator-actions">
                <button
                  onClick={handleSaveClick}
                  disabled={loading}
                  className="auto-moderator-button save"
                >
                  {loading ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </>
          )}
        </>
      )}

      <div className="auto-moderator-info">
        <h3>How it works:</h3>
        <ul>
          <li>Auto moderator checks all messages in your server</li>
          <li>Three severity levels: Low, Medium, High (each with different default word filters)</li>
          <li>Whitelist takes priority - if a word/user/channel/role is whitelisted, it won't be moderated</li>
          <li>Blacklist forces moderation - if a word/user/channel/role is blacklisted, it will always be moderated</li>
          <li>You can configure actions: delete, warn, timeout, kick, or ban</li>
          <li>Optional logging channel to track all moderation actions</li>
        </ul>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        title={
          confirmDialogState.type === 'save'
            ? 'Save Auto Moderator Configuration'
            : confirmDialogState.type === 'enable'
            ? confirmDialogState.data?.enabled
              ? 'Enable Auto Moderator'
              : 'Disable Auto Moderator'
            : confirmDialogState.type === 'removeWord'
            ? 'Remove Word'
            : confirmDialogState.type === 'removeUser'
            ? 'Remove User'
            : confirmDialogState.type === 'removeChannel'
            ? 'Remove Channel'
            : confirmDialogState.type === 'removeRole'
            ? 'Remove Role'
            : confirmDialogState.type === 'toggleUser'
            ? 'Add User to List'
            : confirmDialogState.type === 'toggleChannel'
            ? 'Add Channel to List'
            : confirmDialogState.type === 'toggleRole'
            ? 'Add Role to List'
            : 'Confirm Action'
        }
        message={
          confirmDialogState.type === 'save' ? (
            <div>
              <p>Are you sure you want to save this auto moderator configuration?</p>
              <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
                Server: <strong>{guilds.find((g) => g.id === config.guildId)?.name || 'Unknown'}</strong>
                <br />
                Status: <strong>{config.enabled ? 'Enabled' : 'Disabled'}</strong>
                {config.enabled && (
                  <>
                    <br />
                    Severity: <strong>{config.severityLevel}</strong>
                    <br />
                    Action: <strong>{config.actionOnViolation}</strong>
                  </>
                )}
              </p>
            </div>
          ) : confirmDialogState.type === 'enable' ? (
            <p>
              Are you sure you want to {confirmDialogState.data?.enabled ? 'enable' : 'disable'} the auto moderator?
            </p>
          ) : confirmDialogState.type === 'removeWord' ? (
            <p>
              Are you sure you want to remove <strong>"{confirmDialogState.data?.word}"</strong> from the{' '}
              {confirmDialogState.data?.listType === 'whitelistWords' ? 'whitelist' : 'blacklist'}?
            </p>
          ) : confirmDialogState.type === 'removeUser' ? (
            <p>
              Are you sure you want to remove <strong>{confirmDialogState.data?.memberName}</strong> from the{' '}
              {confirmDialogState.data?.listType === 'whitelistUsers' ? 'whitelist' : 'blacklist'}?
            </p>
          ) : confirmDialogState.type === 'removeChannel' ? (
            <p>
              Are you sure you want to remove <strong>{confirmDialogState.data?.channelName}</strong> from the{' '}
              {confirmDialogState.data?.listType === 'whitelistChannels' ? 'whitelist' : 'blacklist'}?
            </p>
          ) : confirmDialogState.type === 'removeRole' ? (
            <p>
              Are you sure you want to remove <strong>{confirmDialogState.data?.roleName}</strong> from the{' '}
              {confirmDialogState.data?.listType === 'whitelistRoles' ? 'whitelist' : 'blacklist'}?
            </p>
          ) : confirmDialogState.type === 'toggleUser' ? (
            <p>
              Add <strong>{confirmDialogState.data?.memberName}</strong> to{' '}
              {confirmDialogState.data?.listType === 'whitelistUsers' ? 'whitelist' : 'blacklist'}? This will remove
              them from the other list if they are in it.
            </p>
          ) : confirmDialogState.type === 'toggleChannel' ? (
            <p>
              Add <strong>{confirmDialogState.data?.channelName}</strong> to{' '}
              {confirmDialogState.data?.listType === 'whitelistChannels' ? 'whitelist' : 'blacklist'}? This will remove
              it from the other list if it is in it.
            </p>
          ) : confirmDialogState.type === 'toggleRole' ? (
            <p>
              Add <strong>{confirmDialogState.data?.roleName}</strong> to{' '}
              {confirmDialogState.data?.listType === 'whitelistRoles' ? 'whitelist' : 'blacklist'}? This will remove it
              from the other list if it is in it.
            </p>
          ) : (
            <p>Are you sure you want to perform this action?</p>
          )
        }
        confirmText={
          confirmDialogState.type === 'save'
            ? 'Save'
            : confirmDialogState.type === 'enable'
            ? confirmDialogState.data?.enabled
              ? 'Enable'
              : 'Disable'
            : 'Confirm'
        }
        cancelText="Cancel"
        onConfirm={() => {
          if (confirmDialogState.type === 'save') {
            handleSave()
          } else if (confirmDialogState.type === 'enable') {
            handleConfirmEnable()
          } else if (confirmDialogState.type === 'removeWord') {
            confirmRemoveWord()
          } else if (confirmDialogState.type === 'removeUser') {
            confirmRemoveUser()
          } else if (confirmDialogState.type === 'removeChannel') {
            confirmRemoveChannel()
          } else if (confirmDialogState.type === 'removeRole') {
            confirmRemoveRole()
          } else if (confirmDialogState.type === 'toggleUser') {
            confirmToggleUser()
          } else if (confirmDialogState.type === 'toggleChannel') {
            confirmToggleChannel()
          } else if (confirmDialogState.type === 'toggleRole') {
            confirmToggleRole()
          }
        }}
        onCancel={() => {
          setShowConfirmDialog(false)
          setConfirmDialogState({ type: null })
        }}
        variant={
          confirmDialogState.type === 'removeUser' ||
          confirmDialogState.type === 'removeChannel' ||
          confirmDialogState.type === 'removeRole' ||
          confirmDialogState.type === 'removeWord'
            ? 'warning'
            : 'default'
        }
      />
    </div>
  )
}

