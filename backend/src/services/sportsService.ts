import { sportsConfigRepository, type SportsConfig, type F1DataType } from '../database/sportsConfigRepository.js'
import { openF1Service } from './openF1Service.js'
import { getBotClient } from '../bot/bot.js'
import { EmbedBuilder } from 'discord.js'

class SportsService {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map()

  /**
   * Start polling for sports updates (disabled - using commands instead)
   */
  async startPolling(guildId: string, sportType: string) {
    // Auto-posting disabled - users should use /f1 commands instead
    return
    const key = `${guildId}-${sportType}`
    
    // Clear existing interval if any
    if (this.pollingIntervals.has(key)) {
      clearInterval(this.pollingIntervals.get(key)!)
    }

    const config = await sportsConfigRepository.getConfig(guildId, sportType as any)
    if (!config || !config.enabled || !config.channelId) {
      return
    }

    // Start polling based on sport type
    if (sportType === 'f1') {
      this.startF1Polling(config)
    }
  }

  /**
   * Stop polling for a specific guild and sport
   */
  stopPolling(guildId: string, sportType: string) {
    const key = `${guildId}-${sportType}`
    const interval = this.pollingIntervals.get(key)
    if (interval) {
      clearInterval(interval)
      this.pollingIntervals.delete(key)
    }
  }

  /**
   * Start F1 polling
   */
  private startF1Polling(config: SportsConfig) {
    const key = `${config.guildId}-${config.sportType}`
    const interval = setInterval(async () => {
      try {
        await this.checkF1Updates(config)
      } catch (error) {
        console.error(`Error checking F1 updates for ${config.guildId}:`, error)
      }
    }, config.updateIntervalMinutes * 60 * 1000)

    this.pollingIntervals.set(key, interval)
    
    // Do initial check
    this.checkF1Updates(config).catch(console.error)
  }

  /**
   * Check for F1 updates and post to Discord
   */
  private async checkF1Updates(config: SportsConfig) {
    const client = getBotClient()
    if (!client) return

    const guild = await client.guilds.fetch(config.guildId).catch(() => null)
    if (!guild) return

    const channel = await guild.channels.fetch(config.channelId!).catch(() => null)
    if (!channel || !channel.isTextBased()) return

    try {
      // Get latest session
      const session = await openF1Service.getLatestSession()
      if (!session) return

      // Check what data types to post
      for (const dataType of config.dataTypes) {
        await this.postF1DataType(channel as any, session, dataType, config)
      }
    } catch (error) {
      console.error('Error in checkF1Updates:', error)
    }
  }

  /**
   * Post specific F1 data type to Discord
   */
  private async postF1DataType(
    channel: any,
    session: any,
    dataType: F1DataType,
    config: SportsConfig
  ) {
    try {
      let embed: EmbedBuilder | null = null

      switch (dataType) {
        case 'session_start':
          embed = this.createSessionStartEmbed(session)
          break
        case 'session_end':
          // Check if session has ended
          if (new Date(session.date_end) < new Date()) {
            embed = this.createSessionEndEmbed(session)
          }
          break
        case 'position_change':
          embed = await this.createPositionChangeEmbed(session)
          break
        case 'weather_update':
          embed = await this.createWeatherUpdateEmbed(session)
          break
        case 'race_start':
          if (session.session_name.toLowerCase().includes('race')) {
            embed = this.createRaceStartEmbed(session)
          }
          break
        case 'race_end':
          if (session.session_name.toLowerCase().includes('race') && 
              new Date(session.date_end) < new Date()) {
            embed = this.createRaceEndEmbed(session)
          }
          break
      }

      if (embed) {
        const content = config.mentionRoleId ? `<@&${config.mentionRoleId}>` : undefined
        await channel.send({ content, embeds: [embed] })
      }
    } catch (error) {
      console.error(`Error posting F1 data type ${dataType}:`, error)
    }
  }

  private createSessionStartEmbed(session: any): EmbedBuilder {
    return new EmbedBuilder()
      .setTitle(`F1 Session Started: ${session.session_name}`)
      .setDescription(`**Location:** ${session.location}, ${session.country_name}\n**Circuit:** ${session.circuit_short_name}`)
      .setColor(0x00ff00)
      .setTimestamp(new Date(session.date_start))
  }

  private createSessionEndEmbed(session: any): EmbedBuilder {
    return new EmbedBuilder()
      .setTitle(`F1 Session Ended: ${session.session_name}`)
      .setDescription(`**Location:** ${session.location}, ${session.country_name}\n**Circuit:** ${session.circuit_short_name}`)
      .setColor(0xff0000)
      .setTimestamp(new Date(session.date_end))
  }

  private async createPositionChangeEmbed(session: any): Promise<EmbedBuilder | null> {
    const positions = await openF1Service.getPositions({ session_key: session.session_key })
    if (positions.length === 0) return null

    // Get latest positions
    const latestPositions = new Map<number, any>()
    positions.forEach(pos => {
      const existing = latestPositions.get(pos.driver_number)
      if (!existing || new Date(pos.date) > new Date(existing.date)) {
        latestPositions.set(pos.driver_number, pos)
      }
    })

    const top10 = Array.from(latestPositions.values())
      .sort((a, b) => a.position - b.position)
      .slice(0, 10)

    const drivers = await openF1Service.getDrivers({ session_key: session.session_key })
    const positionText = top10.map(pos => {
      const driver = drivers.find(d => d.driver_number === pos.driver_number)
      return `${pos.position}. ${driver?.name_acronym || `Driver #${pos.driver_number}`}`
    }).join('\n')

    return new EmbedBuilder()
      .setTitle(`F1 Current Positions - ${session.session_name}`)
      .setDescription(positionText || 'No position data available')
      .setColor(0x0099ff)
      .setTimestamp()
  }

  private async createWeatherUpdateEmbed(session: any): Promise<EmbedBuilder | null> {
    const weather = await openF1Service.getWeather({ session_key: session.session_key })
    if (weather.length === 0) return null

    const latest = weather.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]

    return new EmbedBuilder()
      .setTitle(`F1 Weather Update - ${session.session_name}`)
      .addFields(
        { name: 'Air Temperature', value: `${latest.air_temperature}°C`, inline: true },
        { name: 'Track Temperature', value: `${latest.track_temperature}°C`, inline: true },
        { name: 'Humidity', value: `${latest.humidity}%`, inline: true },
        { name: 'Wind Speed', value: `${latest.wind_speed} m/s`, inline: true },
        { name: 'Rainfall', value: latest.rainfall ? 'Yes' : 'No', inline: true }
      )
      .setColor(0x00ffff)
      .setTimestamp(new Date(latest.date))
  }

  private createRaceStartEmbed(session: any): EmbedBuilder {
    return new EmbedBuilder()
      .setTitle(`F1 Race Started!`)
      .setDescription(`**${session.session_name}**\n**Location:** ${session.location}, ${session.country_name}`)
      .setColor(0xff0000)
      .setTimestamp(new Date(session.date_start))
  }

  private createRaceEndEmbed(session: any): EmbedBuilder {
    return new EmbedBuilder()
      .setTitle(`F1 Race Finished!`)
      .setDescription(`**${session.session_name}**\n**Location:** ${session.location}, ${session.country_name}`)
      .setColor(0x00ff00)
      .setTimestamp(new Date(session.date_end))
  }

  /**
   * Start polling for all enabled configs
   */
  async startAllPolling() {
    const configs = await sportsConfigRepository.getAllEnabledConfigs()
    for (const config of configs) {
      await this.startPolling(config.guildId, config.sportType)
    }
  }
}

export const sportsService = new SportsService()

