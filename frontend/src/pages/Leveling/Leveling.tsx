import LevelingConfig from '../../components/Leveling/LevelingConfig'
import './Leveling.css'

export default function Leveling() {
  return (
    <div className="leveling-page">
      <h1>Leveling System</h1>
      <p className="leveling-page-description">
        Configure the leveling system to track user interactions and award XP and levels.
      </p>
      <LevelingConfig />
    </div>
  )
}

