import { scanQueue, scheduleWeeklyReset, scheduleCleanup, scheduleFailedScanResume } from './queues';

export interface ScanJobData {
  searchId: string;
  userId: string;
  query: string;
  category?: string;
  location?: string;
}

/**
 * Queue a new search for background processing
 */
export async function queueSearch(
  searchId: string,
  userId: string,
  query: string,
  category?: string,
  location?: string
): Promise<void> {
  await scanQueue.add(
    'start-search',
    {
      searchId,
      userId,
      query,
      category,
      location,
    } as ScanJobData,
    {
      attempts: 3, // Retry up to 3 times
      backoff: {
        type: 'exponential',
        delay: 5000, // Start with 5 second delay
      },
      removeOnComplete: 100, // Keep last 100 completed jobs
      removeOnFail: 500, // Keep last 500 failed jobs for debugging
    }
  );
}

/**
 * Initialize all CRON jobs
 */
export function initializeCronJobs(): void {
  console.log('[CRON] Initializing scheduled jobs...');

  scheduleWeeklyReset();
  scheduleCleanup();
  scheduleFailedScanResume();

  console.log('[CRON] All jobs scheduled successfully');
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    scanQueue.getWaitingCount(),
    scanQueue.getActiveCount(),
    scanQueue.getCompletedCount(),
    scanQueue.getFailedCount(),
    scanQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
  };
}

/**
 * Gracefully shutdown queues
 */
export async function shutdownQueues(): Promise<void> {
  console.log('[Queue] Shutting down...');
  await scanQueue.close();
  console.log('[Queue] Shutdown complete');
}
