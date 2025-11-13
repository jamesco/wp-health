# Migration Plan: User-Initiated → Lead Marketplace

This document outlines the migration from the current "user-initiated search" model to the new "lead marketplace" model.

## Current Model (Wrong)

```
User → Search Query → On-Demand Scan → Personal Leads
```

**Problems:**
- Slow (wait 2-5 minutes per search)
- Wasteful (scanning same sites multiple times)
- No recurring value
- Hard to scale

## New Model (Correct)

```
System → Auto-Scan Niches → Central Lead DB → Users Browse/Claim Leads
```

**Benefits:**
- ✅ Instant access to leads
- ✅ Efficient scanning (each site scanned once)
- ✅ Recurring value (leads refreshed weekly)
- ✅ Scalable
- ✅ True SaaS model

---

## Database Schema Changes

### Old Schema
```
User → Search (user-initiated) → Lead (personal)
```

### New Schema
```
User → LeadClaim → Lead (global)
         ↓
    Subscription (tier-based)

ScanNiche → Auto-scanning → Lead (central database)
```

---

## Key Changes

### 1. **Lead Model**
**Before:** Tied to user's search
**After:** Global, available to all users (until claimed)

```typescript
// OLD
model Lead {
  userId: user's ID
  searchId: search ID
}

// NEW
model Lead {
  status: "available" | "stale" | "invalid"
  lastScannedAt: Date
  claims: LeadClaim[] // which users got this lead
}
```

### 2. **LeadClaim Model** (New)
Tracks which users received which leads:
```typescript
model LeadClaim {
  userId: who claimed it
  leadId: which lead
  claimedAt: when
  viewed: did they view details?
}

// Constraint: Each user can only claim a lead once
@@unique([userId, leadId])
```

### 3. **Subscription Tiers**
```typescript
enum SubscriptionTier {
  FREE   // 10 leads/week
  BASIC  // 100 leads/month ($49)
  PRO    // 250 leads/month ($299) + filtering + contact info
}
```

### 4. **ScanNiche Model** (New)
Defines what the system automatically scans:
```typescript
model ScanNiche {
  name: "Hair Salons"
  category: "hair salon"
  searchQueries: ["hair salons in {city}"]
  locations: ["NYC", "LA", "Chicago"]
  scanFrequency: "weekly"
  nextScanAt: Date
}
```

---

## Architecture Changes

### Old Flow
```
User Request → API → Scan Job → Create Leads → Return to User
```

### New Flow

#### Lead Generation (Automatic)
```
CRON Job (daily)
  → Check ScanNiche.nextScanAt
  → For each due niche:
      → Generate search queries
      → Scan sites
      → Create/Update leads in central DB
      → Update ScanNiche.lastScannedAt
```

#### User Access
```
User Opens Dashboard
  → Check subscription tier
  → Check leadsClaimedThisMonth vs limit
  → Show available leads (not yet claimed by this user)
  → User claims leads
  → Create LeadClaim records
  → Increment leadsClaimedThisMonth
```

---

## New CRON Jobs

### 1. **Daily Lead Generation** (4am)
```typescript
// For each enabled ScanNiche where nextScanAt <= now:
//   1. Generate queries ("hair salons in NYC", etc.)
//   2. Scan top 50 sites per query
//   3. Create/update leads
//   4. Set nextScanAt based on scanFrequency
```

### 2. **Weekly Lead Refresh** (Sundays 3am)
```typescript
// For leads where lastScannedAt > 14 days:
//   1. Re-scan the site
//   2. Update wpVersion, plugins, themes
//   3. Recalculate score
//   4. If site no longer WordPress: mark status = "invalid"
```

### 3. **Monthly Usage Reset** (1st of month, 2am)
```typescript
// For all subscriptions:
//   if (now - monthStartDate) >= 30 days:
//     leadsClaimedThisMonth = 0
//     monthStartDate = now
```

### 4. **Weekly Free Tier Reset** (Mondays 2am)
```typescript
// For FREE tier users:
//   leadsClaimedThisMonth = 0
```

---

## API Changes

### Old Endpoints
```
POST /api/search          # Start user-initiated search
GET  /api/search/:id      # Get search status
GET  /api/search/:id/leads # Get search leads
```

### New Endpoints
```
GET  /api/leads                    # Browse available leads
     ?category=hair_salon
     &location=NYC
     &minScore=70
     &tier=PRO (filtering only for PRO users)

POST /api/leads/claim              # Claim leads
     { leadIds: ["id1", "id2"] }

GET  /api/leads/my-leads           # Get user's claimed leads
     ?page=1&limit=20

GET  /api/leads/:id                # Get lead details
GET  /api/leads/:id/contact        # Get contact info (PRO only)

GET  /api/subscription/usage       # Check remaining leads
     → { tier: "BASIC", limit: 100, used: 45, remaining: 55 }

GET  /api/niches                   # List available niches (for filtering)
```

---

## Frontend Changes

### Old Dashboard
```
- Search box (enter query)
- Search history
- Results for each search
```

### New Dashboard

#### Free Tier
```
┌─────────────────────────────────────────┐
│ Your Leads This Week: 3 / 10           │
│ [Upgrade to Basic for 100/month]       │
└─────────────────────────────────────────┘

Available Leads (refreshed weekly):
┌────────────────────────────────────────┐
│ Joe's Hair Salon - Brooklyn, NY        │
│ WordPress 5.8 | 15 plugins | Score: 85 │
│ [Claim Lead]                           │
├────────────────────────────────────────┤
│ Maria's Restaurant - Manhattan         │
│ WordPress 6.0 | WooCommerce | Score: 72│
│ [Claim Lead]                           │
└────────────────────────────────────────┘
```

#### Basic Tier ($49/month)
```
┌─────────────────────────────────────────┐
│ Your Leads This Month: 45 / 100        │
│ [Upgrade to PRO for filtering]         │
└─────────────────────────────────────────┘

Available Leads:
[Filter by Category ▼] [All Locations ▼]

My Claimed Leads | New Leads | Archive
┌────────────────────────────────────────┐
│ [Same as free but 100/month]           │
└────────────────────────────────────────┘
```

#### Pro Tier ($299/month)
```
┌─────────────────────────────────────────┐
│ Your Leads This Month: 120 / 250       │
└─────────────────────────────────────────┘

🔍 Advanced Filters:
[Category ▼] [Location ▼] [Min Score: 70]
[Has WooCommerce ☐] [Has 10+ Plugins ☐]

Available Leads:
┌────────────────────────────────────────┐
│ Joe's Hair Salon - Brooklyn, NY        │
│ WordPress 5.8 | 15 plugins | Score: 85 │
│ 📧 joe@hairsalon.com | 📱 555-1234    │
│ [Claim Lead] [Generate Email]         │
└────────────────────────────────────────┘
```

---

## Migration Steps

### Phase 1: Database Migration
```bash
# 1. Create new schema
mv prisma/schema.prisma prisma/schema-old.prisma
mv prisma/schema-v2.prisma prisma/schema.prisma

# 2. Generate migration
npx prisma migrate dev --name marketplace-model

# 3. Seed initial niches
npm run seed
```

### Phase 2: Implement New Services
- [ ] LeadService (browse, claim, check availability)
- [ ] NicheScanner (auto-scan niches)
- [ ] LeadRefresher (re-scan old leads)
- [ ] UsageTracker (check limits)

### Phase 3: Update CRON Jobs
- [ ] Daily lead generation
- [ ] Weekly lead refresh
- [ ] Monthly/weekly usage reset

### Phase 4: Update API Endpoints
- [ ] Remove old search endpoints
- [ ] Add new lead endpoints
- [ ] Update subscription logic

### Phase 5: Update Frontend
- [ ] New dashboard design
- [ ] Lead browsing UI
- [ ] Tier-based filtering
- [ ] Usage indicators

---

## Seed Data: Initial Niches

```typescript
const initialNiches = [
  {
    name: "Hair Salons & Barbershops",
    category: "hair salon",
    searchQueries: [
      "hair salons in {city}",
      "barbershops in {city}",
      "hair stylists in {city}"
    ],
    locations: ["New York, NY", "Los Angeles, CA", "Chicago, IL",
                "Houston, TX", "Phoenix, AZ"],
    scanFrequency: "weekly",
    priority: 1
  },
  {
    name: "Restaurants & Cafes",
    category: "restaurant",
    searchQueries: [
      "restaurants in {city}",
      "cafes in {city}",
      "coffee shops in {city}"
    ],
    locations: ["New York, NY", "Los Angeles, CA", "Chicago, IL"],
    scanFrequency: "weekly",
    priority: 2
  },
  {
    name: "Dental Practices",
    category: "dentist",
    searchQueries: ["dentists in {city}"],
    locations: ["New York, NY", "Los Angeles, CA", "Chicago, IL"],
    scanFrequency: "weekly",
    priority: 1
  },
  // ... more niches
];
```

---

## Pricing Page Updates

### Old
```
$49/month - 50 leads per week
```

### New
```
Free          - 10 leads/week
              - Basic filtering
              - No archive access

Basic $49/mo  - 100 leads/month
              - Full archive access
              - Export to CSV

Pro $299/mo   - 250 leads/month
              - Advanced filtering
              - Contact information
              - Email templates
              - Priority support
```

---

## Next Steps

1. **Review new schema** - Make sure it covers all use cases
2. **Implement seed data** - Create initial ScanNiche records
3. **Build NicheScanner service** - Auto-scanning logic
4. **Update CRON jobs** - Lead generation + refresh
5. **Rebuild API** - New endpoints for lead marketplace
6. **Redesign frontend** - Dashboard for browsing leads
7. **Deploy to Railway** - Free tier for testing

---

## Questions to Consider

1. **Lead expiration?** - Remove leads older than X months?
2. **Lead exclusivity?** - Should leads be exclusive to first claimer?
3. **Re-claiming?** - Can users claim the same lead after it's refreshed?
4. **Quality threshold?** - Only show leads with score > X?
5. **Geographic exclusivity?** - Only one user per lead per region?
