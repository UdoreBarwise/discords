import TicketConfig from '../../components/Tickets/TicketConfig'
import './Tickets.css'

export default function Tickets() {
  return (
    <div className="tickets-page">
      <div className="tickets-header">
        <h1>Ticket System</h1>
        <p className="tickets-subtitle">
          Configure your Discord ticket system settings
        </p>
      </div>

      <div className="tickets-content">
        <TicketConfig />
      </div>
    </div>
  )
}

