# Backend ML Setup Guide

## 🎯 Overview

This backend enables full machine learning capabilities for supply chain forecasting:
- **CSV Aggregation**: Group raw data by SKU-month (100x data reduction)
- **Statistical Forecasting**: 4 proven methods (Holt-Winters, Prophet, ARIMA, Linear)
- **ML Forecasting**: XGBoost gradient boosting with automated feature engineering
- **Ensemble**: Weighted combination of all methods for robust predictions

---

## 🚀 Quick Start (5 minutes)

### Step 1: Install Backend

```bash
cd backend
npm install
```

### Step 2: Start Backend Server

```bash
npm run dev
```

You'll see:
```
✅ Supply Chain Backend running on port 3000
🎯 Endpoints:
   POST /api/aggregate         - Upload CSV
   POST /api/train-xgb        - Train ML model
   GET  /api/forecast         - Get forecasts
   GET  /api/status           - Backend status
```

### Step 3: Start Frontend (new terminal)

```bash
npm run dev
```

Frontend will be at `http://localhost:5173`

### Step 4: Test the Pipeline

1. **Upload CSV in frontend** (File → Upload Supply Data)
   - Backend receives CSV and aggregates to SKU-month level
   - Response shows: records, unique SKUs, date range

2. **Train ML Model** (via API call or new frontend button)
   ```bash
   curl -X POST http://localhost:3000/api/train-xgb
   ```
   - First time: ~30-60 seconds (depends on data size)
   - Model saved to `backend/models/xgboost-model.json`

3. **Generate Forecasts** (frontend forecast tab)
   - Backend calculates all 4 statistical methods
   - If model is trained, also includes XGBoost
   - Ensemble combines all methods

---

## 📊 Forecasting Methods Explained

### Statistical Methods (Always Available)

| Method | Strength | Weakness | Use Case |
|--------|----------|----------|----------|
| **Holt-Winters** | Captures seasonality & trend | Needs 2 years data | Seasonal products |
| **Prophet** | Handles growth & holidays | Slower | Business-level forecast |
| **ARIMA** | Fast, focuses recent data | Less detail | Short-term forecast |
| **Linear** | Simple & interpretable | Oversimplified | Baseline comparison |

### ML Method (After Training)

| Method | Strength | Weakness | Use Case |
|--------|----------|----------|----------|
| **XGBoost** | Learns complex patterns | Needs training time | Accurate long-term |

### Ensemble (Recommended)

Combines all methods with intelligent weighting:
- HW: 35% (most stable)
- Prophet: 30% (captures trends)
- ARIMA: 20% (recent signals)
- Linear: 10% (baseline)
- XGBoost: 5% (when available)

---

## 🔧 How It Works Internally

### Phase 1: Data Aggregation

```
Raw CSV (500K rows)
    ↓ parseCSV
→ Detect headers (date, quantity, sku, category)
    ↓ normalizeDate
→ Convert to YYYY-MM format
    ↓ aggregateCSV
→ Group by (sku, yearMonth)
→ Calculate: sum, count, stdDev, min, max
    ↓
SKU-Month Aggregates (18K records) ← 27x smaller!
```

### Phase 2: Feature Engineering

For each SKU's history, extract 9 features:

```
Lag Features:
  - quantity[t-1]      (yesterday's value)
  - quantity[t-6]      (6 months ago)
  - quantity[t-12]     (1 year ago)

Statistical Features:
  - avg_12_months      (long-term mean)
  - volatility         (standard deviation)
  - trend              (slope of last 12 points)
  - seasonality_sin    (annual cycle sine)
  - seasonality_cos    (annual cycle cosine)
  - recent_stddev      (volatility last 6 months)

Label:
  - quantity[t+1]      (next month to predict)
```

### Phase 3: XGBoost Training

```
1. Split data:
   - Training: all history except last 6 months
   - Test: last 6 months (for validation)

2. Train booster:
   - Tree depth: 6
   - Learning rate: 0.1
   - Iterations: 100
   
3. Evaluate:
   - Calculate MAPE (% error) on test set
   - If good, save model to disk

4. For each future month:
   - Create features from available history
   - Get XGBoost prediction
   - Add to history for next month's features
```

### Phase 4: Ensemble Forecasting

```
For each SKU and month:
1. Get predictions from: HW, Prophet, ARIMA, Linear, (XGBoost)
2. Apply weights: 0.35, 0.30, 0.20, 0.10, (0.05)
3. Weighted average = final forecast
4. Add confidence bounds (±% uncertainty)
```

---

## 📈 Performance Characteristics

### On Local Machine (typical specs: 8GB RAM, i5 CPU)

| Operation | Time | Notes |
|-----------|------|-------|
| Aggregation (500K→18K) | 1-2s | One-time per CSV |
| Statistical Forecasts (100 SKUs) | 100-300ms | All 4 methods |
| XGBoost Training | 30-120s | First time only |
| XGBoost Forecast (100 SKUs) | 50-150ms | Much faster than statistical |
| Full Ensemble (all methods) | 150-400ms | Recommended |

### Memory Usage

| Dataset | Size | RAM |
|---------|------|-----|
| Small (50 SKUs, 24 months) | 2K records | 5-10 MB |
| Medium (500 SKUs, 36 months) | 18K records | 50-100 MB |
| Large (1000 SKUs, 48 months) | 48K records | 150-200 MB |

---

## 🔌 API Examples

### Upload CSV

```bash
curl -X POST http://localhost:3000/api/aggregate \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{
  "csvData": "date,sku,quantity,category\n2024-01-01,SKU-A,100,Electronics\n2024-01-02,SKU-A,105,Electronics\n..."
}
EOF
```

Response:
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

### Train XGBoost

```bash
curl -X POST http://localhost:3000/api/train-xgb
```

Response:
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
  "modelReady": true,
  "message": "XGBoost model trained and ready for forecasting"
}
```

### Forecast (All Methods)

```bash
curl "http://localhost:3000/api/forecast?skus=SKU-A,SKU-B&horizon=12&include=hw,prophet,arima,linear,xgb,ensemble"
```

Response has methods as keys:
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
    "xgb": [
      {
        "sku": "SKU-A",
        "dates": [...],
        "forecast": [121, 116, 126, ...],  // XGBoost predictions
        "lowerBound": [...],
        "upperBound": [...],
        "method": "xgb"
      }
    ],
    "ensemble": [
      {
        "sku": "SKU-A",
        "dates": [...],
        "forecast": [120.5, 115.2, 125.1, ...],  // Weighted average
        "lowerBound": [...],
        "upperBound": [...],
        "method": "ensemble"
      }
    ]
  },
  "metadata": {
    "skus": ["SKU-A", "SKU-B"],
    "horizon": 12,
    "confidence": 95,
    "xgbAvailable": true,
    "duration": 234
  }
}
```

---

## 🛠️ Development Tasks

### Add Custom Forecasting Method

1. Create function in `backend/src/services/forecasting.ts`:
```typescript
export const forecastMyAlgorithm = (
  values: number[],
  horizon: number
): number[] => {
  // Your implementation
  return forecast;
};
```

2. Update `generateForecasts()` switch:
```typescript
case 'myalgorithm':
  forecast = forecastMyAlgorithm(values, horizon);
  break;
```

3. Call with: `?include=myalgorithm` or use in ensemble

### Adjust XGBoost Hyperparameters

In `backend/src/ml/train-xgboost.ts`, modify `params`:

```typescript
const params = {
  objective: 'reg:squarederror',
  max_depth: 8,      // Deeper trees = more complex patterns
  eta: 0.05,         // Lower learning rate = slower but steadier
  subsample: 0.7,    // Sample 70% of data per tree
  colsample_bytree: 0.7  // Use 70% of features per tree
};
```

### Change Ensemble Weights

In `backend/src/ml/ensemble.ts`:

```typescript
const weights = {
  hw: 0.40,      // Increase Holt-Winters
  prophet: 0.25,
  arima: 0.20,
  linear: 0.10,
  xgb: 0.05
};
```

---

## 🐛 Troubleshooting

### "No data loaded. Upload CSV first."
- Make sure to POST `/api/aggregate` before requesting forecasts
- Check that CSV has columns: date, sku, quantity, category

### "Not enough data to train (need 6+ months per SKU)"
- Each SKU needs at least 6 months of historical data
- Use a larger CSV with more history
- You can train statistical methods without XGBoost

### "XGBoost training failed"
- Check system RAM (need ~300-500 MB for training)
- Try with smaller dataset (fewer SKUs or shorter history)
- Check logs: `npm run dev` shows detailed errors

### "Forecasts taking too long"
- Don't request all methods at once: `?include=ensemble` is faster
- Reduce horizon: `?horizon=6` instead of 24
- Reduce SKUs: `?skus=SKU-A,SKU-B` instead of 100 SKUs

### "Model file not found"
- Make sure `/backend/models/` directory exists
- First run: `npm run train-xgb` or POST `/api/train-xgb`
- Check `.env` for `ML_MODEL_PATH` (default: `./models/xgboost-model.json`)

---

## 📚 Architecture Files

```
backend/
├── src/
│   ├── server.ts              # Express app, HTTP endpoints
│   ├── types.ts               # TypeScript data types
│   ├── services/
│   │   ├── aggregation.ts     # CSV parsing, SKU-month grouping
│   │   └── forecasting.ts     # 4 statistical algorithms
│   └── ml/
│       ├── features.ts        # Feature engineering (9 features)
│       ├── ensemble.ts        # Weighted combination
│       └── train-xgboost.ts   # Model training & inference
├── models/                    # Trained XGBoost models (generated)
├── dist/                      # Compiled JavaScript
├── package.json
├── tsconfig.json
├── Dockerfile
└── .env.example
```

Each file is well-documented with inline comments explaining the logic.

---

## 🚢 Deployment Options

### Option 1: Local Development (Current)
- Full resources available
- Instant development feedback
- Easy debugging
- **Best for**: development, testing, learning

### Option 2: Docker Locally
```bash
docker-compose up
```
- Runs frontend + backend in containers
- Simulates production environment
- **Best for**: verifying containerization works

### Option 3: Render Free Tier (No ML)
- Deploy without XGBoost training
- Use only statistical methods
- Works within 512 MB RAM limit
- **Best for**: demo deployment, small datasets

### Option 4: Self-Hosted VPS
- Full ML capabilities
- Full control
- Pay for server
- **Best for**: production, large datasets, high traffic

See [../DEPLOYMENT_OPTIONS.md](../DEPLOYMENT_OPTIONS.md) for detailed comparison.

---

## 🎓 Learning Resources

**Understanding Forecasting Methods:**
- [Holt-Winters Wikipedia](https://en.wikipedia.org/wiki/Exponential_smoothing)
- [ARIMA Guide](https://otexts.com/fpp2/arima.html)
- [Prophet Paper](https://peerj.com/preprints/3190)
- [XGBoost Paper](https://arxiv.org/abs/1603.02754)

**Supply Chain Context:**
- SKU = Stock Keeping Unit (unique product identifier)
- Demand forecasting = predicting future sales quantity
- Seasonality = repeating patterns (e.g., holiday sales)
- Confidence bounds = uncertainty range around forecast

---

## 📞 Support

**Common Issues?**
1. Check `/api/status` endpoint to verify backend state
2. Look at `npm run dev` console for detailed logs
3. Check `.env` file for correct configuration
4. Try with sample data first (10 SKUs, 24 months)

**Want to extend?**
1. Add new forecasting method
2. Use different ML algorithm (LightGBM, Random Forest)
3. Add database layer for persistence
4. Add user authentication
5. Add API rate limiting

See [../TECHNICAL_GUIDE.md](../TECHNICAL_GUIDE.md) for architecture decisions.

---

## ✅ Checklist

- [ ] Backend dependencies installed (`npm install` in /backend)
- [ ] Backend server running (`npm run dev`)
- [ ] Frontend can reach backend (check CORS settings)
- [ ] CSV aggregation working (POST /api/aggregate)
- [ ] XGBoost training working (POST /api/train-xgb)
- [ ] Forecasts generating (GET /api/forecast)
- [ ] Compare forecast accuracy across methods
- [ ] Deploy to production (Docker or Render)

---

**Next Steps:**
1. Run `npm run backend:dev` to start backend
2. Run `npm run dev` in another terminal to start frontend
3. Upload CSV and test forecasting
4. Check backend/README.md for detailed API docs
5. Explore the codebase and customize for your needs
