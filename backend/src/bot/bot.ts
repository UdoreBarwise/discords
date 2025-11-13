import {
  Client,
  GatewayIntentBits,
  InteractionType,
  ButtonInteraction,
  MessageReaction,
  User,
  PartialUser,
  SlashCommandBuilder,
  REST,
  Routes,
  ChatInputCommandInteraction,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  StringSelectMenuInteraction,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  TextChannel,
} from 'discord.js'
import { botConfigRepository } from '../database/botConfigRepository.js'
import { aiConfigRepository } from '../database/aiConfigRepository.js'
import { ticketService } from '../services/ticketService.js'
import { diceGameService } from '../services/diceGameService.js'
import { aiService } from '../services/aiService.js'
import { errorLogger } from '../services/errorLogger.js'
import { autoRolesService } from '../services/autoRolesService.js'
import { autoModeratorService } from '../services/autoModeratorService.js'
import { levelingService } from '../services/levelingService.js'
import { welcomeMessageService } from '../services/welcomeMessageService.js'
import { aiTrainingService } from '../services/aiTrainingService.js'
import { AIProvider, AIPersonality } from '../services/aiService.js'
import { steamService } from '../services/steamService.js'
import { steamRepository } from '../database/steamRepository.js'
import { votingService } from '../services/votingService.js'
import { memeService } from '../services/memeService.js'
import { f1CommandService } from '../services/f1CommandService.js'
import { exchangeRateDiscordService } from '../services/exchangeRateDiscordService.js'
import { exchangeRateRepository } from '../database/exchangeRateRepository.js'

let botClient: Client | null = null

// Helper function to get command-specific help
function getCommandHelp(commandName: string | null, frontendUrl: string): EmbedBuilder {
  const helpUrl = `${frontendUrl}/help`
  
  if (!commandName) {
    // General help
    return new EmbedBuilder()
      .setTitle('KaasBot Help')
      .setDescription(`View the full help documentation and guides`)
      .setColor(0x5865f2)
      .addFields(
        { name: '📖 Help Documentation', value: `[Click here to open help page](${helpUrl})`, inline: false },
          { name: '💬 Slash Commands', value: '`/ping` - Check if bot is online\n`/dice` - Start a dice game\n`/model` - Switch Ollama model\n`/personality` - Switch AI personality\n`/poll` - Create an anonymous voting poll\n`/f1` - Get Formula 1 race information\n`/help [command]` - Get help for a specific command', inline: false },
        { name: '📝 Prefix Commands', value: 'You can also use `!` prefix:\n`!ping`, `!dice`, `!model`, `!personality`, `!help [command]`', inline: false },
        { name: '💡 Tip', value: 'Use `!help [command]` or `/help command:[command]` to get detailed help for a specific command.\nExample: `!help model` or `/help command:model`', inline: false }
      )
      .setFooter({ text: 'Use slash commands (/) for a better experience' })
      .setTimestamp()
  }

  const command = commandName.toLowerCase()
  
  switch (command) {
    case 'ping':
      return new EmbedBuilder()
        .setTitle('Help: Ping Command')
        .setDescription('Check if the bot is online and responsive.')
        .setColor(0x5865f2)
        .addFields(
          { name: 'Usage', value: '`!ping` or `/ping`', inline: false },
          { name: 'Description', value: 'Responds with "Pong!" to confirm the bot is online and working.', inline: false },
          { name: 'Example', value: '`!ping`\nBot responds: `Pong!`', inline: false }
        )
        .setTimestamp()
    
    case 'dice':
      return new EmbedBuilder()
        .setTitle('Help: Dice Game Command')
        .setDescription('Start an interactive dice game with the bot.')
        .setColor(0x5865f2)
        .addFields(
          { name: 'Usage', value: '`!dice` or `/dice`', inline: false },
          { name: 'Description', value: 'Starts a dice game where you and the bot take turns rolling dice. The player with the highest total wins!', inline: false },
          { name: 'How to Play', value: '1. Use `!dice` to start a game\n2. Choose who goes first (you or the bot)\n3. Roll dice when it\'s your turn\n4. Highest total wins!', inline: false },
          { name: 'Requirements', value: '• Dice game must be enabled for your server\n• You must be in the configured dice game channel (if one is set)\n• You must not be on cooldown', inline: false },
          { name: 'Cooldown', value: 'There is a cooldown between games (configurable per server)', inline: false }
        )
        .setTimestamp()
    
    case 'model':
      return new EmbedBuilder()
        .setTitle('Help: Model Command')
        .setDescription('Switch the AI model used in this channel (Ollama only).')
        .setColor(0x5865f2)
        .addFields(
          { name: 'Usage', value: '`!model` or `/model`', inline: false },
          { name: 'Description', value: 'Opens an interactive dropdown menu to select which Ollama model to use for AI responses in this channel.', inline: false },
          { name: 'How to Use', value: '1. Use `!model` or `/model`\n2. A dropdown menu will appear with available models\n3. Select the model you want from the dropdown\n4. Only you (the requester) can change the selection', inline: false },
          { name: 'Requirements', value: '• AI provider must be set to Ollama\n• Ollama must be running and accessible\n• Models must be downloaded in Ollama', inline: false },
          { name: 'Note', value: 'The model selection is channel-specific. Each channel can have its own model. Only the user who requested the selection can change it.', inline: false }
        )
        .setTimestamp()
    
    case 'personality':
      return new EmbedBuilder()
        .setTitle('Help: Personality Command')
        .setDescription('Switch the AI personality used in this channel.')
        .setColor(0x5865f2)
        .addFields(
          { name: 'Usage', value: '`!personality` or `/personality`', inline: false },
          { name: 'Description', value: 'Opens an interactive dropdown menu to select which AI personality to use for responses in this channel.', inline: false },
          { name: 'Available Personalities', value: '• **Normal** 😐 - Balanced and helpful\n• **Rude** 😈 - Toxic and unfiltered\n• **Professional** 💼 - Formal and business-like\n• **Friendly** 😊 - Warm and enthusiastic\n• **Sarcastic** 😏 - Witty and sarcastic', inline: false },
          { name: 'How to Use', value: '1. Use `!personality` or `/personality`\n2. A dropdown menu will appear with available personalities\n3. Select the personality you want from the dropdown\n4. Only you (the requester) can change the selection', inline: false },
          { name: 'Note', value: 'The personality selection is channel-specific. Each channel can have its own personality. Only the user who requested the selection can change it.', inline: false }
        )
        .setTimestamp()
    
    case 'poll':
      return new EmbedBuilder()
        .setTitle('Help: Poll Command')
        .setDescription('Create an anonymous voting poll in the current channel.')
        .setColor(0x5865f2)
        .addFields(
          { name: 'Usage', value: '`/poll title:<title> options:<options> [description:<description>] [expires_hours:<hours>]`', inline: false },
          { name: 'Description', value: 'Creates an anonymous voting poll with multiple options. Users can vote by clicking buttons, and votes are anonymous.', inline: false },
          { name: 'Parameters', value: '• `title` - The poll title (required)\n• `options` - Poll options separated by semicolons (required, 2-10 options)\n• `description` - Optional poll description\n• `expires_hours` - Optional hours until poll expires', inline: false },
          { name: 'Examples', value: '• `/poll title:"Best Game?" options:"Minecraft;Terraria;Stardew Valley"`\n• `/poll title:"Server Theme" options:"Medieval;Modern;Sci-Fi" description:"Choose the server theme" expires_hours:24`', inline: false },
          { name: 'Note', value: 'Votes are anonymous. Users can change their vote by clicking a different option button.', inline: false }
        )
        .setTimestamp()
    
    case 'f1':
      return new EmbedBuilder()
        .setTitle('Help: F1 Command')
        .setDescription('Get Formula 1 race information and data.')
        .setColor(0x5865f2)
        .addFields(
          { name: 'Usage', value: '`/f1 [subcommand]`', inline: false },
          { name: 'Subcommands', value: '• `positions` - Get current race positions\n• `starting-grid` - Get the starting grid for the race\n• `race-info` - Get current race information\n• `leader` - Get who is currently in the lead\n• `standings` - Get current drivers championship standings', inline: false },
          { name: 'Examples', value: '• `/f1 positions` - Shows current race positions\n• `/f1 leader` - Shows who is in the lead\n• `/f1 starting-grid` - Shows starting grid\n• `/f1 race-info` - Shows race information\n• `/f1 standings` - Shows drivers championship standings', inline: false },
          { name: 'Note', value: 'Data is fetched from OpenF1 API in real-time. Some data may not be available if there is no active session.', inline: false }
        )
        .setTimestamp()
    
    case 'help':
      return new EmbedBuilder()
        .setTitle('Help: Help Command')
        .setDescription('Get help and documentation for KaasBot commands.')
        .setColor(0x5865f2)
        .addFields(
          { name: 'Usage', value: '`!help [command]` or `/help [command:command]`', inline: false },
          { name: 'Description', value: 'Shows general help or detailed help for a specific command.', inline: false },
          { name: 'Examples', value: '• `!help` - Shows general help\n• `!help model` - Shows detailed help for the model command\n• `/help command:dice` - Shows detailed help for the dice command', inline: false },
          { name: 'Available Commands', value: '`ping`, `dice`, `model`, `personality`, `poll`, `steam`, `f1`, `help`', inline: false },
          { name: 'Full Documentation', value: `[Click here for full documentation](${helpUrl})`, inline: false }
        )
        .setTimestamp()
    
    default:
      return new EmbedBuilder()
        .setTitle('Command Not Found')
        .setDescription(`No help available for command: \`${commandName}\``)
        .setColor(0xff0000)
        .addFields(
          { name: 'Available Commands', value: '`ping`, `dice`, `model`, `personality`, `poll`, `steam`, `f1`, `help`', inline: false },
          { name: 'Usage', value: 'Use `!help [command]` or `/help command:[command]` to get help for a specific command.', inline: false }
        )
        .setTimestamp()
  }
}

// Global storage for selection messages
declare global {
  var modelSelectionMessages: Map<string, {
    type: 'model'
    guildId: string
    channelId: string
    options: string[]
    userId: string
  }> | undefined
  var personalitySelectionMessages: Map<string, {
    type: 'personality'
    guildId: string
    channelId: string
    options: string[]
    emojis: string[]
    userId: string
  }> | undefined
}

export async function initializeBot() {
  const token = await botConfigRepository.get('discord_bot_token')

  if (!token) {
    console.warn('Discord bot token not found in database. Bot will not start.')
    return
  }

  // If bot is already initialized and logged in, don't re-initialize
  if (botClient && botClient.isReady()) {
    console.log('Bot is already initialized and ready')
    return
  }

  // Destroy existing client if it exists but isn't ready
  if (botClient) {
    console.log('Destroying existing bot client...')
    botClient.destroy()
    botClient = null
  }

  console.log('Initializing Discord bot...')
  botClient = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessageReactions,
    ],
  })

  botClient.once('ready', async () => {
    console.log(`Discord bot logged in as ${botClient?.user?.tag}`)
    
    // Register slash commands
    if (botClient) {
      try {
        await registerSlashCommands(botClient, token)
      } catch (error) {
        console.error('Error registering slash commands:', error)
      }
    }
  })

  botClient.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return

    // Check auto moderator first
    if (message.guildId) {
      try {
        const wasModerated = await autoModeratorService.checkMessage(message)
        if (wasModerated) {
          return // Message was moderated, don't process further
        }
      } catch (error) {
        console.error('Error checking auto moderator:', error)
      }

      // Award XP for message (leveling system)
      try {
        await levelingService.awardXPForMessage(message.guildId, message.author.id, message)
      } catch (error) {
        console.error('Error awarding XP for message:', error)
      }
    }

    // Example: respond to !ping
    if (message.content === '!ping') {
      message.reply('Pong!')
      return
    }

    // Handle !help command
    if (message.content.toLowerCase().startsWith('!help')) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
      
      // Parse command argument (e.g., !help model)
      const parts = message.content.toLowerCase().split(/\s+/)
      const commandArg = parts.length > 1 ? parts[1] : null
      
      const embed = getCommandHelp(commandArg, frontendUrl)
      await message.reply({ embeds: [embed] })
      return
    }

    // Handle !dice command
    if (message.content.toLowerCase() === '!dice') {
      try {
        await diceGameService.startGame(
          message.author.id,
          message.guildId!,
          message.channelId
        )
      } catch (error: any) {
        message.reply(`❌ ${error.message}`)
      }
      return
    }

    // Handle !convert command
    if (message.content.toLowerCase() === '!convert') {
      if (!message.guildId) {
        message.reply('❌ This command only works in servers.')
        return
      }

      try {
        const { exchangeRateDiscordService } = await import('../services/exchangeRateDiscordService.js')
        const { exchangeRateRepository } = await import('../database/exchangeRateRepository.js')
        
        const config = await exchangeRateRepository.getConfig(message.guildId)
        if (!config || !config.enabled) {
          message.reply('❌ Exchange rate commands are not enabled for this server.')
          return
        }

        if (config.channelId && config.channelId !== message.channelId) {
          message.reply(`❌ Exchange rate commands can only be used in <#${config.channelId}>`)
          return
        }

        // Create interactive interface with select menus
        const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = await import('discord.js')
        
        const currencies = [
          { code: 'USD', name: 'US Dollar' },
          { code: 'EUR', name: 'Euro' },
          { code: 'GBP', name: 'British Pound' },
          { code: 'JPY', name: 'Japanese Yen' },
          { code: 'AUD', name: 'Australian Dollar' },
          { code: 'CAD', name: 'Canadian Dollar' },
          { code: 'CHF', name: 'Swiss Franc' },
          { code: 'CNY', name: 'Chinese Yuan' },
          { code: 'INR', name: 'Indian Rupee' },
          { code: 'BRL', name: 'Brazilian Real' },
          { code: 'ZAR', name: 'South African Rand' },
          { code: 'MXN', name: 'Mexican Peso' },
          { code: 'SGD', name: 'Singapore Dollar' },
          { code: 'HKD', name: 'Hong Kong Dollar' },
          { code: 'NZD', name: 'New Zealand Dollar' },
          { code: 'KRW', name: 'South Korean Won' },
          { code: 'TRY', name: 'Turkish Lira' },
          { code: 'RUB', name: 'Russian Ruble' },
          { code: 'NOK', name: 'Norwegian Krone' },
          { code: 'SEK', name: 'Swedish Krona' },
          { code: 'DKK', name: 'Danish Krone' },
          { code: 'PLN', name: 'Polish Zloty' },
          { code: 'THB', name: 'Thai Baht' },
        ]

        const fromOptions = currencies.slice(0, 25).map(currency => 
          new StringSelectMenuOptionBuilder()
            .setLabel(`${currency.code} - ${currency.name}`)
            .setValue(currency.code)
        )

        const toOptions = currencies.slice(0, 25).map(currency => 
          new StringSelectMenuOptionBuilder()
            .setLabel(`${currency.code} - ${currency.name}`)
            .setValue(currency.code)
        )

        const fromSelect = new StringSelectMenuBuilder()
          .setCustomId(`convert_from_${message.author.id}`)
          .setPlaceholder('Select currency to convert from...')
          .addOptions(fromOptions)

        const toSelect = new StringSelectMenuBuilder()
          .setCustomId(`convert_to_${message.author.id}`)
          .setPlaceholder('Select currency to convert to...')
          .addOptions(toOptions)

        const embed = new EmbedBuilder()
          .setTitle('💱 Currency Converter')
          .setDescription('Select the currencies you want to convert between, then enter the amount when prompted.')
          .setColor(0x4caf50)

        const row1 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(fromSelect)
        const row2 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(toSelect)

        const reply = await message.reply({
          embeds: [embed],
          components: [row1, row2],
        })

        // Store conversion state
        await exchangeRateDiscordService.startConversion(
          message.author.id,
          message.guildId!,
          message.channelId,
          reply.id
        )
      } catch (error: any) {
        console.error('Error handling !convert command:', error)
        message.reply(`❌ ${error.message || 'Failed to start currency converter'}`)
      }
      return
    }

    // Handle !meme command
    if (message.content.toLowerCase() === '!meme') {
      try {
        await memeService.handleMemeCommand(message)
      } catch (error: any) {
        console.error('Error handling !meme command:', error)
      }
      return
    }

    // Handle !model command
    if (message.content.toLowerCase() === '!model') {
      if (!message.guildId) {
        await message.reply('❌ This command only works in servers.')
        return
      }

      try {
        // Get provider and provider URL from config
        const provider = await botConfigRepository.get('ai_provider') || 'ollama'
        const providerUrl = await botConfigRepository.get('ai_provider_url') || 'http://localhost:11434'
        
        if (provider !== 'ollama') {
          await message.reply('❌ Model switching is only available for Ollama provider.')
          return
        }

        // Fetch available models from Ollama
        let models: string[] = []
        try {
          const response = await fetch(`${providerUrl}/api/tags`)
          if (response.ok) {
            const data = (await response.json()) as { models: Array<{ name: string }> }
            models = data.models?.map((m) => m.name) || []
          }
        } catch (error) {
          console.error('Error fetching Ollama models:', error)
        }

        if (models.length === 0) {
          await message.reply('❌ Could not fetch models from Ollama. Make sure Ollama is running.')
          return
        }

        // Limit to 25 models (Discord select menu limit)
        const displayModels = models.slice(0, 25)

        // Get current model for this channel
        let currentModel = 'default'
        try {
          const guildConfig = await aiConfigRepository.get(message.guildId)
          if (guildConfig?.channelConfigs && message.channel.id in guildConfig.channelConfigs) {
            currentModel = guildConfig.channelConfigs[message.channel.id].model || 'default'
          }
        } catch (error) {
          console.error('Error getting current model:', error)
        }

        // Build select menu options
        const options = displayModels.map((model) => {
          const option = new StringSelectMenuOptionBuilder()
            .setLabel(model)
            .setValue(model)
          
          if (model === currentModel) {
            option.setDescription('Current model')
            option.setDefault(true)
          }
          
          return option
        })

        // Build select menu with userId encoded in customId
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`model_select_${message.author.id}`)
          .setPlaceholder('Select a model...')
          .addOptions(options)

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)

        const embed = new EmbedBuilder()
          .setTitle('Select a model')
          .setDescription('Choose a model from the dropdown below:')
          .setColor(0x5865f2)

        await message.reply({
          embeds: [embed],
          components: [row],
        })
      } catch (error: any) {
        console.error('Error handling !model command:', error)
        await message.reply(`❌ Error: ${error.message}`)
      }
      return
    }

    // Handle !personality command
    if (message.content.toLowerCase() === '!personality') {
      if (!message.guildId) {
        await message.reply('❌ This command only works in servers.')
        return
      }

      try {
        const personalities: Array<{ name: string; emoji: string }> = [
          { name: 'normal', emoji: '😐' },
          { name: 'rude', emoji: '😈' },
          { name: 'professional', emoji: '💼' },
          { name: 'friendly', emoji: '😊' },
          { name: 'sarcastic', emoji: '😏' },
        ]

        // Get current personality for this channel
        let currentPersonality = 'default'
        try {
          const guildConfig = await aiConfigRepository.get(message.guildId)
          if (guildConfig?.channelConfigs && message.channel.id in guildConfig.channelConfigs) {
            currentPersonality = guildConfig.channelConfigs[message.channel.id].personality || 'default'
          }
        } catch (error) {
          console.error('Error getting current personality:', error)
        }

        // Build select menu options
        const options = personalities.map((personality) => {
          const option = new StringSelectMenuOptionBuilder()
            .setLabel(personality.name.charAt(0).toUpperCase() + personality.name.slice(1))
            .setValue(personality.name)
            .setDescription(`${personality.emoji} ${personality.name} personality`)
          
          if (personality.name === currentPersonality) {
            option.setDefault(true)
          }
          
          return option
        })

        // Build select menu with userId encoded in customId
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`personality_select_${message.author.id}`)
          .setPlaceholder('Select a personality...')
          .addOptions(options)

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)

        const embed = new EmbedBuilder()
          .setTitle('Select a personality')
          .setDescription('Choose a personality from the dropdown below:')
          .setColor(0x5865f2)

        await message.reply({
          embeds: [embed],
          components: [row],
        })
      } catch (error: any) {
        console.error('Error handling !personality command:', error)
        await message.reply(`❌ Error: ${error.message}`)
      }
      return
    }

    // Handle AI messages (when bot is mentioned, replied to, or in configured channel)
    if (!botClient || !botClient.user) return
    
    // Explicitly prevent bot from responding to itself
    if (message.author.id === botClient.user.id) {
      return
    }
    
    // Check if this channel is configured for auto-responses
    const aiResponseChannelIdsJson = await botConfigRepository.get('ai_response_channel_ids')
    let aiResponseChannelIds: string[] = []
    
    if (aiResponseChannelIdsJson) {
      try {
        aiResponseChannelIds = JSON.parse(aiResponseChannelIdsJson)
      } catch {
        // Backward compatibility: try old single channel format
        const oldChannelId = await botConfigRepository.get('ai_response_channel_id')
        if (oldChannelId) {
          aiResponseChannelIds = [oldChannelId]
        }
      }
    } else {
      // Backward compatibility: check for old single channel format
      const oldChannelId = await botConfigRepository.get('ai_response_channel_id')
      if (oldChannelId) {
        aiResponseChannelIds = [oldChannelId]
      }
    }
    
    const isInResponseChannel = aiResponseChannelIds.length > 0 && aiResponseChannelIds.includes(String(message.channel.id))
    
    // Debug logging for response channels
    if (aiResponseChannelIds.length > 0) {
      console.log(`[AI] Response channels configured: ${aiResponseChannelIds.length} channel(s), Current channel: ${message.channel.id}, Match: ${isInResponseChannel}`)
    }
    
    const isMentioned = message.mentions.has(botClient.user.id)
    const isReply = message.reference && message.reference.messageId
    const shouldHandleAI = isMentioned || isReply || isInResponseChannel

    if (shouldHandleAI) {
      // Skip AI processing if message starts with "!" (it's a command)
      // Check the original message content before removing mentions to catch all cases
      const originalContent = message.content.trim()
      if (originalContent.startsWith('!')) {
        console.log('[AI] Skipping AI response - message starts with "!" (command)')
        return
      }

      try {
        // Check if AI is enabled
        const aiEnabled = await aiService.isEnabled()
        if (!aiEnabled) {
          console.log('AI is disabled, skipping message')
          return
        }

        console.log(`[AI] Processing message from ${message.author.tag} in ${message.guild?.name || 'DM'}`)

        // Show typing indicator
        await message.channel.sendTyping()

        // Get conversation history if this is a reply
        let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
        if (isReply && message.reference?.messageId && botClient && botClient.user) {
          try {
            const repliedMessage = await message.channel.messages.fetch(message.reference.messageId)
            const botUserId = botClient.user.id
            if (repliedMessage.author.id === botUserId) {
              // Get previous messages for context (limited to last 5 messages)
              const messages = await message.channel.messages.fetch({ limit: 10 })
              const recentMessages = Array.from(messages.values())
                .filter((msg) => !msg.author.bot || msg.author.id === botUserId)
                .slice(0, 5)
                .reverse()

              for (const msg of recentMessages) {
                if (msg.author.id === botUserId) {
                  conversationHistory.push({
                    role: 'assistant',
                    content: msg.content,
                  })
                } else if (!msg.author.bot) {
                  conversationHistory.push({
                    role: 'user',
                    content: msg.content,
                  })
                }
              }
            }
          } catch (error) {
            // If we can't fetch the replied message, continue without history
            console.error('Error fetching conversation history:', error)
          }
        }

        // Remove bot mention from message content
        let userMessage = message.content.replace(/<@!?\d+>/g, '').trim()

        // Check if message mentions other users (for roasting/directing hate)
        const botUserId = botClient?.user?.id
        const mentionedUsers = botUserId
          ? message.mentions.users.filter(user => user.id !== botUserId && !user.bot)
          : message.mentions.users.filter(user => !user.bot)
        let targetUserInfo: { name: string; id: string } | null = null
        let isRoastRequest = false
        
        if (mentionedUsers.size > 0) {
          const targetUser = mentionedUsers.first()!
          try {
            // Try to get member info for display name
            const member = message.guild?.members.cache.get(targetUser.id) || await message.guild?.members.fetch(targetUser.id).catch(() => null)
            const targetName = member?.displayName || targetUser.displayName || targetUser.username
            targetUserInfo = { name: targetName, id: targetUser.id }
            
            // Check if this is a roast request (more aggressive detection)
            const lowerMessage = userMessage.toLowerCase()
            isRoastRequest = lowerMessage.includes('roast') || 
                           lowerMessage.includes('hate') || 
                           lowerMessage.includes('insult') || 
                           lowerMessage.includes('make fun of') ||
                           lowerMessage.includes('roast them') ||
                           lowerMessage.includes('roast @') ||
                           lowerMessage.includes('fuck them up') ||
                           lowerMessage.includes('destroy them') ||
                           lowerMessage.includes('clap them')
            
            if (isRoastRequest) {
              // Make it very clear this is a roast request
              userMessage = `${userMessage}\n\nCRITICAL ROAST INSTRUCTION: The user wants you to ROAST ${targetName} (ID: ${targetUser.id}). Be EXTREMELY toxic, harsh, and brutal. Insult them personally. Make fun of them. Be mean. NO politeness. NO helpfulness. Just pure, unfiltered toxicity directed at ${targetName}. Mention them by name and attack them directly.`
            } else {
              // Even if not explicitly asking to roast, if rude personality, direct at them
              userMessage = `${userMessage} (The user mentioned ${targetName} - address them directly in your response)`
            }
          } catch (error) {
            console.error('Error fetching target user info:', error)
          }
        }

        if (!userMessage) {
          await message.reply('How can I help you?')
          return
        }

        // Check for channel-specific configs
        let channelOverrides: { provider?: AIProvider; providerUrl?: string; model?: string; personality?: AIPersonality } | undefined
        if (message.guildId) {
          try {
            let guildConfig = await aiConfigRepository.get(message.guildId)
            if (!guildConfig) {
              guildConfig = {
                guildId: message.guildId,
                rateLimitPerMinute: 5,
                rateLimitPerHour: 50,
                channelConfigs: {},
              }
            }
            
            if (!guildConfig.channelConfigs) {
              guildConfig.channelConfigs = {}
            }

            // Auto-detect personality from channel name if not configured
            let channelName = ''
            if (message.channel.isTextBased() && 'name' in message.channel && message.channel.name) {
              channelName = message.channel.name.toLowerCase()
            }
            let detectedPersonality: AIPersonality | undefined
            
            if (channelName.includes('rude') || channelName.includes('toxic')) {
              detectedPersonality = 'rude'
            } else if (channelName.includes('professional') || channelName.includes('business')) {
              detectedPersonality = 'professional'
            } else if (channelName.includes('friendly') || channelName.includes('nice')) {
              detectedPersonality = 'friendly'
            } else if (channelName.includes('sarcastic') || channelName.includes('sarcasm')) {
              detectedPersonality = 'sarcastic'
            } else if (channelName.includes('normal') || channelName.includes('ai-normal')) {
              detectedPersonality = 'normal'
            }

            // If channel config doesn't exist or doesn't have personality, and we detected one, set it
            if (detectedPersonality && (!guildConfig.channelConfigs[message.channel.id] || !guildConfig.channelConfigs[message.channel.id].personality)) {
              if (!guildConfig.channelConfigs[message.channel.id]) {
                guildConfig.channelConfigs[message.channel.id] = {}
              }
              guildConfig.channelConfigs[message.channel.id].personality = detectedPersonality
              await aiConfigRepository.set(guildConfig)
              console.log(`[AI] Auto-configured personality "${detectedPersonality}" for channel "${channelName}" (${message.channel.id})`)
            }

            // Now get the channel config (which may have been just auto-configured)
            if (guildConfig.channelConfigs && message.channel.id in guildConfig.channelConfigs) {
              const channelConfig = guildConfig.channelConfigs[message.channel.id]
              channelOverrides = {
                provider: channelConfig.provider as AIProvider | undefined,
                providerUrl: channelConfig.providerUrl,
                model: channelConfig.model,
                personality: channelConfig.personality as AIPersonality | undefined,
              }
              console.log(`[AI] Using channel-specific config for ${message.channel.id}:`, channelOverrides)
            }
          } catch (error) {
            console.error('Error getting channel config:', error)
          }
        }

        // Get AI response with learning context
        console.log(`[AI] Getting response from AI service...`)
        const userName = message.member?.displayName || message.author.displayName || message.author.username
        let aiResponse = await aiService.getChatCompletion(
          userMessage, 
          conversationHistory, 
          channelOverrides,
          message.guildId ?? undefined,
          message.author.id,
          userName,
          targetUserInfo
        )
        console.log(`[AI] Received response (${aiResponse.length} chars), sending reply...`)

        // If this is a roast request and we have a target user, prepend the mention
        if (isRoastRequest && targetUserInfo) {
          // Ensure the response mentions the user at the start
          const mention = `<@${targetUserInfo.id}>`
          if (!aiResponse.includes(mention) && !aiResponse.startsWith(mention)) {
            aiResponse = `${mention} ${aiResponse}`
          }
        } else if (targetUserInfo && !aiResponse.includes(`<@${targetUserInfo.id}>`)) {
          // Even if not a roast, if they mentioned someone, mention them in response
          aiResponse = `<@${targetUserInfo.id}> ${aiResponse}`
        }

        // Reply to the message
        await message.reply(aiResponse)
        console.log(`[AI] Successfully replied to message`)
      } catch (error: any) {
        console.error('[AI ERROR] Error handling AI message:', error)
        console.error('[AI ERROR] Stack:', error.stack)
        console.error('[AI ERROR] Error name:', error.name)
        console.error('[AI ERROR] Error message:', error.message)
        
        // Log error to Discord webhook
        const userMessage = message.content.replace(/<@!?\d+>/g, '').trim()
        await errorLogger.logError(error, {
          'Error Type': 'Discord Bot AI Error',
          'Guild ID': message.guildId || 'DM',
          'Channel ID': message.channel.id,
          'User ID': message.author.id,
          'User Message': userMessage ? userMessage.substring(0, 200) : 'Empty message',
          'Error Name': error.name,
          'Error Code': error.code,
        }).catch((logError) => {
          console.error('[AI ERROR] Failed to log to webhook:', logError)
        })
        
        try {
          const errorMsg = error.message || 'Unknown error'
          console.log(`[AI ERROR] Attempting to send error message to user: ${errorMsg}`)
          await message.reply(`Sorry, I encountered an error: ${errorMsg}`)
          console.log(`[AI ERROR] Error message sent to user`)
        } catch (replyError: any) {
          console.error('[AI ERROR] Failed to send error message to user:', replyError)
          console.error('[AI ERROR] Reply error stack:', replyError.stack)
        }
      }
    }

    // Handle auto-delete for meme channel (after all command processing)
    if (message.guildId) {
      try {
        await memeService.handleMessageDelete(message)
      } catch (error) {
        // Ignore errors
      }
    }
  })

  // Handle interactions (slash commands, buttons, and select menus)
  botClient.on('interactionCreate', async (interaction) => {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      await handleSlashCommand(interaction)
      return
    }

    // Handle modal submissions
    if (interaction.isModalSubmit()) {
      try {
        if (interaction.customId.startsWith('convert_amount_')) {
          const parts = interaction.customId.replace('convert_amount_', '').split('_')
          if (parts.length !== 2) {
            await interaction.reply({
              content: '❌ Invalid conversion request. Please use `!convert` again.',
              ephemeral: true,
            })
            return
          }

          const fromCurrency = parts[0]
          const toCurrency = parts[1]
          const amountStr = interaction.fields.getTextInputValue('amount_input')
          const amount = parseFloat(amountStr)

          if (isNaN(amount) || amount <= 0) {
            await interaction.reply({
              content: '❌ Please enter a valid amount greater than 0.',
              ephemeral: true,
            })
            return
          }

          if (!interaction.guildId) {
            await interaction.reply({ content: '❌ This command only works in servers.', ephemeral: true })
            return
          }

          await interaction.deferReply({ ephemeral: true })

          try {
            await exchangeRateDiscordService.convertCurrency(
              interaction.user.id,
              interaction.guildId,
              interaction.channelId!,
              amount,
              fromCurrency,
              toCurrency
            )

            await interaction.editReply({ content: '✅ Currency conversion sent to channel!' })
          } catch (error: any) {
            await interaction.editReply({ content: `❌ ${error.message}` })
          }
        }
      } catch (error: any) {
        console.error('Error handling modal submission:', error)
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply({ content: `❌ Error: ${error.message}` })
        } else {
          await interaction.reply({ content: `❌ Error: ${error.message}`, ephemeral: true })
        }
      }
      return
    }

    // Handle select menu interactions
    if (interaction.isStringSelectMenu()) {
      const selectMenuInteraction = interaction as StringSelectMenuInteraction
      
      try {
        if (selectMenuInteraction.customId.startsWith('model_select_')) {
          // Extract userId from customId
          const requestedUserId = selectMenuInteraction.customId.replace('model_select_', '')
          
          // Only allow the user who requested the selection to change it
          if (selectMenuInteraction.user.id !== requestedUserId) {
            await selectMenuInteraction.reply({
              content: '❌ Only the user who requested this selection can change the model.',
              ephemeral: true,
            })
            return
          }

          if (!selectMenuInteraction.guildId) {
            await selectMenuInteraction.reply({ content: '❌ This command only works in servers.', ephemeral: true })
            return
          }

          const selectedModel = selectMenuInteraction.values[0]
          const guildId = selectMenuInteraction.guildId
          const channelId = selectMenuInteraction.channelId

          if (!channelId) {
            await selectMenuInteraction.reply({
              content: '❌ Could not determine channel. Please try again.',
              ephemeral: true,
            })
            return
          }

          // Update channel config
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
            
            if (!guildConfig.channelConfigs[channelId]) {
              guildConfig.channelConfigs[channelId] = {}
            }
            
            guildConfig.channelConfigs[channelId].model = selectedModel
            
            await aiConfigRepository.set(guildConfig)
            
            await selectMenuInteraction.reply({
              content: `✅ Model changed to **${selectedModel}** for this channel.`,
              ephemeral: true,
            })
          } catch (error) {
            console.error('Error updating model:', error)
            await selectMenuInteraction.reply({
              content: '❌ Failed to update model. Please try again.',
              ephemeral: true,
            })
          }
        } else if (selectMenuInteraction.customId.startsWith('convert_from_')) {
          const requestedUserId = selectMenuInteraction.customId.replace('convert_from_', '')
          
          if (selectMenuInteraction.user.id !== requestedUserId) {
            await selectMenuInteraction.reply({
              content: '❌ Only the user who started this conversion can select currencies.',
              ephemeral: true,
            })
            return
          }

          if (!selectMenuInteraction.guildId) {
            await selectMenuInteraction.reply({ content: '❌ This command only works in servers.', ephemeral: true })
            return
          }

          const fromCurrency = selectMenuInteraction.values[0]
          const state = await exchangeRateDiscordService.setFromCurrency(
            selectMenuInteraction.user.id,
            selectMenuInteraction.guildId,
            fromCurrency
          )

          if (!state) {
            await selectMenuInteraction.reply({
              content: '❌ Conversion session expired. Please use `!convert` again.',
              ephemeral: true,
            })
            return
          }

          await selectMenuInteraction.deferUpdate()

          // If both currencies are selected, show modal for amount
          if (state.fromCurrency && state.toCurrency) {
            const modal = exchangeRateDiscordService.createAmountModal(state.fromCurrency, state.toCurrency)
            await selectMenuInteraction.showModal(modal)
          } else {
            // Update the message to show selected currency
            const client = getBotClient()!
            const channel = await client.channels.fetch(selectMenuInteraction.channelId!) as TextChannel
            const originalMessage = await channel.messages.fetch(selectMenuInteraction.message!.id)
            
            const updatedEmbed = EmbedBuilder.from(originalMessage.embeds[0])
              .setDescription(`**From:** ${fromCurrency}\n**To:** ${state.toCurrency || 'Not selected'}\n\nSelect the remaining currency, then enter the amount.`)

            await originalMessage.edit({
              embeds: [updatedEmbed],
              components: originalMessage.components,
            })
          }
        } else if (selectMenuInteraction.customId.startsWith('convert_to_')) {
          const requestedUserId = selectMenuInteraction.customId.replace('convert_to_', '')
          
          if (selectMenuInteraction.user.id !== requestedUserId) {
            await selectMenuInteraction.reply({
              content: '❌ Only the user who started this conversion can select currencies.',
              ephemeral: true,
            })
            return
          }

          if (!selectMenuInteraction.guildId) {
            await selectMenuInteraction.reply({ content: '❌ This command only works in servers.', ephemeral: true })
            return
          }

          const toCurrency = selectMenuInteraction.values[0]
          const state = await exchangeRateDiscordService.setToCurrency(
            selectMenuInteraction.user.id,
            selectMenuInteraction.guildId,
            toCurrency
          )

          if (!state) {
            await selectMenuInteraction.reply({
              content: '❌ Conversion session expired. Please use `!convert` again.',
              ephemeral: true,
            })
            return
          }

          await selectMenuInteraction.deferUpdate()

          // If both currencies are selected, show modal for amount
          if (state.fromCurrency && state.toCurrency) {
            const modal = exchangeRateDiscordService.createAmountModal(state.fromCurrency, state.toCurrency)
            await selectMenuInteraction.showModal(modal)
          } else {
            // Update the message to show selected currency
            const client = getBotClient()!
            const channel = await client.channels.fetch(selectMenuInteraction.channelId!) as TextChannel
            const originalMessage = await channel.messages.fetch(selectMenuInteraction.message!.id)
            
            const updatedEmbed = EmbedBuilder.from(originalMessage.embeds[0])
              .setDescription(`**From:** ${state.fromCurrency || 'Not selected'}\n**To:** ${toCurrency}\n\nSelect the remaining currency, then enter the amount.`)

            await originalMessage.edit({
              embeds: [updatedEmbed],
              components: originalMessage.components,
            })
          }
        } else if (selectMenuInteraction.customId.startsWith('personality_select_')) {
          // Extract userId from customId
          const requestedUserId = selectMenuInteraction.customId.replace('personality_select_', '')
          
          // Only allow the user who requested the selection to change it
          if (selectMenuInteraction.user.id !== requestedUserId) {
            await selectMenuInteraction.reply({
              content: '❌ Only the user who requested this selection can change the personality.',
              ephemeral: true,
            })
            return
          }

          if (!selectMenuInteraction.guildId) {
            await selectMenuInteraction.reply({ content: '❌ This command only works in servers.', ephemeral: true })
            return
          }

          const selectedPersonality = selectMenuInteraction.values[0]
          const guildId = selectMenuInteraction.guildId
          const channelId = selectMenuInteraction.channelId

          if (!channelId) {
            await selectMenuInteraction.reply({
              content: '❌ Could not determine channel. Please try again.',
              ephemeral: true,
            })
            return
          }

          // Update channel config
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
            
            if (!guildConfig.channelConfigs[channelId]) {
              guildConfig.channelConfigs[channelId] = {}
            }
            
            guildConfig.channelConfigs[channelId].personality = selectedPersonality as AIPersonality
            
            await aiConfigRepository.set(guildConfig)
            
            await selectMenuInteraction.reply({
              content: `✅ Personality changed to **${selectedPersonality}** for this channel.`,
              ephemeral: true,
            })
          } catch (error) {
            console.error('Error updating personality:', error)
            await selectMenuInteraction.reply({
              content: '❌ Failed to update personality. Please try again.',
              ephemeral: true,
            })
          }
        }
      } catch (error) {
        console.error('Error handling select menu interaction:', error)
        if (selectMenuInteraction.deferred || selectMenuInteraction.replied) {
          await selectMenuInteraction.editReply({
            content: 'An error occurred while processing your request.',
          })
        } else {
          await selectMenuInteraction.reply({
            content: 'An error occurred while processing your request.',
            ephemeral: true,
          })
        }
      }
      return
    }

    // Handle button interactions
    if (interaction.type !== InteractionType.MessageComponent) return
    if (!interaction.isButton()) return

    const buttonInteraction = interaction as ButtonInteraction

    try {
      if (buttonInteraction.customId === 'create_ticket') {
        await buttonInteraction.deferReply({ ephemeral: true })

        const userId = buttonInteraction.user.id
        const guildId = buttonInteraction.guildId!

        try {
          const ticketId = await ticketService.createTicket(userId, guildId)
          await buttonInteraction.editReply({
            content: `Ticket created! <#${ticketId}>`,
          })
        } catch (error: any) {
          await buttonInteraction.editReply({
            content: `Error: ${error.message}`,
          })
        }
      } else if (buttonInteraction.customId === 'close_ticket') {
        await buttonInteraction.deferReply({ ephemeral: true })

        const userId = buttonInteraction.user.id
        const channelId = buttonInteraction.channelId
        const guildId = buttonInteraction.guildId!

        try {
          await ticketService.closeTicket(channelId, userId)
          await buttonInteraction.editReply({
            content: 'Ticket closed successfully!',
          })
        } catch (error: any) {
          await buttonInteraction.editReply({
            content: `Error: ${error.message}`,
          })
        }
      } else if (buttonInteraction.customId === 'dice_user_first') {
        try {
          await diceGameService.handleFirstChoice(buttonInteraction, 'user')
        } catch (error: any) {
          await buttonInteraction.reply({
            content: `Error: ${error.message}`,
            ephemeral: true,
          })
        }
      } else if (buttonInteraction.customId === 'dice_bot_first') {
        try {
          await diceGameService.handleFirstChoice(buttonInteraction, 'bot')
        } catch (error: any) {
          await buttonInteraction.reply({
            content: `Error: ${error.message}`,
            ephemeral: true,
          })
        }
      } else if (buttonInteraction.customId === 'dice_roll') {
        try {
          await diceGameService.handleRoll(buttonInteraction)
        } catch (error: any) {
          await buttonInteraction.reply({
            content: `Error: ${error.message}`,
            ephemeral: true,
          })
        }
      } else if (buttonInteraction.customId.startsWith('vote_')) {
        try {
          await buttonInteraction.deferReply({ ephemeral: true })
          
          const parts = buttonInteraction.customId.split('_')
          if (parts.length !== 3) {
            await buttonInteraction.editReply({ content: 'Invalid vote button' })
            return
          }

          const pollId = parts[1]
          const optionIndex = parseInt(parts[2], 10)

          if (!buttonInteraction.guildId) {
            await buttonInteraction.editReply({ content: 'This command only works in servers.' })
            return
          }

          await votingService.handleVote(pollId, buttonInteraction.user.id, optionIndex)
          await buttonInteraction.editReply({ content: 'Vote recorded! (Anonymous)' })
        } catch (error: any) {
          await buttonInteraction.editReply({ content: `Error: ${error.message}` })
        }
      }
    } catch (error) {
      console.error('Error handling button interaction:', error)
      if (buttonInteraction.deferred || buttonInteraction.replied) {
        await buttonInteraction.editReply({
          content: 'An error occurred while processing your request.',
        })
      } else {
        await buttonInteraction.reply({
          content: 'An error occurred while processing your request.',
          ephemeral: true,
        })
      }
    }
  })

  // Handle reaction add for auto roles
  botClient.on('messageReactionAdd', async (reaction, user) => {
    try {
      // Fetch partial reactions
      if (reaction.partial) {
        await reaction.fetch()
      }
      if (user.partial) {
        await user.fetch()
      }

      // Ignore bot reactions
      if (user.bot) return

      const message = reaction.message
      const emoji = reaction.emoji.name || reaction.emoji.toString()

      // Model and personality selection are now handled via select menu interactions, not reactions

      // Handle AI training (thumbs up/down on bot messages)
      if (reaction.message.author?.id === botClient?.user?.id && reaction.message.guildId) {
        const isTrainingEnabled = await aiTrainingService.isTrainingEnabled(reaction.message.guildId)
        if (isTrainingEnabled) {
          const emoji = reaction.emoji.name || reaction.emoji.toString()
          
          // Thumbs up = good, thumbs down = bad
          const isGoodReaction = emoji === '👍' || emoji === '✅' || emoji === '❤️'
          const isBadReaction = emoji === '👎' || emoji === '❌' || emoji === '💔'
          
          if (isGoodReaction || isBadReaction) {
            // Find the original user message (reply context)
            let originalMessage = null
            if (reaction.message.reference?.messageId) {
              originalMessage = await reaction.message.channel.messages.fetch(reaction.message.reference.messageId).catch(() => null)
            }
            
            // If no reply, try to find the most recent user message before this bot message
            if (!originalMessage || originalMessage.author.bot) {
              try {
                const messages = await reaction.message.channel.messages.fetch({ limit: 10, before: reaction.message.id })
                const userMessages = Array.from(messages.values())
                  .filter(msg => !msg.author.bot && msg.createdTimestamp < reaction.message.createdTimestamp)
                  .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
                
                if (userMessages.length > 0) {
                  originalMessage = userMessages[0]
                }
              } catch (error) {
                console.error('Error fetching messages for training:', error)
              }
            }
            
            if (originalMessage && !originalMessage.author.bot && reaction.message.guildId) {
              const userMessageContent = originalMessage.content.replace(/<@!?\d+>/g, '').trim()
              const botResponseContent = reaction.message.content || ''
              if (userMessageContent && reaction.message.guildId && botResponseContent) {
                await aiTrainingService.recordTraining(
                  reaction.message.guildId,
                  userMessageContent,
                  botResponseContent,
                  isGoodReaction ? 'good' : 'bad',
                  user.id
                )
                console.log(`[AI Training] Recorded ${isGoodReaction ? 'good' : 'bad'} reaction from ${user.id} for message: "${userMessageContent.substring(0, 50)}..."`)
              }
            }
          }
        }
      }

      await autoRolesService.handleReactionAdd(
        reaction as MessageReaction,
        user as User
      )

      // Award XP for reaction (leveling system)
      if (reaction.message.guildId) {
        try {
          await levelingService.awardXPForReaction(
            reaction.message.guildId,
            user.id,
            reaction as MessageReaction
          )
        } catch (error) {
          console.error('Error awarding XP for reaction:', error)
        }
      }
    } catch (error) {
      console.error('Error handling reaction add:', error)
    }
  })

  // Handle reaction remove for auto roles
  botClient.on('messageReactionRemove', async (reaction, user) => {
    try {
      // Fetch partial reactions
      if (reaction.partial) {
        await reaction.fetch()
      }
      if (user.partial) {
        await user.fetch()
      }

      await autoRolesService.handleReactionRemove(
        reaction as MessageReaction,
        user as User
      )
    } catch (error) {
      console.error('Error handling reaction remove:', error)
    }
  })

  // Handle new member join for welcome messages
  botClient.on('guildMemberAdd', async (member) => {
    try {
      await welcomeMessageService.sendWelcomeMessage(member)
    } catch (error) {
      console.error('Error sending welcome message:', error)
    }
  })

  try {
    await botClient.login(token)
  } catch (error) {
    console.error('Failed to login Discord bot:', error)
    botClient = null
  }
}

// Register slash commands
async function registerSlashCommands(client: Client, token: string) {
  const commands = [
    new SlashCommandBuilder()
      .setName('help')
      .setDescription('Get help and documentation links')
      .addStringOption(option =>
        option
          .setName('command')
          .setDescription('Get help for a specific command')
          .setRequired(false)
          .addChoices(
            { name: 'ping', value: 'ping' },
            { name: 'dice', value: 'dice' },
            { name: 'model', value: 'model' },
            { name: 'personality', value: 'personality' },
            { name: 'steam', value: 'steam' },
            { name: 'poll', value: 'poll' },
            { name: 'f1', value: 'f1' },
            { name: 'help', value: 'help' }
          )
      ),
    new SlashCommandBuilder()
      .setName('ping')
      .setDescription('Check if the bot is online'),
    new SlashCommandBuilder()
      .setName('dice')
      .setDescription('Start a dice game'),
    new SlashCommandBuilder()
      .setName('model')
      .setDescription('Switch the Ollama model for this channel'),
    new SlashCommandBuilder()
      .setName('personality')
      .setDescription('Switch the AI personality for this channel'),
    new SlashCommandBuilder()
      .setName('steam')
      .setDescription('Steam integration commands')
      .addSubcommand(subcommand =>
        subcommand
          .setName('link')
          .setDescription('Link your Steam account')
          .addStringOption(option =>
            option
              .setName('steamid')
              .setDescription('Your Steam ID64 or vanity URL')
              .setRequired(true)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('profile')
          .setDescription('View your or someone else\'s Steam profile')
          .addUserOption(option =>
            option
              .setName('user')
              .setDescription('Discord user to view (leave empty for yourself)')
              .setRequired(false)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('games')
          .setDescription('View your or someone else\'s Steam games')
          .addUserOption(option =>
            option
              .setName('user')
              .setDescription('Discord user to view (leave empty for yourself)')
              .setRequired(false)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('recent')
          .setDescription('View recently played games')
          .addUserOption(option =>
            option
              .setName('user')
              .setDescription('Discord user to view (leave empty for yourself)')
              .setRequired(false)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('unlink')
          .setDescription('Unlink your Steam account')
      ),
    new SlashCommandBuilder()
      .setName('poll')
      .setDescription('Create an anonymous voting poll')
      .addStringOption(option =>
        option
          .setName('title')
          .setDescription('The poll title')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('options')
          .setDescription('Poll options separated by semicolons (e.g., "Option 1;Option 2;Option 3")')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('description')
          .setDescription('Optional poll description')
          .setRequired(false)
      )
      .addIntegerOption(option =>
        option
          .setName('expires_hours')
          .setDescription('Hours until poll expires (optional)')
          .setRequired(false)
      ),
    new SlashCommandBuilder()
      .setName('voice')
      .setDescription('Make the bot speak in a voice channel')
      .addChannelOption(option =>
        option
          .setName('channel')
          .setDescription('Voice channel to join')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('text')
          .setDescription('Text for the bot to say (supports emotion tags like <laugh>, <cry>)')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('language')
          .setDescription('Language code (default: en)')
          .setRequired(false)
      )
      .addStringOption(option =>
        option
          .setName('voice')
          .setDescription('Voice description (e.g., "Male voice, warm tone" or "Female, energetic")')
          .setRequired(false)
      ),
    new SlashCommandBuilder()
      .setName('f1')
      .setDescription('Get Formula 1 race information')
      .addSubcommand(subcommand =>
        subcommand
          .setName('positions')
          .setDescription('Get current race positions')
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('starting-grid')
          .setDescription('Get the starting grid for the race')
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('race-info')
          .setDescription('Get current race information')
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('leader')
          .setDescription('Get who is currently in the lead')
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('standings')
          .setDescription('Get current drivers championship standings')
      ),
    new SlashCommandBuilder()
      .setName('exchange-rate')
      .setDescription('Convert currencies and check exchange rates')
      .addSubcommand(subcommand =>
        subcommand
          .setName('convert')
          .setDescription('Convert an amount from one currency to another')
          .addNumberOption(option =>
            option
              .setName('amount')
              .setDescription('Amount to convert')
              .setRequired(true)
              .setMinValue(0.01)
          )
          .addStringOption(option =>
            option
              .setName('from')
              .setDescription('Currency to convert from')
              .setRequired(true)
              .addChoices(
                { name: 'USD - US Dollar', value: 'USD' },
                { name: 'EUR - Euro', value: 'EUR' },
                { name: 'GBP - British Pound', value: 'GBP' },
                { name: 'JPY - Japanese Yen', value: 'JPY' },
                { name: 'AUD - Australian Dollar', value: 'AUD' },
                { name: 'CAD - Canadian Dollar', value: 'CAD' },
                { name: 'CHF - Swiss Franc', value: 'CHF' },
                { name: 'CNY - Chinese Yuan', value: 'CNY' },
                { name: 'INR - Indian Rupee', value: 'INR' },
                { name: 'BRL - Brazilian Real', value: 'BRL' },
                { name: 'ZAR - South African Rand', value: 'ZAR' },
                { name: 'MXN - Mexican Peso', value: 'MXN' },
                { name: 'SGD - Singapore Dollar', value: 'SGD' },
                { name: 'HKD - Hong Kong Dollar', value: 'HKD' },
                { name: 'NZD - New Zealand Dollar', value: 'NZD' },
                { name: 'KRW - South Korean Won', value: 'KRW' },
                { name: 'TRY - Turkish Lira', value: 'TRY' },
                { name: 'RUB - Russian Ruble', value: 'RUB' },
                { name: 'NOK - Norwegian Krone', value: 'NOK' },
                { name: 'SEK - Swedish Krona', value: 'SEK' },
                { name: 'DKK - Danish Krone', value: 'DKK' },
                { name: 'PLN - Polish Zloty', value: 'PLN' },
                { name: 'THB - Thai Baht', value: 'THB' }
              )
          )
          .addStringOption(option =>
            option
              .setName('to')
              .setDescription('Currency to convert to')
              .setRequired(true)
              .addChoices(
                { name: 'USD - US Dollar', value: 'USD' },
                { name: 'EUR - Euro', value: 'EUR' },
                { name: 'GBP - British Pound', value: 'GBP' },
                { name: 'JPY - Japanese Yen', value: 'JPY' },
                { name: 'AUD - Australian Dollar', value: 'AUD' },
                { name: 'CAD - Canadian Dollar', value: 'CAD' },
                { name: 'CHF - Swiss Franc', value: 'CHF' },
                { name: 'CNY - Chinese Yuan', value: 'CNY' },
                { name: 'INR - Indian Rupee', value: 'INR' },
                { name: 'BRL - Brazilian Real', value: 'BRL' },
                { name: 'ZAR - South African Rand', value: 'ZAR' },
                { name: 'MXN - Mexican Peso', value: 'MXN' },
                { name: 'SGD - Singapore Dollar', value: 'SGD' },
                { name: 'HKD - Hong Kong Dollar', value: 'HKD' },
                { name: 'NZD - New Zealand Dollar', value: 'NZD' },
                { name: 'KRW - South Korean Won', value: 'KRW' },
                { name: 'TRY - Turkish Lira', value: 'TRY' },
                { name: 'RUB - Russian Ruble', value: 'RUB' },
                { name: 'NOK - Norwegian Krone', value: 'NOK' },
                { name: 'SEK - Swedish Krona', value: 'SEK' },
                { name: 'DKK - Danish Krone', value: 'DKK' },
                { name: 'PLN - Polish Zloty', value: 'PLN' },
                { name: 'THB - Thai Baht', value: 'THB' }
              )
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('rates')
          .setDescription('Get current exchange rates')
          .addStringOption(option =>
            option
              .setName('base')
              .setDescription('Base currency (default: USD)')
              .setRequired(false)
              .addChoices(
                { name: 'USD - US Dollar', value: 'USD' },
                { name: 'EUR - Euro', value: 'EUR' },
                { name: 'GBP - British Pound', value: 'GBP' },
                { name: 'JPY - Japanese Yen', value: 'JPY' },
                { name: 'AUD - Australian Dollar', value: 'AUD' },
                { name: 'CAD - Canadian Dollar', value: 'CAD' },
                { name: 'CHF - Swiss Franc', value: 'CHF' },
                { name: 'CNY - Chinese Yuan', value: 'CNY' },
                { name: 'INR - Indian Rupee', value: 'INR' },
                { name: 'BRL - Brazilian Real', value: 'BRL' },
                { name: 'ZAR - South African Rand', value: 'ZAR' },
                { name: 'MXN - Mexican Peso', value: 'MXN' },
                { name: 'SGD - Singapore Dollar', value: 'SGD' },
                { name: 'HKD - Hong Kong Dollar', value: 'HKD' },
                { name: 'NZD - New Zealand Dollar', value: 'NZD' },
                { name: 'KRW - South Korean Won', value: 'KRW' },
                { name: 'TRY - Turkish Lira', value: 'TRY' },
                { name: 'RUB - Russian Ruble', value: 'RUB' },
                { name: 'NOK - Norwegian Krone', value: 'NOK' },
                { name: 'SEK - Swedish Krona', value: 'SEK' },
                { name: 'DKK - Danish Krone', value: 'DKK' },
                { name: 'PLN - Polish Zloty', value: 'PLN' },
                { name: 'THB - Thai Baht', value: 'THB' }
              )
          )
      ),
  ].map(command => command.toJSON())

  const rest = new REST({ version: '10' }).setToken(token)

  try {
    console.log('Started refreshing application (/) commands.')
    console.log(`Registering ${commands.length} commands...`)

    // Register commands globally
    if (client.user) {
      const data = await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: commands }
      ) as any[]
      console.log(`Successfully registered ${data.length} application (/) commands globally.`)
      console.log('Registered commands:', data.map(cmd => cmd.name).join(', '))
    } else {
      console.error('Bot user not available, cannot register commands')
    }
  } catch (error: any) {
    console.error('Error registering slash commands:', error)
    if (error.message) {
      console.error('Error details:', error.message)
    }
    if (error.code) {
      console.error('Error code:', error.code)
    }
    if (error.requestData) {
      console.error('Request data:', JSON.stringify(error.requestData, null, 2))
    }
  }
}

async function handleSlashCommand(interaction: ChatInputCommandInteraction) {
  const { commandName } = interaction

  try {
    if (commandName === 'help') {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
      const commandArg = interaction.options.getString('command')
      
      const embed = getCommandHelp(commandArg, frontendUrl)
      await interaction.reply({ embeds: [embed], ephemeral: true })
    } else if (commandName === 'ping') {
      await interaction.reply({ content: 'Pong!', ephemeral: true })
    } else if (commandName === 'dice') {
      if (!interaction.guildId) {
        await interaction.reply({ content: '❌ This command only works in servers.', ephemeral: true })
        return
      }
      
      try {
        await interaction.deferReply()
        await diceGameService.startGame(
          interaction.user.id,
          interaction.guildId,
          interaction.channelId
        )
        await interaction.editReply({ content: '🎲 Dice game started! Check the channel for the game interface.' })
      } catch (error: any) {
        await interaction.editReply({ content: `❌ ${error.message}` })
      }
    } else if (commandName === 'model') {
      if (!interaction.guildId) {
        await interaction.reply({ content: '❌ This command only works in servers.', ephemeral: true })
        return
      }

      // Get provider and provider URL from config
      const provider = await botConfigRepository.get('ai_provider') || 'ollama'
      const providerUrl = await botConfigRepository.get('ai_provider_url') || 'http://localhost:11434'
      
      if (provider !== 'ollama') {
        await interaction.reply({ content: '❌ Model switching is only available for Ollama provider.', ephemeral: true })
        return
      }

      // Fetch available models from Ollama
      let models: string[] = []
      try {
        const response = await fetch(`${providerUrl}/api/tags`)
        if (response.ok) {
          const data = (await response.json()) as { models: Array<{ name: string }> }
          models = data.models?.map((m) => m.name) || []
        }
      } catch (error) {
        console.error('Error fetching Ollama models:', error)
      }

      if (models.length === 0) {
        await interaction.reply({ content: '❌ Could not fetch models from Ollama. Make sure Ollama is running.', ephemeral: true })
        return
      }

      // Limit to 25 models (Discord select menu limit)
      const displayModels = models.slice(0, 25)

      // Get current model for this channel
      let currentModel = 'default'
      try {
        const guildConfig = await aiConfigRepository.get(interaction.guildId)
        if (guildConfig?.channelConfigs && interaction.channelId in guildConfig.channelConfigs) {
          currentModel = guildConfig.channelConfigs[interaction.channelId].model || 'default'
        }
      } catch (error) {
        console.error('Error getting current model:', error)
      }

      // Build select menu options
      const options = displayModels.map((model) => {
        const option = new StringSelectMenuOptionBuilder()
          .setLabel(model)
          .setValue(model)
        
        if (model === currentModel) {
          option.setDescription('Current model')
          option.setDefault(true)
        }
        
        return option
      })

      // Build select menu with userId encoded in customId
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`model_select_${interaction.user.id}`)
        .setPlaceholder('Select a model...')
        .addOptions(options)

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)

      const embed = new EmbedBuilder()
        .setTitle('Select a model')
        .setDescription('Choose a model from the dropdown below:')
        .setColor(0x5865f2)

      await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true,
      })
    } else if (commandName === 'personality') {
      if (!interaction.guildId) {
        await interaction.reply({ content: '❌ This command only works in servers.', ephemeral: true })
        return
      }

      const personalities: Array<{ name: string; emoji: string }> = [
        { name: 'normal', emoji: '😐' },
        { name: 'rude', emoji: '😈' },
        { name: 'professional', emoji: '💼' },
        { name: 'friendly', emoji: '😊' },
        { name: 'sarcastic', emoji: '😏' },
      ]

      // Get current personality for this channel
      let currentPersonality = 'default'
      try {
        const guildConfig = await aiConfigRepository.get(interaction.guildId)
        if (guildConfig?.channelConfigs && interaction.channelId in guildConfig.channelConfigs) {
          currentPersonality = guildConfig.channelConfigs[interaction.channelId].personality || 'default'
        }
      } catch (error) {
        console.error('Error getting current personality:', error)
      }

      // Build select menu options
      const options = personalities.map((personality) => {
        const option = new StringSelectMenuOptionBuilder()
          .setLabel(personality.name.charAt(0).toUpperCase() + personality.name.slice(1))
          .setValue(personality.name)
          .setDescription(`${personality.emoji} ${personality.name} personality`)
        
        if (personality.name === currentPersonality) {
          option.setDefault(true)
        }
        
        return option
      })

      // Build select menu with userId encoded in customId
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`personality_select_${interaction.user.id}`)
        .setPlaceholder('Select a personality...')
        .addOptions(options)

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)

      const embed = new EmbedBuilder()
        .setTitle('Select a personality')
        .setDescription('Choose a personality from the dropdown below:')
        .setColor(0x5865f2)

      await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true,
      })
    } else if (commandName === 'steam') {
      const subcommand = interaction.options.getSubcommand()
      
      if (!interaction.guildId) {
        await interaction.reply({ content: '❌ This command only works in servers.', ephemeral: true })
        return
      }

      await interaction.deferReply({ ephemeral: true })

      try {
        if (subcommand === 'link') {
          const steamIdOrVanity = interaction.options.getString('steamid', true)
          const userId = interaction.user.id
          const guildId = interaction.guildId

          // Try to resolve as Steam ID first, then as vanity URL
          let steamId: string | null = null
          let vanityUrl: string | null = null

          if (steamService.isValidSteamId(steamIdOrVanity)) {
            steamId = steamIdOrVanity
          } else {
            // Try as vanity URL
            vanityUrl = steamIdOrVanity
            steamId = await steamService.resolveVanityUrl(steamIdOrVanity)
            if (!steamId) {
              await interaction.editReply({ content: '❌ Could not find Steam profile. Please check your Steam ID or vanity URL.' })
              return
            }
          }

          // Link the account
          await steamRepository.linkUser(userId, steamId, guildId, vanityUrl)
          
          // Get profile to confirm
          const profile = await steamService.getPlayerSummary(steamId)
          
          const embed = new EmbedBuilder()
            .setTitle('Steam Account Linked')
            .setDescription(`Successfully linked your Steam account!`)
            .setColor(0x1b2838)
            .addFields(
              { name: 'Steam Profile', value: profile?.personaname || 'Unknown', inline: true },
              { name: 'Steam ID', value: steamId, inline: true }
            )
            .setThumbnail(profile?.avatarmedium || null)
            .setURL(steamService.getProfileUrl(steamId))
            .setTimestamp()

          await interaction.editReply({ embeds: [embed] })
        } else if (subcommand === 'profile') {
          const targetUser = interaction.options.getUser('user') || interaction.user
          const userId = targetUser.id
          const guildId = interaction.guildId

          const steamId = await steamRepository.getSteamId(userId, guildId)
          
          if (!steamId) {
            await interaction.editReply({ 
              content: `❌ ${targetUser.id === interaction.user.id ? 'You haven\'t' : `${targetUser.displayName} hasn't`} linked a Steam account. Use \`/steam link\` to link your account.` 
            })
            return
          }

          const profile = await steamService.getPlayerSummary(steamId)
          
          if (!profile) {
            await interaction.editReply({ content: '❌ Could not fetch Steam profile.' })
            return
          }

          const statusEmojis: Record<number, string> = {
            0: '⚫', // Offline
            1: '🟢', // Online
            2: '🟡', // Busy
            3: '🟠', // Away
            4: '🔴', // Snooze
            5: '🔵', // Looking to trade
            6: '🟣', // Looking to play
          }

          const statusNames: Record<number, string> = {
            0: 'Offline',
            1: 'Online',
            2: 'Busy',
            3: 'Away',
            4: 'Snooze',
            5: 'Looking to Trade',
            6: 'Looking to Play',
          }

          const embed = new EmbedBuilder()
            .setTitle(`${profile.personaname}'s Steam Profile`)
            .setDescription(profile.realname ? `Real Name: ${profile.realname}` : '')
            .setColor(0x1b2838)
            .setThumbnail(profile.avatarfull)
            .setURL(steamService.getProfileUrl(steamId))
            .addFields(
              { name: 'Status', value: `${statusEmojis[profile.personastate] || '⚫'} ${statusNames[profile.personastate] || 'Unknown'}`, inline: true },
              { name: 'Steam ID', value: steamId, inline: true }
            )
            .setTimestamp()

          if (profile.gameextrainfo) {
            embed.addFields({ name: 'Currently Playing', value: profile.gameextrainfo, inline: false })
          }

          await interaction.editReply({ embeds: [embed] })
        } else if (subcommand === 'games') {
          const targetUser = interaction.options.getUser('user') || interaction.user
          const userId = targetUser.id
          const guildId = interaction.guildId

          const steamId = await steamRepository.getSteamId(userId, guildId)
          
          if (!steamId) {
            await interaction.editReply({ 
              content: `❌ ${targetUser.id === interaction.user.id ? 'You haven\'t' : `${targetUser.displayName} hasn't`} linked a Steam account. Use \`/steam link\` to link your account.` 
            })
            return
          }

          const games = await steamService.getOwnedGames(steamId)
          
          if (games.length === 0) {
            await interaction.editReply({ content: '❌ No games found or profile is private.' })
            return
          }

          // Sort by playtime
          const sortedGames = games
            .sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0))
            .slice(0, 10)

          const topGames = sortedGames
            .map((game, index) => {
              const playtime = steamService.formatPlaytime(game.playtime_forever)
              return `${index + 1}. **${game.name}** - ${playtime}`
            })
            .join('\n')

          const embed = new EmbedBuilder()
            .setTitle(`${targetUser.displayName}'s Steam Games`)
            .setDescription(`Total games: **${games.length}**\n\n**Top 10 by playtime:**\n${topGames}`)
            .setColor(0x1b2838)
            .setURL(steamService.getProfileUrl(steamId))
            .setTimestamp()

          await interaction.editReply({ embeds: [embed] })
        } else if (subcommand === 'recent') {
          const targetUser = interaction.options.getUser('user') || interaction.user
          const userId = targetUser.id
          const guildId = interaction.guildId

          const steamId = await steamRepository.getSteamId(userId, guildId)
          
          if (!steamId) {
            await interaction.editReply({ 
              content: `❌ ${targetUser.id === interaction.user.id ? 'You haven\'t' : `${targetUser.displayName} hasn't`} linked a Steam account. Use \`/steam link\` to link your account.` 
            })
            return
          }

          const games = await steamService.getRecentlyPlayedGames(steamId, 5)
          
          if (games.length === 0) {
            await interaction.editReply({ content: '❌ No recently played games found or profile is private.' })
            return
          }

          const recentGames = games
            .map((game, index) => {
              const totalPlaytime = steamService.formatPlaytime(game.playtime_forever)
              const recentPlaytime = game.playtime_2weeks ? steamService.formatPlaytime(game.playtime_2weeks) : '0m'
              return `${index + 1}. **${game.name}**\n   Total: ${totalPlaytime} | Last 2 weeks: ${recentPlaytime}`
            })
            .join('\n\n')

          const embed = new EmbedBuilder()
            .setTitle(`${targetUser.displayName}'s Recently Played Games`)
            .setDescription(recentGames)
            .setColor(0x1b2838)
            .setURL(steamService.getProfileUrl(steamId))
            .setTimestamp()

          await interaction.editReply({ embeds: [embed] })
        } else if (subcommand === 'unlink') {
          const userId = interaction.user.id
          const guildId = interaction.guildId

          await steamRepository.unlinkUser(userId, guildId)
          
          await interaction.editReply({ content: '✅ Steam account unlinked successfully.' })
        }
      } catch (error: any) {
        console.error('Error handling Steam command:', error)
        await interaction.editReply({ content: `❌ Error: ${error.message}` })
      }
    } else if (commandName === 'poll') {
      if (!interaction.guildId) {
        await interaction.reply({ content: '❌ This command only works in servers.', ephemeral: true })
        return
      }

      await interaction.deferReply({ ephemeral: true })

      try {
        const title = interaction.options.getString('title', true)
        const description = interaction.options.getString('description')
        const optionsStr = interaction.options.getString('options', true)
        const expiresHours = interaction.options.getInteger('expires_hours')

        const options = optionsStr.split(';').map(opt => opt.trim()).filter(opt => opt.length > 0)

        if (options.length < 2) {
          await interaction.editReply({ content: '❌ A poll must have at least 2 options. Separate options with semicolons (;).' })
          return
        }

        if (options.length > 10) {
          await interaction.editReply({ content: '❌ A poll can have at most 10 options.' })
          return
        }

        const expiresAt = expiresHours ? new Date(Date.now() + expiresHours * 60 * 60 * 1000) : undefined

        const result = await votingService.createPoll({
          guildId: interaction.guildId,
          channelId: interaction.channelId,
          title,
          description: description || undefined,
          options,
          createdBy: interaction.user.id,
          expiresAt,
        })

        await interaction.editReply({ content: `✅ Poll created! Check <#${interaction.channelId}>` })
      } catch (error: any) {
        console.error('Error handling poll command:', error)
        await interaction.editReply({ content: `❌ Error: ${error.message}` })
      }
    } else if (commandName === 'voice') {
      if (!interaction.guildId) {
        await interaction.reply({ content: '❌ This command only works in servers.', ephemeral: true })
        return
      }

      await interaction.deferReply({ ephemeral: true })

      try {
        const channel = interaction.options.getChannel('channel', true)
        const text = interaction.options.getString('text', true)
        const language = interaction.options.getString('language') || 'en'
        const voiceDescription = interaction.options.getString('voice') || undefined

        if (channel.type !== 2) {
          await interaction.editReply({ content: '❌ Please select a voice channel.' })
          return
        }

        const { voiceService } = await import('../services/voiceService.js')
        await voiceService.speakInChannel(channel.id, text, language, voiceDescription)
        await interaction.editReply({ content: `✅ Bot is speaking in <#${channel.id}>` })
      } catch (error: any) {
        console.error('Error handling voice command:', error)
        await interaction.editReply({ content: `❌ Error: ${error.message}` })
      }
    } else if (commandName === 'f1') {
      if (!interaction.guildId) {
        await interaction.reply({ content: '❌ This command only works in servers.', ephemeral: true })
        return
      }

      await interaction.deferReply()

      try {
        // Check permissions
        const { sportsConfigRepository } = await import('../database/sportsConfigRepository.js')
        const config = await sportsConfigRepository.getConfig(interaction.guildId, 'f1')
        
        if (!config || !config.enabled) {
          await interaction.editReply({ 
            content: '❌ F1 commands are not enabled for this server. Please ask an administrator to enable them in the web dashboard.' 
          })
          return
        }

        // Check channel restrictions
        if (config.channelIds && config.channelIds.length > 0) {
          if (!config.channelIds.includes(interaction.channelId)) {
            await interaction.editReply({ 
              content: `❌ F1 commands can only be used in specific channels. Allowed channels: ${config.channelIds.map(id => `<#${id}>`).join(', ')}` 
            })
            return
          }
        }

        // Check user restrictions
        if (config.blockedUserIds && config.blockedUserIds.includes(interaction.user.id)) {
          await interaction.editReply({ 
            content: '❌ You are blocked from using F1 commands.' 
          })
          return
        }

        // Check role restrictions
        if (config.roleListType === 'whitelist' && config.allowedRoleIds && config.allowedRoleIds.length > 0) {
          const member = await interaction.guild?.members.fetch(interaction.user.id).catch(() => null)
          if (member) {
            const hasAllowedRole = member.roles.cache.some(role => config.allowedRoleIds!.includes(role.id))
            if (!hasAllowedRole) {
              await interaction.editReply({ 
                content: '❌ You do not have permission to use F1 commands. Required roles are configured by the server administrator.' 
              })
              return
            }
          }
        } else if (config.roleListType === 'blacklist' && config.allowedRoleIds && config.allowedRoleIds.length > 0) {
          const member = await interaction.guild?.members.fetch(interaction.user.id).catch(() => null)
          if (member) {
            const hasBlockedRole = member.roles.cache.some(role => config.allowedRoleIds!.includes(role.id))
            if (hasBlockedRole) {
              await interaction.editReply({ 
                content: '❌ Your role is blocked from using F1 commands.' 
              })
              return
            }
          }
        }

        const subcommand = interaction.options.getSubcommand()

        let embed: EmbedBuilder

        if (subcommand === 'positions') {
          embed = await f1CommandService.getCurrentPositions()
        } else if (subcommand === 'starting-grid') {
          embed = await f1CommandService.getStartingGrid()
        } else if (subcommand === 'race-info') {
          embed = await f1CommandService.getRaceInfo()
        } else if (subcommand === 'leader') {
          embed = await f1CommandService.getCurrentLeader()
        } else if (subcommand === 'standings') {
          embed = await f1CommandService.getChampionshipStandings()
        } else {
          embed = new EmbedBuilder()
            .setTitle('Unknown F1 Command')
            .setDescription('Please use a valid F1 subcommand.')
            .setColor(0xff0000)
        }

        await interaction.editReply({ embeds: [embed] })
      } catch (error: any) {
        console.error('Error handling F1 command:', error)
        await interaction.editReply({ 
          content: `❌ Error: ${error.message}`,
          embeds: []
        })
      }
    } else if (commandName === 'exchange-rate') {
      if (!interaction.guildId) {
        await interaction.reply({ content: '❌ This command only works in servers.', ephemeral: true })
        return
      }

      const subcommand = interaction.options.getSubcommand()
      
      try {
        await interaction.deferReply()

        if (subcommand === 'convert') {
          const amount = interaction.options.getNumber('amount', true)
          const fromCurrency = interaction.options.getString('from', true)
          const toCurrency = interaction.options.getString('to', true)

          await exchangeRateDiscordService.convertCurrency(
            interaction.user.id,
            interaction.guildId,
            interaction.channelId!,
            amount,
            fromCurrency,
            toCurrency
          )

          await interaction.editReply({ content: '✅ Currency conversion sent to channel!' })
        } else if (subcommand === 'rates') {
          const config = await exchangeRateRepository.getConfig(interaction.guildId)
          const baseCurrency = interaction.options.getString('base') || config?.defaultBaseCurrency || 'USD'

          await exchangeRateDiscordService.getRates(
            interaction.user.id,
            interaction.guildId,
            interaction.channelId!,
            baseCurrency
          )

          await interaction.editReply({ content: '✅ Exchange rates sent to channel!' })
        }
      } catch (error: any) {
        await interaction.editReply({ content: `❌ ${error.message}` })
      }
    }
  } catch (error: any) {
    console.error(`Error handling slash command ${commandName}:`, error)
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ content: `❌ Error: ${error.message}` })
    } else {
      await interaction.reply({ content: `❌ Error: ${error.message}`, ephemeral: true })
    }
  }
}

export function getBotClient(): Client | null {
  return botClient
}

