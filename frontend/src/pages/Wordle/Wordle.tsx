import WordleConfig from '../../components/Wordle/WordleConfig'
import './Wordle.css'

export default function Wordle() {
  return (
    <div className="wordle-page">
      <div className="wordle-header">
        <h1>Wordle</h1>
        <p className="wordle-subtitle">
          Configure the Discord Wordle game settings
        </p>
      </div>

      <div className="wordle-content">
        <WordleConfig />
      </div>
    </div>
  )
}

