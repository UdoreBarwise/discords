import { EmbedBuilder, TextChannel, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js'
import { getBotClient } from '../bot/bot.js'
import { exchangeRateRepository } from '../database/exchangeRateRepository.js'
import { exchangeRateService } from './exchangeRateService.js'

interface ConversionState {
  userId: string
  guildId: string
  channelId: string
  fromCurrency?: string
  toCurrency?: string
  messageId: string
}

const activeConversions = new Map<string, ConversionState>()

export const exchangeRateDiscordService = {
  async startConversion(userId: string, guildId: string, channelId: string, messageId: string): Promise<void> {
    const key = `${guildId}-${userId}`
    activeConversions.set(key, {
      userId,
      guildId,
      channelId,
      messageId,
    })
  },

  async setFromCurrency(userId: string, guildId: string, currency: string): Promise<{ fromCurrency: string; toCurrency?: string } | null> {
    const key = `${guildId}-${userId}`
    const state = activeConversions.get(key)
    if (!state) return null

    state.fromCurrency = currency
    activeConversions.set(key, state)
    return { fromCurrency: currency, toCurrency: state.toCurrency }
  },

  async setToCurrency(userId: string, guildId: string, currency: string): Promise<{ fromCurrency?: string; toCurrency: string } | null> {
    const key = `${guildId}-${userId}`
    const state = activeConversions.get(key)
    if (!state) return null

    state.toCurrency = currency
    activeConversions.set(key, state)
    return { fromCurrency: state.fromCurrency, toCurrency: currency }
  },

  async getConversionState(userId: string, guildId: string): Promise<ConversionState | null> {
    const key = `${guildId}-${userId}`
    return activeConversions.get(key) || null
  },

  async convertCurrency(
    userId: string,
    guildId: string,
    channelId: string,
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<void> {
    const client = getBotClient()
    if (!client) {
      throw new Error('Bot client not initialized')
    }

    const config = await exchangeRateRepository.getConfig(guildId)
    if (!config || !config.enabled) {
      throw new Error('Exchange rate commands are not enabled for this server')
    }

    if (config.channelId && config.channelId !== channelId) {
      throw new Error(`Exchange rate commands can only be used in <#${config.channelId}>`)
    }

    try {
      const result = await exchangeRateService.convertCurrency(amount, fromCurrency, toCurrency)
      
      const channel = (await client.channels.fetch(channelId)) as TextChannel | null
      if (!channel) {
        throw new Error('Channel not found')
      }

      const embed = new EmbedBuilder()
        .setTitle('💱 Currency Conversion')
        .setDescription(
          `**${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} ${fromCurrency}** = ` +
          `**${result.result.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} ${toCurrency}**`
        )
        .addFields(
          {
            name: 'Exchange Rate',
            value: `1 ${fromCurrency} = ${result.rate.toFixed(6)} ${toCurrency}`,
            inline: false,
          },
          {
            name: 'Date',
            value: new Date(result.timestamp).toLocaleDateString(),
            inline: true,
          }
        )
        .setColor(0x4caf50)
        .setFooter({ text: `Requested by ${userId}` })

      await channel.send({ embeds: [embed] })

      // Clean up state
      const key = `${guildId}-${userId}`
      activeConversions.delete(key)
    } catch (error: any) {
      throw new Error(`Failed to convert currency: ${error.message}`)
    }
  },

  async getRates(
    userId: string,
    guildId: string,
    channelId: string,
    baseCurrency: string
  ): Promise<void> {
    const client = getBotClient()
    if (!client) {
      throw new Error('Bot client not initialized')
    }

    const config = await exchangeRateRepository.getConfig(guildId)
    if (!config || !config.enabled) {
      throw new Error('Exchange rate commands are not enabled for this server')
    }

    if (config.channelId && config.channelId !== channelId) {
      throw new Error(`Exchange rate commands can only be used in <#${config.channelId}>`)
    }

    try {
      const rates = await exchangeRateService.getExchangeRates(baseCurrency)
      
      const channel = (await client.channels.fetch(channelId)) as TextChannel | null
      if (!channel) {
        throw new Error('Channel not found')
      }

      // Get top 20 currencies sorted alphabetically
      const topRates = Object.entries(rates.rates)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(0, 20)

      const ratesText = topRates
        .map(([code, rate]) => `**${code}**: ${rate.toFixed(6)}`)
        .join('\n')

      const embed = new EmbedBuilder()
        .setTitle(`💱 Exchange Rates (Base: ${baseCurrency})`)
        .setDescription(ratesText || 'No rates available')
        .addFields({
          name: 'Date',
          value: new Date(rates.date).toLocaleDateString(),
          inline: true,
        })
        .setColor(0x4caf50)
        .setFooter({ text: `Requested by ${userId}` })

      await channel.send({ embeds: [embed] })
    } catch (error: any) {
      throw new Error(`Failed to get exchange rates: ${error.message}`)
    }
  },

  createAmountModal(fromCurrency: string, toCurrency: string): ModalBuilder {
    const modal = new ModalBuilder()
      .setCustomId(`convert_amount_${fromCurrency}_${toCurrency}`)
      .setTitle('Enter Amount to Convert')

    const amountInput = new TextInputBuilder()
      .setCustomId('amount_input')
      .setLabel('Amount')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Enter the amount to convert')
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(20)

    const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(amountInput)

    modal.addComponents(actionRow)
    return modal
  },
}
