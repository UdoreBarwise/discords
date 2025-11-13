import { apiClient } from './apiClient'

export interface VotingPoll {
  id: number
  pollId: string
  guildId: string
  channelId: string
  messageId: string
  title: string
  description?: string
  options: string[]
  createdBy: string
  createdAt: string
  expiresAt?: string
  closed: boolean
}

export interface PollResults {
  poll: VotingPoll
  voteCounts: Record<number, number>
  totalVotes: number
}

export interface CreatePollRequest {
  guildId: string
  channelId: string
  title: string
  description?: string
  options: string[]
  expiresAt?: string
}

export const votingService = {
  async createPoll(request: CreatePollRequest): Promise<{ pollId: string; messageId: string }> {
    const response = await apiClient.post('/api/voting/polls', request)
    return response.data
  },

  async getPoll(pollId: string): Promise<PollResults> {
    const response = await apiClient.get(`/api/voting/polls/${pollId}`)
    return response.data
  },

  async getPolls(guildId: string, includeClosed: boolean = false): Promise<VotingPoll[]> {
    const response = await apiClient.get('/api/voting/polls', {
      params: { guildId, includeClosed },
    })
    return response.data
  },

  async vote(pollId: string, optionIndex: number): Promise<void> {
    await apiClient.post('/api/voting/vote', { pollId, optionIndex })
  },

  async closePoll(pollId: string): Promise<void> {
    await apiClient.post(`/api/voting/polls/${pollId}/close`)
  },

  async deletePoll(pollId: string): Promise<void> {
    await apiClient.delete(`/api/voting/polls/${pollId}`)
  },
}

