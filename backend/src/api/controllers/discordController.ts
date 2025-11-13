import { Request, Response } from 'express'
import { getBotClient } from '../../bot/bot.js'
import { ChannelType, PermissionFlagsBits } from 'discord.js'

export const discordController = {
  async getGuilds(req: Request, res: Response) {
    try {
      const client = getBotClient()
      if (!client) {
        console.log('getGuilds: Bot client not initialized - token may not be set')
        return res.status(503).json({ error: 'Bot client not initialized' })
      }

      const guilds = await Promise.all(
        Array.from(client.guilds.cache.values()).map(async (guild) => {
          const member = await guild.members.fetch(client.user!.id)
          return {
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL(),
            memberCount: guild.memberCount,
            hasManageChannels: member.permissions.has('ManageChannels'),
          }
        })
      )

      res.json(guilds)
    } catch (error) {
      console.error('Error fetching guilds:', error)
      res.status(500).json({ error: 'Failed to fetch guilds' })
    }
  },

  async getChannels(req: Request, res: Response) {
    try {
      const { guildId } = req.params
      const client = getBotClient()
      if (!client) {
        return res.status(503).json({ error: 'Bot client not initialized' })
      }

      const guild = await client.guilds.fetch(guildId)
      const channels = await guild.channels.fetch()

      const allChannels = Array.from(channels.values())
        .filter(
          (channel) =>
            channel &&
            (channel.type === ChannelType.GuildText ||
              channel.type === ChannelType.GuildAnnouncement ||
              channel.type === ChannelType.GuildVoice ||
              channel.type === ChannelType.GuildStageVoice)
        )
        .map((channel) => ({
          id: channel!.id,
          name: channel!.name,
          type: channel!.type,
        }))

      res.json(allChannels)
    } catch (error) {
      console.error('Error fetching channels:', error)
      res.status(500).json({ error: 'Failed to fetch channels' })
    }
  },

  async getCategories(req: Request, res: Response) {
    try {
      const { guildId } = req.params
      const client = getBotClient()
      if (!client) {
        return res.status(503).json({ error: 'Bot client not initialized' })
      }

      const guild = await client.guilds.fetch(guildId)
      const channels = await guild.channels.fetch()

      const categories = Array.from(channels.values())
        .filter((channel) => channel && channel.type === ChannelType.GuildCategory)
        .map((channel) => ({
          id: channel!.id,
          name: channel!.name,
        }))

      res.json(categories)
    } catch (error) {
      console.error('Error fetching categories:', error)
      res.status(500).json({ error: 'Failed to fetch categories' })
    }
  },

  async getRoles(req: Request, res: Response) {
    try {
      const { guildId } = req.params
      const client = getBotClient()
      if (!client) {
        return res.status(503).json({ error: 'Bot client not initialized' })
      }

      const guild = await client.guilds.fetch(guildId)
      const roles = Array.from(guild.roles.cache.values())
        .filter((role) => !role.managed && role.id !== guild.id)
        .map((role) => ({
          id: role.id,
          name: role.name,
          color: role.color,
          memberCount: role.members.size,
        }))
        .sort((a, b) => b.memberCount - a.memberCount)

      res.json(roles)
    } catch (error) {
      console.error('Error fetching roles:', error)
      res.status(500).json({ error: 'Failed to fetch roles' })
    }
  },

  async getMembers(req: Request, res: Response) {
    try {
      const { guildId } = req.params
      const query = (req.query.q as string) || ''
      const client = getBotClient()
      if (!client) {
        return res.status(503).json({ error: 'Bot client not initialized' })
      }

      const guild = await client.guilds.fetch(guildId)
      await guild.members.fetch()

      let members = Array.from(guild.members.cache.values())
        .filter((member) => !member.user.bot)
        .map((member) => ({
          id: member.id,
          username: member.user.username,
          discriminator: member.user.discriminator,
          displayName: member.displayName,
          avatar: member.user.displayAvatarURL(),
        }))

      if (query) {
        const lowerQuery = query.toLowerCase()
        members = members.filter(
          (member) =>
            member.username.toLowerCase().includes(lowerQuery) ||
            member.displayName.toLowerCase().includes(lowerQuery)
        )
      }

      res.json(members.slice(0, 50))
    } catch (error) {
      console.error('Error fetching members:', error)
      res.status(500).json({ error: 'Failed to fetch members' })
    }
  },

  async createChannel(req: Request, res: Response) {
    try {
      const { guildId } = req.params
      const { name, categoryId } = req.body

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Channel name is required' })
      }

      const client = getBotClient()
      if (!client) {
        return res.status(503).json({ error: 'Bot client not initialized' })
      }

      const guild = await client.guilds.fetch(guildId)
      const botMember = await guild.members.fetch(client.user!.id)

      // Check bot permissions
      if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return res.status(403).json({ error: 'Bot does not have ManageChannels permission' })
      }

      // Get admin roles (roles with Administrator permission or ManageGuild permission)
      const adminRoles = guild.roles.cache.filter(
        (role) =>
          role.permissions.has(PermissionFlagsBits.Administrator) ||
          role.permissions.has(PermissionFlagsBits.ManageGuild)
      )

      // Build permission overwrites
      const permissionOverwrites = [
        // Everyone can view but not send messages
        {
          id: guild.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
          deny: [PermissionFlagsBits.SendMessages],
        },
        // Bot can view and send messages
        {
          id: client.user!.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
      ]

      // Add admin roles - they can view and send messages
      for (const role of adminRoles.values()) {
        permissionOverwrites.push({
          id: role.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        })
      }

      // Create the channel
      const channel = await guild.channels.create({
        name: name.trim(),
        type: ChannelType.GuildText,
        parent: categoryId || undefined,
        permissionOverwrites,
      })

      res.json({
        id: channel.id,
        name: channel.name,
        type: channel.type,
      })
    } catch (error: any) {
      console.error('Error creating channel:', error)
      res.status(500).json({ error: error.message || 'Failed to create channel' })
    }
  },
}

