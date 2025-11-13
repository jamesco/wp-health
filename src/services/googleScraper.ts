import axios from 'axios';
import * as cheerio from 'cheerio';

export interface BusinessResult {
  name: string;
  url: string;
  description?: string;
}

export class GoogleScraper {
  private apiKey: string;
  private searchEngineId: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY || '';
    this.searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || '';
  }

  /**
   * Search for businesses using Google Custom Search API
   */
  async searchBusinesses(query: string, limit: number = 50): Promise<BusinessResult[]> {
    const results: BusinessResult[] = [];

    // If API key is configured, use Google Custom Search API
    if (this.apiKey && this.searchEngineId) {
      return this.searchWithCustomAPI(query, limit);
    }

    // Otherwise, fall back to scraping (note: this may be blocked by Google)
    console.warn('Google API not configured, using fallback method');
    return this.searchWithScraping(query, limit);
  }

  /**
   * Use Google Custom Search API (recommended)
   */
  private async searchWithCustomAPI(query: string, limit: number): Promise<BusinessResult[]> {
    const results: BusinessResult[] = [];
    const maxPerRequest = 10; // Google API limit
    const requests = Math.ceil(limit / maxPerRequest);

    try {
      for (let i = 0; i < requests; i++) {
        const startIndex = i * maxPerRequest + 1;
        const url = 'https://www.googleapis.com/customsearch/v1';

        const response = await axios.get(url, {
          params: {
            key: this.apiKey,
            cx: this.searchEngineId,
            q: query,
            start: startIndex,
            num: Math.min(maxPerRequest, limit - results.length),
          },
        });

        if (response.data.items) {
          for (const item of response.data.items) {
            results.push({
              name: item.title,
              url: item.link,
              description: item.snippet,
            });

            if (results.length >= limit) break;
          }
        }

        // Respect rate limits
        await this.delay(100);
      }
    } catch (error) {
      console.error('Error searching with Google API:', error);
      throw new Error('Failed to search businesses');
    }

    return results;
  }

  /**
   * Fallback: Scrape Google search results (may be blocked)
   */
  private async searchWithScraping(query: string, limit: number): Promise<BusinessResult[]> {
    const results: BusinessResult[] = [];
    const pages = Math.ceil(limit / 10);

    try {
      for (let page = 0; page < pages; page++) {
        const start = page * 10;
        const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&start=${start}`;

        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          timeout: 10000,
        });

        const $ = cheerio.load(response.data);

        // Parse search results
        $('.g').each((_, elem) => {
          const titleElem = $(elem).find('h3').first();
          const linkElem = $(elem).find('a').first();
          const descElem = $(elem).find('.VwiC3b').first();

          const title = titleElem.text();
          let link = linkElem.attr('href') || '';
          const description = descElem.text();

          // Clean up the link
          if (link.startsWith('/url?q=')) {
            link = link.split('/url?q=')[1].split('&')[0];
            link = decodeURIComponent(link);
          }

          if (title && link && this.isValidUrl(link)) {
            results.push({
              name: title,
              url: link,
              description: description || undefined,
            });
          }

          if (results.length >= limit) return false; // Break
        });

        if (results.length >= limit) break;

        // Be nice to Google
        await this.delay(2000);
      }
    } catch (error) {
      console.error('Error scraping Google:', error);
      throw new Error('Failed to scrape Google search results');
    }

    return results;
  }

  /**
   * Alternative: Use DuckDuckGo (doesn't require API key)
   */
  async searchWithDuckDuckGo(query: string, limit: number = 50): Promise<BusinessResult[]> {
    const results: BusinessResult[] = [];

    try {
      const url = 'https://html.duckduckgo.com/html/';
      const response = await axios.post(
        url,
        new URLSearchParams({ q: query }),
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000,
        }
      );

      const $ = cheerio.load(response.data);

      $('.result').each((_, elem) => {
        const titleElem = $(elem).find('.result__title');
        const linkElem = $(elem).find('.result__url');
        const descElem = $(elem).find('.result__snippet');

        const title = titleElem.text().trim();
        let link = linkElem.attr('href') || '';
        const description = descElem.text().trim();

        // DuckDuckGo uses redirect URLs
        if (link.startsWith('//duckduckgo.com/l/')) {
          const urlParams = new URLSearchParams(link.split('?')[1]);
          link = urlParams.get('uddg') || link;
        }

        if (title && link && this.isValidUrl(link)) {
          results.push({
            name: title,
            url: link,
            description: description || undefined,
          });
        }

        if (results.length >= limit) return false;
      });
    } catch (error) {
      console.error('Error searching DuckDuckGo:', error);
      throw new Error('Failed to search with DuckDuckGo');
    }

    return results;
  }

  /**
   * Search using Bing (alternative)
   */
  async searchWithBing(query: string, limit: number = 50): Promise<BusinessResult[]> {
    const results: BusinessResult[] = [];
    const pages = Math.ceil(limit / 10);

    try {
      for (let page = 0; page < pages; page++) {
        const first = page * 10 + 1;
        const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&first=${first}`;

        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          timeout: 10000,
        });

        const $ = cheerio.load(response.data);

        $('.b_algo').each((_, elem) => {
          const titleElem = $(elem).find('h2 a');
          const descElem = $(elem).find('.b_caption p');

          const title = titleElem.text();
          const link = titleElem.attr('href') || '';
          const description = descElem.text();

          if (title && link && this.isValidUrl(link)) {
            results.push({
              name: title,
              url: link,
              description: description || undefined,
            });
          }

          if (results.length >= limit) return false;
        });

        if (results.length >= limit) break;

        await this.delay(1000);
      }
    } catch (error) {
      console.error('Error searching Bing:', error);
      throw new Error('Failed to search with Bing');
    }

    return results;
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
