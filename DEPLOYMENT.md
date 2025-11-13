# Deployment Guide

This guide covers deploying the WordPress Health Finder to production.

## Architecture Overview

**Recommended Production Stack**:
- **Backend**: Heroku, Railway, or DigitalOcean App Platform
- **Database**: Heroku Postgres, Railway, or Supabase
- **Frontend**: Vercel, Netlify, or Cloudflare Pages
- **Redis** (optional): Heroku Redis or Upstash

## Backend Deployment

### Option 1: Heroku

1. **Create Heroku app**:
```bash
heroku create wp-health-api
```

2. **Add PostgreSQL**:
```bash
heroku addons:create heroku-postgresql:mini
```

3. **Set environment variables**:
```bash
heroku config:set JWT_SECRET=$(openssl rand -hex 32)
heroku config:set STRIPE_SECRET_KEY=sk_live_...
heroku config:set STRIPE_WEBHOOK_SECRET=whsec_...
heroku config:set STRIPE_PRICE_ID=price_...
heroku config:set GOOGLE_API_KEY=your-key
heroku config:set GOOGLE_SEARCH_ENGINE_ID=your-id
heroku config:set FRONTEND_URL=https://your-frontend.com
heroku config:set NODE_ENV=production
```

4. **Deploy**:
```bash
git push heroku main
```

5. **Run migrations**:
```bash
heroku run npm run migrate
```

6. **Configure Stripe webhook**:
   - Go to Stripe Dashboard > Developers > Webhooks
   - Add endpoint: `https://wp-health-api.herokuapp.com/api/subscription/webhook`
   - Select events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed
   - Copy webhook secret and update: `heroku config:set STRIPE_WEBHOOK_SECRET=whsec_...`

### Option 2: Railway

1. **Install Railway CLI**:
```bash
npm i -g @railway/cli
```

2. **Login and initialize**:
```bash
railway login
railway init
```

3. **Add PostgreSQL**:
```bash
railway add postgresql
```

4. **Set environment variables** in Railway dashboard

5. **Deploy**:
```bash
railway up
```

### Option 3: DigitalOcean App Platform

1. Connect your GitHub repository
2. Configure build settings:
   - **Build Command**: `npm install && npm run build`
   - **Run Command**: `npm start`
3. Add PostgreSQL database
4. Set environment variables
5. Deploy

## Frontend Deployment

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI**:
```bash
npm i -g vercel
```

2. **Deploy**:
```bash
cd frontend
vercel --prod
```

3. **Configure environment variables** in Vercel dashboard:
   - `NEXT_PUBLIC_API_URL`: Your backend URL
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key

4. **Set custom domain** (optional) in Vercel dashboard

### Option 2: Netlify

1. **Install Netlify CLI**:
```bash
npm i -g netlify-cli
```

2. **Deploy**:
```bash
cd frontend
netlify deploy --prod
```

3. **Configure environment variables** in Netlify dashboard

### Option 3: Cloudflare Pages

1. Connect your GitHub repository
2. Configure build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `.next`
3. Set environment variables
4. Deploy

## Database Setup

### Heroku Postgres

Automatically configured when you add the addon. Connection string is set as `DATABASE_URL`.

### Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Get connection string from Settings > Database
3. Use the connection pooler URL for production
4. Set as `DATABASE_URL` in your backend

### Self-Hosted PostgreSQL

1. **Install PostgreSQL 15+**
2. **Create database**:
```sql
CREATE DATABASE wp_health;
CREATE USER wphealth WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE wp_health TO wphealth;
```
3. **Configure connection string**:
```
DATABASE_URL="postgresql://wphealth:secure_password@your-server:5432/wp_health"
```

## SSL/TLS Configuration

### Backend

For production, always use HTTPS. Most platforms (Heroku, Railway, Vercel) provide automatic SSL.

For custom domains, use:
- Let's Encrypt (free)
- Cloudflare (free tier includes SSL)

### Database

Use SSL for database connections in production:
```env
DATABASE_URL="postgresql://user:password@host:5432/db?sslmode=require"
```

## Environment Variables Checklist

### Backend
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `JWT_SECRET` - Random 32+ character secret
- [ ] `STRIPE_SECRET_KEY` - Stripe secret key (live)
- [ ] `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- [ ] `STRIPE_PRICE_ID` - Stripe price ID
- [ ] `GOOGLE_API_KEY` - Google Custom Search API key
- [ ] `GOOGLE_SEARCH_ENGINE_ID` - Search engine ID
- [ ] `FRONTEND_URL` - Your frontend domain
- [ ] `NODE_ENV` - Set to "production"
- [ ] `PORT` - Usually set automatically by platform

### Frontend
- [ ] `NEXT_PUBLIC_API_URL` - Backend API URL
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key

## Security Checklist

- [ ] Use strong JWT secret (32+ characters)
- [ ] Enable HTTPS everywhere
- [ ] Configure CORS to allow only your frontend domain
- [ ] Use environment variables for all secrets
- [ ] Enable rate limiting (already configured)
- [ ] Use SSL for database connections
- [ ] Keep dependencies updated
- [ ] Configure Stripe webhook secret
- [ ] Set secure cookie flags if using sessions
- [ ] Enable database backups

## Performance Optimization

### Backend

1. **Database Connection Pooling**:
```typescript
// In your Prisma client configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pool settings
  __internal: {
    engine: {
      connectionLimit: 10,
    },
  },
});
```

2. **Enable compression**:
```typescript
import compression from 'compression';
app.use(compression());
```

3. **Add Redis caching** for search results:
```bash
heroku addons:create heroku-redis:mini
```

### Frontend

1. **Enable Next.js optimizations** (already configured):
   - Image optimization
   - Code splitting
   - Static generation where possible

2. **Add CDN** for assets (Vercel includes this)

3. **Enable caching headers**

### Database

1. **Add indexes** (already in schema):
```prisma
@@index([userId])
@@index([searchId])
@@index([isWordPress])
```

2. **Regular maintenance**:
```sql
VACUUM ANALYZE;
REINDEX DATABASE wp_health;
```

## Monitoring & Logging

### Backend Monitoring

1. **Add Sentry** for error tracking:
```bash
npm install @sentry/node
```

2. **Configure logging**:
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
```

3. **Health checks**:
Already configured at `/health` endpoint

### Application Monitoring

Recommended services:
- **Sentry**: Error tracking
- **LogDNA/Papertrail**: Log aggregation
- **New Relic/Datadog**: APM
- **UptimeRobot**: Uptime monitoring

## Backup Strategy

### Database Backups

**Heroku Postgres**:
```bash
heroku pg:backups:schedule --at '02:00 America/New_York'
```

**Manual backup**:
```bash
pg_dump $DATABASE_URL > backup.sql
```

**Restore**:
```bash
psql $DATABASE_URL < backup.sql
```

### Automated Backups

Set up automated backups:
1. Daily database backups
2. Store in S3 or similar
3. Retain for 30 days minimum
4. Test restore process monthly

## Scaling

### Vertical Scaling

Upgrade dyno/instance size when needed:
```bash
heroku ps:scale web=standard-2x
```

### Horizontal Scaling

Add more instances:
```bash
heroku ps:scale web=3
```

### Database Scaling

1. **Connection pooling**: Use PgBouncer
2. **Read replicas**: For read-heavy workloads
3. **Upgrade plan**: More storage and connections

### Worker Processes

For background jobs at scale:

1. **Implement Bull queue**:
```typescript
import Bull from 'bull';
const scanQueue = new Bull('scans', process.env.REDIS_URL);
```

2. **Add worker dynos**:
```bash
heroku ps:scale worker=2
```

## CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - uses: akhileshns/heroku-deploy@v3.12.14
        with:
          heroku_api_key: ${{secrets.HEROKU_API_KEY}}
          heroku_app_name: "wp-health-api"
          heroku_email: ${{secrets.HEROKU_EMAIL}}

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd frontend && npm ci
      - run: cd frontend && npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{secrets.VERCEL_TOKEN}}
          vercel-org-id: ${{secrets.VERCEL_ORG_ID}}
          vercel-project-id: ${{secrets.VERCEL_PROJECT_ID}}
```

## Rollback Procedure

### Heroku

```bash
# List releases
heroku releases

# Rollback to previous version
heroku rollback v123
```

### Vercel

Vercel keeps all deployments. Rollback via dashboard or:
```bash
vercel rollback
```

## Domain Configuration

### Backend Domain

1. Add custom domain in platform dashboard
2. Configure DNS:
```
api.yourdomain.com -> CNAME to your-app.herokuapp.com
```

### Frontend Domain

1. Add custom domain in Vercel/Netlify
2. Configure DNS:
```
www.yourdomain.com -> CNAME to cname.vercel-dns.com
yourdomain.com -> A record (provided by platform)
```

## Post-Deployment Checklist

- [ ] Test user registration and login
- [ ] Test subscription flow end-to-end
- [ ] Verify Stripe webhooks are firing
- [ ] Run a test search
- [ ] Check all API endpoints
- [ ] Verify email notifications (if added)
- [ ] Test on mobile devices
- [ ] Check error tracking (Sentry)
- [ ] Verify backups are running
- [ ] Set up uptime monitoring
- [ ] Update DNS records
- [ ] Configure SSL certificates
- [ ] Test rollback procedure
- [ ] Document any custom configuration

## Troubleshooting

### Database connection issues
- Check `DATABASE_URL` is correct
- Verify SSL mode: `?sslmode=require`
- Check firewall rules
- Verify connection limit

### Stripe webhooks not firing
- Check webhook URL is correct
- Verify webhook secret matches
- Check Stripe dashboard for webhook errors
- Test with Stripe CLI

### High memory usage
- Check for memory leaks
- Optimize database queries
- Add connection pooling
- Scale up dyno/instance

### Slow performance
- Add database indexes
- Enable Redis caching
- Use CDN for static assets
- Optimize queries with Prisma

## Support & Resources

- [Heroku Documentation](https://devcenter.heroku.com/)
- [Vercel Documentation](https://vercel.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Stripe Documentation](https://stripe.com/docs)
