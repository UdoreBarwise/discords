import Parser from 'rss-parser'
import { youtubeNotificationRepository } from '../database/youtubeNotificationRepository.js'
import { getBotClient } from '../bot/bot.js'

interface YouTubeVideo {
  id: string
  snippet: {
    title: string
    description: string
    publishedAt: string
    thumbnails: {
      high: {
        url: string
      }
    }
    channelTitle: string
  }
  contentDetails?: {
    duration: string
  }
}

interface YouTubeChannelInfo {
  id: string
  snippet: {
    title: string
  }
}

interface RSSFeedItem {
  title: string
  link: string
  pubDate: string
  contentSnippet?: string
  content?: string
  'media:thumbnail'?: {
    $: {
      url: string
    }
  }
  'yt:videoId'?: string
  'yt:channelId'?: string
}

const parser = new Parser({
  customFields: {
    item: [
      'media:thumbnail',
      'yt:videoId',
      'yt:channelId',
    ],
  },
})

export const youtubeNotificationService = {
  /**
   * Extract channel ID from various YouTube URL formats
   * Supports:
   * - Channel ID: UC... (24 chars)
   * - Channel URL: youtube.com/channel/UC...
   * - Handle URL: youtube.com/@handle (requires fetching channel page)
   * - Custom URL: youtube.com/c/name or youtube.com/user/name
   */
  async resolveChannelId(input: string): Promise<string | null> {
    try {
      // If it's already a channel ID (starts with UC), return it
      if (input.startsWith('UC') && input.length === 24) {
        return input
      }

      // Extract from channel URL: youtube.com/channel/UC...
      const channelMatch = input.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]+)/)
      if (channelMatch) {
        const channelId = channelMatch[1]
        // Validate it's a proper channel ID
        if (channelId.startsWith('UC') && channelId.length === 24) {
          return channelId
        }
      }

      // Extract from handle URL: youtube.com/@handle
      const handleMatch = input.match(/youtube\.com\/@([^/?]+)/)
      if (handleMatch) {
        const handle = handleMatch[1]
        // Try to get channel ID by fetching the channel's RSS feed
        // YouTube doesn't provide direct RSS for handles, so we need to fetch the channel page
        // For now, we'll try to fetch the channel page HTML and extract the channel ID
        try {
          const response = await fetch(`https://www.youtube.com/@${handle}`)
          const html = await response.text()
          // Extract channel ID from the page HTML (look for "channelId" or "externalId")
          const channelIdMatch = html.match(/"channelId":"([^"]+)"/) || html.match(/"externalId":"([^"]+)"/)
          if (channelIdMatch && channelIdMatch[1].startsWith('UC') && channelIdMatch[1].length === 24) {
            return channelIdMatch[1]
          }
        } catch (error) {
          throw new Error(`Could not resolve handle @${handle}. Please provide the channel ID (UC...) or channel URL instead.`)
        }
      }

      // Extract from custom URL: youtube.com/c/name or youtube.com/user/name
      const customMatch = input.match(/youtube\.com\/(?:c|user)\/([^/?]+)/)
      if (customMatch) {
        const customName = customMatch[1]
        // Try to fetch the channel page and extract ID
        try {
          const response = await fetch(`https://www.youtube.com/c/${customName}`)
          const html = await response.text()
          const channelIdMatch = html.match(/"channelId":"([^"]+)"/) || html.match(/"externalId":"([^"]+)"/)
          if (channelIdMatch && channelIdMatch[1].startsWith('UC') && channelIdMatch[1].length === 24) {
            return channelIdMatch[1]
          }
        } catch (error) {
          throw new Error(`Could not resolve custom URL. Please provide the channel ID (UC...) or channel URL instead.`)
        }
      }

      // If input is just a handle (starts with @)
      if (input.startsWith('@')) {
        const handle = input.substring(1)
        try {
          const response = await fetch(`https://www.youtube.com/@${handle}`)
          const html = await response.text()
          const channelIdMatch = html.match(/"channelId":"([^"]+)"/) || html.match(/"externalId":"([^"]+)"/)
          if (channelIdMatch && channelIdMatch[1].startsWith('UC') && channelIdMatch[1].length === 24) {
            return channelIdMatch[1]
          }
        } catch (error) {
          throw new Error(`Could not resolve handle @${handle}. Please provide the channel ID (UC...) or channel URL instead.`)
        }
      }

      // If input looks like it might be a channel ID but doesn't start with UC, try it anyway
      if (input.length === 24 && /^[a-zA-Z0-9_-]+$/.test(input)) {
        return input
      }

      throw new Error('Could not resolve channel ID. Please provide a valid channel ID (UC...), channel URL, or handle URL.')
    } catch (error: any) {
      console.error('Error resolving YouTube channel ID:', error.message)
      throw error
    }
  },

  /**
   * Get channel info from RSS feed
   */
  async getChannelInfo(channelId: string): Promise<YouTubeChannelInfo | null> {
    try {
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
      const feed = await parser.parseURL(rssUrl)
      
      if (feed.title) {
        return {
          id: channelId,
          snippet: {
            title: feed.title,
          },
        }
      }
      return null
    } catch (error: any) {
      console.error('Error fetching channel info:', error.message)
      throw new Error(`Failed to fetch channel info: ${error.message}`)
    }
  },

  /**
   * Get latest video from RSS feed
   */
  async getLatestVideo(channelId: string): Promise<YouTubeVideo | null> {
    try {
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
      const feed = await parser.parseURL(rssUrl)

      if (!feed.items || feed.items.length === 0) {
        return null
      }

      const latestItem = feed.items[0] as any
      
      // Extract video ID from link (YouTube RSS links are like: https://www.youtube.com/watch?v=VIDEO_ID)
      let videoId = ''
      if (latestItem.link) {
        const videoIdMatch = latestItem.link.match(/[?&]v=([a-zA-Z0-9_-]+)/)
        if (videoIdMatch) {
          videoId = videoIdMatch[1]
        }
      }
      
      // Fallback: try to get from yt:videoId if available
      if (!videoId && latestItem['yt:videoId']) {
        videoId = latestItem['yt:videoId']
      }

      if (!videoId) {
        return null
      }

      // Extract thumbnail URL
      let thumbnailUrl = ''
      if (latestItem['media:thumbnail'] && latestItem['media:thumbnail'].$) {
        thumbnailUrl = latestItem['media:thumbnail'].$.url
      } else {
        // Fallback: construct thumbnail URL from video ID
        thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }

      // Extract description
      let description = ''
      if (latestItem.contentSnippet) {
        description = latestItem.contentSnippet
      } else if (latestItem.content) {
        // Remove HTML tags if present
        description = latestItem.content.replace(/<[^>]*>/g, '').trim()
      }

      return {
        id: videoId,
        snippet: {
          title: latestItem.title || '',
          description: description,
          publishedAt: latestItem.pubDate || new Date().toISOString(),
          thumbnails: {
            high: {
              url: thumbnailUrl,
            },
          },
          channelTitle: feed.title || '',
        },
      }
    } catch (error: any) {
      console.error('Error fetching latest video:', error.message)
      throw new Error(`Failed to fetch latest video: ${error.message}`)
    }
  },

  formatDuration(duration: string): string {
    // ISO 8601 duration format (PT4M13S)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return duration

    const hours = parseInt(match[1] || '0')
    const minutes = parseInt(match[2] || '0')
    const seconds = parseInt(match[3] || '0')

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  },

  async checkAndNotify(guildId: string): Promise<void> {
    const config = await youtubeNotificationRepository.getConfig(guildId)
    if (!config || !config.enabled || !config.channelId) {
      return
    }

    const channels = await youtubeNotificationRepository.getChannels(guildId)
    if (channels.length === 0) {
      return
    }

    for (const youtubeChannel of channels) {
      try {
        const latestVideo = await youtubeNotificationService.getLatestVideo(youtubeChannel.youtubeChannelId)
        if (!latestVideo) {
          continue
        }

        const videoId = latestVideo.id
        const lastVideoId = youtubeChannel.lastVideoId

        // If this is a new video
        if (!lastVideoId || videoId !== lastVideoId) {
          // Update last checked
          await youtubeNotificationRepository.updateLastChecked(guildId, youtubeChannel.youtubeChannelId, videoId)

          // Send notification - just the video URL
          const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
          
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

          await discordChannel.send(videoUrl)

          console.log(`Sent YouTube notification for ${latestVideo.snippet.channelTitle} - ${latestVideo.snippet.title}`)
        }
      } catch (error: any) {
        console.error(`Error checking YouTube channel ${youtubeChannel.youtubeChannelId} for guild ${guildId}:`, error.message)
        // Continue with other channels
      }
    }
  },

  async startPolling(): Promise<void> {
    const pollInterval = 60000 // Check every minute
    const intervals = new Map<string, NodeJS.Timeout>()

    const checkGuild = async (guildId: string) => {
      try {
        const config = await youtubeNotificationRepository.getConfig(guildId)
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
        const channels = await youtubeNotificationRepository.getChannels(guildId)
        if (channels.length === 0) {
          return
        }

        // Check if any channel needs to be checked
        const now = new Date()
        const intervalMs = config.checkIntervalMinutes * 60 * 1000

        for (const channel of channels) {
          if (!channel.lastCheckedAt) {
            // First check, do it now
            await this.checkAndNotify(guildId)
            break
          } else {
            const timeSinceLastCheck = now.getTime() - channel.lastCheckedAt.getTime()
            if (timeSinceLastCheck >= intervalMs) {
              await this.checkAndNotify(guildId)
              break
            }
          }
        }
      } catch (error: any) {
        console.error(`Error in YouTube polling for guild ${guildId}:`, error.message)
      }
    }

    // Initial check and setup intervals
    const setupIntervals = async () => {
      const enabledGuilds = await youtubeNotificationRepository.getAllEnabledGuilds()
      
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
    
    console.log('YouTube notification polling service started (using RSS feeds)')
  },
}
