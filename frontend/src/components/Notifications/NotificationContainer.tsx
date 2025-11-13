import { useNotifications } from '../../contexts/NotificationContext'
import Notification from './Notification'
import './NotificationContainer.css'

export default function NotificationContainer() {
  const { notifications } = useNotifications()

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <Notification key={notification.id} notification={notification} />
      ))}
    </div>
  )
}

