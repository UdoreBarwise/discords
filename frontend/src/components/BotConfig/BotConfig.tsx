import { useState, useEffect } from 'react'
import { botService } from '../../services/botService'
import { useNotifications } from '../../contexts/NotificationContext'
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog'
import './BotConfig.css'

export default function BotConfig() {
  const { addNotification } = useNotifications()
  const [token, setToken] = useState('')
  const [hasToken, setHasToken] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useEffect(() => {
    checkTokenStatus()
  }, [])

  const checkTokenStatus = async () => {
    try {
      const status = await botService.hasToken()
      setHasToken(status)
    } catch (error) {
      console.error('Failed to check token status:', error)
    }
  }

  const handleSave = async () => {
    if (!token.trim()) {
      addNotification({
        type: 'warning',
        title: 'Invalid Token',
        message: 'Token cannot be empty',
      })
      return
    }

    setLoading(true)

    try {
      await botService.setToken(token)
      addNotification({
        type: 'success',
        title: 'Token Saved',
        message: 'Discord bot token has been saved successfully',
      })
      setHasToken(true)
      setToken('')
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: error.response?.data?.error || 'Failed to save token',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = () => {
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    setShowDeleteDialog(false)
    setLoading(true)

    try {
      await botService.deleteToken()
      addNotification({
        type: 'info',
        title: 'Token Deleted',
        message: 'Discord bot token has been removed',
      })
      setHasToken(false)
      setToken('')
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Delete Failed',
        message: error.response?.data?.error || 'Failed to delete token',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false)
  }

  return (
    <div className="bot-config">
      
      <div className="bot-config-status">
        <span className={`status-indicator ${hasToken ? 'active' : 'inactive'}`}>
          {hasToken ? 'Bot token is set' : 'No bot token set'}
        </span>
      </div>

      <div className="bot-config-input">
        <label htmlFor="bot-token">Discord Bot Token</label>
        <input
          id="bot-token"
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Enter your Discord bot token"
          disabled={loading}
        />
        <div className="bot-config-actions">
          <button
            onClick={handleSave}
            disabled={loading || !token.trim()}
            className="bot-config-button save"
          >
            {loading ? 'Saving...' : 'Save Token'}
          </button>
          {hasToken && (
            <button
              onClick={handleDeleteClick}
              disabled={loading}
              className="bot-config-button delete"
            >
              Delete Token
            </button>
          )}
        </div>
      </div>

      <div className="bot-config-info">
        <p>To get a Discord bot token:</p>
        <ol>
          <li>Go to <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer">Discord Developer Portal</a></li>
          <li>Create a new application or select an existing one</li>
          <li>Go to the "Bot" section</li>
          <li>Click "Reset Token" or "Copy" to get your token</li>
          <li>Paste it here and click "Save Token"</li>
        </ol>
      </div>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete Bot Token"
        message="Are you sure you want to delete the bot token? The bot will stop working."
        confirmText="OK"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        variant="danger"
      />
    </div>
  )
}

