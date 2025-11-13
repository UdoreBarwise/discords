import DiceGameConfig from '../../components/DiceGame/DiceGameConfig'
import './DiceGame.css'

export default function DiceGame() {
  return (
    <div className="dice-game-page">
      <div className="dice-game-header">
        <h1>Dice Game</h1>
        <p className="dice-game-subtitle">
          Configure the Discord dice game settings
        </p>
      </div>

      <div className="dice-game-content">
        <DiceGameConfig />
      </div>
    </div>
  )
}

