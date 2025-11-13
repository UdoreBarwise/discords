import {
  EmbedBuilder,
  TextChannel,
  DMChannel,
  ColorResolvable,
  GuildMember,
} from 'discord.js'
import { getBotClient } from '../bot/bot.js'
import {
  welcomeMessageRepository,
  WelcomeMessageConfig,
} from '../database/welcomeMessageRepository.js'

function replaceVariables(text: string, member: GuildMember): string {
  if (!text) return text

  return text
    .replace(/{user}/g, member.toString())
    .replace(/{username}/g, member.user.username)
    .replace(/{displayName}/g, member.displayName)
    .replace(/{tag}/g, member.user.tag)
    .replace(/{server}/g, member.guild.name)
    .replace(/{memberCount}/g, member.guild.memberCount.toString())
    .replace(/{mention}/g, member.toString())
}

export const welcomeMessageService = {
  async sendWelcomeMessage(member: GuildMember): Promise<void> {
    const config = await welcomeMessageRepository.getConfig(member.guild.id)
    
    if (!config || !config.enabled) {
      return
    }

    try {
      if (config.sendAsDM) {
        // Send as DM
        const dmChannel = await member.user.createDM()
        await this.sendMessage(member, dmChannel, config)
      } else if (config.channelId) {
        // Send to channel
        const channel = await member.guild.channels.fetch(config.channelId)
        if (channel && channel.isTextBased()) {
          await this.sendMessage(member, channel as TextChannel, config)
        }
      }
    } catch (error) {
      console.error('Error sending welcome message:', error)
    }
  },

  async sendMessage(
    member: GuildMember,
    channel: TextChannel | DMChannel,
    config: WelcomeMessageConfig
  ): Promise<void> {
    if (config.messageType === 'embed') {
      const embed = new EmbedBuilder()

      if (config.embedTitle) {
        embed.setTitle(replaceVariables(config.embedTitle, member))
      }

      if (config.embedDescription) {
        embed.setDescription(replaceVariables(config.embedDescription, member))
      }

      if (config.embedColor) {
        const colorHex = config.embedColor.replace('#', '')
        const colorNum = parseInt(colorHex, 16)
        embed.setColor(colorNum as ColorResolvable)
      } else {
        embed.setColor(0x5865f2) // Default Discord blue
      }

      if (config.embedThumbnail) {
        embed.setThumbnail(replaceVariables(config.embedThumbnail, member))
      }

      if (config.embedImage) {
        embed.setImage(replaceVariables(config.embedImage, member))
      }

      if (config.embedFooter) {
        embed.setFooter({ text: replaceVariables(config.embedFooter, member) })
      }

      embed.setTimestamp()

      await channel.send({ embeds: [embed] })
    } else {
      // Text message
      const content = config.messageContent
        ? replaceVariables(config.messageContent, member)
        : `Welcome to ${member.guild.name}, ${member.toString()}!`

      await channel.send(content)
    }
  },
}

