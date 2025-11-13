import { getDatabase } from './database.js'

export type SportType = 'f1' | 'nba' | 'nfl' | 'soccer'
export type F1DataType = 'session_start' | 'session_end' | 'position_change' | 'lap_time' | 'weather_update' | 'team_radio' | 'race_start' | 'race_end'

export interface SportsConfig {
  guildId: string
  enabled: boolean
  sportType: SportType
  channelIds: string[] | null
  allowedRoleIds: string[] | null
  blockedUserIds: string[] | null
  roleListType: 'whitelist' | 'blacklist' | null
  dataTypes: F1DataType[]
  updateIntervalMinutes: number
  mentionRoleId: string | null
}

export const sportsConfigRepository = {
  async getConfig(guildId: string, sportType: SportType): Promise<SportsConfig | null> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT * FROM sports_config WHERE guild_id = $1 AND sport_type = $2',
      [guildId, sportType]
    )
    
    if (result.rows.length === 0) {
      return null
    }
    
    const row = result.rows[0]
    return {
      guildId: row.guild_id,
      enabled: row.enabled,
      sportType: row.sport_type,
      channelIds: row.channel_ids ? JSON.parse(row.channel_ids) : null,
      allowedRoleIds: row.allowed_role_ids ? JSON.parse(row.allowed_role_ids) : null,
      blockedUserIds: row.blocked_user_ids ? JSON.parse(row.blocked_user_ids) : null,
      roleListType: row.role_list_type || null,
      dataTypes: row.data_types ? JSON.parse(row.data_types) : [],
      updateIntervalMinutes: row.update_interval_minutes,
      mentionRoleId: row.mention_role_id,
    }
  },

  async getAllConfigs(guildId: string): Promise<SportsConfig[]> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT * FROM sports_config WHERE guild_id = $1',
      [guildId]
    )
    
    return result.rows.map(row => ({
      guildId: row.guild_id,
      enabled: row.enabled,
      sportType: row.sport_type,
      channelIds: row.channel_ids ? JSON.parse(row.channel_ids) : null,
      allowedRoleIds: row.allowed_role_ids ? JSON.parse(row.allowed_role_ids) : null,
      blockedUserIds: row.blocked_user_ids ? JSON.parse(row.blocked_user_ids) : null,
      roleListType: row.role_list_type || null,
      dataTypes: row.data_types ? JSON.parse(row.data_types) : [],
      updateIntervalMinutes: row.update_interval_minutes,
      mentionRoleId: row.mention_role_id,
    }))
  },

  async saveConfig(config: SportsConfig): Promise<void> {
    const pool = getDatabase()
    await pool.query(
      `INSERT INTO sports_config (
        guild_id, enabled, sport_type, channel_ids, allowed_role_ids, blocked_user_ids,
        role_list_type, data_types, update_interval_minutes, mention_role_id, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
      ON CONFLICT(guild_id, sport_type) DO UPDATE SET
        enabled = EXCLUDED.enabled,
        channel_ids = EXCLUDED.channel_ids,
        allowed_role_ids = EXCLUDED.allowed_role_ids,
        blocked_user_ids = EXCLUDED.blocked_user_ids,
        role_list_type = EXCLUDED.role_list_type,
        data_types = EXCLUDED.data_types,
        update_interval_minutes = EXCLUDED.update_interval_minutes,
        mention_role_id = EXCLUDED.mention_role_id,
        updated_at = CURRENT_TIMESTAMP`,
      [
        config.guildId,
        config.enabled,
        config.sportType,
        config.channelIds ? JSON.stringify(config.channelIds) : null,
        config.allowedRoleIds ? JSON.stringify(config.allowedRoleIds) : null,
        config.blockedUserIds ? JSON.stringify(config.blockedUserIds) : null,
        config.roleListType,
        JSON.stringify(config.dataTypes),
        config.updateIntervalMinutes,
        config.mentionRoleId,
      ]
    )
  },

  async deleteConfig(guildId: string, sportType: SportType): Promise<void> {
    const pool = getDatabase()
    await pool.query(
      'DELETE FROM sports_config WHERE guild_id = $1 AND sport_type = $2',
      [guildId, sportType]
    )
  },

  async getAllEnabledConfigs(): Promise<SportsConfig[]> {
    const pool = getDatabase()
    const result = await pool.query(
      'SELECT * FROM sports_config WHERE enabled = true'
    )
    
    return result.rows.map(row => ({
      guildId: row.guild_id,
      enabled: row.enabled,
      sportType: row.sport_type,
      channelIds: row.channel_ids ? JSON.parse(row.channel_ids) : null,
      allowedRoleIds: row.allowed_role_ids ? JSON.parse(row.allowed_role_ids) : null,
      blockedUserIds: row.blocked_user_ids ? JSON.parse(row.blocked_user_ids) : null,
      roleListType: row.role_list_type || null,
      dataTypes: row.data_types ? JSON.parse(row.data_types) : [],
      updateIntervalMinutes: row.update_interval_minutes,
      mentionRoleId: row.mention_role_id,
    }))
  },
}

