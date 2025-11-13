import { useState, useEffect } from 'react'
import { embedService, EmbedData } from '../../services/embedService'
import { discordService, Channel } from '../../services/discordService'
import { useNotifications } from '../../contexts/NotificationContext'
import { useServer } from '../../contexts/ServerContext'
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog'
import './EmbedBuilder.css'

export default function EmbedBuilder() {
  const { addNotification } = useNotifications()
  const { selectedServerId, isLoading: serverLoading } = useServer()
  const [loading, setLoading] = useState(false)
  const [channels, setChannels] = useState<Channel[]>([])
  const [fields, setFields] = useState<Array<{ name: string; value: string; inline: boolean }>>([])
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    destination: false,
    basic: false,
    author: true,
    media: true,
    fields: true,
    footer: true,
  })

  const [embedData, setEmbedData] = useState<EmbedData>({
    title: '',
    description: '',
    color: '#5865f2',
    footer: '',
    thumbnail: '',
    image: '',
    author: {
      name: '',
      iconUrl: '',
      url: '',
    },
    timestamp: false,
  })

  const [selectedChannelId, setSelectedChannelId] = useState('')

  useEffect(() => {
    if (selectedServerId) {
      loadChannels(selectedServerId)
    }
  }, [selectedServerId])

  const loadChannels = async (guildId: string) => {
    try {
      const data = await discordService.getChannels(guildId)
      setChannels(data)
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Load Channels',
        message: error.response?.data?.error || 'Failed to fetch channels',
      })
    }
  }

  const handleSendClick = () => {
    if (!selectedServerId || !selectedChannelId) {
      addNotification({
        type: 'warning',
        title: 'Missing Selection',
        message: 'Please select a channel',
      })
      return
    }

    // Validate that embed has at least title, description, or fields
    const hasTitle = embedData.title && embedData.title.trim().length > 0
    const hasDescription = embedData.description && embedData.description.trim().length > 0
    const hasFields = fields.some(f => f.name.trim() && f.value.trim())

    if (!hasTitle && !hasDescription && !hasFields) {
      addNotification({
        type: 'warning',
        title: 'Invalid Embed',
        message: 'Embed must have at least a title, description, or fields',
      })
      return
    }

    setShowConfirmDialog(true)
  }

  const handleSend = async () => {
    setShowConfirmDialog(false)
    setLoading(true)

    try {
      const embedToSend = {
        ...embedData,
        fields: fields.filter((f) => f.name.trim() && f.value.trim()),
        author: embedData.author?.name ? embedData.author : undefined,
      }
      await embedService.sendEmbed(selectedServerId!, selectedChannelId, embedToSend)
      addNotification({
        type: 'success',
        title: 'Embed Sent',
        message: 'Your embed message has been sent successfully!',
      })
      // Reset form
      setEmbedData({
        title: '',
        description: '',
        color: '#5865f2',
        footer: '',
        thumbnail: '',
        image: '',
        author: {
          name: '',
          iconUrl: '',
          url: '',
        },
        timestamp: false,
      })
      setFields([])
      setSelectedChannelId('')
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Send Failed',
        message: error.response?.data?.error || 'Failed to send embed',
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const addField = () => {
    setFields([...fields, { name: '', value: '', inline: false }])
  }

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index))
  }

  const updateField = (index: number, field: { name: string; value: string; inline: boolean }) => {
    const newFields = [...fields]
    newFields[index] = field
    setFields(newFields)
  }

  const getPreviewColor = () => {
    if (!embedData.color) return '#5865f2'
    const hex = embedData.color.replace('#', '')
    return `#${hex}`
  }

  // Validation logic
  const hasTitle = embedData.title && embedData.title.trim().length > 0
  const hasDescription = embedData.description && embedData.description.trim().length > 0
  const hasFields = fields.some(f => f.name.trim() && f.value.trim())
  const hasRequiredContent = hasTitle || hasDescription || hasFields

  // Live validation errors
  const validationErrors = {
    channelId: !selectedChannelId ? 'Channel is required' : '',
    content: !hasRequiredContent ? 'At least one of title, description, or fields is required' : '',
    title: !hasRequiredContent && !hasTitle ? 'Title is required when no description or fields are provided' : '',
    description: !hasRequiredContent && !hasDescription ? 'Description is required when no title or fields are provided' : '',
    fields: !hasRequiredContent && !hasFields ? 'At least one field is required when no title or description are provided' : '',
  }

  // Check if form is valid
  const isFormValid = selectedServerId && selectedChannelId && hasRequiredContent

  return (
    <div className="embed-builder">
      <div className="embed-builder-layout">
        <div className="embed-builder-form">
          <h2>Embed Builder</h2>

          {!selectedServerId && !serverLoading ? (
            <div className="embed-builder-section">
              <p>No server selected.</p>
              <p>Please select a default server in Settings to use the embed builder.</p>
            </div>
          ) : (
            <>
            <div className={`collapsible-section ${validationErrors.channelId ? 'has-required-empty' : ''}`}>
              <button
                type="button"
                className="collapsible-header"
                onClick={() => toggleSection('destination')}
              >
                <span>
                  Destination
                  {validationErrors.channelId && <span className="required-indicator"> *</span>}
                </span>
                <span className="collapsible-icon">
                  {collapsedSections.destination ? '▼' : '▲'}
                </span>
              </button>
              {!collapsedSections.destination && (
                <div className="collapsible-content">
                  <div className="embed-builder-section">
                    <label className={validationErrors.channelId ? 'required' : ''}>
                      Channel <span className="required-indicator">*</span>
                    </label>
                    <select
                      value={selectedChannelId}
                      onChange={(e) => setSelectedChannelId(e.target.value)}
                      disabled={loading}
                      className={validationErrors.channelId ? 'required-field error' : ''}
                    >
                      <option value="">Select a channel</option>
                      {channels.map((channel) => (
                        <option key={channel.id} value={channel.id}>
                          #{channel.name}
                        </option>
                      ))}
                    </select>
                    {validationErrors.channelId && (
                      <span className="field-error">{validationErrors.channelId}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

          <div className={`collapsible-section ${validationErrors.content ? 'has-required-empty' : ''}`}>
            <button
              type="button"
              className="collapsible-header"
              onClick={() => toggleSection('basic')}
            >
              <span>
                Basic Information
                {validationErrors.content && <span className="required-indicator"> *</span>}
              </span>
              <span className="collapsible-icon">
                {collapsedSections.basic ? '▼' : '▲'}
              </span>
            </button>
            {!collapsedSections.basic && (
              <div className="collapsible-content">
                {validationErrors.content && (
                  <div className="validation-message error">
                    {validationErrors.content}
                  </div>
                )}
                <div className="embed-builder-section">
                  <label className={validationErrors.title ? 'required' : ''}>
                    Title
                    {validationErrors.title && <span className="required-indicator">*</span>}
                    {hasRequiredContent && <span className="optional-hint"> (optional)</span>}
                  </label>
                  <input
                    type="text"
                    value={embedData.title || ''}
                    onChange={(e) => setEmbedData({ ...embedData, title: e.target.value })}
                    placeholder="Embed title"
                    maxLength={256}
                    className={validationErrors.title ? 'required-field error' : ''}
                  />
                  {validationErrors.title && (
                    <span className="field-error">{validationErrors.title}</span>
                  )}
                </div>

                <div className="embed-builder-section">
                  <label className={validationErrors.description ? 'required' : ''}>
                    Description
                    {validationErrors.description && <span className="required-indicator">*</span>}
                    {hasRequiredContent && <span className="optional-hint"> (optional)</span>}
                  </label>
                  <textarea
                    value={embedData.description || ''}
                    onChange={(e) => setEmbedData({ ...embedData, description: e.target.value })}
                    placeholder="Embed description"
                    rows={4}
                    maxLength={4096}
                    className={validationErrors.description ? 'required-field error' : ''}
                  />
                  {validationErrors.description && (
                    <span className="field-error">{validationErrors.description}</span>
                  )}
                </div>

                <div className="embed-builder-section">
                  <label>Color</label>
                  <div className="color-input-group">
                    <input
                      type="color"
                      value={getPreviewColor()}
                      onChange={(e) => setEmbedData({ ...embedData, color: e.target.value })}
                    />
                    <input
                      type="text"
                      value={embedData.color || '#5865f2'}
                      onChange={(e) => setEmbedData({ ...embedData, color: e.target.value })}
                      placeholder="#5865f2"
                      pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                    />
                  </div>
                </div>

                <div className="embed-builder-section">
                  <label>
                    <input
                      type="checkbox"
                      checked={embedData.timestamp || false}
                      onChange={(e) => setEmbedData({ ...embedData, timestamp: e.target.checked })}
                    />
                    Show Timestamp
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="collapsible-section">
            <button
              type="button"
              className="collapsible-header"
              onClick={() => toggleSection('author')}
            >
              <span>Author</span>
              <span className="collapsible-icon">
                {collapsedSections.author ? '▼' : '▲'}
              </span>
            </button>
            {!collapsedSections.author && (
              <div className="collapsible-content">
                <div className="embed-builder-section">
                  <label>Author Name</label>
                  <input
                    type="text"
                    value={embedData.author?.name || ''}
                    onChange={(e) =>
                      setEmbedData({
                        ...embedData,
                        author: { ...embedData.author, name: e.target.value },
                      })
                    }
                    placeholder="Author name"
                    maxLength={256}
                  />
                </div>
                <div className="embed-builder-section">
                  <label>Author Icon URL</label>
                  <input
                    type="text"
                    value={embedData.author?.iconUrl || ''}
                    onChange={(e) =>
                      setEmbedData({
                        ...embedData,
                        author: { ...embedData.author, iconUrl: e.target.value },
                      })
                    }
                    placeholder="Author icon URL (optional)"
                  />
                </div>
                <div className="embed-builder-section">
                  <label>Author URL</label>
                  <input
                    type="text"
                    value={embedData.author?.url || ''}
                    onChange={(e) =>
                      setEmbedData({
                        ...embedData,
                        author: { ...embedData.author, url: e.target.value },
                      })
                    }
                    placeholder="Author URL (optional)"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="collapsible-section">
            <button
              type="button"
              className="collapsible-header"
              onClick={() => toggleSection('media')}
            >
              <span>Media</span>
              <span className="collapsible-icon">
                {collapsedSections.media ? '▼' : '▲'}
              </span>
            </button>
            {!collapsedSections.media && (
              <div className="collapsible-content">
                <div className="embed-builder-section">
                  <label>Thumbnail URL</label>
                  <input
                    type="text"
                    value={embedData.thumbnail || ''}
                    onChange={(e) => setEmbedData({ ...embedData, thumbnail: e.target.value })}
                    placeholder="Thumbnail image URL"
                  />
                </div>

                <div className="embed-builder-section">
                  <label>Image URL</label>
                  <input
                    type="text"
                    value={embedData.image || ''}
                    onChange={(e) => setEmbedData({ ...embedData, image: e.target.value })}
                    placeholder="Large image URL"
                  />
                </div>
              </div>
            )}
          </div>

          <div className={`collapsible-section ${validationErrors.fields ? 'has-required-empty' : ''}`}>
            <button
              type="button"
              className="collapsible-header"
              onClick={() => toggleSection('fields')}
            >
              <span>
                Fields
                {validationErrors.fields && <span className="required-indicator"> *</span>}
              </span>
              <span className="collapsible-icon">
                {collapsedSections.fields ? '▼' : '▲'}
              </span>
            </button>
            {!collapsedSections.fields && (
              <div className="collapsible-content">
                {validationErrors.fields && (
                  <div className="validation-message error">
                    {validationErrors.fields}
                  </div>
                )}
                <div className="embed-builder-section">
                  {fields.map((field, index) => {
                    const fieldHasContent = field.name.trim() && field.value.trim()
                    const fieldIsRequired = !hasRequiredContent && !fieldHasContent && fields.length > 0
                    return (
                      <div key={index} className={`embed-field ${fieldIsRequired ? 'has-error' : ''}`}>
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) =>
                            updateField(index, { ...field, name: e.target.value })
                          }
                          placeholder="Field name"
                          maxLength={256}
                          className={fieldIsRequired && !field.name.trim() ? 'error' : ''}
                        />
                        <textarea
                          value={field.value}
                          onChange={(e) =>
                            updateField(index, { ...field, value: e.target.value })
                          }
                          placeholder="Field value"
                          rows={2}
                          maxLength={1024}
                          className={fieldIsRequired && !field.value.trim() ? 'error' : ''}
                        />
                        {fieldIsRequired && (
                          <span className="field-error">Field name and value are required when no title or description are provided</span>
                        )}
                        <div className="embed-field-actions">
                          <label>
                            <input
                              type="checkbox"
                              checked={field.inline}
                              onChange={(e) =>
                                updateField(index, { ...field, inline: e.target.checked })
                              }
                            />
                            Inline
                          </label>
                          <button
                            type="button"
                            onClick={() => removeField(index)}
                            className="embed-remove-field"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  <button type="button" onClick={addField} className="embed-add-field">
                    Add Field
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="collapsible-section">
            <button
              type="button"
              className="collapsible-header"
              onClick={() => toggleSection('footer')}
            >
              <span>Footer</span>
              <span className="collapsible-icon">
                {collapsedSections.footer ? '▼' : '▲'}
              </span>
            </button>
            {!collapsedSections.footer && (
              <div className="collapsible-content">
                <div className="embed-builder-section">
                  <label>Footer Text</label>
                  <input
                    type="text"
                    value={embedData.footer || ''}
                    onChange={(e) => setEmbedData({ ...embedData, footer: e.target.value })}
                    placeholder="Footer text"
                    maxLength={2048}
                  />
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleSendClick}
            disabled={loading || !isFormValid}
            className="embed-send-button"
          >
            {loading ? 'Sending...' : 'Send Embed'}
          </button>
          {!isFormValid && (
            <div className="validation-summary">
              Please fix the errors above before sending the embed.
            </div>
          )}
            <div className="embed-builder-preview floating">
              <div className="embed-preview-container">
                <div className="discord-embed-preview">
                  <div
                    className="embed-preview-color-bar"
                    style={{ backgroundColor: getPreviewColor() }}
                  />
                  <div className="embed-preview-content">
                    {embedData.author?.name && (
                      <div className="embed-preview-author">
                        {embedData.author.iconUrl && (
                          <img
                            src={embedData.author.iconUrl}
                            alt=""
                            className="embed-preview-author-icon"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        )}
                        {embedData.author.url ? (
                          <a href={embedData.author.url} className="embed-preview-author-link">
                            {embedData.author.name}
                          </a>
                        ) : (
                          <span>{embedData.author.name}</span>
                        )}
                      </div>
                    )}
                    {embedData.title && (
                      <div className="embed-preview-title">{embedData.title}</div>
                    )}
                    {embedData.description && (
                      <div className="embed-preview-description">{embedData.description}</div>
                    )}
                    {embedData.thumbnail && (
                      <div className="embed-preview-thumbnail">
                        <img
                          src={embedData.thumbnail}
                          alt=""
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                    {fields.filter((f) => f.name.trim() && f.value.trim()).length > 0 && (
                      <div className="embed-preview-fields">
                        {fields
                          .filter((f) => f.name.trim() && f.value.trim())
                          .map((field, index) => (
                            <div
                              key={index}
                              className={`embed-preview-field ${field.inline ? 'inline' : ''}`}
                            >
                              <div className="embed-preview-field-name">{field.name}</div>
                              <div className="embed-preview-field-value">{field.value}</div>
                            </div>
                          ))}
                      </div>
                    )}
                    {embedData.image && (
                      <div className="embed-preview-image">
                        <img
                          src={embedData.image}
                          alt=""
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                    <div className="embed-preview-footer">
                      {embedData.footer && <span>{embedData.footer}</span>}
                      {embedData.timestamp && (
                        <span className="embed-preview-timestamp">
                          {new Date().toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Send Embed"
        message={
          <div>
            <p>Are you sure you want to send this embed to the selected channel?</p>
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
              Channel: <strong>#{channels.find((c) => c.id === selectedChannelId)?.name || 'Unknown'}</strong>
            </p>
          </div>
        }
        confirmText="Send"
        cancelText="Cancel"
        onConfirm={handleSend}
        onCancel={() => setShowConfirmDialog(false)}
        variant="default"
      />
    </div>
  )
}

