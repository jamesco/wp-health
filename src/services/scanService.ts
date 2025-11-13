import { PrismaClient } from '@prisma/client';
import { GoogleScraper, BusinessResult } from './googleScraper';
import { WordPressDetector, WordPressInfo } from './wordpressDetector';

const prisma = new PrismaClient();

export class ScanService {
  private googleScraper: GoogleScraper;
  private wpDetector: WordPressDetector;

  constructor() {
    this.googleScraper = new GoogleScraper();
    this.wpDetector = new WordPressDetector();
  }

  /**
   * Start a new scan for WordPress sites
   */
  async startScan(userId: string, query: string, category?: string, location?: string): Promise<string> {
    // Check user's subscription and remaining leads
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription || subscription.status !== 'active') {
      throw new Error('Active subscription required');
    }

    // Check if user has exceeded their weekly limit
    if (subscription.leadsUsedThisWeek >= subscription.leadsPerWeek) {
      throw new Error('Weekly lead limit reached');
    }

    // Reset weekly counter if week has passed
    const weekStart = new Date(subscription.weekStartDate);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff >= 7) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          leadsUsedThisWeek: 0,
          weekStartDate: now,
        },
      });
    }

    // Create search record
    const search = await prisma.search.create({
      data: {
        userId,
        query,
        category,
        location,
        status: 'pending',
      },
    });

    // Start the scan asynchronously (don't await)
    this.executeScan(search.id, userId, query).catch(error => {
      console.error(`Scan ${search.id} failed:`, error);
      prisma.search.update({
        where: { id: search.id },
        data: { status: 'failed' },
      });
    });

    return search.id;
  }

  /**
   * Execute the scan process
   */
  private async executeScan(searchId: string, userId: string, query: string): Promise<void> {
    console.log(`Starting scan ${searchId} for query: ${query}`);

    try {
      // Update status to processing
      await prisma.search.update({
        where: { id: searchId },
        data: { status: 'processing' },
      });

      // Get user's subscription to check limits
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      const remainingLeads = subscription.leadsPerWeek - subscription.leadsUsedThisWeek;
      const targetLeads = Math.min(50, remainingLeads);

      // Step 1: Search for businesses
      console.log(`Searching for businesses: ${query}`);
      let businesses: BusinessResult[] = [];

      try {
        // Try Google first
        businesses = await this.googleScraper.searchBusinesses(query, targetLeads * 2);
      } catch (error) {
        console.log('Google search failed, trying DuckDuckGo');
        businesses = await this.googleScraper.searchWithDuckDuckGo(query, targetLeads * 2);
      }

      if (businesses.length === 0) {
        throw new Error('No businesses found');
      }

      console.log(`Found ${businesses.length} businesses`);

      await prisma.search.update({
        where: { id: searchId },
        data: { totalSites: businesses.length },
      });

      // Step 2: Scan each site for WordPress
      let wpSitesFound = 0;
      let leadsCreated = 0;

      for (const business of businesses) {
        if (leadsCreated >= targetLeads) {
          break;
        }

        try {
          console.log(`Scanning: ${business.url}`);

          // Detect WordPress
          const wpInfo = await this.wpDetector.detectWordPress(business.url);

          if (wpInfo.isWordPress) {
            wpSitesFound++;

            // Calculate score based on outdated components
            const score = this.calculateScore(wpInfo);

            // Create lead
            await prisma.lead.create({
              data: {
                searchId,
                userId,
                url: business.url,
                businessName: business.name,
                isWordPress: true,
                wpVersion: wpInfo.wpVersion,
                wpOutdated: wpInfo.wpOutdated,
                plugins: wpInfo.plugins as any,
                themes: wpInfo.themes as any,
                woocommerce: wpInfo.woocommerce as any,
                score,
              },
            });

            leadsCreated++;

            // Update subscription usage
            await prisma.subscription.update({
              where: { userId },
              data: {
                leadsUsedThisWeek: {
                  increment: 1,
                },
              },
            });

            console.log(`Lead created for ${business.url} (score: ${score})`);
          }

          // Small delay between requests to be polite
          await this.delay(500);

        } catch (error) {
          console.error(`Error scanning ${business.url}:`, error);
          // Continue with next site
        }
      }

      // Update search record
      await prisma.search.update({
        where: { id: searchId },
        data: {
          status: 'completed',
          wpSitesFound,
        },
      });

      console.log(`Scan ${searchId} completed. Found ${wpSitesFound} WordPress sites, created ${leadsCreated} leads`);

    } catch (error) {
      console.error(`Scan ${searchId} failed:`, error);
      await prisma.search.update({
        where: { id: searchId },
        data: { status: 'failed' },
      });
      throw error;
    }
  }

  /**
   * Calculate a score (0-100) based on how outdated the WordPress site is
   */
  private calculateScore(wpInfo: WordPressInfo): number {
    let score = 0;

    // WordPress version (40 points)
    if (wpInfo.wpOutdated) {
      score += 40;
    } else if (wpInfo.wpVersion) {
      const version = parseFloat(wpInfo.wpVersion);
      if (version < 6.4) score += 30;
      else if (version < 6.5) score += 20;
      else if (version < 6.6) score += 10;
    }

    // Number of plugins (30 points)
    const pluginCount = wpInfo.plugins.length;
    if (pluginCount > 20) score += 30;
    else if (pluginCount > 10) score += 20;
    else if (pluginCount > 5) score += 10;

    // WooCommerce detected (20 points)
    if (wpInfo.woocommerce?.detected) {
      score += 20;
    }

    // Number of themes (10 points - multiple themes might indicate abandoned sites)
    if (wpInfo.themes.length > 2) {
      score += 10;
    } else if (wpInfo.themes.length > 1) {
      score += 5;
    }

    return Math.min(100, score);
  }

  /**
   * Get scan status
   */
  async getScanStatus(searchId: string, userId: string) {
    const search = await prisma.search.findFirst({
      where: { id: searchId, userId },
      include: {
        leads: {
          orderBy: { score: 'desc' },
        },
      },
    });

    if (!search) {
      throw new Error('Search not found');
    }

    return search;
  }

  /**
   * Get all searches for a user
   */
  async getUserSearches(userId: string) {
    return prisma.search.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { leads: true },
        },
      },
    });
  }

  /**
   * Get leads for a search
   */
  async getSearchLeads(searchId: string, userId: string) {
    const search = await prisma.search.findFirst({
      where: { id: searchId, userId },
    });

    if (!search) {
      throw new Error('Search not found');
    }

    return prisma.lead.findMany({
      where: { searchId },
      orderBy: { score: 'desc' },
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
