interface ExchangeRateResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}

interface ConversionResult {
  amount: number;
  from: string;
  to: string;
  rate: number;
  result: number;
  timestamp: string;
}

interface CurrencyInfo {
  code: string;
  name: string;
  symbol?: string;
}

class ExchangeRateService {
  private apiKey: string | null = null;
  private baseUrl = 'https://api.exchangerate-api.com/v4';
  private fallbackUrl = 'https://api.frankfurter.app';

  constructor() {
    // You can set API key via environment variable if using a paid service
    this.apiKey = process.env.EXCHANGE_RATE_API_KEY || null;
  }

  async getExchangeRates(base: string = 'USD'): Promise<ExchangeRateResponse> {
    try {
      // Try primary API first (free tier)
      const response = await fetch(`${this.baseUrl}/latest/${base}`);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        base: data.base || base,
        date: data.date || new Date().toISOString().split('T')[0],
        rates: data.rates || {}
      };
    } catch (error: any) {
      // Fallback to alternative API
      try {
        const fallbackResponse = await fetch(`${this.fallbackUrl}/latest?from=${base}`);
        
        if (!fallbackResponse.ok) {
          throw new Error(`Fallback API request failed: ${fallbackResponse.statusText}`);
        }

        const fallbackData = await fallbackResponse.json();
        
        return {
          base: fallbackData.base || base,
          date: fallbackData.date || new Date().toISOString().split('T')[0],
          rates: fallbackData.rates || {}
        };
      } catch (fallbackError: any) {
        throw new Error(`Failed to fetch exchange rates: ${fallbackError.message}`);
      }
    }
  }

  async convertCurrency(amount: number, from: string, to: string): Promise<ConversionResult> {
    try {
      const rates = await this.getExchangeRates(from);
      
      if (!rates.rates[to]) {
        throw new Error(`Currency ${to} not found in exchange rates`);
      }

      const rate = rates.rates[to];
      const result = amount * rate;

      return {
        amount,
        from,
        to,
        rate,
        result,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      throw new Error(`Currency conversion failed: ${error.message}`);
    }
  }

  async getSupportedCurrencies(): Promise<CurrencyInfo[]> {
    try {
      // Get rates to determine supported currencies
      const rates = await this.getExchangeRates('USD');
      const currencies: CurrencyInfo[] = [];

      // Common currency names mapping
      const currencyNames: Record<string, string> = {
        'USD': 'US Dollar',
        'EUR': 'Euro',
        'GBP': 'British Pound',
        'JPY': 'Japanese Yen',
        'AUD': 'Australian Dollar',
        'CAD': 'Canadian Dollar',
        'CHF': 'Swiss Franc',
        'CNY': 'Chinese Yuan',
        'INR': 'Indian Rupee',
        'BRL': 'Brazilian Real',
        'ZAR': 'South African Rand',
        'MXN': 'Mexican Peso',
        'SGD': 'Singapore Dollar',
        'HKD': 'Hong Kong Dollar',
        'NZD': 'New Zealand Dollar',
        'KRW': 'South Korean Won',
        'TRY': 'Turkish Lira',
        'RUB': 'Russian Ruble',
        'NOK': 'Norwegian Krone',
        'SEK': 'Swedish Krona',
        'DKK': 'Danish Krone',
        'PLN': 'Polish Zloty',
        'THB': 'Thai Baht',
        'IDR': 'Indonesian Rupiah',
        'MYR': 'Malaysian Ringgit',
        'PHP': 'Philippine Peso',
        'AED': 'UAE Dirham',
        'SAR': 'Saudi Riyal',
        'ILS': 'Israeli Shekel'
      };

      // Add base currency
      currencies.push({
        code: rates.base,
        name: currencyNames[rates.base] || rates.base
      });

      // Add all other currencies
      Object.keys(rates.rates).forEach(code => {
        if (code !== rates.base) {
          currencies.push({
            code,
            name: currencyNames[code] || code
          });
        }
      });

      return currencies.sort((a, b) => a.code.localeCompare(b.code));
    } catch (error: any) {
      throw new Error(`Failed to get supported currencies: ${error.message}`);
    }
  }

  async getHistoricalRates(base: string, date: string): Promise<ExchangeRateResponse> {
    try {
      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        throw new Error('Invalid date format. Use YYYY-MM-DD');
      }

      // Try primary API
      const response = await fetch(`${this.baseUrl}/history/${base}/${date}`);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        base: data.base || base,
        date: data.date || date,
        rates: data.rates || {}
      };
    } catch (error: any) {
      // Fallback to alternative API
      try {
        const fallbackResponse = await fetch(`${this.fallbackUrl}/${date}?from=${base}`);
        
        if (!fallbackResponse.ok) {
          throw new Error(`Fallback API request failed: ${fallbackResponse.statusText}`);
        }

        const fallbackData = await fallbackResponse.json();
        
        return {
          base: fallbackData.base || base,
          date: fallbackData.date || date,
          rates: fallbackData.rates || {}
        };
      } catch (fallbackError: any) {
        throw new Error(`Failed to fetch historical rates: ${fallbackError.message}`);
      }
    }
  }
}

export const exchangeRateService = new ExchangeRateService();

