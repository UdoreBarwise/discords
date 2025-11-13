import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { exec } from 'child_process'
import { promisify } from 'util'
import { initializeDatabase } from './database/database.js'
import { initializeBot } from './bot/bot.js'
import { apiRouter } from './api/routes.js'
import { steamService } from './services/steamService.js'
import { botConfigRepository } from './database/botConfigRepository.js'
import { youtubeNotificationService } from './services/youtubeNotificationService.js'
import { memeService } from './services/memeService.js'
import { eventService } from './services/eventService.js'
import { sportsService } from './services/sportsService.js'
import { scoreboardService } from './services/scoreboardService.js'
import { xNotificationService } from './services/xNotificationService.js'
import { reminderService } from './services/reminderService.js'

dotenv.config()

const execAsync = promisify(exec)
const app = express()
const PORT = process.env.PORT || 5000


// Middleware
app.use(cors())
app.use(express.json())

// API routes
app.use(apiRouter)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})


// Helper function to kill process on port (Windows)
async function killProcessOnPort(port: number): Promise<boolean> {
  if (process.platform !== 'win32') {
    return false
  }

  try {
    // Find process using the port
    const { stdout } = await execAsync(`netstat -ano | findstr :${port}`)
    const lines = stdout.trim().split('\n')
    const pids = new Set<string>()

    for (const line of lines) {
      const match = line.match(/\s+(\d+)\s*$/)
      if (match) {
        pids.add(match[1])
      }
    }

    if (pids.size === 0) {
      return false
    }

    // Kill all processes
    for (const pid of pids) {
      try {
        await execAsync(`taskkill /PID ${pid} /F`)
        console.log(`Killed process ${pid} on port ${port}`)
      } catch (err) {
        // Process might already be dead, ignore
      }
    }

    // Wait a bit for port to be released
    await new Promise(resolve => setTimeout(resolve, 1000))
    return true
  } catch (error) {
    return false
  }
}

// Track initialization status
const initStatus = {
  database: false,
  steamApiKey: false,
  bot: false,
  youtubeNotifications: false,
  memeAutoPosting: false,
  eventPolling: false,
  sportsPolling: false,
  scoreboard: false,
  xNotifications: false,
  reminders: false,
}

// Start server
async function startServer() {
  try {
    // ============================================
    // SECTION 1: Database Initialization
    // ============================================
    console.log('[Init] Initializing database...')
    try {
      await initializeDatabase()
      initStatus.database = true
      console.log('[Init] ✓ Database initialized successfully')
    } catch (error) {
      console.error('[Init] ✗ Database initialization failed:', error)
      throw error // Database is critical, fail if it doesn't initialize
    }
    
    // ============================================
    // SECTION 2: API Key Loading
    // ============================================
    console.log('[Init] Loading API keys from database...')
    
    // Load Steam API key
    try {
      const steamApiKey = await botConfigRepository.get('steam_api_key')
      if (steamApiKey) {
        steamService.setApiKey(steamApiKey)
        initStatus.steamApiKey = true
        console.log('[Init] ✓ Steam API key loaded from database')
      } else {
        console.log('[Init] ⚠ Steam API key not configured (optional)')
      }
    } catch (error) {
      console.warn('[Init] ⚠ Could not load Steam API key:', error)
    }
    
    let server: any
    let currentPort = parseInt(PORT.toString())

    const tryStart = async (port: number): Promise<void> => {
      return new Promise((resolve, reject) => {
        server = app.listen(port, async () => {
          console.log(`[Server] Backend server running on http://localhost:${port}`)
          
          // ============================================
          // SECTION 3: Discord Bot Initialization
          // ============================================
          console.log('[Init] Initializing Discord bot...')
          try {
            await initializeBot()
            initStatus.bot = true
            console.log('[Init] ✓ Discord bot initialization started')
          } catch (error) {
            console.error('[Init] ✗ Failed to initialize bot:', error)
            // Bot is critical but we'll continue - it might initialize later
          }

          // ============================================
          // SECTION 4: Service Polling Initialization
          // ============================================
          // These services require the bot to be ready, so we start them after bot init
          // Each service handles its own readiness checks
          
          // Start YouTube notification polling service
          console.log('[Init] Starting YouTube notification polling service...')
          youtubeNotificationService.startPolling()
            .then(() => {
              initStatus.youtubeNotifications = true
              console.log('[Init] ✓ YouTube notification polling service started')
            })
            .catch((error) => {
              console.error('[Init] ✗ Failed to start YouTube notification service:', error)
            })

          // Start meme auto-posting service
          console.log('[Init] Starting meme auto-posting service...')
          memeService.startAutoPosting()
            .then(() => {
              initStatus.memeAutoPosting = true
              console.log('[Init] ✓ Meme auto-posting service started')
            })
            .catch((error) => {
              console.error('[Init] ✗ Failed to start meme auto-posting service:', error)
            })

          // Start event polling service
          console.log('[Init] Starting event polling service...')
          eventService.startEventPolling()
            .then(() => {
              initStatus.eventPolling = true
              console.log('[Init] ✓ Event polling service started')
            })
            .catch((error) => {
              console.error('[Init] ✗ Failed to start event polling service:', error)
            })

          // Start sports polling service
          console.log('[Init] Starting sports polling service...')
          try {
            await sportsService.startAllPolling()
            initStatus.sportsPolling = true
            console.log('[Init] ✓ Sports polling service started')
          } catch (error) {
            console.error('[Init] ✗ Failed to start sports polling service:', error)
          }

          // Initialize scoreboard polling service
          console.log('[Init] Starting scoreboard polling service...')
          scoreboardService.startPolling()
            .then(() => {
              initStatus.scoreboard = true
              console.log('[Init] ✓ Scoreboard polling service started')
            })
            .catch((error) => {
              console.error('[Init] ✗ Failed to start scoreboard polling service:', error)
            })

          // Start X notification polling service
          console.log('[Init] Starting X notification polling service...')
          xNotificationService.startPolling()
            .then(() => {
              initStatus.xNotifications = true
              console.log('[Init] ✓ X notification polling service started')
            })
            .catch((error) => {
              console.error('[Init] ✗ Failed to start X notification service:', error)
            })

          // Start reminder polling service
          console.log('[Init] Starting reminder polling service...')
          reminderService.startPolling()
            .then(() => {
              initStatus.reminders = true
              console.log('[Init] ✓ Reminder polling service started')
            })
            .catch((error: any) => {
              console.error('[Init] ✗ Failed to start reminder service:', error)
            })

          // ============================================
          // SECTION 5: Startup Summary
          // ============================================
          setTimeout(() => {
            console.log('\n' + '='.repeat(60))
            console.log('SERVER INITIALIZATION SUMMARY')
            console.log('='.repeat(60))
            console.log(`Database:              ${initStatus.database ? '✓' : '✗'}`)
            console.log(`Steam API Key:        ${initStatus.steamApiKey ? '✓' : '⚠ (optional)'}`)
            console.log(`Discord Bot:          ${initStatus.bot ? '✓' : '✗'}`)
            console.log(`YouTube Notifications: ${initStatus.youtubeNotifications ? '✓' : '✗'}`)
            console.log(`Meme Auto-Posting:    ${initStatus.memeAutoPosting ? '✓' : '✗'}`)
            console.log(`Event Polling:        ${initStatus.eventPolling ? '✓' : '✗'}`)
            console.log(`Sports Polling:       ${initStatus.sportsPolling ? '✓' : '✗'}`)
            console.log(`Scoreboard:           ${initStatus.scoreboard ? '✓' : '✗'}`)
            console.log(`X Notifications:      ${initStatus.xNotifications ? '✓' : '✗'}`)
            console.log(`Reminders:            ${initStatus.reminders ? '✓' : '✗'}`)
            console.log('='.repeat(60))
            console.log('Server is ready to accept requests\n')
          }, 2000) // Wait 2 seconds for async initializations to complete
          
          resolve()
        })

        server.on('error', async (error: any) => {
          if (error.code === 'EADDRINUSE') {
            console.log(`Port ${port} is in use, attempting to free it...`)
            
            // Try to kill the process
            const killed = await killProcessOnPort(port)
            
            if (killed) {
              // Try again after killing
              server.close()
              setTimeout(() => {
                tryStart(port).then(resolve).catch(reject)
              }, 1500)
            } else {
              // Try next port
              if (port < currentPort + 10) {
                console.log(`Trying port ${port + 1}...`)
                server.close()
                tryStart(port + 1).then(resolve).catch(reject)
              } else {
                console.error(`\n❌ Could not find available port (tried ${currentPort}-${port})`)
                console.error(`\nPlease manually kill the process using port ${currentPort}:`)
                console.error(`   Windows: netstat -ano | findstr :${currentPort}`)
                console.error(`   Then: taskkill /PID <PID> /F`)
                reject(error)
              }
            }
          } else {
            reject(error)
          }
        })
      })
    }

    await tryStart(currentPort)
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...')
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down...')
  process.exit(0)
})

startServer()

