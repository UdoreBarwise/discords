import {
  EmbedBuilder,
  TextChannel,
  ColorResolvable,
} from 'discord.js'
import { getBotClient } from '../bot/bot.js'

export interface EmbedData {
  title?: string
  description?: string
  color?: string
  footer?: string
  thumbnail?: string
  image?: string
  author?: {
    name?: string
    iconUrl?: string
    url?: string
  }
  fields?: Array<{
    name: string
    value: string
    inline?: boolean
  }>
  timestamp?: boolean
}

export const embedService = {
  async sendEmbed(
    guildId: string,
    channelId: string,
    embedData: EmbedData
  ): Promise<string> {
    const client = getBotClient()
    if (!client) {
      throw new Error('Bot client not initialized')
    }

    const guild = await client.guilds.fetch(guildId)
    const channel = (await guild.channels.fetch(
      channelId
    )) as TextChannel | null

    if (!channel) {
      throw new Error('Channel not found')
    }

    const embed = new EmbedBuilder()

    // Discord requires at least one of: title, description, or fields
    const hasTitle = embedData.title && embedData.title.trim().length > 0
    const hasDescription = embedData.description && embedData.description.trim().length > 0
    const hasFields = embedData.fields && embedData.fields.length > 0 && 
      embedData.fields.some(f => f.name.trim() && f.value.trim())

    if (!hasTitle && !hasDescription && !hasFields) {
      throw new Error('Embed must have at least a title, description, or fields')
    }

    // Validate Discord limits
    // Title: max 256 characters
    if (hasTitle && embedData.title!.length > 256) {
      throw new Error('Embed title cannot exceed 256 characters')
    }

    // Description: max 4096 characters
    if (hasDescription && embedData.description!.length > 4096) {
      throw new Error('Embed description cannot exceed 4096 characters')
    }

    // Fields: max 25 fields
    if (embedData.fields && embedData.fields.length > 25) {
      throw new Error('Embed cannot have more than 25 fields')
    }

    // Field name: max 256 characters, Field value: max 1024 characters
    if (embedData.fields) {
      for (const field of embedData.fields) {
        if (!field.name || field.name.trim().length === 0) {
          throw new Error('Field name cannot be empty')
        }
        if (!field.value || field.value.trim().length === 0) {
          throw new Error(`Field "${field.name.substring(0, 50)}" value cannot be empty`)
        }
        if (field.name.trim().length > 256) {
          throw new Error(`Field name "${field.name.substring(0, 50)}..." cannot exceed 256 characters`)
        }
        if (field.value.trim().length > 1024) {
          throw new Error(`Field value for "${field.name.substring(0, 50)}..." cannot exceed 1024 characters`)
        }
      }
    }

    // Footer: max 2048 characters
    if (embedData.footer && embedData.footer.length > 2048) {
      throw new Error('Embed footer cannot exceed 2048 characters')
    }

    // Author name: max 256 characters
    if (embedData.author?.name && embedData.author.name.length > 256) {
      throw new Error('Embed author name cannot exceed 256 characters')
    }

    // Total embed length: max 6000 characters
    let totalLength = 0
    if (hasTitle) totalLength += embedData.title!.length
    if (hasDescription) totalLength += embedData.description!.length
    if (embedData.fields) {
      totalLength += embedData.fields.reduce((sum, f) => sum + f.name.length + f.value.length, 0)
    }
    if (embedData.footer) totalLength += embedData.footer.length
    if (embedData.author?.name) totalLength += embedData.author.name.length
    
    if (totalLength > 6000) {
      throw new Error('Total embed content cannot exceed 6000 characters')
    }

    if (hasTitle) {
      embed.setTitle(embedData.title!)
    }

    if (hasDescription) {
      embed.setDescription(embedData.description!)
    } else if (!hasTitle && !hasFields) {
      // If no description and no title/fields, set a default description
      embed.setDescription('\u200b') // Zero-width space to satisfy Discord's requirement
    }

    if (embedData.color) {
      // Convert hex string to number (remove # if present)
      const colorHex = embedData.color.replace('#', '')
      const colorNum = parseInt(colorHex, 16)
      embed.setColor(colorNum as ColorResolvable)
    }

    if (embedData.footer) {
      embed.setFooter({ text: embedData.footer })
    }

    // Validate URLs for thumbnail and image (basic URL format check)
    const urlRegex = /^https?:\/\/.+/i
    
    if (embedData.thumbnail) {
      if (!urlRegex.test(embedData.thumbnail)) {
        throw new Error('Thumbnail must be a valid HTTP/HTTPS URL')
      }
      embed.setThumbnail(embedData.thumbnail)
    }

    if (embedData.image) {
      if (!urlRegex.test(embedData.image)) {
        throw new Error('Image must be a valid HTTP/HTTPS URL')
      }
      embed.setImage(embedData.image)
    }

    if (embedData.author) {
      embed.setAuthor({
        name: embedData.author.name,
        iconURL: embedData.author.iconUrl,
        url: embedData.author.url,
      })
    }

    if (embedData.fields && embedData.fields.length > 0) {
      embed.addFields(
        embedData.fields.map((field) => ({
          name: field.name,
          value: field.value,
          inline: field.inline || false,
        }))
      )
    }

    if (embedData.timestamp) {
      embed.setTimestamp()
    }

    try {
      const message = await channel.send({
        embeds: [embed],
      })

      return message.id
    } catch (error: any) {
      // Provide more specific error messages
      if (error.code === 50013) {
        throw new Error('Bot does not have permission to send messages in this channel')
      } else if (error.code === 50001) {
        throw new Error('Bot does not have access to this channel')
      } else if (error.code === 50035) {
        throw new Error('Invalid form body - check embed data format')
      } else if (error.message) {
        throw new Error(`Failed to send embed: ${error.message}`)
      } else {
        throw new Error('Failed to send embed: Unknown error')
      }
    }
  },
}

