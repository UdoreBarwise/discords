import {
  EmbedBuilder,
  TextChannel,
  Guild,
  User,
  GuildMember,
} from 'discord.js'
import { getBotClient } from '../bot/bot.js'
import { botConfigRepository } from '../database/botConfigRepository.js'

export interface AuditLogEntry {
  action: string
  target?: {
    type: 'user' | 'channel' | 'role' | 'message' | 'ticket'
    id: string
    name?: string
  }
  executor?: {
    id: string
    name?: string
  }
  reason?: string
  details?: Record<string, any>
}

export const auditLogService = {
  async log(entry: AuditLogEntry, guildId: string): Promise<void> {
    try {
      const client = getBotClient()
      if (!client) {
        console.error('[Audit Log] Bot client not initialized')
        return
      }

      const guild = await client.guilds.fetch(guildId).catch(() => null)
      if (!guild) {
        console.error('[Audit Log] Guild not found:', guildId)
        return
      }

      // Get audit log channel ID from config
      const auditLogChannelId = await botConfigRepository.get(`audit_log_channel_${guildId}`)
      if (!auditLogChannelId) {
        // Try to find audit log channel by name
        const channels = await guild.channels.fetch()
        const auditChannel = channels.find(
          (c) => c?.type === 0 && c.name === 'audit-log'
        ) as TextChannel | undefined
        
        if (!auditChannel) {
          console.log('[Audit Log] No audit log channel configured for guild:', guildId)
          return
        }
        
        // Cache the channel ID
        await botConfigRepository.set(`audit_log_channel_${guildId}`, auditChannel.id)
      }

      const channelId = auditLogChannelId || (await guild.channels.fetch()).find(
        (c) => c?.type === 0 && c.name === 'audit-log'
      )?.id

      if (!channelId) {
        return
      }

      const channel = (await guild.channels.fetch(channelId)) as TextChannel | null
      if (!channel || !channel.isTextBased()) {
        return
      }

      // Build embed
      const embed = new EmbedBuilder()
        .setTitle(`🔍 ${entry.action}`)
        .setColor(this.getColorForAction(entry.action))
        .setTimestamp(new Date())

      // Add target information
      if (entry.target) {
        let targetValue = `**Type:** ${entry.target.type}\n**ID:** ${entry.target.id}`
        if (entry.target.name) {
          targetValue += `\n**Name:** ${entry.target.name}`
        }
        embed.addFields({ name: 'Target', value: targetValue, inline: false })
      }

      // Add executor information
      if (entry.executor) {
        let executorValue = `<@${entry.executor.id}>`
        if (entry.executor.name) {
          executorValue += ` (${entry.executor.name})`
        }
        embed.addFields({ name: 'Executor', value: executorValue, inline: true })
      }

      // Add reason
      if (entry.reason) {
        embed.addFields({ name: 'Reason', value: entry.reason, inline: false })
      }

      // Add additional details
      if (entry.details) {
        const detailsText = Object.entries(entry.details)
          .map(([key, value]) => `**${key}:** ${value}`)
          .join('\n')
        if (detailsText) {
          embed.addFields({ name: 'Details', value: detailsText, inline: false })
        }
      }

      await channel.send({ embeds: [embed] })
    } catch (error) {
      console.error('[Audit Log] Error logging entry:', error)
    }
  },

  getColorForAction(action: string): number {
    const lowerAction = action.toLowerCase()
    if (lowerAction.includes('create') || lowerAction.includes('created')) {
      return 0x00ff00 // Green
    } else if (lowerAction.includes('close') || lowerAction.includes('closed') || lowerAction.includes('delete')) {
      return 0xff0000 // Red
    } else if (lowerAction.includes('update') || lowerAction.includes('modified')) {
      return 0xffa500 // Orange
    } else if (lowerAction.includes('kick') || lowerAction.includes('ban') || lowerAction.includes('timeout')) {
      return 0x8b0000 // Dark red
    }
    return 0x5865f2 // Default blue
  },

  async logTicketCreated(ticketId: string, userId: string, guildId: string): Promise<void> {
    const client = getBotClient()
    if (!client) return

    try {
      const guild = await client.guilds.fetch(guildId)
      const user = await guild.members.fetch(userId).catch(() => null)
      const channel = await guild.channels.fetch(ticketId).catch(() => null)

      await this.log(
        {
          action: 'Ticket Created',
          target: {
            type: 'ticket',
            id: ticketId,
            name: channel && 'name' in channel ? channel.name : undefined,
          },
          executor: {
            id: userId,
            name: user?.user.tag,
          },
          details: {
            'Channel': `<#${ticketId}>`,
            'User': `<@${userId}>`,
          },
        },
        guildId
      )
    } catch (error) {
      console.error('[Audit Log] Error logging ticket creation:', error)
    }
  },

  async logTicketClosed(ticketId: string, closedBy: string, guildId: string): Promise<void> {
    const client = getBotClient()
    if (!client) return

    try {
      const guild = await client.guilds.fetch(guildId)
      const user = await guild.members.fetch(closedBy).catch(() => null)

      await this.log(
        {
          action: 'Ticket Closed',
          target: {
            type: 'ticket',
            id: ticketId,
          },
          executor: {
            id: closedBy,
            name: user?.user.tag,
          },
          details: {
            'Ticket ID': ticketId,
          },
        },
        guildId
      )
    } catch (error) {
      console.error('[Audit Log] Error logging ticket closure:', error)
    }
  },

  async logChannelCreated(channelId: string, channelName: string, guildId: string, createdBy?: string): Promise<void> {
    const client = getBotClient()
    if (!client) return

    try {
      const guild = await client.guilds.fetch(guildId)
      const executor = createdBy ? await guild.members.fetch(createdBy).catch(() => null) : null

      await this.log(
        {
          action: 'Channel Created',
          target: {
            type: 'channel',
            id: channelId,
            name: channelName,
          },
          executor: createdBy
            ? {
                id: createdBy,
                name: executor?.user.tag,
              }
            : undefined,
          details: {
            'Channel': `<#${channelId}>`,
          },
        },
        guildId
      )
    } catch (error) {
      console.error('[Audit Log] Error logging channel creation:', error)
    }
  },

  async logUserAction(action: string, targetUserId: string, executorId: string, guildId: string, reason?: string): Promise<void> {
    const client = getBotClient()
    if (!client) return

    try {
      const guild = await client.guilds.fetch(guildId)
      const targetUser = await guild.members.fetch(targetUserId).catch(() => null)
      const executor = await guild.members.fetch(executorId).catch(() => null)

      await this.log(
        {
          action,
          target: {
            type: 'user',
            id: targetUserId,
            name: targetUser?.user.tag,
          },
          executor: {
            id: executorId,
            name: executor?.user.tag,
          },
          reason,
          details: {
            'Target User': `<@${targetUserId}>`,
            'Executor': `<@${executorId}>`,
          },
        },
        guildId
      )
    } catch (error) {
      console.error('[Audit Log] Error logging user action:', error)
    }
  },
}

