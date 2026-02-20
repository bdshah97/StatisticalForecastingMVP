# Frontend Training UI - Visual Architecture Guide

## 📊 System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE (React)                        │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                     Navigation Bar                             │  │
│  │  [Dashboard] [Detailed] [Quality] [Insights] [★ TRAINING ★]   │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    TrainingPanel Component                     │  │
│  │                                                                │  │
│  │  Status: Data Loaded (1,247 samples) ✓                       │  │
│  │  [====== TRAIN MODEL ======]                                 │  │
│  │                                                                │  │
│  │  ┌─ Progress Section ────────────────────────────────────┐   │  │
│  │  │ Phase: Training...                                  │   │  │
│  │  │ [████████████░░░░░░░░░░] 60%                        │   │  │
│  │  │ Time: 1m 23s elapsed | ~40s remaining              │   │  │
│  │  └────────────────────────────────────────────────────┘   │  │
│  │                                                                │  │
│  │  ┌─ Results Section (when complete) ─────────────────────┐  │  │
│  │  │ ✅ MAPE: 18.5%                                       │  │  │
│  │  │ ⏱️  Duration: 2.3 seconds                             │  │  │
│  │  │ 📊 Training: 1,000 samples | Test: 247 samples       │  │  │
│  │  │ 🤖 Method: Gradient Boosting (100 trees)             │  │  │
│  │  │ 📈 Model Ready: YES ✓                                │  │  │
│  │  │ [View SKU Analysis] [Download Report]                │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                         ┌────────┴─────────┐
                         │                  │
                    Backend API         LocalStorage
                    (Port 3000)         (State Cache)
```

---

## 🔄 Data Flow - Training Workflow

```
User CSV Upload
    │
    ├─ Frontend: parseDate() & aggregateCSVData()
    │  └─ Store in App state for display (setData)
    │
    └─ POST /api/aggregate (send to backend)
       │
       ├─ Backend: Parse CSV (handles MM-DD-YYYY)
       ├─ Backend: Group by SKU + YearMonth
       └─ Response: { skus, data, stats }
           │
           └─ setAggregationStats() + setTrainingState(error: null)

User clicks "Train Model"
    │
    ├─ Check: data.length > 0? (frontend validation)
    │
    └─ setTrainingState({
           isTraining: true,
           currentPhase: 'training',
           progress: 0,
           startTime: Date.now()
        })
       │
       └─ POST /api/train-xgb (no body, uses pre-loaded data)
          │
          ├─ Backend: Check isTraining flag
          ├─ Backend: Generate features for each SKU
          ├─ Backend: Build 100 decision trees (gradient boosting)
          ├─ Backend: Test on held-out data
          ├─ Backend: Save model to ./models/xgboost-model.json
          └─ Response: {
               status: 'success',
               training: { mape, trainingSamples, testSamples, duration },
               modelReady: true
             }

Frontend: Poll GET /api/status every 500ms
    │
    ├─ Update progress: (elapsed / estimatedDuration) * 100
    │
    ├─ Check: xgbTraining === false?
    │  └─ YES: Training complete!
    │
    └─ setTrainingState({
           isTraining: false,
           progress: 100,
           currentPhase: 'complete',
           result: { mape, duration, ... },
           modelLastTrained: ISO timestamp
        })

Display Results
    │
    ├─ Show: "✅ Model trained! MAPE: 18.5%"
    ├─ Show: Training duration (2.3 seconds)
    └─ Button: "View SKU Analysis" → Fetch weights breakdown

User requests forecast (ENHANCED)
    │
    ├─ Check: trainingState.result?.modelReady === true?
    │  ├─ YES: include='hw,prophet,arima,linear,xgb' (5 methods)
    │  └─ NO:  include='hw,prophet,arima,linear' (4 methods)
    │
    └─ GET /api/forecast?skus=10CH,20CH&include=...
       │
       ├─ Backend: Generate predictions from each method
       ├─ Backend: Get SKU characteristics (volatility, seasonality, etc)
       ├─ Backend: Calculate adaptive weights
       │   ├─ Chaotic data (volatility > 0.7) → XGBoost 40%
       │   ├─ Seasonal data (seasonality > 0.6) → HW 35%
       │   ├─ Trending data (trend > 0.08) → Prophet 30%
       │   └─ [other rules...]
       ├─ Backend: Apply weights: weighted_forecast = Σ(method_forecast * weight)
       └─ Response: [{ date, quantity, confidence, method_mix }, ...]

Display Forecast
    └─ Better accuracy due to ensemble + adaptive weighting!
```

---

## 🎨 Component Tree

```
App.tsx
│
├─ Navigation/Tabs
│  └─ [★ TRAINING TAB ★]  ← NEW
│
├─ [TrainingPanel]  ← NEW COMPONENT
│  │
│  ├─ HeaderSection
│  │  ├─ Title: "Gradient Boosting Model Training"
│  │  ├─ Status Badge: "Ready" | "Training..." | "Complete" | "Error"
│  │  └─ Timestamp: "Last trained: 2026-01-23 15:30:45 UTC"
│  │
│  ├─ DataStatusSection
│  │  ├─ "Data Loaded?" ✓ or ✗
│  │  ├─ Sample Count: "1,247 data points"
│  │  └─ SKU Count: "12 unique SKUs"
│  │
│  ├─ ActionButton
│  │  ├─ State: idle → "TRAIN MODEL" (green, large, clickable)
│  │  ├─ State: training → "TRAINING..." (gray, disabled)
│  │  └─ State: error → "RETRY" (orange, clickable)
│  │
│  ├─ ProgressBarSection (visible when training)
│  │  ├─ Phase Label: "Aggregating data..." → "Training..." → "Saving..."
│  │  ├─ Progress Bar: ████████░░░░░░░░ 60%
│  │  ├─ Time: "Elapsed: 1m 23s | Remaining: ~40s"
│  │  └─ Live Update: every 500ms
│  │
│  ├─ ResultsSection (visible when complete)
│  │  ├─ Status Icon: ✅
│  │  ├─ MAPE Score: "18.5%" + interpretation
│  │  ├─ Training Stats:
│  │  │  ├─ Duration: "2.3 seconds"
│  │  │  ├─ Training Samples: "1,000"
│  │  │  └─ Test Samples: "247"
│  │  ├─ Method: "Gradient Boosting (100 decision trees)"
│  │  ├─ Status: "Model Ready ✓"
│  │  └─ Buttons:
│  │     ├─ "View SKU Analysis"
│  │     └─ "Download Training Report"
│  │
│  ├─ ErrorSection (visible when error)
│  │  ├─ Error Icon: ⚠️
│  │  ├─ Message: "Training failed: Not enough data (need 6+ months)"
│  │  └─ Actions: [RETRY] [VIEW LOGS]
│  │
│  └─ [SkuAnalysisModal]  ← NEW MODAL
│     │
│     └─ For each SKU:
│        ├─ SKU Name: "10CH"
│        ├─ Characteristics:
│        │  ├─ Volatility: 0.45 (Moderate)
│        │  ├─ Seasonality: 0.72 (High)
│        │  ├─ Trend: +0.12 (Growing)
│        │  └─ Data Points: 28 months
│        ├─ Adaptive Weights:
│        │  ├─ Holt-Winters: 35% ← Why? High seasonality
│        │  ├─ XGBoost: 25%
│        │  ├─ Prophet: 25%
│        │  ├─ ARIMA: 10%
│        │  └─ Linear: 5%
│        └─ Explanation: "High seasonality detected → Holt-Winters weight increased..."
│
├─ Existing Components (unchanged)
│  ├─ Dashboard tab
│  ├─ Detailed Forecast tab
│  ├─ Quality tab
│  └─ Insights tab
│
└─ Services (new)
   └─ trainingService.ts
      ├─ getStatus()
      ├─ aggregateData()
      ├─ trainModel()
      ├─ getSkuAnalysis()
      └─ generateForecast()
```

---

## 🔌 State Management

### New State in App.tsx
```typescript
interface TrainingState {
  isTraining: boolean;              // true = training in progress
  progress: number;                 // 0-100
  startTime: number | null;         // ms timestamp when started
  estimatedTimeRemaining: number;   // seconds
  currentPhase: 'idle' | 'aggregating' | 'training' | 'complete' | 'error';
  error: string | null;             // error message
  result: {
    mape: number;                   // 18.5
    trainingSamples: number;        // 1000
    testSamples: number;            // 247
    method: string;                 // 'gradient-boosting'
    modelReady: boolean;            // true
    duration: number;               // ms
  } | null;
  modelLastTrained: string | null;  // ISO timestamp
}

const [trainingState, setTrainingState] = useState<TrainingState>({
  isTraining: false,
  progress: 0,
  startTime: null,
  estimatedTimeRemaining: 0,
  currentPhase: 'idle',
  error: null,
  result: null,
  modelLastTrained: null
});
```

### State Transitions
```
IDLE → TRAINING → COMPLETE
     → ERROR → IDLE (via retry)

Timeline:
├─ T=0ms: User clicks "Train Model"
│         setTrainingState({ isTraining: true, progress: 0, currentPhase: 'training' })
│
├─ T=500ms: Poll returns xgbTraining=true, progress ~20%
│           setTrainingState({ progress: 20, ... })
│
├─ T=1000ms: Poll returns xgbTraining=true, progress ~40%
│            setTrainingState({ progress: 40, ... })
│
├─ T=2000ms: Poll returns xgbTraining=false (training complete!)
│            setTrainingState({
│              isTraining: false,
│              progress: 100,
│              currentPhase: 'complete',
│              result: { mape: 18.5, ... },
│              modelLastTrained: '2026-01-23T...'
│            })
│
└─ DONE: Results displayed, model ready for forecasting
```

---

## 🌐 API Integration

### Frontend ↔ Backend Communication

```
┌─ Frontend (React) ─────────────────────┬────────────────────── Backend ─┐
│                                        │                                │
│  trainingService.ts                    │        server.ts (Express)    │
│                                        │                                │
│  ┌─ getStatus() ──────────────────────>│ GET /api/status               │
│  │  Return: { xgbTraining, hasData }   │ Return: { ok, xgbTraining }  │
│  │                                     │                                │
│  ├─ aggregateData(csv) ────────────────>│ POST /api/aggregate           │
│  │  POST body: { csvData }             │ Aggregate to SKU-month        │
│  │  Return: { skus, data, stats }      │ Save in currentAggregates     │
│  │                                     │                                │
│  ├─ trainModel() ──────────────────────>│ POST /api/train-xgb           │
│  │  Return: { training: {mape, ...}}   │ Call trainXGBModel()          │
│  │                                     │ Load model, return results    │
│  │                                     │                                │
│  ├─ getSkuAnalysis(skus) ──────────────>│ GET /api/sku-analysis?skus... │
│  │  Return: { data: [{weights, ...}]} │ Analyze characteristics        │
│  │                                     │ Calculate adaptive weights     │
│  │                                     │                                │
│  └─ generateForecast(params) ─────────>│ GET /api/forecast?...         │
│     Return: [{date, qty, ...}]        │ Generate all 5 methods         │
│                                        │ Apply adaptive weights         │
│                                        │ Return weighted ensemble       │
└────────────────────────────────────────┴────────────────────────────────┘
                         JSON over HTTP/REST
```

---

## 📈 Progress Tracking Logic

```
estimated_duration = 120 seconds (typical)
elapsed_time = (now - startTime) / 1000 (in seconds)

Progress calculation:
├─ While xgbTraining === true (0-80% while training)
│  └─ progress = min(80, (elapsed_time / estimated_duration) * 100)
│
├─ When xgbTraining === false (jump to 100%)
│  └─ progress = 100, currentPhase = 'complete'
│
└─ Estimated remaining time:
   └─ remaining = max(0, estimated_duration - elapsed_time)
      Display: "~45s remaining"
```

---

## 🎯 Integration with Existing Forecast

### BEFORE: No Model Training
```
User generates forecast
    ↓
GET /api/forecast?method=ensemble&include=hw,prophet,arima,linear
    ↓
Backend: Use 4 statistical methods equally weighted
    ├─ Each method: 25% weight
    └─ Ensemble: avg(hw, prophet, arima, linear)
    ↓
Display forecast (decent accuracy)
```

### AFTER: With Model Training
```
User uploads CSV → trains model → generates forecast
    ↓
Forecast request automatically enhanced:
    ├─ Check: trainingState.result?.modelReady === true
    ├─ YES: GET /api/forecast?method=ensemble&include=hw,prophet,arima,linear,xgb
    │       Backend: 5 methods + adaptive weights
    │       ├─ HW: 35% (seasonality rule)
    │       ├─ Prophet: 25% (trend rule)
    │       ├─ XGBoost: 25% (ML ensemble)
    │       ├─ ARIMA: 10% (correlation)
    │       └─ Linear: 5% (structural drift)
    │       Ensemble: weighted_avg(all 5)
    │
    └─ NO: Falls back to 4 statistical methods
        Display forecast (without XGBoost component)

Result: Better accuracy + explainable weights
```

---

## 💾 Data Persistence

### Browser LocalStorage (optional)
```javascript
// Save training results for reference
localStorage.setItem('lastTrainingState', JSON.stringify({
  modelLastTrained: '2026-01-23T15:30:45Z',
  mape: 18.5,
  trainingSamples: 1000,
  duration: 2347
}));

// Restore on page reload
const saved = localStorage.getItem('lastTrainingState');
if (saved) {
  const state = JSON.parse(saved);
  setTrainingState(prev => ({
    ...prev,
    modelLastTrained: state.modelLastTrained,
    result: {
      mape: state.mape,
      trainingSamples: state.trainingSamples,
      testSamples: state.testSamples,
      method: 'gradient-boosting',
      modelReady: true,
      duration: state.duration
    }
  }));
}
```

### Backend Persistence
```
Model file: ./models/xgboost-model.json
├─ Contains: 100 decision trees (serialized)
├─ Size: ~50-100 KB (very small)
└─ Loaded at server startup
   └─ If exists: xgbModel = loadXGBModel()
```

---

## 🚨 Error Recovery Flow

```
Error Scenarios:

1. No data loaded
   ├─ User sees: "Upload a CSV file first"
   ├─ Action: Show upload dialog
   └─ Recovery: Upload CSV → can now train

2. Insufficient data (<6 months per SKU)
   ├─ Backend returns: { error: 'Not enough data...' }
   ├─ User sees: "Need 6+ months per SKU"
   ├─ Action: [TRY AGAIN] button grayed out
   └─ Recovery: Upload more data → retry

3. Training timeout (>5 minutes)
   ├─ Frontend detects: elapsed > 300 seconds
   ├─ User sees: "Training timed out"
   ├─ Action: [RETRY] button enabled
   └─ Recovery: Click retry → start over

4. Backend error (500)
   ├─ User sees: Actual error message
   ├─ Action: [RETRY] button
   └─ Recovery: Retry or check backend logs

5. Network error
   ├─ Frontend catch: axios error / fetch error
   ├─ User sees: "Network error - check connection"
   ├─ Action: [RETRY] button
   └─ Recovery: Verify internet → retry
```

---

## 📊 Testing Scenarios

```
✅ Happy Path
├─ Upload Big Tex CSV (2,309 rows)
├─ Click "Train Model"
├─ See progress 0% → 100%
├─ See results (MAPE: ~18%)
├─ Click "View SKU Analysis"
├─ See adaptive weights per SKU
└─ Generate forecast with enhanced accuracy

✅ Error Path
├─ Click "Train" without data
├─ See: "No data loaded"
├─ Upload CSV
├─ Try again → success

✅ Progress Path
├─ Monitor progress bar accuracy
├─ Verify phase labels update
├─ Check time estimate accuracy

✅ Integration Path
├─ Train model
├─ Generate forecast
├─ Verify forecast uses 5 methods (not 4)
└─ Verify adaptive weights applied
```

---

## Summary

**Training UI integrates with existing frontend via:**

1. **New Tab** in navigation (clean separation)
2. **New Component** (TrainingPanel.tsx) for UI
3. **New Service** (trainingService.ts) for API calls
4. **New State** (trainingState) in App.tsx
5. **New Handlers** for training triggers and retries
6. **Progress Polling** every 500ms during training
7. **Automatic Enhancement** of forecast generation when model ready

**Key Features:**
- ✅ One-click training
- ✅ Live progress updates
- ✅ MAPE results display
- ✅ Adaptive weight explanation
- ✅ Seamless forecast integration
- ✅ Error handling & recovery
- ✅ No disruption to existing features
