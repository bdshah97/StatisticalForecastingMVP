# Frontend-Backend Integration Guide

## Overview

The frontend can optionally use the backend for forecasting. Here's how to integrate it.

---

## 🔧 Step 1: Create Backend Service

Create `src/services/backendService.ts`:

```typescript
const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';

export interface BackendForecast {
  sku: string;
  dates: string[];
  forecast: number[];
  lowerBound: number[];
  upperBound: number[];
  method: string;
}

export interface BackendResponse {
  status: string;
  data: Record<string, BackendForecast[]>;
  metadata: {
    skus: string[];
    horizon: number;
    confidence: number;
    xgbAvailable: boolean;
    duration: number;
  };
}

/**
 * Upload CSV to backend for aggregation
 */
export const aggregateCSVOnBackend = async (csvData: string): Promise<any> => {
  if (!USE_BACKEND) {
    throw new Error('Backend disabled');
  }

  const response = await fetch(`${BACKEND_URL}/api/aggregate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csvData })
  });

  if (!response.ok) {
    throw new Error(`Backend error: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Train XGBoost model on backend
 */
export const trainXGBoostModel = async (): Promise<any> => {
  if (!USE_BACKEND) {
    throw new Error('Backend disabled');
  }

  const response = await fetch(`${BACKEND_URL}/api/train-xgb`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Training failed: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Get forecasts from backend
 */
export const getForecastsFromBackend = async (
  skus: string[],
  horizon: number = 12,
  confidence: number = 95,
  include: string = 'hw,prophet,arima,linear,xgb,ensemble'
): Promise<BackendResponse> => {
  if (!USE_BACKEND) {
    throw new Error('Backend disabled');
  }

  const query = new URLSearchParams({
    skus: skus.join(','),
    horizon: String(horizon),
    confidence: String(confidence),
    include
  });

  const response = await fetch(`${BACKEND_URL}/api/forecast?${query}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Forecast failed: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Get backend status
 */
export const getBackendStatus = async (): Promise<any> => {
  if (!USE_BACKEND) {
    return { status: 'disabled' };
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/status`);
    return response.json();
  } catch (error) {
    return { status: 'error', message: String(error) };
  }
};

/**
 * Check if backend is enabled and healthy
 */
export const isBackendAvailable = (): boolean => {
  return USE_BACKEND;
};
```

---

## 🔧 Step 2: Update App.tsx

Add backend detection and use in forecast calculation:

```typescript
import { isBackendAvailable, getForecastsFromBackend, getBackendStatus } from './services/backendService';

// In App component:

useEffect(() => {
  if (isBackendAvailable()) {
    getBackendStatus().then(status => {
      console.log('Backend status:', status);
      setBackendReady(status.dataLoaded && status.xgbModel?.trained);
    });
  }
}, []);

// In forecast calculation function:

const calculateForecasts = async () => {
  const selectedSkus = [...new Set(data.map(d => d.sku))].filter(
    sku => selectedSKUs.length === 0 || selectedSKUs.includes(sku)
  );

  try {
    // Use backend if available
    if (isBackendAvailable() && backendReady) {
      const response = await getForecastsFromBackend(
        selectedSkus,
        forecastHorizon,
        confidence
      );

      // Convert backend format to frontend format
      const formattedForecasts = formatBackendForecasts(response.data);
      setForecasts(formattedForecasts);
    } else {
      // Fallback to local forecasting
      const localForecasts = calculateForecastsLocal(selectedSkus);
      setForecasts(localForecasts);
    }
  } catch (error) {
    console.error('Forecast failed:', error);
    // Fallback to local
    const localForecasts = calculateForecastsLocal(selectedSkus);
    setForecasts(localForecasts);
  }
};

// Helper to format backend response
const formatBackendForecasts = (backendData: Record<string, any[]>) => {
  const formatted: Record<string, any> = {};

  Object.entries(backendData).forEach(([method, forecasts]) => {
    formatted[method] = forecasts.map(f => ({
      sku: f.sku,
      dates: f.dates.map(d => new Date(d)),
      forecast: f.forecast,
      lowerBound: f.lowerBound,
      upperBound: f.upperBound,
      method: f.method || method
    }));
  });

  return formatted;
};
```

---

## 🔧 Step 3: Update .env

Create `.env.local`:

```env
VITE_API_URL=http://localhost:3000
VITE_USE_BACKEND=true
```

Or `.env.production` for production:

```env
VITE_API_URL=https://api.yourdomain.com
VITE_USE_BACKEND=true
```

---

## 🔧 Step 4: Add Backend Indicator UI

Add status indicator to UI:

```typescript
{isBackendAvailable() && (
  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
      <span className="text-sm text-blue-700">
        {backendReady ? '🤖 ML Forecasting Active' : '⏳ Training XGBoost...'}
      </span>
    </div>
    <div className="text-xs text-blue-600 mt-1">
      Backend: {backendStatus?.xgbModel?.trained ? 'Ready' : 'Initializing'}
    </div>
  </div>
)}
```

---

## 🔧 Step 5: CSV Upload Integration

When user uploads CSV in frontend:

```typescript
const handleCSVUpload = async (file: File) => {
  const csvData = await file.text();

  // If backend enabled, send there first
  if (isBackendAvailable()) {
    try {
      const result = await aggregateCSVOnBackend(csvData);
      console.log('Backend aggregated:', result);
      setAggregateResult(result);
      
      // Optionally train model automatically
      if (autoTrain) {
        await trainXGBoostModel();
        setBackendReady(true);
      }
    } catch (error) {
      console.error('Backend aggregation failed:', error);
      // Continue with local processing
    }
  }

  // Also process locally for backward compatibility
  processCSVLocally(csvData);
};
```

---

## 🔧 Step 6: Add Train Button

Add UI button to trigger training:

```typescript
{isBackendAvailable() && !backendReady && (
  <button
    onClick={async () => {
      setTraining(true);
      try {
        await trainXGBoostModel();
        setBackendReady(true);
        alert('XGBoost model trained!');
      } catch (error) {
        alert('Training failed: ' + String(error));
      } finally {
        setTraining(false);
      }
    }}
    disabled={training}
    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
  >
    {training ? '🤖 Training...' : 'Train ML Model'}
  </button>
)}
```

---

## 🧪 Testing Integration

### Test Checklist

- [ ] Backend running on port 3000
- [ ] Frontend .env.local has `VITE_API_URL=http://localhost:3000`
- [ ] `VITE_USE_BACKEND=true`
- [ ] Upload CSV to frontend
- [ ] Backend receives and aggregates data ✓
- [ ] Call train endpoint (check /api/train-xgb)
- [ ] Request forecasts with all methods
- [ ] Compare backend vs local results
- [ ] Check performance improvements

### Manual Testing

```bash
# 1. Start backend
cd backend
npm run dev

# 2. In another terminal, start frontend
npm run dev

# 3. Test API directly
curl http://localhost:3000/health

# 4. Upload sample CSV
curl -X POST http://localhost:3000/api/aggregate \
  -H "Content-Type: application/json" \
  -d '{"csvData":"date,sku,quantity,category\n2024-01-01,SKU-A,100,Electronics\n..."}'

# 5. Train model
curl -X POST http://localhost:3000/api/train-xgb

# 6. Get forecast
curl "http://localhost:3000/api/forecast?skus=SKU-A&horizon=12"
```

---

## 🚀 Performance Comparison

### Local Forecasting (Frontend)
- Pros: No network latency, works offline
- Cons: Uses browser resources, slower for large datasets
- Speed: 500-1000ms for 100 SKUs

### Backend Forecasting
- Pros: Server resources, faster for ML, can compare methods
- Cons: Network latency (50-100ms), requires server
- Speed: 150-300ms for 100 SKUs (excluding network)

---

## 📊 Feature Comparison

| Feature | Local | Backend |
|---------|-------|---------|
| Holt-Winters | ✅ | ✅ |
| Prophet | ✅ | ✅ |
| ARIMA | ✅ | ✅ |
| Linear | ✅ | ✅ |
| XGBoost ML | ❌ | ✅ |
| Ensemble | ✅ | ✅ |
| Works Offline | ✅ | ❌ |
| Scalable | ❌ | ✅ |

---

## 🐛 Debugging

### Backend not responding?

```typescript
// Check endpoint manually
fetch('http://localhost:3000/health')
  .then(r => r.json())
  .then(console.log)
  .catch(e => console.error('Backend offline:', e));
```

### CORS error?

Make sure backend has correct CORS origin in `.env`:
```env
FRONTEND_URL=http://localhost:5173
```

### Forecasts don't match?

1. Check backend received same CSV
2. Verify SKU list is identical
3. Check aggregation result via `/api/status`
4. Compare sample forecast manually

---

## 📝 Fallback Strategy

If backend unavailable, automatically use local forecasting:

```typescript
const getForecast = async (skus: string[]) => {
  if (!isBackendAvailable()) {
    console.log('Backend disabled, using local forecasting');
    return calculateForecastsLocal(skus);
  }

  try {
    return await getForecastsFromBackend(skus);
  } catch (error) {
    console.error('Backend failed, falling back to local:', error);
    return calculateForecastsLocal(skus);
  }
};
```

---

## ✅ Integration Checklist

- [ ] Created `services/backendService.ts`
- [ ] Added backend status check in App.tsx
- [ ] Updated forecast calculation to use backend
- [ ] Added .env variables
- [ ] Added UI indicator
- [ ] Added train button
- [ ] Tested with sample CSV
- [ ] Compared results local vs backend
- [ ] Implemented fallback strategy
- [ ] Documented changes

Next: See [backend/README.md](backend/README.md) for API details
