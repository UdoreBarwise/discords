import { Message } from 'discord.js'
import { autoModeratorRepository, AutoModeratorConfig } from '../database/autoModeratorRepository.js'

// Default word lists based on severity - focused on racist and offensive language
const DEFAULT_BLACKLIST_LOW = [
  'kaffer', 'kaffir', 'nigger', 'nigga', 'n1gger', 'n1gga',
]

const DEFAULT_BLACKLIST_MEDIUM = [
  ...DEFAULT_BLACKLIST_LOW,
  'niglet', 'nigglet', 'coon', 'spic', 'wetback', 'chink',
  'gook', 'jap', 'kike', 'kyke', 'yid', 'towelhead',
  'sandnigger', 'sandn1gger', 'raghead', 'paki', 'p@ki',
]

const DEFAULT_BLACKLIST_HIGH = [
  ...DEFAULT_BLACKLIST_MEDIUM,
]

function getDefaultBlacklist(severity: 'low' | 'medium' | 'high'): string[] {
  switch (severity) {
    case 'low':
      return DEFAULT_BLACKLIST_LOW
    case 'medium':
      return DEFAULT_BLACKLIST_MEDIUM
    case 'high':
      return DEFAULT_BLACKLIST_HIGH
    default:
      return DEFAULT_BLACKLIST_MEDIUM
  }
}

function normalizeWord(word: string): string {
  return word.toLowerCase().trim()
}

function checkWordInMessage(message: string, word: string): boolean {
  const normalizedMessage = normalizeWord(message)
  const normalizedWord = normalizeWord(word)
  
  // Check for exact word match (word boundaries)
  const wordRegex = new RegExp(`\\b${normalizedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
  return wordRegex.test(normalizedMessage)
}

function shouldModerate(config: AutoModeratorConfig, message: Message): boolean {
  // Check if user is whitelisted
  if (config.whitelistUsers.includes(message.author.id)) {
    return false
  }

  // Check if user is blacklisted (always moderate)
  if (config.blacklistUsers.includes(message.author.id)) {
    return true
  }

  // Check if channel is whitelisted
  if (config.whitelistChannels.includes(message.channel.id)) {
    return false
  }

  // Check if channel is blacklisted
  if (config.blacklistChannels.includes(message.channel.id)) {
    return true
  }

  // Check if user has whitelisted role
  if (message.member) {
    const userRoles = message.member.roles.cache.map(role => role.id)
    const hasWhitelistedRole = config.whitelistRoles.some(roleId => userRoles.includes(roleId))
    if (hasWhitelistedRole) {
      return false
    }

    // Check if user has blacklisted role
    const hasBlacklistedRole = config.blacklistRoles.some(roleId => userRoles.includes(roleId))
    if (hasBlacklistedRole) {
      return true
    }
  }

  // Check message content against word lists
  const messageContent = message.content.toLowerCase()

  // If word is whitelisted, don't moderate
  for (const word of config.whitelistWords) {
    if (checkWordInMessage(message.content, word)) {
      return false
    }
  }

  // Get default blacklist based on severity
  const defaultBlacklist = getDefaultBlacklist(config.severityLevel)
  const allBlacklistWords = [...defaultBlacklist, ...config.blacklistWords]

  // Check against blacklist
  for (const word of allBlacklistWords) {
    if (checkWordInMessage(message.content, word)) {
      return true
    }
  }

  return false
}

async function logViolation(config: AutoModeratorConfig, message: Message, reason: string): Promise<void> {
  if (!config.logChannelId) return

  try {
    const channel = await message.client.channels.fetch(config.logChannelId)
    if (!channel || !channel.isTextBased()) return

    await channel.send({
      embeds: [{
        title: 'Auto Moderation Action',
        color: 0xff0000,
        fields: [
          { name: 'User', value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
          { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
          { name: 'Reason', value: reason, inline: false },
          { name: 'Action', value: config.actionOnViolation, inline: true },
          { name: 'Message Content', value: message.content.substring(0, 1000) || '(empty)', inline: false },
        ],
        timestamp: new Date().toISOString(),
      }],
    })
  } catch (error) {
    console.error('Error logging moderation action:', error)
  }
}

async function executeAction(config: AutoModeratorConfig, message: Message, reason: string): Promise<void> {
  const member = message.member
  if (!member) return

  try {
    switch (config.actionOnViolation) {
      case 'delete':
        await message.delete()
        if (config.warnOnViolation) {
          await message.channel.send(`⚠️ <@${message.author.id}> Your message was removed: ${reason}`)
            .then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000))
            .catch(() => {})
        }
        break

      case 'warn':
        await message.delete()
        await message.channel.send(`⚠️ <@${message.author.id}> Warning: ${reason}`)
          .then(msg => setTimeout(() => msg.delete().catch(() => {}), 10000))
          .catch(() => {})
        break

      case 'timeout':
        await message.delete()
        if (member.moderatable) {
          await member.timeout(15 * 60 * 1000, `Auto moderation: ${reason}`) // 15 minutes
          await message.channel.send(`⏱️ <@${message.author.id}> has been timed out for 15 minutes: ${reason}`)
            .then(msg => setTimeout(() => msg.delete().catch(() => {}), 10000))
            .catch(() => {})
        }
        break

      case 'kick':
        await message.delete()
        if (member.kickable) {
          await member.kick(`Auto moderation: ${reason}`)
          await message.channel.send(`👢 <@${message.author.id}> has been kicked: ${reason}`)
            .then(msg => setTimeout(() => msg.delete().catch(() => {}), 10000))
            .catch(() => {})
        }
        break

      case 'ban':
        await message.delete()
        if (member.bannable) {
          await member.ban({ reason: `Auto moderation: ${reason}` })
          await message.channel.send(`🔨 <@${message.author.id}> has been banned: ${reason}`)
            .then(msg => setTimeout(() => msg.delete().catch(() => {}), 10000))
            .catch(() => {})
        }
        break
    }
  } catch (error) {
    console.error('Error executing moderation action:', error)
  }
}

export const autoModeratorService = {
  async checkMessage(message: Message): Promise<boolean> {
    if (!message.guildId) return false

    const config = await autoModeratorRepository.getConfig(message.guildId)
    if (!config || !config.enabled) return false

    // Check if message should be moderated
    const shouldMod = shouldModerate(config, message)
    if (!shouldMod) return false

    // Determine reason
    const messageContent = message.content.toLowerCase()
    const defaultBlacklist = getDefaultBlacklist(config.severityLevel)
    const allBlacklistWords = [...defaultBlacklist, ...config.blacklistWords]
    
    let matchedWord = ''
    for (const word of allBlacklistWords) {
      if (checkWordInMessage(message.content, word)) {
        matchedWord = word
        break
      }
    }

    const reason = matchedWord 
      ? `Violated word filter: "${matchedWord}"`
      : 'Violated moderation rules'

    // Execute action
    await executeAction(config, message, reason)

    // Log violation
    await logViolation(config, message, reason)

    return true
  },

  async getConfig(guildId: string): Promise<AutoModeratorConfig | null> {
    return await autoModeratorRepository.getConfig(guildId)
  },

  async saveConfig(config: AutoModeratorConfig): Promise<void> {
    await autoModeratorRepository.saveConfig(config)
  },
}

