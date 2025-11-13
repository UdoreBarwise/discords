import { Request, Response } from 'express'
import { votingService } from '../../services/votingService.js'
import { votingRepository } from '../../database/votingRepository.js'

export const votingController = {
  async createPoll(req: Request, res: Response) {
    try {
      const { guildId, channelId, title, description, options, expiresAt } = req.body
      const createdBy = (req as any).user?.id || 'unknown'

      if (!guildId || !channelId || !title || !options || !Array.isArray(options)) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      if (options.length < 2) {
        return res.status(400).json({ error: 'A poll must have at least 2 options' })
      }

      if (options.length > 10) {
        return res.status(400).json({ error: 'A poll can have at most 10 options' })
      }

      const result = await votingService.createPoll({
        guildId,
        channelId,
        title,
        description,
        options,
        createdBy,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      })

      res.json({ success: true, pollId: result.pollId, messageId: result.messageId })
    } catch (error: any) {
      console.error('Error creating poll:', error)
      res.status(500).json({ error: error.message || 'Failed to create poll' })
    }
  },

  async getPoll(req: Request, res: Response) {
    try {
      const { pollId } = req.params

      if (!pollId) {
        return res.status(400).json({ error: 'pollId is required' })
      }

      const poll = await votingRepository.getPoll(pollId)
      if (!poll) {
        return res.status(404).json({ error: 'Poll not found' })
      }

      const voteCounts = await votingRepository.getVoteCounts(pollId)
      const totalVotes = await votingRepository.getTotalVotes(pollId)

      res.json({
        poll,
        voteCounts,
        totalVotes,
      })
    } catch (error) {
      console.error('Error getting poll:', error)
      res.status(500).json({ error: 'Failed to get poll' })
    }
  },

  async getPolls(req: Request, res: Response) {
    try {
      const { guildId } = req.query
      const includeClosed = req.query.includeClosed === 'true'

      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' })
      }

      const polls = await votingRepository.getPollsByGuild(guildId, includeClosed)
      res.json(polls)
    } catch (error) {
      console.error('Error getting polls:', error)
      res.status(500).json({ error: 'Failed to get polls' })
    }
  },

  async vote(req: Request, res: Response) {
    try {
      const { pollId, optionIndex } = req.body
      const userId = (req as any).user?.id || 'unknown'

      if (!pollId || typeof optionIndex !== 'number') {
        return res.status(400).json({ error: 'pollId and optionIndex are required' })
      }

      await votingService.handleVote(pollId, userId, optionIndex)
      res.json({ success: true })
    } catch (error: any) {
      console.error('Error voting:', error)
      res.status(500).json({ error: error.message || 'Failed to vote' })
    }
  },

  async closePoll(req: Request, res: Response) {
    try {
      const { pollId } = req.params

      if (!pollId) {
        return res.status(400).json({ error: 'pollId is required' })
      }

      await votingService.closePoll(pollId)
      res.json({ success: true })
    } catch (error: any) {
      console.error('Error closing poll:', error)
      res.status(500).json({ error: error.message || 'Failed to close poll' })
    }
  },

  async deletePoll(req: Request, res: Response) {
    try {
      const { pollId } = req.params

      if (!pollId) {
        return res.status(400).json({ error: 'pollId is required' })
      }

      await votingRepository.deletePoll(pollId)
      res.json({ success: true })
    } catch (error) {
      console.error('Error deleting poll:', error)
      res.status(500).json({ error: 'Failed to delete poll' })
    }
  },
}

