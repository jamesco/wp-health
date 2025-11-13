import axios from 'axios';
import * as cheerio from 'cheerio';

export interface WordPressInfo {
  isWordPress: boolean;
  wpVersion?: string;
  wpOutdated?: boolean;
  plugins: Array<{
    name: string;
    version?: string;
    slug?: string;
  }>;
  themes: Array<{
    name: string;
    version?: string;
    slug?: string;
  }>;
  woocommerce?: {
    version?: string;
    detected: boolean;
  };
  detectionMethods: string[];
}

export class WordPressDetector {
  private timeout = 15000; // 15 seconds
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

  async detectWordPress(url: string): Promise<WordPressInfo> {
    const result: WordPressInfo = {
      isWordPress: false,
      plugins: [],
      themes: [],
      detectionMethods: [],
    };

    try {
      // Normalize URL
      const normalizedUrl = this.normalizeUrl(url);

      // Fetch the HTML
      const html = await this.fetchPage(normalizedUrl);
      const $ = cheerio.load(html);

      // Method 1: Check meta generator tag
      const generator = $('meta[name="generator"]').attr('content');
      if (generator && generator.toLowerCase().includes('wordpress')) {
        result.isWordPress = true;
        result.detectionMethods.push('meta-generator');

        // Extract version from generator
        const versionMatch = generator.match(/WordPress\s+([\d.]+)/i);
        if (versionMatch) {
          result.wpVersion = versionMatch[1];
        }
      }

      // Method 2: Check for wp-content in HTML
      if (html.includes('/wp-content/') || html.includes('/wp-includes/')) {
        result.isWordPress = true;
        result.detectionMethods.push('wp-content-path');
      }

      // Method 3: Check for WordPress-specific CSS/JS files
      const wpLinks = $('link[href*="wp-content"], link[href*="wp-includes"], script[src*="wp-content"], script[src*="wp-includes"]');
      if (wpLinks.length > 0) {
        result.isWordPress = true;
        result.detectionMethods.push('wp-assets');
      }

      // If WordPress detected, get more details
      if (result.isWordPress) {
        // Detect plugins
        result.plugins = this.detectPlugins($, html);

        // Detect themes
        result.themes = this.detectThemes($, html);

        // Detect WooCommerce
        result.woocommerce = this.detectWooCommerce($, html);

        // Try to get WordPress version if not found yet
        if (!result.wpVersion) {
          result.wpVersion = await this.detectWordPressVersion(normalizedUrl, $, html);
        }

        // Check if WordPress is outdated (latest stable is ~6.4+)
        if (result.wpVersion) {
          const version = parseFloat(result.wpVersion);
          result.wpOutdated = version < 6.0;
        }
      }

      // Method 4: Try to access wp-login.php (be careful with this)
      if (!result.isWordPress) {
        const hasWpLogin = await this.checkWpLogin(normalizedUrl);
        if (hasWpLogin) {
          result.isWordPress = true;
          result.detectionMethods.push('wp-login-page');
        }
      }

    } catch (error) {
      console.error(`Error detecting WordPress for ${url}:`, error);
      // Return the result even if there's an error - it might have partial data
    }

    return result;
  }

  private normalizeUrl(url: string): string {
    // Add https:// if no protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    // Remove trailing slash
    return url.replace(/\/$/, '');
  }

  private async fetchPage(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': this.userAgent,
        },
        maxRedirects: 5,
        validateStatus: (status) => status < 500, // Accept redirects and 404s
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch ${url}: ${error}`);
    }
  }

  private detectPlugins($: cheerio.CheerioAPI, html: string): Array<{ name: string; version?: string; slug?: string }> {
    const plugins: Array<{ name: string; version?: string; slug?: string }> = [];
    const pluginSet = new Set<string>();

    // Check link and script tags for plugin paths
    $('link[href*="/wp-content/plugins/"], script[src*="/wp-content/plugins/"]').each((_, elem) => {
      const href = $(elem).attr('href') || $(elem).attr('src') || '';
      const match = href.match(/\/wp-content\/plugins\/([^\/]+)/);

      if (match && match[1]) {
        const slug = match[1];
        if (!pluginSet.has(slug)) {
          pluginSet.add(slug);

          // Try to extract version from the file path
          const versionMatch = href.match(/[?&]ver=([\d.]+)/);

          plugins.push({
            name: this.slugToName(slug),
            slug: slug,
            version: versionMatch ? versionMatch[1] : undefined,
          });
        }
      }
    });

    // Check HTML comments for plugin signatures
    const commentMatches = html.matchAll(/<!--.*?wp-content\/plugins\/([^\/]+).*?-->/gs);
    for (const match of commentMatches) {
      const slug = match[1];
      if (slug && !pluginSet.has(slug)) {
        pluginSet.add(slug);
        plugins.push({
          name: this.slugToName(slug),
          slug: slug,
        });
      }
    }

    return plugins;
  }

  private detectThemes($: cheerio.CheerioAPI, html: string): Array<{ name: string; version?: string; slug?: string }> {
    const themes: Array<{ name: string; version?: string; slug?: string }> = [];
    const themeSet = new Set<string>();

    // Check link and script tags for theme paths
    $('link[href*="/wp-content/themes/"], script[src*="/wp-content/themes/"]').each((_, elem) => {
      const href = $(elem).attr('href') || $(elem).attr('src') || '';
      const match = href.match(/\/wp-content\/themes\/([^\/]+)/);

      if (match && match[1]) {
        const slug = match[1];
        if (!themeSet.has(slug)) {
          themeSet.add(slug);

          // Try to extract version
          const versionMatch = href.match(/[?&]ver=([\d.]+)/);

          themes.push({
            name: this.slugToName(slug),
            slug: slug,
            version: versionMatch ? versionMatch[1] : undefined,
          });
        }
      }
    });

    return themes;
  }

  private detectWooCommerce($: cheerio.CheerioAPI, html: string): { version?: string; detected: boolean } {
    const result = { detected: false, version: undefined as string | undefined };

    // Check for WooCommerce specific classes or attributes
    if (
      $('.woocommerce').length > 0 ||
      $('[class*="woocommerce"]').length > 0 ||
      html.includes('woocommerce') ||
      html.includes('/wp-content/plugins/woocommerce/')
    ) {
      result.detected = true;

      // Try to find version
      const versionMatch = html.match(/woocommerce[^\d]*([\d.]+)/i);
      if (versionMatch) {
        result.version = versionMatch[1];
      }

      // Check CSS/JS files for version
      $('link[href*="woocommerce"], script[src*="woocommerce"]').each((_, elem) => {
        const href = $(elem).attr('href') || $(elem).attr('src') || '';
        const verMatch = href.match(/[?&]ver=([\d.]+)/);
        if (verMatch && !result.version) {
          result.version = verMatch[1];
        }
      });
    }

    return result;
  }

  private async detectWordPressVersion(baseUrl: string, $: cheerio.CheerioAPI, html: string): Promise<string | undefined> {
    // Method 1: Check for version in feed links
    const feedLink = $('link[type="application/rss+xml"]').attr('href');
    if (feedLink) {
      const versionMatch = feedLink.match(/[?&]v=([\d.]+)/);
      if (versionMatch) return versionMatch[1];
    }

    // Method 2: Check wp-includes/js files
    const scriptsWithVersion = $('script[src*="wp-includes"]');
    for (let i = 0; i < scriptsWithVersion.length; i++) {
      const src = $(scriptsWithVersion[i]).attr('src');
      if (src) {
        const versionMatch = src.match(/[?&]ver=([\d.]+)/);
        if (versionMatch) return versionMatch[1];
      }
    }

    // Method 3: Try to read readme.html
    try {
      const readmeUrl = `${baseUrl}/readme.html`;
      const readmeHtml = await this.fetchPage(readmeUrl);
      const versionMatch = readmeHtml.match(/Version\s+([\d.]+)/i);
      if (versionMatch) return versionMatch[1];
    } catch {
      // Ignore errors
    }

    return undefined;
  }

  private async checkWpLogin(baseUrl: string): Promise<boolean> {
    try {
      const loginUrl = `${baseUrl}/wp-login.php`;
      const response = await axios.get(loginUrl, {
        timeout: 5000,
        headers: { 'User-Agent': this.userAgent },
        maxRedirects: 0,
        validateStatus: (status) => status < 500,
      });

      // Check if the page contains WordPress login elements
      return response.data.includes('wp-submit') || response.data.includes('user_login');
    } catch {
      return false;
    }
  }

  private slugToName(slug: string): string {
    // Convert slug to readable name
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
