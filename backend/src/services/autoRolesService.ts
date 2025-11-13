import {
  EmbedBuilder,
  TextChannel,
  ColorResolvable,
  MessageReaction,
  User,
  PartialUser,
} from 'discord.js'
import { getBotClient } from '../bot/bot.js'
import {
  autoRolesRepository,
  AutoRolesConfig,
  ReactionRole,
} from '../database/autoRolesRepository.js'

export const autoRolesService = {
  async sendAutoRolesMessage(config: AutoRolesConfig): Promise<string> {
    const client = getBotClient()
    if (!client) {
      throw new Error('Bot client not initialized')
    }

    const guild = await client.guilds.fetch(config.guildId)
    const channel = (await guild.channels.fetch(
      config.channelId
    )) as TextChannel | null

    if (!channel) {
      throw new Error('Channel not found')
    }

    // Delete old message if it exists
    if (config.messageId) {
      try {
        const oldMessage = await channel.messages.fetch(config.messageId)
        await oldMessage.delete()
      } catch (error) {
        // Message might not exist, ignore error
      }
    }

    // Build embed
    const embed = new EmbedBuilder()

    if (config.embedTitle) {
      embed.setTitle(config.embedTitle)
    } else {
      embed.setTitle('Auto Roles')
    }

    if (config.embedDescription) {
      embed.setDescription(config.embedDescription)
    }

    if (config.embedColor) {
      const colorHex = config.embedColor.replace('#', '')
      const colorNum = parseInt(colorHex, 16)
      embed.setColor(colorNum as ColorResolvable)
    } else {
      embed.setColor(0x5865f2) // Default Discord blue
    }

    // Add reaction roles as fields
    if (config.reactionRoles.length > 0) {
      const roleList = config.reactionRoles
        .map((rr) => `${rr.emoji} - <@&${rr.roleId}>`)
        .join('\n')
      embed.addFields({
        name: 'React to get a role:',
        value: roleList,
      })
    }

    // Send message
    const message = await channel.send({
      embeds: [embed],
    })

    // Add reactions
    for (const reactionRole of config.reactionRoles) {
      try {
        await message.react(reactionRole.emoji)
      } catch (error) {
        console.error(`Failed to add reaction ${reactionRole.emoji}:`, error)
      }
    }

    // Update config with message ID
    config.messageId = message.id
    await autoRolesRepository.saveConfig(config)

    return message.id
  },

  async handleReactionAdd(
    reaction: MessageReaction,
    user: User | PartialUser
  ): Promise<void> {
    // Ignore bot reactions
    if (user.bot) return

    const message = reaction.message
    if (!message.guildId) return

    const config = await autoRolesRepository.getConfig(message.guildId)
    if (!config || config.messageId !== message.id) return

    const emoji = reaction.emoji.toString()
    const reactionRole = config.reactionRoles.find((rr) => rr.emoji === emoji)

    if (!reactionRole) return

    try {
      const guild = message.guild
      if (!guild) return

      const member = await guild.members.fetch(user.id)
      const role = await guild.roles.fetch(reactionRole.roleId)

      if (!role) {
        console.error(`Role ${reactionRole.roleId} not found`)
        return
      }

      if (member.roles.cache.has(role.id)) {
        // User already has the role, do nothing
        return
      }

      await member.roles.add(role)
      console.log(`Added role ${role.name} to user ${user.tag}`)
    } catch (error) {
      console.error('Error adding role:', error)
    }
  },

  async handleReactionRemove(
    reaction: MessageReaction,
    user: User | PartialUser
  ): Promise<void> {
    // Ignore bot reactions
    if (user.bot) return

    const message = reaction.message
    if (!message.guildId) return

    const config = await autoRolesRepository.getConfig(message.guildId)
    if (!config || config.messageId !== message.id) return

    const emoji = reaction.emoji.toString()
    const reactionRole = config.reactionRoles.find((rr) => rr.emoji === emoji)

    if (!reactionRole) return

    try {
      const guild = message.guild
      if (!guild) return

      const member = await guild.members.fetch(user.id)
      const role = await guild.roles.fetch(reactionRole.roleId)

      if (!role) {
        console.error(`Role ${reactionRole.roleId} not found`)
        return
      }

      if (!member.roles.cache.has(role.id)) {
        // User doesn't have the role, do nothing
        return
      }

      await member.roles.remove(role)
      console.log(`Removed role ${role.name} from user ${user.tag}`)
    } catch (error) {
      console.error('Error removing role:', error)
    }
  },
}

