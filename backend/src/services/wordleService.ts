import {
  EmbedBuilder,
  TextChannel,
  Message,
  Collection,
} from 'discord.js'
import { getBotClient } from '../bot/bot.js'
import { wordleRepository } from '../database/wordleRepository.js'
import { scoreboardRepository } from '../database/scoreboardRepository.js'
import { getDatabase } from '../database/database.js'

interface WordleGame {
  guildId: string
  userId: string
  channelId: string
  word: string
  guesses: string[]
  invalidAttempts: string[] // Track invalid attempts
  currentGuess: number
  maxGuesses: number
  startedAt: Date
  messageIds: string[] // Track all messages in channel mode
  isChannelMode: boolean
  statusMessageId?: string // Track the main status message to update
}

// Common 5-letter words for wordle
const WORDLE_WORDS = [
  'ABOUT', 'ABOVE', 'ABUSE', 'ACTOR', 'ACUTE', 'ADMIT', 'ADOPT', 'ADULT',
  'AFTER', 'AGAIN', 'AGENT', 'AGREE', 'AHEAD', 'ALARM', 'ALBUM', 'ALERT',
  'ALIEN', 'ALIGN', 'ALIKE', 'ALIVE', 'ALLOW', 'ALONE', 'ALONG', 'ALTER',
  'AMONG', 'ANGER', 'ANGLE', 'ANGRY', 'APART', 'APPLE', 'APPLY', 'ARENA',
  'ARGUE', 'ARISE', 'ARRAY', 'ARROW', 'ASIDE', 'ASSET', 'AVOID', 'AWAKE',
  'AWARD', 'AWARE', 'BADLY', 'BAKER', 'BASES', 'BASIC', 'BEACH', 'BEGAN',
  'BEGIN', 'BEING', 'BELOW', 'BENCH', 'BILLY', 'BIRTH', 'BLACK', 'BLAME',
  'BLANK', 'BLAST', 'BLIND', 'BLOCK', 'BLOOD', 'BLOOM', 'BLOWN', 'BLUES',
  'BOARD', 'BOAST', 'BOBBY', 'BONUS', 'BOOST', 'BOOTH', 'BOUND', 'BRAIN',
  'BRAND', 'BRASS', 'BRAVE', 'BREAD', 'BREAK', 'BREED', 'BRIEF', 'BRING',
  'BROAD', 'BROKE', 'BROWN', 'BRUSH', 'BUDDY', 'BUILD', 'BUILT', 'BUNCH',
  'BURST', 'CABLE', 'CALIF', 'CALLS', 'CALM', 'CAMEL', 'CANAL', 'CANDY',
  'CARGO', 'CARRY', 'CASES', 'CATCH', 'CAUSE', 'CHAIN', 'CHAIR', 'CHAOS',
  'CHARM', 'CHART', 'CHASE', 'CHEAP', 'CHECK', 'CHESS', 'CHEST', 'CHIEF',
  'CHILD', 'CHINA', 'CHOSE', 'CHUNK', 'CIVIL', 'CLAIM', 'CLASH', 'CLASS',
  'CLEAN', 'CLEAR', 'CLICK', 'CLIMB', 'CLOCK', 'CLOSE', 'CLOUD', 'COACH',
  'COAST', 'COULD', 'COUNT', 'COURT', 'COVER', 'CRAFT', 'CRASH', 'CRAZY',
  'CREAM', 'CRIME', 'CROSS', 'CROWD', 'CROWN', 'CRUDE', 'CURVE', 'CYCLE',
  'DAILY', 'DANCE', 'DATED', 'DEALT', 'DEATH', 'DEBUT', 'DELAY', 'DELTA',
  'DENSE', 'DEPTH', 'DOING', 'DOUBT', 'DOZEN', 'DRAFT', 'DRAMA', 'DRANK',
  'DRAWN', 'DREAM', 'DRESS', 'DRILL', 'DRINK', 'DRIVE', 'DROVE', 'DYING',
  'EAGER', 'EARLY', 'EARTH', 'EIGHT', 'ELITE', 'EMPTY', 'ENEMY', 'ENJOY',
  'ENTER', 'ENTRY', 'EQUAL', 'ERROR', 'EVENT', 'EVERY', 'EXACT', 'EXIST',
  'EXTRA', 'FAITH', 'FALSE', 'FANCY', 'FATAL', 'FIBER', 'FIELD', 'FIERY',
  'FIFTH', 'FIFTY', 'FIGHT', 'FINAL', 'FIRST', 'FIXED', 'FLASH', 'FLEET',
  'FLOOR', 'FLUID', 'FOCUS', 'FORCE', 'FORTH', 'FORTY', 'FORUM', 'FOUND',
  'FRAME', 'FRANK', 'FRAUD', 'FRESH', 'FRONT', 'FROST', 'FRUIT', 'FULLY',
  'FUNNY', 'GIANT', 'GIVEN', 'GLASS', 'GLOBE', 'GLORY', 'GOLD', 'GRACE',
  'GRADE', 'GRAIN', 'GRAND', 'GRANT', 'GRASS', 'GRAVE', 'GREAT', 'GREEN',
  'GROSS', 'GROUP', 'GROWN', 'GUARD', 'GUESS', 'GUEST', 'GUIDE', 'HAPPY',
  'HARRY', 'HARSH', 'HASTE', 'HATCH', 'HATED', 'HAVEN', 'HEART', 'HEAVY',
  'HENCE', 'HENRY', 'HORSE', 'HOTEL', 'HOUSE', 'HUMAN', 'HURRY', 'IMAGE',
  'INDEX', 'INNER', 'INPUT', 'ISSUE', 'JAPAN', 'JIMMY', 'JOINT', 'JONES',
  'JUDGE', 'KNOWN', 'LABEL', 'LARGE', 'LASER', 'LATER', 'LAUGH', 'LAYER',
  'LEARN', 'LEASE', 'LEAST', 'LEAVE', 'LEGAL', 'LEVEL', 'LIGHT', 'LIMIT',
  'LINKS', 'LIVES', 'LOCAL', 'LOOSE', 'LOWER', 'LUCKY', 'LUNCH', 'LYING',
  'MAGIC', 'MAJOR', 'MAKER', 'MARCH', 'MARIA', 'MATCH', 'MAYBE', 'MAYOR',
  'MEANT', 'MEDIA', 'METAL', 'MIGHT', 'MINOR', 'MINUS', 'MIXED', 'MODEL',
  'MONEY', 'MONTH', 'MORAL', 'MOTOR', 'MOUNT', 'MOUSE', 'MOUTH', 'MOVED',
  'MOVIE', 'MUSIC', 'NEEDS', 'NEVER', 'NEWLY', 'NIGHT', 'NOISE', 'NORTH',
  'NOTED', 'NOVEL', 'NURSE', 'OCCUR', 'OCEAN', 'OFFER', 'OFTEN', 'OPERA', 'ORDER',
  'OTHER', 'OUGHT', 'PAINT', 'PANEL', 'PAPER', 'PARTY', 'PEACE', 'PETER',
  'PHASE', 'PHONE', 'PHOTO', 'PIANO', 'PIECE', 'PILOT', 'PITCH', 'PLACE',
  'PLAIN', 'PLANE', 'PLANT', 'PLATE', 'POINT', 'POUND', 'POWER', 'PRESS',
  'PRICE', 'PRIDE', 'PRIME', 'PRINT', 'PRIOR', 'PRIZE', 'PROOF', 'PROUD',
  'PROVE', 'QUEEN', 'QUICK', 'QUIET', 'QUITE', 'RADIO', 'RAISE', 'RANGE',
  'RAPID', 'RATIO', 'REACH', 'READY', 'REALM', 'REBEL', 'REFER', 'RELAX',
  'REPLY', 'RIDER', 'RIDGE', 'RIGHT', 'RIGID', 'RISKY', 'RIVER', 'ROBOT',
  'ROCKY', 'ROMAN', 'ROUGH', 'ROUND', 'ROYAL', 'RURAL', 'SCALE', 'SCENE',
  'SCOPE', 'SCORE', 'SENSE', 'SERVE', 'SEVEN', 'SHADE', 'SHAKE', 'SHALL',
  'SHAPE', 'SHARE', 'SHARP', 'SHEET', 'SHELF', 'SHELL', 'SHIFT', 'SHINE',
  'SHIRT', 'SHOCK', 'SHOOT', 'SHORT', 'SHOWN', 'SIDED', 'SIGHT', 'SINCE',
  'SIXTH', 'SIXTY', 'SIZED', 'SKILL', 'SLEEP', 'SLIDE', 'SMALL', 'SMART',
  'SMILE', 'SMITH', 'SMOKE', 'SOLID', 'SOLVE', 'SORRY', 'SOUND', 'SOUTH',
  'SPACE', 'SPARE', 'SPEAK', 'SPEED', 'SPEND', 'SPENT', 'SPLIT', 'SPOKE',
  'SPORT', 'STAFF', 'STAGE', 'STAKE', 'STAND', 'START', 'STATE', 'STEAM',
  'STEEL', 'STEEP', 'STEER', 'STICK', 'STILL', 'STOCK', 'STONE', 'STOOD',
  'STORE', 'STORM', 'STORY', 'STRIP', 'STUCK', 'STUDY', 'STUFF', 'STYLE',
  'SUGAR', 'SUITE', 'SUPER', 'SWEET', 'TABLE', 'TAKEN', 'TASTE', 'TAXES',
  'TEACH', 'TEAMS', 'TEETH', 'TERMS', 'TEXAS', 'TEXTS', 'THANK', 'THEFT',
  'THEIR', 'THEME', 'THERE', 'THESE', 'THICK', 'THING', 'THINK', 'THIRD',
  'THOSE', 'THREE', 'THREW', 'THROW', 'THUMB', 'TIGHT', 'TIMER', 'TIRED',
  'TITLE', 'TODAY', 'TOPIC', 'TOTAL', 'TOUCH', 'TOUGH', 'TOWER', 'TRACK',
  'TRADE', 'TRAIN', 'TREAT', 'TREND', 'TRIAL', 'TRIBE', 'TRICK', 'TRIED',
  'TRIES', 'TROOP', 'TRUCK', 'TRULY', 'TRUNK', 'TRUST', 'TRUTH', 'TWICE',
  'TWIST', 'TYLER', 'TYPES', 'UNCLE', 'UNDER', 'UNDUE', 'UNION', 'UNITY',
  'UNTIL', 'UPPER', 'UPSET', 'URBAN', 'URGED', 'USAGE', 'USING', 'USUAL',
  'VALUE', 'VIDEO', 'VIRUS', 'VISIT', 'VITAL', 'VOCAL', 'VOICE', 'WASTE',
  'WATCH', 'WATER', 'WHEEL', 'WHERE', 'WHICH', 'WHILE', 'WHITE', 'WHOLE',
  'WHOSE', 'WOMAN', 'WOMEN', 'WORLD', 'WORRY', 'WORSE', 'WORST', 'WORTH',
  'WOULD', 'WRITE', 'WRONG', 'WROTE', 'YIELD', 'YOUNG', 'YOURS', 'YOUTH',
]

const LOSER_INSULTS = [
  "You're a complete failure at wordle! Can't even guess a 5-letter word, you absolute moron!",
  "Pathetic! You couldn't solve a wordle puzzle if your life depended on it, you worthless piece of shit!",
  "What a fucking loser! You lost at wordle, the easiest game ever! You're a certified dumbass!",
  "You're so bad at wordle, it's actually embarrassing! You're a complete and utter failure!",
  "Can't even win a simple wordle game? You're a fucking disgrace! Get good, you pathetic loser!",
  "You're a wordle failure! Couldn't guess the word in time, you absolute waste of space!",
  "What a fucking joke! You lost at wordle! You're a certified loser and a complete embarrassment!",
  "You're so terrible at wordle, it's actually impressive how bad you are! You're a fucking moron!",
]

const activeGames = new Map<string, WordleGame>()

function getRandomWord(): string {
  return WORDLE_WORDS[Math.floor(Math.random() * WORDLE_WORDS.length)]
}

function checkGuess(word: string, guess: string): string {
  const result: string[] = []
  const wordLetters = word.split('')
  const guessLetters = guess.split('')
  const used = new Array(5).fill(false)

  // First pass: check for exact matches (green)
  for (let i = 0; i < 5; i++) {
    if (guessLetters[i] === wordLetters[i]) {
      result[i] = '🟩'
      used[i] = true
    }
  }

  // Second pass: check for wrong position (yellow)
  for (let i = 0; i < 5; i++) {
    if (result[i]) continue // Already marked as green

    const letter = guessLetters[i]
    const index = wordLetters.findIndex((w, idx) => w === letter && !used[idx])
    if (index !== -1) {
      result[i] = '🟨'
      used[index] = true
    } else {
      result[i] = '⬛'
    }
  }

  return result.join('')
}

export const wordleService = {
  async startGame(userId: string, guildId: string, channelId: string): Promise<void> {
    const client = getBotClient()
    if (!client) {
      throw new Error('Bot client not initialized')
    }

    const config = await wordleRepository.get(guildId)
    if (!config || !config.enabled) {
      throw new Error('Wordle is not enabled for this server')
    }

    // Check cooldown
    const cooldownMinutes = await wordleRepository.checkCooldown(guildId, userId)
    if (cooldownMinutes !== null) {
      throw new Error(
        `You're on cooldown! Please wait ${cooldownMinutes} more minute${cooldownMinutes > 1 ? 's' : ''}.`
      )
    }

    // Check if user already has an active game
    const gameKey = `${guildId}-${userId}`
    if (activeGames.has(gameKey)) {
      throw new Error('You already have an active wordle game!')
    }

    const channel = (await client.channels.fetch(channelId)) as TextChannel | null
    if (!channel || !channel.isTextBased()) {
      throw new Error('Channel not found')
    }

    const word = getRandomWord()
    const game: WordleGame = {
      guildId,
      userId,
      channelId,
      word,
      guesses: [],
      invalidAttempts: [],
      currentGuess: 0,
      maxGuesses: 6,
      startedAt: new Date(),
      messageIds: [],
      isChannelMode: !config.dmOnly,
    }

    activeGames.set(gameKey, game)

    if (config.dmOnly) {
      // DM mode - send to user's DM
      const user = await client.users.fetch(userId)
      const dmChannel = await user.createDM()
      const embed = this.buildGameEmbed(game, userId)
        .setDescription(
          `Guess the 5-letter word! You have ${game.maxGuesses} guesses.\n\n` +
          `Type your guess in this DM. Each guess must be exactly 5 letters.\n\n` +
          `**How to play:**\n` +
          `🟩 = Correct letter in correct position\n` +
          `🟨 = Correct letter in wrong position\n` +
          `⬛ = Letter not in word`
        )
      await dmChannel.send({ embeds: [embed] })
    } else {
      // Channel mode - post in channel
      const embed = this.buildGameEmbed(game, userId)
        .setDescription(
          `<@${userId}> started a wordle game!\n\n` +
          `Guess the 5-letter word! You have ${game.maxGuesses} guesses.\n\n` +
          `**How to play:**\n` +
          `🟩 = Correct letter in correct position\n` +
          `🟨 = Correct letter in wrong position\n` +
          `⬛ = Letter not in word\n\n` +
          `Type your guess in this channel!`
        )
      const message = await channel.send({ embeds: [embed] })
      game.messageIds.push(message.id)
      game.statusMessageId = message.id
    }
  },

  async handleGuess(message: Message): Promise<void> {
    if (!message.guildId) return
    if (message.author.bot) return

    const gameKey = `${message.guildId}-${message.author.id}`
    const game = activeGames.get(gameKey)
    if (!game) return

    // Only process guesses in channel mode if the message is in the game channel
    if (game.isChannelMode && message.channelId !== game.channelId) return

    const guess = message.content.trim().toUpperCase()
    const client = getBotClient()!
    const channel = (await client.channels.fetch(game.channelId)) as TextChannel
    
    // Validate guess length
    if (guess.length !== 5) {
      if (game.isChannelMode) {
        await message.reply('❌ Your guess must be exactly 5 letters!').catch(() => {})
        game.invalidAttempts.push(guess)
        game.messageIds.push(message.id)
        await this.updateStatusMessage(game, message.author.id)
      } else {
        const user = await message.author.createDM()
        await user.send('❌ Your guess must be exactly 5 letters!').catch(() => {})
      }
      return
    }

    // Validate guess contains only letters
    if (!/^[A-Z]+$/.test(guess)) {
      if (game.isChannelMode) {
        await message.reply('❌ Your guess must contain only letters!').catch(() => {})
        game.invalidAttempts.push(guess)
        game.messageIds.push(message.id)
        await this.updateStatusMessage(game, message.author.id)
      } else {
        const user = await message.author.createDM()
        await user.send('❌ Your guess must contain only letters!').catch(() => {})
      }
      return
    }

    // Validate word using dictionary API
    let isValidWord = WORDLE_WORDS.includes(guess)
    
    // If not in hardcoded list, check with dictionary API
    if (!isValidWord) {
      try {
        // Use Free Dictionary API to validate the word
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        
        const response = await fetch(
          `https://api.dictionaryapi.dev/api/v2/entries/en/${guess.toLowerCase()}`,
          {
            signal: controller.signal,
          }
        )
        
        clearTimeout(timeoutId)
        
        // If we get a 200 response, the word exists in the dictionary
        isValidWord = response.ok
      } catch (error: any) {
        // If API fails or word not found, word is invalid
        if (error.name === 'AbortError') {
          console.error('Dictionary API request timed out')
        } else {
          console.error('Error validating word with dictionary API:', error.message)
        }
        isValidWord = false
      }
    }
    
    if (!isValidWord) {
      if (game.isChannelMode) {
        await message.reply('❌ That word is not in the word list!').catch(() => {})
        game.invalidAttempts.push(guess)
        game.messageIds.push(message.id)
        await this.updateStatusMessage(game, message.author.id)
      } else {
        const user = await message.author.createDM()
        await user.send('❌ That word is not in the word list!').catch(() => {})
      }
      return
    }

    // Valid guess - process it
    game.guesses.push(guess)
    game.currentGuess++
    game.messageIds.push(message.id)

    const result = checkGuess(game.word, guess)

    if (game.isChannelMode) {
      // Update the status message with all guesses
      await this.updateStatusMessage(game, message.author.id)
    } else {
      // DM mode - send to DM
      const user = await client.users.fetch(message.author.id)
      const dmChannel = await user.createDM()
      const embed = this.buildGameEmbed(game, message.author.id, result)
      await dmChannel.send({ embeds: [embed] })
    }

    // Check if won
    if (guess === game.word) {
      await this.endGame(game, true, message.author.id)
      return
    }

    // Check if lost
    if (game.currentGuess >= game.maxGuesses) {
      await this.endGame(game, false, message.author.id)
      return
    }
  },

  buildGameEmbed(game: WordleGame, userId: string, latestResult?: string): EmbedBuilder {
    const guessesDisplay = game.guesses.length > 0
      ? game.guesses.map((g, i) => {
          const result = checkGuess(game.word, g)
          return `${result}\n**${g}**`
        }).join('\n\n')
      : 'No guesses yet'

    const remainingGuesses = game.maxGuesses - game.currentGuess
    const statusText = game.currentGuess === 0
      ? `Game started! You have ${game.maxGuesses} guesses remaining.`
      : `Guess ${game.currentGuess}/${game.maxGuesses} - ${remainingGuesses} guess${remainingGuesses !== 1 ? 'es' : ''} remaining`

    const embed = new EmbedBuilder()
      .setTitle('🔤 Wordle Game')
      .setDescription(
        `<@${userId}>'s Wordle Game\n\n` +
        `**Status:** ${statusText}\n\n` +
        `**Guesses:**\n${guessesDisplay}`
      )
      .setColor(0x5865f2)
      .setTimestamp()

    // Add legend for the squares
    embed.addFields({
      name: 'Legend',
      value: '🟩 = Correct letter, correct position\n🟨 = Correct letter, wrong position\n⬛ = Letter not in word',
      inline: false
    })

    if (game.invalidAttempts.length > 0) {
      embed.addFields({
        name: 'Invalid Attempts',
        value: game.invalidAttempts.join(', '),
        inline: false
      })
    }

    return embed
  },

  async updateStatusMessage(game: WordleGame, userId: string): Promise<void> {
    if (!game.isChannelMode || !game.statusMessageId) return

    const client = getBotClient()!
    const channel = (await client.channels.fetch(game.channelId)) as TextChannel

    try {
      const statusMessage = await channel.messages.fetch(game.statusMessageId)
      const latestResult = game.guesses.length > 0 
        ? checkGuess(game.word, game.guesses[game.guesses.length - 1])
        : undefined
      const embed = this.buildGameEmbed(game, userId, latestResult)
      await statusMessage.edit({ embeds: [embed] })
    } catch (error) {
      // Status message might have been deleted, create a new one
      const latestResult = game.guesses.length > 0 
        ? checkGuess(game.word, game.guesses[game.guesses.length - 1])
        : undefined
      const embed = this.buildGameEmbed(game, userId, latestResult)
      const newMessage = await channel.send({ embeds: [embed] })
      game.statusMessageId = newMessage.id
      game.messageIds.push(newMessage.id)
    }
  },

  async endGame(game: WordleGame, won: boolean, userId: string): Promise<void> {
    const client = getBotClient()!
    const channel = (await client.channels.fetch(game.channelId)) as TextChannel

    // Record scoreboard
    if (won) {
      await scoreboardRepository.recordGameResult(game.guildId, userId, 'wordle', 'win')
    } else {
      await scoreboardRepository.recordGameResult(game.guildId, userId, 'wordle', 'loss')
    }

    // Set cooldown
    await wordleRepository.setCooldown(game.guildId, userId)

    if (game.isChannelMode) {
      // Channel mode - clear all messages and insult losers
      try {
        // Delete all tracked messages
        for (const messageId of game.messageIds) {
          try {
            const msg = await channel.messages.fetch(messageId).catch(() => null)
            if (msg) await msg.delete().catch(() => {})
          } catch (error) {
            // Message might already be deleted
          }
        }

        // Try to bulk delete recent messages (last 100)
        const messages = await channel.messages.fetch({ limit: 100 })
        const messagesToDelete = messages.filter(m => 
          m.author.id === userId || 
          m.author.id === client.user!.id ||
          game.messageIds.includes(m.id)
        )
        
        if (messagesToDelete.size > 0) {
          await channel.bulkDelete(messagesToDelete, true).catch(() => {
            // If bulk delete fails, delete individually
            messagesToDelete.forEach(m => m.delete().catch(() => {}))
          })
        }
      } catch (error) {
        console.error('Error clearing messages:', error)
      }

      // Update final status message
      if (game.statusMessageId) {
        try {
          const statusMessage = await channel.messages.fetch(game.statusMessageId)
          const finalEmbed = this.buildGameEmbed(game, userId)
          if (won) {
            finalEmbed.setTitle('🎉 Wordle - You Won!')
              .setDescription(
                `<@${userId}> guessed the word **${game.word}** in ${game.currentGuess} guess${game.currentGuess > 1 ? 'es' : ''}!\n\n` +
                `**All guesses:**\n${game.guesses.map((g, i) => {
                  const result = checkGuess(game.word, g)
                  return `**${g}**\n${result}`
                }).join('\n\n')}`
              )
              .setColor(0x4caf50)
          } else {
            finalEmbed.setTitle('💀 Wordle - You Lost!')
              .setDescription(
                `<@${userId}> failed to guess the word **${game.word}**!\n\n` +
                `**All guesses:**\n${game.guesses.map((g, i) => {
                  const result = checkGuess(game.word, g)
                  return `**${g}**\n${result}`
                }).join('\n\n')}`
              )
              .setColor(0xf44336)
          }
          await statusMessage.edit({ embeds: [finalEmbed] })
        } catch (error) {
          // Status message might have been deleted, send new one
        }
      }

      // Send final result with insults for losers
      if (won) {
        const embed = new EmbedBuilder()
          .setTitle('🎉 Wordle - You Won!')
          .setDescription(
            `<@${userId}> guessed the word **${game.word}** in ${game.currentGuess} guess${game.currentGuess > 1 ? 'es' : ''}!\n\n` +
            `**All guesses:**\n${game.guesses.map((g, i) => {
              const result = checkGuess(game.word, g)
              return `**${g}**\n${result}`
            }).join('\n\n')}`
          )
          .setColor(0x4caf50)
          .setTimestamp()

        await channel.send({ embeds: [embed] })
      } else {
        const insult = LOSER_INSULTS[Math.floor(Math.random() * LOSER_INSULTS.length)]
        const embed = new EmbedBuilder()
          .setTitle('💀 Wordle - You Lost!')
          .setDescription(
            `<@${userId}> failed to guess the word **${game.word}**!\n\n` +
            `**All guesses:**\n${game.guesses.map((g, i) => {
              const result = checkGuess(game.word, g)
              return `**${g}**\n${result}`
            }).join('\n\n')}\n\n` +
            `**${insult}**`
          )
          .setColor(0xf44336)
          .setTimestamp()

        await channel.send({ embeds: [embed] })
        await channel.send(`<@${userId}> ${insult}`)
      }
    } else {
      // DM mode - just send result
      const user = await client.users.fetch(userId)
      const dmChannel = await user.createDM()
      
      if (won) {
        const embed = new EmbedBuilder()
          .setTitle('🎉 Wordle - You Won!')
          .setDescription(
            `You guessed the word **${game.word}** in ${game.currentGuess} guess${game.currentGuess > 1 ? 'es' : ''}!\n\n` +
            `**All guesses:**\n${game.guesses.map((g, i) => {
              const result = checkGuess(game.word, g)
              return `**${g}**\n${result}`
            }).join('\n\n')}`
          )
          .setColor(0x4caf50)
          .setTimestamp()

        await dmChannel.send({ embeds: [embed] })
      } else {
        const embed = new EmbedBuilder()
          .setTitle('💀 Wordle - You Lost!')
          .setDescription(
            `You failed to guess the word **${game.word}**!\n\n` +
            `**All guesses:**\n${game.guesses.map((g, i) => {
              const result = checkGuess(game.word, g)
              return `**${g}**\n${result}`
            }).join('\n\n')}`
          )
          .setColor(0xf44336)
          .setTimestamp()

        await dmChannel.send({ embeds: [embed] })
      }
    }

    // Remove game
    activeGames.delete(`${game.guildId}-${userId}`)
  },
}

