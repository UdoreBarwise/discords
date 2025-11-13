import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { SidebarProvider } from './contexts/SidebarContext'
import { ServerProvider } from './contexts/ServerContext'
import Layout from './components/Layout/Layout'
import NotificationContainer from './components/Notifications/NotificationContainer'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings/Settings'
import General from './pages/General/General'
import Reminders from './pages/Reminders/Reminders'
import Tickets from './pages/Tickets/Tickets'
import EmbedBuilderPage from './pages/EmbedBuilder/EmbedBuilderPage'
import DiceGame from './pages/DiceGame/DiceGame'
import Wordle from './pages/Wordle/Wordle'
import AIConfigPage from './pages/AIConfig/AIConfig'
import Scoreboard from './pages/Scoreboard/Scoreboard'
import Help from './pages/Help/Help'
import AutoRoles from './pages/AutoRoles/AutoRoles'
import AutoModerator from './pages/AutoModerator/AutoModerator'
import Leveling from './pages/Leveling/Leveling'
import ServerSetupPage from './pages/ServerSetup/ServerSetup'
import WelcomeMessage from './pages/WelcomeMessage/WelcomeMessage'
import ExchangeRate from './pages/ExchangeRate/ExchangeRate'
import Steam from './pages/Steam/Steam'
import YouTubeNotifications from './pages/YouTubeNotifications/YouTubeNotifications'
import XNotifications from './pages/XNotifications/XNotifications'
import Voting from './pages/Voting/Voting'
import Meme from './pages/Meme/Meme'
import Events from './pages/Events/Events'
import SportsTracker from './pages/SportsTracker/SportsTracker'

function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <ServerProvider>
          <SidebarProvider>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/general" element={<General />} />
                  <Route path="/general/ai-config" element={<AIConfigPage />} />
                  <Route path="/reminders" element={<Reminders />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/tickets" element={<Tickets />} />
                  <Route path="/embed-builder" element={<EmbedBuilderPage />} />
                  <Route path="/dice-game" element={<DiceGame />} />
                  <Route path="/wordle" element={<Wordle />} />
                  <Route path="/scoreboard" element={<Scoreboard />} />
                  <Route path="/help" element={<Help />} />
                  <Route path="/auto-roles" element={<AutoRoles />} />
                  <Route path="/auto-moderator" element={<AutoModerator />} />
                  <Route path="/leveling" element={<Leveling />} />
                  <Route path="/server-setup" element={<ServerSetupPage />} />
                  <Route path="/welcome-message" element={<WelcomeMessage />} />
                  <Route path="/exchange-rate" element={<ExchangeRate />} />
                  <Route path="/steam" element={<Steam />} />
                  <Route path="/youtube-notifications" element={<YouTubeNotifications />} />
                  <Route path="/x-notifications" element={<XNotifications />} />
                  <Route path="/voting" element={<Voting />} />
                  <Route path="/meme" element={<Meme />} />
                  <Route path="/events" element={<Events />} />
                  <Route path="/sports-tracker" element={<SportsTracker />} />
                </Routes>
              </Layout>
              <NotificationContainer />
            </Router>
          </SidebarProvider>
        </ServerProvider>
      </NotificationProvider>
    </ThemeProvider>
  )
}

export default App

