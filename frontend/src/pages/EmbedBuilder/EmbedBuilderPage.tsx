import EmbedBuilder from '../../components/EmbedBuilder/EmbedBuilder'
import './EmbedBuilderPage.css'

export default function EmbedBuilderPage() {
  return (
    <div className="embed-builder-page">
      <div className="embed-builder-header">
        <h1>Embed Builder</h1>
        <p className="embed-builder-subtitle">
          Create and send custom Discord embed messages
        </p>
      </div>

      <EmbedBuilder />
    </div>
  )
}

