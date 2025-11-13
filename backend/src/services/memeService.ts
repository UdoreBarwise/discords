import axios from 'axios'
import { Message, TextChannel } from 'discord.js'
import { getBotClient } from '../bot/bot.js'
import { memeRepository } from '../database/memeRepository.js'

interface RedditPost {
  data: {
    title: string
    url: string
    permalink: string
    post_hint?: string
    is_video: boolean
    over_18: boolean
  }
}

interface RedditResponse {
  data: {
    children: RedditPost[]
  }
}

// Dark humor subreddits (with fallbacks)
const DARK_MEME_SUBREDDITS = [
  'darkjokes',
  'darkfunny',
  'darkhumor',
  'dankmemes',
  'edgymemes',
]

export const memeService = {
  async getRandomDarkMeme(): Promise<{ title: string; url: string; permalink: string } | null> {
    // Try each subreddit until one works
    const shuffledSubreddits = [...DARK_MEME_SUBREDDITS].sort(() => Math.random() - 0.5)
    
    for (const subreddit of shuffledSubreddits) {
      try {
        // Fetch posts from Reddit (no API key needed for public data)
        // Reddit requires a proper User-Agent to avoid 403 errors
        const response = await axios.get<RedditResponse>(
          `https://www.reddit.com/r/${subreddit}/hot.json?limit=100`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'application/json',
              'Accept-Language': 'en-US,en;q=0.9',
            },
            timeout: 10000,
          }
        )

        const posts = response.data.data.children
          .filter(post => {
            // Filter for image posts only (not videos or text posts)
            return post.data.post_hint === 'image' && 
                   !post.data.is_video &&
                   post.data.url &&
                   (post.data.url.endsWith('.jpg') || 
                    post.data.url.endsWith('.jpeg') || 
                    post.data.url.endsWith('.png') || 
                    post.data.url.endsWith('.gif') ||
                    post.data.url.includes('i.redd.it') ||
                    post.data.url.includes('imgur.com'))
          })
          .map(post => ({
            title: post.data.title,
            url: post.data.url,
            permalink: `https://reddit.com${post.data.permalink}`,
          }))

        if (posts.length > 0) {
          // Return a random post from this subreddit
          return posts[Math.floor(Math.random() * posts.length)]
        }
      } catch (error: any) {
        // If 403 or other error, try next subreddit
        if (error.response?.status === 403) {
          console.error(`Error fetching meme from r/${subreddit}: 403 Forbidden - trying next subreddit`)
        } else {
          console.error(`Error fetching meme from r/${subreddit}:`, error.message)
        }
        // Continue to next subreddit
        continue
      }
    }
    
    // If all subreddits failed, return null
    console.error('Failed to fetch meme from all subreddits')
    return null
  },

  async sendMeme(guildId: string, channelId: string): Promise<void> {
    const botClient = getBotClient()
    if (!botClient) {
      throw new Error('Bot client not initialized')
    }

    const guild = botClient.guilds.cache.get(guildId)
    if (!guild) {
      throw new Error('Guild not found')
    }

    const channel = guild.channels.cache.get(channelId)
    if (!channel || !channel.isTextBased()) {
      throw new Error('Channel not found or not a text channel')
    }

    const meme = await this.getRandomDarkMeme()
    if (!meme) {
      throw new Error('Failed to fetch meme')
    }

    await channel.send({
      content: `**${meme.title}**\n${meme.url}`,
    })
  },

  async handleMemeCommand(message: Message): Promise<void> {
    if (!message.guildId) {
      await message.reply('❌ This command only works in servers.')
      return
    }

    const config = await memeRepository.get(message.guildId)
    if (!config || !config.enabled) {
      await message.reply('❌ Meme feature is not enabled for this server.')
      return
    }

    // Check if channel is configured and matches
    if (config.channelId && message.channelId !== config.channelId) {
      await message.reply(`❌ Memes can only be requested in <#${config.channelId}>`)
      return
    }

    // Ensure we're in a text channel
    if (!message.channel.isTextBased()) {
      return
    }

    const channel = message.channel as TextChannel

    try {
      // Send the meme first
      const meme = await this.getRandomDarkMeme()
      if (!meme) {
        // Send error message first
        const errorMsg = await channel.send('❌ Failed to fetch a meme. Try again later.')
        
        // Delete the command message if auto-delete is enabled
        if (config.autoDeleteMessages) {
          try {
            await message.delete()
          } catch (error) {
            // Ignore deletion errors (might not have permission)
            console.error('Failed to delete message:', error)
          }
        }
        
        // Delete error message after a short delay
        setTimeout(async () => {
          try {
            await errorMsg.delete()
          } catch (error) {
            // Ignore deletion errors
          }
        }, 5000)
        return
      }

      // Send the meme
      await channel.send({
        content: `**${meme.title}**\n${meme.url}`,
      })

      // Delete the command message if auto-delete is enabled (after sending meme)
      if (config.autoDeleteMessages) {
        try {
          await message.delete()
        } catch (error) {
          // Ignore deletion errors (might not have permission)
          console.error('Failed to delete message:', error)
        }
      }
    } catch (error: any) {
      console.error('Error handling meme command:', error)
      // Send error message without replying (message might be deleted)
      try {
        const errorMsg = await channel.send(`❌ Error: ${error.message}`)
        
        // Delete the command message if auto-delete is enabled
        if (config.autoDeleteMessages) {
          try {
            await message.delete()
          } catch (deleteError) {
            // Ignore deletion errors
          }
        }
        
        // Delete error message after a short delay
        setTimeout(async () => {
          try {
            await errorMsg.delete()
          } catch (deleteError) {
            // Ignore deletion errors
          }
        }, 5000)
      } catch (sendError) {
        // If we can't send error message, just log it
        console.error('Failed to send error message:', sendError)
      }
    }
  },

  async handleMessageDelete(message: Message): Promise<void> {
    if (!message.guildId) {
      return
    }

    const config = await memeRepository.get(message.guildId)
    if (!config || !config.enabled || !config.autoDeleteMessages) {
      return
    }

    // Only delete messages in the configured meme channel
    if (config.channelId && message.channelId === config.channelId) {
      // Don't delete bot messages or messages that are commands
      if (message.author.bot || message.content.startsWith('!')) {
        return
      }

      try {
        await message.delete()
      } catch (error) {
        // Ignore deletion errors
        console.error('Failed to auto-delete message:', error)
      }
    }
  },

  async startAutoPosting(): Promise<void> {
    const checkInterval = 60000 // Check every minute
    const intervals = new Map<string, NodeJS.Timeout>()

    const checkGuild = async (guildId: string) => {
      try {
        const config = await memeRepository.get(guildId)
        if (!config || !config.enabled || !config.autoPostEnabled || !config.channelId) {
          // Clear interval if disabled
          const existingInterval = intervals.get(guildId)
          if (existingInterval) {
            clearInterval(existingInterval)
            intervals.delete(guildId)
          }
          return
        }

        const now = new Date()
        const intervalMs = config.autoPostIntervalHours * 60 * 60 * 1000

        // Check if it's time to post
        if (!config.lastAutoPostAt) {
          // First post, do it now
          await this.sendMeme(guildId, config.channelId)
          await memeRepository.updateLastAutoPost(guildId)
        } else {
          const timeSinceLastPost = now.getTime() - config.lastAutoPostAt.getTime()
          if (timeSinceLastPost >= intervalMs) {
            await this.sendMeme(guildId, config.channelId)
            await memeRepository.updateLastAutoPost(guildId)
          }
        }
      } catch (error: any) {
        console.error(`Error in meme auto-posting for guild ${guildId}:`, error.message)
      }
    }

    // Initial check and setup intervals
    const setupIntervals = async () => {
      const enabledGuilds = await memeRepository.getAllEnabledGuilds()
      
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
          const interval = setInterval(() => checkGuild(guildId), checkInterval)
          intervals.set(guildId, interval)
        }
      }
    }

    // Run setup every 5 minutes to catch new configurations
    setInterval(setupIntervals, 5 * 60 * 1000)
    
    // Initial setup
    await setupIntervals()
    
    console.log('Meme auto-posting service started')
  },
}

