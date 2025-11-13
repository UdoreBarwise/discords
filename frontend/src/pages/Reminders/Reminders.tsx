import RemindersConfig from '../../components/Reminders/RemindersConfig'
import './Reminders.css'

export default function Reminders() {
  return (
    <div className="reminders-page">
      <h1>Reminders</h1>
      <p className="page-description">
        Set up reminders that will notify you at specific times. All times are in UTC.
        You can set reminders to repeat on specific days of the week and choose to receive them via DM or in a channel.
      </p>
      <RemindersConfig />
    </div>
  )
}


