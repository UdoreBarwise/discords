import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
} from 'discord.js'
import { getBotClient } from '../bot/bot.js'
import { votingRepository } from '../database/votingRepository.js'
import { randomUUID } from 'crypto'

export interface CreatePollOptions {
  guildId: string
  channelId: string
  title: string
  description?: string
  options: string[]
  createdBy: string
  expiresAt?: Date
}

export const votingService = {
  async createPoll(options: CreatePollOptions): Promise<{ pollId: string; messageId: string }> {
    const client = getBotClient()
    if (!client) {
      throw new Error('Bot client not initialized')
    }

    if (options.options.length < 2) {
      throw new Error('A poll must have at least 2 options')
    }

    if (options.options.length > 10) {
      throw new Error('A poll can have at most 10 options')
    }

    const channel = (await client.channels.fetch(options.channelId)) as TextChannel | null
    if (!channel) {
      throw new Error('Channel not found')
    }

    const pollId = randomUUID()
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']

    const embed = new EmbedBuilder()
      .setTitle(`📊 ${options.title}`)
      .setColor(0x5865f2)
      .setDescription(options.description || '')
      .addFields(
        options.options.map((option, index) => ({
          name: `${emojis[index]} ${option}`,
          value: '0 votes',
          inline: false,
        }))
      )
      .setFooter({ text: 'Click the buttons below to vote (anonymous)' })
      .setTimestamp()

    if (options.expiresAt) {
      embed.addFields({
        name: '⏰ Expires',
        value: `<t:${Math.floor(options.expiresAt.getTime() / 1000)}:R>`,
        inline: false,
      })
    }

    const buttons: ButtonBuilder[] = options.options.map((_, index) =>
      new ButtonBuilder()
        .setCustomId(`vote_${pollId}_${index}`)
        .setLabel(`Option ${index + 1}`)
        .setStyle(ButtonStyle.Primary)
        .setEmoji(emojis[index])
    )

    // Discord allows max 5 buttons per row, so we need to split into multiple rows
    const rows: ActionRowBuilder<ButtonBuilder>[] = []
    for (let i = 0; i < buttons.length; i += 5) {
      const row = new ActionRowBuilder<ButtonBuilder>()
      row.addComponents(buttons.slice(i, i + 5))
      rows.push(row)
    }

    const message = await channel.send({
      embeds: [embed],
      components: rows,
    })

    await votingRepository.createPoll({
      pollId,
      guildId: options.guildId,
      channelId: options.channelId,
      messageId: message.id,
      title: options.title,
      description: options.description,
      options: options.options,
      createdBy: options.createdBy,
      expiresAt: options.expiresAt,
      closed: false,
    })

    return { pollId, messageId: message.id }
  },

  async handleVote(pollId: string, userId: string, optionIndex: number): Promise<void> {
    const poll = await votingRepository.getPoll(pollId)
    if (!poll) {
      throw new Error('Poll not found')
    }

    if (poll.closed) {
      throw new Error('This poll is closed')
    }

    if (poll.expiresAt && new Date() > poll.expiresAt) {
      await votingRepository.closePoll(pollId)
      throw new Error('This poll has expired')
    }

    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      throw new Error('Invalid option index')
    }

    await votingRepository.addVote(pollId, userId, optionIndex)
    await this.updatePollMessage(pollId)
  },

  async updatePollMessage(pollId: string): Promise<void> {
    const poll = await votingRepository.getPoll(pollId)
    if (!poll) {
      return
    }

    const client = getBotClient()
    if (!client) {
      return
    }

    const channel = (await client.channels.fetch(poll.channelId)) as TextChannel | null
    if (!channel) {
      return
    }

    try {
      const message = await channel.messages.fetch(poll.messageId)
      const voteCounts = await votingRepository.getVoteCounts(pollId)
      const totalVotes = await votingRepository.getTotalVotes(pollId)

      const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']

      const embed = new EmbedBuilder()
        .setTitle(`📊 ${poll.title}`)
        .setColor(poll.closed ? 0x808080 : 0x5865f2)
        .setDescription(poll.description || '')
        .addFields(
          poll.options.map((option, index) => {
            const count = voteCounts[index] || 0
            const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
            const bar = '█'.repeat(Math.floor(percentage / 10)) + '░'.repeat(10 - Math.floor(percentage / 10))
            return {
              name: `${emojis[index]} ${option}`,
              value: `${count} vote${count !== 1 ? 's' : ''} (${percentage}%)\n\`${bar}\``,
              inline: false,
            }
          })
        )
        .setFooter({ text: poll.closed ? 'Poll closed' : `Total votes: ${totalVotes} (anonymous)` })
        .setTimestamp(poll.createdAt)

      if (poll.expiresAt && !poll.closed) {
        embed.addFields({
          name: '⏰ Expires',
          value: `<t:${Math.floor(poll.expiresAt.getTime() / 1000)}:R>`,
          inline: false,
        })
      }

      if (poll.closed) {
        embed.addFields({
          name: '✅ Status',
          value: 'This poll is closed',
          inline: false,
        })
      }

      const buttons: ButtonBuilder[] = poll.options.map((_, index) =>
        new ButtonBuilder()
          .setCustomId(`vote_${pollId}_${index}`)
          .setLabel(`Option ${index + 1}`)
          .setStyle(poll.closed ? ButtonStyle.Secondary : ButtonStyle.Primary)
          .setEmoji(emojis[index])
          .setDisabled(poll.closed)
      )

      const rows: ActionRowBuilder<ButtonBuilder>[] = []
      for (let i = 0; i < buttons.length; i += 5) {
        const row = new ActionRowBuilder<ButtonBuilder>()
        row.addComponents(buttons.slice(i, i + 5))
        rows.push(row)
      }

      await message.edit({
        embeds: [embed],
        components: rows,
      })
    } catch (error) {
      console.error('Error updating poll message:', error)
    }
  },

  async closePoll(pollId: string): Promise<void> {
    const poll = await votingRepository.getPoll(pollId)
    if (!poll) {
      throw new Error('Poll not found')
    }

    await votingRepository.closePoll(pollId)
    await this.updatePollMessage(pollId)
  },

  async getPollResults(pollId: string) {
    const poll = await votingRepository.getPoll(pollId)
    if (!poll) {
      throw new Error('Poll not found')
    }

    const voteCounts = await votingRepository.getVoteCounts(pollId)
    const totalVotes = await votingRepository.getTotalVotes(pollId)

    return {
      poll,
      voteCounts,
      totalVotes,
    }
  },

  async getPollsByGuild(guildId: string, includeClosed: boolean = false) {
    return await votingRepository.getPollsByGuild(guildId, includeClosed)
  },
}

