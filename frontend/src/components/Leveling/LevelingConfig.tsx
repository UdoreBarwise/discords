import { useState, useEffect } from 'react'
import { levelingService, LevelingConfig as LevelingConfigType, LevelRoleReward } from '../../services/levelingService'
import { discordService, Guild, Channel, Role } from '../../services/discordService'
import { botService } from '../../services/botService'
import { useNotifications } from '../../contexts/NotificationContext'
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog'
import { HiChevronDown, HiChevronUp } from 'react-icons/hi'
import './LevelingConfig.css'

export default function LevelingConfig() {
  const { addNotification } = useNotifications()
  const [loading, setLoading] = useState(false)
  const [guilds, setGuilds] = useState<Guild[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [roleRewards, setRoleRewards] = useState<LevelRoleReward[]>([])
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmDialogState, setConfirmDialogState] = useState<{
    type: 'save' | 'enable' | 'removeChannel' | 'removeRole' | 'toggleChannel' | 'toggleRole' | 'removeRoleReward' | 'addRoleReward' | null
    data?: any
  }>({ type: null })
  const [newRoleRewardLevel, setNewRoleRewardLevel] = useState('')
  const [newRoleRewardRoleId, setNewRoleRewardRoleId] = useState('')
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    channels: false,
    roles: false,
    roleRewards: false,
  })

  const [config, setConfig] = useState<LevelingConfigType>({
    guildId: '',
    enabled: false,
    xpPerMessage: 10,
    xpPerReaction: 5,
    messageCooldownSeconds: 60,
    minMessageLength: 0,
    whitelistChannels: [],
    blacklistChannels: [],
    whitelistRoles: [],
    blacklistRoles: [],
    levelUpChannelId: null,
    levelUpMessage: null,
  })

  useEffect(() => {
    loadGuilds()
    loadDefaultServer()
  }, [])

  useEffect(() => {
    if (config.guildId) {
      loadGuildData(config.guildId)
      loadConfig(config.guildId)
      loadRoleRewards(config.guildId)
    }
  }, [config.guildId])

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

  const loadConfig = async (guildId: string) => {
    try {
      const data = await levelingService.getConfig(guildId)
      setConfig(data)
    } catch (error: any) {
      console.error('Failed to load config:', error)
    }
  }

  const loadRoleRewards = async (guildId: string) => {
    try {
      const data = await levelingService.getLevelRoleRewards(guildId)
      setRoleRewards(data)
    } catch (error: any) {
      console.error('Failed to load role rewards:', error)
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
      await levelingService.saveConfig(config)
      addNotification({
        type: 'success',
        title: 'Configuration Saved',
        message: 'Leveling configuration has been saved successfully',
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

  const handleAddRoleReward = () => {
    const level = parseInt(newRoleRewardLevel)
    if (!level || level < 1) {
      addNotification({
        type: 'warning',
        title: 'Invalid Level',
        message: 'Please enter a valid level (1 or higher)',
      })
      return
    }
    if (!newRoleRewardRoleId) {
      addNotification({
        type: 'warning',
        title: 'Missing Role',
        message: 'Please select a role',
      })
      return
    }
    if (roleRewards.some(r => r.level === level)) {
      addNotification({
        type: 'warning',
        title: 'Duplicate Level',
        message: 'A role reward already exists for this level',
      })
      return
    }
    setConfirmDialogState({ type: 'addRoleReward', data: { level, roleId: newRoleRewardRoleId } })
    setShowConfirmDialog(true)
  }

  const confirmAddRoleReward = async () => {
    const { level, roleId } = confirmDialogState.data
    try {
      await levelingService.saveLevelRoleReward(config.guildId, level, roleId)
      await loadRoleRewards(config.guildId)
      setNewRoleRewardLevel('')
      setNewRoleRewardRoleId('')
      addNotification({
        type: 'success',
        title: 'Role Reward Added',
        message: `Role reward for level ${level} has been added`,
      })
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Add Role Reward',
        message: error.response?.data?.error || 'Failed to add role reward',
      })
    }
    setShowConfirmDialog(false)
    setConfirmDialogState({ type: null })
  }

  const handleRemoveRoleReward = (level: number) => {
    const reward = roleRewards.find(r => r.level === level)
    const role = roles.find(r => r.id === reward?.roleId)
    setConfirmDialogState({ type: 'removeRoleReward', data: { level, roleName: role?.name || 'Unknown' } })
    setShowConfirmDialog(true)
  }

  const confirmRemoveRoleReward = async () => {
    const { level } = confirmDialogState.data
    try {
      await levelingService.deleteLevelRoleReward(config.guildId, level)
      await loadRoleRewards(config.guildId)
      addNotification({
        type: 'success',
        title: 'Role Reward Removed',
        message: `Role reward for level ${level} has been removed`,
      })
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Remove Role Reward',
        message: error.response?.data?.error || 'Failed to remove role reward',
      })
    }
    setShowConfirmDialog(false)
    setConfirmDialogState({ type: null })
  }

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  return (
    <div className="leveling-config">
      <div className="leveling-section">
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
          <div className="leveling-section">
            <div className="leveling-toggle-group">
              <label htmlFor="enable-leveling" className="leveling-toggle-label">
                Enable Leveling System
              </label>
              <label className="leveling-toggle-switch">
                <input
                  id="enable-leveling"
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => handleEnableToggle(e.target.checked)}
                  disabled={loading}
                />
                <span className="leveling-toggle-slider"></span>
              </label>
            </div>
          </div>

          {config.enabled && (
            <>
              <div className="leveling-section">
                <label htmlFor="xp-per-message">XP Per Message</label>
                <input
                  id="xp-per-message"
                  type="number"
                  min="0"
                  value={config.xpPerMessage}
                  onChange={(e) => setConfig({ ...config, xpPerMessage: parseInt(e.target.value) || 0 })}
                  disabled={loading}
                />
                <p className="leveling-hint">Amount of XP awarded for each message</p>
              </div>

              <div className="leveling-section">
                <label htmlFor="xp-per-reaction">XP Per Reaction</label>
                <input
                  id="xp-per-reaction"
                  type="number"
                  min="0"
                  value={config.xpPerReaction}
                  onChange={(e) => setConfig({ ...config, xpPerReaction: parseInt(e.target.value) || 0 })}
                  disabled={loading}
                />
                <p className="leveling-hint">Amount of XP awarded for each reaction</p>
              </div>

              <div className="leveling-section">
                <label htmlFor="message-cooldown">Message Cooldown (seconds)</label>
                <input
                  id="message-cooldown"
                  type="number"
                  min="0"
                  value={config.messageCooldownSeconds}
                  onChange={(e) => setConfig({ ...config, messageCooldownSeconds: parseInt(e.target.value) || 0 })}
                  disabled={loading}
                />
                <p className="leveling-hint">Minimum time between XP awards for messages</p>
              </div>

              <div className="leveling-section">
                <label htmlFor="min-message-length">Minimum Message Length</label>
                <input
                  id="min-message-length"
                  type="number"
                  min="0"
                  value={config.minMessageLength}
                  onChange={(e) => setConfig({ ...config, minMessageLength: parseInt(e.target.value) || 0 })}
                  disabled={loading}
                />
                <p className="leveling-hint">Minimum characters required for a message to award XP</p>
              </div>

              <div className="leveling-section">
                <label htmlFor="level-up-channel">Level Up Notification Channel (Optional)</label>
                <select
                  id="level-up-channel"
                  value={config.levelUpChannelId || ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      levelUpChannelId: e.target.value || null,
                    })
                  }
                  disabled={loading}
                >
                  <option value="">No notifications</option>
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      #{channel.name}
                    </option>
                  ))}
                </select>
                <p className="leveling-hint">Channel where level up notifications will be sent</p>
              </div>

              <div className="leveling-section">
                <label htmlFor="level-up-message">Level Up Message Template (Optional)</label>
                <input
                  id="level-up-message"
                  type="text"
                  placeholder="🎉 Congratulations {user}! You reached level {level}!"
                  value={config.levelUpMessage || ''}
                  onChange={(e) => setConfig({ ...config, levelUpMessage: e.target.value || null })}
                  disabled={loading}
                />
                <p className="leveling-hint">Use {user} for user mention and {level} for level number</p>
              </div>

              <div className="leveling-section-group">
                <div
                  className="leveling-collapsible-header"
                  onClick={() => toggleSection('channels')}
                >
                  <h3>Channel Filters</h3>
                  {collapsedSections.channels ? (
                    <HiChevronDown className="leveling-collapsible-icon" />
                  ) : (
                    <HiChevronUp className="leveling-collapsible-icon" />
                  )}
                </div>
                <div className={`leveling-collapsible-content ${collapsedSections.channels ? 'collapsed' : ''}`}>
                  <div className="leveling-section">
                    <label>Whitelist Channels</label>
                    <p className="leveling-hint">
                      Only count XP in these channels. Leave empty to count in all channels (except blacklisted).
                    </p>
                    {config.whitelistChannels.length > 0 && (
                      <div className="leveling-selected-list">
                        {config.whitelistChannels.map((channelId) => {
                          const channel = channels.find((c) => c.id === channelId)
                          return (
                            <span key={channelId} className="leveling-selected-tag whitelist">
                              {channel ? `#${channel.name}` : channelId}
                              <button
                                type="button"
                                onClick={() => handleToggleChannel(channelId, 'whitelistChannels')}
                                className="leveling-word-remove"
                              >
                                ×
                              </button>
                            </span>
                          )
                        })}
                      </div>
                    )}
                    <div className="leveling-multiselect">
                      {channels
                        .filter((c) => !config.whitelistChannels.includes(c.id))
                        .slice(0, 20)
                        .map((channel) => {
                          const isBlacklisted = config.blacklistChannels.includes(channel.id)
                          return (
                            <button
                              key={channel.id}
                              type="button"
                              className={`leveling-tag ${isBlacklisted ? 'blocked' : ''}`}
                              onClick={() => handleToggleChannel(channel.id, 'whitelistChannels')}
                              disabled={isBlacklisted}
                            >
                              #{channel.name}
                            </button>
                          )
                        })}
                    </div>
                  </div>

                  <div className="leveling-section">
                    <label>Blacklist Channels</label>
                    <p className="leveling-hint">
                      Don't count XP in these channels.
                    </p>
                    {config.blacklistChannels.length > 0 && (
                      <div className="leveling-selected-list">
                        {config.blacklistChannels.map((channelId) => {
                          const channel = channels.find((c) => c.id === channelId)
                          return (
                            <span key={channelId} className="leveling-selected-tag blacklist">
                              {channel ? `#${channel.name}` : channelId}
                              <button
                                type="button"
                                onClick={() => handleToggleChannel(channelId, 'blacklistChannels')}
                                className="leveling-word-remove"
                              >
                                ×
                              </button>
                            </span>
                          )
                        })}
                      </div>
                    )}
                    <div className="leveling-multiselect">
                      {channels
                        .filter((c) => !config.blacklistChannels.includes(c.id))
                        .slice(0, 20)
                        .map((channel) => {
                          const isWhitelisted = config.whitelistChannels.includes(channel.id)
                          return (
                            <button
                              key={channel.id}
                              type="button"
                              className={`leveling-tag ${isWhitelisted ? 'whitelisted' : ''}`}
                              onClick={() => handleToggleChannel(channel.id, 'blacklistChannels')}
                              disabled={isWhitelisted}
                            >
                              #{channel.name}
                            </button>
                          )
                        })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="leveling-section-group">
                <div
                  className="leveling-collapsible-header"
                  onClick={() => toggleSection('roles')}
                >
                  <h3>Role Filters</h3>
                  {collapsedSections.roles ? (
                    <HiChevronDown className="leveling-collapsible-icon" />
                  ) : (
                    <HiChevronUp className="leveling-collapsible-icon" />
                  )}
                </div>
                <div className={`leveling-collapsible-content ${collapsedSections.roles ? 'collapsed' : ''}`}>
                  <div className="leveling-section">
                    <label>Whitelist Roles</label>
                    <p className="leveling-hint">
                      Only users with these roles gain XP. Leave empty to allow all users (except blacklisted roles).
                    </p>
                    {config.whitelistRoles.length > 0 && (
                      <div className="leveling-selected-list">
                        {config.whitelistRoles.map((roleId) => {
                          const role = roles.find((r) => r.id === roleId)
                          return (
                            <span key={roleId} className="leveling-selected-tag whitelist">
                              {role ? role.name : roleId}
                              <button
                                type="button"
                                onClick={() => handleToggleRole(roleId, 'whitelistRoles')}
                                className="leveling-word-remove"
                              >
                                ×
                              </button>
                            </span>
                          )
                        })}
                      </div>
                    )}
                    <div className="leveling-multiselect">
                      {roles
                        .filter((r) => !config.whitelistRoles.includes(r.id))
                        .slice(0, 20)
                        .map((role) => {
                          const isBlacklisted = config.blacklistRoles.includes(role.id)
                          return (
                            <button
                              key={role.id}
                              type="button"
                              className={`leveling-tag ${isBlacklisted ? 'blocked' : ''}`}
                              onClick={() => handleToggleRole(role.id, 'whitelistRoles')}
                              disabled={isBlacklisted}
                            >
                              {role.name}
                            </button>
                          )
                        })}
                    </div>
                  </div>

                  <div className="leveling-section">
                    <label>Blacklist Roles</label>
                    <p className="leveling-hint">
                      Users with these roles don't gain XP.
                    </p>
                    {config.blacklistRoles.length > 0 && (
                      <div className="leveling-selected-list">
                        {config.blacklistRoles.map((roleId) => {
                          const role = roles.find((r) => r.id === roleId)
                          return (
                            <span key={roleId} className="leveling-selected-tag blacklist">
                              {role ? role.name : roleId}
                              <button
                                type="button"
                                onClick={() => handleToggleRole(roleId, 'blacklistRoles')}
                                className="leveling-word-remove"
                              >
                                ×
                              </button>
                            </span>
                          )
                        })}
                      </div>
                    )}
                    <div className="leveling-multiselect">
                      {roles
                        .filter((r) => !config.blacklistRoles.includes(r.id))
                        .slice(0, 20)
                        .map((role) => {
                          const isWhitelisted = config.whitelistRoles.includes(role.id)
                          return (
                            <button
                              key={role.id}
                              type="button"
                              className={`leveling-tag ${isWhitelisted ? 'whitelisted' : ''}`}
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

              <div className="leveling-section-group">
                <div
                  className="leveling-collapsible-header"
                  onClick={() => toggleSection('roleRewards')}
                >
                  <h3>Role Rewards</h3>
                  {collapsedSections.roleRewards ? (
                    <HiChevronDown className="leveling-collapsible-icon" />
                  ) : (
                    <HiChevronUp className="leveling-collapsible-icon" />
                  )}
                </div>
                <div className={`leveling-collapsible-content ${collapsedSections.roleRewards ? 'collapsed' : ''}`}>
                  <div className="leveling-section">
                    <label>Add Role Reward</label>
                    <p className="leveling-hint">
                      Automatically assign a role when users reach a specific level.
                    </p>
                    <div className="leveling-role-reward-input">
                      <input
                        type="number"
                        min="1"
                        placeholder="Level"
                        value={newRoleRewardLevel}
                        onChange={(e) => setNewRoleRewardLevel(e.target.value)}
                        disabled={loading}
                      />
                      <select
                        value={newRoleRewardRoleId}
                        onChange={(e) => setNewRoleRewardRoleId(e.target.value)}
                        disabled={loading}
                      >
                        <option value="">Select a role</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAddRoleReward}
                        disabled={loading || !newRoleRewardLevel || !newRoleRewardRoleId}
                        className="leveling-add-button"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {roleRewards.length > 0 && (
                    <div className="leveling-section">
                      <label>Current Role Rewards</label>
                      <div className="leveling-selected-list">
                        {roleRewards.map((reward) => {
                          const role = roles.find((r) => r.id === reward.roleId)
                          return (
                            <span key={reward.level} className="leveling-selected-tag">
                              Level {reward.level}: {role ? role.name : reward.roleId}
                              <button
                                type="button"
                                onClick={() => handleRemoveRoleReward(reward.level)}
                                className="leveling-word-remove"
                              >
                                ×
                              </button>
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="leveling-actions">
                <button
                  onClick={handleSaveClick}
                  disabled={loading}
                  className="leveling-button save"
                >
                  {loading ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </>
          )}
        </>
      )}

      <div className="leveling-info">
        <h3>How it works:</h3>
        <ul>
          <li>Users gain XP by sending messages and adding reactions</li>
          <li>Levels are calculated using an exponential formula: level = floor(sqrt(xp / 100))</li>
          <li>Whitelist channels: Only count XP in these channels (if any are selected)</li>
          <li>Blacklist channels: Never count XP in these channels</li>
          <li>Whitelist roles: Only users with these roles gain XP (if any are selected)</li>
          <li>Blacklist roles: Users with these roles never gain XP</li>
          <li>Role rewards: Automatically assign roles when users reach specific levels</li>
          <li>Cooldown prevents spam by requiring time between XP awards</li>
        </ul>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        title={
          confirmDialogState.type === 'save'
            ? 'Save Leveling Configuration'
            : confirmDialogState.type === 'enable'
            ? confirmDialogState.data?.enabled
              ? 'Enable Leveling System'
              : 'Disable Leveling System'
            : confirmDialogState.type === 'removeChannel'
            ? 'Remove Channel'
            : confirmDialogState.type === 'removeRole'
            ? 'Remove Role'
            : confirmDialogState.type === 'toggleChannel'
            ? 'Add Channel to List'
            : confirmDialogState.type === 'toggleRole'
            ? 'Add Role to List'
            : confirmDialogState.type === 'addRoleReward'
            ? 'Add Role Reward'
            : confirmDialogState.type === 'removeRoleReward'
            ? 'Remove Role Reward'
            : 'Confirm Action'
        }
        message={
          confirmDialogState.type === 'save' ? (
            <div>
              <p>Are you sure you want to save this leveling configuration?</p>
              <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
                Server: <strong>{guilds.find((g) => g.id === config.guildId)?.name || 'Unknown'}</strong>
                <br />
                Status: <strong>{config.enabled ? 'Enabled' : 'Disabled'}</strong>
                {config.enabled && (
                  <>
                    <br />
                    XP Per Message: <strong>{config.xpPerMessage}</strong>
                    <br />
                    XP Per Reaction: <strong>{config.xpPerReaction}</strong>
                  </>
                )}
              </p>
            </div>
          ) : confirmDialogState.type === 'enable' ? (
            <p>
              Are you sure you want to {confirmDialogState.data?.enabled ? 'enable' : 'disable'} the leveling system?
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
          ) : confirmDialogState.type === 'addRoleReward' ? (
            <p>
              Add role reward for level <strong>{confirmDialogState.data?.level}</strong>? Users reaching this level will automatically receive the role.
            </p>
          ) : confirmDialogState.type === 'removeRoleReward' ? (
            <p>
              Are you sure you want to remove the role reward for level <strong>{confirmDialogState.data?.level}</strong>?
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
          } else if (confirmDialogState.type === 'removeChannel') {
            confirmRemoveChannel()
          } else if (confirmDialogState.type === 'removeRole') {
            confirmRemoveRole()
          } else if (confirmDialogState.type === 'toggleChannel') {
            confirmToggleChannel()
          } else if (confirmDialogState.type === 'toggleRole') {
            confirmToggleRole()
          } else if (confirmDialogState.type === 'addRoleReward') {
            confirmAddRoleReward()
          } else if (confirmDialogState.type === 'removeRoleReward') {
            confirmRemoveRoleReward()
          }
        }}
        onCancel={() => {
          setShowConfirmDialog(false)
          setConfirmDialogState({ type: null })
        }}
        variant={
          confirmDialogState.type === 'removeChannel' ||
          confirmDialogState.type === 'removeRole' ||
          confirmDialogState.type === 'removeRoleReward'
            ? 'warning'
            : 'default'
        }
      />
    </div>
  )
}

