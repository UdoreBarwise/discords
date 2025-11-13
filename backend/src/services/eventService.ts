import {
  EmbedBuilder,
  TextChannel,
} from 'discord.js'
import { getBotClient } from '../bot/bot.js'
import {
  eventRepository,
  EventsConfig,
  Event,
  ActiveEvent,
  EventParticipant,
} from '../database/eventRepository.js'
import { levelingService } from './levelingService.js'
import { votingService } from './votingService.js'
import { memeService } from './memeService.js'
import { getDatabase } from '../database/database.js'

export interface EventReward {
  type: 'xp_multiplier' | 'role' | 'badge' | 'custom'
  value: any
}

export interface ScheduleData {
  time?: string // HH:MM format for daily/specific
  dayOfWeek?: number // 0-6 for weekly (0 = Sunday)
  date?: string // ISO date for specific
}

// Get XP multiplier for active events
export async function getActiveXPMultiplier(guildId: string): Promise<number> {
  const activeEvents = await eventRepository.getActiveEvents(guildId)
  
  for (const activeEvent of activeEvents) {
    const event = await eventRepository.getEvent(activeEvent.eventId)
    if (!event || event.eventType !== 'xp_multiplier') continue

    try {
      const rewardData = event.rewardData ? JSON.parse(event.rewardData) : null
      if (rewardData && rewardData.multiplier) {
        return rewardData.multiplier
      }
    } catch {
      // Invalid JSON, skip
    }
  }

  return 1.0
}

// Check if event should start based on schedule
function shouldStartEvent(event: Event): boolean {
  if (!event.enabled) return false

  const now = new Date()
  let scheduleData: ScheduleData = {}

  try {
    scheduleData = event.scheduleData ? JSON.parse(event.scheduleData) : {}
  } catch {
    return false
  }

  switch (event.scheduleType) {
    case 'daily': {
      if (!scheduleData.time) return false
      const [hours, minutes] = scheduleData.time.split(':').map(Number)
      const scheduledTime = new Date()
      scheduledTime.setHours(hours, minutes, 0, 0)
      
      // Check if current time is within 1 minute of scheduled time
      const diff = Math.abs(now.getTime() - scheduledTime.getTime())
      return diff < 60000
    }

    case 'weekly': {
      if (scheduleData.dayOfWeek === undefined || !scheduleData.time) return false
      if (now.getDay() !== scheduleData.dayOfWeek) return false
      
      const [hours, minutes] = scheduleData.time.split(':').map(Number)
      const scheduledTime = new Date()
      scheduledTime.setHours(hours, minutes, 0, 0)
      
      const diff = Math.abs(now.getTime() - scheduledTime.getTime())
      return diff < 60000
    }

    case 'specific': {
      if (!scheduleData.date || !scheduleData.time) return false
      const scheduledDate = new Date(`${scheduleData.date}T${scheduleData.time}`)
      const diff = Math.abs(now.getTime() - scheduledDate.getTime())
      return diff < 60000
    }

    case 'random': {
      // Random events are handled separately
      return false
    }

    default:
      return false
  }
}

// Announce event in Discord
async function announceEvent(guildId: string, event: Event, activeEvent: ActiveEvent): Promise<void> {
  const botClient = getBotClient()
  if (!botClient) return

  const config = await eventRepository.getConfig(guildId)
  if (!config || !config.enabled) return

  const channelId = config.announcementChannelId
  if (!channelId) return

  try {
    const guild = await botClient.guilds.fetch(guildId)
    const channel = await guild.channels.fetch(channelId)
    
    if (!channel || !channel.isTextBased()) return

    const embed = new EmbedBuilder()
      .setTitle(`🎉 ${event.name}`)
      .setDescription(event.description || 'A special event has started!')
      .setColor(0xffd700)
      .addFields(
        { name: 'Duration', value: `${event.durationMinutes} minutes`, inline: true },
        { name: 'Type', value: event.eventType.replace('_', ' ').toUpperCase(), inline: true }
      )
      .setTimestamp(activeEvent.startedAt)
      .setFooter({ text: 'Event ends' })

    // Add event-specific information
    if (event.eventType === 'xp_multiplier') {
      try {
        const rewardData = event.rewardData ? JSON.parse(event.rewardData) : null
        if (rewardData && rewardData.multiplier) {
          embed.addFields({ name: 'XP Multiplier', value: `${rewardData.multiplier}x`, inline: true })
        }
      } catch {}
    }

    await (channel as TextChannel).send({ embeds: [embed] })
  } catch (error) {
    console.error('Error announcing event:', error)
  }
}

// End event and announce results
async function endEvent(activeEvent: ActiveEvent): Promise<void> {
  const event = await eventRepository.getEvent(activeEvent.eventId)
  if (!event) return

  const botClient = getBotClient()
  if (!botClient) return

  const config = await eventRepository.getConfig(activeEvent.guildId)
  if (!config || !config.enabled) return

  const participants = await eventRepository.getEventParticipants(activeEvent.id)
  const topParticipants = participants.sort((a, b) => b.points - a.points).slice(0, 10)

  // Save to history
  await eventRepository.addHistoryEntry({
    guildId: activeEvent.guildId,
    eventId: activeEvent.eventId,
    eventName: event.name,
    eventType: event.eventType,
    startedAt: activeEvent.startedAt,
    endedAt: new Date(),
    totalParticipants: participants.length,
    eventData: activeEvent.eventData,
  })

  // Announce end
  const channelId = config.announcementChannelId
  if (channelId) {
    try {
      const guild = await botClient.guilds.fetch(activeEvent.guildId)
      const channel = await guild.channels.fetch(channelId)
      
      if (channel && channel.isTextBased()) {
        const embed = new EmbedBuilder()
          .setTitle(`🏁 ${event.name} - Event Ended`)
          .setDescription('The event has concluded!')
          .setColor(0x808080)
          .setTimestamp()

        if (topParticipants.length > 0) {
          const leaderboard = topParticipants
            .slice(0, 5)
            .map((p, i) => `${i + 1}. <@${p.userId}> - ${p.points} points`)
            .join('\n')
          
          embed.addFields({ name: 'Top Participants', value: leaderboard || 'No participants', inline: false })
        }

        await (channel as TextChannel).send({ embeds: [embed] })
      }
    } catch (error) {
      console.error('Error announcing event end:', error)
    }
  }

  // Delete active event
  await eventRepository.deleteActiveEvent(activeEvent.id)
}

// Start an event
async function startEvent(guildId: string, event: Event): Promise<void> {
  // Check if event is already active
  const activeEvents = await eventRepository.getActiveEvents(guildId)
  const isAlreadyActive = activeEvents.some(ae => ae.eventId === event.id)
  
  if (isAlreadyActive) return

  const now = new Date()
  const endsAt = new Date(now.getTime() + event.durationMinutes * 60 * 1000)

  const activeEvent = await eventRepository.createActiveEvent({
    guildId,
    eventId: event.id,
    startedAt: now,
    endsAt,
    eventData: event.eventData,
  })

  await announceEvent(guildId, event, activeEvent)

  // Handle event-specific startup logic
  if (event.eventType === 'voting') {
    try {
      const eventData = event.eventData ? JSON.parse(event.eventData) : {}
      if (eventData.pollTitle && eventData.pollOptions) {
        const config = await eventRepository.getConfig(guildId)
        if (config && config.announcementChannelId) {
          await votingService.createPoll({
            guildId,
            channelId: config.announcementChannelId,
            title: eventData.pollTitle,
            description: eventData.pollDescription,
            options: eventData.pollOptions,
            createdBy: botClient?.user?.id || '0',
            expiresAt: endsAt,
          })
        }
      }
    } catch (error) {
      console.error('Error creating voting event poll:', error)
    }
  }
}

// Check and process scheduled events
export async function checkScheduledEvents(): Promise<void> {
  const events = await eventRepository.getScheduledEvents()

  for (const event of events) {
    const config = await eventRepository.getConfig(event.guildId)
    if (!config || !config.enabled) continue

    if (shouldStartEvent(event)) {
      await startEvent(event.guildId, event)
    }
  }
}

// Check and end expired events
export async function checkExpiredEvents(): Promise<void> {
  const activeEvents = await eventRepository.getActiveEvents()

  for (const activeEvent of activeEvents) {
    if (new Date() >= activeEvent.endsAt) {
      await endEvent(activeEvent)
    }
  }
}

// Check for random events
export async function checkRandomEvents(): Promise<void> {
  // Get all guilds with events enabled
  const pool = getDatabase()
  const result = await pool.query(
    'SELECT guild_id, random_event_chance FROM events_config WHERE enabled = true'
  )

  for (const row of result.rows) {
    const guildId = row.guild_id
    const chance = parseFloat(row.random_event_chance || '5.0')

    // Random chance check (chance is percentage)
    if (Math.random() * 100 < chance) {
      // Get random events for this guild
      const events = await eventRepository.getEvents(guildId)
      const randomEvents = events.filter(e => e.enabled && e.scheduleType === 'random')

      if (randomEvents.length > 0) {
        const randomEvent = randomEvents[Math.floor(Math.random() * randomEvents.length)]
        const activeEvents = await eventRepository.getActiveEvents(guildId)
        
        // Don't start if same event type is already active
        const isActive = activeEvents.some(ae => {
          const aeEvent = events.find(e => e.id === ae.eventId)
          return aeEvent && aeEvent.eventType === randomEvent.eventType
        })

        if (!isActive) {
          await startEvent(guildId, randomEvent)
        }
      }
    }
  }
}

// Start polling service
export async function startEventPolling(): Promise<void> {
  const checkInterval = 60000 // Check every minute

  const checkEvents = async () => {
    try {
      await checkExpiredEvents()
      await checkScheduledEvents()
      await checkRandomEvents()
    } catch (error) {
      console.error('Error in event polling:', error)
    }
  }

  // Initial check
  await checkEvents()

  // Set up interval
  setInterval(checkEvents, checkInterval)
}

// Track participation in events
export async function trackEventParticipation(
  guildId: string,
  userId: string,
  eventType: string,
  points: number = 1
): Promise<void> {
  const activeEvents = await eventRepository.getActiveEvents(guildId)
  
  for (const activeEvent of activeEvents) {
    const event = await eventRepository.getEvent(activeEvent.eventId)
    if (!event || event.eventType !== eventType) continue

    await eventRepository.addEventParticipant(activeEvent.id, userId, points)
  }
}

export const eventService = {
  getConfig: async (guildId: string) => eventRepository.getConfig(guildId),
  saveConfig: async (config: EventsConfig) => eventRepository.saveConfig(config),
  getEvents: async (guildId: string) => eventRepository.getEvents(guildId),
  getEvent: async (id: number) => eventRepository.getEvent(id),
  createEvent: async (event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => eventRepository.createEvent(event),
  updateEvent: async (id: number, event: Partial<Omit<Event, 'id' | 'guildId' | 'createdAt' | 'updatedAt'>>) => eventRepository.updateEvent(id, event),
  deleteEvent: async (id: number) => eventRepository.deleteEvent(id),
  getActiveEvents: async (guildId: string) => eventRepository.getActiveEvents(guildId),
  getEventHistory: async (guildId: string, limit?: number) => eventRepository.getEventHistory(guildId, limit),
  getActiveXPMultiplier,
  trackEventParticipation,
  startEvent,
  endEvent,
  startEventPolling,
}

