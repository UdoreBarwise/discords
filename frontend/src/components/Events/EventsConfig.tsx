import { useState, useEffect } from 'react'
import { eventService, EventsConfig as EventsConfigType } from '../../services/eventService'
import { discordService, Channel } from '../../services/discordService'
import { useNotifications } from '../../contexts/NotificationContext'
import { useServer } from '../../contexts/ServerContext'
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog'
import './EventsConfig.css'

export default function EventsConfig() {
  const { addNotification } = useNotifications()
  const { selectedServerId, isLoading: serverLoading } = useServer()
  const [loading, setLoading] = useState(false)
  const [channels, setChannels] = useState<Channel[]>([])
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmDialogState, setConfirmDialogState] = useState<{
    type: 'save' | 'enable' | null
    data?: any
  }>({ type: null })

  const [config, setConfig] = useState<EventsConfigType>({
    guildId: '',
    enabled: false,
    announcementChannelId: null,
    randomEventChance: 5.0,
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

  const loadGuildData = async (guildId: string) => {
    try {
      const channelsData = await discordService.getChannels(guildId)
      setChannels(channelsData)
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
      const data = await eventService.getConfig(guildId)
      if (data) {
        setConfig(data)
      } else {
        setConfig({
          guildId,
          enabled: false,
          announcementChannelId: null,
          randomEventChance: 5.0,
        })
      }
    } catch (error: any) {
      console.error('Failed to load config:', error)
    }
  }

  const handleSaveClick = () => {
    if (!selectedServerId) {
      addNotification({
        type: 'warning',
        title: 'Missing Selection',
        message: 'Please select a default server in Settings',
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

  const handleConfirmEnable = async () => {
    const enabledValue = confirmDialogState.data?.enabled ?? false
    setShowConfirmDialog(false)
    setConfirmDialogState({ type: null })
    const updatedConfig = { ...config, enabled: enabledValue }
    setConfig(updatedConfig)
    setLoading(true)

    try {
      await eventService.saveConfig(updatedConfig)
      addNotification({
        type: 'success',
        title: 'Events System Updated',
        message: `Events system has been ${enabledValue ? 'enabled' : 'disabled'} successfully`,
      })
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Update Failed',
        message: error.response?.data?.error || 'Failed to update events system',
      })
      // Revert the state on error
      setConfig({ ...config, enabled: !enabledValue })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setShowConfirmDialog(false)
    setLoading(true)

    try {
      await eventService.saveConfig(config)
      addNotification({
        type: 'success',
        title: 'Configuration Saved',
        message: 'Events configuration has been saved successfully',
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

  const getConfirmDialogMessage = () => {
    switch (confirmDialogState.type) {
      case 'save':
        return 'Are you sure you want to save the events configuration?'
      case 'enable':
        return `Are you sure you want to ${confirmDialogState.data.enabled ? 'enable' : 'disable'} the events system?`
      default:
        return ''
    }
  }

  const handleConfirm = () => {
    switch (confirmDialogState.type) {
      case 'save':
        handleSave()
        break
      case 'enable':
        handleConfirmEnable()
        break
    }
  }

  return (
    <div className="events-config">
      <div className="events-config-header">
        <h2>Events Configuration</h2>
        <p>Configure the events system for your Discord server</p>
      </div>

      <div className="events-config-content">
        {!selectedServerId && !serverLoading ? (
          <div className="config-section">
            <p>No server selected.</p>
            <p>Please select a default server in Settings to configure events.</p>
          </div>
        ) : selectedServerId && (
          <>
            <div className="config-section">
              <label className="config-label">
                <div className="label-with-toggle">
                  <span>Enable Events System</span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={config.enabled}
                      onChange={(e) => handleEnableToggle(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </label>
            </div>

            {config.enabled && (
              <>
                <div className="config-section">
                  <label className="config-label">
                    <span>Announcement Channel</span>
                    <select
                      value={config.announcementChannelId || ''}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          announcementChannelId: e.target.value || null,
                        })
                      }
                      className="config-select"
                    >
                      <option value="">Select a channel...</option>
                      {channels
                        .filter((c) => c.type === 0)
                        .map((channel) => (
                          <option key={channel.id} value={channel.id}>
                            #{channel.name}
                          </option>
                        ))}
                    </select>
                    <small>Channel where event announcements will be posted</small>
                  </label>
                </div>

                <div className="config-section">
                  <label className="config-label">
                    <span>Random Event Chance (%)</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={config.randomEventChance}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          randomEventChance: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="config-input"
                    />
                    <small>Percentage chance for random events to occur (checked every minute)</small>
                  </label>
                </div>
              </>
            )}

            <div className="config-actions">
              <button
                onClick={handleSaveClick}
                disabled={loading || !config.guildId}
                className="btn btn-primary"
              >
                {loading ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        onCancel={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirm}
        title="Confirm Action"
        message={getConfirmDialogMessage()}
      />
    </div>
  )
}

