import { useState, useEffect } from 'react'
import { serverSetupService, SetupOptions, SetupResult } from '../../services/serverSetupService'
import { discordService, Guild } from '../../services/discordService'
import { useNotifications } from '../../contexts/NotificationContext'
import './ServerSetup.css'

export default function ServerSetup() {
  const { addNotification } = useNotifications()
  const [loading, setLoading] = useState(false)
  const [guilds, setGuilds] = useState<Guild[]>([])
  const [selectedGuildId, setSelectedGuildId] = useState('')
  const [setupResult, setSetupResult] = useState<SetupResult | null>(null)

  const [options, setOptions] = useState<SetupOptions>({
    nukeServer: false,
    configureTickets: true,
    configureAutoRoles: true,
    configureAIChannels: true,
    configureYouTubeNotifications: true,
    configureDiceGame: true,
    configureWordle: true,
    configureBotConfig: true,
    configureExchangeRate: true,
    configureScoreboard: true,
    configureF1: true,
    configureLeveling: true,
    configureMeme: true,
    roleNames: {
      admin: 'Admin',
      moderator: 'Moderator',
      supportStaff: 'Support Staff',
      member: 'Member',
    },
    channelNames: {
      general: 'general',
      welcome: 'welcome',
      tickets: 'tickets',
      games: 'games',
      support: 'support',
      autoRoles: 'get-roles',
    },
  })

  useEffect(() => {
    loadGuilds()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadGuilds = async () => {
    try {
      const data = await discordService.getGuilds()
      setGuilds(data.filter((g) => g.hasManageChannels))
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Load Guilds',
        message: error.response?.data?.error || 'Failed to fetch Discord servers',
      })
    }
  }

  const handleSetup = async () => {
    if (!selectedGuildId) {
      addNotification({
        type: 'warning',
        title: 'No Server Selected',
        message: 'Please select a Discord server to set up',
      })
      return
    }

    setLoading(true)
    setSetupResult(null)

    try {
      const response = await serverSetupService.setupServer(selectedGuildId, options)
      setSetupResult(response.result)
      addNotification({
        type: 'success',
        title: 'Server Setup Complete',
        message: response.message || 'Server has been set up successfully',
      })
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Setup Failed',
        message: error.response?.data?.error || 'Failed to set up server',
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedGuild = guilds.find((g) => g.id === selectedGuildId)

  return (
    <div className="server-setup">
      <div className="server-setup-header">
        <h2>Server Setup</h2>
        <p>Initialize your Discord server with roles, channels, and bot services</p>
      </div>

      <div className="server-setup-content">
        <div className="server-setup-section">
          <h3>Server Selection</h3>
          <div className="form-group">
            <label htmlFor="guild-select">Select Server</label>
            <select
              id="guild-select"
              value={selectedGuildId}
              onChange={(e) => setSelectedGuildId(e.target.value)}
              disabled={loading}
            >
              <option value="">Choose a server...</option>
              {guilds.map((guild) => (
                <option key={guild.id} value={guild.id}>
                  {guild.name}
                </option>
              ))}
            </select>
            {selectedGuild && (
              <div className="guild-info">
                {selectedGuild.icon && (
                  <img
                    src={selectedGuild.icon}
                    alt={selectedGuild.name}
                    className="guild-icon"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                )}
                <span>{selectedGuild.name}</span>
                <span className="guild-members">{selectedGuild.memberCount} members</span>
              </div>
            )}
          </div>
        </div>

        <div className="server-setup-section">
          <h3>Danger Zone (Optional)</h3>
          <div className="form-group" style={{ 
            padding: '1rem', 
            background: 'var(--warning-bg, #3a2a1a)', 
            border: '2px solid var(--warning-border, #5a4a3a)', 
            borderRadius: '8px',
            marginBottom: '1.5rem'
          }}>
            <div className="server-setup-toggle-group">
              <label htmlFor="nuke-server" className="server-setup-toggle-label" style={{ color: 'var(--warning-text, #ffa500)', fontWeight: 'bold' }}>
                Nuke Server (Delete All Existing Roles & Channels)
              </label>
              <label className="server-setup-toggle-switch">
                <input
                  id="nuke-server"
                  type="checkbox"
                  checked={options.nukeServer || false}
                  onChange={(e) =>
                    setOptions({ ...options, nukeServer: e.target.checked })
                  }
                  disabled={loading}
                />
                <span className="server-setup-toggle-slider"></span>
              </label>
            </div>
            <p className="form-help" style={{ color: 'var(--warning-text, #ffa500)', marginTop: '0.5rem' }}>
              Optional: By default, the setup will build on top of existing structure. Enable this to permanently delete ALL existing roles and channels before creating the new structure. This action cannot be undone!
            </p>
          </div>

          <h3>Service Configuration</h3>
          <div className="form-group">
            <div className="server-setup-toggle-group">
              <label htmlFor="configure-tickets" className="server-setup-toggle-label">
                Configure Ticket System
              </label>
              <label className="server-setup-toggle-switch">
                <input
                  id="configure-tickets"
                  type="checkbox"
                  checked={options.configureTickets || false}
                  onChange={(e) =>
                    setOptions({ ...options, configureTickets: e.target.checked })
                  }
                  disabled={loading}
                />
                <span className="server-setup-toggle-slider"></span>
              </label>
            </div>
            <p className="form-help">
              Creates a tickets embed channel in Info category and sets up the ticket system (tickets are created in Admin category)
            </p>
          </div>

          <div className="form-group">
            <div className="server-setup-toggle-group">
              <label htmlFor="configure-auto-roles" className="server-setup-toggle-label">
                Configure Auto Roles
              </label>
              <label className="server-setup-toggle-switch">
                <input
                  id="configure-auto-roles"
                  type="checkbox"
                  checked={options.configureAutoRoles || false}
                  onChange={(e) =>
                    setOptions({ ...options, configureAutoRoles: e.target.checked })
                  }
                  disabled={loading}
                />
                <span className="server-setup-toggle-slider"></span>
              </label>
            </div>
            <p className="form-help">
              Creates a channel for reaction-based role assignment in Info category
            </p>
          </div>

          <div className="form-group">
            <div className="server-setup-toggle-group">
              <label htmlFor="configure-ai-channels" className="server-setup-toggle-label">
                Configure AI Channels
              </label>
              <label className="server-setup-toggle-switch">
                <input
                  id="configure-ai-channels"
                  type="checkbox"
                  checked={options.configureAIChannels || false}
                  onChange={(e) =>
                    setOptions({ ...options, configureAIChannels: e.target.checked })
                  }
                  disabled={loading}
                />
                <span className="server-setup-toggle-slider"></span>
              </label>
            </div>
            <p className="form-help">
              Creates AI category with personality channels (normal, rude, professional, friendly, sarcastic) and Chat to AI role
            </p>
          </div>

          <div className="form-group">
            <div className="server-setup-toggle-group">
              <label htmlFor="configure-youtube-notifications" className="server-setup-toggle-label">
                Configure YouTube Notifications
              </label>
              <label className="server-setup-toggle-switch">
                <input
                  id="configure-youtube-notifications"
                  type="checkbox"
                  checked={options.configureYouTubeNotifications || false}
                  onChange={(e) =>
                    setOptions({ ...options, configureYouTubeNotifications: e.target.checked })
                  }
                  disabled={loading}
                />
                <span className="server-setup-toggle-slider"></span>
              </label>
            </div>
            <p className="form-help">
              Creates YouTube notifications channel and role in Info category
            </p>
          </div>

          <div className="form-group">
            <div className="server-setup-toggle-group">
              <label htmlFor="configure-dice-game" className="server-setup-toggle-label">
                Configure Dice Game
              </label>
              <label className="server-setup-toggle-switch">
                <input
                  id="configure-dice-game"
                  type="checkbox"
                  checked={options.configureDiceGame || false}
                  onChange={(e) =>
                    setOptions({ ...options, configureDiceGame: e.target.checked })
                  }
                  disabled={loading}
                />
                <span className="server-setup-toggle-slider"></span>
              </label>
            </div>
            <p className="form-help">
              Creates dice game channel and Play Dice role in General category
            </p>
          </div>

          <div className="form-group">
            <div className="server-setup-toggle-group">
              <label htmlFor="configure-wordle" className="server-setup-toggle-label">
                Configure Wordle
              </label>
              <label className="server-setup-toggle-switch">
                <input
                  id="configure-wordle"
                  type="checkbox"
                  checked={options.configureWordle || false}
                  onChange={(e) =>
                    setOptions({ ...options, configureWordle: e.target.checked })
                  }
                  disabled={loading}
                />
                <span className="server-setup-toggle-slider"></span>
              </label>
            </div>
            <p className="form-help">
              Creates wordle channel and Play Wordle role in General category
            </p>
          </div>

          <div className="form-group">
            <div className="server-setup-toggle-group">
              <label htmlFor="configure-bot-config" className="server-setup-toggle-label">
                Configure Bot Config
              </label>
              <label className="server-setup-toggle-switch">
                <input
                  id="configure-bot-config"
                  type="checkbox"
                  checked={options.configureBotConfig || false}
                  onChange={(e) =>
                    setOptions({ ...options, configureBotConfig: e.target.checked })
                  }
                  disabled={loading}
                />
                <span className="server-setup-toggle-slider"></span>
              </label>
            </div>
            <p className="form-help">
              Creates bot config channel and Bot Config role in Config category
            </p>
          </div>

          <div className="form-group">
            <div className="server-setup-toggle-group">
              <label htmlFor="configure-exchange-rate" className="server-setup-toggle-label">
                Configure Exchange Rate (Currency)
              </label>
              <label className="server-setup-toggle-switch">
                <input
                  id="configure-exchange-rate"
                  type="checkbox"
                  checked={options.configureExchangeRate || false}
                  onChange={(e) =>
                    setOptions({ ...options, configureExchangeRate: e.target.checked })
                  }
                  disabled={loading}
                />
                <span className="server-setup-toggle-slider"></span>
              </label>
            </div>
            <p className="form-help">
              Creates exchange rate channel for currency conversion in General category
            </p>
          </div>

          <div className="form-group">
            <div className="server-setup-toggle-group">
              <label htmlFor="configure-scoreboard" className="server-setup-toggle-label">
                Configure Scoreboard (Leaderboard)
              </label>
              <label className="server-setup-toggle-switch">
                <input
                  id="configure-scoreboard"
                  type="checkbox"
                  checked={options.configureScoreboard || false}
                  onChange={(e) =>
                    setOptions({ ...options, configureScoreboard: e.target.checked })
                  }
                  disabled={loading}
                />
                <span className="server-setup-toggle-slider"></span>
              </label>
            </div>
            <p className="form-help">
              Creates leaderboard channel for game statistics in General category
            </p>
          </div>

          <div className="form-group">
            <div className="server-setup-toggle-group">
              <label htmlFor="configure-f1" className="server-setup-toggle-label">
                Configure F1 Racing
              </label>
              <label className="server-setup-toggle-switch">
                <input
                  id="configure-f1"
                  type="checkbox"
                  checked={options.configureF1 || false}
                  onChange={(e) =>
                    setOptions({ ...options, configureF1: e.target.checked })
                  }
                  disabled={loading}
                />
                <span className="server-setup-toggle-slider"></span>
              </label>
            </div>
            <p className="form-help">
              Creates F1 channel for racing information and commands in General category
            </p>
          </div>

          <div className="form-group">
            <div className="server-setup-toggle-group">
              <label htmlFor="configure-leveling" className="server-setup-toggle-label">
                Configure Leveling System
              </label>
              <label className="server-setup-toggle-switch">
                <input
                  id="configure-leveling"
                  type="checkbox"
                  checked={options.configureLeveling || false}
                  onChange={(e) =>
                    setOptions({ ...options, configureLeveling: e.target.checked })
                  }
                  disabled={loading}
                />
                <span className="server-setup-toggle-slider"></span>
              </label>
            </div>
            <p className="form-help">
              Enables the leveling system with XP tracking and role rewards
            </p>
          </div>

          <div className="form-group">
            <div className="server-setup-toggle-group">
              <label htmlFor="configure-meme" className="server-setup-toggle-label">
                Configure Meme Feature
              </label>
              <label className="server-setup-toggle-switch">
                <input
                  id="configure-meme"
                  type="checkbox"
                  checked={options.configureMeme || false}
                  onChange={(e) =>
                    setOptions({ ...options, configureMeme: e.target.checked })
                  }
                  disabled={loading}
                />
                <span className="server-setup-toggle-slider"></span>
              </label>
            </div>
            <p className="form-help">
              Creates meme channel in Games category for requesting dark memes with !meme command
            </p>
          </div>
        </div>

        <div className="server-setup-section">
          <h3>Customization (Optional)</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="admin-role">Admin Role Name</label>
              <input
                id="admin-role"
                type="text"
                value={options.roleNames?.admin || ''}
                onChange={(e) =>
                  setOptions({
                    ...options,
                    roleNames: { ...options.roleNames, admin: e.target.value },
                  })
                }
                disabled={loading}
                placeholder="Admin"
              />
            </div>

            <div className="form-group">
              <label htmlFor="moderator-role">Moderator Role Name</label>
              <input
                id="moderator-role"
                type="text"
                value={options.roleNames?.moderator || ''}
                onChange={(e) =>
                  setOptions({
                    ...options,
                    roleNames: { ...options.roleNames, moderator: e.target.value },
                  })
                }
                disabled={loading}
                placeholder="Moderator"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="support-role">Support Staff Role Name</label>
              <input
                id="support-role"
                type="text"
                value={options.roleNames?.supportStaff || ''}
                onChange={(e) =>
                  setOptions({
                    ...options,
                    roleNames: { ...options.roleNames, supportStaff: e.target.value },
                  })
                }
                disabled={loading}
                placeholder="Support Staff"
              />
            </div>

            <div className="form-group">
              <label htmlFor="member-role">Member Role Name</label>
              <input
                id="member-role"
                type="text"
                value={options.roleNames?.member || ''}
                onChange={(e) =>
                  setOptions({
                    ...options,
                    roleNames: { ...options.roleNames, member: e.target.value },
                  })
                }
                disabled={loading}
                placeholder="Member"
              />
            </div>
          </div>
        </div>

        <div className="server-setup-actions">
          <button
            className="btn btn-primary"
            onClick={handleSetup}
            disabled={loading || !selectedGuildId}
          >
            {loading ? 'Setting up...' : 'Setup Server'}
          </button>
        </div>

        {setupResult && (
          <div className="server-setup-result">
            <h3>Setup Results</h3>
            <div className="result-section">
              <h4>Created Roles</h4>
              <ul>
                {setupResult.roles.admin && <li>Admin: <code>{setupResult.roles.admin}</code></li>}
                {setupResult.roles.moderator && <li>Moderator: <code>{setupResult.roles.moderator}</code></li>}
                {setupResult.roles.supportStaff && <li>Support Staff: <code>{setupResult.roles.supportStaff}</code></li>}
                {setupResult.roles.member && <li>Member: <code>{setupResult.roles.member}</code></li>}
                {setupResult.roles.chatToAI && <li>Chat to AI: <code>{setupResult.roles.chatToAI}</code></li>}
                {setupResult.roles.playDice && <li>Play Dice: <code>{setupResult.roles.playDice}</code></li>}
                {setupResult.roles.playWordle && <li>Play Wordle: <code>{setupResult.roles.playWordle}</code></li>}
                {setupResult.roles.youtubeNotifications && <li>YouTube Notifications: <code>{setupResult.roles.youtubeNotifications}</code></li>}
                {setupResult.roles.botConfig && <li>Bot Config: <code>{setupResult.roles.botConfig}</code></li>}
              </ul>
            </div>

            <div className="result-section">
              <h4>Created Categories</h4>
              <ul>
                {setupResult.categories.info && <li>Info: <code>{setupResult.categories.info}</code></li>}
                {setupResult.categories.general && <li>General: <code>{setupResult.categories.general}</code></li>}
                {setupResult.categories.ai && <li>AI: <code>{setupResult.categories.ai}</code></li>}
                {setupResult.categories.admin && <li>Admin: <code>{setupResult.categories.admin}</code></li>}
                {setupResult.categories.config && <li>Config: <code>{setupResult.categories.config}</code></li>}
              </ul>
            </div>

            <div className="result-section">
              <h4>Created Channels</h4>
              <ul>
                {setupResult.channels.welcome && <li>Welcome: <code>{setupResult.channels.welcome}</code></li>}
                {setupResult.channels.youtubeNotifications && <li>YouTube Notifications: <code>{setupResult.channels.youtubeNotifications}</code></li>}
                {setupResult.channels.autoRoles && <li>Auto Roles: <code>{setupResult.channels.autoRoles}</code></li>}
                {setupResult.channels.ticketsEmbed && <li>Tickets Embed: <code>{setupResult.channels.ticketsEmbed}</code></li>}
                {setupResult.channels.general && <li>General: <code>{setupResult.channels.general}</code></li>}
                {setupResult.channels.diceGame && <li>Dice Game: <code>{setupResult.channels.diceGame}</code></li>}
                {setupResult.channels.wordle && <li>Wordle: <code>{setupResult.channels.wordle}</code></li>}
                {setupResult.channels.exchangeRate && <li>Exchange Rate: <code>{setupResult.channels.exchangeRate}</code></li>}
                {setupResult.channels.scoreboard && <li>Scoreboard: <code>{setupResult.channels.scoreboard}</code></li>}
                {setupResult.channels.f1 && <li>F1: <code>{setupResult.channels.f1}</code></li>}
                {setupResult.channels.aiNormal && <li>AI Normal: <code>{setupResult.channels.aiNormal}</code></li>}
                {setupResult.channels.aiRude && <li>AI Rude: <code>{setupResult.channels.aiRude}</code></li>}
                {setupResult.channels.aiProfessional && <li>AI Professional: <code>{setupResult.channels.aiProfessional}</code></li>}
                {setupResult.channels.aiFriendly && <li>AI Friendly: <code>{setupResult.channels.aiFriendly}</code></li>}
                {setupResult.channels.aiSarcastic && <li>AI Sarcastic: <code>{setupResult.channels.aiSarcastic}</code></li>}
                {setupResult.channels.auditLog && <li>Audit Log: <code>{setupResult.channels.auditLog}</code></li>}
                {setupResult.channels.botConfig && <li>Bot Config: <code>{setupResult.channels.botConfig}</code></li>}
              </ul>
            </div>

            {setupResult.configuredServices.length > 0 && (
              <div className="result-section">
                <h4>Configured Services</h4>
                <ul>
                  {setupResult.configuredServices.map((service) => (
                    <li key={service}>{service}</li>
                  ))}
                </ul>
              </div>
            )}

            {setupResult.welcomeMessageId && (
              <div className="result-section">
                <h4>Welcome Message</h4>
                <p>Welcome message created with ID: <code>{setupResult.welcomeMessageId}</code></p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

