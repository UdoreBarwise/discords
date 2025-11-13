import { useState, useEffect } from 'react'
import { votingService, VotingPoll, CreatePollRequest } from '../../services/votingService'
import { discordService, Guild, Channel } from '../../services/discordService'
import { botService } from '../../services/botService'
import { useNotifications } from '../../contexts/NotificationContext'
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog'
import './VotingConfig.css'

export default function VotingConfig() {
  const { addNotification } = useNotifications()
  const [loading, setLoading] = useState(false)
  const [guilds, setGuilds] = useState<Guild[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [polls, setPolls] = useState<VotingPoll[]>([])
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pollToDelete, setPollToDelete] = useState<string | null>(null)
  const [includeClosed, setIncludeClosed] = useState(false)
  const [creatingChannel, setCreatingChannel] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [showCreateChannelInput, setShowCreateChannelInput] = useState(false)

  const [formData, setFormData] = useState<CreatePollRequest>({
    guildId: '',
    channelId: '',
    title: '',
    description: '',
    options: ['', ''],
    expiresAt: '',
  })

  useEffect(() => {
    loadGuilds()
    loadDefaultServer()
  }, [])

  useEffect(() => {
    if (formData.guildId) {
      loadChannels(formData.guildId)
      loadPolls(formData.guildId)
    }
  }, [formData.guildId, includeClosed])

  const loadDefaultServer = async () => {
    try {
      const defaultServerId = await botService.getDefaultServer()
      if (defaultServerId && !formData.guildId) {
        setFormData({ ...formData, guildId: defaultServerId })
      }
    } catch (error: any) {
      console.error('Failed to load default server:', error)
    }
  }

  const loadGuilds = async () => {
    try {
      const data = await discordService.getGuilds()
      setGuilds(data)
    } catch (error: any) {
      console.error('Failed to load guilds:', error)
      addNotification({
        type: 'error',
        title: 'Failed to Load Guilds',
        message: error.response?.data?.error || 'Failed to fetch Discord servers',
      })
    }
  }

  const loadChannels = async (guildId: string) => {
    try {
      const data = await discordService.getChannels(guildId)
      setChannels(data)
    } catch (error: any) {
      console.error('Failed to load channels:', error)
      addNotification({
        type: 'error',
        title: 'Failed to Load Channels',
        message: error.response?.data?.error || 'Failed to fetch channels',
      })
    }
  }

  const loadPolls = async (guildId: string) => {
    try {
      const data = await votingService.getPolls(guildId, includeClosed)
      setPolls(data)
    } catch (error: any) {
      console.error('Failed to load polls:', error)
      addNotification({
        type: 'error',
        title: 'Failed to Load Polls',
        message: error.response?.data?.error || 'Failed to fetch polls',
      })
    }
  }

  const handleAddOption = () => {
    if (formData.options.length < 10) {
      setFormData({
        ...formData,
        options: [...formData.options, ''],
      })
    }
  }

  const handleRemoveOption = (index: number) => {
    if (formData.options.length > 2) {
      setFormData({
        ...formData,
        options: formData.options.filter((_, i) => i !== index),
      })
    }
  }

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options]
    newOptions[index] = value
    setFormData({ ...formData, options: newOptions })
  }

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) {
      addNotification({
        type: 'warning',
        title: 'Invalid Input',
        message: 'Please enter a channel name',
      })
      return
    }

    if (!formData.guildId) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please select a server first',
      })
      return
    }

    setCreatingChannel(true)
    try {
      const newChannel = await discordService.createChannel(formData.guildId, newChannelName.trim())
      await loadChannels(formData.guildId)
      setFormData({ ...formData, channelId: newChannel.id })
      setNewChannelName('')
      setShowCreateChannelInput(false)
      addNotification({
        type: 'success',
        title: 'Channel Created',
        message: `Channel "${newChannel.name}" created successfully with admin-only write permissions`,
      })
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Create Channel',
        message: error.response?.data?.error || 'Failed to create channel',
      })
    } finally {
      setCreatingChannel(false)
    }
  }

  const handleChannelSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === '__create__') {
      setShowCreateChannelInput(true)
      setNewChannelName('')
      return
    }
    setShowCreateChannelInput(false)
    setFormData({ ...formData, channelId: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const validOptions = formData.options.filter(opt => opt.trim().length > 0)
      if (validOptions.length < 2) {
        addNotification({
          type: 'error',
          title: 'Validation Error',
          message: 'A poll must have at least 2 options',
        })
        setLoading(false)
        return
      }

      const request: CreatePollRequest = {
        guildId: formData.guildId,
        channelId: formData.channelId,
        title: formData.title,
        description: formData.description || undefined,
        options: validOptions,
        expiresAt: formData.expiresAt || undefined,
      }

      await votingService.createPoll(request)
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Poll created successfully!',
      })

      setFormData({
        guildId: formData.guildId,
        channelId: '',
        title: '',
        description: '',
        options: ['', ''],
        expiresAt: '',
      })

      loadPolls(formData.guildId)
    } catch (error: any) {
      console.error('Failed to create poll:', error)
      addNotification({
        type: 'error',
        title: 'Failed to Create Poll',
        message: error.response?.data?.error || 'Failed to create poll',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClosePoll = async (pollId: string) => {
    try {
      await votingService.closePoll(pollId)
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Poll closed successfully!',
      })
      loadPolls(formData.guildId)
    } catch (error: any) {
      console.error('Failed to close poll:', error)
      addNotification({
        type: 'error',
        title: 'Failed to Close Poll',
        message: error.response?.data?.error || 'Failed to close poll',
      })
    }
  }

  const handleDeletePoll = async () => {
    if (!pollToDelete) return

    try {
      await votingService.deletePoll(pollToDelete)
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Poll deleted successfully!',
      })
      loadPolls(formData.guildId)
    } catch (error: any) {
      console.error('Failed to delete poll:', error)
      addNotification({
        type: 'error',
        title: 'Failed to Delete Poll',
        message: error.response?.data?.error || 'Failed to delete poll',
      })
    } finally {
      setShowConfirmDialog(false)
      setPollToDelete(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="voting-config">
      <div className="voting-config-section">
        <h2>Create New Poll</h2>
        <form onSubmit={handleSubmit} className="voting-form">
          <div className="form-group">
            <label htmlFor="guildId">Server</label>
            <select
              id="guildId"
              value={formData.guildId}
              onChange={(e) => setFormData({ ...formData, guildId: e.target.value, channelId: '' })}
              required
            >
              <option value="">Select a server</option>
              {guilds.map((guild) => (
                <option key={guild.id} value={guild.id}>
                  {guild.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="channelId">Channel</label>
            <select
              id="channelId"
              value={showCreateChannelInput ? '__create__' : formData.channelId}
              onChange={handleChannelSelectChange}
              required
              disabled={!formData.guildId}
            >
              <option value="">Select a channel</option>
              <option value="__create__">+ Create New Channel (Admin-only write)</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  #{channel.name}
                </option>
              ))}
            </select>
            {showCreateChannelInput && (
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="New channel name"
                  disabled={loading || creatingChannel}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateChannel()
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: 'var(--input-bg, #2a2a2a)',
                    color: 'var(--text-primary, #fff)',
                    border: '1px solid var(--border-color, #444)',
                    borderRadius: '6px',
                    fontSize: '1rem',
                  }}
                />
                <button
                  onClick={handleCreateChannel}
                  disabled={loading || creatingChannel || !newChannelName.trim()}
                  className="button-primary"
                  style={{ padding: '0.75rem 1.5rem' }}
                >
                  {creatingChannel ? 'Creating...' : 'Create'}
                </button>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="title">Poll Title</label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="Enter poll title"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description (Optional)</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter poll description"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Options (2-10 options required)</label>
            {formData.options.map((option, index) => (
              <div key={index} className="option-input-group">
                <input
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  required
                />
                {formData.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(index)}
                    className="remove-option-btn"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            {formData.options.length < 10 && (
              <button type="button" onClick={handleAddOption} className="add-option-btn">
                Add Option
              </button>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="expiresAt">Expires At (Optional)</label>
            <input
              type="datetime-local"
              id="expiresAt"
              value={formData.expiresAt}
              onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
            />
          </div>

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Creating...' : 'Create Poll'}
          </button>
        </form>
      </div>

      <div className="voting-config-section">
        <div className="polls-header">
          <h2>Existing Polls</h2>
          <label className="toggle-closed">
            <input
              type="checkbox"
              checked={includeClosed}
              onChange={(e) => setIncludeClosed(e.target.checked)}
            />
            Include Closed Polls
          </label>
        </div>
        {formData.guildId ? (
          <div className="polls-list">
            {polls.length === 0 ? (
              <p className="no-polls">No polls found</p>
            ) : (
              polls.map((poll) => (
                <div key={poll.pollId} className={`poll-item ${poll.closed ? 'closed' : ''}`}>
                  <div className="poll-header">
                    <h3>{poll.title}</h3>
                    <span className={`poll-status ${poll.closed ? 'closed' : 'open'}`}>
                      {poll.closed ? 'Closed' : 'Open'}
                    </span>
                  </div>
                  {poll.description && <p className="poll-description">{poll.description}</p>}
                  <div className="poll-options">
                    {poll.options.map((option, index) => (
                      <div key={index} className="poll-option">
                        {index + 1}. {option}
                      </div>
                    ))}
                  </div>
                  <div className="poll-meta">
                    <span>Created: {formatDate(poll.createdAt)}</span>
                    {poll.expiresAt && (
                      <span>Expires: {formatDate(poll.expiresAt)}</span>
                    )}
                  </div>
                  <div className="poll-actions">
                    {!poll.closed && (
                      <button
                        onClick={() => handleClosePoll(poll.pollId)}
                        className="close-poll-btn"
                      >
                        Close Poll
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setPollToDelete(poll.pollId)
                        setShowConfirmDialog(true)
                      }}
                      className="delete-poll-btn"
                    >
                      Delete Poll
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <p className="no-polls">Select a server to view polls</p>
        )}
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => {
          setShowConfirmDialog(false)
          setPollToDelete(null)
        }}
        onConfirm={handleDeletePoll}
        title="Delete Poll"
        message="Are you sure you want to delete this poll? This action cannot be undone."
      />
    </div>
  )
}

