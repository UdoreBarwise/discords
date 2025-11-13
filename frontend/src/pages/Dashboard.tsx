import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MdSettings, MdPalette, MdVpnKey, MdInfo, MdCheckCircle, MdError } from 'react-icons/md'
import { botService } from '../services/botService'
import './Dashboard.css'

export default function Dashboard() {
  const [hasToken, setHasToken] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkBotStatus()
  }, [])

  const checkBotStatus = async () => {
    try {
      setLoading(true)
      const status = await botService.hasToken()
      setHasToken(status)
    } catch (error) {
      console.error('Failed to check bot status:', error)
      setHasToken(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p className="dashboard-subtitle">Welcome to KaasBot - Manage your Discord bot configuration</p>
      </div>

      <div className="dashboard-cards-grid">
        <Link to="/settings?tab=token" className="dashboard-card action-card">
          <div className="card-header">
            <div className="card-icon status">
              {loading ? (
                <div className="status-spinner" />
              ) : hasToken ? (
                <MdCheckCircle />
              ) : (
                <MdError />
              )}
            </div>
            <div className="card-title-group">
              <h2>Bot Status</h2>
              <p className="card-subtitle">Current bot configuration</p>
            </div>
          </div>
          <div className="card-content">
            {loading ? (
              <p className="status-text">Checking status...</p>
            ) : hasToken ? (
              <div className="status-info">
                <p className="status-text success">Bot token is configured</p>
                <p className="status-description">Your Discord bot is ready to use</p>
              </div>
            ) : (
              <div className="status-info">
                <p className="status-text error">No bot token configured</p>
                <p className="status-description">Configure your bot token to get started</p>
              </div>
            )}
          </div>
          <div className="card-action">
            <span>Configure Bot</span>
            <MdVpnKey />
          </div>
        </Link>

        <Link to="/settings?tab=token" className="dashboard-card action-card">
          <div className="card-header">
            <div className="card-icon">
              <MdVpnKey />
            </div>
            <div className="card-title-group">
              <h2>Bot Configuration</h2>
              <p className="card-subtitle">Manage Discord bot token</p>
            </div>
          </div>
          <div className="card-content">
            <p>Set up and manage your Discord bot token. This is required for the bot to connect to Discord.</p>
          </div>
          <div className="card-action">
            <span>Go to Settings</span>
            <MdSettings />
          </div>
        </Link>

        <Link to="/settings?tab=theme" className="dashboard-card action-card">
          <div className="card-header">
            <div className="card-icon">
              <MdPalette />
            </div>
            <div className="card-title-group">
              <h2>Theme Settings</h2>
              <p className="card-subtitle">Customize appearance</p>
            </div>
          </div>
          <div className="card-content">
            <p>Customize the colors and appearance of your bot interface. Choose from presets or create your own theme.</p>
          </div>
          <div className="card-action">
            <span>Customize Theme</span>
            <MdPalette />
          </div>
        </Link>

        <div className="dashboard-card info-card">
          <div className="card-header">
            <div className="card-icon">
              <MdInfo />
            </div>
            <div className="card-title-group">
              <h2>Getting Started</h2>
              <p className="card-subtitle">Quick guide</p>
            </div>
          </div>
          <div className="card-content">
            <ol className="info-list">
              <li>Configure your Discord bot token in Bot Configuration</li>
              <li>Customize the interface appearance in Theme Settings</li>
              <li>Your bot will be ready to use once configured</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}

