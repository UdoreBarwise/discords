import XNotificationConfig from '../../components/XNotifications/XNotificationConfig'
import './XNotifications.css'

export default function XNotifications() {
  return (
    <div className="x-notifications-page">
      <h1>X (Twitter) Notifications</h1>
      <p className="page-description">
        Configure X notifications to receive alerts when accounts you follow post new tweets.
        Uses RSS feeds via Nitter instances for reliable notifications.
      </p>
      <XNotificationConfig />
    </div>
  )
}



