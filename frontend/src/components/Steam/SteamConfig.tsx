import { useState, useEffect } from 'react'
import { steamService } from '../../services/steamService'
import './SteamConfig.css'

export default function SteamConfig() {
  const [apiKey, setApiKey] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadApiKey()
  }, [])

  const loadApiKey = async () => {
    try {
      setLoading(true)
      setError(null)
      const key = await steamService.getApiKey()
      setApiKey(key || '')
    } catch (err: any) {
      setError(err.message || 'Failed to load Steam API key')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError('API key cannot be empty')
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      await steamService.setApiKey(apiKey.trim())
      setSuccess('Steam API key saved successfully!')
    } catch (err: any) {
      setError(err.message || 'Failed to save Steam API key')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete the Steam API key?')) {
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      await steamService.deleteApiKey()
      setApiKey('')
      setSuccess('Steam API key deleted successfully!')
    } catch (err: any) {
      setError(err.message || 'Failed to delete Steam API key')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="steam-config">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  return (
    <div className="steam-config">
      <div className="steam-config-header">
        <h2>Steam Integration</h2>
        <p className="description">
          Configure your Steam Web API key to enable Steam integration features.
          Get your API key from{' '}
          <a
            href="https://steamcommunity.com/dev/apikey"
            target="_blank"
            rel="noopener noreferrer"
          >
            Steam Web API
          </a>
        </p>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      <div className="steam-config-form">
        <div className="form-group">
          <label htmlFor="apiKey">Steam API Key</label>
          <input
            type="password"
            id="apiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your Steam Web API key"
            disabled={saving}
          />
          <small>
            Your API key is stored securely and used to fetch Steam profile data.
          </small>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !apiKey.trim()}
            className="btn btn-primary"
          >
            {saving ? 'Saving...' : 'Save API Key'}
          </button>
          {apiKey && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="btn btn-danger"
            >
              Delete API Key
            </button>
          )}
        </div>
      </div>

      <div className="steam-config-info">
        <h3>Discord Bot Commands</h3>
        <p>Once configured, users can use these commands in Discord:</p>
        <ul>
          <li><code>/steam link &lt;steamid&gt;</code> - Link your Steam account</li>
          <li><code>/steam profile [user]</code> - View Steam profile</li>
          <li><code>/steam games [user]</code> - View owned games</li>
          <li><code>/steam recent [user]</code> - View recently played games</li>
          <li><code>/steam unlink</code> - Unlink your Steam account</li>
        </ul>
      </div>
    </div>
  )
}

