# Deploy to Railway (Free Tier)

Complete guide to deploy the WordPress Health Finder to Railway with auto-deploy from GitHub.

## Why Railway?

- ✅ **$5 free credit/month** (enough for hobby projects)
- ✅ **Auto-deploy from GitHub** (push = automatic deployment)
- ✅ **PostgreSQL included** (no setup needed)
- ✅ **Redis included** (for job queue)
- ✅ **Multiple services** (API + Worker in one project)
- ✅ **Free SSL certificates**
- ✅ **Environment variables** management
- ✅ **Logs & monitoring** built-in

**Free tier includes:**
- 500 execution hours/month
- $5 credit (~20 days of always-on services)
- PostgreSQL database
- Redis instance

---

## Prerequisites

1. GitHub account with your code pushed
2. Railway account (sign up with GitHub)
3. Stripe account (for payments)

---

## Step-by-Step Deployment

### 1. Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Click **"Login with GitHub"**
3. Authorize Railway to access your repos

---

### 2. Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your `wp-health` repository
4. Railway will detect it's a Node.js app

---

### 3. Add PostgreSQL Database

1. In your project, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway automatically creates `DATABASE_URL` variable

---

### 4. Add Redis

1. Click **"+ New"** again
2. Select **"Database"** → **"Add Redis"**
3. Railway automatically creates `REDIS_URL` variable

---

### 5. Configure API Service

1. Click on your **main service** (wp-health)
2. Go to **"Settings"** tab

#### Build Settings:
```
Build Command: npm install && npm run build
Start Command: npm start
```

#### Environment Variables:

Click **"Variables"** tab and add:

```bash
# These are auto-created by Railway:
DATABASE_URL=${DATABASE_URL}
REDIS_URL=${REDIS_URL}

# Add these manually:
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-frontend.vercel.app

# JWT
JWT_SECRET=your-super-secret-key-at-least-32-chars-long
JWT_EXPIRES_IN=7d

# Stripe (get from stripe.com)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...

# Google Search API (optional but recommended)
GOOGLE_API_KEY=your-google-api-key
GOOGLE_SEARCH_ENGINE_ID=your-search-engine-id

# Enable job queue
USE_JOB_QUEUE=true
```

#### Root Directory:
- Leave as `/` (root of repo)

#### Watch Paths:
- Leave default (deploys on any change)

---

### 6. Add Worker Service

This runs the background job processor + CRON jobs.

1. Click **"+ New"** in your project
2. Select **"Empty Service"**
3. Name it **"worker"**
4. Click **"Settings"**

#### Connect to GitHub:
- **Repository**: Same as API (wp-health)
- **Branch**: main

#### Build Settings:
```
Build Command: npm install && npm run build
Start Command: npm run start:worker
```

#### Environment Variables:
Click **"Variables"** and add **"Reference All Variables"** from the API service.

This shares DATABASE_URL, REDIS_URL, etc.

---

### 7. Run Database Migrations

After first deploy:

1. Go to **API service** → **"Settings"** → **"Networking"**
2. Generate a domain (e.g., `wp-health-production.up.railway.app`)
3. Copy the URL
4. In your **local terminal**:

```bash
# Set DATABASE_URL from Railway
export DATABASE_URL="postgresql://..."  # Copy from Railway variables

# Run migrations
npx prisma migrate deploy

# Or use Railway CLI
railway run npx prisma migrate deploy
```

**Alternative: Use Railway CLI**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migrations
railway run npx prisma migrate deploy
```

---

### 8. Configure Stripe Webhook

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. **Developers** → **Webhooks**
3. Click **"Add endpoint"**
4. Enter URL: `https://your-api.railway.app/api/subscription/webhook`
5. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
6. Copy **Signing secret**
7. Add to Railway variables as `STRIPE_WEBHOOK_SECRET`

---

### 9. Deploy Frontend to Vercel

Railway is for backend. Deploy frontend to Vercel (free):

```bash
cd frontend

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Environment Variables in Vercel:**
```
NEXT_PUBLIC_API_URL=https://your-api.railway.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

### 10. Verify Deployment

Check everything is working:

#### API Health Check:
```bash
curl https://your-api.railway.app/health
# Should return: {"status":"ok","timestamp":"..."}
```

#### Check Logs:
- Railway → API service → **"Logs"**
- Railway → Worker service → **"Logs"**

You should see:
```
[CRON] Scheduled weekly limit reset
[CRON] Scheduled cleanup
[Worker] Ready to process jobs!
```

#### Test Worker:
The worker should start processing scans automatically based on CRON schedule.

---

## Auto-Deploy from GitHub

Railway automatically deploys when you push to GitHub!

```bash
# Make changes
git add .
git commit -m "Update lead generation"
git push origin main

# Railway automatically:
# 1. Detects push
# 2. Builds new version
# 3. Runs migrations (if you set up)
# 4. Deploys API + Worker
```

---

## Monitoring & Logs

### View Logs
1. Go to service in Railway
2. Click **"Logs"** tab
3. Real-time logs appear

### View Metrics
1. Click **"Metrics"** tab
2. See CPU, Memory, Network usage

### View Database
1. Click PostgreSQL service
2. Click **"Data"** tab
3. Browse tables (similar to Prisma Studio)

---

## Cost Optimization

### Free Tier Limits
- **500 execution hours/month**
- **$5 credit/month**

### Services Running:
- API: ~$2.50/month
- Worker: ~$2.50/month
- PostgreSQL: Included
- Redis: Included

**Total: ~$5/month (within free tier!)**

### Tips to Stay Free:
1. **Optimize worker concurrency** - Don't over-provision
2. **Use sleep mode** for development projects
3. **Monitor usage** in Railway dashboard
4. **Clean up old data** regularly

### When You Outgrow Free Tier:
- Upgrade to **Developer Plan** ($5/month)
- Add **usage-based pricing** (pay for what you use)
- Still very affordable compared to Heroku

---

## Scaling

### Horizontal Scaling

Add more workers:
1. Duplicate worker service
2. Both pull from same Redis queue
3. Process jobs in parallel

### Database Scaling

Upgrade PostgreSQL:
1. Railway → PostgreSQL service
2. **"Settings"** → **"Upgrade"**
3. Choose larger plan

### Auto-Scaling

Railway doesn't auto-scale on free tier, but you can:
- Add multiple worker services manually
- Use Railway's paid plan for auto-scaling

---

## Custom Domain

### Add Custom Domain

1. Go to API service → **"Settings"** → **"Networking"**
2. Click **"Custom Domains"**
3. Add your domain: `api.yourdomain.com`
4. Update DNS:
   ```
   Type: CNAME
   Name: api
   Value: your-service.railway.app
   ```

5. Railway automatically provisions SSL

---

## Environment Management

### Multiple Environments

Create separate Railway projects:

**Production:**
```
Project: wp-health-prod
Branch: main
```

**Staging:**
```
Project: wp-health-staging
Branch: staging
```

**Development:**
```
Run locally
```

---

## Troubleshooting

### Build Fails

Check **"Logs"** during build:
```bash
# Common issues:
# 1. Missing dependencies
npm install --save <missing-package>

# 2. TypeScript errors
npm run build  # Test locally first

# 3. Prisma issues
npx prisma generate
```

### Database Connection Errors

```bash
# Check DATABASE_URL format:
postgresql://user:pass@host:port/db

# Ensure migrations ran:
railway run npx prisma migrate deploy
```

### Worker Not Processing Jobs

Check worker logs:
- Should see: `[Worker] Ready to process jobs!`
- If not, check `REDIS_URL` is set
- Verify `USE_JOB_QUEUE=true`

### Out of Memory

Reduce concurrency in `src/jobs/queues.ts`:
```typescript
scanQueue.process('scan-site', 5, async (job) => {
  // Reduced from 10 to 5
});
```

### Port Issues

Railway automatically sets `PORT` variable. Make sure your app uses it:
```typescript
const PORT = process.env.PORT || 3001;
```

---

## Railway CLI Commands

Useful commands:

```bash
# Install
npm i -g @railway/cli

# Login
railway login

# Link project
railway link

# Run command in Railway environment
railway run npm run migrate

# View logs
railway logs

# Open project in browser
railway open

# Deploy manually
railway up

# View variables
railway variables

# Add variable
railway variables --set KEY=value
```

---

## Backup & Recovery

### Database Backups

Railway doesn't auto-backup on free tier. Manual backup:

```bash
# Backup
railway run pg_dump $DATABASE_URL > backup.sql

# Restore
railway run psql $DATABASE_URL < backup.sql
```

### Automated Backups (Paid)

Upgrade to Developer plan for automated daily backups.

---

## Migration Checklist

- [ ] Create Railway account
- [ ] Connect GitHub repository
- [ ] Add PostgreSQL database
- [ ] Add Redis instance
- [ ] Configure API service
- [ ] Configure Worker service
- [ ] Set environment variables
- [ ] Run database migrations
- [ ] Configure Stripe webhook
- [ ] Deploy frontend to Vercel
- [ ] Test API health endpoint
- [ ] Verify worker is running
- [ ] Check CRON jobs are scheduled
- [ ] Test full user flow
- [ ] Set up custom domain (optional)
- [ ] Configure monitoring alerts

---

## Next Steps

1. **Deploy backend to Railway** (follow this guide)
2. **Deploy frontend to Vercel** (see DEPLOYMENT.md)
3. **Implement new marketplace model** (see MIGRATION.md)
4. **Seed initial niches** (create ScanNiche records)
5. **Test lead generation** (check CRON jobs run)
6. **Launch to users!**

---

## Support

- [Railway Documentation](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [Railway Status](https://railway.statuspage.io)

---

## Alternative: Render.com

If Railway doesn't work, try Render (also free):

1. Similar process to Railway
2. Free tier: 750 hours/month
3. Services spin down after 15min inactivity (slower startup)
4. Still good for MVP

See DEPLOYMENT.md for Render instructions.
