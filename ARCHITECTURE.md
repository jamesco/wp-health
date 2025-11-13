# Architecture & Background Jobs

This document explains how the WordPress Health Finder handles background processing and scheduled tasks.

## Table of Contents

- [Overview](#overview)
- [Two Processing Modes](#two-processing-modes)
- [Job Queue Architecture](#job-queue-architecture)
- [CRON Jobs](#cron-jobs)
- [Deployment Scenarios](#deployment-scenarios)

## Overview

The application can run in two modes:

1. **In-Memory Mode** (default): Simple, no Redis required, good for development
2. **Job Queue Mode** (recommended for production): Uses Redis + Bull for persistent, scalable background processing

## Two Processing Modes

### Mode 1: In-Memory Processing (Legacy)

**Configuration**: `USE_JOB_QUEUE=false` (default)

**How it works**:
```
User clicks "Start Search"
         ↓
    API creates search record
         ↓
    Fires async function (no await)
         ↓
    Returns search ID to user immediately
         ↓
Background function runs in-process:
  1. Searches Google/DuckDuckGo/Bing
  2. Loops through each site
  3. Scans for WordPress
  4. Creates lead records
  5. Updates search status to "completed"
```

**Pros**:
- ✅ Simple setup, no Redis required
- ✅ Good for development
- ✅ Lower infrastructure cost

**Cons**:
- ❌ If server restarts, in-progress scans are lost
- ❌ No retry mechanism
- ❌ Can't distribute across multiple servers
- ❌ Memory intensive (long-running processes in API server)
- ❌ No persistent job history

**When to use**: Local development, MVP, low-traffic sites

---

### Mode 2: Job Queue Processing (Recommended)

**Configuration**: `USE_JOB_QUEUE=true`

**How it works**:
```
User clicks "Start Search"
         ↓
    API creates search record
         ↓
    Queues job in Redis (Bull)
         ↓
    Returns search ID to user immediately
         ↓
Separate worker process pulls job from queue:
  1. Searches Google/DuckDuckGo/Bing
  2. Queues individual site scan jobs
  3. Multiple workers process sites in parallel
  4. Creates lead records
  5. Checks if all sites scanned
  6. Updates search status to "completed"
```

**Pros**:
- ✅ Jobs survive server restarts
- ✅ Automatic retry with exponential backoff
- ✅ Horizontal scaling (multiple workers)
- ✅ Job history and monitoring
- ✅ Separate worker processes (better resource management)
- ✅ Rate limiting and concurrency control

**Cons**:
- ❌ Requires Redis
- ❌ More complex setup
- ❌ Higher infrastructure cost

**When to use**: Production, high-traffic sites, scaling needs

---

## Job Queue Architecture

### Components

```
┌─────────────────┐
│   Next.js App   │
│   (Frontend)    │
└────────┬────────┘
         │ HTTP
         ↓
┌─────────────────┐
│   Express API   │
│   (Backend)     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐      ┌─────────────────┐
│  PostgreSQL DB  │      │   Redis Queue   │
│                 │      │  (Bull/BullMQ)  │
└─────────────────┘      └────────┬────────┘
                                  │
                         ┌────────┴────────┐
                         ↓                 ↓
                  ┌─────────────┐   ┌─────────────┐
                  │  Worker #1  │   │  Worker #2  │
                  │             │   │             │
                  └─────────────┘   └─────────────┘
```

### Job Types

**1. Scan Jobs** (Queue: `wordpress-scans`)

| Job Name | Purpose | Concurrency |
|----------|---------|-------------|
| `start-search` | Initiates search, finds businesses | 5 |
| `scan-site` | Scans individual site for WordPress | 10 |
| `check-search-completion` | Checks if all site scans are done | 1 |

**2. Maintenance Jobs** (Queue: `maintenance`)

| Job Name | Purpose | Schedule |
|----------|---------|----------|
| `reset-weekly-limits` | Resets user lead counts | Daily at 2am |
| `cleanup-old-searches` | Deletes searches >30 days old | Sundays at 3am |
| `resume-failed-scans` | Marks stuck scans as failed | Hourly |

### Job Flow Example

```
User starts search for "hair salons in NYC"
         ↓
┌────────────────────────────────────────────┐
│ Job: start-search                          │
│ - Creates search record                    │
│ - Searches Google/DuckDuckGo              │
│ - Finds 50 business URLs                  │
│ - Queues 50 scan-site jobs                │
└───────────────┬────────────────────────────┘
                │
      ┌─────────┴─────────┬─────────┬────────┐
      ↓                   ↓         ↓        ↓
┌──────────┐        ┌──────────┐   ...   ┌──────────┐
│scan-site │        │scan-site │         │scan-site │
│salon1.com│        │salon2.com│         │salon50..│
│          │        │          │         │          │
│WP Found! │        │Not WP ✗  │         │WP Found! │
│Lead ✓    │        │          │         │Lead ✓    │
└──────────┘        └──────────┘         └──────────┘
                            │
         All sites scanned  ↓
                  ┌──────────────────────┐
                  │check-search-complete │
                  │Status: completed ✓   │
                  └──────────────────────┘
```

### Retry Logic

Jobs are configured with automatic retry:

```typescript
{
  attempts: 3,              // Retry up to 3 times
  backoff: {
    type: 'exponential',
    delay: 5000             // Wait 5s, then 10s, then 20s
  }
}
```

### Job Persistence

Bull stores jobs in Redis:
- **Completed jobs**: Last 100 kept
- **Failed jobs**: Last 500 kept (for debugging)
- **Active/Waiting jobs**: All kept until processed

---

## CRON Jobs

CRON jobs are implemented using Bull's built-in repeatable jobs.

### 1. Reset Weekly Limits

**Schedule**: Daily at 2:00 AM
**Cron**: `0 2 * * *`

```typescript
// Checks each subscription
// If 7+ days since weekStartDate:
//   - Reset leadsUsedThisWeek to 0
//   - Set weekStartDate to now
```

### 2. Cleanup Old Searches

**Schedule**: Every Sunday at 3:00 AM
**Cron**: `0 3 * * 0`

```typescript
// Deletes searches older than 30 days
// Also deletes associated leads (CASCADE)
```

### 3. Resume Failed Scans

**Schedule**: Every hour
**Cron**: `0 * * * *`

```typescript
// Finds searches stuck in "processing" for >1 hour
// Marks them as "failed"
// Could be enhanced to retry instead
```

### Adding Custom CRON Jobs

To add a new CRON job:

1. **Add processor** in `src/jobs/queues.ts`:
```typescript
maintenanceQueue.process('my-custom-job', async (job) => {
  console.log('Running my custom job...');
  // Your logic here
});
```

2. **Schedule it** in `src/jobs/queues.ts`:
```typescript
export function scheduleMyCustomJob() {
  maintenanceQueue.add(
    'my-custom-job',
    {},
    {
      repeat: {
        cron: '0 4 * * *', // 4am daily
      },
    }
  );
}
```

3. **Initialize** in `src/jobs/index.ts`:
```typescript
export function initializeCronJobs(): void {
  scheduleWeeklyReset();
  scheduleCleanup();
  scheduleFailedScanResume();
  scheduleMyCustomJob(); // Add this
}
```

---

## Deployment Scenarios

### Scenario 1: Simple (Heroku, Railway, etc.)

**Setup**: Single dyno running both API and worker

```yaml
# Procfile
web: node dist/server.js
worker: node dist/worker.js
```

**Environment**:
```bash
USE_JOB_QUEUE=true
REDIS_URL=<provided-by-platform>
```

**Scaling**:
```bash
heroku ps:scale web=2 worker=2
```

---

### Scenario 2: Docker Compose (Self-hosted)

```yaml
# docker-compose.production.yml
services:
  api:
    build: .
    command: npm start
    environment:
      USE_JOB_QUEUE: "true"
    depends_on:
      - postgres
      - redis

  worker:
    build: .
    command: npm run start:worker
    environment:
      USE_JOB_QUEUE: "true"
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15

  redis:
    image: redis:7
```

---

### Scenario 3: Kubernetes

```yaml
# api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wp-health-api
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: api
        image: wp-health:latest
        command: ["node", "dist/server.js"]
        env:
        - name: USE_JOB_QUEUE
          value: "true"
---
# worker-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wp-health-worker
spec:
  replicas: 5
  template:
    spec:
      containers:
      - name: worker
        image: wp-health:latest
        command: ["node", "dist/worker.js"]
```

---

## Monitoring & Debugging

### View Queue Stats

```typescript
import { getQueueStats } from './jobs';

const stats = await getQueueStats();
console.log(stats);
// {
//   waiting: 5,
//   active: 2,
//   completed: 150,
//   failed: 3,
//   delayed: 0
// }
```

### Bull Dashboard (Optional)

Install Bull Board for a web UI:

```bash
npm install @bull-board/express @bull-board/api
```

```typescript
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [
    new BullAdapter(scanQueue),
    new BullAdapter(maintenanceQueue)
  ],
  serverAdapter
});

app.use('/admin/queues', serverAdapter.getRouter());
```

Access at: `http://localhost:3001/admin/queues`

### Redis CLI

```bash
# Connect to Redis
redis-cli

# View all keys
KEYS *

# View queue stats
LLEN bull:wordpress-scans:waiting
LLEN bull:wordpress-scans:active

# Clear failed jobs
DEL bull:wordpress-scans:failed
```

---

## Performance Tuning

### Concurrency Settings

Adjust in `src/jobs/queues.ts`:

```typescript
// More concurrent site scans (uses more memory/CPU)
scanQueue.process('scan-site', 20, async (job) => { ... });

// Fewer concurrent searches (more conservative)
scanQueue.process('start-search', 2, async (job) => { ... });
```

### Rate Limiting

Add delays between scans to avoid IP bans:

```typescript
const limiter = {
  max: 100,        // Max 100 jobs
  duration: 60000  // Per 60 seconds
};

scanQueue.process('scan-site', { concurrency: 10, limiter }, async (job) => {
  // Your code
});
```

### Job Timeouts

Prevent stuck jobs:

```typescript
await scanQueue.add('start-search', data, {
  timeout: 600000  // 10 minute timeout
});
```

---

## Troubleshooting

### Jobs stuck in "active"

```bash
# In Redis CLI
LLEN bull:wordpress-scans:active

# If jobs are stuck, clean them
# (Make sure workers are stopped first!)
DEL bull:wordpress-scans:active
```

### Worker not processing jobs

1. Check worker is running: `ps aux | grep worker`
2. Check Redis connection: `redis-cli ping`
3. Check worker logs for errors
4. Verify `USE_JOB_QUEUE=true` in environment

### Memory issues

1. Reduce concurrency
2. Add job timeouts
3. Enable job result removal:
```typescript
removeOnComplete: 100,
removeOnFail: 500
```

---

## Summary

**For Development**:
- Use `USE_JOB_QUEUE=false`
- Simple, no Redis needed
- Run just `npm run dev`

**For Production**:
- Use `USE_JOB_QUEUE=true`
- Start Redis
- Run `npm start` (API) + `npm run start:worker` (worker)
- CRON jobs automatically scheduled in worker
- Scale horizontally by adding more workers

**CRON Jobs** (automatic in job queue mode):
- ✅ Weekly limit reset (daily)
- ✅ Old data cleanup (weekly)
- ✅ Failed scan recovery (hourly)
