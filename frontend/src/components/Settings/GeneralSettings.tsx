import { Link } from 'react-router-dom'
import './SettingsSection.css'

export default function GeneralSettings() {
  return (
    <div className="settings-section">
      <h2>General Settings</h2>
      
      <div className="settings-subsection">
        <h3>Reminders</h3>
        <p className="settings-description">
          Set up reminders that will notify you at specific times. All times are in UTC.
        </p>
        <Link to="/reminders" className="settings-link">
          Configure Reminders →
        </Link>
      </div>
    </div>
  )
}

