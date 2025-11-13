import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

// PostgreSQL connection pool with default settings
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '1',
})

export async function initializeDatabase() {
  try {
    // Create settings table for theme and other settings
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create bot_config table for bot settings
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bot_config (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create ticket_config table for ticket system configuration
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ticket_config (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) UNIQUE NOT NULL,
        embed_channel_id VARCHAR(255) NOT NULL,
        ticket_category_id VARCHAR(255) NOT NULL,
        mention_role_ids TEXT NOT NULL,
        mention_user_ids TEXT NOT NULL,
        embed_message_id VARCHAR(255),
        message_type VARCHAR(50) DEFAULT 'embed',
        message_title VARCHAR(255),
        message_description TEXT,
        message_content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Add new columns if they don't exist (for existing databases)
    await pool.query(`
      ALTER TABLE ticket_config 
      ADD COLUMN IF NOT EXISTS message_type VARCHAR(50) DEFAULT 'embed',
      ADD COLUMN IF NOT EXISTS message_title VARCHAR(255),
      ADD COLUMN IF NOT EXISTS message_description TEXT,
      ADD COLUMN IF NOT EXISTS message_content TEXT
    `).catch(() => {
      // Ignore errors if columns already exist
    })

    // Create tickets table to track active tickets
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        ticket_id VARCHAR(255) UNIQUE NOT NULL,
        guild_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP,
        status VARCHAR(50) DEFAULT 'open'
      )
    `)

    // Create ticket_logs table to store deleted ticket information
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ticket_logs (
        id SERIAL PRIMARY KEY,
        ticket_id VARCHAR(255) NOT NULL,
        guild_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL,
        closed_at TIMESTAMP NOT NULL,
        closed_by VARCHAR(255) NOT NULL,
        message_count INTEGER DEFAULT 0,
        transcript TEXT
      )
    `)

    // Create dice_game_config table for dice game configuration
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dice_game_config (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) UNIQUE NOT NULL,
        enabled BOOLEAN DEFAULT false,
        channel_id VARCHAR(255),
        user_cooldown_minutes INTEGER DEFAULT 10,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create dice_game_cooldowns table to track user cooldowns
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dice_game_cooldowns (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        last_played TIMESTAMP NOT NULL,
        UNIQUE(guild_id, user_id)
      )
    `)

    // Create ai_config table for AI configuration per guild
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_config (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) UNIQUE NOT NULL,
        allowed_channel_ids TEXT,
        rate_limit_per_minute INTEGER DEFAULT 5,
        rate_limit_per_hour INTEGER DEFAULT 50,
        blocked_user_ids TEXT,
        allowed_role_ids TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create ai_rate_limits table to track user rate limits
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_rate_limits (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        message_count INTEGER DEFAULT 1,
        window_start TIMESTAMP NOT NULL,
        window_type VARCHAR(20) NOT NULL,
        UNIQUE(guild_id, user_id, window_start, window_type)
      )
    `)

    // Create wordle_config table for Wordle game configuration
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wordle_config (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) UNIQUE NOT NULL,
        enabled BOOLEAN DEFAULT false,
        channel_id VARCHAR(255),
        allowed_role_ids TEXT,
        allowed_user_ids TEXT,
        dm_only BOOLEAN DEFAULT false,
        user_cooldown_minutes INTEGER DEFAULT 60,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create wordle_cooldowns table to track user cooldowns
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wordle_cooldowns (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        last_played TIMESTAMP NOT NULL,
        UNIQUE(guild_id, user_id)
      )
    `)

    // Create wordle_games table to track active games
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wordle_games (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        word VARCHAR(5) NOT NULL,
        guesses TEXT NOT NULL,
        current_guess INTEGER DEFAULT 0,
        max_guesses INTEGER DEFAULT 6,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(guild_id, user_id)
      )
    `)

    // Create game_scores table to track wins/losses for all games
    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_scores (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        game_type VARCHAR(50) NOT NULL,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        ties INTEGER DEFAULT 0,
        total_games INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(guild_id, user_id, game_type)
      )
    `)

    // Create scoreboard_config table for scoreboard configuration
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scoreboard_config (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) UNIQUE NOT NULL,
        enabled BOOLEAN DEFAULT false,
        channel_id VARCHAR(255),
        message_id VARCHAR(255),
        update_interval_minutes INTEGER DEFAULT 5,
        game_type VARCHAR(50) DEFAULT 'all',
        limit_players INTEGER DEFAULT 10,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create auto_roles_config table for reaction role configuration
    await pool.query(`
      CREATE TABLE IF NOT EXISTS auto_roles_config (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) UNIQUE NOT NULL,
        channel_id VARCHAR(255) NOT NULL,
        message_id VARCHAR(255),
        embed_title VARCHAR(255),
        embed_description TEXT,
        embed_color VARCHAR(7),
        reaction_roles TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create auto_moderator_config table for auto moderation
    await pool.query(`
      CREATE TABLE IF NOT EXISTS auto_moderator_config (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) UNIQUE NOT NULL,
        enabled BOOLEAN DEFAULT false,
        severity_level VARCHAR(20) DEFAULT 'medium',
        whitelist_words TEXT,
        blacklist_words TEXT,
        whitelist_users TEXT,
        blacklist_users TEXT,
        whitelist_channels TEXT,
        blacklist_channels TEXT,
        whitelist_roles TEXT,
        blacklist_roles TEXT,
        action_on_violation VARCHAR(50) DEFAULT 'delete',
        warn_on_violation BOOLEAN DEFAULT true,
        log_channel_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create welcome_message_config table for welcome messages
    await pool.query(`
      CREATE TABLE IF NOT EXISTS welcome_message_config (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) UNIQUE NOT NULL,
        enabled BOOLEAN DEFAULT false,
        channel_id VARCHAR(255),
        send_as_dm BOOLEAN DEFAULT false,
        message_type VARCHAR(20) DEFAULT 'text',
        message_content TEXT,
        embed_title VARCHAR(255),
        embed_description TEXT,
        embed_color VARCHAR(7),
        embed_thumbnail TEXT,
        embed_image TEXT,
        embed_footer VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create leveling_config table for leveling system configuration
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leveling_config (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) UNIQUE NOT NULL,
        enabled BOOLEAN DEFAULT false,
        xp_per_message INTEGER DEFAULT 10,
        xp_per_reaction INTEGER DEFAULT 5,
        message_cooldown_seconds INTEGER DEFAULT 60,
        min_message_length INTEGER DEFAULT 0,
        whitelist_channels TEXT,
        blacklist_channels TEXT,
        whitelist_roles TEXT,
        blacklist_roles TEXT,
        level_up_channel_id VARCHAR(255),
        level_up_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create user_levels table to track user XP and levels
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_levels (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 0,
        total_messages INTEGER DEFAULT 0,
        last_message_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(guild_id, user_id)
      )
    `)

    // Create level_role_rewards table for role rewards per level
    await pool.query(`
      CREATE TABLE IF NOT EXISTS level_role_rewards (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        level INTEGER NOT NULL,
        role_id VARCHAR(255) NOT NULL,
        UNIQUE(guild_id, level)
      )
    `)

    // Create exchange_rate_config table for exchange rate configuration
    await pool.query(`
      CREATE TABLE IF NOT EXISTS exchange_rate_config (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) UNIQUE NOT NULL,
        default_base_currency VARCHAR(10) DEFAULT 'USD',
        enabled BOOLEAN DEFAULT true,
        channel_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Add channel_id column if it doesn't exist (for existing databases)
    await pool.query(`
      ALTER TABLE exchange_rate_config 
      ADD COLUMN IF NOT EXISTS channel_id VARCHAR(255)
    `).catch(() => {
      // Ignore errors if column already exists
    })

    // Create ai_presets table for AI configuration presets
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_presets (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        provider VARCHAR(50) NOT NULL,
        provider_url TEXT,
        model VARCHAR(255) NOT NULL,
        temperature DECIMAL(3,2) DEFAULT 0.7,
        max_tokens INTEGER DEFAULT 2000,
        personality VARCHAR(50) DEFAULT 'normal',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create ai_training table for learning from reactions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_training (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        user_message TEXT NOT NULL,
        bot_response TEXT NOT NULL,
        reaction VARCHAR(20) NOT NULL,
        user_id VARCHAR(255),
        message_hash VARCHAR(64),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create index separately for PostgreSQL
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_training_guild_hash 
      ON ai_training(guild_id, message_hash)
    `).catch(() => {
      // Ignore if index already exists
    })

    // Create steam_users table for linking Discord users to Steam accounts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS steam_users (
        id SERIAL PRIMARY KEY,
        discord_user_id VARCHAR(255) NOT NULL,
        guild_id VARCHAR(255),
        steam_id VARCHAR(255) NOT NULL,
        steam_vanity_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create unique index that handles NULLs properly
    // This allows one global link (guild_id IS NULL) and one per guild
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_steam_users_discord_guild_unique 
      ON steam_users(discord_user_id, COALESCE(guild_id, ''))
    `).catch(() => {
      // Ignore if index already exists
    })

    // Create index for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_steam_users_discord_guild 
      ON steam_users(discord_user_id, guild_id)
    `).catch(() => {
      // Ignore if index already exists
    })

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_steam_users_steam_id 
      ON steam_users(steam_id)
    `).catch(() => {
      // Ignore if index already exists
    })

    // Create youtube_notification_config table for YouTube notification configuration
    await pool.query(`
      CREATE TABLE IF NOT EXISTS youtube_notification_config (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) UNIQUE NOT NULL,
        enabled BOOLEAN DEFAULT false,
        channel_id VARCHAR(255),
        check_interval_minutes INTEGER DEFAULT 10,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create youtube_channels table for tracking YouTube channels per guild
    await pool.query(`
      CREATE TABLE IF NOT EXISTS youtube_channels (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        youtube_channel_id VARCHAR(255) NOT NULL,
        youtube_channel_name VARCHAR(255),
        last_video_id VARCHAR(255),
        last_checked_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(guild_id, youtube_channel_id)
      )
    `)

    // Create index for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_youtube_channels_guild 
      ON youtube_channels(guild_id)
    `).catch(() => {
      // Ignore if index already exists
    })

    // Create x_notification_config table for X (Twitter) notification configuration
    await pool.query(`
      CREATE TABLE IF NOT EXISTS x_notification_config (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) UNIQUE NOT NULL,
        enabled BOOLEAN DEFAULT false,
        channel_id VARCHAR(255),
        check_interval_minutes INTEGER DEFAULT 10,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create x_accounts table for tracking X accounts per guild
    await pool.query(`
      CREATE TABLE IF NOT EXISTS x_accounts (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        x_username VARCHAR(255) NOT NULL,
        x_display_name VARCHAR(255),
        last_tweet_id VARCHAR(255),
        last_checked_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(guild_id, x_username)
      )
    `)

    // Create index for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_x_accounts_guild 
      ON x_accounts(guild_id)
    `).catch(() => {
      // Ignore if index already exists
    })

    // Create voting_polls table for voting system
    await pool.query(`
      CREATE TABLE IF NOT EXISTS voting_polls (
        id SERIAL PRIMARY KEY,
        poll_id VARCHAR(255) UNIQUE NOT NULL,
        guild_id VARCHAR(255) NOT NULL,
        channel_id VARCHAR(255) NOT NULL,
        message_id VARCHAR(255) NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        options TEXT NOT NULL,
        created_by VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP,
        closed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create voting_votes table for anonymous votes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS voting_votes (
        id SERIAL PRIMARY KEY,
        poll_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        option_index INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(poll_id, user_id)
      )
    `)

    // Create indexes for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_voting_polls_guild 
      ON voting_polls(guild_id)
    `).catch(() => {
      // Ignore if index already exists
    })

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_voting_polls_message 
      ON voting_polls(guild_id, channel_id, message_id)
    `).catch(() => {
      // Ignore if index already exists
    })

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_voting_votes_poll 
      ON voting_votes(poll_id)
    `).catch(() => {
      // Ignore if index already exists
    })

    // Create meme_config table for meme feature configuration
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meme_config (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) UNIQUE NOT NULL,
        enabled BOOLEAN DEFAULT false,
        channel_id VARCHAR(255),
        auto_delete_messages BOOLEAN DEFAULT false,
        auto_post_enabled BOOLEAN DEFAULT false,
        auto_post_interval_hours INTEGER DEFAULT 2,
        last_auto_post_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create events_config table for event system configuration
    await pool.query(`
      CREATE TABLE IF NOT EXISTS events_config (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) UNIQUE NOT NULL,
        enabled BOOLEAN DEFAULT false,
        announcement_channel_id VARCHAR(255),
        random_event_chance DECIMAL(5,2) DEFAULT 5.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create events table for event definitions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        event_type VARCHAR(50) NOT NULL,
        enabled BOOLEAN DEFAULT true,
        schedule_type VARCHAR(20) NOT NULL,
        schedule_data TEXT,
        duration_minutes INTEGER DEFAULT 60,
        reward_data TEXT,
        event_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create active_events table for currently running events
    await pool.query(`
      CREATE TABLE IF NOT EXISTS active_events (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        started_at TIMESTAMP NOT NULL,
        ends_at TIMESTAMP NOT NULL,
        event_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create event_participants table to track user participation
    await pool.query(`
      CREATE TABLE IF NOT EXISTS event_participants (
        id SERIAL PRIMARY KEY,
        active_event_id INTEGER NOT NULL REFERENCES active_events(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL,
        points INTEGER DEFAULT 0,
        rewards_earned TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(active_event_id, user_id)
      )
    `)

    // Create event_history table for completed events
    await pool.query(`
      CREATE TABLE IF NOT EXISTS event_history (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        event_id INTEGER NOT NULL,
        event_name VARCHAR(255) NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        started_at TIMESTAMP NOT NULL,
        ended_at TIMESTAMP NOT NULL,
        total_participants INTEGER DEFAULT 0,
        event_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create sports_config table for sports tracking configuration
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sports_config (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        enabled BOOLEAN DEFAULT false,
        sport_type VARCHAR(50) NOT NULL,
        channel_ids TEXT,
        allowed_role_ids TEXT,
        blocked_user_ids TEXT,
        role_list_type VARCHAR(20),
        data_types TEXT,
        update_interval_minutes INTEGER DEFAULT 5,
        mention_role_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(guild_id, sport_type)
      )
    `)

    // Ensure channel_ids column exists (migration for existing tables)
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'sports_config' AND column_name = 'channel_ids'
        ) THEN
          ALTER TABLE sports_config ADD COLUMN channel_ids TEXT;
        END IF;
      END $$;
    `).catch(() => {})

    // Ensure allowed_role_ids column exists (migration for existing tables)
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'sports_config' AND column_name = 'allowed_role_ids'
        ) THEN
          ALTER TABLE sports_config ADD COLUMN allowed_role_ids TEXT;
        END IF;
      END $$;
    `).catch(() => {})

    // Ensure blocked_user_ids column exists (migration for existing tables)
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'sports_config' AND column_name = 'blocked_user_ids'
        ) THEN
          ALTER TABLE sports_config ADD COLUMN blocked_user_ids TEXT;
        END IF;
      END $$;
    `).catch(() => {})

    // Ensure role_list_type column exists (migration for existing tables)
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'sports_config' AND column_name = 'role_list_type'
        ) THEN
          ALTER TABLE sports_config ADD COLUMN role_list_type VARCHAR(20);
        END IF;
      END $$;
    `).catch(() => {})

    // Create indexes for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_events_guild_enabled 
      ON events(guild_id, enabled)
    `).catch(() => {})

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_active_events_guild 
      ON active_events(guild_id)
    `).catch(() => {})

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_active_events_ends_at 
      ON active_events(ends_at)
    `).catch(() => {})

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_event_participants_active_event 
      ON event_participants(active_event_id)
    `).catch(() => {})

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_event_history_guild 
      ON event_history(guild_id)
    `).catch(() => {})

    // Create reminders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reminders (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        time_utc TIME NOT NULL,
        days_of_week INTEGER[],
        delivery_method VARCHAR(20) NOT NULL DEFAULT 'channel',
        channel_id VARCHAR(255),
        enabled BOOLEAN DEFAULT true,
        last_triggered_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reminders_guild_user 
      ON reminders(guild_id, user_id)
    `).catch(() => {})

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reminders_enabled 
      ON reminders(enabled)
    `).catch(() => {})

    console.log('Database initialized')
  } catch (error) {
    console.error('Database initialization failed:', error)
    throw error
  }
}

export function getDatabase() {
  return pool
}

