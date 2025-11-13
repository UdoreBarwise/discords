# KaasBot - Discord Bot Interface

A comprehensive Discord bot with a modern web interface for managing all bot features. Built with React frontend and Node.js backend, using PostgreSQL for data storage.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Database Setup with pgAdmin](#database-setup-with-pgadmin)
- [Configuration](#configuration)
- [Running the Bot](#running-the-bot)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)

## Features

- **AI Chat Integration** - Multiple AI providers (DeepSeek, Ollama) with customizable personalities
- **Leveling System** - XP tracking, level rewards, and role assignments
- **Ticket System** - Support ticket management with embed messages
- **Dice Game** - Multiplayer dice rolling game with cooldowns
- **Wordle Game** - Word guessing game with daily challenges
- **Auto Roles** - Reaction-based role assignment
- **Auto Moderator** - Automated message filtering and moderation
- **Welcome Messages** - Customizable welcome messages (text or embed)
- **Exchange Rate Tracking** - Real-time currency exchange rate monitoring
- **Scoreboard** - Game statistics and leaderboards
- **Voting System** - Anonymous voting polls
- **Steam Integration** - Link Discord users to Steam accounts
- **YouTube Notifications** - Track YouTube channels for new videos
- **X (Twitter) Notifications** - Track X accounts for new tweets
- **Sports Tracking** - Formula 1 and other sports event tracking
- **Events System** - Scheduled and random events with rewards
- **Reminders** - Recurring reminders for users
- **Meme Channel** - Auto-delete and auto-post memes
- **Embed Builder** - Create and send custom Discord embeds
- **Theme System** - Customizable UI themes stored in database

## Prerequisites

- **Node.js** (v18 or higher)
- **PostgreSQL** (v12 or higher)
- **Discord Bot Token** - Get from [Discord Developer Portal](https://discord.com/developers/applications)
- **pgAdmin 4** (optional, for database management)

### AI Provider Requirements

**For Local AI (No API Keys Needed):**
- **Ollama** - Free, runs locally, no API keys required (Recommended for beginners)

**For Cloud AI (API Key Required):**
- **DeepSeek** - Requires API key from [DeepSeek Platform](https://platform.deepseek.com)

**Note:** You only need to install and configure ONE AI provider. Ollama is recommended for beginners as it's free and requires no API keys.

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/UdoreBarwise/discords.git
   cd discords
   ```

2. **Install dependencies:**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables:**
   ```bash
   cd backend
   cp env.example .env
   ```

4. **Edit `.env` file with your configuration:**
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASSWORD=your_password_here
   ```

## Database Setup with pgAdmin

### Step 1: Install PostgreSQL and pgAdmin

1. Download and install PostgreSQL from [postgresql.org](https://www.postgresql.org/download/)
2. During installation, set a password for the `postgres` user (remember this!)
3. pgAdmin 4 is usually installed automatically with PostgreSQL

### Step 2: Create Database in pgAdmin

1. **Open pgAdmin 4**
2. **Connect to your PostgreSQL server:**
   - Right-click on "Servers" → "Create" → "Server"
   - General tab: Name it "Local PostgreSQL" (or any name)
   - Connection tab:
     - Host: `localhost`
     - Port: `5432`
     - Maintenance database: `postgres`
     - Username: `postgres`
     - Password: (the password you set during installation)
   - Click "Save"

3. **Create a new database:**
   - Expand your server → Right-click "Databases" → "Create" → "Database"
   - Database name: `kaasbot` (or use `postgres` if you prefer)
   - Owner: `postgres`
   - Click "Save"

### Step 3: Configure Connection

Update your `backend/.env` file to match your PostgreSQL settings:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kaasbot          # or 'postgres' if you used the default database
DB_USER=postgres
DB_PASSWORD=your_postgres_password
```

### Step 4: Initialize Database Tables

The bot will automatically create all required tables when it starts. Just run:

```bash
npm run dev
```

The first time the backend starts, it will create all necessary tables in your database.

### Step 5: View Tables in pgAdmin

1. In pgAdmin, expand your database
2. Expand "Schemas" → "public" → "Tables"
3. You should see all the bot's tables listed

### Common pgAdmin Tasks

**View Table Data:**
- Right-click a table → "View/Edit Data" → "All Rows"

**Run SQL Queries:**
- Right-click your database → "Query Tool"
- Type SQL queries and click "Execute" (F5)

**Backup Database:**
- Right-click database → "Backup..."
- Choose filename and format
- Click "Backup"

**Restore Database:**
- Right-click database → "Restore..."
- Select backup file
- Click "Restore"

## Configuration

### Where to Place the Bot Token

**IMPORTANT:** The Discord bot token is stored in the **database** (`bot_config` table), NOT in the `.env` file. This is a security feature.

#### Method 1: Web Interface (Recommended)

1. Start the bot: `npm run dev`
2. Open http://localhost:3000 in your browser
3. Navigate to **Settings** → **Bot Token**
4. Enter your Discord bot token
5. Click Save

#### Method 2: Using pgAdmin

1. Open pgAdmin and connect to your database
2. Right-click your database → **Query Tool**
3. Run this SQL command:
   ```sql
   INSERT INTO bot_config (key, value) 
   VALUES ('discord_bot_token', 'YOUR_BOT_TOKEN_HERE')
   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
   ```
4. Replace `YOUR_BOT_TOKEN_HERE` with your actual Discord bot token
5. Click **Execute** (F5)

#### Method 3: Using API (Command Line)

```bash
curl -X POST http://localhost:5000/api/bot/token \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_BOT_TOKEN_HERE"}'
```

#### Getting Your Discord Bot Token

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or select an existing one
3. Go to **Bot** section
4. Click **Reset Token** or **Copy** to get your token
5. **Never share your token publicly!**

### AI Provider Configuration

The bot supports two AI providers. Configure them in the web interface or database:

#### Supported AI Providers

1. **Ollama** (Local) - Free, runs on your machine, no API keys needed
2. **DeepSeek** (Cloud) - Requires API key, cloud-based

#### Setting Up Ollama (Recommended for Local Use)

**Ollama is free and runs entirely on your computer - no API keys needed!**

1. **Install Ollama:**
   - Download from [ollama.ai](https://ollama.ai)
   - Install and run Ollama
   - Ollama runs on `http://localhost:11434` by default

2. **Download a Model:**
   ```bash
   # Popular models (choose based on your needs and hardware)
   ollama pull llama2              # Meta's Llama 2 (7B, 13B, 70B variants)
   ollama pull llama3              # Meta's Llama 3 (latest, recommended)
   ollama pull mistral             # Mistral AI (7B, efficient)
   ollama pull dolphin-phi         # Uncensored model (good for gaming)
   ollama pull qwen2.5             # Alibaba's Qwen 2.5
   ollama pull gemma               # Google's Gemma
   ollama pull codellama           # Code-focused model
   ollama pull phi3                # Microsoft's Phi-3 (small, fast)
   ```

3. **Configure in Bot:**
   - Open web interface: http://localhost:3000
   - Go to **AI Config** → **Global Settings**
   - Set **Provider:** `Ollama`
   - Set **Provider URL:** `http://localhost:11434` (default)
   - Set **Model:** `llama3:latest` (or your chosen model)
   - Click Save

4. **Ollama Model Name Format:**
   - Format: `model-name:tag`
   - Examples: 
     - `llama3:latest` - Latest Llama 3 model
     - `llama3:8b` - Llama 3 8B parameter version
     - `mistral:7b` - Mistral 7B model
     - `dolphin-phi:latest` - Latest Dolphin Phi model
     - `codellama:13b` - CodeLlama 13B model

5. **Recommended Models by Use Case:**
   - **General Chat:** `llama3:latest`, `mistral:latest`
   - **Gaming/Toxic:** `dolphin-phi:latest`, `llama3:latest`
   - **Code:** `codellama:latest`, `qwen2.5:latest`
   - **Fast/Small:** `phi3:latest`, `gemma:2b`
   - **Best Quality:** `llama3:70b`, `mistral:7b`

#### Setting Up DeepSeek (Cloud Provider)

1. **Get API Key:**
   - Go to [DeepSeek Platform](https://platform.deepseek.com)
   - Sign up/login
   - Navigate to API Keys section
   - Create a new API key

2. **Configure in Bot:**
   - Open web interface: http://localhost:3000
   - Go to **AI Config** → **Global Settings**
   - Set **Provider:** `DeepSeek`
   - Set **DeepSeek API Key:** (your API key)
   - Set **Model:** `deepseek-chat` or `deepseek-coder`
   - Click Save

3. **DeepSeek Available Models:**
   - **`deepseek-chat`** - General purpose chat model
     - Best for: Conversations, Q&A, general assistance
     - Supports: Long context, reasoning, multilingual
   - **`deepseek-coder`** - Code-focused model
     - Best for: Programming, code generation, debugging
     - Supports: Multiple programming languages, code completion

4. **Model Selection Guide:**
   - Use `deepseek-chat` for Discord bot conversations
   - Use `deepseek-coder` if your bot needs to help with code

#### AI Personalities

The bot supports different AI personalities:
- **Normal** - Helpful and friendly
- **Rude** - Toxic and aggressive (for gaming servers)
- **Professional** - Formal and business-like
- **Friendly** - Warm and enthusiastic
- **Sarcastic** - Witty and ironic

Set personality in **AI Config** → **Channel Settings** per channel.

#### Configuring AI via Database (pgAdmin)

You can also configure AI settings directly in the database:

```sql
-- Set AI Provider
INSERT INTO bot_config (key, value) 
VALUES ('ai_provider', 'ollama')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Set AI Model
INSERT INTO bot_config (key, value) 
VALUES ('ai_model', 'llama2:latest')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Set Provider URL (for Ollama)
INSERT INTO bot_config (key, value) 
VALUES ('ai_provider_url', 'http://localhost:11434')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Set DeepSeek API Key (if using DeepSeek)
INSERT INTO bot_config (key, value) 
VALUES ('deepseek_api_key', 'YOUR_API_KEY')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Set AI Personality
INSERT INTO bot_config (key, value) 
VALUES ('ai_personality', 'normal')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Set Temperature (0.0 to 2.0, higher = more creative)
INSERT INTO bot_config (key, value) 
VALUES ('ai_temperature', '0.7')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

### Bot Permissions

Your Discord bot needs these permissions:
- Send Messages
- Embed Links
- Attach Files
- Read Message History
- Manage Messages
- Manage Channels
- Manage Roles
- Add Reactions
- Use External Emojis

**Invite URL:** `https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands`

## Running the Bot

### Development Mode

```bash
# Run both frontend and backend
npm run dev

# Run only frontend
npm run dev:frontend

# Run only backend
npm run dev:backend
```

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000

### Production Mode

```bash
# Build frontend
npm run build

# Start backend (with PM2 or similar)
cd backend
npm start
```

## Database Schema

The bot uses PostgreSQL with the following main tables:

### Core Tables

- **`settings`** - General application settings (themes, etc.)
- **`bot_config`** - Bot configuration (Discord token, AI settings, etc.)

### Feature-Specific Tables

#### AI System
- **`ai_config`** - Per-guild AI configuration (rate limits, allowed channels)
- **`ai_presets`** - AI model presets (provider, model, temperature)
- **`ai_training`** - AI training data from user reactions
- **`ai_rate_limits`** - User rate limit tracking

#### Leveling System
- **`leveling_config`** - Leveling system configuration per guild
- **`user_levels`** - User XP and level tracking
- **`level_role_rewards`** - Role rewards for specific levels

#### Ticket System
- **`ticket_config`** - Ticket system configuration per guild
- **`tickets`** - Active tickets
- **`ticket_logs`** - Closed ticket history and transcripts

#### Games
- **`dice_game_config`** - Dice game configuration
- **`dice_game_cooldowns`** - User cooldowns for dice game
- **`wordle_config`** - Wordle game configuration
- **`wordle_cooldowns`** - User cooldowns for Wordle
- **`wordle_games`** - Active Wordle games
- **`game_scores`** - Win/loss statistics for all games
- **`scoreboard_config`** - Scoreboard configuration

#### Auto Features
- **`auto_roles_config`** - Reaction role configuration
- **`auto_moderator_config`** - Auto moderation settings

#### Messaging
- **`welcome_message_config`** - Welcome message settings
- **`meme_config`** - Meme channel configuration

#### Notifications
- **`youtube_notification_config`** - YouTube notification settings
- **`youtube_channels`** - Tracked YouTube channels
- **`x_notification_config`** - X (Twitter) notification settings
- **`x_accounts`** - Tracked X accounts

#### Other Features
- **`exchange_rate_config`** - Currency exchange rate settings
- **`voting_polls`** - Voting poll definitions
- **`voting_votes`** - Anonymous votes
- **`steam_users`** - Discord to Steam account links
- **`events_config`** - Event system configuration
- **`events`** - Event definitions
- **`active_events`** - Currently running events
- **`event_participants`** - User participation in events
- **`event_history`** - Completed event history
- **`sports_config`** - Sports tracking configuration
- **`reminders`** - User reminders

### Viewing Database Schema in pgAdmin

1. Open pgAdmin and connect to your database
2. Expand: Database → Schemas → public → Tables
3. Right-click any table → "Properties" to see column details
4. Use Query Tool to run:
   ```sql
   -- List all tables
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public';
   
   -- View table structure
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'bot_config';
   ```

## API Endpoints

### Bot Configuration
- `GET /api/bot/config` - Get bot configuration
- `POST /api/bot/token` - Set Discord bot token
- `GET /api/bot/status` - Get bot status

### AI Configuration
- `GET /api/ai/config/:guildId` - Get AI config for guild
- `POST /api/ai/config/:guildId` - Update AI config
- `GET /api/ai/presets` - List AI presets
- `POST /api/ai/presets` - Create AI preset

### Discord
- `GET /api/discord/guilds` - List bot's guilds
- `GET /api/discord/guilds/:guildId` - Get guild details
- `GET /api/discord/guilds/:guildId/channels` - Get guild channels
- `GET /api/discord/guilds/:guildId/roles` - Get guild roles

### Embed Builder
- `POST /api/embed/send` - Send embed message

See `backend/src/api/routes.ts` for complete API documentation.

## Project Structure

```
kaasbot/
├── frontend/              # React + TypeScript frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service layer
│   │   ├── contexts/      # React contexts
│   │   └── types/         # TypeScript types
│   └── package.json
├── backend/               # Node.js + Express backend
│   ├── src/
│   │   ├── api/           # API routes and controllers
│   │   ├── bot/           # Discord bot logic
│   │   ├── database/      # Database setup and repositories
│   │   └── services/      # Business logic services
│   ├── env.example        # Environment variables template
│   └── package.json
├── scripts/               # Development scripts
└── package.json           # Root workspace config
```

## Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL
- **Bot Framework:** discord.js
- **AI Providers:** DeepSeek, Ollama, LM Studio, LocalAI

## Troubleshooting

### Database Connection Issues

**Error: "Connection refused"**
- Ensure PostgreSQL is running
- Check `DB_HOST` and `DB_PORT` in `.env`
- Verify PostgreSQL service is started

**Error: "password authentication failed"**
- Verify `DB_USER` and `DB_PASSWORD` in `.env`
- Check pgAdmin connection works with same credentials

**Error: "database does not exist"**
- Create database in pgAdmin (see Database Setup section)
- Update `DB_NAME` in `.env`

### Bot Not Starting

1. Check Discord bot token is set in database:
   ```sql
   SELECT * FROM bot_config WHERE key = 'discord_bot_token';
   ```

2. Verify bot has correct permissions in Discord server

3. Check backend logs for errors

### Tables Not Created

- Ensure database connection is working
- Check backend logs for initialization errors
- Manually run initialization by restarting backend

## Support

For issues, questions, or contributions, please open an issue on GitHub.

## License

[Add your license here]
