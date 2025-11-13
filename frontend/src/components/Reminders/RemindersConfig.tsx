import { useState, useEffect } from 'react'
import { reminderService, Reminder } from '../../services/reminderService'
import { discordService, Channel } from '../../services/discordService'
import { useNotifications } from '../../contexts/NotificationContext'
import { useServer } from '../../contexts/ServerContext'
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog'
import './RemindersConfig.css'

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

export default function RemindersConfig() {
  const { addNotification } = useNotifications()
  const { selectedServerId } = useServer()
  const [loading, setLoading] = useState(false)
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [reminderToDelete, setReminderToDelete] = useState<Reminder | null>(null)

  const [formData, setFormData] = useState({
    message: '',
    timeUtc: '',
    daysOfWeek: [] as number[],
    deliveryMethod: 'channel' as 'dm' | 'channel',
    channelId: '',
  })

  useEffect(() => {
    if (selectedServerId) {
      loadReminders(selectedServerId)
      loadChannels(selectedServerId)
    }
  }, [selectedServerId])

  const loadReminders = async (guildId: string) => {
    try {
      setLoading(true)
      const data = await reminderService.getReminders(guildId)
      setReminders(data)
    } catch (error: any) {
      console.error('Failed to load reminders:', error)
      addNotification({
        type: 'error',
        title: 'Failed to Load Reminders',
        message: error.response?.data?.error || 'Failed to fetch reminders',
      })
    } finally {
      setLoading(false)
    }
  }

  const loadChannels = async (guildId: string) => {
    try {
      const data = await discordService.getChannels(guildId)
      setChannels(data)
    } catch (error: any) {
      console.error('Failed to load channels:', error)
    }
  }

  const handleDayToggle = (day: number) => {
    setFormData((prev) => {
      const newDays = prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day].sort()
      return { ...prev, daysOfWeek: newDays }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedServerId) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please select a server',
      })
      return
    }

    if (!formData.message.trim()) {
      addNotification({
        type: 'warning',
        title: 'Invalid Input',
        message: 'Please enter a reminder message',
      })
      return
    }

    if (!formData.timeUtc) {
      addNotification({
        type: 'warning',
        title: 'Invalid Input',
        message: 'Please select a time',
      })
      return
    }

    if (formData.deliveryMethod === 'channel' && !formData.channelId) {
      addNotification({
        type: 'warning',
        title: 'Invalid Input',
        message: 'Please select a channel for channel delivery',
      })
      return
    }

    try {
      setLoading(true)
      if (editingReminder) {
        await reminderService.updateReminder(editingReminder.id, {
          ...formData,
          guildId: selectedServerId,
          userId: editingReminder.userId,
        })
        addNotification({
          type: 'success',
          title: 'Success',
          message: 'Reminder updated successfully',
        })
      } else {
        // For now, we'll use a placeholder userId - in a real app, you'd get this from auth
        await reminderService.createReminder({
          guildId: selectedServerId,
          userId: 'current-user', // This should come from auth context
          ...formData,
          daysOfWeek: formData.daysOfWeek.length > 0 ? formData.daysOfWeek : undefined,
        })
        addNotification({
          type: 'success',
          title: 'Success',
          message: 'Reminder created successfully',
        })
      }

      resetForm()
      await loadReminders(selectedServerId)
    } catch (error: any) {
      console.error('Failed to save reminder:', error)
      addNotification({
        type: 'error',
        title: 'Failed to Save',
        message: error.response?.data?.error || 'Failed to save reminder',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder)
    setFormData({
      message: reminder.message,
      timeUtc: reminder.timeUtc,
      daysOfWeek: reminder.daysOfWeek || [],
      deliveryMethod: reminder.deliveryMethod,
      channelId: reminder.channelId || '',
    })
    setShowCreateForm(true)
  }

  const handleDelete = (reminder: Reminder) => {
    setReminderToDelete(reminder)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!reminderToDelete || !selectedServerId) return

    try {
      setLoading(true)
      await reminderService.deleteReminder(reminderToDelete.id)
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Reminder deleted successfully',
      })
      await loadReminders(selectedServerId)
    } catch (error: any) {
      console.error('Failed to delete reminder:', error)
      addNotification({
        type: 'error',
        title: 'Failed to Delete',
        message: error.response?.data?.error || 'Failed to delete reminder',
      })
    } finally {
      setLoading(false)
      setShowDeleteDialog(false)
      setReminderToDelete(null)
    }
  }

  const handleToggleEnabled = async (reminder: Reminder) => {
    if (!selectedServerId) return

    try {
      setLoading(true)
      await reminderService.updateReminder(reminder.id, { enabled: !reminder.enabled })
      await loadReminders(selectedServerId)
    } catch (error: any) {
      console.error('Failed to toggle reminder:', error)
      addNotification({
        type: 'error',
        title: 'Failed to Update',
        message: error.response?.data?.error || 'Failed to update reminder',
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      message: '',
      timeUtc: '',
      daysOfWeek: [],
      deliveryMethod: 'channel',
      channelId: '',
    })
    setEditingReminder(null)
    setShowCreateForm(false)
  }

  const formatDaysOfWeek = (days?: number[]): string => {
    if (!days || days.length === 0) return 'Every day'
    if (days.length === 7) return 'Every day'
    return days.map((d) => DAYS_OF_WEEK[d].label.substring(0, 3)).join(', ')
  }

  const getCurrentUtcTime = (): string => {
    const now = new Date()
    const hours = now.getUTCHours().toString().padStart(2, '0')
    const minutes = now.getUTCMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  if (!selectedServerId) {
    return (
      <div className="reminders-config">
        <div className="reminders-header">
          <h2>Reminders</h2>
          <p className="reminders-description">
            Set up reminders that will notify you at specific times. All times are in UTC.
          </p>
        </div>
        <div className="reminders-empty">
          <p>Please select a server to manage reminders.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="reminders-config">
      <div className="reminders-header">
        <h2>Reminders</h2>
        <p className="reminders-description">
          Set up reminders that will notify you at specific times. All times are in UTC (current UTC time: {getCurrentUtcTime()}).
        </p>
        {!showCreateForm && (
          <button className="btn btn-primary" onClick={() => setShowCreateForm(true)}>
            + Create Reminder
          </button>
        )}
      </div>

      {showCreateForm && (
        <div className="reminders-form">
          <h3>{editingReminder ? 'Edit Reminder' : 'Create New Reminder'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="message">Reminder Message</label>
              <textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="What should the reminder say?"
                rows={3}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="timeUtc">Time (UTC)</label>
              <input
                type="time"
                id="timeUtc"
                value={formData.timeUtc}
                onChange={(e) => setFormData({ ...formData, timeUtc: e.target.value })}
                required
              />
              <small>Current UTC time: {getCurrentUtcTime()}</small>
            </div>

            <div className="form-group">
              <label>Repeat on Days (leave empty for daily)</label>
              <div className="days-selector">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    className={`day-button ${formData.daysOfWeek.includes(day.value) ? 'active' : ''}`}
                    onClick={() => handleDayToggle(day.value)}
                  >
                    {day.label.substring(0, 3)}
                  </button>
                ))}
              </div>
              {formData.daysOfWeek.length > 0 && (
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => setFormData({ ...formData, daysOfWeek: [] })}
                >
                  Clear selection (daily)
                </button>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="deliveryMethod">Delivery Method</label>
              <select
                id="deliveryMethod"
                value={formData.deliveryMethod}
                onChange={(e) =>
                  setFormData({ ...formData, deliveryMethod: e.target.value as 'dm' | 'channel' })
                }
              >
                <option value="channel">Send to Channel</option>
                <option value="dm">Send as DM</option>
              </select>
            </div>

            {formData.deliveryMethod === 'channel' && (
              <div className="form-group">
                <label htmlFor="channelId">Channel</label>
                <select
                  id="channelId"
                  value={formData.channelId}
                  onChange={(e) => setFormData({ ...formData, channelId: e.target.value })}
                  required={formData.deliveryMethod === 'channel'}
                >
                  <option value="">Select a channel</option>
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      #{channel.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {editingReminder ? 'Update' : 'Create'} Reminder
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="reminders-list">
        <h3>Your Reminders</h3>
        {loading && reminders.length === 0 ? (
          <p>Loading reminders...</p>
        ) : reminders.length === 0 ? (
          <div className="reminders-empty">
            <p>No reminders yet. Create one to get started!</p>
          </div>
        ) : (
          <div className="reminders-grid">
            {reminders.map((reminder) => (
              <div key={reminder.id} className={`reminder-card ${!reminder.enabled ? 'disabled' : ''}`}>
                <div className="reminder-header">
                  <div className="reminder-time">
                    <span className="time-icon">⏰</span>
                    <span className="time-value">{reminder.timeUtc} UTC</span>
                  </div>
                  <div className="reminder-actions">
                    <button
                      className={`toggle-btn ${reminder.enabled ? 'enabled' : 'disabled'}`}
                      onClick={() => handleToggleEnabled(reminder)}
                      title={reminder.enabled ? 'Disable' : 'Enable'}
                    >
                      {reminder.enabled ? '✓' : '○'}
                    </button>
                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(reminder)}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(reminder)}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="reminder-body">
                  <p className="reminder-message">{reminder.message}</p>
                  <div className="reminder-meta">
                    <span className="reminder-delivery">
                      {reminder.deliveryMethod === 'dm' ? '📩 DM' : `#${channels.find(c => c.id === reminder.channelId)?.name || 'Unknown'}`}
                    </span>
                    <span className="reminder-schedule">{formatDaysOfWeek(reminder.daysOfWeek)}</span>
                  </div>
                  {reminder.lastTriggeredAt && (
                    <small className="reminder-last-triggered">
                      Last triggered: {new Date(reminder.lastTriggeredAt).toLocaleString()}
                    </small>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        show={showDeleteDialog}
        title="Delete Reminder"
        message={`Are you sure you want to delete this reminder? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteDialog(false)
          setReminderToDelete(null)
        }}
      />
    </div>
  )
}


