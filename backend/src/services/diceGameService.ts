import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
  Message,
} from 'discord.js'
import { getBotClient } from '../bot/bot.js'
import { diceGameRepository } from '../database/diceGameRepository.js'
import { scoreboardRepository } from '../database/scoreboardRepository.js'

interface DiceGameState {
  messageId: string
  channelId: string
  userId: string
  guildId: string
  userScore: number
  botScore: number
  userRolls: number[]
  botRolls: number[]
  turn: 'user' | 'bot' | 'choosing' | 'finished'
  round: number
  // PvP mode
  isPvP?: boolean
  player2Id?: string
  player2Score?: number
  player2Rolls?: number[]
  challengerId?: string
}

interface ChallengeState {
  challengerId: string
  challengedId: string
  guildId: string
  channelId: string
  messageId: string
  expiresAt: Date
  countdownInterval?: NodeJS.Timeout
}

const activeGames = new Map<string, DiceGameState>()
const activeChallenges = new Map<string, ChallengeState>()

function rollDice(): number[] {
  return [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1]
}

function getTotal(rolls: number[]): number {
  return rolls[0] + rolls[1]
}

// Insult messages for losers
const LOSER_INSULTS = [
  "You rolled like a blindfolded toddler! Get rekt!",
  "Your dice skills are worse than your life choices! Pathetic!",
  "You got absolutely destroyed! Maybe try a different game, loser!",
  "That was embarrassing! Your ancestors are disappointed!",
  "You just got humiliated! Time to find a new hobby!",
  "You rolled like absolute garbage! Get good, scrub!",
  "That performance was tragic! You should be ashamed!",
  "You got absolutely demolished! Maybe stick to watching!",
  "Your luck is as bad as your personality! Get fucked!",
  "You just got absolutely destroyed! Time to uninstall life!",
  "That was a complete disaster! You're a walking L!",
  "You got rekt so hard your future children felt it!",
  "Your dice skills are non-existent! What a pathetic display!",
  "You just got absolutely obliterated! Maybe try breathing instead!",
  "That was a complete failure! You're a certified loser!",
]

export const diceGameService = {
  async challengePlayer(
    challengerId: string,
    challengedId: string,
    guildId: string,
    channelId: string
  ): Promise<void> {
    const client = getBotClient()
    if (!client) {
      throw new Error('Bot client not initialized')
    }

    if (challengerId === challengedId) {
      throw new Error('You cannot challenge yourself!')
    }

    const config = await diceGameRepository.get(guildId)
    if (!config || !config.enabled) {
      throw new Error('Dice game is not enabled for this server')
    }

    if (config.channelId && config.channelId !== channelId) {
      throw new Error(`Dice game can only be played in <#${config.channelId}>`)
    }

    // Check if challenger has an active game
    const challengerGameKey = `${guildId}-${challengerId}`
    if (activeGames.has(challengerGameKey)) {
      throw new Error('You already have an active game!')
    }

    // Check if challenged player has an active game
    const challengedGameKey = `${guildId}-${challengedId}`
    if (activeGames.has(challengedGameKey)) {
      throw new Error('That player already has an active game!')
    }

    // Check if there's already a pending challenge
    const challengeKey = `${guildId}-${challengerId}-${challengedId}`
    if (activeChallenges.has(challengeKey)) {
      throw new Error('You already have a pending challenge with this player!')
    }

    const channel = (await client.channels.fetch(channelId)) as TextChannel | null
    if (!channel) {
      throw new Error('Channel not found')
    }

    const challenger = await client.users.fetch(challengerId)
    const challenged = await client.users.fetch(challengedId)

    // DM the challenged player
    try {
      const dmChannel = await challenged.createDM()
      const dmEmbed = new EmbedBuilder()
        .setTitle('🎲 Dice Game Challenge!')
        .setDescription(
          `<@${challengerId}> has challenged you to a dice game in <#${channelId}>!\n\n` +
          `The loser will be absolutely roasted! 🔥\n\n` +
          `Click the buttons in the channel to accept or decline.`
        )
        .setColor(0xff0000)
        .setTimestamp()

      await dmChannel.send({ embeds: [dmEmbed] })
    } catch (error) {
      // If DM fails (user has DMs disabled), continue anyway
      console.warn(`Could not DM user ${challengedId}:`, error)
    }

    const embed = new EmbedBuilder()
      .setTitle('🎲 Dice Game Challenge!')
      .setDescription(
        `<@${challengerId}> has challenged <@${challengedId}> to a dice game!\n\n` +
        `The loser will be absolutely roasted! 🔥\n\n` +
        `⏰ **Time remaining: 30 seconds**`
      )
      .setColor(0xff0000)
      .setTimestamp()

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`dice_accept_${challengerId}_${challengedId}`)
        .setLabel('Accept Challenge')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅'),
      new ButtonBuilder()
        .setCustomId(`dice_decline_${challengerId}_${challengedId}`)
        .setLabel('Decline')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌')
    )

    const message = await channel.send({
      content: `<@${challengedId}>`,
      embeds: [embed],
      components: [row],
    })

    // Store challenge (expires in 30 seconds)
    const expiresAt = new Date()
    expiresAt.setSeconds(expiresAt.getSeconds() + 30)

    // Start countdown timer
    let timeLeft = 30
    let lastUpdateTime = Date.now()
    
    const countdownInterval = setInterval(async () => {
      // Check if challenge still exists (might have been accepted/declined)
      if (!activeChallenges.has(challengeKey)) {
        clearInterval(countdownInterval)
        return
      }

      timeLeft--
      const now = Date.now()
      
      // Only update message every second (avoid rate limits)
      const shouldUpdate = (now - lastUpdateTime) >= 1000 || timeLeft <= 0
      
      if (timeLeft <= 0) {
        clearInterval(countdownInterval)
        
        // Challenge expired - send vile insult
        const challenge = activeChallenges.get(challengeKey)
        if (!challenge) {
          return // Already handled
        }

        activeChallenges.delete(challengeKey)
        
        // Variety of initial insults
        const initialInsults = [
          `<@${challengedId}> you're a fucking pussy! Too scared to accept a challenge? What a pathetic faggot!`,
          `<@${challengedId}> you're a spineless cunt! Can't even click a button, you worthless piece of shit!`,
          `<@${challengedId}> what a fucking coward! Too much of a bitch to play a dice game? Pathetic!`,
          `<@${challengedId}> you're a fucking pussy ass bitch! Too scared to accept? What a weak ass motherfucker!`,
          `<@${challengedId}> you're a fucking faggot! Can't even accept a simple challenge, you pathetic piece of trash!`,
          `<@${challengedId}> what a fucking pussy! Too much of a coward to play? You're a worthless cunt!`,
          `<@${challengedId}> you're a spineless piece of shit! Too scared to accept a challenge? Fucking pathetic!`,
          `<@${challengedId}> you're a fucking bitch! Can't even click accept, you weak ass motherfucker!`,
          `<@${challengedId}> what a pathetic faggot! Too much of a pussy to play? You're a worthless cunt!`,
          `<@${challengedId}> you're a fucking coward! Too scared to accept? What a spineless piece of shit!`,
        ]

        // Variety of embed descriptions
        const embedDescriptions = [
          `<@${challengedId}> is too much of a **pussy faggot** to accept the challenge!\n\n` +
          `What a pathetic coward! Can't even click a button in 30 seconds, you absolute waste of space!\n` +
          `You're a spineless piece of shit who's too scared to play a dice game. Fucking pathetic!`,
          `<@${challengedId}> is a **spineless cunt** who's too scared to accept!\n\n` +
          `Can't even click a button in 30 seconds, you worthless piece of trash!\n` +
          `You're a fucking coward who's too much of a bitch to play a simple dice game!`,
          `<@${challengedId}> is too much of a **fucking pussy** to accept the challenge!\n\n` +
          `What a pathetic faggot! Can't even click accept in 30 seconds, you absolute waste!\n` +
          `You're a spineless motherfucker who's too scared to play. Fucking pathetic!`,
          `<@${challengedId}> is a **worthless cunt** who's too scared to accept!\n\n` +
          `Can't even click a button in 30 seconds, you spineless piece of shit!\n` +
          `You're a fucking coward who's too much of a pussy to play a dice game!`,
          `<@${challengedId}> is too much of a **fucking bitch** to accept the challenge!\n\n` +
          `What a pathetic coward! Can't even click accept in 30 seconds, you worthless faggot!\n` +
          `You're a spineless piece of trash who's too scared to play. Fucking pathetic!`,
        ]

        // Variety of follow-up insults (2 minutes later)
        const followUpInsults = [
          `<@${challengedId}> I remember you still a bitch! Still too scared to play?`,
          `<@${challengedId}> I remember you still a fucking pussy! What a pathetic coward!`,
          `<@${challengedId}> I remember you still a worthless cunt! Too scared to accept?`,
          `<@${challengedId}> I remember you still a spineless faggot! Can't even play a dice game?`,
          `<@${challengedId}> I remember you still a fucking coward! What a pathetic piece of shit!`,
          `<@${challengedId}> I remember you still a pussy ass bitch! Too scared to accept?`,
          `<@${challengedId}> I remember you still a worthless motherfucker! What a spineless cunt!`,
          `<@${challengedId}> I remember you still a fucking pussy! Too much of a coward to play?`,
        ]

        try {
          const randomInitialInsult = initialInsults[Math.floor(Math.random() * initialInsults.length)]
          const randomEmbedDesc = embedDescriptions[Math.floor(Math.random() * embedDescriptions.length)]
          const randomFollowUp = followUpInsults[Math.floor(Math.random() * followUpInsults.length)]

          const expiredMessage = await channel.messages.fetch(message.id)
          const expiredEmbed = new EmbedBuilder()
            .setTitle('⏰ Challenge Expired')
            .setDescription(randomEmbedDesc)
            .setColor(0xff0000)
            .setTimestamp()

          await expiredMessage.edit({
            content: `<@${challengedId}>`,
            embeds: [expiredEmbed],
            components: [],
          })

          // Send initial insult in channel
          await channel.send(randomInitialInsult)

          // Schedule follow-up insult after 2 minutes
          setTimeout(async () => {
            try {
              await channel.send(randomFollowUp)
            } catch (error) {
              console.error('Error sending follow-up insult:', error)
            }
          }, 2 * 60 * 1000) // 2 minutes
        } catch (error) {
          console.error('Error handling expired challenge:', error)
        }
        
        return
      }

      // Update countdown in embed
      if (shouldUpdate) {
        try {
          const currentMessage = await channel.messages.fetch(message.id)
          const updatedEmbed = new EmbedBuilder()
            .setTitle('🎲 Dice Game Challenge!')
            .setDescription(
              `<@${challengerId}> has challenged <@${challengedId}> to a dice game!\n\n` +
              `The loser will be absolutely roasted! 🔥\n\n` +
              `⏰ **Time remaining: ${timeLeft} seconds**`
            )
            .setColor(0xff0000)
            .setTimestamp()

          await currentMessage.edit({
            content: `<@${challengedId}>`,
            embeds: [updatedEmbed],
            components: [row],
          })
          lastUpdateTime = now
        } catch (error) {
          // Don't clear interval on error - might be temporary rate limit
          // Only clear if challenge doesn't exist
          if (!activeChallenges.has(challengeKey)) {
            clearInterval(countdownInterval)
          }
        }
      }
    }, 1000) // Check every second

    // Store challenge with interval reference
    activeChallenges.set(challengeKey, {
      challengerId,
      challengedId,
      guildId,
      channelId,
      messageId: message.id,
      expiresAt,
      countdownInterval,
    })
  },

  async startGame(userId: string, guildId: string, channelId: string): Promise<void> {
    const client = getBotClient()
    if (!client) {
      throw new Error('Bot client not initialized')
    }

    const config = await diceGameRepository.get(guildId)
    if (!config || !config.enabled) {
      throw new Error('Dice game is not enabled for this server')
    }

    if (config.channelId && config.channelId !== channelId) {
      throw new Error(`Dice game can only be played in <#${config.channelId}>`)
    }

    // Check cooldown
    const cooldownMinutes = await diceGameRepository.checkCooldown(guildId, userId)
    if (cooldownMinutes !== null) {
      throw new Error(
        `You're on cooldown! Please wait ${cooldownMinutes} more minute${cooldownMinutes > 1 ? 's' : ''}.`
      )
    }

    const channel = (await client.channels.fetch(channelId)) as TextChannel | null
    if (!channel) {
      throw new Error('Channel not found')
    }

    const gameKey = `${guildId}-${userId}`
    if (activeGames.has(gameKey)) {
      throw new Error('You already have an active game!')
    }

    const embed = new EmbedBuilder()
      .setTitle('🎲 Dice Game')
      .setDescription('Welcome to the Dice Game! Who should go first?')
      .setColor(0x5865f2)

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('dice_user_first')
        .setLabel('You Go First')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('dice_bot_first')
        .setLabel('Bot Goes First')
        .setStyle(ButtonStyle.Secondary)
    )

    const message = await channel.send({
      embeds: [embed],
      components: [row],
    })

    activeGames.set(gameKey, {
      messageId: message.id,
      channelId,
      userId,
      guildId,
      userScore: 0,
      botScore: 0,
      userRolls: [],
      botRolls: [],
      turn: 'choosing',
      round: 0,
      isPvP: false,
    })
  },

  async startPvPGame(
    player1Id: string,
    player2Id: string,
    guildId: string,
    channelId: string,
    messageId?: string
  ): Promise<void> {
    const client = getBotClient()
    if (!client) {
      throw new Error('Bot client not initialized')
    }

    const config = await diceGameRepository.get(guildId)
    if (!config || !config.enabled) {
      throw new Error('Dice game is not enabled for this server')
    }

    if (config.channelId && config.channelId !== channelId) {
      throw new Error(`Dice game can only be played in <#${config.channelId}>`)
    }

    const channel = (await client.channels.fetch(channelId)) as TextChannel | null
    if (!channel) {
      throw new Error('Channel not found')
    }

    // Check if either player has an active game
    const player1GameKey = `${guildId}-${player1Id}`
    const player2GameKey = `${guildId}-${player2Id}`
    if (activeGames.has(player1GameKey) || activeGames.has(player2GameKey)) {
      throw new Error('One or both players already have an active game!')
    }

    // Remove challenge
    const challengeKey = `${guildId}-${player1Id}-${player2Id}`
    const reverseChallengeKey = `${guildId}-${player2Id}-${player1Id}`
    activeChallenges.delete(challengeKey)
    activeChallenges.delete(reverseChallengeKey)

    // Delete challenge message if provided
    if (messageId) {
      try {
        const challengeMessage = await channel.messages.fetch(messageId)
        await challengeMessage.delete()
      } catch (error) {
        // Message might already be deleted, ignore
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('🎲 Dice Game - Player vs Player')
      .setDescription(`<@${player1Id}> vs <@${player2Id}>\n\nWho should go first?`)
      .setColor(0x5865f2)

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`dice_pvp_p1_first_${player1Id}_${player2Id}`)
        .setLabel(`${(await client.users.fetch(player1Id)).username} Goes First`)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`dice_pvp_p2_first_${player1Id}_${player2Id}`)
        .setLabel(`${(await client.users.fetch(player2Id)).username} Goes First`)
        .setStyle(ButtonStyle.Secondary)
    )

    const message = await channel.send({
      embeds: [embed],
      components: [row],
    })

    // Create game state for both players
    const gameState: DiceGameState = {
      messageId: message.id,
      channelId,
      userId: player1Id,
      guildId,
      userScore: 0,
      botScore: 0,
      userRolls: [],
      botRolls: [],
      turn: 'choosing',
      round: 0,
      isPvP: true,
      player2Id: player2Id,
      player2Score: 0,
      player2Rolls: [],
    }

    activeGames.set(player1GameKey, gameState)
    activeGames.set(player2GameKey, gameState)
  },

  async handleFirstChoice(
    interaction: any,
    choice: 'user' | 'bot'
  ): Promise<void> {
    const gameKey = `${interaction.guildId}-${interaction.user.id}`
    const game = activeGames.get(gameKey)
    if (!game || game.turn !== 'choosing') {
      await interaction.reply({
        content: 'No active game found or invalid state.',
        ephemeral: true,
      })
      return
    }

    game.round = 1

    await interaction.deferUpdate()

    if (choice === 'user') {
      game.turn = 'user'
      await this.userTurn(game)
    } else {
      game.turn = 'bot'
      await this.botTurnFirst(game)
    }
  },

  async userTurn(game: DiceGameState): Promise<void> {
    const client = getBotClient()!
    const channel = (await client.channels.fetch(game.channelId)) as TextChannel
    const message = await channel.messages.fetch(game.messageId)

    const embed = new EmbedBuilder()
      .setTitle('🎲 Dice Game - Your Turn')
      .setDescription('Click the button below to roll your dice!')
      .setColor(0x5865f2)
      .addFields(
        { name: 'Your Score', value: game.userScore.toString(), inline: true },
        { name: 'Bot Score', value: game.botScore.toString(), inline: true },
        { name: 'Round', value: game.round.toString(), inline: true }
      )

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('dice_roll')
        .setLabel('Roll Dice')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🎲')
    )

    await message.edit({
      embeds: [embed],
      components: [row],
    })
  },

  async handleRoll(interaction: any): Promise<void> {
    const gameKey = `${interaction.guildId}-${interaction.user.id}`
    const game = activeGames.get(gameKey)
    if (!game || game.turn !== 'user') {
      await interaction.reply({
        content: "It's not your turn!",
        ephemeral: true,
      })
      return
    }

    await interaction.deferUpdate()

    const rolls = rollDice()
    const total = getTotal(rolls)
    game.userRolls = rolls
    game.userScore += total

    const client = getBotClient()!
    const channel = (await client.channels.fetch(game.channelId)) as TextChannel
    const message = await channel.messages.fetch(game.messageId)

    const embed = new EmbedBuilder()
      .setTitle('🎲 Dice Game')
      .setDescription(`You rolled: **${rolls[0]}** and **${rolls[1]}** = **${total}**`)
      .setColor(0x5865f2)
      .addFields(
        { name: 'Your Score', value: game.userScore.toString(), inline: true },
        { name: 'Bot Score', value: game.botScore.toString(), inline: true },
        { name: 'Round', value: game.round.toString(), inline: true }
      )

    await message.edit({
      embeds: [embed],
      components: [],
    })

    // Wait a moment, then bot's turn
    // After bot rolls, it will check if round is complete and either end game or continue
    setTimeout(() => {
      this.botTurn(game)
    }, 1500)
  },

  async botTurnFirst(game: DiceGameState): Promise<void> {
    const client = getBotClient()!
    const channel = (await client.channels.fetch(game.channelId)) as TextChannel
    const message = await channel.messages.fetch(game.messageId)

    const rolls = rollDice()
    const total = getTotal(rolls)
    game.botRolls = rolls
    game.botScore += total

    const embed = new EmbedBuilder()
      .setTitle('🎲 Dice Game - Bot\'s Turn')
      .setDescription(`Bot rolled: **${rolls[0]}** and **${rolls[1]}** = **${total}**`)
      .setColor(0x5865f2)
      .addFields(
        { name: 'Your Score', value: game.userScore.toString(), inline: true },
        { name: 'Bot Score', value: game.botScore.toString(), inline: true },
        { name: 'Round', value: game.round.toString(), inline: true }
      )

    await message.edit({
      embeds: [embed],
      components: [],
    })

    // Now user's turn
    setTimeout(() => {
      this.userTurn(game)
    }, 2000)
  },

  async botTurn(game: DiceGameState): Promise<void> {
    const client = getBotClient()!
    const channel = (await client.channels.fetch(game.channelId)) as TextChannel
    const message = await channel.messages.fetch(game.messageId)

    const rolls = rollDice()
    const total = getTotal(rolls)
    game.botRolls = rolls
    game.botScore += total

    const embed = new EmbedBuilder()
      .setTitle('🎲 Dice Game')
      .setDescription(`Bot rolled: **${rolls[0]}** and **${rolls[1]}** = **${total}**`)
      .setColor(0x5865f2)
      .addFields(
        { name: 'Your Score', value: game.userScore.toString(), inline: true },
        { name: 'Bot Score', value: game.botScore.toString(), inline: true },
        { name: 'Round', value: game.round.toString(), inline: true }
      )

    await message.edit({
      embeds: [embed],
      components: [],
    })

    // Both players have rolled this round, check if game is over
    if (game.round >= 3) {
      setTimeout(() => {
        this.endGame(game)
      }, 2000)
    } else {
      // Next round
      game.round++
      game.turn = 'user'
      setTimeout(() => {
        this.userTurn(game)
      }, 2000)
    }
  },

  async handlePvPFirstChoice(
    interaction: any,
    choice: 'player1' | 'player2',
    player1Id: string,
    player2Id: string
  ): Promise<void> {
    const gameKey = `${interaction.guildId}-${player1Id}`
    const game = activeGames.get(gameKey)
    if (!game || !game.isPvP || game.turn !== 'choosing') {
      await interaction.reply({
        content: 'No active PvP game found or invalid state.',
        ephemeral: true,
      })
      return
    }

    if (interaction.user.id !== player1Id && interaction.user.id !== player2Id) {
      await interaction.reply({
        content: 'This is not your game!',
        ephemeral: true,
      })
      return
    }

    game.round = 1
    await interaction.deferUpdate()

    if (choice === 'player1') {
      game.turn = 'user'
      await this.pvpPlayer1Turn(game)
    } else {
      game.turn = 'bot' // Reuse bot turn logic for player 2
      await this.pvpPlayer2Turn(game)
    }
  },

  async pvpPlayer1Turn(game: DiceGameState): Promise<void> {
    if (!game.isPvP || !game.player2Id) return

    const client = getBotClient()!
    const channel = (await client.channels.fetch(game.channelId)) as TextChannel
    const message = await channel.messages.fetch(game.messageId)
    const player1 = await client.users.fetch(game.userId)
    const player2 = await client.users.fetch(game.player2Id)

    const embed = new EmbedBuilder()
      .setTitle('🎲 Dice Game - Player vs Player')
      .setDescription(`<@${game.userId}>, it's your turn! Click the button to roll!`)
      .setColor(0x5865f2)
      .addFields(
        { name: `${player1.username}'s Score`, value: game.userScore.toString(), inline: true },
        { name: `${player2.username}'s Score`, value: (game.player2Score || 0).toString(), inline: true },
        { name: 'Round', value: game.round.toString(), inline: true }
      )

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`dice_pvp_roll_${game.userId}_${game.player2Id}`)
        .setLabel('Roll Dice')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🎲')
    )

    await message.edit({
      embeds: [embed],
      components: [row],
    })
  },

  async pvpPlayer2Turn(game: DiceGameState): Promise<void> {
    if (!game.isPvP || !game.player2Id) return

    const client = getBotClient()!
    const channel = (await client.channels.fetch(game.channelId)) as TextChannel
    const message = await channel.messages.fetch(game.messageId)
    const player1 = await client.users.fetch(game.userId)
    const player2 = await client.users.fetch(game.player2Id)

    const embed = new EmbedBuilder()
      .setTitle('🎲 Dice Game - Player vs Player')
      .setDescription(`<@${game.player2Id}>, it's your turn! Click the button to roll!`)
      .setColor(0x5865f2)
      .addFields(
        { name: `${player1.username}'s Score`, value: game.userScore.toString(), inline: true },
        { name: `${player2.username}'s Score`, value: (game.player2Score || 0).toString(), inline: true },
        { name: 'Round', value: game.round.toString(), inline: true }
      )

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`dice_pvp_roll_${game.userId}_${game.player2Id}`)
        .setLabel('Roll Dice')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🎲')
    )

    await message.edit({
      embeds: [embed],
      components: [row],
    })
  },

  async handlePvPRoll(
    interaction: any,
    player1Id: string,
    player2Id: string
  ): Promise<void> {
    const gameKey = `${interaction.guildId}-${player1Id}`
    const game = activeGames.get(gameKey)
    if (!game || !game.isPvP || !game.player2Id) {
      await interaction.reply({
        content: 'No active PvP game found!',
        ephemeral: true,
      })
      return
    }

    const isPlayer1 = interaction.user.id === player1Id
    const isPlayer2 = interaction.user.id === player2Id

    if (!isPlayer1 && !isPlayer2) {
      await interaction.reply({
        content: 'This is not your game!',
        ephemeral: true,
      })
      return
    }

    if (isPlayer1 && game.turn !== 'user') {
      await interaction.reply({
        content: "It's not your turn!",
        ephemeral: true,
      })
      return
    }

    if (isPlayer2 && game.turn !== 'bot') {
      await interaction.reply({
        content: "It's not your turn!",
        ephemeral: true,
      })
      return
    }

    await interaction.deferUpdate()

    const client = getBotClient()!
    const channel = (await client.channels.fetch(game.channelId)) as TextChannel
    const message = await channel.messages.fetch(game.messageId)
    const player1 = await client.users.fetch(player1Id)
    const player2 = await client.users.fetch(player2Id)

    const rolls = rollDice()
    const total = getTotal(rolls)

    if (isPlayer1) {
      game.userRolls = rolls
      game.userScore += total
    } else {
      game.player2Rolls = rolls
      game.player2Score = (game.player2Score || 0) + total
    }

    const embed = new EmbedBuilder()
      .setTitle('🎲 Dice Game - Player vs Player')
      .setDescription(
        `<@${interaction.user.id}> rolled: **${rolls[0]}** and **${rolls[1]}** = **${total}**`
      )
      .setColor(0x5865f2)
      .addFields(
        { name: `${player1.username}'s Score`, value: game.userScore.toString(), inline: true },
        { name: `${player2.username}'s Score`, value: (game.player2Score || 0).toString(), inline: true },
        { name: 'Round', value: game.round.toString(), inline: true }
      )

    await message.edit({
      embeds: [embed],
      components: [],
    })

    // Switch turns or end game
    if (isPlayer1) {
      // Player 1 rolled, now player 2's turn
      game.turn = 'bot'
      setTimeout(() => {
        this.pvpPlayer2Turn(game)
      }, 1500)
    } else {
      // Player 2 rolled, check if game is over or continue to next round
      if (game.round >= 3) {
        // Both players have rolled 3 times, end game
        setTimeout(() => {
          this.endPvPGame(game)
        }, 2000)
      } else {
        // Next round, player 1's turn
        game.round++
        game.turn = 'user'
        setTimeout(() => {
          this.pvpPlayer1Turn(game)
        }, 2000)
      }
    }
  },

  async endPvPGame(game: DiceGameState): Promise<void> {
    if (!game.isPvP || !game.player2Id) return

    const client = getBotClient()!
    const channel = (await client.channels.fetch(game.channelId)) as TextChannel
    const message = await channel.messages.fetch(game.messageId)
    const player1 = await client.users.fetch(game.userId)
    const player2 = await client.users.fetch(game.player2Id)

    const player1Score = game.userScore
    const player2Score = game.player2Score || 0

    let winnerId: string | null = null
    let loserId: string | null = null
    let isTie = false

    if (player1Score > player2Score) {
      winnerId = game.userId
      loserId = game.player2Id
    } else if (player2Score > player1Score) {
      winnerId = game.player2Id
      loserId = game.userId
    } else {
      isTie = true
    }

    const randomInsult = LOSER_INSULTS[Math.floor(Math.random() * LOSER_INSULTS.length)]

    const embed = new EmbedBuilder()
      .setTitle(isTie ? '🤝 Dice Game - Tie!' : '🎉 Dice Game - Game Over!')
      .setDescription(
        `**Final Scores:**\n` +
        `<@${game.userId}>: **${player1Score}**\n` +
        `<@${game.player2Id}>: **${player2Score}**\n\n` +
        (isTie
          ? `**It's a tie!**`
          : `<@${winnerId}> **WINS!** 🎉\n\n` +
            `<@${loserId}>, ${randomInsult}`)
      )
      .setColor(isTie ? 0xff9800 : 0x4caf50)

    await message.edit({
      embeds: [embed],
      components: [],
    })

    // Record game results
    if (!isTie && winnerId && loserId) {
      await scoreboardRepository.recordGameResult(game.guildId, winnerId, 'dice', 'win')
      await scoreboardRepository.recordGameResult(game.guildId, loserId, 'dice', 'loss')
    } else {
      await scoreboardRepository.recordGameResult(game.guildId, game.userId, 'dice', 'tie')
      await scoreboardRepository.recordGameResult(game.guildId, game.player2Id, 'dice', 'tie')
    }

    // Set cooldowns
    await diceGameRepository.setCooldown(game.guildId, game.userId)
    await diceGameRepository.setCooldown(game.guildId, game.player2Id)

    // Remove games
    const gameKey1 = `${game.guildId}-${game.userId}`
    const gameKey2 = `${game.guildId}-${game.player2Id}`
    activeGames.delete(gameKey1)
    activeGames.delete(gameKey2)
  },

  async endGame(game: DiceGameState): Promise<void> {
    const client = getBotClient()!
    const channel = (await client.channels.fetch(game.channelId)) as TextChannel
    const message = await channel.messages.fetch(game.messageId)

    const winner = game.userScore > game.botScore ? 'You' : game.userScore < game.botScore ? 'Bot' : 'Tie'
    const resultEmoji = winner === 'You' ? '🎉' : winner === 'Bot' ? '🤖' : '🤝'

    const embed = new EmbedBuilder()
      .setTitle(`${resultEmoji} Dice Game - Game Over!`)
      .setDescription(
        `**Final Scores:**\n` +
        `You: **${game.userScore}**\n` +
        `Bot: **${game.botScore}**\n\n` +
        `**Winner: ${winner}${winner === 'Tie' ? '' : ' Wins!'}**`
      )
      .setColor(game.userScore > game.botScore ? 0x4caf50 : game.userScore < game.botScore ? 0xf44336 : 0xff9800)

    await message.edit({
      embeds: [embed],
      components: [],
    })

    // Record game result in scoreboard
    if (winner === 'You') {
      await scoreboardRepository.recordGameResult(game.guildId, game.userId, 'dice', 'win')
    } else if (winner === 'Bot') {
      await scoreboardRepository.recordGameResult(game.guildId, game.userId, 'dice', 'loss')
    } else {
      await scoreboardRepository.recordGameResult(game.guildId, game.userId, 'dice', 'tie')
    }

    // Set cooldown
    await diceGameRepository.setCooldown(game.guildId, game.userId)

    // Remove game
    const gameKey = `${game.guildId}-${game.userId}`
    activeGames.delete(gameKey)
  },

  async handleChallengeAccept(
    interaction: any,
    challengerId: string,
    challengedId: string
  ): Promise<void> {
    if (interaction.user.id !== challengedId) {
      await interaction.reply({
        content: 'This challenge is not for you!',
        ephemeral: true,
      })
      return
    }

    const challengeKey = `${interaction.guildId}-${challengerId}-${challengedId}`
    const challenge = activeChallenges.get(challengeKey)
    if (!challenge) {
      await interaction.reply({
        content: 'Challenge not found or expired!',
        ephemeral: true,
      })
      return
    }

    if (new Date() > challenge.expiresAt) {
      // Clear interval if it exists
      if (challenge.countdownInterval) {
        clearInterval(challenge.countdownInterval)
      }
      activeChallenges.delete(challengeKey)
      await interaction.reply({
        content: 'Challenge has expired!',
        ephemeral: true,
      })
      return
    }

    // Stop countdown timer
    if (challenge.countdownInterval) {
      clearInterval(challenge.countdownInterval)
    }
    activeChallenges.delete(challengeKey)

    await interaction.deferUpdate()

    try {
      await this.startPvPGame(
        challengerId,
        challengedId,
        interaction.guildId!,
        interaction.channelId,
        challenge.messageId
      )
    } catch (error: any) {
      await interaction.editReply({
        content: `Error starting game: ${error.message}`,
      })
    }
  },

  async handleChallengeDecline(
    interaction: any,
    challengerId: string,
    challengedId: string
  ): Promise<void> {
    if (interaction.user.id !== challengedId) {
      await interaction.reply({
        content: 'This challenge is not for you!',
        ephemeral: true,
      })
      return
    }

    const challengeKey = `${interaction.guildId}-${challengerId}-${challengedId}`
    const challenge = activeChallenges.get(challengeKey)
    if (!challenge) {
      await interaction.reply({
        content: 'Challenge not found!',
        ephemeral: true,
      })
      return
    }

    // Stop countdown timer
    if (challenge.countdownInterval) {
      clearInterval(challenge.countdownInterval)
    }
    activeChallenges.delete(challengeKey)

    await interaction.deferUpdate()

    const client = getBotClient()!
    const channel = (await client.channels.fetch(interaction.channelId)) as TextChannel
    try {
      const challengeMessage = await channel.messages.fetch(challenge.messageId)
      await challengeMessage.delete()
    } catch (error) {
      // Message might already be deleted
    }

    await interaction.editReply({
      content: `<@${challengedId}> declined the challenge. What a coward! 😏`,
    })
  },
}

