import WelcomeMessageConfig from '../../components/WelcomeMessage/WelcomeMessageConfig'
import './WelcomeMessage.css'

export default function WelcomeMessage() {
  return (
    <div className="welcome-message-page">
      <div className="welcome-message-header">
        <h1>Welcome Messages</h1>
        <p className="welcome-message-subtitle">
          Configure automatic welcome messages sent to new members when they join your server.
        </p>
      </div>
      <WelcomeMessageConfig />
    </div>
  )
}

