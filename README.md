# WordPress Health Finder - SaaS Lead Generation Platform

A comprehensive SaaS application that helps developers, agencies, and service providers find WordPress websites that need updates and maintenance. Similar to CyberLeads but specifically focused on WordPress sites.

## Features

### Core Functionality
- **Smart WordPress Detection**: Automatically identifies WordPress sites and analyzes their health
- **Version Detection**: Detects WordPress core, plugin, theme, and WooCommerce versions
- **Targeted Search**: Search by business category, industry, or location (e.g., "hair salons in NYC")
- **Lead Scoring**: Automatic scoring system (0-100) based on how outdated sites are
- **Subscription Management**: Stripe-integrated payment system with 50 leads per week
- **Multi-Engine Search**: Google Custom Search API, DuckDuckGo, and Bing fallbacks

### Technical Features
- TypeScript full-stack application
- PostgreSQL database with Prisma ORM
- RESTful API with JWT authentication
- Next.js React frontend with Tailwind CSS
- Stripe payment integration
- Rate limiting and security best practices

## Architecture

```
wp-health/
├── src/                      # Backend source code
│   ├── services/            # Core business logic
│   │   ├── wordpressDetector.ts    # WordPress detection engine
│   │   ├── googleScraper.ts        # Multi-engine web scraper
│   │   └── scanService.ts          # Lead scanning orchestration
│   ├── routes/              # API endpoints
│   │   ├── auth.ts          # Authentication routes
│   │   ├── search.ts        # Search and lead routes
│   │   └── subscription.ts  # Stripe integration
│   ├── middleware/          # Express middleware
│   └── server.ts            # Main application server
├── prisma/                  # Database schema and migrations
│   └── schema.prisma        # Prisma database schema
├── frontend/                # Next.js React frontend
│   └── src/
│       ├── pages/           # Next.js pages
│       ├── components/      # React components
│       └── lib/             # Utilities and API client
└── package.json
```

## WordPress Detection Methods

The system uses multiple detection methods to ensure accuracy:

1. **Meta Generator Tag**: Checks for WordPress version in HTML meta tags
2. **Asset Paths**: Detects `/wp-content/` and `/wp-includes/` paths
3. **File Analysis**: Analyzes CSS/JS files for version information
4. **Login Page**: Checks for `wp-login.php` presence
5. **Version Extraction**: Reads version from query parameters, readme files, and file comments

### Plugin & Theme Detection

- Scans HTML for plugin/theme asset paths
- Extracts version numbers from file query parameters
- Identifies plugin slugs from directory names
- Detects WooCommerce presence and version

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Stripe account (for payments)
- Google Cloud account (optional, for Google Custom Search API)

### Backend Setup

1. **Install dependencies**:
```bash
npm install
```

2. **Configure environment variables**:
```bash
cp .env.example .env
```

Edit `.env` and configure:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/wp_health"

# JWT
JWT_SECRET="your-secure-random-secret"
JWT_EXPIRES_IN="7d"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_ID="price_..."

# Google (optional but recommended)
GOOGLE_API_KEY="your-api-key"
GOOGLE_SEARCH_ENGINE_ID="your-search-engine-id"

# App
PORT=3001
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
```

3. **Set up database**:
```bash
# Generate Prisma client
npm run generate

# Run migrations
npm run migrate
```

4. **Start development server**:
```bash
npm run dev
```

The API will be available at `http://localhost:3001`

### Frontend Setup

1. **Navigate to frontend directory**:
```bash
cd frontend
```

2. **Install dependencies**:
```bash
npm install
```

3. **Configure environment**:
Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

4. **Start development server**:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Production Build

**Backend**:
```bash
npm run build
npm start
```

**Frontend**:
```bash
cd frontend
npm run build
npm start
```

## Stripe Setup

1. **Create a product and price** in your Stripe dashboard
2. **Get your API keys** from Stripe dashboard
3. **Set up webhook endpoint** at `/api/subscription/webhook`
4. **Add webhook events**:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`

## Google Custom Search API Setup (Recommended)

Without this, the system will fall back to DuckDuckGo/Bing scraping, which is less reliable:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Custom Search API
4. Create credentials (API key)
5. Go to [Programmable Search Engine](https://programmablesearchengine.google.com/)
6. Create a new search engine
7. Enable "Search the entire web"
8. Get your Search Engine ID
9. Add both to `.env` file

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login

### Subscription
- `POST /api/subscription/create-checkout` - Start subscription
- `GET /api/subscription/status` - Get subscription status
- `POST /api/subscription/cancel` - Cancel subscription
- `POST /api/subscription/webhook` - Stripe webhook (for Stripe)

### Search & Leads
- `POST /api/search` - Start new search
- `GET /api/search` - Get all searches
- `GET /api/search/:id` - Get search status
- `GET /api/search/:id/leads` - Get leads for search

## Database Schema

### User
- Authentication and profile information

### Subscription
- Stripe subscription details
- Weekly lead limits and usage tracking

### Search
- Search queries and status
- Links to user and leads

### Lead
- WordPress site information
- Version details for core, plugins, themes
- Health score (0-100)
- Business information

## Scoring Algorithm

Leads are scored 0-100 based on:
- **WordPress Version (40 points)**: Outdated core installation
- **Plugin Count (30 points)**: More plugins = more maintenance needed
- **WooCommerce (20 points)**: E-commerce sites are high-value
- **Multiple Themes (10 points)**: May indicate abandoned site

Higher scores = better leads (more outdated = more opportunity)

## Security Features

- JWT authentication with secure tokens
- bcrypt password hashing
- Helmet.js security headers
- CORS configuration
- Rate limiting (100 requests per 15 minutes)
- Input validation with Zod
- SQL injection protection via Prisma

## Performance Considerations

- **Scan Duration**: Each search takes 2-5 minutes to scan 50 sites
- **Rate Limiting**: Built-in delays between requests to be respectful
- **Concurrent Scans**: Scans run asynchronously in the background
- **Database Indexing**: Optimized queries with proper indexes

## Scaling Recommendations

For production at scale:

1. **Background Jobs**: Implement Bull/Redis for job queue management
2. **Caching**: Add Redis caching for search results
3. **CDN**: Use CloudFront or similar for frontend assets
4. **Database**: PostgreSQL with read replicas
5. **Worker Pool**: Multiple workers for concurrent scanning
6. **Monitoring**: Implement logging (Winston) and monitoring (Sentry)
7. **Proxies**: Use proxy rotation for large-scale scanning

## Development

```bash
# Backend development
npm run dev          # Start with hot reload
npm run build        # Build TypeScript
npm run migrate      # Run database migrations
npm run studio       # Open Prisma Studio

# Frontend development
cd frontend
npm run dev          # Start Next.js dev server
npm run build        # Build for production
npm run lint         # Lint code
```

## Testing

The application should be tested with:
- Unit tests for WordPress detection logic
- Integration tests for API endpoints
- End-to-end tests for user flows

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| DATABASE_URL | PostgreSQL connection string | Yes |
| JWT_SECRET | Secret for JWT tokens | Yes |
| STRIPE_SECRET_KEY | Stripe API secret key | Yes |
| STRIPE_WEBHOOK_SECRET | Stripe webhook secret | Yes |
| STRIPE_PRICE_ID | Stripe price ID for subscription | Yes |
| GOOGLE_API_KEY | Google Custom Search API key | Recommended |
| GOOGLE_SEARCH_ENGINE_ID | Google Search Engine ID | Recommended |
| PORT | Backend server port | No (default: 3001) |
| NODE_ENV | Environment (development/production) | No |
| FRONTEND_URL | Frontend URL for CORS | Yes |

## Deployment

### Backend (Heroku Example)

```bash
# Install Heroku CLI and login
heroku create wp-health-api

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set JWT_SECRET=your-secret
heroku config:set STRIPE_SECRET_KEY=sk_...
# ... set other variables

# Deploy
git push heroku main

# Run migrations
heroku run npm run migrate
```

### Frontend (Vercel Example)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel --prod

# Set environment variables in Vercel dashboard
```

## Troubleshooting

### Common Issues

1. **"Active subscription required"**: Ensure Stripe webhooks are configured and firing correctly
2. **"Failed to search businesses"**: Check Google API key or use DuckDuckGo fallback
3. **Connection errors**: Verify DATABASE_URL and database is running
4. **CORS errors**: Ensure FRONTEND_URL matches your frontend domain

## License

MIT

## Support

For issues and questions, please open an issue on the GitHub repository.

## Future Enhancements

- [ ] Contact information extraction (email, phone)
- [ ] Email templates for outreach
- [ ] CSV export with more details
- [ ] Advanced filtering and sorting
- [ ] Chrome extension for one-click scanning
- [ ] API for programmatic access
- [ ] Multi-language support
- [ ] Team collaboration features
- [ ] CRM integrations (HubSpot, Salesforce)
- [ ] Automated follow-up campaigns
