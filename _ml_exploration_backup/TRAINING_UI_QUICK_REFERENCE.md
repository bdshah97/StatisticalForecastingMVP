# Frontend Training UI - Quick Reference

## 📋 One-Page Summary

### What: Frontend Training UI for ML Model
A new tab in the existing app that allows users to:
1. **Load data** (via existing CSV upload)
2. **Train model** (one click)
3. **Monitor progress** (live progress bar)
4. **View results** (MAPE score, statistics)
5. **Understand weights** (adaptive weighting explanation)
6. **Generate forecasts** (with trained ML model)

---

## 🔗 Connection Points

### How Frontend Connects to Backend

| Frontend | Backend | Purpose |
|----------|---------|---------|
| Upload CSV in app | `POST /api/aggregate` | Load data into backend memory |
| Click "Train Model" | `POST /api/train-xgb` | Trigger gradient boosting |
| Poll every 500ms | `GET /api/status` | Track training progress |
| View SKU analysis | `GET /api/sku-analysis` | Show adaptive weights |
| Generate forecast | `GET /api/forecast` | Use trained model (if ready) |

### Data Flow
```
CSV Upload
    ↓
Local aggregation (for display) + Send to backend /api/aggregate
    ↓
User clicks "Train Model"
    ↓
POST /api/train-xgb starts training
    ↓
Frontend polls /api/status every 500ms
    ├─ Updates progress bar (0% → 100%)
    └─ Updates phase label ("Training..." → "Complete")
    ↓
Training completes on backend
    ↓
Frontend fetches results, displays MAPE & statistics
    ↓
Future forecasts automatically use trained model
```

---

## 🎯 New Components to Build

### 1. **TrainingPanel.tsx** (main component)
```
├─ Header: Title + Status Badge + Timestamp
├─ Data Status: Shows data loaded, sample count, SKU count
├─ Train Button: "TRAIN MODEL" (or "TRAINING..." during progress)
├─ Progress Bar: Animated bar with percentage & time estimate
├─ Results Card: MAPE, duration, sample stats (shown when complete)
└─ Error Message: If training fails (shown on error)
```

### 2. **SkuAnalysisModal.tsx** (modal for weight details)
```
├─ For each SKU:
│  ├─ Characteristics (volatility, seasonality, trend, sparsity)
│  ├─ Adaptive Weights (% for each of 5 methods)
│  └─ Explanation (why weights were adjusted)
└─ Close button
```

### 3. **trainingService.ts** (API calls)
```
├─ getStatus() → Check if training in progress
├─ aggregateData(csv) → Send CSV to backend
├─ trainModel() → Trigger training
├─ getSkuAnalysis(skus) → Get weight breakdown
└─ generateForecast(params) → Generate forecast (with/without model)
```

### 4. **App.tsx** (modifications)
```
├─ Add trainingState to main state
├─ Add new tab: "Model Training"
├─ Add handlers: handleTrainModel(), handleRetry()
├─ Add useEffect: Poll /api/status during training
└─ Enhance forecast: Include 'xgb' in methods if model ready
```

---

## 📊 Architecture Overview

```
EXISTING FRONTEND          NEW TRAINING TAB
──────────────────        ──────────────────
Dashboard Tab       
Detailed Forecast         TrainingPanel
Quality Tab         +     ├─ Status display
Insights Tab              ├─ Train button
                          ├─ Progress bar
                          ├─ Results display
                          └─ SKU analysis modal

                    ↓
                    
         BACKEND (Port 3000)
         ──────────────────
         POST /api/aggregate
         POST /api/train-xgb
         GET /api/status
         GET /api/sku-analysis
         GET /api/forecast (enhanced)

                    ↓
                    
         DISK STORAGE
         ──────────────────
         ./models/xgboost-model.json
         (100 decision trees, ~50-100 KB)
```

---

## 🔄 Key State Variable

### trainingState (New)
```typescript
{
  isTraining: boolean;           // Currently training?
  progress: number;              // 0-100%
  startTime: number | null;      // When started
  estimatedTimeRemaining: number; // Seconds left
  currentPhase: string;          // 'idle' | 'training' | 'complete' | 'error'
  error: string | null;          // Error message
  result: {                      // When complete
    mape: number;                // 18.5
    trainingSamples: number;     // 1000
    testSamples: number;         // 247
    method: string;              // 'gradient-boosting'
    modelReady: boolean;         // Can use in forecasts?
    duration: number;            // 2347 ms
  } | null;
  modelLastTrained: string | null; // ISO timestamp
}
```

---

## 🚀 Implementation Roadmap

### Phase 1: Service Layer (1-1.5 hours)
- [ ] Create `services/trainingService.ts`
- [ ] Implement 5 API functions
- [ ] Add error handling & retries

### Phase 2: Components (2-2.5 hours)
- [ ] Create `components/TrainingPanel.tsx`
- [ ] Create `components/SkuAnalysisModal.tsx`
- [ ] Style with Tailwind (consistent with existing design)

### Phase 3: Integration (1.5-2 hours)
- [ ] Add `trainingState` to App.tsx
- [ ] Add new tab to navigation
- [ ] Add handlers & polling logic
- [ ] Enhance forecast endpoint call

### Phase 4: Testing & Polish (1 hour)
- [ ] Test with Big Tex CSV
- [ ] Test error scenarios
- [ ] UI refinements
- [ ] Performance check

**Total: ~6-7 hours** (Milestone 2 estimate)

---

## ✨ How Training Enhances Forecasting

### Before (No Training)
```
Forecast = Average(HW, Prophet, ARIMA, Linear)
├─ Each method: 25% weight
└─ Accuracy: ~20-25% MAPE
```

### After (With Training)
```
Forecast = Weighted Average(HW, Prophet, ARIMA, Linear, XGBoost)
├─ HW: 35% (if seasonal detected)
├─ Prophet: 25% (if trend detected)
├─ XGBoost: 25% (ML method)
├─ ARIMA: 10% (correlation)
└─ Linear: 5% (structural drift)
Accuracy: ~15-20% MAPE (improved!)
```

**Key:** Weights automatically adjust per SKU based on its characteristics:
- Chaotic → boost XGBoost
- Seasonal → boost Holt-Winters
- Trending → boost Prophet
- etc.

---

## 🎨 UI Placement

### Option A: Dedicated Tab (RECOMMENDED)
```
Navigation: [Dashboard] [Detailed] [Quality] [Insights] [★ MODEL TRAINING ★]
                                                              ↑
                                        TrainingPanel component renders here
```

**Why:** 
- Clean separation of concerns
- Dedicated space for long-running operation
- Room for detailed results & analysis

---

## 🔌 Backend Endpoints Used

### 1. POST /api/aggregate
- **Input:** CSV data (as string)
- **Output:** Aggregated SKU-month data
- **Called:** When CSV uploaded

### 2. POST /api/train-xgb
- **Input:** None (uses pre-loaded data)
- **Output:** MAPE, duration, model status
- **Called:** When "Train Model" clicked
- **Duration:** ~2-5 seconds

### 3. GET /api/status
- **Input:** None
- **Output:** { xgbTraining, hasData, ... }
- **Called:** Every 500ms during training
- **Purpose:** Track progress

### 4. GET /api/sku-analysis?skus=10CH,20CH
- **Input:** Comma-separated SKU list
- **Output:** Characteristics & weights per SKU
- **Called:** When user clicks "View SKU Analysis"

### 5. GET /api/forecast (enhanced)
- **Input:** Standard params (skus, horizon, etc)
- **Output:** Weighted ensemble forecast
- **Enhancement:** Includes 'xgb' if model ready

---

## 🧪 Testing Checklist

- [ ] Component renders without errors
- [ ] "Train Model" button works with live progress
- [ ] Progress bar updates every 500ms (smooth animation)
- [ ] Results display when complete
- [ ] MAPE score shows (e.g., "18.5%")
- [ ] Error handling works (no data, timeout, backend error)
- [ ] SKU analysis modal displays weights
- [ ] Forecast generation includes XGBoost when model ready
- [ ] No console errors
- [ ] Mobile responsive (if needed)

---

## 🎯 Success Criteria

✅ **Milestone 2 Complete When:**
1. TrainingPanel component visible in new tab
2. CSV upload connects to backend aggregation
3. "Train Model" button works
4. Progress bar animates (0% → 100%)
5. Results show MAPE & stats
6. SKU analysis modal works
7. Error handling covers edge cases
8. Next forecast uses trained model automatically
9. No console errors or warnings

---

## 📚 Documentation Files

1. **TRAINING_UI_INTEGRATION_PLAN.md** - Detailed technical plan (13 sections)
2. **TRAINING_UI_ARCHITECTURE.md** - Visual diagrams & architecture (13 sections)
3. **TRAINING_UI_QUICK_REFERENCE.md** - This file (overview)

---

## 💡 Key Design Decisions

| Decision | Why |
|----------|-----|
| Dedicated tab (not inline widget) | Better UX for monitoring long-running process |
| 500ms polling (not WebSocket) | Simpler, works well for ~2sec training |
| JSON model serialization (not binary) | Easier debugging, human-readable |
| Adaptive weighting in backend | Automatic, no extra frontend logic |
| One-click training (no parameters) | Simpler UX, reasonable defaults |

---

## 🔐 Error Handling

| Error | User Message | Recovery |
|-------|--------------|----------|
| No data loaded | "Upload CSV first" | Show upload dialog |
| Insufficient data | "Need 6+ months per SKU" | Guide data requirements |
| Training timeout | "Training exceeded 5 min" | Retry button |
| Backend error | Actual error message | Retry button |
| Network error | "Connection failed" | Retry button |

---

## 📞 Support & Questions

**What if backend is down?**
→ Error message shown, retry button available

**What if model takes >2 min?**
→ Still works, progress bar continues until complete

**What if user closes browser during training?**
→ Training continues on backend, frontend can check status on reload

**What if multiple users train simultaneously?**
→ Backend allows one training at a time (isTraining flag prevents simultaneous)

---

## Next Steps

When ready to implement:
1. Review `TRAINING_UI_INTEGRATION_PLAN.md` (detailed plan)
2. Review `TRAINING_UI_ARCHITECTURE.md` (visual architecture)
3. Start Phase 1: Create `services/trainingService.ts`
4. Proceed through phases sequentially
5. Test at each phase completion

**Estimated time: 6-7 hours total**
