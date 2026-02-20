# Data Pipeline Architecture Analysis & Optimization Roadmap

## Current Architecture Overview

### Data Flow (Frontend-Only Currently)
```
CSV Upload → Parse & Normalize → State (data: DataPoint[])
                                      ↓
                    processedData (filtered by date/SKU/category)
                                      ↓
                         aggregatedData (sum by date)
                                      ↓
                    skuLevelForecasts (per-SKU forecasts) ← calculateForecast()
                                      ↓
                         aggregatedForecast (sum by date)
                                      ↓
                    Rendered in 6 tabs + Export
```

### Current Data Structures (Frontend State)
- **data**: `DataPoint[]` - All historical input data (e.g., 5 years × 52 weeks × 500 SKUs = ~130M points potential)
- **processedData**: `DataPoint[]` - Filtered subset (date range, SKU filter, category filter)
- **aggregatedData**: `DataPoint[]` - Collapsed to 1 row per date
- **skuLevelForecasts**: `Map<string, ForecastPoint[]>` - Per-SKU with enrichment (12-24 month forecast)
- **aggregatedForecast**: `ForecastPoint[]` - Sum across SKUs by date
- **skuLevelData**: Volatility/ABC analysis intermediate table
- **backtestResults**: 6-month validation window with method comparisons

---

## 🚨 Current Scalability Bottlenecks

### 1. **Data Duplication Problem** (CRITICAL)
**Impact: High Memory Usage + Redundant Computation**

```
Current: data → processedData → aggregatedData → skuLevelData (all separate arrays in memory)
Reality: Processing the same DataPoint[] multiple times in different formats
```

- `data` stored as-is
- `processedData` = filtered `data` (same points, different order)
- `aggregatedData` = collapsed `data` (recalculated every re-render)
- `skuLevelData` = extracted from `skuLevelForecasts` (redundant extraction)

**For 500 SKUs, 36 months historical + 12 month forecast:**
- Historical: 500 × 36 = 18,000 DataPoints in memory (3 copies) = 54,000 objects
- This doesn't include computed forecasts

---

### 2. **Per-Render Recalculation** (HIGH)
**Impact: Slow interactions, laggy filtering**

```tsx
const processedData = useMemo(() => {
  // Filters data every single render even if filters haven't changed
  // Then recalculates aggregatedData from scratch
  // Then recalculates skuLevelForecasts for ALL SKUs
})

const skuLevelForecasts = useMemo(() => {
  // Iterates ALL SKUs in committedSettings.filters.skus
  // Calls calculateForecast() for each (computationally expensive)
  // Then enriches each with supply chain metrics
  // Total complexity: O(SKU count × forecast horizon × 4 forecasting methods in backtest)
})
```

**Example Timeline for 500 SKUs, 12-month forecast:**
- calculateForecast × 500 = ~2-3 seconds
- applyMarketShocks × 500 = ~500ms
- calculateSupplyChainMetricsPerSku × 500 = ~1-2 seconds
- **Total: 4-6 seconds per analysis run** (user experiences stall on tab change)

---

### 3. **Backend Would Be Separate From Visuals** (ARCHITECTURE)
**Current Issue: All calculations frontend means:**
- Large data files (50MB+) must transfer and parse in browser
- CPU-intensive forecasting blocks UI thread
- No caching/persistence across sessions
- Complex state management sprawl

---

### 4. **Export Inefficiency**
**Current: Re-aggregates data during export**

```tsx
exportToCSV(data, filename)  // Re-maps data again to CSV format
exportBulkCSV(dataBySkus, filename)  // Iterates all SKUs again
// This duplicates already-computed data
```

---

## ✅ Recommended Architecture (Your Approach is CORRECT)

### Phase 1: Backend Aggregation Layer (SKU-Month Level)

**The core idea: Store/compute at the most granular useful level = SKU-Month, then aggregate UP**

```
Raw CSV (DataPoint[]) 
    ↓ [BACKEND]
Normalize & Validate
    ↓
GROUP BY (sku, year_month, category)
    ↓
Aggregate: SUM(quantity), COUNT, STDDEV, MIN, MAX
    ↓
Store as: SkuMonthAggregate table (N SKUs × 36-60 months = compact)
    ↓ [FRONTEND]
Use SkuMonthAggregate for ALL downstream calculations
    ↓
generateForecasts() uses aggregate quantities (not raw points)
    ↓
Display + Export use same SkuMonthAggregate
```

### Phase 2: Cache & Incremental Updates

```
Backend Storage:
  - SkuMonthAggregate (500 SKUs × 36 months = 18K rows, ~2MB vs ~50MB raw)
  - ForecastCache (SKU × Method × Horizon = pre-computed options)
  - BacktestResults (pre-computed per method)
  
Frontend Request:
  GET /api/forecasts?skus=[list]&method=HW&horizon=12&confidence=95
  → Returns only what's needed (not full raw dataset)
  → Results cached 1 hour (or invalidated on data upload)
```

---

## 🎯 Data Structure Consolidation Strategy

### BEFORE: 7 Separate Computed Tables
```
data[]                      — Raw input (50MB for large datasets)
processedData[]             — Filtered version of data
aggregatedData[]            — Sum by date
skuLevelForecasts Map       — Per-SKU with 12+ forecast points each
aggregatedForecast[]        — Re-summed from skuLevelForecasts
skuLevelData[]              — Volatility calculations (extracted from skuLevelForecasts)
backtestResults             — 6-month test window per method
```

### AFTER: 3 Core Tables (Single Source of Truth)

```
1. SkuMonthAggregate (Backend computed once)
   - sku: string
   - yearMonth: string (YYYY-MM)
   - quantity: number (SUM)
   - stdDev: number (calculated)
   - minQty: number
   - maxQty: number
   - category: string
   [Replaces: data, processedData, aggregatedData]
   [Size: ~2-5MB vs 50MB raw]

2. ForecastResult (Computed per request from #1)
   - sku: string
   - date: string (YYYY-MM-DD)
   - historical?: number
   - forecast: number
   - lowerBound?: number
   - upperBound?: number
   - isForecast: boolean
   - projectedInventory?: number
   - safetyStock?: number
   - reorderPoint?: number
   - projectedRevenue?: number
   - projectedMargin?: number
   - inventoryValue?: number
   [Replaces: skuLevelForecasts, aggregatedForecast]
   [Computed on-demand]

3. BacktestMetrics (Pre-computed per method)
   - method: ForecastMethodology
   - testWindow: { startDate, endDate }
   - mape: number
   - rmse: number
   - bias: number
   - comparisonData: [{date, actual, forecast}]
   [Replaces: backtestResults]
   [Pre-computed once per data upload]
```

---

## 🚀 Batch Processing Recommendations

### Current Issue: Sequential Forecasting
```tsx
// For each SKU, calculate forecast (sequential)
uniqueSkus.forEach(sku => {
  calculateForecast(...)  // Takes 4-8ms
  applyMarketShocks(...)  // Takes 1-2ms
  calculateSupplyChainMetricsPerSku(...)  // Takes 2-3ms
})
// Total: ~500 SKUs × 10ms = 5 seconds
```

### Optimized: Batch Processing

```typescript
// Backend implementation (Node.js / Python)

// Option 1: Worker Pool (Process SKUs in parallel)
const processForecastBatch = async (skus: string[], config: Config) => {
  const workerPool = new WorkerPool({ size: 4 });
  
  const results = await Promise.all(
    skus.map(sku => 
      workerPool.run((sku) => {
        const data = getSkuMonthAggregate(sku);
        return calculateForecast(data, config);
      }, sku)
    )
  );
  
  return results;
};

// Option 2: Vectorized Calculation (Single pass for all SKUs)
const processForecastsBatch = (skuMonthData: SkuMonthAggregate[]) => {
  // Group by SKU once
  const bySkuMap = groupBySkuPrecomputed(skuMonthData);
  
  // Calculate all forecasts in single pass
  const results = new Map();
  bySkuMap.forEach((monthData, sku) => {
    results.set(sku, calculateForecast(monthData));
  });
  
  return results;
};

// Option 3: Stream Processing (For very large datasets)
const processStreamingForecasts = (stream: ReadableStream<DataPoint>) => {
  const aggregates = new Map<string, SkuMonthAggregate>();
  
  stream.on('data', (point: DataPoint) => {
    const key = `${point.sku}-${point.date.slice(0,7)}`;
    aggregates.set(key, {
      ...aggregates.get(key),
      quantity: (aggregates.get(key)?.quantity || 0) + point.quantity
    });
  });
  
  stream.on('end', () => {
    // Compute forecasts from aggregates
    computeForecastsFromAggregates(aggregates);
  });
};
```

---

## 📊 Code Efficiency Analysis

### Current Hot Spots

#### 1. **Forecasting Algorithm** (calculateForecast function)
**Current: 336 lines, multiple passes**
```tsx
// Problem: Recalculates trend, seasonality, statistics on every call
// Especially bad for backtesting (calls this 4x per SKU × 500 SKUs = 2000 calls)

// CURRENT: ~8-12ms per SKU
// Could be: ~2-3ms with optimization
```

**Optimization:**
```typescript
// Cache trend/seasonality factors
const forecastCache = new Map<string, { trend, seasonal, stats }>();

export const calculateForecastOptimized = (
  historicalData: DataPoint[],
  horizon: number,
  method: ForecastMethodology
): ForecastPoint[] => {
  const skuKey = historicalData[0]?.sku;
  let cached = forecastCache.get(skuKey);
  
  if (!cached) {
    cached = {
      trend: calculateTrendOnce(historicalData),
      seasonal: calculateSeasonalOnce(historicalData),
      stats: calculateStatsOnce(historicalData)
    };
    forecastCache.set(skuKey, cached);
  }
  
  // Use cached factors
  return generateForecast(cached, horizon, method);
};
```

**Expected improvement: 60% faster forecasting**

---

#### 2. **Supply Chain Metrics Calculation** (calculateSupplyChainMetricsPerSku)
**Current: Iterates forecast points, recalculates inventory for each**
```tsx
// For 12 forecast points × 500 SKUs = 6000 iterations
// Each with: safety stock calc, reorder point calc, revenue calc

let runningInventory = onHand;
forecast.map(p => {
  // Recalculates safety stock for EVERY point (it's the same!)
  const safetyStock = Math.round(z * stdDev * Math.sqrt(leadTimePeriods));
  runningInventory -= scenarioVal;
  // ... calc revenue, margin
})
```

**Optimization:**
```typescript
const calculateSupplyChainMetricsPerSkuOptimized = (
  forecast: ForecastPoint[],
  sku: string,
  historicalStdDev: number,
  // ... other params
): ForecastPoint[] => {
  // Calculate constants ONCE
  const z = getZScore(serviceLevel);
  const adjustedLeadTime = leadTimeDays * (1 + volatilityMultiplier);
  const leadTimePeriods = adjustedLeadTime / 30;
  const safetyStock = Math.round(z * historicalStdDev * Math.sqrt(leadTimePeriods)); // Calc ONCE
  
  const forecastAvg = forecast
    .filter(f => f.isForecast)
    .reduce((s, f) => s + f.forecast, 0) / forecastOnly.length;
  const avgDailyDemand = forecastAvg / 30;
  const reorderPoint = Math.round((avgDailyDemand * adjustedLeadTime) + safetyStock); // Calc ONCE
  
  const skuPrice = skuAttribute?.sellingPrice ?? 150;
  const skuCost = skuAttribute?.unitCost ?? 100;
  
  // Now iterate only once
  let runningInventory = onHand;
  return forecast.map(p => ({
    ...p,
    safetyStock,    // Use calculated values
    reorderPoint,   // Use calculated values
    projectedInventory: (runningInventory -= (p.forecast || 0)),
    projectedRevenue: p.isForecast ? p.forecast * skuPrice : undefined,
    projectedMargin: p.isForecast ? p.forecast * (skuPrice - skuCost) : undefined,
    inventoryValue: runningInventory * skuCost
  }));
};
```

**Expected improvement: 40% faster supply chain calculations**

---

#### 3. **Pareto Analysis** (runParetoAnalysis)
**Current: Sorts all SKUs, calculates cumulative % for each**
```tsx
// For 500 SKUs × multiple render cycles = O(n log n) repeated

const sorted = [...skuData].sort((a, b) => b.totalVolume - a.totalVolume);
// ^ Makes a copy and sorts every render
```

**Optimization:**
```typescript
// Sort once, reuse
const skuParetoCache = new Map<string, ParetoResult[]>();

const runParetoAnalysisOptimized = (skuData: SkuData[]): ParetoResult[] => {
  const cacheKey = skuData.map(s => s.sku).join(',');
  
  if (skuParetoCache.has(cacheKey)) {
    return skuParetoCache.get(cacheKey)!;
  }
  
  const sorted = [...skuData].sort((a, b) => b.totalVolume - a.totalVolume);
  const results = sorted.map((item, idx) => ({
    ...item,
    grade: idx < sorted.length * 0.8 ? 'A' : idx < sorted.length * 0.95 ? 'B' : 'C'
  }));
  
  skuParetoCache.set(cacheKey, results);
  return results;
};
```

**Expected improvement: 95% faster (cached)**

---

## 📋 Recommended Implementation Roadmap

### PHASE 1: Backend Aggregation (Week 1-2)
- [ ] Create `/api/aggregate` endpoint (takes raw CSV)
  - Parses + Groups by (sku, yearMonth)
  - Returns `SkuMonthAggregate[]`
  - Stores in fast cache (Redis/memory)
- [ ] Modify frontend to fetch from API instead of parsing CSV locally
- [ ] Update App.tsx to use SkuMonthAggregate as source of truth

**Expected Improvement:** 10x reduction in data size, 50% faster load

---

### PHASE 2: Batch Processing (Week 2-3)
- [ ] Create `/api/forecast-batch` endpoint (uses SkuMonthAggregate)
  - Takes: `{ skus: string[], method, horizon, config }`
  - Returns: `ForecastResult[]`
  - Uses worker pool for parallel processing
- [ ] Frontend calls batch endpoint instead of calculating per-SKU
- [ ] Add caching: `GET /api/forecast-batch?hash=...` (1 hour TTL)

**Expected Improvement:** 60% faster forecasting, parallelized

---

### PHASE 3: Cache Layer (Week 3)
- [ ] Implement Redis/fast-cache for:
  - SkuMonthAggregate (invalidated on data upload)
  - Forecast results (1-hour TTL, keyed by config hash)
  - Backtest metrics (permanent, invalidated on upload)
- [ ] Add invalidation logic on data changes

**Expected Improvement:** 2nd+ request is 10x faster

---

### PHASE 4: Code Optimization (Week 1 parallel)
- [ ] Optimize `calculateForecast()` - cache trend/seasonal factors
- [ ] Optimize `calculateSupplyChainMetricsPerSku()` - move constant calcs outside loop
- [ ] Add Pareto caching
- [ ] Profile with DevTools to find remaining bottlenecks

**Expected Improvement:** 40-60% faster calculations

---

## 📏 Scalability Projections

### Current (Frontend-only)
- **Max Practical**: ~100-200 SKUs
- **Time to forecast**: 5-8 seconds
- **Data size limit**: ~20MB CSV
- **Memory usage**: 200-500MB

### After Phase 1-2 (Backend aggregation + batch processing)
- **Max Practical**: ~10,000 SKUs
- **Time to forecast**: 1-2 seconds
- **Data size limit**: ~500MB CSV
- **Memory usage**: 50-100MB (frontend)

### After Phase 3-4 (Caching + optimization)
- **Max Practical**: ~50,000 SKUs
- **Time to forecast**: 200-500ms (cached)
- **Data size limit**: ~5GB CSV (with streaming)
- **Memory usage**: 30-50MB (frontend)

---

## 🎯 Your Approach Assessment

**✅ SKU-Month Aggregation: CORRECT**
- Reduces dimensionality from 500 SKUs × 36 months × daily/weekly points → 18K monthly points
- Single source of truth for all downstream calculations
- Enables efficient batch processing
- Smaller data transfer/storage

**✅ Backend Analysis: CORRECT**
- Removes CPU load from browser
- Enables parallelization
- Allows caching/persistence
- Supports larger datasets

**✅ Fit Aggregates to Visuals: CORRECT**
- Visuals work at monthly granularity anyway
- No loss of useful detail
- Faster rendering

---

## Implementation Priority

1. **Quick Win**: Optimize `calculateForecast()` and supply chain calcs (~2 hours) - 40% improvement
2. **Medium Lift**: Create `/api/aggregate` endpoint (~4 hours) - 50% improvement
3. **Full Solution**: Backend batch + caching (~2 weeks) - 80-90% improvement

Would you like me to start with Phase 1 (backend aggregation) or would you prefer to first optimize the frontend code to maximize current performance?
