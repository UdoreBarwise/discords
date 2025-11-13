import { reminderRepository, Reminder } from '../database/reminderRepository.js'
import { getBotClient } from '../bot/bot.js'
import { EmbedBuilder } from 'discord.js'

// Check if a reminder should be triggered
function shouldTriggerReminder(reminder: Reminder): boolean {
  if (!reminder.enabled) return false

  const now = new Date()
  const nowUtc = new Date(now.toISOString())
  
  // Parse the UTC time (HH:mm format)
  const [hours, minutes] = reminder.timeUtc.split(':').map(Number)
  const reminderTime = new Date(nowUtc)
  reminderTime.setUTCHours(hours, minutes, 0, 0)

  // Check if we're within 1 minute of the reminder time
  const timeDiff = Math.abs(nowUtc.getTime() - reminderTime.getTime())
  if (timeDiff > 60000) {
    return false // Not within 1 minute
  }

  // Check if this reminder was already triggered today
  if (reminder.lastTriggeredAt) {
    const lastTriggered = new Date(reminder.lastTriggeredAt)
    const today = new Date(nowUtc)
    today.setUTCHours(0, 0, 0, 0)
    lastTriggered.setUTCHours(0, 0, 0, 0)
    
    if (lastTriggered.getTime() === today.getTime()) {
      return false // Already triggered today
    }
  }

  // If days of week are specified, check if today matches
  if (reminder.daysOfWeek && reminder.daysOfWeek.length > 0) {
    const dayOfWeek = nowUtc.getUTCDay() // 0 = Sunday, 1 = Monday, etc.
    if (!reminder.daysOfWeek.includes(dayOfWeek)) {
      return false // Today is not in the specified days
    }
  }

  return true
}

// Send a reminder
async function sendReminder(reminder: Reminder): Promise<void> {
  const client = getBotClient()
  if (!client) {
    console.error('[Reminder] Bot client not available')
    return
  }

  try {
    const embed = new EmbedBuilder()
      .setTitle('⏰ Reminder')
      .setDescription(reminder.message)
      .setColor(0x5865f2)
      .setTimestamp()

    if (reminder.deliveryMethod === 'dm') {
      // Send DM to user
      const user = await client.users.fetch(reminder.userId)
      await user.send({ embeds: [embed] })
      console.log(`[Reminder] Sent DM reminder ${reminder.id} to user ${reminder.userId}`)
    } else {
      // Send to channel
      if (!reminder.channelId) {
        console.error(`[Reminder] Channel ID not set for reminder ${reminder.id}`)
        return
      }

      const channel = await client.channels.fetch(reminder.channelId)
      if (!channel || !channel.isTextBased()) {
        console.error(`[Reminder] Channel ${reminder.channelId} not found or not a text channel`)
        return
      }

      await channel.send({
        content: `<@${reminder.userId}>`,
        embeds: [embed],
      })
      console.log(`[Reminder] Sent channel reminder ${reminder.id} to channel ${reminder.channelId}`)
    }

    // Update last triggered time
    await reminderRepository.updateLastTriggered(reminder.id)
  } catch (error: any) {
    console.error(`[Reminder] Error sending reminder ${reminder.id}:`, error.message)
    
    // If user has DMs disabled or channel is deleted, disable the reminder
    if (error.code === 50007 || error.message.includes('Unknown Channel')) {
      console.log(`[Reminder] Disabling reminder ${reminder.id} due to delivery failure`)
      await reminderRepository.update(reminder.id, { enabled: false })
    }
  }
}

// Check and process reminders
export async function checkReminders(): Promise<void> {
  try {
    const reminders = await reminderRepository.getAllEnabled()
    
    for (const reminder of reminders) {
      if (shouldTriggerReminder(reminder)) {
        await sendReminder(reminder)
      }
    }
  } catch (error) {
    console.error('[Reminder] Error checking reminders:', error)
  }
}

// Start polling service
export const reminderService = {
  startPolling: async (): Promise<void> => {
  const checkInterval = 60000 // Check every minute

  const checkRemindersTask = async () => {
    try {
      await checkReminders()
    } catch (error) {
      console.error('[Reminder] Error in reminder polling:', error)
    }
  }

  // Initial check
  await checkRemindersTask()

    // Set up interval
    setInterval(checkRemindersTask, checkInterval)
    console.log('[Reminder] Reminder polling service started')
  },
}

// Export for backward compatibility
export async function startReminderPolling(): Promise<void> {
  return reminderService.startPolling()
}

