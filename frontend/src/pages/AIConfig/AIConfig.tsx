import AIConfig from '../../components/AI/AIConfig'
import './AIConfig.css'

export default function AIConfigPage() {
  return (
    <div className="ai-config-page">
      <div className="ai-config-header">
        <h1>AI Configuration</h1>
        <p className="ai-config-subtitle">
          Configure AI response settings, rate limits, and permissions
        </p>
      </div>

      <div className="ai-config-content">
        <AIConfig />
      </div>
    </div>
  )
}

