/**
 * Background Worker Process
 *
 * This file should be run as a separate process to handle background jobs.
 * It processes jobs from the Redis queue.
 *
 * Usage:
 *   npm run worker
 *
 * Or in production:
 *   node dist/worker.js
 */

import dotenv from 'dotenv';
import { initializeCronJobs, getQueueStats, shutdownQueues } from './jobs';
import './jobs/queues'; // Import to register job processors

dotenv.config();

console.log('='.repeat(60));
console.log('WordPress Health Finder - Background Worker');
console.log('='.repeat(60));
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Redis URL: ${process.env.REDIS_URL || 'redis://localhost:6379'}`);
console.log('='.repeat(60));

// Initialize CRON jobs
initializeCronJobs();

console.log('\n[Worker] Starting job processors...');
console.log('[Worker] Ready to process jobs!');
console.log('[Worker] Press Ctrl+C to stop\n');

// Display queue stats every 30 seconds
setInterval(async () => {
  const stats = await getQueueStats();
  console.log('[Stats]', new Date().toISOString(), stats);
}, 30000);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n[Worker] SIGTERM received, shutting down gracefully...');
  await shutdownQueues();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n[Worker] SIGINT received, shutting down gracefully...');
  await shutdownQueues();
  process.exit(0);
});

// Keep process alive
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Worker] Unhandled Rejection at:', promise, 'reason:', reason);
});
