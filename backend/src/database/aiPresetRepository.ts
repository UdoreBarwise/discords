import { getDatabase } from './database.js'

export interface AIPreset {
  id?: number
  name: string
  provider: string
  providerUrl?: string
  model: string
  temperature: number
  maxTokens: number
  personality: string
  createdAt?: Date
  updatedAt?: Date
}

export const aiPresetRepository = {
  async getAll(): Promise<AIPreset[]> {
    const pool = getDatabase()
    const result = await pool.query('SELECT * FROM ai_presets ORDER BY name ASC')
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      provider: row.provider,
      providerUrl: row.provider_url || undefined,
      model: row.model,
      temperature: parseFloat(row.temperature),
      maxTokens: row.max_tokens,
      personality: row.personality,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  },

  async get(id: number): Promise<AIPreset | null> {
    const pool = getDatabase()
    const result = await pool.query('SELECT * FROM ai_presets WHERE id = $1', [id])
    if (result.rows.length === 0) {
      return null
    }
    const row = result.rows[0]
    return {
      id: row.id,
      name: row.name,
      provider: row.provider,
      providerUrl: row.provider_url || undefined,
      model: row.model,
      temperature: parseFloat(row.temperature),
      maxTokens: row.max_tokens,
      personality: row.personality,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  },

  async getByName(name: string): Promise<AIPreset | null> {
    const pool = getDatabase()
    const result = await pool.query('SELECT * FROM ai_presets WHERE name = $1', [name])
    if (result.rows.length === 0) {
      return null
    }
    const row = result.rows[0]
    return {
      id: row.id,
      name: row.name,
      provider: row.provider,
      providerUrl: row.provider_url || undefined,
      model: row.model,
      temperature: parseFloat(row.temperature),
      maxTokens: row.max_tokens,
      personality: row.personality,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  },

  async create(preset: AIPreset): Promise<AIPreset> {
    const pool = getDatabase()
    const result = await pool.query(
      `INSERT INTO ai_presets (name, provider, provider_url, model, temperature, max_tokens, personality, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        preset.name,
        preset.provider,
        preset.providerUrl || null,
        preset.model,
        preset.temperature,
        preset.maxTokens,
        preset.personality,
      ]
    )
    const row = result.rows[0]
    return {
      id: row.id,
      name: row.name,
      provider: row.provider,
      providerUrl: row.provider_url || undefined,
      model: row.model,
      temperature: parseFloat(row.temperature),
      maxTokens: row.max_tokens,
      personality: row.personality,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  },

  async update(id: number, preset: Partial<AIPreset>): Promise<AIPreset> {
    const pool = getDatabase()
    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (preset.name !== undefined) {
      updates.push(`name = $${paramCount++}`)
      values.push(preset.name)
    }
    if (preset.provider !== undefined) {
      updates.push(`provider = $${paramCount++}`)
      values.push(preset.provider)
    }
    if (preset.providerUrl !== undefined) {
      updates.push(`provider_url = $${paramCount++}`)
      values.push(preset.providerUrl || null)
    }
    if (preset.model !== undefined) {
      updates.push(`model = $${paramCount++}`)
      values.push(preset.model)
    }
    if (preset.temperature !== undefined) {
      updates.push(`temperature = $${paramCount++}`)
      values.push(preset.temperature)
    }
    if (preset.maxTokens !== undefined) {
      updates.push(`max_tokens = $${paramCount++}`)
      values.push(preset.maxTokens)
    }
    if (preset.personality !== undefined) {
      updates.push(`personality = $${paramCount++}`)
      values.push(preset.personality)
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(id)

    const result = await pool.query(
      `UPDATE ai_presets SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    )

    const row = result.rows[0]
    return {
      id: row.id,
      name: row.name,
      provider: row.provider,
      providerUrl: row.provider_url || undefined,
      model: row.model,
      temperature: parseFloat(row.temperature),
      maxTokens: row.max_tokens,
      personality: row.personality,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  },

  async delete(id: number): Promise<void> {
    const pool = getDatabase()
    await pool.query('DELETE FROM ai_presets WHERE id = $1', [id])
  },
}

