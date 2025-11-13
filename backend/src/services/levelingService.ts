import { Message, MessageReaction, User } from 'discord.js'
import { levelingRepository, LevelingConfig, UserLevel, LeaderboardEntry, LevelRoleReward } from '../database/levelingRepository.js'
import { getBotClient } from '../bot/bot.js'
import { getActiveXPMultiplier, trackEventParticipation } from './eventService.js'

// Calculate level from XP using exponential formula: level = floor(sqrt(xp / 100))
function calculateLevel(xp: number): number {
  if (xp <= 0) return 0
  return Math.floor(Math.sqrt(xp / 100))
}

// Calculate required XP for a specific level
function calculateXPForLevel(level: number): number {
  if (level <= 0) return 0
  return Math.ceil(Math.pow(level, 2) * 100)
}

// Check if XP should be awarded based on channel/role filters
function shouldAwardXP(config: LevelingConfig, message: Message): boolean {
  if (!config.enabled) return false

  // Check if channel is whitelisted (if whitelist exists, only count in whitelisted channels)
  if (config.whitelistChannels.length > 0) {
    if (!config.whitelistChannels.includes(message.channel.id)) {
      return false
    }
  }

  // Check if channel is blacklisted
  if (config.blacklistChannels.includes(message.channel.id)) {
    return false
  }

  // Check role filters if user is a member
  if (message.member) {
    const userRoles = message.member.roles.cache.map(role => role.id)

    // Check if user has whitelisted role (if whitelist exists, only users with these roles gain XP)
    if (config.whitelistRoles.length > 0) {
      const hasWhitelistedRole = config.whitelistRoles.some(roleId => userRoles.includes(roleId))
      if (!hasWhitelistedRole) {
        return false
      }
    }

    // Check if user has blacklisted role
    const hasBlacklistedRole = config.blacklistRoles.some(roleId => userRoles.includes(roleId))
    if (hasBlacklistedRole) {
      return false
    }
  }

  return true
}

// Check if message meets cooldown and length requirements
function canAwardXPForMessage(config: LevelingConfig, userLevel: UserLevel | null): boolean {
  if (!userLevel) return true

  // Check cooldown
  if (userLevel.lastMessageAt) {
    const cooldownMs = config.messageCooldownSeconds * 1000
    const timeSinceLastMessage = Date.now() - userLevel.lastMessageAt.getTime()
    if (timeSinceLastMessage < cooldownMs) {
      return false
    }
  }

  return true
}

// Send level up notification
async function sendLevelUpNotification(
  guildId: string,
  userId: string,
  newLevel: number,
  config: LevelingConfig
): Promise<void> {
  if (!config.levelUpChannelId) return

  try {
    const botClient = getBotClient()
    if (!botClient) return

    const guild = await botClient.guilds.fetch(guildId)
    const channel = await guild.channels.fetch(config.levelUpChannelId)
    
    if (!channel || !channel.isTextBased()) return

    const user = await botClient.users.fetch(userId)
    const message = config.levelUpMessage || 
      `🎉 Congratulations <@${userId}>! You reached level ${newLevel}!`

    await channel.send(message.replace(/{user}/g, `<@${userId}>`).replace(/{level}/g, newLevel.toString()))
  } catch (error) {
    console.error('Error sending level up notification:', error)
  }
}

// Assign role rewards for level
async function assignRoleRewards(guildId: string, userId: string, level: number): Promise<void> {
  try {
    const rewards = await levelingRepository.getLevelRoleRewards(guildId)
    const rewardForLevel = rewards.find(r => r.level === level)
    
    if (!rewardForLevel) return

    const botClient = getBotClient()
    if (!botClient) return

    const guild = await botClient.guilds.fetch(guildId)
    const member = await guild.members.fetch(userId)
    const role = await guild.roles.fetch(rewardForLevel.roleId)

    if (role && member && !member.roles.cache.has(role.id)) {
      await member.roles.add(role)
    }
  } catch (error) {
    console.error('Error assigning role reward:', error)
  }
}

export const levelingService = {
  calculateLevel,
  calculateXPForLevel,

  async awardXPForMessage(guildId: string, userId: string, message: Message): Promise<boolean> {
    const config = await levelingRepository.getConfig(guildId)
    if (!config || !config.enabled) return false

    // Check if XP should be awarded based on filters
    if (!shouldAwardXP(config, message)) return false

    // Check message length
    if (message.content.length < config.minMessageLength) return false

    // Get current user level to check cooldown
    const userLevel = await levelingRepository.getUserLevel(guildId, userId)
    if (!canAwardXPForMessage(config, userLevel)) return false

    // Check for XP multiplier from active events
    const xpMultiplier = await getActiveXPMultiplier(guildId)
    const xpToAward = Math.floor(config.xpPerMessage * xpMultiplier)

    // Award XP
    const currentXP = userLevel ? userLevel.xp : 0
    const newXP = currentXP + xpToAward
    const oldLevel = userLevel ? userLevel.level : 0
    const newLevel = calculateLevel(newXP)

    // Track event participation for message events
    await trackEventParticipation(guildId, userId, 'social', 1).catch(() => {})

    await levelingRepository.addXP(guildId, userId, xpToAward, newLevel)

    // Check for level up
    if (newLevel > oldLevel) {
      await sendLevelUpNotification(guildId, userId, newLevel, config)
      await assignRoleRewards(guildId, userId, newLevel)
    }

    return true
  },

  async awardXPForReaction(guildId: string, userId: string, reaction: MessageReaction): Promise<boolean> {
    const config = await levelingRepository.getConfig(guildId)
    if (!config || !config.enabled) return false

    // Check if channel is whitelisted/blacklisted
    if (config.whitelistChannels.length > 0) {
      if (!config.whitelistChannels.includes(reaction.message.channel.id)) {
        return false
      }
    }
    if (config.blacklistChannels.includes(reaction.message.channel.id)) {
      return false
    }

    // Check role filters if message is in a guild
    if (reaction.message.guildId && reaction.message.member) {
      const userRoles = reaction.message.member.roles.cache.map(role => role.id)

      if (config.whitelistRoles.length > 0) {
        const hasWhitelistedRole = config.whitelistRoles.some(roleId => userRoles.includes(roleId))
        if (!hasWhitelistedRole) {
          return false
        }
      }

      const hasBlacklistedRole = config.blacklistRoles.some(roleId => userRoles.includes(roleId))
      if (hasBlacklistedRole) {
        return false
      }
    }

    // Check for XP multiplier from active events
    const xpMultiplier = await getActiveXPMultiplier(guildId)
    const xpToAward = Math.floor(config.xpPerReaction * xpMultiplier)

    // Award XP for reaction
    const userLevel = await levelingRepository.getUserLevel(guildId, userId)
    const currentXP = userLevel ? userLevel.xp : 0
    const newXP = currentXP + xpToAward
    const oldLevel = userLevel ? userLevel.level : 0
    const newLevel = calculateLevel(newXP)

    // Track event participation for social events
    await trackEventParticipation(guildId, userId, 'social', 1).catch(() => {})

    await levelingRepository.addXP(guildId, userId, xpToAward, newLevel, false)

    // Check for level up
    if (newLevel > oldLevel) {
      await sendLevelUpNotification(guildId, userId, newLevel, config)
      await assignRoleRewards(guildId, userId, newLevel)
    }

    return true
  },

  async getConfig(guildId: string): Promise<LevelingConfig | null> {
    return await levelingRepository.getConfig(guildId)
  },

  async saveConfig(config: LevelingConfig): Promise<void> {
    await levelingRepository.saveConfig(config)
  },

  async getUserLevel(guildId: string, userId: string): Promise<UserLevel | null> {
    return await levelingRepository.getUserLevel(guildId, userId)
  },

  async getLeaderboard(guildId: string, limit: number = 50): Promise<LeaderboardEntry[]> {
    return await levelingRepository.getLeaderboard(guildId, limit)
  },

  async getLevelRoleRewards(guildId: string): Promise<LevelRoleReward[]> {
    return await levelingRepository.getLevelRoleRewards(guildId)
  },

  async saveLevelRoleReward(guildId: string, level: number, roleId: string): Promise<void> {
    await levelingRepository.saveLevelRoleReward(guildId, level, roleId)
  },

  async deleteLevelRoleReward(guildId: string, level: number): Promise<void> {
    await levelingRepository.deleteLevelRoleReward(guildId, level)
  },
}

