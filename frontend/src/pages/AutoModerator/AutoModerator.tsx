import AutoModeratorConfig from '../../components/AutoModerator/AutoModeratorConfig'
import './AutoModerator.css'

export default function AutoModerator() {
  return (
    <div className="auto-moderator-page">
      <div className="auto-moderator-header">
        <h1>Auto Moderator</h1>
        <p className="auto-moderator-subtitle">
          Configure automatic message moderation settings
        </p>
      </div>

      <div className="auto-moderator-content">
        <AutoModeratorConfig />
      </div>
    </div>
  )
}

