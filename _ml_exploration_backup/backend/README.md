# Backend Setup

## Quick Start (Local)

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Build TypeScript

```bash
npm run build
```

### 3. Run Server

```bash
npm run dev
```

Server will start on `http://localhost:3000`

---

## API Endpoints

### POST /api/aggregate
Upload CSV data and aggregate to SKU-month level

**Request:**
```json
{
  "csvData": "date,sku,quantity,category\n2024-01-01,SKU-A,100,Electronics\n..."
}
```

**Response:**
```json
{
  "status": "success",
  "records": 18000,
  "uniqueSkus": 500,
  "dateRange": {
    "start": "2022-01-01",
    "end": "2024-12-31"
  },
  "message": "Data aggregated. Run /api/train-xgb to train ML model."
}
```

---

### POST /api/train-xgb
Train XGBoost model on loaded data (requires /api/aggregate first)

**Request:**
```bash
curl -X POST http://localhost:3000/api/train-xgb
```

**Response:**
```json
{
  "status": "success",
  "training": {
    "success": true,
    "mape": 12.5,
    "duration": 45000,
    "trainingSamples": 2400,
    "testSamples": 300
  },
  "modelReady": true
}
```

---

### GET /api/forecast
Generate forecasts using statistical and ML methods

**Query Parameters:**
- `skus` (required): Comma-separated SKU list (e.g., `SKU-A,SKU-B`)
- `horizon` (optional): Forecast months ahead (1-36, default: 12)
- `confidence` (optional): Confidence level (80-99, default: 95)
- `include` (optional): Which methods to use (default: `hw,prophet,arima,linear`)

**Example:**
```bash
curl "http://localhost:3000/api/forecast?skus=SKU-A,SKU-B&horizon=12&include=hw,prophet,arima,linear,xgb,ensemble"
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "hw": [
      {
        "sku": "SKU-A",
        "dates": ["2025-01-01", "2025-02-01", ...],
        "forecast": [120, 115, 125, ...],
        "lowerBound": [100, 95, 105, ...],
        "upperBound": [140, 135, 145, ...],
        "method": "hw"
      }
    ],
    "prophet": [...],
    "arima": [...],
    "linear": [...],
    "xgb": [...],
    "ensemble": [...]
  },
  "metadata": {
    "skus": ["SKU-A", "SKU-B"],
    "horizon": 12,
    "confidence": 95,
    "timestamp": "2025-01-22T...",
    "duration": 234,
    "xgbAvailable": true
  }
}
```

---

### GET /api/status
Get backend status

**Response:**
```json
{
  "status": "ok",
  "dataLoaded": true,
  "dataCount": 18000,
  "uniqueSkus": 500,
  "xgbModel": {
    "trained": true,
    "training": false,
    "path": "./models/xgboost-model.json"
  },
  "uptime": 3456
}
```

---

### GET /health
Simple health check

**Response:**
```json
{
  "status": "ok",
  "uptime": 3456,
  "hasData": true,
  "xgbReady": true,
  "xgbTraining": false
}
```

---

## Forecasting Methods

### Statistical Methods (4)
- **HW** (Holt-Winters): Multiplicative seasonality, good for stable patterns
- **Prophet**: Additive trend + seasonality, handles growth well
- **ARIMA**: Auto-regressive, focuses on recent data
- **Linear**: Simple trend extrapolation

### ML Method
- **XGBoost**: Gradient boosting on engineered features (lag-1, lag-6, lag-12, seasonality, trend, volatility)
- Requires training via `POST /api/train-xgb` after uploading data
- ~5ms per SKU (faster than statistical methods)

### Ensemble
- Weighted average of all requested methods
- Default weights: HW (35%), Prophet (30%), ARIMA (20%), Linear (10%), XGB (5%)

---

## Performance Notes

**On Local Machine:**
- Aggregation: 1-2 seconds for 500K data points
- XGBoost Training: 30-120 seconds (one-time, depends on data size)
- Statistical Forecasts: 100-500ms for 100 SKUs
- XGBoost Forecasts: 50-200ms for 100 SKUs

**Memory Usage:**
- 500 SKUs, 36 months: ~50-100 MB
- Full system available (no Render constraints)

---

## Development

### File Structure

```
backend/
├── src/
│   ├── server.ts              # Main Express app
│   ├── types.ts               # TypeScript interfaces
│   ├── services/
│   │   ├── aggregation.ts     # CSV parsing & aggregation
│   │   └── forecasting.ts     # Statistical forecasting (4 methods)
│   └── ml/
│       ├── features.ts        # Feature engineering
│       ├── ensemble.ts        # Ensemble forecasting
│       └── train-xgboost.ts   # XGBoost training & inference
├── dist/                      # Compiled JavaScript
├── package.json
├── tsconfig.json
├── Dockerfile
└── .env.example
```

### Adding a New Forecasting Method

1. Add function in `src/services/forecasting.ts`:
```typescript
export const forecastMyMethod = (values: number[], horizon: number): number[] => {
  // Your logic
  return forecast;
};
```

2. Add to `generateForecasts()` switch statement:
```typescript
case 'mymethod':
  forecast = forecastMyMethod(values, horizon);
  break;
```

3. Call in `/api/forecast` endpoint with `include=mymethod`

---

## Docker

Build and run locally:

```bash
docker build -t supply-chain-backend .
docker run -p 3000:3000 -e FRONTEND_URL=http://localhost:5173 supply-chain-backend
```

Or with docker-compose (includes frontend):

```bash
docker-compose up
```

Then visit `http://localhost:5173`

---

## Troubleshooting

**"No data loaded"**
- POST to `/api/aggregate` first with valid CSV

**"XGBoost training failed"**
- Need at least 6+ months historical data per SKU
- Check `/api/status` to see dataCount and uniqueSkus

**"Forecasts taking too long"**
- Don't request too many methods at once
- Reduce horizon (1-12 months is fast)
- Check system resources (RAM, CPU)

---

## Environment Variables

Create `.env` in backend folder:

```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
ML_MODEL_PATH=./models/xgboost-model.json
```

---

## Next Steps

1. ✅ Start backend: `npm run dev`
2. ✅ Upload CSV via frontend
3. ✅ Call `/api/train-xgb` to train ML model
4. ✅ Request forecasts with `?include=hw,prophet,arima,linear,xgb,ensemble`
5. Compare accuracy of methods in frontend

See [../SECURITY_EFFICIENCY_ML_ANALYSIS.md](../SECURITY_EFFICIENCY_ML_ANALYSIS.md) for architecture decisions.
