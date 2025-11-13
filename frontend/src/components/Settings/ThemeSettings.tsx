import { useState, useEffect } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { useNotifications } from '../../contexts/NotificationContext'
import { ThemeColors } from '../../types/theme'
import { themePresets } from '../../data/themePresets'
import { HiChevronDown, HiChevronUp } from 'react-icons/hi'
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog'
import './SettingsSection.css'
import './ThemeSettings.css'

export default function ThemeSettings() {
  const { colors, updateColors } = useTheme()
  const { addNotification } = useNotifications()
  const [localColors, setLocalColors] = useState<ThemeColors>(colors)
  const [loading, setLoading] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    presets: true,
    mainColors: true,
    containerColors: true,
  })

  useEffect(() => {
    setLocalColors(colors)
  }, [colors])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const handleColorChange = (key: keyof ThemeColors, value: string) => {
    setLocalColors((prev) => ({ ...prev, [key]: value }))
    setSelectedPreset(null)
  }

  const handlePresetSelect = (preset: typeof themePresets[0]) => {
    setLocalColors(preset.colors)
    setSelectedPreset(preset.name)
  }

  const handleSave = () => {
    setShowSaveConfirm(true)
  }

  const confirmSave = async () => {
    setShowSaveConfirm(false)
    setLoading(true)

    try {
      await updateColors(localColors)
      addNotification({
        type: 'success',
        title: 'Colors Saved',
        message: 'Theme colors have been updated successfully',
      })
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: error.response?.data?.error || 'Failed to save colors',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setShowResetConfirm(true)
  }

  const confirmReset = () => {
    const defaultColors: ThemeColors = {
      primary: '#4a9eff',
      secondary: '#1a1a1a',
      background: '#242424',
      text: '#ffffff',
      heading: '#4a9eff',
      card: '#2a2a2a',
      input: '#2a2a2a',
      border: '#333333',
      hover: '#3a3a3a',
      textSecondary: '#cccccc',
    }
    setLocalColors(defaultColors)
    setSelectedPreset(null)
    setShowResetConfirm(false)
    addNotification({
      type: 'info',
      title: 'Colors Reset',
      message: 'Theme colors have been reset to defaults',
    })
  }

  const colorFields: Array<{ key: keyof ThemeColors; label: string; category: 'main' | 'container' }> = [
    { key: 'primary', label: 'Primary', category: 'main' },
    { key: 'secondary', label: 'Secondary', category: 'main' },
    { key: 'background', label: 'Background', category: 'main' },
    { key: 'text', label: 'Text', category: 'main' },
    { key: 'heading', label: 'Heading', category: 'main' },
    { key: 'card', label: 'Card', category: 'container' },
    { key: 'input', label: 'Input', category: 'container' },
    { key: 'border', label: 'Border', category: 'container' },
    { key: 'hover', label: 'Hover', category: 'container' },
    { key: 'textSecondary', label: 'Text Secondary', category: 'container' },
  ]

  const mainColors = colorFields.filter((f) => f.category === 'main')
  const containerColors = colorFields.filter((f) => f.category === 'container')

  return (
    <div className="settings-section theme-settings">
      <div className="theme-header">
        <h2>Theme Colors</h2>
        <div className="theme-actions-top">
          <button onClick={handleSave} disabled={loading} className="settings-button save">
            {loading ? 'Saving...' : 'Save'}
          </button>
          <button onClick={handleReset} className="settings-button reset">
            Reset
          </button>
        </div>
      </div>

      <div className="theme-presets">
        <div className="collapsible-header" onClick={() => isMobile && toggleSection('presets')}>
          <h3>Presets</h3>
          {isMobile && (
            <span className="collapse-icon">
              {expandedSections.presets ? <HiChevronUp size={20} /> : <HiChevronDown size={20} />}
            </span>
          )}
        </div>
        {(expandedSections.presets || !isMobile) && (
          <div className="preset-grid">
            {themePresets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handlePresetSelect(preset)}
                className={`preset-card ${selectedPreset === preset.name ? 'selected' : ''}`}
                style={{
                  borderColor: selectedPreset === preset.name ? preset.colors.primary : 'transparent',
                }}
              >
                <div className="preset-preview">
                  <div className="preset-color" style={{ backgroundColor: preset.colors.primary }} />
                  <div className="preset-color" style={{ backgroundColor: preset.colors.secondary }} />
                  <div className="preset-color" style={{ backgroundColor: preset.colors.background }} />
                  <div className="preset-color" style={{ backgroundColor: preset.colors.card }} />
                </div>
                <div className="preset-info">
                  <div className="preset-name">{preset.name}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="theme-colors-compact">
        <div className="color-group-compact">
          <div className="collapsible-header" onClick={() => isMobile && toggleSection('mainColors')}>
            <h3>Main Colors</h3>
            {isMobile && (
              <span className="collapse-icon">
                {expandedSections.mainColors ? <HiChevronUp size={20} /> : <HiChevronDown size={20} />}
              </span>
            )}
          </div>
          {(expandedSections.mainColors || !isMobile) && (
            <div className="color-grid">
              {mainColors.map((field) => (
                <div key={field.key} className="color-card">
                  <div className="color-card-header">
                    <span className="color-label-compact">{field.label}</span>
                  </div>
                  <div className="color-card-controls">
                    <input
                      type="color"
                      value={localColors[field.key]}
                      onChange={(e) => handleColorChange(field.key, e.target.value)}
                      className="color-picker-compact"
                    />
                    <input
                      type="text"
                      value={localColors[field.key]}
                      onChange={(e) => handleColorChange(field.key, e.target.value)}
                      className="color-text-compact"
                      placeholder="#000000"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="color-group-compact">
          <div className="collapsible-header" onClick={() => isMobile && toggleSection('containerColors')}>
            <h3>Container Colors</h3>
            {isMobile && (
              <span className="collapse-icon">
                {expandedSections.containerColors ? <HiChevronUp size={20} /> : <HiChevronDown size={20} />}
              </span>
            )}
          </div>
          {(expandedSections.containerColors || !isMobile) && (
            <div className="color-grid">
              {containerColors.map((field) => (
                <div key={field.key} className="color-card">
                  <div className="color-card-header">
                    <span className="color-label-compact">{field.label}</span>
                  </div>
                  <div className="color-card-controls">
                    <input
                      type="color"
                      value={localColors[field.key]}
                      onChange={(e) => handleColorChange(field.key, e.target.value)}
                      className="color-picker-compact"
                    />
                    <input
                      type="text"
                      value={localColors[field.key]}
                      onChange={(e) => handleColorChange(field.key, e.target.value)}
                      className="color-text-compact"
                      placeholder="#000000"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showSaveConfirm}
        title="Save Theme Colors"
        message="Are you sure you want to save these theme colors? This will update the appearance of the entire application."
        confirmText="Save"
        cancelText="Cancel"
        onConfirm={confirmSave}
        onCancel={() => setShowSaveConfirm(false)}
        variant="default"
      />

      <ConfirmDialog
        isOpen={showResetConfirm}
        title="Reset to Defaults"
        message="Are you sure you want to reset all theme colors to their default values? This action cannot be undone."
        confirmText="Reset"
        cancelText="Cancel"
        onConfirm={confirmReset}
        onCancel={() => setShowResetConfirm(false)}
        variant="warning"
      />
    </div>
  )
}
