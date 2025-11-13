import { useState, useEffect } from 'react'
import { aiService, AIGuildConfig, AIPersonality, AIProvider, ChannelConfig } from '../../services/aiService'
import { discordService, Channel, Role, Member } from '../../services/discordService'
import { botService } from '../../services/botService'
import { useNotifications } from '../../contexts/NotificationContext'
import { useServer } from '../../contexts/ServerContext'
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog'
import AIGlobalSettings from './AIGlobalSettings'
import './AIConfig.css'

export default function AIConfig() {
  const { addNotification } = useNotifications()
  const { selectedServerId, isLoading: serverLoading } = useServer()
  const [loading, setLoading] = useState(false)
  const [channels, setChannels] = useState<Channel[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const [config, setConfig] = useState<AIGuildConfig>({
    guildId: '',
    allowedChannelIds: [],
    rateLimitPerMinute: 5,
    rateLimitPerHour: 50,
    blockedUserIds: [],
    allowedRoleIds: [],
  })
  const [aiResponseChannelIds, setAiResponseChannelIds] = useState<string[]>([])
  const [channelConfigs, setChannelConfigs] = useState<Record<string, ChannelConfig>>({})
  const [selectedChannelForConfig, setSelectedChannelForConfig] = useState<string>('')
  const [globalConfig, setGlobalConfig] = useState<{ provider: AIProvider; providerUrl: string; model: string; availableModels: string[] } | null>(null)
  const [channelAvailableModels, setChannelAvailableModels] = useState<Record<string, string[]>>({})
  const [loadingChannelModels, setLoadingChannelModels] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (selectedServerId && !config.guildId) {
      setConfig({ ...config, guildId: selectedServerId })
    }
  }, [selectedServerId])

  useEffect(() => {
    if (config.guildId) {
      loadGuildData(config.guildId)
      loadConfig(config.guildId)
      loadAIResponseChannel()
    }
  }, [config.guildId])

  const loadAIResponseChannel = async () => {
    try {
      const channelIds = await botService.getAIResponseChannels()
      setAiResponseChannelIds(channelIds || [])
    } catch (error) {
      console.error('Failed to load AI response channels:', error)
    }
  }

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
      const [channelsData, rolesData] = await Promise.all([
        discordService.getChannels(guildId),
        discordService.getRoles(guildId),
      ])
      setChannels(channelsData)
      setRoles(rolesData)
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Load Guild Data',
        message: error.response?.data?.error || 'Failed to fetch guild data',
      })
    }
  }

  const searchMembers = async (guildId: string, query: string) => {
    try {
      const data = await discordService.getMembers(guildId, query)
      setMembers(data)
    } catch (error: any) {
      console.error('Failed to search members:', error)
    }
  }

  const loadConfig = async (guildId: string) => {
    setLoading(true)
    try {
      const data = await aiService.getGuildConfig(guildId)
      setConfig({
        ...config,
        ...data,
        allowedChannelIds: data.allowedChannelIds || [],
        blockedUserIds: data.blockedUserIds || [],
        allowedRoleIds: data.allowedRoleIds || [],
      })
      setChannelConfigs(data.channelConfigs || {})
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Load Config',
        message: error.response?.data?.error || 'Failed to fetch AI configuration',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const loadGlobalConfig = async () => {
      try {
        const global = await aiService.getConfig()
        setGlobalConfig({
          provider: global.provider,
          providerUrl: global.providerUrl,
          model: global.model,
          availableModels: [], // Will be loaded when needed
        })
      } catch (error) {
        console.error('Failed to load global config:', error)
      }
    }
    loadGlobalConfig()
  }, [])

  const toggleChannel = (channelId: string) => {
    const current = config.allowedChannelIds || []
    if (current.includes(channelId)) {
      setConfig({
        ...config,
        allowedChannelIds: current.filter((id) => id !== channelId),
      })
    } else {
      setConfig({
        ...config,
        allowedChannelIds: [...current, channelId],
      })
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

  const toggleBlockedUser = (userId: string) => {
    const current = config.blockedUserIds || []
    if (current.includes(userId)) {
      setConfig({
        ...config,
        blockedUserIds: current.filter((id) => id !== userId),
      })
    } else {
      setConfig({
        ...config,
        blockedUserIds: [...current, userId],
      })
    }
  }

  const handleSaveClick = () => {
    setShowConfirmDialog(true)
  }

  const handleSaveConfirm = async () => {
    setShowConfirmDialog(false)
    setLoading(true)

    try {
      await Promise.all([
        aiService.saveGuildConfig({ ...config, channelConfigs }),
        botService.setAIResponseChannels(aiResponseChannelIds)
      ])
      addNotification({
        type: 'success',
        title: 'Configuration Saved',
        message: 'AI configuration has been saved successfully',
      })
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: error.response?.data?.error || 'Failed to save AI configuration',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchChannelModels = async (channelId: string, provider: AIProvider, providerUrl?: string) => {
    if (provider === 'deepseek') {
      setChannelAvailableModels(prev => ({
        ...prev,
        [channelId]: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner']
      }))
      return
    }

    setLoadingChannelModels(prev => ({ ...prev, [channelId]: true }))
    try {
      const models = await aiService.getAvailableModels(provider, providerUrl)
      setChannelAvailableModels(prev => ({
        ...prev,
        [channelId]: models
      }))
    } catch (error) {
      console.error('Failed to fetch models for channel:', error)
      setChannelAvailableModels(prev => ({
        ...prev,
        [channelId]: []
      }))
    } finally {
      setLoadingChannelModels(prev => ({ ...prev, [channelId]: false }))
    }
  }

  const updateChannelConfig = (channelId: string, updates: Partial<ChannelConfig>) => {
    setChannelConfigs(prev => {
      const newConfig = {
        ...prev,
        [channelId]: {
          ...prev[channelId],
          ...updates,
        }
      }

      // If provider changed, fetch models for that provider
      if (updates.provider !== undefined && updates.provider) {
        const providerUrl = updates.providerUrl || newConfig[channelId]?.providerUrl || globalConfig?.providerUrl
        fetchChannelModels(channelId, updates.provider, providerUrl)
      }

      return newConfig
    })
  }

  const removeChannelConfig = (channelId: string) => {
    setChannelConfigs(prev => {
      const newConfigs = { ...prev }
      delete newConfigs[channelId]
      return newConfigs
    })
  }

  if (!selectedServerId && !serverLoading) {
    return (
      <div className="ai-config">
        <div className="ai-config-section">
          <p>No server selected.</p>
          <p>Please select a default server in Settings to configure AI settings.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="ai-config">
      <AIGlobalSettings />
      
      <div className="ai-config-divider"></div>

      <div className="ai-config-section full-width">
        <h3>AI Response Channels</h3>
        <p className="ai-config-hint">
          Select channels where the bot will respond to ALL messages without needing to be mentioned or replied to. Leave empty to disable.
        </p>
        <div style={{
          maxHeight: '300px',
          overflowY: 'auto',
          border: '1px solid var(--border-color, #444)',
          borderRadius: '8px',
          padding: '0.75rem',
          background: 'var(--input-bg, #2a2a2a)',
          marginBottom: '1rem',
        }}>
          {channels.filter((ch: Channel) => ch.type === 0).length === 0 ? (
            <p style={{ color: 'var(--text-secondary, #ccc)', fontStyle: 'italic' }}>
              No text channels available
            </p>
          ) : (
            channels.filter((ch: Channel) => ch.type === 0).map((channel: Channel) => (
              <label
                key={channel.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.5rem',
                  cursor: loading || !config.guildId ? 'not-allowed' : 'pointer',
                  opacity: loading || !config.guildId ? 0.5 : 1,
                  borderRadius: '4px',
                  marginBottom: '0.25rem',
                }}
                onMouseEnter={(e) => {
                  if (!loading && config.guildId) {
                    e.currentTarget.style.background = 'var(--hover-bg, #2a2a2a)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <input
                  type="checkbox"
                  checked={aiResponseChannelIds.includes(channel.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setAiResponseChannelIds([...aiResponseChannelIds, channel.id])
                    } else {
                      setAiResponseChannelIds(aiResponseChannelIds.filter(id => id !== channel.id))
                    }
                  }}
                  disabled={loading || !config.guildId}
                  style={{
                    marginRight: '0.75rem',
                    cursor: loading || !config.guildId ? 'not-allowed' : 'pointer',
                  }}
                />
                <span style={{ color: 'var(--text-color, #fff)' }}>#{channel.name}</span>
              </label>
            ))
          )}
        </div>
        <p className="ai-config-hint" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
          {aiResponseChannelIds.length > 0 
            ? `Bot will respond to all messages in ${aiResponseChannelIds.length} channel${aiResponseChannelIds.length > 1 ? 's' : ''} without needing to be mentioned.`
            : 'Bot will only respond when mentioned or replied to.'}
        </p>
      </div>


      <div className="ai-config-section full-width">
        <h3>Channel-Specific Configuration</h3>
        <p className="ai-config-hint">
          Configure different AI models and personalities for specific channels. Leave empty to use global settings.
        </p>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Add Configuration for Channel:</label>
          <select
            value={selectedChannelForConfig}
            onChange={(e) => setSelectedChannelForConfig(e.target.value)}
            disabled={loading || !config.guildId}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              background: 'var(--input-bg, #2a2a2a)',
              color: 'var(--text-color, #fff)',
              border: '1px solid var(--border-color, #444)',
              borderRadius: '8px',
              marginBottom: '0.5rem',
            }}
          >
            <option value="">Select a channel...</option>
            {channels.filter((ch: Channel) => ch.type === 0).map((channel: Channel) => (
              <option key={channel.id} value={channel.id}>
                #{channel.name}
              </option>
            ))}
          </select>
          
          {selectedChannelForConfig && (
            <div style={{ padding: '1rem', background: 'var(--card-bg, #1a1a1a)', borderRadius: '8px', marginTop: '0.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Provider:</label>
                <select
                  value={channelConfigs[selectedChannelForConfig]?.provider || ''}
                  onChange={(e) => {
                    const provider = e.target.value as AIProvider || undefined
                    updateChannelConfig(selectedChannelForConfig, { provider })
                    // Fetch models when provider is selected
                    if (provider) {
                      const providerUrl = channelConfigs[selectedChannelForConfig]?.providerUrl || globalConfig?.providerUrl
                      fetchChannelModels(selectedChannelForConfig, provider, providerUrl)
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '0.9rem',
                    background: 'var(--input-bg, #2a2a2a)',
                    color: 'var(--text-color, #fff)',
                    border: '1px solid var(--border-color, #444)',
                    borderRadius: '4px',
                  }}
                >
                  <option value="">Use global ({globalConfig?.provider || 'deepseek'})</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="ollama">Ollama</option>
                </select>
              </div>
              
              {channelConfigs[selectedChannelForConfig]?.provider && channelConfigs[selectedChannelForConfig]?.provider !== 'deepseek' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Provider URL:</label>
                  <input
                    type="text"
                    value={channelConfigs[selectedChannelForConfig]?.providerUrl || ''}
                    onChange={(e) => {
                      const providerUrl = e.target.value || undefined
                      updateChannelConfig(selectedChannelForConfig, { providerUrl })
                      // Refetch models if provider URL changes
                      const provider = channelConfigs[selectedChannelForConfig]?.provider
                      if (provider) {
                        fetchChannelModels(selectedChannelForConfig, provider, providerUrl)
                      }
                    }}
                    placeholder={channelConfigs[selectedChannelForConfig]?.provider === 'ollama' ? 'http://localhost:11434' : ''}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      fontSize: '0.9rem',
                      background: 'var(--input-bg, #2a2a2a)',
                      color: 'var(--text-color, #fff)',
                      border: '1px solid var(--border-color, #444)',
                      borderRadius: '4px',
                    }}
                  />
                </div>
              )}
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Model:</label>
                <select
                  value={channelConfigs[selectedChannelForConfig]?.model || ''}
                  onChange={(e) => updateChannelConfig(selectedChannelForConfig, { model: e.target.value || undefined })}
                  disabled={loadingChannelModels[selectedChannelForConfig]}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '0.9rem',
                    background: 'var(--input-bg, #2a2a2a)',
                    color: 'var(--text-color, #fff)',
                    border: '1px solid var(--border-color, #444)',
                    borderRadius: '4px',
                  }}
                >
                  <option value="">Use global ({globalConfig?.model || 'deepseek-chat'})</option>
                  {channelAvailableModels[selectedChannelForConfig]?.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
                {loadingChannelModels[selectedChannelForConfig] && (
                  <p style={{ marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary, #ccc)' }}>
                    Loading models...
                  </p>
                )}
                {channelConfigs[selectedChannelForConfig]?.provider && !channelAvailableModels[selectedChannelForConfig]?.length && !loadingChannelModels[selectedChannelForConfig] && (
                  <p style={{ marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary, #ccc)' }}>
                    No models available. Make sure the provider is running.
                  </p>
                )}
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Personality:</label>
                <select
                  value={channelConfigs[selectedChannelForConfig]?.personality || ''}
                  onChange={(e) => updateChannelConfig(selectedChannelForConfig, { personality: e.target.value as AIPersonality || undefined })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '0.9rem',
                    background: 'var(--input-bg, #2a2a2a)',
                    color: 'var(--text-color, #fff)',
                    border: '1px solid var(--border-color, #444)',
                    borderRadius: '4px',
                  }}
                >
                  <option value="">Use global ({personality})</option>
                  <option value="normal">Normal - Helpful and friendly</option>
                  <option value="rude">Rude - Unfiltered, swears, no filter</option>
                  <option value="professional">Professional - Formal and business-like</option>
                  <option value="friendly">Friendly - Warm and enthusiastic</option>
                  <option value="sarcastic">Sarcastic - Witty and ironic</option>
                </select>
              </div>
              
              <button
                type="button"
                onClick={() => {
                  removeChannelConfig(selectedChannelForConfig)
                  setSelectedChannelForConfig('')
                }}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'var(--error-bg, #f44336)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                Remove Configuration
              </button>
            </div>
          )}
        </div>
        
        {Object.keys(channelConfigs).length > 0 && (
          <div>
            <p style={{ marginBottom: '0.5rem', fontWeight: 500 }}>Configured Channels:</p>
            {Object.entries(channelConfigs).map(([channelId, channelConfig]) => {
              const channel = channels.find((ch: Channel) => ch.id === channelId)
              return (
                <div key={channelId} style={{ padding: '0.75rem', background: 'var(--card-bg, #1a1a1a)', borderRadius: '4px', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>#{channel?.name || channelId}</strong>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #ccc)', marginTop: '0.25rem' }}>
                      Provider: {channelConfig.provider || 'global'} | 
                      Model: {channelConfig.model || 'global'} | 
                      Personality: {channelConfig.personality || 'global'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeChannelConfig(channelId)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      background: 'var(--error-bg, #f44336)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                    }}
                  >
                    Remove
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="ai-config-section full-width">
        <label>Allowed Channels (Optional)</label>
        <p className="ai-config-hint">
          Select channels where AI can respond. Leave empty to allow all channels.
        </p>
        {config.allowedChannelIds && config.allowedChannelIds.length > 0 && (
          <div style={{ marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary, #ccc)' }}>
            {config.allowedChannelIds.length} channel{config.allowedChannelIds.length !== 1 ? 's' : ''} selected
          </div>
        )}
        <div className="ai-config-multiselect">
          {channels.map((channel) => {
            const isSelected = config.allowedChannelIds?.includes(channel.id)
            return (
              <button
                key={channel.id}
                type="button"
                className={`ai-config-tag ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleChannel(channel.id)}
              >
                #{channel.name}
              </button>
            )
          })}
        </div>
      </div>

      <div className="ai-config-section">
        <label htmlFor="rate-limit-minute">Rate Limit (per minute)</label>
        <input
          id="rate-limit-minute"
          type="number"
          min="1"
          max="60"
          value={config.rateLimitPerMinute}
          onChange={(e) =>
            setConfig({
              ...config,
              rateLimitPerMinute: parseInt(e.target.value) || 5,
            })
          }
          disabled={loading}
        />
        <p className="ai-config-hint">Maximum AI responses per user per minute (1-60)</p>
      </div>

      <div className="ai-config-section">
        <label htmlFor="rate-limit-hour">Rate Limit (per hour)</label>
        <input
          id="rate-limit-hour"
          type="number"
          min="1"
          max="500"
          value={config.rateLimitPerHour}
          onChange={(e) =>
            setConfig({
              ...config,
              rateLimitPerHour: parseInt(e.target.value) || 50,
            })
          }
          disabled={loading}
        />
        <p className="ai-config-hint">Maximum AI responses per user per hour (1-500)</p>
      </div>

      <div className="ai-config-section full-width">
        <label>Allowed Roles (Optional)</label>
        <p className="ai-config-hint">
          Select roles that can use AI. Leave empty to allow all users.
        </p>
        {config.allowedRoleIds && config.allowedRoleIds.length > 0 && (
          <div style={{ marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary, #ccc)' }}>
            {config.allowedRoleIds.length} role{config.allowedRoleIds.length !== 1 ? 's' : ''} selected
          </div>
        )}
        <div className="ai-config-multiselect">
          {roles.map((role) => {
            const isSelected = config.allowedRoleIds?.includes(role.id)
            return (
              <button
                key={role.id}
                type="button"
                className={`ai-config-tag ${isSelected ? 'selected' : ''}`}
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

      <div className="ai-config-section full-width">
        <label>Blocked Users</label>
        <p className="ai-config-hint">Search and select users to block from using AI.</p>
        {config.blockedUserIds && config.blockedUserIds.length > 0 && (
          <div style={{ marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--error-bg, #f44336)' }}>
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
        <div className="ai-config-multiselect">
          {members.slice(0, 20).map((member) => {
            const isSelected = config.blockedUserIds?.includes(member.id)
            return (
              <button
                key={member.id}
                type="button"
                className={`ai-config-tag ${isSelected ? 'selected blocked' : ''}`}
                onClick={() => toggleBlockedUser(member.id)}
              >
                {member.displayName || member.username}
              </button>
            )
          })}
        </div>
      </div>

      <div className="ai-config-actions">
        <button
          onClick={handleSaveClick}
          disabled={loading}
          className="ai-config-save-button"
        >
          {loading ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Save AI Configuration"
        message="Are you sure you want to save these AI configuration settings?"
        confirmText="Save"
        cancelText="Cancel"
        onConfirm={handleSaveConfirm}
        onCancel={() => setShowConfirmDialog(false)}
        variant="default"
      />
    </div>
  )
}

