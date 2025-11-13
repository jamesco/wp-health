# Quick Start Guide

Get the WordPress Health Finder running locally in under 10 minutes.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ installed and running
- Git

## Option 1: Quick Start with Docker (Easiest)

1. **Clone and setup**:
```bash
git clone <your-repo>
cd wp-health
cp .env.example .env
```

2. **Start database with Docker**:
```bash
docker-compose up -d
```

3. **Configure .env**:
```env
DATABASE_URL="postgresql://wphealth:wphealth_dev@localhost:5432/wp_health"
JWT_SECRET="your-secret-key-at-least-32-characters-long"
```

4. **Install and run backend**:
```bash
npm install
npm run generate
npm run migrate
npm run dev
```

Backend running at http://localhost:3001 ✅

5. **In a new terminal, start frontend**:
```bash
cd frontend
npm install
npm run dev
```

Frontend running at http://localhost:3000 ✅

6. **Open browser**: Navigate to http://localhost:3000

## Option 2: Manual Setup (No Docker)

### Backend

1. **Setup PostgreSQL**:
```bash
# Create database
psql postgres
CREATE DATABASE wp_health;
CREATE USER wphealth WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE wp_health TO wphealth;
\q
```

2. **Clone and configure**:
```bash
git clone <your-repo>
cd wp-health
cp .env.example .env
```

3. **Edit .env**:
```env
DATABASE_URL="postgresql://wphealth:yourpassword@localhost:5432/wp_health"
JWT_SECRET="your-secret-key-at-least-32-characters-long"
STRIPE_SECRET_KEY="sk_test_..." # Optional for now
FRONTEND_URL="http://localhost:3000"
```

4. **Install dependencies and setup database**:
```bash
npm install
npm run generate
npm run migrate
```

5. **Start backend**:
```bash
npm run dev
```

Backend is running! ✅

### Frontend

1. **Open new terminal**:
```bash
cd frontend
npm install
```

2. **Create frontend/.env.local**:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

3. **Start frontend**:
```bash
npm run dev
```

Frontend is running! ✅

## Testing the Application

### 1. Create an Account

1. Visit http://localhost:3000
2. Click "Sign Up"
3. Create an account with email and password

### 2. Test Without Subscription (Optional)

The search functionality requires an active subscription. For testing without Stripe:

**Manually create a subscription in database**:
```bash
npm run studio
```

This opens Prisma Studio. Create a subscription record:
- userId: (your user ID)
- stripeCustomerId: "test_customer"
- stripeSubscriptionId: "test_sub"
- stripePriceId: "test_price"
- status: "active"
- leadsPerWeek: 50
- leadsUsedThisWeek: 0
- currentPeriodStart: (today)
- currentPeriodEnd: (30 days from now)

### 3. Run a Search

1. Login to your account
2. Enter a search query (e.g., "coffee shops in Seattle")
3. Click "Start Search"
4. Wait 2-5 minutes for results
5. View the leads found

## Setting Up Stripe (Optional)

To enable real subscriptions:

1. **Create Stripe account**: https://stripe.com

2. **Get test keys**:
   - Go to Developers > API keys
   - Copy Secret key and Publishable key

3. **Create a product**:
   - Go to Products
   - Create product: "WordPress Leads - 50/week"
   - Set price: $49/month recurring
   - Copy the Price ID

4. **Update .env**:
```env
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PRICE_ID="price_..."
```

5. **Update frontend/.env.local**:
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

6. **Test webhooks locally**:
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks
stripe listen --forward-to localhost:3001/api/subscription/webhook
```

Copy the webhook signing secret and add to .env:
```env
STRIPE_WEBHOOK_SECRET="whsec_..."
```

7. **Restart backend**:
```bash
npm run dev
```

Now you can test the full subscription flow!

## Setting Up Google Search API (Recommended)

Without this, the system falls back to DuckDuckGo/Bing scraping which is less reliable.

1. **Enable Google Custom Search API**:
   - Go to https://console.cloud.google.com
   - Create project
   - Enable Custom Search API
   - Create credentials (API key)

2. **Create Search Engine**:
   - Go to https://programmablesearchengine.google.com
   - Create new search engine
   - Enable "Search the entire web"
   - Get Search Engine ID

3. **Add to .env**:
```env
GOOGLE_API_KEY="your-api-key"
GOOGLE_SEARCH_ENGINE_ID="your-search-engine-id"
```

4. **Restart backend**

## Troubleshooting

### Database connection errors

```bash
# Check PostgreSQL is running
pg_isready

# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL
```

### Port already in use

```bash
# Backend (port 3001)
lsof -ti:3001 | xargs kill -9

# Frontend (port 3000)
lsof -ti:3000 | xargs kill -9
```

### Prisma errors

```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Regenerate client
npm run generate
```

### Search not working

1. Check you have an active subscription
2. Check backend logs for errors
3. Verify search engines are accessible
4. Try with Google API if available

## Next Steps

- **Read the full README**: `README.md`
- **API Documentation**: `API.md`
- **Deployment Guide**: `DEPLOYMENT.md`
- **Customize scoring algorithm**: `src/services/scanService.ts`
- **Add more detection methods**: `src/services/wordpressDetector.ts`

## Common Commands

```bash
# Backend
npm run dev          # Start dev server
npm run build        # Build TypeScript
npm start            # Run production build
npm run migrate      # Run database migrations
npm run studio       # Open Prisma Studio (database GUI)

# Frontend
cd frontend
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Run production build

# Database
docker-compose up -d    # Start PostgreSQL + Redis
docker-compose down     # Stop services
docker-compose logs     # View logs

# Prisma
npx prisma studio       # Database GUI
npx prisma migrate dev  # Create migration
npx prisma generate     # Generate client
```

## Development Tips

1. **Use Prisma Studio** for database inspection: `npm run studio`
2. **Check backend logs** for detailed error messages
3. **Use browser DevTools** to debug API calls
4. **Test with real Stripe test cards**: https://stripe.com/docs/testing
5. **Monitor rate limits** to avoid getting blocked by search engines

## Production Checklist

Before deploying to production:

- [ ] Change JWT_SECRET to strong random value
- [ ] Set up real Stripe account with live keys
- [ ] Configure Google Search API (highly recommended)
- [ ] Set up database backups
- [ ] Configure CORS for your domain
- [ ] Enable HTTPS/SSL everywhere
- [ ] Set up error monitoring (Sentry)
- [ ] Configure Stripe webhooks for production URL
- [ ] Test entire flow end-to-end
- [ ] Set up uptime monitoring

## Support

- Check `README.md` for detailed information
- Review `API.md` for API reference
- See `DEPLOYMENT.md` for production setup
- Open GitHub issues for bugs

Happy lead hunting! 🎯
