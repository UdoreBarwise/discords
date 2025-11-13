import YouTubeNotificationConfig from '../../components/YouTubeNotifications/YouTubeNotificationConfig'
import './YouTubeNotifications.css'

export default function YouTubeNotifications() {
  return (
    <div className="youtube-notifications-page">
      <h1>YouTube Notifications</h1>
      <p className="page-description">
        Configure YouTube notifications to receive alerts when your favorite YouTubers upload new content.
        Make sure to set a YouTube API key in Settings first.
      </p>
      <YouTubeNotificationConfig />
    </div>
  )
}

