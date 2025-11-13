import { apiClient } from './apiClient'

export interface ExchangeRateResponse {
  base: string
  date: string
  rates: Record<string, number>
}

export interface ConversionResult {
  amount: number
  from: string
  to: string
  rate: number
  result: number
  timestamp: string
}

export interface CurrencyInfo {
  code: string
  name: string
  symbol?: string
}

export interface ExchangeRateConfig {
  guildId: string
  enabled: boolean
  defaultBaseCurrency: string
  channelId?: string
}

export const exchangeRateService = {
  async getRates(base: string = 'USD'): Promise<ExchangeRateResponse> {
    const response = await apiClient.get('/api/exchange-rate/rates', {
      params: { base },
    })
    return response.data
  },

  async convertCurrency(amount: number, from: string, to: string): Promise<ConversionResult> {
    const response = await apiClient.post('/api/exchange-rate/convert', {
      amount,
      from,
      to,
    })
    return response.data
  },

  async getSupportedCurrencies(): Promise<CurrencyInfo[]> {
    const response = await apiClient.get('/api/exchange-rate/currencies')
    return response.data
  },

  async getHistoricalRates(base: string, date: string): Promise<ExchangeRateResponse> {
    const response = await apiClient.get('/api/exchange-rate/historical', {
      params: { base, date },
    })
    return response.data
  },

  async getConfig(guildId: string): Promise<ExchangeRateConfig> {
    const response = await apiClient.get('/api/exchange-rate/config', {
      params: { guildId },
    })
    return response.data
  },

  async saveConfig(config: ExchangeRateConfig): Promise<void> {
    await apiClient.post('/api/exchange-rate/config', config)
  },
}

