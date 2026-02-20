# Backend Phase 1: Render Free Tier Architecture

## 🎯 Render Free Tier Constraints

```
RAM:           512 MB (TIGHT!)
CPU:           0.5 vCPU (slow)
Disk:          Ephemeral (resets on deploy/restart)
Monthly hours: 750 (plenty for internal tool)
Cold start:    ~30 seconds after 15 min inactivity
Max request:   ~30 second timeout
Database:      Need external
```

### Critical Implications
- **NO persistent in-memory caching** (resets on deploy/restart)
- **NO large state** (512 MB for entire Node.js app + data)
- **NO background jobs** (no persistent queue)
- **CSV stays small** (fit in RAM for processing)
- **Need external database** (for persistence)

---

## 📊 Architecture: Single-Tenant, Render-Optimized

### Option A: SQLite (Simplest, Fits Free Tier)

```
┌─ Frontend (Vite) ──────────────┐
│  App.tsx                        │
│  - Accepts CSV upload           │
│  - Shows forecasts              │
└─────────────┬────────────────────┘
              │
              ↓ HTTPS
    ┌─────────────────────┐
    │  Render Backend     │
    │  (512 MB, Node.js)  │
    │                     │
    │ POST /api/aggregate │ ← Parse CSV, aggregate
    │ GET /api/forecast   │ ← Calculate forecast
    │ POST /api/backtest  │ ← Run backtest
    └────────────┬────────┘
                 │
                 ↓ (on-disk)
    ┌─────────────────────┐
    │  SQLite DB          │
    │  (data.db file)     │
    │                     │
    │ sku_month_aggregate │
    │ forecast_cache      │
    │ backtest_results    │
    └─────────────────────┘
```

**Pros**:
- No external DB dependency
- Fits in Render free tier
- Can version control schema
- Fast for small datasets

**Cons**:
- SQLite concurrent writes slow
- Need to upload CSV each session
- Limited to ~100MB data size

---

### Option B: MongoDB Atlas Free Tier (More Scalable)

```
Render Backend (512 MB) ← HTTP → MongoDB Atlas (512 MB free)
```

**Pros**:
- Persistent storage (survives Render restarts)
- Scalable (can grow past 512 MB)
- JSON native (perfect for forecasts)

**Cons**:
- External dependency (one more thing to fail)
- Network latency (~100-200ms per request)
- Free tier: 512 MB storage, 3 concurrent connections

**Recommendation**: Start with MongoDB Atlas free tier (more robust)

---

## 🏗️ Backend Stack (Minimal Render Footprint)

```
Framework:     Express.js (16 MB)
Language:      TypeScript (for type safety, same as frontend)
Process:       Single process (no clustering)
Data layer:    Mongoose (MongoDB) OR better-sqlite3 (SQLite)
Worker:        No workers initially (Render can't sustain them)
Caching:       Memory only, request-scoped (no persistence)
Deployment:    Docker (~200 MB image)
```

### Package.json (Minimal Dependencies)

```json
{
  "name": "supply-chain-backend",
  "version": "0.0.1",
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.0.0",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "dotenv": "^16.0.3"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/express": "^4.17.17",
    "@types/node": "^18.0.0",
    "tsx": "^3.12.0"
  }
}
```

**Total size**: ~150 MB with node_modules (acceptable for Docker)

---

## 📦 Data Layer Design (Memory-Efficient)

### SkuMonthAggregate Table
```typescript
// Schema: Minimal fields only
interface SkuMonthAggregate {
  _id?: string;                    // MongoDB auto ID
  orgId?: string;                  // Single tenant: omit or hardcode
  sku: string;
  yearMonth: string;               // YYYY-MM
  quantity: number;                // SUM
  count: number;                   // How many datapoints
  minQty: number;
  maxQty: number;
  stdDev: number;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Size: ~200 bytes per record
// 500 SKUs × 36 months = 18,000 records × 200 bytes = 3.6 MB ✅
```

### ForecastCache Table (Optional, Saves API Calls)
```typescript
interface ForecastCacheEntry {
  configHash: string;              // SHA256(skus + method + horizon + conf)
  result: ForecastPoint[];
  createdAt: Date;
  expiresAt: Date;                 // Auto-delete after 1 hour
}

// MongoDB TTL index: auto-deletes expired entries
```

### API Response Size (Network Efficient)
```typescript
// Don't return full aggregates to frontend
// Instead: Return only what's needed

GET /api/forecast?skus=SKU1,SKU2,SKU3&method=HW&horizon=12
Response: 
{
  status: "success",
  data: [
    {
      sku: "SKU1",
      forecast: [100, 120, 115, ...],      // 12 values
      lowerBound: [80, 100, 95, ...],
      upperBound: [120, 140, 135, ...],
      safetyStock: 45,
      reorderPoint: 200
    }
  ],
  meta: { duration: "234ms", cached: false }
}

// Size: ~500 bytes per SKU, vs 50KB raw CSV
```

---

## 🚀 Phase 1 Backend: Single Express Endpoint

### Minimal MVP (Fits Free Tier!)

```typescript
// backend/server.ts

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { aggregate } from './services/aggregation';
import { forecast } from './services/forecasting';

const app = express();

// Security
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '50mb' })); // CSV can be large

// MongoDB connection (once at startup)
mongoose.connect(process.env.MONGODB_URI!, {
  serverSelectionTimeoutMS: 5000
}).catch(err => console.error('DB connection failed:', err));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

/**
 * POST /api/aggregate
 * Input: CSV data
 * Output: SkuMonthAggregate stored in DB
 * 
 * Flow:
 * 1. Parse CSV (streaming if large)
 * 2. Group by (sku, yearMonth)
 * 3. Save to MongoDB
 * 4. Return summary
 */
app.post('/api/aggregate', async (req, res) => {
  try {
    const { csvData } = req.body; // Raw CSV string from frontend
    
    if (!csvData || csvData.length === 0) {
      return res.status(400).json({ error: 'No CSV data provided' });
    }
    
    // Parse and aggregate
    const aggregates = await aggregate(csvData);
    
    // Save to MongoDB
    await SkuMonthAggregate.insertMany(aggregates, { ordered: false });
    
    return res.json({
      status: 'success',
      records: aggregates.length,
      summary: {
        uniqueSkus: new Set(aggregates.map(a => a.sku)).size,
        dateRange: [
          aggregates.reduce((min, a) => a.yearMonth < min ? a.yearMonth : min),
          aggregates.reduce((max, a) => a.yearMonth > max ? a.yearMonth : max)
        ]
      }
    });
  } catch (error) {
    console.error('Aggregation error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId: req.id // For debugging
    });
  }
});

/**
 * GET /api/forecast
 * Query: ?skus=SKU1,SKU2&method=HW&horizon=12&confidence=95
 * Output: Forecasts for selected SKUs
 * 
 * Flow:
 * 1. Load SkuMonthAggregate for selected SKUs
 * 2. Calculate forecast (in-memory, CPU-bound)
 * 3. Return results (don't cache, just compute)
 */
app.get('/api/forecast', async (req, res) => {
  try {
    const { skus, method = 'HW', horizon = 12, confidence = 95 } = req.query;
    
    if (!skus || typeof skus !== 'string') {
      return res.status(400).json({ error: 'skus parameter required' });
    }
    
    const skuList = skus.split(',').map(s => s.trim());
    
    // Load from DB (small query)
    const aggregates = await SkuMonthAggregate.find({ sku: { $in: skuList } });
    
    if (aggregates.length === 0) {
      return res.status(404).json({ error: 'No data found for SKUs' });
    }
    
    // Calculate forecast in-memory (no persistence)
    const forecasts = await forecast({
      aggregates,
      method,
      horizon: parseInt(horizon as string),
      confidence: parseInt(confidence as string)
    });
    
    return res.json({
      status: 'success',
      data: forecasts,
      meta: { 
        duration: `${Date.now() - req.startTime}ms`,
        skuCount: skuList.length,
        method
      }
    });
  } catch (error) {
    console.error('Forecast error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
```

---

## 💾 Database Choice: MongoDB Atlas Free Tier

### Why MongoDB (vs SQLite)

| Aspect | SQLite | MongoDB Atlas |
|--------|--------|---------------|
| Persistence | ✅ File | ✅ Cloud |
| Survives Render restart | ❌ No | ✅ Yes |
| Concurrent access | ⚠️ Slow | ✅ Fast |
| Scaling | ❌ Limited | ✅ Can grow |
| Setup | ✅ 0 clicks | 🟡 5 minutes |

### Setup (5 minutes)

1. Go to [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create free account
3. Create free cluster (512 MB)
4. Create database user + password
5. Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/supply-chain`
6. Add to Render env vars: `MONGODB_URI`

**Cost**: FREE forever (512 MB storage limit, but plenty for small datasets)

---

## 📤 Frontend Integration: Minimal Changes

### Current App.tsx Uses Client-Side Forecasting
```typescript
// CURRENT (will stay for offline fallback):
const skuLevelForecasts = useMemo(() => {
  // calculateForecast() locally (works now)
}, [...deps]);
```

### Add Backend Option (Feature Flag)

```typescript
// NEW: Optional backend forecasting
const USE_BACKEND = process.env.REACT_APP_USE_BACKEND === 'true';

// When user uploads CSV:
const handleCSVUpload = async (file: File) => {
  if (USE_BACKEND) {
    // Send to backend, get aggregates back
    const response = await fetch(`${API_URL}/api/aggregate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvData: file.text() })
    });
    
    const { summary } = await response.json();
    console.log(`✅ Aggregated ${summary.records} records`);
    
    // Frontend still shows UI, but can fetch forecasts from backend
    setUseBackendForecasts(true);
  } else {
    // Old behavior: parse locally
    parseCSVLocally(file);
  }
};

// When calculating forecasts:
const getForecast = async (config: ForecastConfig) => {
  if (USE_BACKEND && useBackendForecasts) {
    const response = await fetch(
      `${API_URL}/api/forecast?skus=${config.skus.join(',')}&method=${config.method}`
    );
    return response.json();
  } else {
    // Fallback: local calculation
    return calculateForecastLocally(config);
  }
};
```

---

## 🐳 Render Deployment

### Dockerfile (Optimized)

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (Alpine = smaller)
RUN npm ci --only=production

# Copy source
COPY dist ./dist
COPY tsconfig.json ./

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "dist/server.js"]
```

**Image size**: ~180 MB (Alpine + node_modules)

### Render Web Service

1. Connect GitHub repo with `/backend` folder
2. Build command: `npm run build`
3. Start command: `npm run start`
4. Environment variables:
   ```
   MONGODB_URI=mongodb+srv://...
   NODE_ENV=production
   PORT=3000
   ```

**Free tier**: Always running (no cold start issues for internal tool)

---

## ⚡ Performance Expectations

### On Render Free Tier (512 MB, 0.5 vCPU)

```
500 SKUs, 36 months historical:

POST /api/aggregate (parse + insert)
  Time: 3-5 seconds
  Memory spike: ~150 MB
  
GET /api/forecast (calculate)
  Time: 1-2 seconds per 50 SKUs
  Memory: ~50 MB
  
Cold start (after 15 min inactivity)
  Time: ~30 seconds
  (Acceptable for internal tool, not user-facing)
```

**Optimization for speed**: Only calculate requested SKUs (not all)

---

## 🔒 Security (Minimal Setup)

```typescript
// .env.example
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/supply-chain
FRONTEND_URL=https://your-frontend.com
NODE_ENV=production
PORT=3000

// Render automatically secrets → private env vars
```

**What's secured**:
- ✅ HTTPS only (Render provides free SSL)
- ✅ Helmet headers
- ✅ CORS restricted to frontend
- ✅ MongoDB password in env (never in code)
- ✅ No multi-tenancy = no tenant isolation needed

**What's NOT needed** (single-tenant internal tool):
- ❌ Authentication (unless you want to)
- ❌ Encryption at rest
- ❌ API keys
- ❌ Rate limiting (trust internal users)

---

## 📋 File Structure

```
supplychain-predictor-pro/
├── frontend/                 (existing Vite app)
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
│
└── backend/                  (NEW)
    ├── src/
    │   ├── server.ts         ← Main Express app
    │   ├── services/
    │   │   ├── aggregation.ts    ← Parse CSV → Group by SKU-month
    │   │   └── forecasting.ts    ← Calculate forecast
    │   └── models/
    │       └── SkuMonthAggregate.ts  ← MongoDB schema
    │
    ├── dist/                 (compiled JS)
    ├── Dockerfile
    ├── package.json
    ├── tsconfig.json
    └── .env.example
```

---

## 🚦 Rollout Plan

### Week 1: Setup & Deploy Backend
- [ ] Create `/backend` folder with Express app
- [ ] Set up MongoDB Atlas free cluster
- [ ] Create Render web service
- [ ] Test endpoint: `GET /health` responds

### Week 1-2: Integrate Frontend
- [ ] Add feature flag: `REACT_APP_USE_BACKEND`
- [ ] Add CSV upload to backend
- [ ] Add forecast fetching from backend
- [ ] Test: Upload CSV → See forecasts from backend

### Week 2-3: Optimize & Polish
- [ ] Benchmark: How many SKUs before timeout?
- [ ] Add error handling + user-friendly messages
- [ ] Add request tracing for debugging
- [ ] Switch to backend by default (remove feature flag)

---

## 💡 Known Limits on Render Free Tier

```
❌ Can't handle 50K+ SKUs (memory)
❌ Can't do ML model training (too slow, no persistence)
❌ Can't have background jobs
✅ Can handle 500-2000 SKUs forecasting
✅ Can persist to MongoDB Atlas
✅ Good enough for internal team use
```

**When to upgrade to paid Render**:
- If > 1000 concurrent forecasts/day
- If forecasts take > 30 seconds (users waiting)
- If want worker pools (future ML training)

---

## Implementation Priority

1. **Day 1-2**: Express + MongoDB skeleton
2. **Day 2-3**: CSV aggregation endpoint
3. **Day 3-4**: Forecast calculation endpoint  
4. **Day 4-5**: Frontend integration
5. **Day 5-6**: Testing & optimization

Ready to start building?
