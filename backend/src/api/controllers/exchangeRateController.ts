import { Request, Response } from 'express';
import { exchangeRateService } from '../../services/exchangeRateService';
import { exchangeRateRepository, ExchangeRateConfig } from '../../database/exchangeRateRepository.js';

export const exchangeRateController = {
  // Get exchange rates
  getRates: async (req: Request, res: Response) => {
    try {
      const { base = 'USD' } = req.query;
      const rates = await exchangeRateService.getExchangeRates(base as string);
      res.json(rates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // Convert currency
  convertCurrency: async (req: Request, res: Response) => {
    try {
      const { amount, from, to } = req.body;
      
      if (!amount || !from || !to) {
        return res.status(400).json({ error: 'Missing required fields: amount, from, to' });
      }

      const result = await exchangeRateService.convertCurrency(
        parseFloat(amount),
        from,
        to
      );
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get supported currencies
  getSupportedCurrencies: async (req: Request, res: Response) => {
    try {
      const currencies = await exchangeRateService.getSupportedCurrencies();
      res.json(currencies);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get historical rates
  getHistoricalRates: async (req: Request, res: Response) => {
    try {
      const { base = 'USD', date } = req.query;
      
      if (!date) {
        return res.status(400).json({ error: 'Missing required field: date (YYYY-MM-DD)' });
      }

      const rates = await exchangeRateService.getHistoricalRates(
        base as string,
        date as string
      );
      
      res.json(rates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get config
  getConfig: async (req: Request, res: Response) => {
    try {
      const { guildId } = req.query;
      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'guildId is required' });
      }

      const config = await exchangeRateRepository.getConfig(guildId);
      if (!config) {
        return res.json({
          guildId,
          enabled: false,
          defaultBaseCurrency: 'USD',
          channelId: '',
        });
      }

      res.json(config);
    } catch (error: any) {
      console.error('Error getting exchange rate config:', error);
      res.status(500).json({ error: 'Failed to get exchange rate config' });
    }
  },

  // Save config
  saveConfig: async (req: Request, res: Response) => {
    try {
      const { guildId, enabled, defaultBaseCurrency, channelId } = req.body;

      if (!guildId || typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'Invalid configuration data' });
      }

      const existingConfig = await exchangeRateRepository.getConfig(guildId);
      const config: ExchangeRateConfig = {
        guildId,
        enabled,
        defaultBaseCurrency: defaultBaseCurrency || 'USD',
        channelId: channelId || undefined,
      };

      if (existingConfig) {
        await exchangeRateRepository.updateConfig(guildId, config);
      } else {
        await exchangeRateRepository.createConfig(config);
      }

      res.json({ success: true, message: 'Configuration saved' });
    } catch (error: any) {
      console.error('Error saving exchange rate config:', error);
      res.status(500).json({ error: 'Failed to save exchange rate config' });
    }
  },
};

