import Bull from 'bull';
import { PrismaClient } from '@prisma/client';
import { GoogleScraper } from '../services/googleScraper';
import { WordPressDetector } from '../services/wordpressDetector';

const prisma = new PrismaClient();

// Create job queues
export const scanQueue = new Bull('wordpress-scans', process.env.REDIS_URL || 'redis://localhost:6379');
export const maintenanceQueue = new Bull('maintenance', process.env.REDIS_URL || 'redis://localhost:6379');

// Job data types
interface ScanJobData {
  searchId: string;
  userId: string;
  query: string;
  category?: string;
  location?: string;
}

interface SiteScanJobData {
  searchId: string;
  userId: string;
  url: string;
  businessName: string;
}

// ============================================================================
// SCAN QUEUE PROCESSOR
// ============================================================================

scanQueue.process('start-search', 5, async (job) => {
  const { searchId, userId, query } = job.data as ScanJobData;

  console.log(`[Job ${job.id}] Starting search ${searchId} for query: ${query}`);

  try {
    // Update status
    await prisma.search.update({
      where: { id: searchId },
      data: { status: 'processing' },
    });

    // Get subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const remainingLeads = subscription.leadsPerWeek - subscription.leadsUsedThisWeek;
    const targetLeads = Math.min(50, remainingLeads);

    // Search for businesses
    const scraper = new GoogleScraper();
    let businesses;

    try {
      businesses = await scraper.searchBusinesses(query, targetLeads * 2);
    } catch (error) {
      console.log('Google search failed, trying DuckDuckGo');
      businesses = await scraper.searchWithDuckDuckGo(query, targetLeads * 2);
    }

    if (businesses.length === 0) {
      throw new Error('No businesses found');
    }

    await prisma.search.update({
      where: { id: searchId },
      data: { totalSites: businesses.length },
    });

    // Queue individual site scans (parallel processing)
    const scanJobs = businesses.slice(0, targetLeads * 2).map((business) => ({
      name: 'scan-site',
      data: {
        searchId,
        userId,
        url: business.url,
        businessName: business.name,
      },
    }));

    await scanQueue.addBulk(scanJobs);

    // Update progress
    await job.progress(50);

    console.log(`[Job ${job.id}] Queued ${scanJobs.length} site scans`);

    // Job will be marked complete when all sites are scanned
    // (handled by check-search-completion job)

  } catch (error) {
    console.error(`[Job ${job.id}] Failed:`, error);
    await prisma.search.update({
      where: { id: searchId },
      data: { status: 'failed' },
    });
    throw error;
  }
});

// ============================================================================
// SITE SCAN PROCESSOR
// ============================================================================

scanQueue.process('scan-site', 10, async (job) => {
  const { searchId, userId, url, businessName } = job.data as SiteScanJobData;

  console.log(`[Job ${job.id}] Scanning site: ${url}`);

  try {
    const detector = new WordPressDetector();
    const wpInfo = await detector.detectWordPress(url);

    if (wpInfo.isWordPress) {
      // Calculate score
      const score = calculateScore(wpInfo);

      // Create lead
      await prisma.lead.create({
        data: {
          searchId,
          userId,
          url,
          businessName,
          isWordPress: true,
          wpVersion: wpInfo.wpVersion,
          wpOutdated: wpInfo.wpOutdated,
          plugins: wpInfo.plugins as any,
          themes: wpInfo.themes as any,
          woocommerce: wpInfo.woocommerce as any,
          score,
        },
      });

      // Update subscription usage
      await prisma.subscription.update({
        where: { userId },
        data: {
          leadsUsedThisWeek: {
            increment: 1,
          },
        },
      });

      // Update search WP sites count
      await prisma.search.update({
        where: { id: searchId },
        data: {
          wpSitesFound: {
            increment: 1,
          },
        },
      });

      console.log(`[Job ${job.id}] WordPress site found! Score: ${score}`);
    }

    await job.progress(100);

  } catch (error) {
    console.error(`[Job ${job.id}] Error scanning ${url}:`, error);
    // Don't throw - continue with other sites
    // Could implement retry logic here
  }
});

// ============================================================================
// CHECK SEARCH COMPLETION
// ============================================================================

scanQueue.process('check-search-completion', async (job) => {
  const { searchId } = job.data;

  // Get search and count pending site scans
  const search = await prisma.search.findUnique({
    where: { id: searchId },
  });

  if (!search || search.status !== 'processing') {
    return;
  }

  // Check if all site scan jobs are complete
  const pendingJobs = await scanQueue.getJobs(['waiting', 'active', 'delayed']);
  const relatedJobs = pendingJobs.filter(
    (j) => j.data.searchId === searchId && j.name === 'scan-site'
  );

  if (relatedJobs.length === 0) {
    // All site scans complete!
    await prisma.search.update({
      where: { id: searchId },
      data: { status: 'completed' },
    });

    console.log(`Search ${searchId} completed!`);
  }
});

// ============================================================================
// MAINTENANCE QUEUE PROCESSOR
// ============================================================================

maintenanceQueue.process('reset-weekly-limits', async (job) => {
  console.log('[Maintenance] Resetting weekly lead limits...');

  const now = new Date();

  // Find subscriptions where week has passed
  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: 'active',
    },
  });

  let resetCount = 0;

  for (const sub of subscriptions) {
    const weekStart = new Date(sub.weekStartDate);
    const daysDiff = Math.floor((now.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff >= 7) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          leadsUsedThisWeek: 0,
          weekStartDate: now,
        },
      });
      resetCount++;
    }
  }

  console.log(`[Maintenance] Reset ${resetCount} subscriptions`);
});

maintenanceQueue.process('cleanup-old-searches', async (job) => {
  console.log('[Maintenance] Cleaning up old searches...');

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Delete searches older than 30 days
  const result = await prisma.search.deleteMany({
    where: {
      createdAt: {
        lt: thirtyDaysAgo,
      },
    },
  });

  console.log(`[Maintenance] Deleted ${result.count} old searches`);
});

maintenanceQueue.process('resume-failed-scans', async (job) => {
  console.log('[Maintenance] Resuming failed scans...');

  // Find searches stuck in "processing" for more than 1 hour
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const stuckSearches = await prisma.search.findMany({
    where: {
      status: 'processing',
      updatedAt: {
        lt: oneHourAgo,
      },
    },
  });

  for (const search of stuckSearches) {
    // Mark as failed or retry
    await prisma.search.update({
      where: { id: search.id },
      data: { status: 'failed' },
    });

    console.log(`[Maintenance] Marked search ${search.id} as failed (stuck)`);
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateScore(wpInfo: any): number {
  let score = 0;

  if (wpInfo.wpOutdated) {
    score += 40;
  } else if (wpInfo.wpVersion) {
    const version = parseFloat(wpInfo.wpVersion);
    if (version < 6.4) score += 30;
    else if (version < 6.5) score += 20;
    else if (version < 6.6) score += 10;
  }

  const pluginCount = wpInfo.plugins.length;
  if (pluginCount > 20) score += 30;
  else if (pluginCount > 10) score += 20;
  else if (pluginCount > 5) score += 10;

  if (wpInfo.woocommerce?.detected) {
    score += 20;
  }

  if (wpInfo.themes.length > 2) {
    score += 10;
  } else if (wpInfo.themes.length > 1) {
    score += 5;
  }

  return Math.min(100, score);
}

// ============================================================================
// CRON JOB SCHEDULERS
// ============================================================================

// Reset weekly limits every day at 2am
export function scheduleWeeklyReset() {
  maintenanceQueue.add(
    'reset-weekly-limits',
    {},
    {
      repeat: {
        cron: '0 2 * * *', // Every day at 2am
      },
    }
  );
  console.log('[CRON] Scheduled weekly limit reset (daily at 2am)');
}

// Cleanup old searches every week
export function scheduleCleanup() {
  maintenanceQueue.add(
    'cleanup-old-searches',
    {},
    {
      repeat: {
        cron: '0 3 * * 0', // Every Sunday at 3am
      },
    }
  );
  console.log('[CRON] Scheduled cleanup (Sundays at 3am)');
}

// Resume failed scans every hour
export function scheduleFailedScanResume() {
  maintenanceQueue.add(
    'resume-failed-scans',
    {},
    {
      repeat: {
        cron: '0 * * * *', // Every hour
      },
    }
  );
  console.log('[CRON] Scheduled failed scan resume (hourly)');
}

// ============================================================================
// QUEUE EVENT HANDLERS
// ============================================================================

scanQueue.on('completed', async (job) => {
  console.log(`[Queue] Job ${job.id} (${job.name}) completed`);

  // If a site scan completed, check if search is done
  if (job.name === 'scan-site') {
    const { searchId } = job.data;
    await scanQueue.add('check-search-completion', { searchId }, {
      delay: 5000, // Wait 5 seconds before checking
    });
  }
});

scanQueue.on('failed', (job, err) => {
  console.error(`[Queue] Job ${job.id} (${job.name}) failed:`, err.message);
});

maintenanceQueue.on('completed', (job) => {
  console.log(`[Maintenance] Job ${job.id} (${job.name}) completed`);
});
