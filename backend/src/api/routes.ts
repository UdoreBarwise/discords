import { Router } from 'express'
import { themeController } from './controllers/themeController.js'
import { botConfigController } from './controllers/botConfigController.js'
import { ticketController } from './controllers/ticketController.js'
import { discordController } from './controllers/discordController.js'
import { embedController } from './controllers/embedController.js'
import { diceGameController } from './controllers/diceGameController.js'
import { wordleController } from './controllers/wordleController.js'
import { aiController } from './controllers/aiController.js'
import { aiConfigController } from './controllers/aiConfigController.js'
import { aiPresetController } from './controllers/aiPresetController.js'
import { scoreboardController } from './controllers/scoreboardController.js'
import { autoRolesController } from './controllers/autoRolesController.js'
import { autoModeratorController } from './controllers/autoModeratorController.js'
import { levelingController } from './controllers/levelingController.js'
import { serverSetupController } from './controllers/serverSetupController.js'
import { welcomeMessageController } from './controllers/welcomeMessageController.js'
import { exchangeRateController } from './controllers/exchangeRateController.js'
import { steamController } from './controllers/steamController.js'
import { youtubeNotificationController } from './controllers/youtubeNotificationController.js'
import { votingController } from './controllers/votingController.js'
import { memeController } from './controllers/memeController.js'
import { eventController } from './controllers/eventController.js'
import { openF1Controller } from './controllers/openF1Controller.js'
import { sportsController } from './controllers/sportsController.js'
import { scoreboardConfigController } from './controllers/scoreboardConfigController.js'
import { reminderController } from './controllers/reminderController.js'
import { xNotificationController } from './controllers/xNotificationController.js'

export const apiRouter = Router()

// Theme routes
apiRouter.get('/api/theme/colors', themeController.getThemeColors)
apiRouter.post('/api/theme/colors', themeController.saveThemeColors)

// Bot config routes
apiRouter.get('/api/bot/token', botConfigController.getToken)
apiRouter.post('/api/bot/token', botConfigController.setToken)
apiRouter.delete('/api/bot/token', botConfigController.deleteToken)
apiRouter.get('/api/bot/default-server', botConfigController.getDefaultServer)
apiRouter.post('/api/bot/default-server', botConfigController.setDefaultServer)
apiRouter.get('/api/bot/error-webhook', botConfigController.getErrorWebhook)
apiRouter.post('/api/bot/error-webhook', botConfigController.setErrorWebhook)
apiRouter.get('/api/bot/ai-response-channels', botConfigController.getAIResponseChannels)
apiRouter.post('/api/bot/ai-response-channels', botConfigController.setAIResponseChannels)
apiRouter.get('/api/bot/youtube-api-key', botConfigController.getYouTubeApiKey)
apiRouter.post('/api/bot/youtube-api-key', botConfigController.setYouTubeApiKey)
apiRouter.delete('/api/bot/youtube-api-key', botConfigController.deleteYouTubeApiKey)

// Discord data routes
apiRouter.get('/api/tickets/guilds', discordController.getGuilds)
apiRouter.get('/api/tickets/guilds/:guildId/channels', discordController.getChannels)
apiRouter.post('/api/tickets/guilds/:guildId/channels', discordController.createChannel)
apiRouter.get('/api/tickets/guilds/:guildId/categories', discordController.getCategories)
apiRouter.get('/api/tickets/guilds/:guildId/roles', discordController.getRoles)
apiRouter.get('/api/tickets/guilds/:guildId/members', discordController.getMembers)

// Ticket routes
apiRouter.get('/api/tickets/config', ticketController.getConfig)
apiRouter.post('/api/tickets/config', ticketController.saveConfig)
apiRouter.get('/api/tickets/list', ticketController.listTickets)
apiRouter.post('/api/tickets/:ticketId/close', ticketController.closeTicket)
apiRouter.get('/api/tickets/logs', ticketController.getLogs)

// Embed routes
apiRouter.post('/api/embed/send', embedController.sendEmbed)

// Dice game routes
apiRouter.get('/api/dice/config', diceGameController.getConfig)
apiRouter.post('/api/dice/config', diceGameController.saveConfig)

// Wordle routes
apiRouter.get('/api/wordle/config', wordleController.getConfig)
apiRouter.post('/api/wordle/config', wordleController.saveConfig)

// AI routes
apiRouter.get('/api/ai/config', aiController.getConfig)
apiRouter.post('/api/ai/config', aiController.saveConfig)
apiRouter.delete('/api/ai/api-key', aiController.deleteApiKey)
apiRouter.get('/api/ai/models', aiController.getAvailableModels)

// AI per-guild config routes
apiRouter.get('/api/ai/guild-config', aiConfigController.getConfig)
apiRouter.post('/api/ai/guild-config', aiConfigController.saveConfig)

// AI preset routes
apiRouter.get('/api/ai/presets', aiPresetController.getAll)
apiRouter.get('/api/ai/presets/:id', aiPresetController.get)
apiRouter.post('/api/ai/presets', aiPresetController.create)
apiRouter.put('/api/ai/presets/:id', aiPresetController.update)
apiRouter.delete('/api/ai/presets/:id', aiPresetController.delete)

// Scoreboard routes
apiRouter.get('/api/scoreboard', scoreboardController.getScoreboard)
apiRouter.get('/api/scoreboard/user', scoreboardController.getUserScore)
apiRouter.get('/api/scoreboard/config', scoreboardConfigController.getConfig)
apiRouter.post('/api/scoreboard/config', scoreboardConfigController.saveConfig)

// Auto roles routes
apiRouter.get('/api/auto-roles/config', autoRolesController.getConfig)
apiRouter.post('/api/auto-roles/config', autoRolesController.saveConfig)
apiRouter.post('/api/auto-roles/send', autoRolesController.sendMessage)
apiRouter.delete('/api/auto-roles/config', autoRolesController.deleteConfig)

// Auto moderator routes
apiRouter.get('/api/auto-moderator/config', autoModeratorController.getConfig)
apiRouter.post('/api/auto-moderator/config', autoModeratorController.saveConfig)

// Leveling routes
apiRouter.get('/api/leveling/config', levelingController.getConfig)
apiRouter.post('/api/leveling/config', levelingController.saveConfig)
apiRouter.get('/api/leveling/user', levelingController.getUserLevel)
apiRouter.get('/api/leveling/leaderboard', levelingController.getLeaderboard)
apiRouter.get('/api/leveling/role-rewards', levelingController.getLevelRoleRewards)
apiRouter.post('/api/leveling/role-rewards', levelingController.saveLevelRoleReward)
apiRouter.delete('/api/leveling/role-rewards', levelingController.deleteLevelRoleReward)

// Server setup routes
apiRouter.post('/api/server-setup/:guildId', serverSetupController.setupServer)

// Welcome message routes
apiRouter.get('/api/welcome-message/config', welcomeMessageController.getConfig)
apiRouter.post('/api/welcome-message/config', welcomeMessageController.saveConfig)
apiRouter.delete('/api/welcome-message/config', welcomeMessageController.deleteConfig)

// Exchange rate routes
apiRouter.get('/api/exchange-rate/rates', exchangeRateController.getRates)
apiRouter.post('/api/exchange-rate/convert', exchangeRateController.convertCurrency)
apiRouter.get('/api/exchange-rate/currencies', exchangeRateController.getSupportedCurrencies)
apiRouter.get('/api/exchange-rate/historical', exchangeRateController.getHistoricalRates)
apiRouter.get('/api/exchange-rate/config', exchangeRateController.getConfig)
apiRouter.post('/api/exchange-rate/config', exchangeRateController.saveConfig)

// Steam routes
apiRouter.get('/api/steam/api-key', steamController.getApiKey)
apiRouter.post('/api/steam/api-key', steamController.setApiKey)
apiRouter.delete('/api/steam/api-key', steamController.deleteApiKey)
apiRouter.post('/api/steam/link', steamController.linkUser)
apiRouter.post('/api/steam/unlink', steamController.unlinkUser)
apiRouter.get('/api/steam/profile', steamController.getProfile)
apiRouter.get('/api/steam/games', steamController.getOwnedGames)
apiRouter.get('/api/steam/recent', steamController.getRecentlyPlayed)
apiRouter.get('/api/steam/resolve', steamController.resolveVanityUrl)
apiRouter.get('/api/steam/linked', steamController.getLinkedSteamId)

// Voting routes
apiRouter.post('/api/voting/polls', votingController.createPoll)
apiRouter.get('/api/voting/polls', votingController.getPolls)
apiRouter.get('/api/voting/polls/:pollId', votingController.getPoll)
apiRouter.post('/api/voting/vote', votingController.vote)
apiRouter.post('/api/voting/polls/:pollId/close', votingController.closePoll)
apiRouter.delete('/api/voting/polls/:pollId', votingController.deletePoll)

// YouTube notification routes
apiRouter.get('/api/youtube-notifications/config', youtubeNotificationController.getConfig)
apiRouter.post('/api/youtube-notifications/config', youtubeNotificationController.saveConfig)
apiRouter.get('/api/youtube-notifications/channels', youtubeNotificationController.getChannels)
apiRouter.post('/api/youtube-notifications/channels', youtubeNotificationController.addChannel)
apiRouter.delete('/api/youtube-notifications/channels', youtubeNotificationController.removeChannel)
apiRouter.post('/api/youtube-notifications/test', youtubeNotificationController.testNotification)
apiRouter.get('/api/youtube-notifications/latest-video', youtubeNotificationController.getLatestVideo)

// Meme routes
apiRouter.get('/api/meme/config', memeController.getConfig)
apiRouter.post('/api/meme/config', memeController.saveConfig)

// Event routes
apiRouter.get('/api/events/config', eventController.getConfig)
apiRouter.post('/api/events/config', eventController.saveConfig)
apiRouter.get('/api/events', eventController.getEvents)
apiRouter.get('/api/events/:id', eventController.getEvent)
apiRouter.post('/api/events', eventController.createEvent)
apiRouter.put('/api/events/:id', eventController.updateEvent)
apiRouter.delete('/api/events/:id', eventController.deleteEvent)
apiRouter.get('/api/events/active', eventController.getActiveEvents)
apiRouter.get('/api/events/history', eventController.getEventHistory)
apiRouter.post('/api/events/:id/start', eventController.startEvent)

// OpenF1 routes (internal API access)
apiRouter.get('/api/openf1/car-data', openF1Controller.getCarData)
apiRouter.get('/api/openf1/drivers', openF1Controller.getDrivers)
apiRouter.get('/api/openf1/laps', openF1Controller.getLaps)
apiRouter.get('/api/openf1/positions', openF1Controller.getPositions)
apiRouter.get('/api/openf1/sessions', openF1Controller.getSessions)
apiRouter.get('/api/openf1/meetings', openF1Controller.getMeetings)
apiRouter.get('/api/openf1/weather', openF1Controller.getWeather)
apiRouter.get('/api/openf1/team-radio', openF1Controller.getTeamRadio)
apiRouter.get('/api/openf1/latest-session', openF1Controller.getLatestSession)
apiRouter.get('/api/openf1/latest-meeting', openF1Controller.getLatestMeeting)
apiRouter.get('/api/openf1/session-results', openF1Controller.getSessionResults)

// Sports config routes
apiRouter.get('/api/sports/config', sportsController.getConfig)
apiRouter.get('/api/sports/configs', sportsController.getAllConfigs)
apiRouter.post('/api/sports/config', sportsController.saveConfig)
apiRouter.delete('/api/sports/config', sportsController.deleteConfig)

// Reminder routes
apiRouter.get('/api/reminders', reminderController.getReminders)
apiRouter.post('/api/reminders', reminderController.createReminder)
apiRouter.put('/api/reminders/:id', reminderController.updateReminder)
apiRouter.delete('/api/reminders/:id', reminderController.deleteReminder)

// X notification routes
apiRouter.get('/api/x-notifications/config', xNotificationController.getConfig)
apiRouter.post('/api/x-notifications/config', xNotificationController.saveConfig)
apiRouter.get('/api/x-notifications/accounts', xNotificationController.getAccounts)
apiRouter.post('/api/x-notifications/accounts', xNotificationController.addAccount)
apiRouter.delete('/api/x-notifications/accounts', xNotificationController.removeAccount)
apiRouter.post('/api/x-notifications/test', xNotificationController.testNotification)
apiRouter.get('/api/x-notifications/latest-tweet', xNotificationController.getLatestTweet)

