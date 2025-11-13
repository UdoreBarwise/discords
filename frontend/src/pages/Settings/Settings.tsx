import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import ThemeSettings from '../../components/Settings/ThemeSettings'
import BotTokenSettings from '../../components/Settings/BotTokenSettings'
import AISettings from '../../components/Settings/AISettings'
import './Settings.css'

type SettingsTab = 'theme' | 'token' | 'ai'

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') as SettingsTab | null
  const [activeTab, setActiveTab] = useState<SettingsTab>(tabParam && ['theme', 'token', 'ai'].includes(tabParam) ? tabParam : 'theme')

  useEffect(() => {
    if (tabParam && ['theme', 'token', 'ai'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  const tabs = [
    { id: 'theme' as SettingsTab, label: 'Theme' },
    { id: 'token' as SettingsTab, label: 'Bot Token' },
    { id: 'ai' as SettingsTab, label: 'AI' },
  ]

  return (
    <div className="settings-page">
      <h1>Settings</h1>
      
      <div className="settings-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id)
              setSearchParams({ tab: tab.id })
            }}
            className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="settings-content">
        {activeTab === 'theme' && <ThemeSettings />}
        {activeTab === 'token' && <BotTokenSettings />}
        {activeTab === 'ai' && <AISettings />}
      </div>
    </div>
  )
}
