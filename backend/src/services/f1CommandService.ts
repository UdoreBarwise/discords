import { openF1Service } from './openF1Service.js'
import { EmbedBuilder } from 'discord.js'

export const f1CommandService = {
  /**
   * Get current race positions
   */
  async getCurrentPositions(): Promise<EmbedBuilder> {
    try {
      const session = await openF1Service.getLatestSession()
      if (!session) {
        return new EmbedBuilder()
          .setTitle('No Active Session')
          .setDescription('There is no active F1 session at the moment.')
          .setColor(0xff0000)
      }

      const positions = await openF1Service.getPositions({ session_key: session.session_key })
      const drivers = await openF1Service.getDrivers({ session_key: session.session_key })

      if (positions.length === 0) {
        return new EmbedBuilder()
          .setTitle('No Position Data')
          .setDescription('Position data is not available for this session yet.')
          .setColor(0xff9900)
      }

      // Get latest position for each driver
      const latestPositions = new Map<number, any>()
      positions.forEach(pos => {
        const existing = latestPositions.get(pos.driver_number)
        if (!existing || new Date(pos.date) > new Date(existing.date)) {
          latestPositions.set(pos.driver_number, pos)
        }
      })

      const sortedPositions = Array.from(latestPositions.values())
        .sort((a, b) => a.position - b.position)

      const positionText = sortedPositions.map(pos => {
        const driver = drivers.find(d => d.driver_number === pos.driver_number)
        const emoji = pos.position === 1 ? '🥇' : pos.position === 2 ? '🥈' : pos.position === 3 ? '🥉' : `${pos.position}.`
        return `${emoji} **${driver?.name_acronym || `Driver #${pos.driver_number}`}** - ${driver?.full_name || 'Unknown'}`
      }).join('\n')

      return new EmbedBuilder()
        .setTitle(`Current Positions - ${session.session_name}`)
        .setDescription(positionText || 'No position data available')
        .setColor(0x0099ff)
        .addFields(
          { name: 'Location', value: `${session.location}, ${session.country_name}`, inline: true },
          { name: 'Circuit', value: session.circuit_short_name, inline: true }
        )
        .setTimestamp()
    } catch (error: any) {
      return new EmbedBuilder()
        .setTitle('Error')
        .setDescription(`Failed to get current positions: ${error.message}`)
        .setColor(0xff0000)
    }
  },

  /**
   * Get starting grid
   */
  async getStartingGrid(): Promise<EmbedBuilder> {
    try {
      const session = await openF1Service.getLatestSession()
      if (!session) {
        return new EmbedBuilder()
          .setTitle('No Active Session')
          .setDescription('There is no active F1 session at the moment.')
          .setColor(0xff0000)
      }

      // Get positions at the start of the session
      const startTime = new Date(session.date_start)
      const positions = await openF1Service.getPositions({ 
        session_key: session.session_key,
        date: session.date_start
      })
      const drivers = await openF1Service.getDrivers({ session_key: session.session_key })

      if (positions.length === 0) {
        return new EmbedBuilder()
          .setTitle('No Starting Grid Data')
          .setDescription('Starting grid data is not available for this session yet.')
          .setColor(0xff9900)
      }

      // Get positions closest to session start
      const startingPositions = positions
        .filter(pos => {
          const posDate = new Date(pos.date)
          const diff = Math.abs(posDate.getTime() - startTime.getTime())
          return diff < 5 * 60 * 1000 // Within 5 minutes of start
        })
        .sort((a, b) => a.position - b.position)

      if (startingPositions.length === 0) {
        return new EmbedBuilder()
          .setTitle('No Starting Grid Data')
          .setDescription('Starting grid data is not available for this session.')
          .setColor(0xff9900)
      }

      const gridText = startingPositions.map(pos => {
        const driver = drivers.find(d => d.driver_number === pos.driver_number)
        return `${pos.position}. **${driver?.name_acronym || `Driver #${pos.driver_number}`}** - ${driver?.full_name || 'Unknown'} (${driver?.team_name || 'Unknown Team'})`
      }).join('\n')

      return new EmbedBuilder()
        .setTitle(`Starting Grid - ${session.session_name}`)
        .setDescription(gridText || 'No starting grid data available')
        .setColor(0x00ff00)
        .addFields(
          { name: 'Location', value: `${session.location}, ${session.country_name}`, inline: true },
          { name: 'Circuit', value: session.circuit_short_name, inline: true },
          { name: 'Session Start', value: new Date(session.date_start).toLocaleString(), inline: false }
        )
        .setTimestamp()
    } catch (error: any) {
      return new EmbedBuilder()
        .setTitle('Error')
        .setDescription(`Failed to get starting grid: ${error.message}`)
        .setColor(0xff0000)
    }
  },

  /**
   * Get race information
   */
  async getRaceInfo(): Promise<EmbedBuilder> {
    try {
      const session = await openF1Service.getLatestSession()
      if (!session) {
        return new EmbedBuilder()
          .setTitle('No Active Session')
          .setDescription('There is no active F1 session at the moment.')
          .setColor(0xff0000)
      }

      const drivers = await openF1Service.getDrivers({ session_key: session.session_key })
      const weather = await openF1Service.getWeather({ session_key: session.session_key })
      const positions = await openF1Service.getPositions({ session_key: session.session_key })

      const latestWeather = weather.length > 0 
        ? weather.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
        : null

      const latestPositions = positions.length > 0
        ? positions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
        : null

      const leader = latestPositions && drivers.length > 0
        ? drivers.find(d => d.driver_number === latestPositions.driver_number)
        : null

      const embed = new EmbedBuilder()
        .setTitle(`${session.session_name} - Race Information`)
        .setColor(0x5865f2)
        .addFields(
          { name: 'Location', value: `${session.location}, ${session.country_name}`, inline: true },
          { name: 'Circuit', value: session.circuit_short_name, inline: true },
          { name: 'Session Type', value: session.session_name, inline: true },
          { name: 'Start Time', value: new Date(session.date_start).toLocaleString(), inline: true },
          { name: 'End Time', value: new Date(session.date_end).toLocaleString(), inline: true }
        )

      if (leader) {
        embed.addFields({
          name: 'Current Leader',
          value: `**${leader.name_acronym}** - ${leader.full_name} (${leader.team_name})`,
          inline: false
        })
      }

      if (latestWeather) {
        embed.addFields(
          { name: 'Air Temperature', value: `${latestWeather.air_temperature}°C`, inline: true },
          { name: 'Track Temperature', value: `${latestWeather.track_temperature}°C`, inline: true },
          { name: 'Humidity', value: `${latestWeather.humidity}%`, inline: true },
          { name: 'Wind Speed', value: `${latestWeather.wind_speed} m/s`, inline: true },
          { name: 'Rainfall', value: latestWeather.rainfall ? 'Yes' : 'No', inline: true }
        )
      }

      embed.setTimestamp()

      return embed
    } catch (error: any) {
      return new EmbedBuilder()
        .setTitle('Error')
        .setDescription(`Failed to get race information: ${error.message}`)
        .setColor(0xff0000)
    }
  },

  /**
   * Get driver championship standings
   */
  async getChampionshipStandings(): Promise<EmbedBuilder> {
    try {
      // Get all race sessions from current year
      const currentYear = new Date().getFullYear()
      const sessions = await openF1Service.getSessions({ 
        year: currentYear,
        session_name: 'Race'
      })

      if (sessions.length === 0) {
        return new EmbedBuilder()
          .setTitle('No Championship Data')
          .setDescription('No race results available for the current season.')
          .setColor(0xff9900)
      }

      // Get results from all races
      const driverPoints = new Map<number, { points: number; driver: any }>()
      
      for (const session of sessions) {
        try {
          const results = await openF1Service.getSessionResults({ session_key: session.session_key })
          
          // F1 points system: 1st=25, 2nd=18, 3rd=15, 4th=12, 5th=10, 6th=8, 7th=6, 8th=4, 9th=2, 10th=1
          const pointsSystem = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]
          
          results.forEach((result: any, index: number) => {
            if (index < 10 && result.position && result.driver_number) {
              const points = pointsSystem[index] || 0
              const existing = driverPoints.get(result.driver_number)
              driverPoints.set(result.driver_number, {
                points: (existing?.points || 0) + points,
                driver: existing?.driver || null
              })
            }
          })
        } catch (error) {
          // Skip sessions without results
          continue
        }
      }

      // Get driver info for all drivers
      const allDrivers = await openF1Service.getDrivers({ session_key: 'latest' })
      for (const [driverNumber, data] of driverPoints.entries()) {
        if (!data.driver) {
          const driver = allDrivers.find(d => d.driver_number === driverNumber)
          if (driver) {
            driverPoints.set(driverNumber, { ...data, driver })
          }
        }
      }

      // Sort by points
      const standings = Array.from(driverPoints.values())
        .filter(item => item.driver)
        .sort((a, b) => b.points - a.points)
        .slice(0, 20)

      if (standings.length === 0) {
        return new EmbedBuilder()
          .setTitle('No Championship Data')
          .setDescription('Championship standings are not available yet.')
          .setColor(0xff9900)
      }

      const standingsText = standings.map((item, index) => {
        const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`
        return `${emoji} **${item.driver.name_acronym}** - ${item.driver.full_name} (${item.points} pts)`
      }).join('\n')

      return new EmbedBuilder()
        .setTitle(`F1 Drivers Championship ${currentYear}`)
        .setDescription(standingsText || 'No standings available')
        .setColor(0xffd700)
        .setTimestamp()
    } catch (error: any) {
      return new EmbedBuilder()
        .setTitle('Error')
        .setDescription(`Failed to get championship standings: ${error.message}`)
        .setColor(0xff0000)
    }
  },

  /**
   * Get who is in the lead right now
   */
  async getCurrentLeader(): Promise<EmbedBuilder> {
    try {
      const session = await openF1Service.getLatestSession()
      if (!session) {
        return new EmbedBuilder()
          .setTitle('No Active Session')
          .setDescription('There is no active F1 session at the moment.')
          .setColor(0xff0000)
      }

      const positions = await openF1Service.getPositions({ session_key: session.session_key })
      const drivers = await openF1Service.getDrivers({ session_key: session.session_key })

      if (positions.length === 0) {
        return new EmbedBuilder()
          .setTitle('No Position Data')
          .setDescription('Position data is not available for this session yet.')
          .setColor(0xff9900)
      }

      // Get latest position for each driver
      const latestPositions = new Map<number, any>()
      positions.forEach(pos => {
        const existing = latestPositions.get(pos.driver_number)
        if (!existing || new Date(pos.date) > new Date(existing.date)) {
          latestPositions.set(pos.driver_number, pos)
        }
      })

      const leader = Array.from(latestPositions.values())
        .sort((a, b) => a.position - b.position)[0]

      if (!leader) {
        return new EmbedBuilder()
          .setTitle('No Leader Data')
          .setDescription('Leader data is not available.')
          .setColor(0xff9900)
      }

      const driver = drivers.find(d => d.driver_number === leader.driver_number)

      return new EmbedBuilder()
        .setTitle('Current Race Leader')
        .setDescription(
          driver 
            ? `🥇 **${driver.full_name}** (${driver.name_acronym})\n${driver.team_name}`
            : `🥇 Driver #${leader.driver_number}`
        )
        .setColor(0xffd700)
        .addFields(
          { name: 'Session', value: session.session_name, inline: true },
          { name: 'Location', value: `${session.location}, ${session.country_name}`, inline: true },
          { name: 'Circuit', value: session.circuit_short_name, inline: true }
        )
        .setTimestamp()
    } catch (error: any) {
      return new EmbedBuilder()
        .setTitle('Error')
        .setDescription(`Failed to get current leader: ${error.message}`)
        .setColor(0xff0000)
    }
  },
}

