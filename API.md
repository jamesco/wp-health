# API Documentation

Base URL: `http://localhost:3001` (development) or your production URL

## Authentication

Most endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Tokens are obtained from `/api/auth/login` or `/api/auth/register` endpoints.

## Authentication Endpoints

### Register

Create a new user account.

**Endpoint**: `POST /api/auth/register`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe" // optional
}
```

**Response** (200 OK):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clx123abc",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid input or user already exists
- `500 Internal Server Error`: Server error

---

### Login

Authenticate and get access token.

**Endpoint**: `POST /api/auth/login`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response** (200 OK):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clx123abc",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid credentials
- `500 Internal Server Error`: Server error

---

## Subscription Endpoints

### Create Checkout Session

Start Stripe checkout flow for subscription.

**Endpoint**: `POST /api/subscription/create-checkout`

**Headers**: Requires authentication

**Response** (200 OK):
```json
{
  "sessionId": "cs_test_abc123",
  "url": "https://checkout.stripe.com/pay/cs_test_abc123"
}
```

**Error Responses**:
- `400 Bad Request`: Already subscribed
- `401 Unauthorized`: Not authenticated
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

---

### Get Subscription Status

Get current subscription details.

**Endpoint**: `GET /api/subscription/status`

**Headers**: Requires authentication

**Response** (200 OK):
```json
{
  "id": "sub_123abc",
  "userId": "clx123abc",
  "stripeCustomerId": "cus_123",
  "stripeSubscriptionId": "sub_123",
  "stripePriceId": "price_123",
  "status": "active",
  "currentPeriodStart": "2024-01-01T00:00:00.000Z",
  "currentPeriodEnd": "2024-02-01T00:00:00.000Z",
  "cancelAtPeriodEnd": false,
  "leadsPerWeek": 50,
  "leadsUsedThisWeek": 15,
  "weekStartDate": "2024-01-15T00:00:00.000Z",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-15T00:00:00.000Z"
}
```

If no subscription:
```json
{
  "status": "none"
}
```

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `500 Internal Server Error`: Server error

---

### Cancel Subscription

Cancel subscription at end of billing period.

**Endpoint**: `POST /api/subscription/cancel`

**Headers**: Requires authentication

**Response** (200 OK):
```json
{
  "message": "Subscription will be canceled at period end"
}
```

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `404 Not Found`: No subscription found
- `500 Internal Server Error`: Server error

---

### Stripe Webhook

Endpoint for Stripe webhook events. Called by Stripe, not by clients.

**Endpoint**: `POST /api/subscription/webhook`

**Headers**:
- `stripe-signature`: Stripe signature header

**Request Body**: Raw Stripe event payload

**Response** (200 OK):
```json
{
  "received": true
}
```

---

## Search Endpoints

### Create Search

Start a new WordPress site search.

**Endpoint**: `POST /api/search`

**Headers**: Requires authentication

**Request Body**:
```json
{
  "query": "hair salons in NYC",
  "category": "hair salon", // optional
  "location": "New York, NY" // optional
}
```

**Response** (200 OK):
```json
{
  "searchId": "search_123abc",
  "message": "Search started"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid input or weekly limit reached
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: No active subscription
- `500 Internal Server Error`: Server error

---

### Get All Searches

Get all searches for authenticated user.

**Endpoint**: `GET /api/search`

**Headers**: Requires authentication

**Response** (200 OK):
```json
[
  {
    "id": "search_123",
    "userId": "user_123",
    "query": "hair salons in NYC",
    "category": "hair salon",
    "location": "New York, NY",
    "status": "completed",
    "totalSites": 50,
    "wpSitesFound": 23,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:05:00.000Z",
    "_count": {
      "leads": 23
    }
  }
]
```

**Status values**:
- `pending`: Search queued
- `processing`: Currently scanning
- `completed`: Finished successfully
- `failed`: Search failed

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `500 Internal Server Error`: Server error

---

### Get Search Details

Get details for a specific search.

**Endpoint**: `GET /api/search/:searchId`

**Headers**: Requires authentication

**Response** (200 OK):
```json
{
  "id": "search_123",
  "userId": "user_123",
  "query": "hair salons in NYC",
  "category": "hair salon",
  "location": "New York, NY",
  "status": "completed",
  "totalSites": 50,
  "wpSitesFound": 23,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:05:00.000Z",
  "leads": [
    {
      "id": "lead_123",
      "searchId": "search_123",
      "userId": "user_123",
      "url": "https://example.com",
      "businessName": "Example Hair Salon",
      "isWordPress": true,
      "wpVersion": "6.0.0",
      "wpOutdated": true,
      "plugins": [
        {
          "name": "Contact Form 7",
          "slug": "contact-form-7",
          "version": "5.6.0"
        }
      ],
      "themes": [
        {
          "name": "Twenty Twenty One",
          "slug": "twentytwentyone",
          "version": "1.5"
        }
      ],
      "woocommerce": {
        "detected": true,
        "version": "7.5.0"
      },
      "contactInfo": null,
      "score": 75,
      "createdAt": "2024-01-15T10:02:00.000Z",
      "updatedAt": "2024-01-15T10:02:00.000Z"
    }
  ]
}
```

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `404 Not Found`: Search not found or doesn't belong to user
- `500 Internal Server Error`: Server error

---

### Get Search Leads

Get all leads for a specific search.

**Endpoint**: `GET /api/search/:searchId/leads`

**Headers**: Requires authentication

**Response** (200 OK):
```json
[
  {
    "id": "lead_123",
    "searchId": "search_123",
    "userId": "user_123",
    "url": "https://example.com",
    "businessName": "Example Hair Salon",
    "isWordPress": true,
    "wpVersion": "6.0.0",
    "wpOutdated": true,
    "plugins": [
      {
        "name": "Contact Form 7",
        "slug": "contact-form-7",
        "version": "5.6.0"
      },
      {
        "name": "Yoast SEO",
        "slug": "wordpress-seo",
        "version": "20.0"
      }
    ],
    "themes": [
      {
        "name": "Twenty Twenty One",
        "slug": "twentytwentyone",
        "version": "1.5"
      }
    ],
    "woocommerce": {
      "detected": true,
      "version": "7.5.0"
    },
    "contactInfo": null,
    "score": 75,
    "createdAt": "2024-01-15T10:02:00.000Z",
    "updatedAt": "2024-01-15T10:02:00.000Z"
  }
]
```

Leads are sorted by score (highest first).

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `404 Not Found`: Search not found or doesn't belong to user
- `500 Internal Server Error`: Server error

---

## Health Check

Check if API is running.

**Endpoint**: `GET /health`

**Response** (200 OK):
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

---

## Lead Scoring

Leads are automatically scored 0-100 based on:

- **WordPress Version (40 points max)**
  - Outdated core: 40 points
  - Version < 6.4: 30 points
  - Version < 6.5: 20 points
  - Version < 6.6: 10 points

- **Plugin Count (30 points max)**
  - 20+ plugins: 30 points
  - 10-20 plugins: 20 points
  - 5-10 plugins: 10 points

- **WooCommerce (20 points)**
  - Detected: 20 points

- **Multiple Themes (10 points max)**
  - 3+ themes: 10 points
  - 2 themes: 5 points

Higher scores indicate better leads (more outdated = more opportunity for maintenance services).

---

## Rate Limiting

API is rate limited to **100 requests per 15 minutes** per IP address.

When rate limit is exceeded:

**Response** (429 Too Many Requests):
```json
{
  "error": "Too many requests, please try again later"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message here"
}
```

Or for validation errors:

```json
{
  "error": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "undefined",
      "path": ["email"],
      "message": "Required"
    }
  ]
}
```

**HTTP Status Codes**:
- `200`: Success
- `400`: Bad Request (invalid input)
- `401`: Unauthorized (missing or invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error

---

## Example Usage

### Complete Flow Example (JavaScript)

```javascript
const API_URL = 'http://localhost:3001';

// 1. Register
const registerResponse = await fetch(`${API_URL}/api/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'securepassword',
    name: 'John Doe'
  })
});
const { token } = await registerResponse.json();

// 2. Create subscription (opens Stripe checkout)
const checkoutResponse = await fetch(`${API_URL}/api/subscription/create-checkout`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
const { url } = await checkoutResponse.json();
// Redirect user to url for payment

// 3. After subscription is active, start a search
const searchResponse = await fetch(`${API_URL}/api/search`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: 'hair salons in NYC',
    category: 'hair salon',
    location: 'New York, NY'
  })
});
const { searchId } = await searchResponse.json();

// 4. Poll for results (search takes 2-5 minutes)
const checkResults = async () => {
  const response = await fetch(`${API_URL}/api/search/${searchId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const search = await response.json();

  if (search.status === 'completed') {
    // Get leads
    const leadsResponse = await fetch(`${API_URL}/api/search/${searchId}/leads`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const leads = await leadsResponse.json();
    console.log('Found leads:', leads);
  } else {
    // Check again in 30 seconds
    setTimeout(checkResults, 30000);
  }
};
checkResults();
```

### cURL Examples

**Register**:
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","name":"John"}'
```

**Login**:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

**Start Search**:
```bash
curl -X POST http://localhost:3001/api/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"query":"hair salons in NYC"}'
```

**Get Search Results**:
```bash
curl http://localhost:3001/api/search/SEARCH_ID/leads \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Webhooks

### Receiving Stripe Events

Your application receives these Stripe events via webhook:

- `checkout.session.completed`: When user completes checkout
- `customer.subscription.updated`: When subscription changes
- `customer.subscription.deleted`: When subscription is canceled
- `invoice.payment_failed`: When payment fails

Events are automatically processed and update the database accordingly.

To test webhooks locally:

```bash
stripe listen --forward-to localhost:3001/api/subscription/webhook
```

---

## TypeScript Types

If using TypeScript, here are the main types:

```typescript
interface User {
  id: string;
  email: string;
  name?: string;
}

interface Subscription {
  id: string;
  userId: string;
  status: string;
  leadsPerWeek: number;
  leadsUsedThisWeek: number;
  weekStartDate: string;
  currentPeriodEnd: string;
}

interface Search {
  id: string;
  userId: string;
  query: string;
  category?: string;
  location?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalSites: number;
  wpSitesFound: number;
  createdAt: string;
  updatedAt: string;
}

interface Lead {
  id: string;
  searchId: string;
  userId: string;
  url: string;
  businessName?: string;
  isWordPress: boolean;
  wpVersion?: string;
  wpOutdated?: boolean;
  plugins: Plugin[];
  themes: Theme[];
  woocommerce?: WooCommerce;
  score?: number;
  createdAt: string;
  updatedAt: string;
}

interface Plugin {
  name: string;
  slug?: string;
  version?: string;
}

interface Theme {
  name: string;
  slug?: string;
  version?: string;
}

interface WooCommerce {
  detected: boolean;
  version?: string;
}
```
