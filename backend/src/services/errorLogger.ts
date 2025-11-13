import { botConfigRepository } from '../database/botConfigRepository.js'

interface DiscordEmbed {
  title?: string
  description?: string
  color?: number
  fields?: Array<{
    name: string
    value: string
    inline?: boolean
  }>
  timestamp?: string
  footer?: {
    text: string
  }
}

interface DiscordWebhookPayload {
  content?: string
  embeds?: DiscordEmbed[]
  username?: string
}

export const errorLogger = {
  async logError(error: Error | string, context?: Record<string, any>): Promise<void> {
    try {
      const webhookUrl = await botConfigRepository.get('error_webhook_url')
      if (!webhookUrl) {
        // Webhook not configured, silently skip
        return
      }

      const errorMessage = typeof error === 'string' ? error : error.message
      const errorStack = typeof error === 'string' ? undefined : error.stack

      const embed: DiscordEmbed = {
        title: 'Bot Error',
        description: `\`\`\`${errorMessage}\`\`\``,
        color: 0xff0000, // Red
        timestamp: new Date().toISOString(),
        footer: {
          text: 'KaasBot Error Logger',
        },
      }

      if (errorStack) {
        // Truncate stack trace if too long
        const truncatedStack = errorStack.length > 1000 ? errorStack.substring(0, 1000) + '...' : errorStack
        embed.fields = [
          {
            name: 'Stack Trace',
            value: `\`\`\`${truncatedStack}\`\`\``,
            inline: false,
          },
        ]
      }

      if (context && Object.keys(context).length > 0) {
        const contextFields = Object.entries(context).map(([key, value]) => ({
          name: key,
          value: typeof value === 'string' ? value : JSON.stringify(value, null, 2),
          inline: true,
        }))
        embed.fields = [...(embed.fields || []), ...contextFields]
      }

      const payload: DiscordWebhookPayload = {
        embeds: [embed],
        username: 'KaasBot Error Logger',
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        console.error(`Failed to send error to webhook: ${response.status} ${response.statusText}`)
      }
    } catch (logError) {
      // Don't throw - we don't want error logging to break the app
      console.error('Failed to log error to Discord webhook:', logError)
    }
  },

  async logAIError(
    error: Error | string,
    provider: string,
    model: string,
    userMessage?: string
  ): Promise<void> {
    await this.logError(error, {
      'Error Type': 'AI Service Error',
      Provider: provider,
      Model: model,
      ...(userMessage && { 'User Message': userMessage.substring(0, 200) }),
    })
  },
}

