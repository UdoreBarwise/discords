import { EmbedBuilder, TextChannel } from 'discord.js'
import { getBotClient } from '../bot/bot.js'
import { scoreboardRepository } from '../database/scoreboardRepository.js'
import { scoreboardConfigRepository, ScoreboardConfig } from '../database/scoreboardConfigRepository.js'

export const scoreboardService = {
  async updateLeaderboardMessage(guildId: string): Promise<void> {
    const config = await scoreboardConfigRepository.get(guildId)
    if (!config || !config.enabled || !config.channelId) {
      return
    }

    const client = getBotClient()
    if (!client) {
      return
    }

    try {
      const guild = await client.guilds.fetch(guildId)
      const channel = (await guild.channels.fetch(config.channelId)) as TextChannel | null
      if (!channel || !channel.isTextBased()) {
        return
      }

      const gameTypeFilter = config.gameType === 'all' ? undefined : config.gameType
      const scoreboard = await scoreboardRepository.getScoreboard(guildId, gameTypeFilter, config.limitPlayers)

      if (scoreboard.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('🏆 Leaderboard')
          .setDescription('No scores yet! Play some games to see the leaderboard.')
          .setColor(0x5865f2)
          .setTimestamp()

        if (config.messageId) {
          try {
            const message = await channel.messages.fetch(config.messageId)
            await message.edit({ embeds: [embed] })
          } catch (error) {
            // Message might not exist, create new one
            const newMessage = await channel.send({ embeds: [embed] })
            await scoreboardConfigRepository.set({ ...config, messageId: newMessage.id })
          }
        } else {
          const message = await channel.send({ embeds: [embed] })
          await scoreboardConfigRepository.set({ ...config, messageId: message.id })
        }
        return
      }

      // Fetch user information
      const entriesWithUsers = await Promise.all(
        scoreboard.map(async (entry, index) => {
          let username = entry.userId
          let avatar: string | null = null

          try {
            const member = await guild.members.fetch(entry.userId).catch(() => null)
            if (member) {
              username = member.displayName || member.user.username
              avatar = member.user.displayAvatarURL({ size: 32 })
            }
          } catch (error) {
            // If we can't fetch user info, just use the user ID
          }

          const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`
          return {
            ...entry,
            username,
            avatar,
            rankEmoji,
          }
        })
      )

      const gameTypeText = config.gameType === 'all' ? 'All Games' : config.gameType === 'dice' ? 'Dice Game' : 'Wordle'
      const leaderboardText = entriesWithUsers
        .map((entry) => {
          return `${entry.rankEmoji} **${entry.username}** - ${entry.wins}W/${entry.losses}L/${entry.ties}T (${entry.winRate.toFixed(1)}% WR)`
        })
        .join('\n')

      const embed = new EmbedBuilder()
        .setTitle(`🏆 Leaderboard - ${gameTypeText}`)
        .setDescription(leaderboardText || 'No scores yet!')
        .setColor(0x5865f2)
        .setFooter({ text: `Updated every ${config.updateIntervalMinutes} minutes` })
        .setTimestamp()

      if (config.messageId) {
        try {
          const message = await channel.messages.fetch(config.messageId)
          await message.edit({ embeds: [embed] })
        } catch (error) {
          // Message might not exist, create new one
          const newMessage = await channel.send({ embeds: [embed] })
          await scoreboardConfigRepository.set({ ...config, messageId: newMessage.id })
        }
      } else {
        const message = await channel.send({ embeds: [embed] })
        await scoreboardConfigRepository.set({ ...config, messageId: message.id })
      }
    } catch (error) {
      console.error(`Error updating leaderboard for guild ${guildId}:`, error)
    }
  },

  async startPolling(): Promise<void> {
    const pollIntervals = new Map<string, NodeJS.Timeout>()

    const checkGuild = async (guildId: string) => {
      try {
        const config = await scoreboardConfigRepository.get(guildId)
        if (!config || !config.enabled) {
          // Clear interval if disabled
          const existingInterval = pollIntervals.get(guildId)
          if (existingInterval) {
            clearInterval(existingInterval)
            pollIntervals.delete(guildId)
          }
          return
        }

        await this.updateLeaderboardMessage(guildId)
      } catch (error) {
        console.error(`Error checking scoreboard for guild ${guildId}:`, error)
      }
    }

    // Poll all guilds every minute
    setInterval(async () => {
      const client = getBotClient()
      if (!client) return

      const guilds = client.guilds.cache
      for (const guild of guilds.values()) {
        const config = await scoreboardConfigRepository.get(guild.id)
        if (config && config.enabled) {
          // Check if we need to update based on interval
          const lastUpdate = config.updateIntervalMinutes || 5
          const intervalKey = `${guild.id}-${lastUpdate}`
          
          if (!pollIntervals.has(intervalKey)) {
            // Set up interval for this guild
            const interval = setInterval(() => {
              this.updateLeaderboardMessage(guild.id)
            }, (lastUpdate * 60 * 1000))
            
            pollIntervals.set(intervalKey, interval)
            // Do initial update
            await this.updateLeaderboardMessage(guild.id)
          }
        }
      }
    }, 60000) // Check every minute
  },
}

