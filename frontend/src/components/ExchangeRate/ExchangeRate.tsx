import { useState, useEffect } from 'react'
import { exchangeRateService, ExchangeRateConfig } from '../../services/exchangeRateService'
import { discordService, Channel } from '../../services/discordService'
import { useNotifications } from '../../contexts/NotificationContext'
import { useServer } from '../../contexts/ServerContext'
import './ExchangeRate.css'

export default function ExchangeRate() {
  const { addNotification } = useNotifications()
  const { selectedServerId } = useServer()
  const [channels, setChannels] = useState<Channel[]>([])
  const [config, setConfig] = useState<ExchangeRateConfig>({
    guildId: '',
    enabled: false,
    defaultBaseCurrency: 'USD',
    channelId: '',
  })
  const [configLoading, setConfigLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (selectedServerId) {
      setConfig((prev) => ({ ...prev, guildId: selectedServerId }))
    }
  }, [selectedServerId])

  useEffect(() => {
    if (config.guildId) {
      loadChannels(config.guildId)
      loadConfig(config.guildId)
    }
  }, [config.guildId])

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

  const loadConfig = async (guildId: string) => {
    setConfigLoading(true)
    try {
      const data = await exchangeRateService.getConfig(guildId)
      setConfig(data)
    } catch (error: any) {
      console.error('Failed to load config:', error)
    } finally {
      setConfigLoading(false)
    }
  }

  const handleSaveConfig = async () => {
    if (!config.guildId) {
      addNotification({
        type: 'warning',
        title: 'No Server Selected',
        message: 'Please select a default server in Settings',
      })
      return
    }

    setSaving(true)
    try {
      await exchangeRateService.saveConfig(config)
      addNotification({
        type: 'success',
        title: 'Configuration Saved',
        message: 'Exchange rate configuration has been saved successfully',
      })
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: error.response?.data?.error || 'Failed to save configuration',
      })
    } finally {
      setSaving(false)
    }
  }

  if (!selectedServerId) {
    return (
      <div className="exchange-rate-config">
        <div className="exchange-rate-section">
          <p style={{ color: 'var(--text-secondary, #aaa)', fontSize: '0.9rem' }}>
            Please select a default server in Settings to configure exchange rate commands.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="exchange-rate-config">
      {config.guildId && (
        <>
          <div className="exchange-rate-section">
            <div className="exchange-rate-toggle-group">
              <label htmlFor="enable-exchange-rate" className="exchange-rate-toggle-label">
                Enable Exchange Rate Commands
              </label>
              <label className="exchange-rate-toggle-switch">
                <input
                  id="enable-exchange-rate"
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  disabled={configLoading || saving}
                />
                <span className="exchange-rate-toggle-slider"></span>
              </label>
            </div>
            <p className="exchange-rate-hint">
              When enabled, users can use /exchange-rate commands in Discord to convert currencies and check exchange rates
            </p>
          </div>

          {config.enabled && (
            <>
              <div className="exchange-rate-section">
                <label htmlFor="channel-select">Channel (Optional)</label>
                <select
                  id="channel-select"
                  value={config.channelId || ''}
                  onChange={(e) => setConfig({ ...config, channelId: e.target.value || undefined })}
                  disabled={configLoading || saving}
                >
                  <option value="">Any channel (no restriction)</option>
                  {channels
                    .filter((ch) => ch.type === 0)
                    .map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        #{channel.name}
                      </option>
                    ))}
                </select>
                <p className="exchange-rate-hint">
                  If set, exchange rate commands can only be used in this channel. Leave empty to allow any channel.
                </p>
              </div>

              <div className="exchange-rate-section">
                <label htmlFor="default-currency-select">Default Base Currency</label>
                <select
                  id="default-currency-select"
                  value={config.defaultBaseCurrency}
                  onChange={(e) => setConfig({ ...config, defaultBaseCurrency: e.target.value })}
                  disabled={configLoading || saving}
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="JPY">JPY - Japanese Yen</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="CHF">CHF - Swiss Franc</option>
                  <option value="CNY">CNY - Chinese Yuan</option>
                  <option value="INR">INR - Indian Rupee</option>
                  <option value="BRL">BRL - Brazilian Real</option>
                  <option value="ZAR">ZAR - South African Rand</option>
                  <option value="MXN">MXN - Mexican Peso</option>
                  <option value="SGD">SGD - Singapore Dollar</option>
                  <option value="HKD">HKD - Hong Kong Dollar</option>
                  <option value="NZD">NZD - New Zealand Dollar</option>
                  <option value="KRW">KRW - South Korean Won</option>
                  <option value="TRY">TRY - Turkish Lira</option>
                  <option value="RUB">RUB - Russian Ruble</option>
                  <option value="NOK">NOK - Norwegian Krone</option>
                  <option value="SEK">SEK - Swedish Krona</option>
                  <option value="DKK">DKK - Danish Krone</option>
                  <option value="PLN">PLN - Polish Zloty</option>
                  <option value="THB">THB - Thai Baht</option>
                </select>
                <p className="exchange-rate-hint">
                  Default currency used when users don't specify a base currency in commands
                </p>
              </div>

              <div className="exchange-rate-section">
                <button
                  className="exchange-rate-save-button"
                  onClick={handleSaveConfig}
                  disabled={saving || configLoading}
                >
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
