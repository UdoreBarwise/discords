import VotingConfig from '../../components/Voting/VotingConfig'
import './Voting.css'

export default function Voting() {
  return (
    <div className="voting-page">
      <div className="voting-header">
        <h1>Voting System</h1>
        <p className="voting-subtitle">
          Create anonymous voting polls that can be used via slash commands or the frontend
        </p>
      </div>

      <div className="voting-content">
        <VotingConfig />
      </div>
    </div>
  )
}

