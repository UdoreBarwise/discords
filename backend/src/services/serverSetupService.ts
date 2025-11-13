import {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  TextChannel,
  CategoryChannel,
} from 'discord.js'
import { getBotClient } from '../bot/bot.js'
import { ticketConfigRepository } from '../database/ticketConfigRepository.js'
import { ticketService } from './ticketService.js'
import { autoRolesRepository } from '../database/autoRolesRepository.js'
import { botConfigRepository } from '../database/botConfigRepository.js'
import { diceGameRepository } from '../database/diceGameRepository.js'
import { wordleRepository } from '../database/wordleRepository.js'
import { youtubeNotificationRepository } from '../database/youtubeNotificationRepository.js'
import { aiConfigRepository } from '../database/aiConfigRepository.js'
import { auditLogService } from './auditLogService.js'
import { exchangeRateRepository } from '../database/exchangeRateRepository.js'

export interface SetupOptions {
  nukeServer?: boolean
  configureTickets?: boolean
  configureAutoRoles?: boolean
  configureAIChannels?: boolean
  configureYouTubeNotifications?: boolean
  configureDiceGame?: boolean
  configureWordle?: boolean
  configureBotConfig?: boolean
  configureExchangeRate?: boolean
  configureScoreboard?: boolean
  configureF1?: boolean
  configureLeveling?: boolean
  configureMeme?: boolean
  roleNames?: {
    admin?: string
    moderator?: string
    supportStaff?: string
    member?: string
    chatToAI?: string
    playDice?: string
    playWordle?: string
    youtubeNotifications?: string
    botConfig?: string
  }
  channelNames?: {
    general?: string
    welcome?: string
    tickets?: string
    games?: string
    support?: string
    autoRoles?: string
    aiNormal?: string
    aiRude?: string
    aiProfessional?: string
    aiFriendly?: string
    aiSarcastic?: string
    youtubeNotifications?: string
    diceGame?: string
    wordle?: string
    botConfig?: string
    exchangeRate?: string
    scoreboard?: string
    f1?: string
    meme?: string
  }
}

export interface SetupResult {
  roles: {
    admin?: string
    moderator?: string
    supportStaff?: string
    member?: string
    chatToAI?: string
    playDice?: string
    playWordle?: string
    youtubeNotifications?: string
    botConfig?: string
  }
  categories: {
    info?: string
    general?: string
    ai?: string
    admin?: string
  }
  channels: {
    welcome?: string
    youtubeNotifications?: string
    autoRoles?: string
    ticketsEmbed?: string
    general?: string
    diceGame?: string
    wordle?: string
    exchangeRate?: string
    scoreboard?: string
    f1?: string
    aiNormal?: string
    aiRude?: string
    aiProfessional?: string
    aiFriendly?: string
    aiSarcastic?: string
    auditLog?: string
    meme?: string
  }
  welcomeMessageId?: string
  configuredServices: string[]
}

// Helper function to create and pin an info message in a channel
async function createAndPinInfoMessage(channel: TextChannel, title: string, description: string, color: number = 0x5865f2) {
  try {
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setTimestamp()
    
    const message = await channel.send({ embeds: [embed] })
    await message.pin()
    return message
  } catch (error) {
    console.error(`Error creating/pinning info message in ${channel.name}:`, error)
    return null
  }
}

export const serverSetupService = {
  async setupServer(guildId: string, options: SetupOptions = {}): Promise<SetupResult> {
    const client = getBotClient()
    if (!client) {
      throw new Error('Bot client not initialized')
    }

    const guild = await client.guilds.fetch(guildId)
    if (!guild) {
      throw new Error('Guild not found')
    }

    // Check bot permissions
    const botMember = await guild.members.fetch(client.user!.id)
    if (!botMember.permissions.has(PermissionFlagsBits.ManageGuild)) {
      throw new Error('Bot does not have ManageGuild permission')
    }
    if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
      throw new Error('Bot does not have ManageChannels permission')
    }
    if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
      throw new Error('Bot does not have ManageRoles permission')
    }

    // Nuke server if enabled - delete all existing roles and channels
    if (options.nukeServer) {
      try {
        // Delete all channels (except system channels that can't be deleted)
        const channels = await guild.channels.fetch()
        for (const channel of channels.values()) {
          if (channel && !channel.isThread()) {
            try {
              await channel.delete('Nuke server - deleting all channels')
            } catch (error: any) {
              // Skip channels that can't be deleted (system channels, etc.)
              console.warn(`Could not delete channel ${channel.id}: ${error.message}`)
            }
          }
        }

        // Delete all roles (except @everyone and managed roles)
        const roles = await guild.roles.fetch()
        for (const role of roles.values()) {
          // Don't delete @everyone role, managed roles, or roles higher than bot's highest role
          if (
            role.id !== guild.id &&
            !role.managed &&
            role.comparePositionTo(botMember.roles.highest) < 0
          ) {
            try {
              await role.delete('Nuke server - deleting all roles')
            } catch (error: any) {
              console.warn(`Could not delete role ${role.id}: ${error.message}`)
            }
          }
        }
      } catch (error: any) {
        throw new Error(`Failed to nuke server: ${error.message}`)
      }
    }

    const result: SetupResult = {
      roles: {},
      categories: {},
      channels: {},
      configuredServices: [],
    }

    // Default names
    const roleNames = {
      admin: options.roleNames?.admin || 'Admin',
      moderator: options.roleNames?.moderator || 'Moderator',
      supportStaff: options.roleNames?.supportStaff || 'Support Staff',
      member: options.roleNames?.member || 'Member',
      chatToAI: options.roleNames?.chatToAI || 'Chat to AI',
      playDice: options.roleNames?.playDice || 'Play Dice',
      playWordle: options.roleNames?.playWordle || 'Play Wordle',
      youtubeNotifications: options.roleNames?.youtubeNotifications || 'YouTube Notifications',
      botConfig: options.roleNames?.botConfig || 'Bot Config',
    }

    const channelNames = {
      general: options.channelNames?.general || 'general',
      welcome: options.channelNames?.welcome || 'welcome',
      tickets: options.channelNames?.tickets || 'tickets',
      games: options.channelNames?.games || 'games',
      support: options.channelNames?.support || 'support',
      autoRoles: options.channelNames?.autoRoles || 'get-roles',
      aiNormal: options.channelNames?.aiNormal || 'ai-normal',
      aiRude: options.channelNames?.aiRude || 'ai-rude',
      aiProfessional: options.channelNames?.aiProfessional || 'ai-professional',
      aiFriendly: options.channelNames?.aiFriendly || 'ai-friendly',
      aiSarcastic: options.channelNames?.aiSarcastic || 'ai-sarcastic',
      youtubeNotifications: options.channelNames?.youtubeNotifications || 'youtube-notifications',
      diceGame: options.channelNames?.diceGame || 'dice-game',
      exchangeRate: options.channelNames?.exchangeRate || 'exchange-rate',
      wordle: options.channelNames?.wordle || 'wordle',
      botConfig: options.channelNames?.botConfig || 'bot-config',
      scoreboard: options.channelNames?.scoreboard || 'leaderboard',
      f1: options.channelNames?.f1 || 'f1',
    }

    // Create roles
    const existingRoles = guild.roles.cache

    // Admin role
    let adminRole = existingRoles.find((r) => r.name === roleNames.admin && !r.managed)
    if (!adminRole) {
      adminRole = await guild.roles.create({
        name: roleNames.admin,
        color: 0xff0000,
        permissions: [
          PermissionFlagsBits.Administrator,
        ],
        mentionable: false,
      })
    }
    result.roles.admin = adminRole.id

    // Moderator role
    let moderatorRole = existingRoles.find((r) => r.name === roleNames.moderator && !r.managed)
    if (!moderatorRole) {
      moderatorRole = await guild.roles.create({
        name: roleNames.moderator,
        color: 0xffa500,
        permissions: [
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.KickMembers,
          PermissionFlagsBits.BanMembers,
          PermissionFlagsBits.ModerateMembers,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.ViewAuditLog,
        ],
        mentionable: false,
      })
    }
    result.roles.moderator = moderatorRole.id

    // Support Staff role
    let supportStaffRole = existingRoles.find((r) => r.name === roleNames.supportStaff && !r.managed)
    if (!supportStaffRole) {
      supportStaffRole = await guild.roles.create({
        name: roleNames.supportStaff,
        color: 0x00ff00,
        permissions: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
        mentionable: false,
      })
    }
    result.roles.supportStaff = supportStaffRole.id

    // Member role (default role)
    let memberRole = existingRoles.find((r) => r.name === roleNames.member && !r.managed)
    if (!memberRole) {
      memberRole = await guild.roles.create({
        name: roleNames.member,
        color: 0x808080,
        permissions: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
        mentionable: false,
      })
    }
    result.roles.member = memberRole.id

    // Create categories and channels
    const existingChannels = await guild.channels.fetch()

    // ============================================
    // INFO CATEGORY (First - for initialization)
    // ============================================
    let infoCategory = existingChannels.find(
      (c) => c?.type === ChannelType.GuildCategory && c.name.toLowerCase() === 'info'
    ) as CategoryChannel | undefined

    if (!infoCategory) {
      infoCategory = await guild.channels.create({
        name: 'Info',
        type: ChannelType.GuildCategory,
      }) as CategoryChannel
    }
    result.categories.info = infoCategory.id

    // 1. Welcome channel (first in Info category)
    let welcomeChannel = existingChannels.find(
      (c) => c?.type === ChannelType.GuildText && c.name === channelNames.welcome && c.parentId === infoCategory.id
    ) as TextChannel | undefined

    if (!welcomeChannel) {
      welcomeChannel = await guild.channels.create({
        name: channelNames.welcome,
        type: ChannelType.GuildText,
        parent: infoCategory.id,
        permissionOverwrites: [
          {
            id: guild.id,
            allow: [PermissionFlagsBits.ViewChannel],
            deny: [PermissionFlagsBits.SendMessages],
          },
          {
            id: client.user!.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages],
          },
        ],
      }) as TextChannel
    }
    result.channels.welcome = welcomeChannel.id

    // Create welcome message
    const welcomeEmbed = new EmbedBuilder()
      .setTitle('Welcome to the Server!')
      .setDescription(
        `Welcome to ${guild.name}! We're glad to have you here.\n\n` +
        `Please read the rules and get familiar with our community. If you need help, feel free to ask in the support channels or create a ticket.\n\n` +
        `Enjoy your stay!`
      )
      .setColor(0x5865f2)
      .setTimestamp()
      .setFooter({ text: `Server: ${guild.name}` })

    try {
      const welcomeMessage = await welcomeChannel.send({ embeds: [welcomeEmbed] })
      result.welcomeMessageId = welcomeMessage.id
      await welcomeMessage.pin()
    } catch (error) {
      console.error('Error sending welcome message:', error)
    }

    // 2. YouTube Notifications channel (second in Info category)
    if (options.configureYouTubeNotifications) {
      // Create YouTube Notifications role
      let youtubeNotificationsRole = existingRoles.find((r) => r.name === roleNames.youtubeNotifications && !r.managed)
      if (!youtubeNotificationsRole) {
        youtubeNotificationsRole = await guild.roles.create({
          name: roleNames.youtubeNotifications,
          color: 0xff0000,
          permissions: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
          mentionable: false,
        })
      }
      result.roles.youtubeNotifications = youtubeNotificationsRole.id

      let youtubeNotificationsChannel = existingChannels.find(
        (c) => c?.type === ChannelType.GuildText && c.name === channelNames.youtubeNotifications && c.parentId === infoCategory.id
      ) as TextChannel | undefined

      if (!youtubeNotificationsChannel) {
        youtubeNotificationsChannel = await guild.channels.create({
          name: channelNames.youtubeNotifications,
          type: ChannelType.GuildText,
          parent: infoCategory.id,
          permissionOverwrites: [
            {
              id: guild.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
              deny: [PermissionFlagsBits.SendMessages],
            },
            {
              id: client.user!.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages],
            },
          ],
        }) as TextChannel
      }
      result.channels.youtubeNotifications = youtubeNotificationsChannel.id

      // Create and pin info message
      await createAndPinInfoMessage(
        youtubeNotificationsChannel,
        'YouTube Notifications Channel',
        `This channel is for YouTube video notifications.\n\n` +
        `**How to use:**\n` +
        `• Get the <@&${youtubeNotificationsRole.id}> role to receive notifications\n` +
        `• Admins can configure YouTube channels to monitor in the bot dashboard\n` +
        `• When a new video is uploaded, you'll be notified here automatically\n\n` +
        `**Note:** This feature needs to be enabled and configured by an administrator.`
      )

      // Configure YouTube notifications
      try {
        const existingYoutubeConfig = await youtubeNotificationRepository.getConfig(guildId)
        if (!existingYoutubeConfig) {
          await youtubeNotificationRepository.saveConfig({
            guildId,
            enabled: true,
            channelId: youtubeNotificationsChannel.id,
            checkIntervalMinutes: 15,
          })
          console.log(`[Server Setup] Created and enabled YouTube notifications config for guild ${guildId}`)
          result.configuredServices.push('youtubeNotifications')
        } else {
          // Always update to ensure it's enabled
          await youtubeNotificationRepository.saveConfig({
            guildId,
            enabled: true,
            channelId: youtubeNotificationsChannel.id,
            checkIntervalMinutes: existingYoutubeConfig.checkIntervalMinutes || 15,
          })
          console.log(`[Server Setup] Updated and enabled YouTube notifications config for guild ${guildId}`)
          result.configuredServices.push('youtubeNotifications')
        }
      } catch (error) {
        console.error('Error configuring YouTube notifications:', error)
      }
    }

    // 3. Auto Roles channel (third in Info category)
    if (options.configureAutoRoles) {
      let autoRolesChannel = existingChannels.find(
        (c) => c?.type === ChannelType.GuildText && c.name === channelNames.autoRoles && c.parentId === infoCategory.id
      ) as TextChannel | undefined

      if (!autoRolesChannel) {
        autoRolesChannel = await guild.channels.create({
          name: channelNames.autoRoles,
          type: ChannelType.GuildText,
          parent: infoCategory.id,
        permissionOverwrites: [
          {
            id: guild.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
          },
          {
            id: client.user!.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages],
          },
        ],
        }) as TextChannel
      }
      result.channels.autoRoles = autoRolesChannel.id

      // Create and pin info message (just the info, actual role message will be created later)
      await createAndPinInfoMessage(
        autoRolesChannel,
        'Get Your Roles',
        `This channel is for self-assigning roles using reactions.\n\n` +
        `**How to use:**\n` +
        `• React to the emoji below a role message to get that role\n` +
        `• Remove your reaction to remove the role\n` +
        `• This helps you customize your server experience\n\n` +
        `**Note:** Role messages will appear below once roles are configured.`
      )

      // Store channel for later - we'll create the actual role message after all roles are created
      result.channels.autoRoles = autoRolesChannel.id
    }

    // 4. Tickets embed channel (fourth in Info category)
    if (options.configureTickets) {
      let ticketsEmbedChannel = existingChannels.find(
        (c) => c?.type === ChannelType.GuildText && c.name === channelNames.tickets && c.parentId === infoCategory.id
      ) as TextChannel | undefined

      if (!ticketsEmbedChannel) {
        ticketsEmbedChannel = await guild.channels.create({
          name: channelNames.tickets,
          type: ChannelType.GuildText,
          parent: infoCategory.id,
        permissionOverwrites: [
          {
            id: guild.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
          },
          {
            id: client.user!.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages],
          },
        ],
        }) as TextChannel
      }
      result.channels.ticketsEmbed = ticketsEmbedChannel.id

      // Create and pin info message
      await createAndPinInfoMessage(
        ticketsEmbedChannel,
        'Support Tickets',
        `This channel is for creating support tickets.\n\n` +
        `**How to use:**\n` +
        `• Click the button below to create a new support ticket\n` +
        `• A private channel will be created for you and support staff\n` +
        `• Use tickets for questions, issues, or requests that need private assistance\n` +
        `• Support staff will respond to your ticket as soon as possible\n\n` +
        `**Note:** Tickets are private channels only visible to you and support staff.`
      )
    }

    // Configure ticket system (tickets embed is in Info category, but tickets go to Admin)
    if (options.configureTickets) {
      // Configure ticket system - tickets will be created in Admin category
      // We'll set this up after Admin category is created
    }

    // ============================================
    // GENERAL CATEGORY
    // ============================================
    let generalCategory = existingChannels.find(
      (c) => c?.type === ChannelType.GuildCategory && c.name.toLowerCase() === 'general'
    ) as CategoryChannel | undefined

    if (!generalCategory) {
      generalCategory = await guild.channels.create({
        name: 'General',
        type: ChannelType.GuildCategory,
      }) as CategoryChannel
    }
    result.categories.general = generalCategory.id

    // General channel (can @bot for AI, no moderation unless specified)
    let generalChannel = existingChannels.find(
      (c) => c?.type === ChannelType.GuildText && c.name === channelNames.general && c.parentId === generalCategory.id
    ) as TextChannel | undefined

    if (!generalChannel) {
      generalChannel = await guild.channels.create({
        name: channelNames.general,
        type: ChannelType.GuildText,
        parent: generalCategory.id,
        permissionOverwrites: [
          {
            id: guild.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
          },
          {
            id: client.user!.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages],
          },
        ],
      }) as TextChannel
    }
    result.channels.general = generalChannel.id

    // Create and pin info message
    await createAndPinInfoMessage(
      generalChannel,
      'General Chat',
      `This is the main general discussion channel.\n\n` +
      `**How to use:**\n` +
      `• Chat with other members about anything\n` +
      `• Mention the bot (@bot) to get AI responses\n` +
      `• Keep conversations friendly and respectful\n` +
      `• Follow the server rules at all times\n\n` +
      `**Note:** The bot will respond when mentioned in this channel.`
    )

    // Add general channel to AI response channels (so bot can respond when mentioned)
    try {
      const existingAiResponseChannelsJson = await botConfigRepository.get('ai_response_channel_ids')
      let existingAiResponseChannels: string[] = []
      
      if (existingAiResponseChannelsJson) {
        try {
          existingAiResponseChannels = JSON.parse(existingAiResponseChannelsJson)
        } catch {
          // If parsing fails, start fresh
        }
      }

      if (!existingAiResponseChannels.includes(generalChannel.id)) {
        const allAiResponseChannels = [...new Set([...existingAiResponseChannels, generalChannel.id])]
        await botConfigRepository.set('ai_response_channel_ids', JSON.stringify(allAiResponseChannels))
      }
    } catch (error) {
      console.error('Error adding general channel to AI response channels:', error)
    }

    // Dice Game channel (in General category)
    if (options.configureDiceGame) {
      // Create Play Dice role
      let playDiceRole = existingRoles.find((r) => r.name === roleNames.playDice && !r.managed)
      if (!playDiceRole) {
        playDiceRole = await guild.roles.create({
          name: roleNames.playDice,
          color: 0x00ff00,
          permissions: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
          mentionable: false,
        })
      }
      result.roles.playDice = playDiceRole.id

      let diceGameChannel = existingChannels.find(
        (c) => c?.type === ChannelType.GuildText && c.name === channelNames.diceGame && c.parentId === generalCategory.id
      ) as TextChannel | undefined

      if (!diceGameChannel) {
        diceGameChannel = await guild.channels.create({
          name: channelNames.diceGame,
          type: ChannelType.GuildText,
          parent: generalCategory.id,
          permissionOverwrites: [
            {
              id: guild.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: playDiceRole.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
            },
            {
              id: client.user!.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages],
            },
          ],
        }) as TextChannel
      }
      result.channels.diceGame = diceGameChannel.id

      // Create and pin info message
      await createAndPinInfoMessage(
        diceGameChannel,
        'Dice Game',
        `This channel is for playing the dice game.\n\n` +
        `**How to use:**\n` +
        `• Get the <@&${playDiceRole.id}> role to access this channel\n` +
        `• Roll dice by typing commands (check bot documentation)\n` +
        `• Compete with other players and see your scores\n` +
        `• Have fun and play responsibly\n\n` +
        `**Note:** This feature needs to be enabled by an administrator.`
      )

      // Configure dice game
      try {
        const existingDiceConfig = await diceGameRepository.get(guildId)
        if (!existingDiceConfig) {
          await diceGameRepository.set({
            guildId,
            enabled: true,
            channelId: diceGameChannel.id,
            userCooldownMinutes: 10,
          })
          console.log(`[Server Setup] Created and enabled dice game config for guild ${guildId}`)
          result.configuredServices.push('diceGame')
        } else {
          // Always update to ensure it's enabled
          await diceGameRepository.set({
            guildId,
            enabled: true,
            channelId: diceGameChannel.id,
            userCooldownMinutes: existingDiceConfig.userCooldownMinutes || 10,
          })
          console.log(`[Server Setup] Updated and enabled dice game config for guild ${guildId}`)
          result.configuredServices.push('diceGame')
        }
      } catch (error) {
        console.error('Error configuring dice game:', error)
      }
    }

    // Exchange Rate channel (in General category)
    if (options.configureExchangeRate) {
      try {
        const exchangeRateChannel = existingChannels.find(
        (c) => c?.type === ChannelType.GuildText && c.name === channelNames.exchangeRate && c.parentId === generalCategory.id
      ) as TextChannel | undefined

        if (!exchangeRateChannel) {
          const newExchangeRateChannel = await guild.channels.create({
            name: channelNames.exchangeRate,
            type: ChannelType.GuildText,
            parent: generalCategory.id,
            permissionOverwrites: [
              {
                id: guild.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
              },
              {
                id: client.user!.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages],
              },
            ],
          }) as TextChannel
          result.channels.exchangeRate = newExchangeRateChannel.id

          await createAndPinInfoMessage(
            newExchangeRateChannel,
            'Currency Exchange Rate',
            `Use \`!convert\` or \`/exchange-rate convert\` to convert currencies.\n\n` +
            `**Commands:**\n` +
            `• \`!convert\` - Start an interactive currency conversion\n` +
            `• \`/exchange-rate convert\` - Convert currencies with dropdowns\n` +
            `• \`/exchange-rate rates\` - View current exchange rates\n\n` +
            `**Example:** \`!convert\` or \`/exchange-rate convert amount:100 from:USD to:EUR\``
          )
        } else {
          result.channels.exchangeRate = exchangeRateChannel.id
        }

        // Enable exchange rate config - ALWAYS enable it during setup
        const existingExchangeRateConfig = await exchangeRateRepository.getConfig(guildId)
        const channelId = result.channels.exchangeRate
        if (!existingExchangeRateConfig) {
          await exchangeRateRepository.createConfig({
            guildId,
            enabled: true,
            defaultBaseCurrency: 'USD',
            channelId: channelId,
          })
          console.log(`[Server Setup] Created and enabled exchange rate config for guild ${guildId}`)
          result.configuredServices.push('exchangeRate')
        } else {
          // Always update to ensure it's enabled and channel is set
          await exchangeRateRepository.updateConfig(guildId, {
            enabled: true,
            channelId: channelId,
          })
          console.log(`[Server Setup] Updated and enabled exchange rate config for guild ${guildId}`)
          result.configuredServices.push('exchangeRate')
        }
      } catch (error) {
        console.error('Error configuring exchange rate:', error)
      }
    }

    // Wordle channel (in General category)
    if (options.configureWordle) {
      // Create Play Wordle role
      let playWordleRole = existingRoles.find((r) => r.name === roleNames.playWordle && !r.managed)
      if (!playWordleRole) {
        playWordleRole = await guild.roles.create({
          name: roleNames.playWordle,
          color: 0x00ff00,
          permissions: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
          mentionable: false,
        })
      }
      result.roles.playWordle = playWordleRole.id

      let wordleChannel = existingChannels.find(
        (c) => c?.type === ChannelType.GuildText && c.name === channelNames.wordle && c.parentId === generalCategory.id
      ) as TextChannel | undefined

      if (!wordleChannel) {
        wordleChannel = await guild.channels.create({
          name: channelNames.wordle,
          type: ChannelType.GuildText,
          parent: generalCategory.id,
          permissionOverwrites: [
            {
              id: guild.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: playWordleRole.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
            },
            {
              id: client.user!.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages],
            },
          ],
        }) as TextChannel
      }
      result.channels.wordle = wordleChannel.id

      // Create and pin info message
      await createAndPinInfoMessage(
        wordleChannel,
        'Wordle Game',
        `This channel is for playing Wordle.\n\n` +
        `**How to use:**\n` +
        `• Get the <@&${playWordleRole.id}> role to access this channel\n` +
        `• Start a game by typing the wordle command\n` +
        `• Guess 5-letter words and get feedback\n` +
        `• Try to solve the puzzle in as few guesses as possible\n\n` +
        `**Note:** This feature needs to be enabled by an administrator.`
      )

      // Configure wordle
      try {
        const existingWordleConfig = await wordleRepository.get(guildId)
        if (!existingWordleConfig) {
          await wordleRepository.set({
            guildId,
            enabled: true,
            channelId: wordleChannel.id,
            allowedRoleIds: [playWordleRole.id],
            allowedUserIds: [],
            dmOnly: false,
            userCooldownMinutes: 60,
          })
          console.log(`[Server Setup] Created and enabled wordle config for guild ${guildId}`)
          result.configuredServices.push('wordle')
        } else {
          // Always update to ensure it's enabled
          await wordleRepository.set({
            guildId,
            enabled: true,
            channelId: wordleChannel.id,
            allowedRoleIds: existingWordleConfig.allowedRoleIds.length > 0 ? existingWordleConfig.allowedRoleIds : [playWordleRole.id],
            allowedUserIds: existingWordleConfig.allowedUserIds || [],
            dmOnly: existingWordleConfig.dmOnly || false,
            userCooldownMinutes: existingWordleConfig.userCooldownMinutes || 60,
          })
          console.log(`[Server Setup] Updated and enabled wordle config for guild ${guildId}`)
          result.configuredServices.push('wordle')
        }
      } catch (error) {
        console.error('Error configuring wordle:', error)
      }
    }

    // Scoreboard channel (in General category)
    if (options.configureScoreboard) {
      let scoreboardChannel = existingChannels.find(
        (c) => c?.type === ChannelType.GuildText && c.name === channelNames.scoreboard && c.parentId === generalCategory.id
      ) as TextChannel | undefined

      if (!scoreboardChannel) {
        scoreboardChannel = await guild.channels.create({
          name: channelNames.scoreboard,
          type: ChannelType.GuildText,
          parent: generalCategory.id,
          permissionOverwrites: [
            {
              id: guild.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
              deny: [PermissionFlagsBits.SendMessages],
            },
            {
              id: client.user!.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages],
            },
          ],
        }) as TextChannel
      }
      result.channels.scoreboard = scoreboardChannel.id

      // Create and pin info message
      await createAndPinInfoMessage(
        scoreboardChannel,
        'Leaderboard',
        `This channel displays the game leaderboard.\n\n` +
        `**How to use:**\n` +
        `• The leaderboard is automatically updated at regular intervals\n` +
        `• View top players and their statistics\n` +
        `• Use \`/leaderboard\` command to view leaderboards in any channel\n\n` +
        `**Note:** Configure the leaderboard settings in the web dashboard.`
      )

      // Configure scoreboard
      try {
        const { scoreboardConfigRepository } = await import('../database/scoreboardConfigRepository.js')
        const existingScoreboardConfig = await scoreboardConfigRepository.get(guildId)
        if (!existingScoreboardConfig) {
          await scoreboardConfigRepository.set({
            guildId,
            enabled: true,
            channelId: scoreboardChannel.id,
            updateIntervalMinutes: 5,
            gameType: 'all',
            limitPlayers: 10,
          })
          console.log(`[Server Setup] Created and enabled scoreboard config for guild ${guildId}`)
          result.configuredServices.push('scoreboard')
        } else {
          // Always update to ensure it's enabled
          await scoreboardConfigRepository.set({
            guildId,
            enabled: true,
            channelId: scoreboardChannel.id,
            updateIntervalMinutes: existingScoreboardConfig.updateIntervalMinutes || 5,
            gameType: existingScoreboardConfig.gameType || 'all',
            limitPlayers: existingScoreboardConfig.limitPlayers || 10,
          })
          console.log(`[Server Setup] Updated and enabled scoreboard config for guild ${guildId}`)
          result.configuredServices.push('scoreboard')
        }
      } catch (error) {
        console.error('Error configuring scoreboard:', error)
      }
    }

    // F1 channel (in General category)
    if (options.configureF1) {
      let f1Channel = existingChannels.find(
        (c) => c?.type === ChannelType.GuildText && c.name === channelNames.f1 && c.parentId === generalCategory.id
      ) as TextChannel | undefined

      if (!f1Channel) {
        f1Channel = await guild.channels.create({
          name: channelNames.f1,
          type: ChannelType.GuildText,
          parent: generalCategory.id,
          permissionOverwrites: [
            {
              id: guild.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
            },
            {
              id: client.user!.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages],
            },
          ],
        }) as TextChannel
      }
      result.channels.f1 = f1Channel.id

      // Create and pin info message
      await createAndPinInfoMessage(
        f1Channel,
        'F1 Racing',
        `This channel is for F1 racing information and commands.\n\n` +
        `**How to use:**\n` +
        `• Use \`/f1\` commands to get race information\n` +
        `• View race schedules, standings, and live updates\n` +
        `• Get session information and timing data\n\n` +
        `**Note:** F1 commands need to be enabled in the Sports Tracker settings.`
      )

      // Configure F1
      try {
        const { sportsConfigRepository } = await import('../database/sportsConfigRepository.js')
        const existingF1Config = await sportsConfigRepository.getConfig(guildId, 'f1')
        if (!existingF1Config) {
          await sportsConfigRepository.saveConfig({
            guildId,
            sportType: 'f1',
            enabled: true,
            channelIds: [f1Channel.id],
            dataTypes: ['session_start', 'race_start', 'race_end'],
            allowedRoleIds: [],
            blockedUserIds: [],
          })
          console.log(`[Server Setup] Created and enabled F1 config for guild ${guildId}`)
          result.configuredServices.push('f1')
        } else {
          // Always update to ensure it's enabled
          await sportsConfigRepository.saveConfig({
            guildId,
            sportType: 'f1',
            enabled: true,
            channelIds: existingF1Config.channelIds && existingF1Config.channelIds.length > 0 ? existingF1Config.channelIds : [f1Channel.id],
            dataTypes: existingF1Config.dataTypes && existingF1Config.dataTypes.length > 0 ? existingF1Config.dataTypes : ['session_start', 'race_start', 'race_end'],
            allowedRoleIds: existingF1Config.allowedRoleIds || [],
            blockedUserIds: existingF1Config.blockedUserIds || [],
          })
          console.log(`[Server Setup] Updated and enabled F1 config for guild ${guildId}`)
          result.configuredServices.push('f1')
        }
      } catch (error) {
        console.error('Error configuring F1:', error)
      }
    }

    // Leveling system configuration
    if (options.configureLeveling) {
      try {
        const { levelingRepository } = await import('../database/levelingRepository.js')
        const existingLevelingConfig = await levelingRepository.getConfig(guildId)
        if (!existingLevelingConfig) {
          await levelingRepository.setConfig({
            guildId,
            enabled: true,
            xpPerMessage: 10,
            xpPerReaction: 5,
            messageCooldownSeconds: 60,
            minMessageLength: 0,
            whitelistChannels: [],
            blacklistChannels: [],
            whitelistRoles: [],
            blacklistRoles: [],
            levelUpChannelId: undefined,
            levelUpMessage: '🎉 {user} leveled up to level {level}!',
          })
          result.configuredServices.push('leveling')
        }
      } catch (error) {
        console.error('Error configuring leveling:', error)
      }
    }

    // Meme configuration
    if (options.configureMeme) {
      try {
        const { memeRepository } = await import('../database/memeRepository.js')
        const existingMemeConfig = await memeRepository.get(guildId)
        if (!existingMemeConfig) {
          // Create meme channel in Games category
          const gamesCategoryId = result.categories.games
          const memeChannelName = channelNames.meme || 'memes'
          
          let memeChannel = existingChannels.find(
            (c) => c?.type === ChannelType.GuildText && c.name === memeChannelName && c.parentId === gamesCategoryId
          ) as TextChannel | undefined

          if (!memeChannel && gamesCategoryId) {
            memeChannel = await guild.channels.create({
              name: memeChannelName,
              type: ChannelType.GuildText,
              parent: gamesCategoryId,
              permissionOverwrites: [
                {
                  id: guild.id,
                  allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                },
                {
                  id: client.user!.id,
                  allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages],
                },
              ],
            }) as TextChannel
          }

          if (memeChannel) {
            await memeRepository.set({
              guildId,
              enabled: true,
              channelId: memeChannel.id,
              autoDeleteMessages: false,
              autoPostEnabled: false,
              autoPostIntervalHours: 2,
            })
            result.channels.meme = memeChannel.id
            result.configuredServices.push('meme')
            
            // Create and pin info message
            await createAndPinInfoMessage(
              memeChannel,
              'Meme Channel',
              `This channel is for requesting and sharing dark memes.\n\n` +
              `**How to use:**\n` +
              `• Type \`!meme\` to get a random dark meme\n` +
              `• Memes are fetched from various dark meme subreddits\n` +
              `• Be aware that memes may contain dark or offensive content\n\n` +
              `**Note:** Configure meme settings in the web dashboard.`
            )
          }
        }
      } catch (error) {
        console.error('Error configuring meme:', error)
      }
    }

    // Create AI channels (if AI channels should be configured)
    if (options.configureAIChannels) {
      // Create Chat to AI role
      let chatToAIRole = existingRoles.find((r) => r.name === roleNames.chatToAI && !r.managed)
      if (!chatToAIRole) {
        chatToAIRole = await guild.roles.create({
          name: roleNames.chatToAI,
          color: 0x5865f2,
          permissions: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
          mentionable: false,
        })
      }
      result.roles.chatToAI = chatToAIRole.id

      // Create AI category
      let aiCategory = existingChannels.find(
        (c) => c?.type === ChannelType.GuildCategory && c.name.toLowerCase() === 'ai'
      ) as CategoryChannel | undefined

      if (!aiCategory) {
        aiCategory = await guild.channels.create({
          name: 'AI',
          type: ChannelType.GuildCategory,
        }) as CategoryChannel
      }
      result.categories.ai = aiCategory.id

      // Create AI personality channels
      const aiPersonalities = [
        { key: 'aiNormal', name: channelNames.aiNormal, personality: 'normal' },
        { key: 'aiRude', name: channelNames.aiRude, personality: 'rude' },
        { key: 'aiProfessional', name: channelNames.aiProfessional, personality: 'professional' },
        { key: 'aiFriendly', name: channelNames.aiFriendly, personality: 'friendly' },
        { key: 'aiSarcastic', name: channelNames.aiSarcastic, personality: 'sarcastic' },
      ]

      const aiChannelIds: string[] = []

      for (const personality of aiPersonalities) {
        let aiChannel = existingChannels.find(
          (c) => c?.type === ChannelType.GuildText && c.name === personality.name && c.parentId === aiCategory.id
        ) as TextChannel | undefined

        if (!aiChannel) {
          aiChannel = await guild.channels.create({
            name: personality.name,
            type: ChannelType.GuildText,
            parent: aiCategory.id,
            permissionOverwrites: [
              {
                id: guild.id,
                deny: [PermissionFlagsBits.ViewChannel],
              },
              {
                id: chatToAIRole.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
              },
              {
                id: client.user!.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
              },
            ],
          }) as TextChannel
        }
        result.channels[personality.key as keyof typeof result.channels] = aiChannel.id
        aiChannelIds.push(aiChannel.id)

        // Create and pin info message for each AI channel
        const personalityDescriptions: Record<string, { title: string; desc: string }> = {
          normal: {
            title: 'AI Chat - Normal',
            desc: `Chat with the AI in a normal, balanced personality.\n\n` +
            `**How to use:**\n` +
            `• Get the <@&${chatToAIRole.id}> role to access this channel\n` +
            `• Just type your message and the AI will respond\n` +
            `• The AI will respond in a neutral, helpful manner\n` +
            `• Have natural conversations with the AI\n\n` +
            `**Note:** This channel uses the "normal" AI personality.`
          },
          rude: {
            title: 'AI Chat - Rude',
            desc: `Chat with the AI in a rude, sarcastic personality.\n\n` +
            `**How to use:**\n` +
            `• Get the <@&${chatToAIRole.id}> role to access this channel\n` +
            `• Just type your message and the AI will respond\n` +
            `• The AI will respond in a rude, sarcastic manner\n` +
            `• This is for entertainment purposes only\n\n` +
            `**Warning:** This channel uses the "rude" AI personality. Expect sarcastic responses!`
          },
          professional: {
            title: 'AI Chat - Professional',
            desc: `Chat with the AI in a professional, business-like personality.\n\n` +
            `**How to use:**\n` +
            `• Get the <@&${chatToAIRole.id}> role to access this channel\n` +
            `• Just type your message and the AI will respond\n` +
            `• The AI will respond in a formal, professional manner\n` +
            `• Perfect for work-related questions or formal discussions\n\n` +
            `**Note:** This channel uses the "professional" AI personality.`
          },
          friendly: {
            title: 'AI Chat - Friendly',
            desc: `Chat with the AI in a warm, friendly personality.\n\n` +
            `**How to use:**\n` +
            `• Get the <@&${chatToAIRole.id}> role to access this channel\n` +
            `• Just type your message and the AI will respond\n` +
            `• The AI will respond in a warm, friendly, and supportive manner\n` +
            `• Great for casual conversations and friendly chats\n\n` +
            `**Note:** This channel uses the "friendly" AI personality.`
          },
          sarcastic: {
            title: 'AI Chat - Sarcastic',
            desc: `Chat with the AI in a witty, sarcastic personality.\n\n` +
            `**How to use:**\n` +
            `• Get the <@&${chatToAIRole.id}> role to access this channel\n` +
            `• Just type your message and the AI will respond\n` +
            `• The AI will respond with wit, humor, and sarcasm\n` +
            `• Perfect for entertaining conversations\n\n` +
            `**Note:** This channel uses the "sarcastic" AI personality. Expect witty responses!`
          },
        }

        const personalityInfo = personalityDescriptions[personality.personality]
        if (personalityInfo) {
          await createAndPinInfoMessage(
            aiChannel,
            personalityInfo.title,
            personalityInfo.desc
          )
        }
      }

      // Configure personalities for AI channels in the database
      try {
        let guildConfig = await aiConfigRepository.get(guildId)
        if (!guildConfig) {
          guildConfig = {
            guildId,
            rateLimitPerMinute: 5,
            rateLimitPerHour: 50,
            channelConfigs: {},
          }
        }
        
        if (!guildConfig.channelConfigs) {
          guildConfig.channelConfigs = {}
        }

        // Set personality for each AI channel
        for (const personality of aiPersonalities) {
          const channelId = result.channels[personality.key as keyof typeof result.channels]
          if (channelId) {
            if (!guildConfig.channelConfigs[channelId]) {
              guildConfig.channelConfigs[channelId] = {}
            }
            guildConfig.channelConfigs[channelId].personality = personality.personality
          }
        }

        await aiConfigRepository.set(guildConfig)
        console.log(`[Server Setup] Configured personalities for ${aiPersonalities.length} AI channels`)
      } catch (error) {
        console.error('Error configuring AI channel personalities:', error)
      }

      // Add AI personality channels to AI response channels
      try {
        const existingAiResponseChannelsJson = await botConfigRepository.get('ai_response_channel_ids')
        let existingAiResponseChannels: string[] = []
        
        if (existingAiResponseChannelsJson) {
          try {
            existingAiResponseChannels = JSON.parse(existingAiResponseChannelsJson)
          } catch {
            // If parsing fails, start fresh
          }
        }

        // Merge with existing channels, avoiding duplicates
        const allAiResponseChannels = [...new Set([...existingAiResponseChannels, ...aiChannelIds])]
        await botConfigRepository.set('ai_response_channel_ids', JSON.stringify(allAiResponseChannels))
        result.configuredServices.push('aiChannels')
      } catch (error) {
        console.error('Error configuring AI response channels:', error)
      }
    }

    // ============================================
    // ADMIN CATEGORY
    // ============================================
    let adminCategory = existingChannels.find(
      (c) => c?.type === ChannelType.GuildCategory && c.name.toLowerCase() === 'admin'
    ) as CategoryChannel | undefined

    if (!adminCategory) {
      adminCategory = await guild.channels.create({
        name: 'Admin',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: adminRole.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
          },
          {
            id: moderatorRole.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
          },
          {
            id: client.user!.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels],
          },
        ],
      }) as CategoryChannel
    }
    result.categories.admin = adminCategory.id

    // Audit Log channel (in Admin category)
    let auditLogChannel = existingChannels.find(
      (c) => c?.type === ChannelType.GuildText && c.name === 'audit-log' && c.parentId === adminCategory.id
    ) as TextChannel | undefined

    if (!auditLogChannel) {
      auditLogChannel = await guild.channels.create({
        name: 'audit-log',
        type: ChannelType.GuildText,
        parent: adminCategory.id,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: adminRole.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
          },
          {
            id: moderatorRole.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
          },
          {
            id: client.user!.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages],
          },
        ],
      }) as TextChannel
    }
    result.channels.auditLog = auditLogChannel.id

    // Create and pin info message
    await createAndPinInfoMessage(
      auditLogChannel,
      'Audit Log',
      `This channel logs important server events and actions.\n\n` +
      `**What's logged:**\n` +
      `• User joins and leaves\n` +
      `• Message deletions and edits\n` +
      `• Role and permission changes\n` +
      `• Channel creation and deletion\n` +
      `• Moderation actions\n\n` +
      `**Note:** This channel is only visible to administrators and moderators.`
    )

    // Store audit log channel ID in config
    await botConfigRepository.set(`audit_log_channel_${guildId}`, auditLogChannel.id)

    // Configure ticket system - tickets go to Admin category
    if (options.configureTickets) {
      try {
        await ticketConfigRepository.set({
          guildId,
          embedChannelId: result.channels.ticketsEmbed!,
          ticketCategoryId: adminCategory.id, // Tickets go to Admin category
          mentionRoleIds: [supportStaffRole.id],
          mentionUserIds: [],
          messageType: 'embed',
          messageTitle: 'Create a Ticket',
          messageDescription: 'Click the button below to create a support ticket.',
        })
        // Create the ticket embed message
        try {
          const embedMessageId = await ticketService.createOrUpdateEmbed(guildId)
          await ticketConfigRepository.set({
            guildId,
            embedChannelId: result.channels.ticketsEmbed!,
            ticketCategoryId: adminCategory.id,
            mentionRoleIds: [supportStaffRole.id],
            mentionUserIds: [],
            messageType: 'embed',
            messageTitle: 'Create a Ticket',
            messageDescription: 'Click the button below to create a support ticket.',
            embedMessageId,
          })
        } catch (embedError) {
          console.error('Error creating ticket embed:', embedError)
        }
        result.configuredServices.push('tickets')
      } catch (error) {
        console.error('Error configuring tickets:', error)
      }
    }

    // Create Bot Config channel (if bot config should be configured)
    if (options.configureBotConfig) {
      // Create Config category
      let configCategory = existingChannels.find(
        (c) => c?.type === ChannelType.GuildCategory && c.name.toLowerCase() === 'config'
      ) as CategoryChannel | undefined

      if (!configCategory) {
        configCategory = await guild.channels.create({
          name: 'Config',
          type: ChannelType.GuildCategory,
        }) as CategoryChannel
      }
      result.categories.config = configCategory.id

      // Create Bot Config role
      let botConfigRole = existingRoles.find((r) => r.name === roleNames.botConfig && !r.managed)
      if (!botConfigRole) {
        botConfigRole = await guild.roles.create({
          name: roleNames.botConfig,
          color: 0x9b59b6,
          permissions: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
          mentionable: false,
        })
      }
      result.roles.botConfig = botConfigRole.id

      // Create Bot Config channel
      let botConfigChannel = existingChannels.find(
        (c) => c?.type === ChannelType.GuildText && c.name === channelNames.botConfig && c.parentId === configCategory.id
      ) as TextChannel | undefined

      if (!botConfigChannel) {
        botConfigChannel = await guild.channels.create({
          name: channelNames.botConfig,
          type: ChannelType.GuildText,
          parent: configCategory.id,
          permissionOverwrites: [
            {
              id: guild.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: botConfigRole.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
            },
            {
              id: client.user!.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages],
            },
          ],
        }) as TextChannel
      }
      result.channels.botConfig = botConfigChannel.id

      // Create and pin info message
      await createAndPinInfoMessage(
        botConfigChannel,
        'Bot Configuration',
        `This channel is for configuring bot settings and commands.\n\n` +
        `**How to use:**\n` +
        `• Get the <@&${botConfigRole.id}> role to access this channel\n` +
        `• Use bot commands here to configure server settings\n` +
        `• View and modify bot configurations\n` +
        `• Manage bot features and permissions\n\n` +
        `**Note:** This channel is restricted to users with the Bot Config role.`
      )
    }

    // ============================================
    // FINAL STEP: Assign all roles to all existing members
    // ============================================
    try {
      // Collect all non-admin roles that were created
      const allNonAdminRoleIds: string[] = []
      
      // Add all created roles that don't have admin permissions
      const roleIdsToCheck = [
        result.roles.member,
        result.roles.supportStaff,
        result.roles.youtubeNotifications,
        result.roles.playDice,
        result.roles.playWordle,
        result.roles.chatToAI,
        result.roles.botConfig,
      ].filter((id): id is string => Boolean(id))

      for (const roleId of roleIdsToCheck) {
        try {
          if (!roleId) continue
          const role = await guild.roles.fetch(roleId).catch(() => null)
          if (role && role.id && !role.permissions.has(PermissionFlagsBits.Administrator) && !role.managed) {
            allNonAdminRoleIds.push(role.id)
          }
        } catch (error) {
          // Role might not exist, skip
          continue
        }
      }

      // Assign all roles to all existing members
      if (allNonAdminRoleIds.length > 0) {
        console.log(`[Server Setup] Assigning ${allNonAdminRoleIds.length} roles to all existing members...`)
        try {
          const members = await guild.members.fetch().catch(() => null)
          if (!members) {
            console.error('[Server Setup] Failed to fetch members, skipping role assignment')
          } else {

          let assignedCount = 0
          let errorCount = 0

          for (const member of members.values()) {
            if (!member || !member.id) continue
            try {
              // Only assign roles that the member doesn't already have
              const rolesToAdd = allNonAdminRoleIds.filter(roleId => roleId && !member.roles.cache.has(roleId))
              if (rolesToAdd.length > 0) {
                await member.roles.add(rolesToAdd)
                assignedCount++
              }
            } catch (error) {
              errorCount++
              // Continue with other members even if one fails
            }
          }

            console.log(`[Server Setup] Assigned roles to ${assignedCount} members (${errorCount} errors)`)
          }
        } catch (error) {
          console.error('[Server Setup] Error fetching members:', error)
        }
      }
    } catch (error) {
      console.error('[Server Setup] Error assigning roles to existing members:', error)
    }

    // ============================================
    // FINAL STEP: Create auto roles message with all created roles
    // ============================================
    if (options.configureAutoRoles && result.channels.autoRoles) {
      try {
        const autoRolesChannelId = result.channels.autoRoles
        if (!autoRolesChannelId) {
          console.error('[Server Setup] Auto roles channel ID is missing, skipping auto roles message')
        } else {
          const autoRolesChannel = await guild.channels.fetch(autoRolesChannelId).catch(() => null) as TextChannel | null
          if (!autoRolesChannel) {
            console.error('[Server Setup] Failed to fetch auto roles channel, skipping auto roles message')
          } else {

        // Collect all non-admin roles that were created
        const reactionRoles: Array<{ emoji: string; roleId: string }> = []
        const emojis = ['🎮', '📝', '🤖', '⚙️', '🎲', '🔤', '💬', '📊', '🎯', '📺', '🎉', '📋', '🔧', '👤', '🛡️']

        // Fetch all created roles and check which ones don't have admin permissions
        const allCreatedRoleIds = [
          result.roles.member,
          result.roles.supportStaff,
          result.roles.youtubeNotifications,
          result.roles.playDice,
          result.roles.playWordle,
          result.roles.chatToAI,
          result.roles.botConfig,
        ].filter((id): id is string => Boolean(id))

        let emojiIndex = 0
        for (const roleId of allCreatedRoleIds) {
          if (!roleId) continue
          try {
            const role = await guild.roles.fetch(roleId).catch(() => null)
            if (role && role.id && !role.permissions.has(PermissionFlagsBits.Administrator) && !role.managed) {
              reactionRoles.push({ emoji: emojis[emojiIndex % emojis.length], roleId: role.id })
              emojiIndex++
            }
          } catch (error) {
            // Role might not exist, skip
            continue
          }
        }

            // Only create message if we have roles
            if (reactionRoles.length > 0) {
              const { autoRolesService } = await import('./autoRolesService.js')
              
              const config = {
                guildId,
                channelId: autoRolesChannel.id,
                embedTitle: 'Get Your Roles',
                embedDescription: 'React to the emojis below to get roles!',
                embedColor: '#5865f2',
                reactionRoles,
              }

              // Save config first
              await autoRolesRepository.saveConfig(config)
              
              // Then send the message with reactions
              await autoRolesService.sendAutoRolesMessage(config)
              
              result.configuredServices.push('autoRoles')
              console.log(`[Server Setup] Created auto roles message with ${reactionRoles.length} roles`)
            } else {
              // No roles created, just save empty config
              await autoRolesRepository.saveConfig({
                guildId,
                channelId: autoRolesChannel.id,
                embedTitle: 'Get Your Roles',
                embedDescription: 'React to the messages below to get roles!',
                embedColor: '#5865f2',
                reactionRoles: [],
              })
            }
          }
        }
      } catch (error) {
        console.error('Error creating auto roles message:', error)
      }
    }

    return result
  },
}


