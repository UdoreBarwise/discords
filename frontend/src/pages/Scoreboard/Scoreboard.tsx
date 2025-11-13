import { useState, useEffect } from 'react'
import { scoreboardService, ScoreboardEntry } from '../../services/scoreboardService'
import { useNotifications } from '../../contexts/NotificationContext'
import { useServer } from '../../contexts/ServerContext'
import ScoreboardConfig from '../../components/Scoreboard/ScoreboardConfig'
import './Scoreboard.css'

export default function Scoreboard() {
  const [showConfig, setShowConfig] = useState(false)
  const { addNotification } = useNotifications()
  const { selectedServerId, isLoading: serverLoading } = useServer()
  const [gameType, setGameType] = useState<'all' | 'dice' | 'wordle'>('all')
  const [scoreboard, setScoreboard] = useState<ScoreboardEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedServerId) {
      loadScoreboard()
    }
  }, [selectedServerId, gameType])

  const loadScoreboard = async () => {
    if (!selectedServerId) return

    try {
      setLoading(true)
      const gameTypeFilter = gameType === 'all' ? undefined : gameType
      const data = await scoreboardService.getScoreboard(selectedServerId, gameTypeFilter)
      setScoreboard(data)
    } catch (error: any) {
      addNotification('error', `Failed to load scoreboard: ${error.message}`)
      setScoreboard([])
    } finally {
      setLoading(false)
    }
  }

  const getRankEmoji = (index: number) => {
    if (index === 0) return '🥇'
    if (index === 1) return '🥈'
    if (index === 2) return '🥉'
    return `${index + 1}.`
  }

  return (
    <div className="scoreboard-page">
      <div className="scoreboard-header">
        <div>
          <h1>Scoreboard</h1>
          <p className="scoreboard-subtitle">View server-wide game statistics and leaderboards</p>
        </div>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="btn-config-toggle"
        >
          {showConfig ? 'Hide' : 'Show'} Configuration
        </button>
      </div>

      {showConfig && (
        <div className="scoreboard-config-section">
          <ScoreboardConfig />
        </div>
      )}

      {!selectedServerId && !serverLoading ? (
        <div className="scoreboard-empty">
          <p>No server selected.</p>
          <p className="scoreboard-empty-hint">Please select a default server in Settings to view the scoreboard.</p>
        </div>
      ) : (
        <>
          <div className="scoreboard-controls">
            <div className="scoreboard-control-group">
          <label htmlFor="game-type-select">Game Type</label>
          <select
            id="game-type-select"
            value={gameType}
            onChange={(e) => setGameType(e.target.value as 'all' | 'dice' | 'wordle')}
            disabled={loading}
          >
            <option value="all">All Games</option>
            <option value="dice">Dice Game</option>
            <option value="wordle">Wordle</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="scoreboard-loading">
          <div className="loading-spinner" />
          <p>Loading scoreboard...</p>
        </div>
      ) : scoreboard.length === 0 ? (
        <div className="scoreboard-empty">
          <p>No scores found for this game type.</p>
          <p className="scoreboard-empty-hint">Play some games to see scores appear here!</p>
        </div>
      ) : (
        <div className="scoreboard-table-container">
          <table className="scoreboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Wins</th>
                <th>Losses</th>
                <th>Ties</th>
                <th>Total Games</th>
                <th>Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {scoreboard.map((entry, index) => (
                <tr key={entry.userId} className={index < 3 ? 'top-three' : ''}>
                  <td className="rank-cell">
                    <span className="rank-emoji">{getRankEmoji(index)}</span>
                  </td>
                  <td className="player-cell">
                    <div className="player-info">
                      {entry.avatar ? (
                        <img src={entry.avatar} alt={entry.username} className="player-avatar" />
                      ) : (
                        <div className="player-avatar-placeholder">
                          {entry.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="player-name">{entry.username}</span>
                    </div>
                  </td>
                  <td className="wins-cell">{entry.wins}</td>
                  <td className="losses-cell">{entry.losses}</td>
                  <td className="ties-cell">{entry.ties}</td>
                  <td className="total-cell">{entry.totalGames}</td>
                  <td className="winrate-cell">
                    <span className={`winrate-badge ${entry.winRate >= 50 ? 'positive' : 'negative'}`}>
                      {entry.winRate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
        </>
      )}
    </div>
  )
}

