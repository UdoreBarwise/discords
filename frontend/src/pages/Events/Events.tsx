import { useState, useEffect } from 'react'
import { eventService, Event, ActiveEvent, EventHistory } from '../../services/eventService'
import { useNotifications } from '../../contexts/NotificationContext'
import { useServer } from '../../contexts/ServerContext'
import EventsConfig from '../../components/Events/EventsConfig'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog'
import './Events.css'

export default function Events() {
  const { addNotification } = useNotifications()
  const { selectedServerId, isLoading: serverLoading } = useServer()
  const [activeTab, setActiveTab] = useState<'config' | 'events' | 'active' | 'history'>('config')
  const [events, setEvents] = useState<Event[]>([])
  const [activeEvents, setActiveEvents] = useState<ActiveEvent[]>([])
  const [eventHistory, setEventHistory] = useState<EventHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmDialogState, setConfirmDialogState] = useState<{
    type: 'delete' | 'start' | null
    data?: any
  }>({ type: null })

  useEffect(() => {
    if (selectedServerId) {
      if (activeTab === 'events') {
        loadEvents()
      } else if (activeTab === 'active') {
        loadActiveEvents()
      } else if (activeTab === 'history') {
        loadEventHistory()
      }
    }
  }, [selectedServerId, activeTab])

  const loadEvents = async () => {
    if (!selectedServerId) return
    setLoading(true)
    try {
      const data = await eventService.getEvents(selectedServerId)
      setEvents(data)
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Load Events',
        message: error.response?.data?.error || 'Failed to fetch events',
      })
    } finally {
      setLoading(false)
    }
  }

  const loadActiveEvents = async () => {
    if (!selectedServerId) return
    setLoading(true)
    try {
      const data = await eventService.getActiveEvents(selectedServerId)
      setActiveEvents(data)
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Load Active Events',
        message: error.response?.data?.error || 'Failed to fetch active events',
      })
    } finally {
      setLoading(false)
    }
  }

  const loadEventHistory = async () => {
    if (!selectedServerId) return
    setLoading(true)
    try {
      const data = await eventService.getEventHistory(selectedServerId)
      setEventHistory(data)
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Load Event History',
        message: error.response?.data?.error || 'Failed to fetch event history',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEvent = (eventId: number) => {
    setConfirmDialogState({ type: 'delete', data: { eventId } })
    setShowConfirmDialog(true)
  }

  const handleStartEvent = (eventId: number) => {
    setConfirmDialogState({ type: 'start', data: { eventId } })
    setShowConfirmDialog(true)
  }

  const confirmAction = async () => {
    setShowConfirmDialog(false)
    setLoading(true)

    try {
      if (confirmDialogState.type === 'delete') {
        await eventService.deleteEvent(confirmDialogState.data.eventId)
        addNotification({
          type: 'success',
          title: 'Event Deleted',
          message: 'Event has been deleted successfully',
        })
        await loadEvents()
      } else if (confirmDialogState.type === 'start') {
        await eventService.startEvent(confirmDialogState.data.eventId)
        addNotification({
          type: 'success',
          title: 'Event Started',
          message: 'Event has been started successfully',
        })
        await loadActiveEvents()
      }
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Action Failed',
        message: error.response?.data?.error || 'Failed to perform action',
      })
    } finally {
      setLoading(false)
    }
  }

  const getConfirmDialogMessage = () => {
    switch (confirmDialogState.type) {
      case 'delete':
        return 'Are you sure you want to delete this event?'
      case 'start':
        return 'Are you sure you want to start this event now?'
      default:
        return ''
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getTimeRemaining = (endsAt: string) => {
    const now = new Date()
    const end = new Date(endsAt)
    const diff = end.getTime() - now.getTime()
    
    if (diff <= 0) return 'Ended'
    
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    return `${minutes}m`
  }

  if (activeTab === 'config') {
    return <EventsConfig />
  }

  return (
    <div className="events-page">
      <div className="events-header">
        <h1>Events Management</h1>
        <div className="events-tabs">
          <button
            className={activeTab === 'config' ? 'active' : ''}
            onClick={() => setActiveTab('config')}
          >
            Configuration
          </button>
          <button
            className={activeTab === 'events' ? 'active' : ''}
            onClick={() => setActiveTab('events')}
          >
            Events
          </button>
          <button
            className={activeTab === 'active' ? 'active' : ''}
            onClick={() => setActiveTab('active')}
          >
            Active Events
          </button>
          <button
            className={activeTab === 'history' ? 'active' : ''}
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
        </div>
      </div>

      <div className="events-content">
        {!selectedServerId && !serverLoading ? (
          <div className="empty-state">
            <p>No server selected.</p>
            <p>Please select a default server in Settings to view events.</p>
          </div>
        ) : selectedServerId && (
          <>
            {activeTab === 'events' && (
              <div className="events-list">
                {loading ? (
                  <div className="loading">Loading events...</div>
                ) : events.length === 0 ? (
                  <div className="empty-state">No events configured</div>
                ) : (
                  events.map((event) => (
                    <div key={event.id} className="event-card">
                      <div className="event-header">
                        <h3>{event.name}</h3>
                        <div className="event-badge">{event.eventType}</div>
                      </div>
                      {event.description && (
                        <p className="event-description">{event.description}</p>
                      )}
                      <div className="event-details">
                        <span>Schedule: {event.scheduleType}</span>
                        <span>Duration: {event.durationMinutes} minutes</span>
                        <span>Status: {event.enabled ? 'Enabled' : 'Disabled'}</span>
                      </div>
                      <div className="event-actions">
                        <button
                          onClick={() => event.id && handleStartEvent(event.id)}
                          className="btn btn-primary"
                        >
                          Start Now
                        </button>
                        <button
                          onClick={() => event.id && handleDeleteEvent(event.id)}
                          className="btn btn-danger"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'active' && (
              <div className="events-list">
                {loading ? (
                  <div className="loading">Loading active events...</div>
                ) : activeEvents.length === 0 ? (
                  <div className="empty-state">No active events</div>
                ) : (
                  activeEvents.map((activeEvent) => (
                    <div key={activeEvent.id} className="event-card active">
                      <div className="event-header">
                        <h3>Event #{activeEvent.eventId}</h3>
                        <div className="event-badge active">Active</div>
                      </div>
                      <div className="event-details">
                        <span>Started: {formatDate(activeEvent.startedAt)}</span>
                        <span>Ends: {formatDate(activeEvent.endsAt)}</span>
                        <span>Time Remaining: {getTimeRemaining(activeEvent.endsAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="events-list">
                {loading ? (
                  <div className="loading">Loading event history...</div>
                ) : eventHistory.length === 0 ? (
                  <div className="empty-state">No event history</div>
                ) : (
                  eventHistory.map((history) => (
                    <div key={history.id} className="event-card">
                      <div className="event-header">
                        <h3>{history.eventName}</h3>
                        <div className="event-badge">{history.eventType}</div>
                      </div>
                      <div className="event-details">
                        <span>Started: {formatDate(history.startedAt)}</span>
                        <span>Ended: {formatDate(history.endedAt)}</span>
                        <span>Participants: {history.totalParticipants}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        onCancel={() => setShowConfirmDialog(false)}
        onConfirm={confirmAction}
        title="Confirm Action"
        message={getConfirmDialogMessage()}
      />
    </div>
  )
}

