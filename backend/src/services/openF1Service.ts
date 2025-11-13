interface CarData {
  brake: number
  date: string
  driver_number: number
  drs: number
  meeting_key: number
  n_gear: number
  rpm: number
  session_key: number
  speed: number
  throttle: number
}

interface Driver {
  broadcast_name: string
  country_code: string
  driver_number: number
  first_name: string
  full_name: string
  headshot_url: string
  last_name: string
  meeting_key: number
  name_acronym: string
  session_key: number
  team_colour: string
  team_name: string
}

interface Lap {
  date_start: string
  driver_number: number
  duration_sector_1?: number
  duration_sector_2?: number
  duration_sector_3?: number
  i1_speed?: number
  i2_speed?: number
  is_pit_out_lap: boolean
  lap_duration?: number
  lap_number: number
  meeting_key: number
  segments_sector_1?: number[]
  segments_sector_2?: number[]
  segments_sector_3?: number[]
  session_key: number
  st_speed?: number
}

interface Position {
  date: string
  driver_number: number
  meeting_key: number
  position: number
  session_key: number
}

interface Session {
  circuit_key: number
  circuit_short_name: string
  country_code: string
  country_key: number
  country_name: string
  date_end: string
  date_start: string
  gmt_offset: string
  location: string
  meeting_key: number
  session_key: number
  session_name: string
  session_type: string
  year: number
}

interface Weather {
  air_temperature: number
  date: string
  humidity: number
  meeting_key: number
  pressure: number
  rainfall: number
  session_key: number
  track_temperature: number
  wind_direction: number
  wind_speed: number
}

interface TeamRadio {
  date: string
  driver_number: number
  meeting_key: number
  recording_url: string
  session_key: number
}

class OpenF1Service {
  private baseUrl = 'https://api.openf1.org/v1'

  /**
   * Build query string from parameters
   */
  private buildQueryString(params: Record<string, any>): string {
    const queryParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString())
      }
    })
    
    return queryParams.toString()
  }

  /**
   * Make API request
   */
  private async request<T>(endpoint: string, params: Record<string, any> = {}): Promise<T[]> {
    try {
      const queryString = this.buildQueryString(params)
      const url = `${this.baseUrl}/${endpoint}${queryString ? `?${queryString}` : ''}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`OpenF1 API request failed: ${response.statusText}`)
      }
      
      const data = await response.json()
      return Array.isArray(data) ? data : []
    } catch (error: any) {
      throw new Error(`Failed to fetch from OpenF1 API: ${error.message}`)
    }
  }

  /**
   * Get car data
   */
  async getCarData(params: {
    driver_number?: number
    session_key?: number | string
    meeting_key?: number | string
    speed?: number
    date?: string
    [key: string]: any
  }): Promise<CarData[]> {
    return this.request<CarData>('car_data', params)
  }

  /**
   * Get drivers
   */
  async getDrivers(params: {
    driver_number?: number
    session_key?: number | string
    meeting_key?: number | string
    [key: string]: any
  }): Promise<Driver[]> {
    return this.request<Driver>('drivers', params)
  }

  /**
   * Get laps
   */
  async getLaps(params: {
    driver_number?: number
    session_key?: number | string
    meeting_key?: number | string
    lap_number?: number
    is_pit_out_lap?: boolean
    date_start?: string
    [key: string]: any
  }): Promise<Lap[]> {
    return this.request<Lap>('laps', params)
  }

  /**
   * Get positions
   */
  async getPositions(params: {
    driver_number?: number
    session_key?: number | string
    meeting_key?: number | string
    position?: number
    date?: string
    [key: string]: any
  }): Promise<Position[]> {
    return this.request<Position>('positions', params)
  }

  /**
   * Get sessions
   */
  async getSessions(params: {
    session_key?: number | string
    meeting_key?: number | string
    year?: number
    country_name?: string
    session_name?: string
    date_start?: string
    date_end?: string
    [key: string]: any
  }): Promise<Session[]> {
    return this.request<Session>('sessions', params)
  }

  /**
   * Get meetings
   */
  async getMeetings(params: {
    meeting_key?: number | string
    year?: number
    country_name?: string
    [key: string]: any
  }): Promise<any[]> {
    return this.request('meetings', params)
  }

  /**
   * Get weather data
   */
  async getWeather(params: {
    session_key?: number | string
    meeting_key?: number | string
    date?: string
    [key: string]: any
  }): Promise<Weather[]> {
    return this.request<Weather>('weather', params)
  }

  /**
   * Get team radio
   */
  async getTeamRadio(params: {
    driver_number?: number
    session_key?: number | string
    meeting_key?: number | string
    date?: string
    [key: string]: any
  }): Promise<TeamRadio[]> {
    return this.request<TeamRadio>('team_radio', params)
  }

  /**
   * Get latest session
   */
  async getLatestSession(): Promise<Session | null> {
    const sessions = await this.getSessions({ session_key: 'latest' })
    return sessions.length > 0 ? sessions[0] : null
  }

  /**
   * Get latest meeting
   */
  async getLatestMeeting(): Promise<any | null> {
    const meetings = await this.getMeetings({ meeting_key: 'latest' })
    return meetings.length > 0 ? meetings[0] : null
  }

  /**
   * Get session results (beta)
   */
  async getSessionResults(params: {
    session_key?: number | string
    meeting_key?: number | string
    driver_number?: number
    [key: string]: any
  }): Promise<any[]> {
    return this.request('session_result', params)
  }
}

export const openF1Service = new OpenF1Service()

export type {
  CarData,
  Driver,
  Lap,
  Position,
  Session,
  Weather,
  TeamRadio,
}

