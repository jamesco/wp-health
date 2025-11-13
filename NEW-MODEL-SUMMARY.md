# 🎯 New Business Model: Lead Marketplace

## What Changed?

### ❌ Old Model (What Was Built)
**User-Initiated Searches**
- User searches: "hair salons in NYC"
- System scans 50 sites on-demand (takes 2-5 minutes)
- User gets personal leads
- Next user searches same thing → scans again (wasteful!)

**Problems:**
- Slow user experience (wait 2-5 minutes)
- Wasteful scanning (same sites scanned multiple times)
- No recurring value (one-time search)
- Hard to scale
- Not a true SaaS

### ✅ New Model (What You Actually Want)
**Automated Lead Marketplace**
- System automatically scans popular niches (hair salons, restaurants, dentists)
- Builds a central database of WordPress leads
- Scans happen in background (users never wait)
- Users subscribe and browse pre-generated leads
- Each lead scanned once, distributed to multiple users (efficient!)
- Leads re-scanned weekly to stay fresh

**Benefits:**
- ✅ Instant access (no waiting)
- ✅ Efficient (scan once, use many times)
- ✅ Recurring value (fresh leads every week/month)
- ✅ True SaaS model
- ✅ Scalable

---

## Subscription Tiers

| Tier | Price | Leads | Features |
|------|-------|-------|----------|
| **Free** | $0 | 10/week | Basic filtering, no archive |
| **Basic** | $49/mo | 100/month | Full archive, CSV export |
| **Pro** | $299/mo | 250/month | Advanced filtering, contact info, email templates |

---

## How It Works (New Model)

### For the System (Automatic)

```
Every Day at 4am:
  ├─ Check ScanNiche table
  ├─ For each niche due for scanning:
  │   ├─ Generate queries: "hair salons in NYC", "hair salons in LA", etc.
  │   ├─ Scan top 50 sites per query
  │   ├─ Create/update leads in database
  │   └─ Mark niche as scanned
  └─ Schedule next scan

Every Sunday at 3am:
  ├─ Find leads last scanned > 14 days ago
  ├─ Re-scan them
  ├─ Update WordPress version, plugins, etc.
  ├─ If site is no longer WordPress → mark as invalid
  └─ Recalculate score

Every Monday at 2am (Free tier):
  └─ Reset weekly lead counters for FREE users

Every 1st of Month at 2am (Paid tiers):
  └─ Reset monthly lead counters for BASIC/PRO users
```

### For Users

```
User Opens Dashboard:
  ├─ Shows available leads (not claimed by this user yet)
  ├─ User filters by category, location (PRO only)
  ├─ User clicks "Claim Lead"
  ├─ Lead added to "My Leads"
  ├─ LeadClaim record created
  ├─ Lead counter incremented
  └─ Lead details shown (contact info if PRO tier)

User Runs Out of Leads:
  ├─ "You've used 100/100 leads this month"
  ├─ "Upgrade to PRO for 250/month"
  └─ Wait until next period OR upgrade
```

---

## Database Schema (New)

### Key Changes

**Before:**
```
User → Search (user-initiated) → Lead (personal)
```

**After:**
```
User → LeadClaim → Lead (global, shared)
  ↓
Subscription (tier-based limits)

ScanNiche → Auto-scanning → Lead (central DB)
```

### New Models

1. **Lead** (Global)
   - Central database of all WordPress sites
   - `status`: available, stale, invalid
   - `lastScannedAt`: for re-scanning
   - Not tied to specific user initially

2. **LeadClaim** (Tracks Distribution)
   - Which user received which lead
   - Prevents duplicates (same user can't claim twice)
   - Tracks if viewed

3. **ScanNiche** (Auto-Scan Config)
   - Defines what to scan
   - `searchQueries`: ["hair salons in {city}"]
   - `locations`: ["NYC", "LA", "Chicago"]
   - `scanFrequency`: weekly, daily, monthly
   - `nextScanAt`: when to scan next

4. **SubscriptionTier** (Enum)
   - FREE, BASIC, PRO
   - Different limits and features

5. **ContactInfo** (Premium Feature)
   - Email, phone, address
   - Social media
   - Only accessible to PRO users

---

## API Changes

### Old Endpoints (Remove)
```
POST /api/search          # User-initiated search
GET  /api/search/:id      # Get search status
GET  /api/search/:id/leads # Get leads
```

### New Endpoints (Add)

```
GET  /api/leads
  ?category=hair_salon
  &location=NYC
  &minScore=70
  → Returns available leads (not claimed by user)

POST /api/leads/claim
  { leadIds: ["id1", "id2", "id3"] }
  → Claims leads, creates LeadClaim records
  → Checks user's tier limits

GET  /api/leads/my-leads
  ?page=1&limit=20
  → Returns user's claimed leads

GET  /api/leads/:id
  → Lead details

GET  /api/leads/:id/contact
  → Contact info (PRO only)

GET  /api/subscription/usage
  → { tier: "BASIC", limit: 100, used: 45, remaining: 55 }

GET  /api/niches
  → List available niches (for filtering)
```

---

## Frontend Changes

### Old Dashboard
- Search box
- Search history
- Results per search

### New Dashboard

#### Free Tier
```
╔══════════════════════════════════════════╗
║  Your Leads This Week: 3 / 10           ║
║  [Upgrade to Basic for 100/month →]     ║
╚══════════════════════════════════════════╝

📊 Available Leads (Refreshed Weekly)

┌────────────────────────────────────────┐
│ 🏪 Joe's Hair Salon - Brooklyn, NY     │
│ WordPress 5.8 | 15 plugins | Score: 85 │
│ Last scanned: 2 days ago               │
│ [Claim This Lead]                      │
└────────────────────────────────────────┘
│ 🍝 Maria's Restaurant - Manhattan      │
│ WordPress 6.0 | WooCommerce | Score: 72│
│ [Claim This Lead]                      │
└────────────────────────────────────────┘

[Show More]
```

#### Basic Tier ($49/mo)
```
╔══════════════════════════════════════════╗
║  Your Leads This Month: 45 / 100        ║
╚══════════════════════════════════════════╝

Tabs: [My Leads] [Browse New Leads] [Archive]

Filter: [All Categories ▼] [All Locations ▼]

Available Leads:
┌────────────────────────────────────────┐
│ Same as free but 100/month             │
│ + CSV Export                           │
│ + Archive access                       │
└────────────────────────────────────────┘
```

#### Pro Tier ($299/mo)
```
╔══════════════════════════════════════════╗
║  Your Leads This Month: 120 / 250       ║
╚══════════════════════════════════════════╝

🔍 Advanced Filters:
[Category ▼] [Location ▼] [Min Score: 70 ▼]
[Has WooCommerce ☑] [10+ Plugins ☑]

Available Leads:
┌────────────────────────────────────────┐
│ 🏪 Joe's Hair Salon - Brooklyn, NY     │
│ WordPress 5.8 | 15 plugins | Score: 85 │
│                                        │
│ 📧 joe@hairsalon.com                   │
│ 📱 (555) 123-4567                      │
│ 📍 123 Main St, Brooklyn, NY           │
│                                        │
│ [Claim Lead] [Generate Email Template] │
└────────────────────────────────────────┘
```

---

## CRON Jobs (Auto-Running)

When you deploy with `USE_JOB_QUEUE=true`, these run automatically:

### 1. Daily Lead Generation (4am)
Scans configured niches and creates new leads

### 2. Weekly Lead Refresh (Sundays 3am)
Re-scans old leads to keep data fresh

### 3. Weekly Free Reset (Mondays 2am)
Resets lead counters for FREE tier users

### 4. Monthly Paid Reset (1st of month, 2am)
Resets lead counters for BASIC/PRO users

### 5. Cleanup Old Data (Sundays 3am)
Removes invalid leads and old logs

---

## Initial Niches (Seed Data)

System will automatically scan these:

1. **Hair Salons & Barbershops**
   - Queries: "hair salons in {city}", "barbershops in {city}"
   - Locations: NYC, LA, Chicago, Houston, Phoenix
   - Frequency: Weekly

2. **Restaurants & Cafes**
   - Queries: "restaurants in {city}", "cafes in {city}"
   - Locations: NYC, LA, Chicago, Miami, Seattle
   - Frequency: Weekly

3. **Dental Practices**
   - Queries: "dentists in {city}"
   - Locations: NYC, LA, Chicago, Houston, Dallas
   - Frequency: Weekly

4. **Law Firms**
   - Queries: "law firms in {city}", "attorneys in {city}"
   - Locations: NYC, LA, Chicago, Boston, DC
   - Frequency: Weekly

5. **Real Estate Agents**
   - Queries: "real estate agents in {city}"
   - Locations: NYC, LA, Miami, Austin, Denver
   - Frequency: Weekly

**→ 5 niches × 5 locations × 50 sites = ~1,250 leads/week**

---

## Revenue Model

### Monthly Recurring Revenue (MRR)

**Target:**
- 100 free users (lead generation/SEO)
- 50 Basic users × $49 = $2,450/mo
- 10 Pro users × $299 = $2,990/mo
**Total MRR: $5,440/mo**

### Growth Strategy

1. **Month 1-3:** Free tier only, build lead database
2. **Month 4:** Launch Basic tier ($49/mo)
3. **Month 6:** Launch Pro tier ($299/mo) with contact info
4. **Month 9:** Add email outreach feature (+$99/mo)
5. **Month 12:** API access for agencies (+$499/mo)

---

## Technical Implementation

### Step 1: Database Migration
```bash
# Use new schema
mv prisma/schema-v2.prisma prisma/schema.prisma

# Create migration
npx prisma migrate dev --name marketplace-model

# Seed niches
npm run seed
```

### Step 2: Build New Services
- LeadService: Browse, claim, check availability
- NicheScanner: Auto-scan configured niches
- LeadRefresher: Re-scan old leads
- UsageTracker: Check tier limits

### Step 3: Update CRON Jobs
- Daily lead generation
- Weekly lead refresh
- Monthly/weekly usage reset

### Step 4: Update API
- Remove old search endpoints
- Add new lead endpoints
- Update subscription logic

### Step 5: Rebuild Frontend
- New dashboard design
- Lead browsing UI
- Tier-based filtering
- Usage indicators

---

## Deployment (Free Tier)

### Railway (Recommended)
- $5 free credit/month
- Auto-deploy from GitHub
- PostgreSQL + Redis included
- Can run API + Worker

See **RAILWAY.md** for complete guide.

### Vercel (Frontend)
- Free for Next.js frontend
- Auto-deploy from GitHub
- Global CDN

---

## Next Steps

1. ✅ **Review new schema** (see `schema-v2.prisma`)
2. ✅ **Read migration plan** (see `MIGRATION.md`)
3. ✅ **Deploy to Railway** (see `RAILWAY.md`)
4. ⏳ **Implement new services**
5. ⏳ **Update CRON jobs**
6. ⏳ **Rebuild API endpoints**
7. ⏳ **Redesign frontend**
8. ⏳ **Seed initial niches**
9. ⏳ **Test lead generation**
10. ⏳ **Launch!**

---

## Questions to Discuss

1. **Lead exclusivity?** Should leads be exclusive or can multiple users claim the same lead?
2. **Geographic exclusivity?** Only one user per lead per region?
3. **Re-claiming?** Can users claim the same lead again after it's refreshed?
4. **Quality threshold?** Only show leads with score > 50?
5. **Contact info source?** How to get emails/phones? (scraping, API, manual)
6. **Email templates?** Built-in or let users create their own?

---

## Why This Model is Better

### For Users
- ✅ Instant access (no waiting)
- ✅ Fresh leads (re-scanned weekly)
- ✅ Predictable costs (fixed monthly price)
- ✅ No searching/filtering hassle (we do it)

### For You (Business)
- ✅ Scalable (scan once, sell many times)
- ✅ Predictable costs (controlled scanning)
- ✅ Recurring revenue (subscriptions)
- ✅ Upsell opportunities (tiers + features)
- ✅ True SaaS model

### For the Product
- ✅ Faster user experience
- ✅ More efficient scanning
- ✅ Better data quality (regular re-scans)
- ✅ Easier to maintain
- ✅ Room for growth

---

Ready to implement? Start with **RAILWAY.md** to deploy, then follow **MIGRATION.md** to rebuild the system! 🚀
