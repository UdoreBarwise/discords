import MemeConfig from '../../components/Meme/MemeConfig'
import './Meme.css'

export default function Meme() {
  return (
    <div className="meme-page">
      <div className="meme-header">
        <h1>Meme Feature</h1>
        <p className="meme-subtitle">
          Configure the Discord meme feature settings
        </p>
      </div>

      <div className="meme-content">
        <MemeConfig />
      </div>
    </div>
  )
}

