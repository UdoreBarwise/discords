import { useState } from 'react'
import { MdContentCopy, MdCheck } from 'react-icons/md'
import { Notification as NotificationType } from '../../contexts/NotificationContext'
import { useNotifications } from '../../contexts/NotificationContext'
import './Notification.css'

interface NotificationProps {
  notification: NotificationType
}

export default function Notification({ notification }: NotificationProps) {
  const { removeNotification, addNotification } = useNotifications()
  const [copied, setCopied] = useState(false)

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return '✓'
      case 'error':
        return '×'
      case 'warning':
        return '!'
      case 'info':
        return 'i'
      default:
        return '•'
    }
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const textToCopy = notification.message || notification.title
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Copy Failed',
        message: 'Failed to copy to clipboard',
        duration: 3000,
      })
    }
  }

  const hasCopyableContent = notification.message || notification.title

  return (
    <div
      className={`notification notification-${notification.type}`}
      onClick={() => removeNotification(notification.id)}
    >
      <div className="notification-icon">{getIcon()}</div>
      <div className="notification-content">
        <div className="notification-title">{notification.title}</div>
        {notification.message && (
          <div className="notification-message">{notification.message}</div>
        )}
      </div>
      <div className="notification-actions">
        {hasCopyableContent && (
          <button
            className="notification-copy"
            onClick={handleCopy}
            title="Copy message"
          >
            {copied ? <MdCheck size={16} /> : <MdContentCopy size={16} />}
          </button>
        )}
        <button
          className="notification-close"
          onClick={(e) => {
            e.stopPropagation()
            removeNotification(notification.id)
          }}
        >
          ×
        </button>
      </div>
    </div>
  )
}

