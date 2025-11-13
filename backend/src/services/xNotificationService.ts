import Parser from 'rss-parser'
import { xNotificationRepository } from '../database/xNotificationRepository.js'
import { getBotClient } from '../bot/bot.js'

interface XTweet {
  id: string
  text: string
  url: string
  createdAt: string
  author: string
}

interface RSSFeedItem {
  title: string
  link: string
  pubDate: string
  contentSnippet?: string
  content?: string
  author?: string
}

const parser = new Parser()

export const xNotificationService = {
  /**
   * Extract username from various X/Twitter URL formats
   * Supports:
   * - Username: @username or username
   * - Profile URL: twitter.com/username or x.com/username
   */
  async resolveUsername(input: string): Promise<string> {
    try {
      // Remove @ if present
      let username = input.replace(/^@/, '').trim()

      // Extract from URL: twitter.com/username or x.com/username
      const urlMatch = input.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/)
      if (urlMatch) {
        username = urlMatch[1]
      }

      // Validate username format (alphanumeric and underscores only, 1-15 chars)
      if (!/^[a-zA-Z0-9_]{1,15}$/.test(username)) {
        throw new Error('Invalid X username format')
      }

      return username.toLowerCase()
    } catch (error: any) {
      console.error('Error resolving X username:', error.message)
      throw new Error(`Failed to resolve username: ${error.message}`)
    }
  },

  /**
   * Get account info from RSS feed (using Nitter or similar service)
   */
  async getAccountInfo(username: string): Promise<{ username: string; displayName: string | null }> {
    try {
      // Try multiple Nitter instances for reliability
      const nitterInstances = [
        'https://nitter.net',
        'https://nitter.it',
        'https://nitter.pussthecat.org',
      ]

      for (const instance of nitterInstances) {
        try {
          const rssUrl = `${instance}/${username}/rss`
          const feed = await parser.parseURL(rssUrl)

          if (feed.title) {
            // Extract display name from title (usually "Display Name (@username)")
            const titleMatch = feed.title.match(/^(.+?)\s*\(@/)
            const displayName = titleMatch ? titleMatch[1].trim() : feed.title

            return {
              username: username.toLowerCase(),
              displayName,
            }
          }
        } catch (error) {
          // Try next instance
          continue
        }
      }

      // If all instances fail, return basic info
      return {
        username: username.toLowerCase(),
        displayName: null,
      }
    } catch (error: any) {
      console.error('Error fetching account info:', error.message)
      // Return basic info even if fetch fails
      return {
        username: username.toLowerCase(),
        displayName: null,
      }
    }
  },

  /**
   * Get latest tweet from RSS feed
   */
  async getLatestTweet(username: string): Promise<XTweet | null> {
    try {
      // Try multiple Nitter instances for reliability
      const nitterInstances = [
        'https://nitter.net',
        'https://nitter.it',
        'https://nitter.pussthecat.org',
      ]

      for (const instance of nitterInstances) {
        try {
          const rssUrl = `${instance}/${username}/rss`
          const feed = await parser.parseURL(rssUrl)

          if (!feed.items || feed.items.length === 0) {
            continue // Try next instance
          }

          const latestItem = feed.items[0] as RSSFeedItem

          // Extract tweet ID from link
          // Nitter links are like: https://nitter.net/username/status/1234567890
          let tweetId = ''
          if (latestItem.link) {
            const tweetIdMatch = latestItem.link.match(/\/status\/(\d+)/)
            if (tweetIdMatch) {
              tweetId = tweetIdMatch[1]
            } else {
              // Fallback: use a hash of the link
              tweetId = latestItem.link.split('/').pop() || latestItem.link
            }
          }

          if (!tweetId) {
            continue // Try next instance
          }

          // Extract text
          const text = latestItem.title || latestItem.contentSnippet || latestItem.content || ''

          // Create X.com URL
          const tweetUrl = `https://x.com/${username}/status/${tweetId}`

          return {
            id: tweetId,
            text: text.replace(/<[^>]*>/g, '').trim(), // Remove HTML tags
            url: tweetUrl,
            createdAt: latestItem.pubDate || new Date().toISOString(),
            author: username,
          }
        } catch (error) {
          // Try next instance
          continue
        }
      }

      // If all instances fail
      return null
    } catch (error: any) {
      console.error('Error fetching latest tweet:', error.message)
      throw new Error(`Failed to fetch latest tweet: ${error.message}`)
    }
  },

  async checkAndNotify(guildId: string): Promise<void> {
    const config = await xNotificationRepository.getConfig(guildId)
    if (!config || !config.enabled || !config.channelId) {
      return
    }

    const accounts = await xNotificationRepository.getAccounts(guildId)
    if (accounts.length === 0) {
      return
    }

    for (const xAccount of accounts) {
      try {
        const latestTweet = await xNotificationService.getLatestTweet(xAccount.xUsername)
        if (!latestTweet) {
          continue
        }

        const tweetId = latestTweet.id
        const lastTweetId = xAccount.lastTweetId

        // If this is a new tweet
        if (!lastTweetId || tweetId !== lastTweetId) {
          // Update last checked
          await xNotificationRepository.updateLastChecked(guildId, xAccount.xUsername, tweetId)

          // Send notification
          const botClient = getBotClient()
          if (!botClient) {
            throw new Error('Bot client not initialized')
          }

          const guild = botClient.guilds.cache.get(guildId)
          if (!guild) {
            throw new Error('Guild not found')
          }

          const discordChannel = guild.channels.cache.get(config.channelId)
          if (!discordChannel || !discordChannel.isTextBased()) {
            throw new Error('Channel not found or not a text channel')
          }

          await discordChannel.send(latestTweet.url)

          console.log(`Sent X notification for @${xAccount.xUsername} - ${tweetId}`)
        }
      } catch (error: any) {
        console.error(`Error checking X account @${xAccount.xUsername} for guild ${guildId}:`, error.message)
        // Continue with other accounts
      }
    }
  },

  async startPolling(): Promise<void> {
    const pollInterval = 60000 // Check every minute
    const intervals = new Map<string, NodeJS.Timeout>()

    const checkGuild = async (guildId: string) => {
      try {
        const config = await xNotificationRepository.getConfig(guildId)
        if (!config || !config.enabled) {
          // Clear interval if disabled
          const existingInterval = intervals.get(guildId)
          if (existingInterval) {
            clearInterval(existingInterval)
            intervals.delete(guildId)
          }
          return
        }

        // Check if it's time to poll based on interval
        const accounts = await xNotificationRepository.getAccounts(guildId)
        if (accounts.length === 0) {
          return
        }

        // Check if any account needs to be checked
        const now = new Date()
        const intervalMs = config.checkIntervalMinutes * 60 * 1000

        for (const account of accounts) {
          if (!account.lastCheckedAt) {
            // First check, do it now
            await this.checkAndNotify(guildId)
            break
          } else {
            const timeSinceLastCheck = now.getTime() - account.lastCheckedAt.getTime()
            if (timeSinceLastCheck >= intervalMs) {
              await this.checkAndNotify(guildId)
              break
            }
          }
        }
      } catch (error: any) {
        console.error(`Error in X polling for guild ${guildId}:`, error.message)
      }
    }

    // Initial check and setup intervals
    const setupIntervals = async () => {
      const enabledGuilds = await xNotificationRepository.getAllEnabledGuilds()

      // Clear old intervals for guilds that are no longer enabled
      for (const [guildId, interval] of intervals.entries()) {
        if (!enabledGuilds.includes(guildId)) {
          clearInterval(interval)
          intervals.delete(guildId)
        }
      }

      // Setup intervals for enabled guilds
      for (const guildId of enabledGuilds) {
        if (!intervals.has(guildId)) {
          // Initial check
          await checkGuild(guildId)

          // Set up interval
          const interval = setInterval(() => checkGuild(guildId), pollInterval)
          intervals.set(guildId, interval)
        }
      }
    }

    // Run setup every 5 minutes to catch new configurations
    setInterval(setupIntervals, 5 * 60 * 1000)

    // Initial setup
    await setupIntervals()

    console.log('X notification polling service started (using RSS feeds via Nitter)')
  },
}


