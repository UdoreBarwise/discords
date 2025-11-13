import { initializeDatabase, getDatabase } from './database.js'
import { getBotClient } from '../bot/bot.js'

async function cleanupDeletedChannels() {
  const pool = getDatabase()
  const client = getBotClient()

  if (!client) {
    console.log('Bot client not available, skipping channel cleanup')
    return
  }

  console.log('Cleaning up references to deleted channels...')
  let cleanedCount = 0

  try {
    // Get all guilds the bot is in
    const guilds = client.guilds.cache

    for (const guild of guilds.values()) {
      try {
        // Fetch all channels in the guild
        const channels = await guild.channels.fetch()
        const validChannelIds = new Set(channels.keys())

        // Clean up ticket_config
        const ticketConfigs = await pool.query(
          `SELECT guild_id, embed_channel_id, ticket_category_id FROM ticket_config WHERE guild_id = $1`,
          [guild.id]
        )
        for (const config of ticketConfigs.rows) {
          if (config.embed_channel_id && !validChannelIds.has(config.embed_channel_id)) {
            await pool.query(
              `UPDATE ticket_config SET embed_channel_id = NULL, embed_message_id = NULL WHERE guild_id = $1`,
              [guild.id]
            )
            cleanedCount++
          }
          if (config.ticket_category_id && !validChannelIds.has(config.ticket_category_id)) {
            await pool.query(
              `UPDATE ticket_config SET ticket_category_id = NULL WHERE guild_id = $1`,
              [guild.id]
            )
            cleanedCount++
          }
        }

        // Clean up dice_game_config
        const diceConfigs = await pool.query(
          `SELECT guild_id, channel_id FROM dice_game_config WHERE guild_id = $1 AND channel_id IS NOT NULL`,
          [guild.id]
        )
        for (const config of diceConfigs.rows) {
          if (!validChannelIds.has(config.channel_id)) {
            await pool.query(
              `UPDATE dice_game_config SET channel_id = NULL WHERE guild_id = $1`,
              [guild.id]
            )
            cleanedCount++
          }
        }

        // Clean up wordle_config
        const wordleConfigs = await pool.query(
          `SELECT guild_id, channel_id FROM wordle_config WHERE guild_id = $1 AND channel_id IS NOT NULL`,
          [guild.id]
        )
        for (const config of wordleConfigs.rows) {
          if (!validChannelIds.has(config.channel_id)) {
            await pool.query(
              `UPDATE wordle_config SET channel_id = NULL WHERE guild_id = $1`,
              [guild.id]
            )
            cleanedCount++
          }
        }

        // Clean up meme_config
        const memeConfigs = await pool.query(
          `SELECT guild_id, channel_id FROM meme_config WHERE guild_id = $1 AND channel_id IS NOT NULL`,
          [guild.id]
        )
        for (const config of memeConfigs.rows) {
          if (!validChannelIds.has(config.channel_id)) {
            await pool.query(
              `UPDATE meme_config SET channel_id = NULL WHERE guild_id = $1`,
              [guild.id]
            )
            cleanedCount++
          }
        }

        // Clean up auto_roles_config
        const autoRolesConfigs = await pool.query(
          `SELECT guild_id, channel_id FROM auto_roles_config WHERE guild_id = $1 AND channel_id IS NOT NULL`,
          [guild.id]
        )
        for (const config of autoRolesConfigs.rows) {
          if (!validChannelIds.has(config.channel_id)) {
            await pool.query(
              `UPDATE auto_roles_config SET channel_id = NULL, message_id = NULL WHERE guild_id = $1`,
              [guild.id]
            )
            cleanedCount++
          }
        }

        // Clean up welcome_message_config
        const welcomeConfigs = await pool.query(
          `SELECT guild_id, channel_id FROM welcome_message_config WHERE guild_id = $1 AND channel_id IS NOT NULL`,
          [guild.id]
        )
        for (const config of welcomeConfigs.rows) {
          if (!validChannelIds.has(config.channel_id)) {
            await pool.query(
              `UPDATE welcome_message_config SET channel_id = NULL WHERE guild_id = $1`,
              [guild.id]
            )
            cleanedCount++
          }
        }

        // Clean up leveling_config
        const levelingConfigs = await pool.query(
          `SELECT guild_id, level_up_channel_id FROM leveling_config WHERE guild_id = $1 AND level_up_channel_id IS NOT NULL`,
          [guild.id]
        )
        for (const config of levelingConfigs.rows) {
          if (!validChannelIds.has(config.level_up_channel_id)) {
            await pool.query(
              `UPDATE leveling_config SET level_up_channel_id = NULL WHERE guild_id = $1`,
              [guild.id]
            )
            cleanedCount++
          }
        }

        // Clean up exchange_rate_config
        const exchangeConfigs = await pool.query(
          `SELECT guild_id, channel_id FROM exchange_rate_config WHERE guild_id = $1 AND channel_id IS NOT NULL`,
          [guild.id]
        )
        for (const config of exchangeConfigs.rows) {
          if (!validChannelIds.has(config.channel_id)) {
            await pool.query(
              `UPDATE exchange_rate_config SET channel_id = NULL WHERE guild_id = $1`,
              [guild.id]
            )
            cleanedCount++
          }
        }

        // Clean up youtube_notification_config
        const youtubeConfigs = await pool.query(
          `SELECT guild_id, channel_id FROM youtube_notification_config WHERE guild_id = $1 AND channel_id IS NOT NULL`,
          [guild.id]
        )
        for (const config of youtubeConfigs.rows) {
          if (!validChannelIds.has(config.channel_id)) {
            await pool.query(
              `UPDATE youtube_notification_config SET channel_id = NULL WHERE guild_id = $1`,
              [guild.id]
            )
            cleanedCount++
          }
        }

        // Clean up scoreboard_config
        const scoreboardConfigs = await pool.query(
          `SELECT guild_id, channel_id FROM scoreboard_config WHERE guild_id = $1 AND channel_id IS NOT NULL`,
          [guild.id]
        )
        for (const config of scoreboardConfigs.rows) {
          if (!validChannelIds.has(config.channel_id)) {
            await pool.query(
              `UPDATE scoreboard_config SET channel_id = NULL, message_id = NULL WHERE guild_id = $1`,
              [guild.id]
            )
            cleanedCount++
          }
        }

        // Clean up sports_config (channel_ids is JSON array)
        const sportsConfigs = await pool.query(
          `SELECT guild_id, sport_type, channel_ids FROM sports_config WHERE guild_id = $1 AND channel_ids IS NOT NULL`,
          [guild.id]
        )
        for (const config of sportsConfigs.rows) {
          try {
            const channelIds = config.channel_ids ? JSON.parse(config.channel_ids) : []
            if (Array.isArray(channelIds)) {
              const validIds = channelIds.filter((id: string) => validChannelIds.has(id))
              if (validIds.length !== channelIds.length) {
                await pool.query(
                  `UPDATE sports_config SET channel_ids = $1 WHERE guild_id = $2 AND sport_type = $3`,
                  [validIds.length > 0 ? JSON.stringify(validIds) : null, config.guild_id, config.sport_type]
                )
                cleanedCount++
              }
            }
          } catch (error) {
            // Ignore errors
          }
        }

        // Clean up auto_moderator_config
        const autoModConfigs = await pool.query(
          `SELECT guild_id, log_channel_id FROM auto_moderator_config WHERE guild_id = $1 AND log_channel_id IS NOT NULL`,
          [guild.id]
        )
        for (const config of autoModConfigs.rows) {
          if (!validChannelIds.has(config.log_channel_id)) {
            await pool.query(
              `UPDATE auto_moderator_config SET log_channel_id = NULL WHERE guild_id = $1`,
              [guild.id]
            )
            cleanedCount++
          }
        }
      } catch (error) {
        console.error(`Error cleaning up channels for guild ${guild.id}:`, error)
      }
    }

    console.log(`Channel cleanup completed! Cleaned up ${cleanedCount} references to deleted channels.`)
  } catch (error) {
    console.error('Error during channel cleanup:', error)
  }
}

async function runMigration() {
  try {
    console.log('Running database migration...')
    await initializeDatabase()
    console.log('Database initialization completed')
    
    // Clean up deleted channels
    await cleanupDeletedChannels()
    
    console.log('Migration completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

runMigration()

