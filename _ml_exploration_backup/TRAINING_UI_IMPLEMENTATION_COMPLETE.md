# Training UI Quick Start Guide

## 🎯 What You Can Do Now

The Training UI is **live and ready to use**. It's integrated as a new tab in your app.

## 📍 Where It Is

1. Open http://localhost:3001 in your browser
2. Click the **"Model Training"** tab at the top
3. You'll see the training workflow interface

## 🚀 What It Does (Step by Step)

### Step 1: Upload CSV
- Click the file upload area
- Select a CSV file with date, SKU, and quantity columns
- File is validated before proceeding

### Step 2: Aggregate Data
- Click "Next: Aggregate Data"
- Backend converts raw transaction data to monthly summaries
- Progress bar shows completion (typically 1-3 seconds)
- Shows:
  - Total SKUs found
  - Aggregated records count
  - Compression ratio (how much smaller the data got)

### Step 3: Select SKUs
- See all SKUs from your CSV displayed
- By default, first 5 SKUs are pre-selected
- Use "All" / "None" buttons to select/deselect quickly
- Or click individual checkboxes

### Step 4: Analyze SKUs (Optional)
- Click "📊 Analyze Selected SKUs"
- Modal shows detailed analysis:
  - **Volatility** (0-1): How unpredictable demand is
  - **Seasonality** (0-1): How seasonal the pattern is
  - **Trend** (-1 to 1): Whether demand is growing or shrinking
  - **Sparsity** (0-1): How many missing values
  - **Adaptive Weights**: Shows which forecasting methods work best
    - 🤖 XGBoost - Machine learning ensemble
    - 📊 Holt-Winters - Statistical seasonal method
    - 🔮 Prophet - Facebook's growth model
    - 📈 ARIMA - Classical time series
    - 📐 Linear - Simple trend-based
- Switch between SKUs using tabs

### Step 5: Train Model
- Click "Next: Train Model"
- Backend builds a machine learning model (100 decision trees)
- Progress bar shows training progress
- Takes 10-30 seconds depending on data size
- When complete, shows:
  - **Model Accuracy** (%)
  - **MAPE** (Mean Absolute Percentage Error)
  - **Training Duration** (seconds)
  - **Training Samples** (number of data points used)

### Step 6: Done!
- Click "Train Another Model" to upload new data
- Or go to "Future" tab to see forecasts using the trained model

---

## 🛠️ Technical Details (For Reference)

**Backend Service Layer**: `services/trainingService.ts`
- Wraps all API calls to port 3000
- Error handling with meaningful messages
- Retry logic for network resilience
- Polling for long-running operations

**React Components**:
- `TrainingPanel.tsx` - Main workflow UI (420 lines)
- `SkuAnalysisModal.tsx` - Detailed analysis popup (280 lines)

**Integration**:
- App.tsx has new "training" tab
- All 5 backend endpoints connected
- TypeScript strict mode compatible

---

## ⚡ Requirements

**Running Services:**
- ✅ Backend: http://localhost:3000 (port 3000)
- ✅ Frontend: http://localhost:3001 (port 3001)

Both should be running. If you see "❌ Backend: Disconnected" in the app:
1. Open terminal in project root
2. Run: `npx tsx backend/src/server.ts`
3. Keep terminal open

---

## 💡 Tips

### CSV Format
Your CSV should have columns like:
- Date (any format: YYYY-MM-DD, MM/DD/YYYY, MM-DD-YYYY)
- SKU or Product (the product identifier)
- Quantity or Sales (the numeric value)

Example:
```
Date,Product,Quantity
2023-01-15,SKU-001,100
2023-01-20,SKU-001,120
2023-02-10,SKU-002,450
```

### Sample Data
Use `Big Tex Historical Sales.csv` from your workspace - it's already formatted correctly!

### Analysis Notes
- **High Volatility** (>0.7): XGBoost gets more weight (better for chaotic data)
- **High Seasonality** (>0.6): Holt-Winters gets more weight (captures repeating patterns)
- **Strong Trend** (|trend| > 0.08): Prophet gets more weight (good for growth products)
- **Sparse Data** (>50% missing): Linear gets more weight (simpler is better)

### Training Time
- Small data (< 1000 rows aggregated): 5-10 seconds
- Medium data (1000-10k rows): 10-20 seconds
- Large data (10k+ rows): 20-30 seconds

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| "❌ Backend: Disconnected" | Run `npx tsx backend/src/server.ts` in backend folder |
| "CSV file rejected" | Make sure file ends in `.csv` |
| Aggregation fails | CSV might be malformed. Check date and number columns |
| Training doesn't start | Make sure you selected at least one SKU |
| Progress bar stuck | Reload page. If still stuck, backend may have crashed |

---

## 🎓 What Happens Behind the Scenes

1. **CSV Upload**: File loaded into browser memory
2. **Aggregation**: Backend groups raw transactions into monthly summaries (27x compression)
3. **SKU Analysis**: Backend analyzes each SKU's characteristics:
   - Calculates volatility from historical variance
   - Detects seasonality using Fourier analysis
   - Measures trend using linear regression
   - Counts sparse/missing values
4. **Weight Calculation**: Adaptive weighting system adjusts ensemble method weights based on characteristics
5. **Training**: Gradient boosting algorithm:
   - Builds 100 decision trees iteratively
   - Each tree corrects previous predictions
   - Calculates MAPE (accuracy metric)
   - Saves model to `backend/models/xgboost-model.json`
6. **Ready**: Model now used in forecasts

---

## ✨ Next Steps

Once trained:
- Go to "Future" tab to see forecasts
- Forecasts now use the trained XGBoost model (if available)
- Model weights adjusted per-SKU based on characteristics
- Fallback to statistical methods if model not yet trained

**Status**: Phase 1-3 complete, running live. Ready for Phase 4 testing! 🚀
