import { getDatabase } from './database.js'

export const settingsRepository = {
  async get(key: string): Promise<string | null> {
    const pool = getDatabase()
    const result = await pool.query('SELECT value FROM settings WHERE key = $1', [key])
    return result.rows[0]?.value || null
  },

  async set(key: string, value: string): Promise<void> {
    const pool = getDatabase()
    await pool.query(
      `INSERT INTO settings (key, value, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET
         value = EXCLUDED.value,
         updated_at = CURRENT_TIMESTAMP`,
      [key, value]
    )
  },

  async delete(key: string): Promise<void> {
    const pool = getDatabase()
    await pool.query('DELETE FROM settings WHERE key = $1', [key])
  },
}

