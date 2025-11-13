import {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
  CategoryChannel,
  GuildMember,
  Message,
} from 'discord.js'
import { getBotClient } from '../bot/bot.js'
import { ticketRepository } from '../database/ticketRepository.js'
import { ticketConfigRepository } from '../database/ticketConfigRepository.js'
import { auditLogService } from './auditLogService.js'

export const ticketService = {
  async createTicket(userId: string, guildId: string): Promise<string | null> {
    const client = getBotClient()
    if (!client) {
      throw new Error('Bot client not initialized')
    }

    const guild = await client.guilds.fetch(guildId)
    if (!guild) {
      throw new Error('Guild not found')
    }

    const config = await ticketConfigRepository.get(guildId)
    if (!config) {
      throw new Error('Ticket configuration not found for this guild')
    }

    const member = await guild.members.fetch(userId)
    if (!member) {
      throw new Error('Member not found')
    }

    // Check for orphaned tickets (tickets where the channel no longer exists)
    // and clean them up, but allow users to create multiple tickets
    const existingTickets = await ticketRepository.list(guildId)
    const openTickets = existingTickets.filter(
      (t) => t.userId === userId && t.status === 'open'
    )
    
    // Clean up orphaned tickets - close tickets where channel doesn't exist
    for (const ticket of openTickets) {
      try {
        const channel = await guild.channels.fetch(ticket.ticketId).catch(() => null)
        if (!channel) {
          // Channel doesn't exist, mark ticket as closed
          await ticketRepository.close(ticket.ticketId)
          await ticketRepository.delete(ticket.ticketId)
        }
      } catch (error) {
        // If we can't fetch the channel, it probably doesn't exist
        await ticketRepository.close(ticket.ticketId)
        await ticketRepository.delete(ticket.ticketId)
      }
    }

    const category = (await guild.channels.fetch(
      config.ticketCategoryId
    )) as CategoryChannel | null
    if (!category || category.type !== ChannelType.GuildCategory) {
      throw new Error('Ticket category not found')
    }

    // Create private ticket channel
    // Generate unique ticket name with timestamp to allow multiple tickets
    const timestamp = Date.now().toString().slice(-6)
    const ticketChannel = await guild.channels.create({
      name: `ticket-${member.user.username.toLowerCase()}-${timestamp}`,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: userId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
          ],
        },
        {
          id: client.user!.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
          ],
        },
        ...config.mentionRoleIds.map((roleId) => ({
          id: roleId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
          ],
        })),
        ...config.mentionUserIds.map((userId) => ({
          id: userId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
          ],
        })),
      ],
    })

    // Save ticket to database
    await ticketRepository.create({
      ticketId: ticketChannel.id,
      guildId,
      userId,
    })

    // Build mention string
    const mentions: string[] = []
    for (const roleId of config.mentionRoleIds) {
      const role = await guild.roles.fetch(roleId).catch(() => null)
      if (role) {
        mentions.push(role.toString())
      }
    }
    for (const userId of config.mentionUserIds) {
      const user = await guild.members.fetch(userId).catch(() => null)
      if (user) {
        mentions.push(user.toString())
      }
    }

    // Send welcome message with close button
    const embed = new EmbedBuilder()
      .setTitle('Ticket Created')
      .setDescription(
        `Welcome ${member.toString()}! Support staff will be with you shortly.\n\n${mentions.length > 0 ? `**Mentioned:** ${mentions.join(' ')}` : ''}`
      )
      .setColor(0x5865f2)
      .setTimestamp()

    const closeButton = new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Danger)

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(closeButton)

    await ticketChannel.send({
      embeds: [embed],
      components: [row],
    })

    // Log to audit log
    await auditLogService.logTicketCreated(ticketChannel.id, userId, guildId)

    return ticketChannel.id
  },

  async closeTicket(
    ticketId: string,
    closedBy: string
  ): Promise<void> {
    const client = getBotClient()
    if (!client) {
      throw new Error('Bot client not initialized')
    }

    const ticket = await ticketRepository.get(ticketId)
    if (!ticket) {
      throw new Error('Ticket not found')
    }

    if (ticket.status === 'closed') {
      throw new Error('Ticket is already closed')
    }

    const guild = await client.guilds.fetch(ticket.guildId)
    const channel = (await guild.channels.fetch(
      ticketId
    )) as TextChannel | null

    if (!channel) {
      throw new Error('Ticket channel not found')
    }

    // Collect transcript
    const messages: Message[] = []
    let messageCount = 0
    try {
      const fetchedMessages = await channel.messages.fetch({ limit: 100 })
      messages.push(...Array.from(fetchedMessages.values()))
      messageCount = fetchedMessages.size

      // Fetch remaining messages if any
      while (fetchedMessages.size === 100) {
        const lastMessage = messages[messages.length - 1]
        const moreMessages = await channel.messages.fetch({
          limit: 100,
          before: lastMessage.id,
        })
        messages.push(...Array.from(moreMessages.values()))
        messageCount += moreMessages.size
      }
    } catch (error) {
      console.error('Error fetching messages for transcript:', error)
    }

    // Build transcript
    const transcript = messages
      .reverse()
      .map((msg) => {
        const timestamp = msg.createdAt.toISOString()
        const author = msg.author.tag
        const content = msg.content || '[No content]'
        const attachments =
          msg.attachments.size > 0
            ? ` [${msg.attachments.size} attachment(s)]`
            : ''
        return `[${timestamp}] ${author}: ${content}${attachments}`
      })
      .join('\n')

    // Save log
    await ticketRepository.saveLog({
      ticketId: ticket.ticketId,
      guildId: ticket.guildId,
      userId: ticket.userId,
      createdAt: ticket.createdAt,
      closedAt: new Date(),
      closedBy,
      messageCount,
      transcript: transcript || undefined,
    })

    // Update ticket status
    await ticketRepository.close(ticketId)

    // Log to audit log before deleting
    await auditLogService.logTicketClosed(ticketId, closedBy, ticket.guildId)

    // Delete channel
    await channel.delete('Ticket closed')

    // Remove from active tickets
    await ticketRepository.delete(ticketId)
  },

  async createOrUpdateEmbed(guildId: string): Promise<string> {
    const client = getBotClient()
    if (!client) {
      throw new Error('Bot client not initialized')
    }

    const config = await ticketConfigRepository.get(guildId)
    if (!config) {
      throw new Error('Ticket configuration not found')
    }

    const guild = await client.guilds.fetch(guildId)
    const channel = (await guild.channels.fetch(
      config.embedChannelId
    )) as TextChannel | null

    if (!channel) {
      throw new Error('Embed channel not found')
    }

    const button = new ButtonBuilder()
      .setCustomId('create_ticket')
      .setLabel('Create Ticket')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🎫')

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button)

    const messageType = config.messageType || 'embed'
    const messageTitle = config.messageTitle || 'Create a Ticket'
    const messageDescription = config.messageDescription || 'Click the button below to create a support ticket.'
    const messageContent = config.messageContent || ''

    let messageOptions: any = {
      components: [row],
    }

    if (messageType === 'embed') {
      const embed = new EmbedBuilder()
        .setTitle(messageTitle)
        .setDescription(messageDescription)
        .setColor(0x5865f2)
        .setTimestamp()
      messageOptions.embeds = [embed]
    } else {
      // Plain text message
      messageOptions.content = messageContent || messageDescription || 'Click the button below to create a support ticket.'
    }

    // Update existing message or create new one
    if (config.embedMessageId) {
      try {
        const message = await channel.messages.fetch(config.embedMessageId)
        await message.edit(messageOptions)
        return message.id
      } catch (error) {
        // Message not found, create new one
        console.log('Embed message not found, creating new one')
      }
    }

    // Create new message
    const message = await channel.send(messageOptions)

    // Update config with new message ID
    await ticketConfigRepository.set({
      ...config,
      embedMessageId: message.id,
    })

    return message.id
  },
}

