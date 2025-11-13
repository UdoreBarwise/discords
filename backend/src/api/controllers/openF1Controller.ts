import { Request, Response } from 'express'
import { openF1Service } from '../../services/openF1Service.js'

export const openF1Controller = {
  // Get car data
  getCarData: async (req: Request, res: Response) => {
    try {
      const data = await openF1Service.getCarData(req.query as any)
      res.json(data)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  // Get drivers
  getDrivers: async (req: Request, res: Response) => {
    try {
      const data = await openF1Service.getDrivers(req.query as any)
      res.json(data)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  // Get laps
  getLaps: async (req: Request, res: Response) => {
    try {
      const data = await openF1Service.getLaps(req.query as any)
      res.json(data)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  // Get positions
  getPositions: async (req: Request, res: Response) => {
    try {
      const data = await openF1Service.getPositions(req.query as any)
      res.json(data)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  // Get sessions
  getSessions: async (req: Request, res: Response) => {
    try {
      const data = await openF1Service.getSessions(req.query as any)
      res.json(data)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  // Get meetings
  getMeetings: async (req: Request, res: Response) => {
    try {
      const data = await openF1Service.getMeetings(req.query as any)
      res.json(data)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  // Get weather
  getWeather: async (req: Request, res: Response) => {
    try {
      const data = await openF1Service.getWeather(req.query as any)
      res.json(data)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  // Get team radio
  getTeamRadio: async (req: Request, res: Response) => {
    try {
      const data = await openF1Service.getTeamRadio(req.query as any)
      res.json(data)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  // Get latest session
  getLatestSession: async (req: Request, res: Response) => {
    try {
      const session = await openF1Service.getLatestSession()
      if (!session) {
        return res.status(404).json({ error: 'No session found' })
      }
      res.json(session)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  // Get latest meeting
  getLatestMeeting: async (req: Request, res: Response) => {
    try {
      const meeting = await openF1Service.getLatestMeeting()
      if (!meeting) {
        return res.status(404).json({ error: 'No meeting found' })
      }
      res.json(meeting)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  // Get session results
  getSessionResults: async (req: Request, res: Response) => {
    try {
      const data = await openF1Service.getSessionResults(req.query as any)
      res.json(data)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },
}

