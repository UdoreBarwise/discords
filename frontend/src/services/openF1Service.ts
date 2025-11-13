import { apiClient } from './apiClient'

export interface CarData {
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

export interface Driver {
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

export interface Lap {
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

export interface Position {
  date: string
  driver_number: number
  meeting_key: number
  position: number
  session_key: number
}

export interface Session {
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

export interface Weather {
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

export interface TeamRadio {
  date: string
  driver_number: number
  meeting_key: number
  recording_url: string
  session_key: number
}

export const openF1Service = {
  async getCarData(params?: Record<string, any>): Promise<CarData[]> {
    try {
      const response = await apiClient.get('/api/openf1/car-data', { params })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get car data')
    }
  },

  async getDrivers(params?: Record<string, any>): Promise<Driver[]> {
    try {
      const response = await apiClient.get('/api/openf1/drivers', { params })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get drivers')
    }
  },

  async getLaps(params?: Record<string, any>): Promise<Lap[]> {
    try {
      const response = await apiClient.get('/api/openf1/laps', { params })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get laps')
    }
  },

  async getPositions(params?: Record<string, any>): Promise<Position[]> {
    try {
      const response = await apiClient.get('/api/openf1/positions', { params })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get positions')
    }
  },

  async getSessions(params?: Record<string, any>): Promise<Session[]> {
    try {
      const response = await apiClient.get('/api/openf1/sessions', { params })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get sessions')
    }
  },

  async getMeetings(params?: Record<string, any>): Promise<any[]> {
    try {
      const response = await apiClient.get('/api/openf1/meetings', { params })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get meetings')
    }
  },

  async getWeather(params?: Record<string, any>): Promise<Weather[]> {
    try {
      const response = await apiClient.get('/api/openf1/weather', { params })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get weather')
    }
  },

  async getTeamRadio(params?: Record<string, any>): Promise<TeamRadio[]> {
    try {
      const response = await apiClient.get('/api/openf1/team-radio', { params })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get team radio')
    }
  },

  async getLatestSession(): Promise<Session> {
    try {
      const response = await apiClient.get('/api/openf1/latest-session')
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get latest session')
    }
  },

  async getLatestMeeting(): Promise<any> {
    try {
      const response = await apiClient.get('/api/openf1/latest-meeting')
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get latest meeting')
    }
  },
}

