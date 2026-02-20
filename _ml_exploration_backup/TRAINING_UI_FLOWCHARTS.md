# Frontend Training UI - Visual Flowcharts

## 🔄 Complete User Journey

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        USER JOURNEY MAP                                  │
└─────────────────────────────────────────────────────────────────────────┘

START
  │
  ├─→ User opens app
  │     │
  │     └─→ App loads with sample data (or existing upload)
  │           │
  │           └─→ See Dashboard, Detailed, Quality, Insights tabs
  │                 │
  │                 └─→ ★ NEW: "MODEL TRAINING" TAB ★
  │
  ├─→ User uploads CSV file (Big Tex, etc.)
  │     │
  │     ├─→ Frontend: Parse dates, aggregate locally
  │     │
  │     ├─→ Frontend: Show aggregation stats
  │     │     └─ "1,247 data points | 12 SKUs | Compression: 14.8x"
  │     │
  │     └─→ Backend: POST /api/aggregate
  │           ├─ Parse CSV
  │           ├─ Group by SKU + YearMonth
  │           └─ Store in currentAggregates
  │
  ├─→ User navigates to "MODEL TRAINING" tab
  │     │
  │     └─→ TrainingPanel loads
  │           │
  │           ├─ Status: "✓ Data Loaded (1,247 samples)"
  │           ├─ Button: [TRAIN MODEL] (green, clickable)
  │           └─ Info: "12 SKUs ready to train"
  │
  ├─→ User clicks "TRAIN MODEL" button
  │     │
  │     ├─→ Frontend validation: data exists? ✓
  │     │
  │     ├─→ setTrainingState({
  │     │     isTraining: true,
  │     │     progress: 0,
  │     │     currentPhase: 'training'
  │     │   })
  │     │
  │     ├─→ Button changes: "TRAINING..." (gray, disabled)
  │     │
  │     ├─→ POST /api/train-xgb (trigger training)
  │     │     │
  │     │     └─ Backend starts building gradient boosting model
  │     │
  │     └─→ Frontend starts polling GET /api/status (every 500ms)
  │
  ├─→ Training in progress
  │     │
  │     ├─→ T=500ms: Poll → progress ~8%, phase "Training..."
  │     │   │
  │     │   └─→ UI updates: [████░░░░░░░░░░░░░░░░░░] 8%
  │     │
  │     ├─→ T=1000ms: Poll → progress ~16%
  │     │   │
  │     │   └─→ UI updates: [████████░░░░░░░░░░░░░░] 16%
  │     │
  │     ├─→ T=1500ms: Poll → progress ~24%
  │     │   │
  │     │   └─→ UI updates: [████████████░░░░░░░░░░] 24%
  │     │
  │     ├─→ T=2000ms: Poll → progress ~32% ... → xgbTraining becomes false
  │     │   │
  │     │   └─→ Training complete detected!
  │     │
  │     └─→ Polling stops
  │
  ├─→ Training complete
  │     │
  │     ├─→ setTrainingState({
  │     │     isTraining: false,
  │     │     progress: 100,
  │     │     currentPhase: 'complete',
  │     │     result: {
  │     │       mape: 18.5,
  │     │       trainingSamples: 1000,
  │     │       testSamples: 247,
  │     │       duration: 2347,
  │     │       method: 'gradient-boosting',
  │     │       modelReady: true
  │     │     },
  │     │     modelLastTrained: '2026-01-23T15:30:45Z'
  │     │   })
  │     │
  │     └─→ UI shows results card:
  │           ├─ ✅ Model trained successfully!
  │           ├─ MAPE: 18.5%
  │           ├─ Duration: 2.3 seconds
  │           ├─ Training: 1,000 samples | Test: 247 samples
  │           ├─ Method: Gradient Boosting (100 decision trees)
  │           ├─ Status: Model Ready ✓
  │           └─ Buttons: [View SKU Analysis] [Download Report]
  │
  ├─→ User clicks "View SKU Analysis"
  │     │
  │     ├─→ Frontend: GET /api/sku-analysis?skus=10CH,20CH,...
  │     │
  │     └─→ Modal opens showing for each SKU:
  │           ├─ Characteristics:
  │           │  ├─ Volatility: 0.45 (Moderate)
  │           │  ├─ Seasonality: 0.72 (High) ← Why Holt-Winters boosted
  │           │  ├─ Trend: +0.12 (Growing) ← Why Prophet boosted
  │           │  └─ Data Points: 28 months
  │           │
  │           ├─ Adaptive Weights:
  │           │  ├─ Holt-Winters: 35% ← Boost due to seasonality
  │           │  ├─ Prophet: 25%
  │           │  ├─ XGBoost: 25%
  │           │  ├─ ARIMA: 10%
  │           │  └─ Linear: 5%
  │           │
  │           └─ Explanation text:
  │              "High seasonality detected (0.72)
  │               → Holt-Winters weight increased to 35%
  │               Growing trend detected (0.12)
  │               → Prophet weight maintained at 25%"
  │
  ├─→ User generates forecast
  │     │
  │     ├─→ (In any tab - Dashboard, Detailed, etc.)
  │     │
  │     ├─→ Click "Generate Forecast" button
  │     │
  │     ├─→ Frontend checks: trainingState.result?.modelReady === true
  │     │
  │     ├─→ YES! Model trained, so:
  │     │   GET /api/forecast?skus=...&include=hw,prophet,arima,linear,xgb
  │     │
  │     ├─→ Backend generates 5 forecasts (instead of 4)
  │     │   ├─ Holt-Winters
  │     │   ├─ Prophet
  │     │   ├─ ARIMA
  │     │   ├─ Linear
  │     │   └─ ★ XGBoost (using trained model!) ★
  │     │
  │     ├─→ Backend calculates adaptive weights
  │     │   ├─ Analyze each SKU's characteristics
  │     │   ├─ Apply weighting rules
  │     │   └─ Result: custom weights per SKU
  │     │
  │     ├─→ Backend applies weights:
  │     │   └─ final_forecast = (HW × 0.35) + (Prophet × 0.25) + ...
  │     │
  │     └─→ Frontend displays forecast
  │           └─ Better accuracy thanks to ML + adaptive weighting!
  │
  └─→ END: User has trained model & improved forecasts


┌─────────────────────────────────────────────────────────────────────────┐
│                        ERROR PATHS                                       │
└─────────────────────────────────────────────────────────────────────────┘

ERROR 1: No Data Loaded
  │
  ├─→ User clicks "Train Model" without uploading CSV
  │
  ├─→ Frontend validation: if (!data || data.length === 0)
  │
  ├─→ setTrainingState({
  │     error: 'No data loaded. Upload a CSV first.'
  │   })
  │
  └─→ UI shows red error message + [UPLOAD CSV] button

ERROR 2: Insufficient Data
  │
  ├─→ User uploads CSV with <6 months of data
  │
  ├─→ Frontend sends POST /api/aggregate
  │
  ├─→ Backend responds: success = true (data loaded)
  │
  ├─→ User clicks "Train Model"
  │
  ├─→ POST /api/train-xgb
  │
  ├─→ Backend validation: trainingData.length < 50?
  │
  ├─→ Response: { error: 'Not enough data (need 6+ months per SKU)' }
  │
  ├─→ Frontend receives error
  │
  ├─→ setTrainingState({
  │     isTraining: false,
  │     currentPhase: 'error',
  │     error: 'Not enough data (need 6+ months per SKU)'
  │   })
  │
  └─→ UI shows error message + [UPLOAD MORE DATA] guidance

ERROR 3: Training Timeout
  │
  ├─→ User clicks "Train Model"
  │
  ├─→ Training starts normally
  │
  ├─→ But backend stalls (stuck in buildTree, etc.)
  │
  ├─→ Frontend sets timeout: if (elapsed > 5 minutes)
  │
  ├─→ Frontend clears interval & sets:
  │
  ├─→ setTrainingState({
  │     isTraining: false,
  │     currentPhase: 'error',
  │     error: 'Training timed out after 5 minutes'
  │   })
  │
  └─→ UI shows error message + [RETRY] button
      User can click retry to start over

ERROR 4: Backend Error (HTTP 500)
  │
  ├─→ POST /api/train-xgb throws exception
  │
  ├─→ catch block sends: { error: 'Error message from backend' }
  │
  ├─→ Frontend receives error response
  │
  ├─→ setTrainingState({
  │     isTraining: false,
  │     error: error.message
  │   })
  │
  └─→ UI shows: "Training failed: [detailed error]" + [RETRY]

ERROR 5: Network Error
  │
  ├─→ POST /api/train-xgb fails to reach server
  │
  ├─→ fetch() throws NetworkError
  │
  ├─→ catch block in trainingService
  │
  ├─→ Frontend catch:
  │
  ├─→ setTrainingState({
  │     error: 'Network error - check connection'
  │   })
  │
  └─→ UI shows error + [RETRY] button
```

---

## 🔀 State Transitions

```
                    ┌─────────────┐
                    │   INITIAL   │
                    │   (idle)    │
                    └──────┬──────┘
                           │
                    User uploads CSV
                           │
                           ↓
                    ┌─────────────┐
                    │ DATA LOADED │
                    │    (idle)   │
                    └──────┬──────┘
                           │
                 User clicks "Train"
                           │
                           ↓
                    ┌─────────────────────┐
                    │  TRAINING IN PROG   │
                    │ progress: 0% → 100% │
                    │ phase: "training"   │
                    └──────┬──────────┬──┐
                           │          │  │
         Backend trains    │  Poll    │  │ Every 500ms
         for ~2 seconds    │ status   │  │ updates progress
                           │          │  │
                           └──────────┘  │
                                 ↓       │
                          Training done? ◄─┘
                           (xgbTraining=false)
                                 │
                           YES   │   NO
                                 ↓
                    ┌──────────────────────┐
                    │   TRAINING COMPLETE  │
                    │  progress: 100%      │
                    │  phase: "complete"   │
                    │  result: {mape, ...} │
                    └──────────────────────┘

                    Show results card
                           │
              ┌────────────┬┴────────────┐
              ↓            ↓             ↓
         [Retry]  [View Analysis]  [Download]
              │            │             │
              │            ↓             │
              │      SKU Analysis        │
              │       Modal Opens        │
              │            │             │
              └────────────┴─────────────┘
                           │
                User generates forecast
                           │
                           ↓
                Forecast uses 5 methods
                (including XGBoost!) →
                Better accuracy!


                    ERROR STATES

              ┌──────────────────┐
              │  ERROR: No Data  │
              │  phase: "error"  │
              │  error message   │
              └────┬─────────────┘
                   │
         [Upload CSV] [Retry]

              ┌────────────────────────┐
              │ ERROR: Timeout (5min)  │
              │ phase: "error"         │
              │ error: "Timed out"     │
              └────┬──────────────────┘
                   │
              [Retry]
```

---

## 📱 UI Component State

```
TrainingPanel Component

State Variables:
├─ trainingState.isTraining (boolean)
├─ trainingState.progress (0-100)
├─ trainingState.currentPhase ('idle' | 'training' | 'complete' | 'error')
├─ trainingState.error (null | string)
├─ trainingState.result (null | {mape, duration, ...})
└─ trainingState.modelLastTrained (null | ISO string)

Conditional Rendering:

if (!data || data.length === 0)
  └─→ Show: "No data loaded. Upload CSV first."

else if (trainingState.error)
  └─→ Show: Red error box with message + [RETRY]

else if (trainingState.isTraining)
  └─→ Show: [████████░░░░░░░░] 60% + Phase label + Time estimate

else if (trainingState.result)
  └─→ Show: Green results box with MAPE + stats + buttons

else
  └─→ Show: "Ready to train" + [TRAIN MODEL] button
```

---

## 🔌 API Call Sequence

```
Timeline    Frontend Action          API Call           Backend Action          Response
────────    ─────────────────────    ────────────────   ──────────────────────  ─────────────

T=0         User uploads CSV
                                     POST /aggregate    Parse CSV
                                                       Aggregate by SKU-month
                                                       Save in memory          { success, skus, data }

T=1         CSV shown in app
            Status: "Data ready"

T=2         User clicks button
            setTrainingState({
              isTraining: true,
              progress: 0,
              startTime: now
            })
                                     POST /train-xgb    Check: currentAggregates?
                                                       Set: isTraining = true
                                                       Loop 100x:
                                                         buildTree(features)
                                                         Update predictions
                                                       Test set evaluation
                                                       Calculate MAPE
                                                       Save model JSON
                                                       Set: isTraining = false

T=2.5       Frontend starts polling   GET /status        Return: {
            every 500ms                                    xgbTraining: true,
                                                          ...
                                                        }

T=2.5       setTrainingState({
              progress: 15%,
              ...
            })

T=3.0       Update: progress 30%     GET /status        Return: {
                                                          xgbTraining: true
                                                        }

T=3.5       Update: progress 45%     GET /status        Return: {
                                                          xgbTraining: true
                                                        }

T=4.0       Update: progress 60%     GET /status        Return: {
                                                          xgbTraining: false ← Done!
                                                        }

T=4.0       Stop polling
            setTrainingState({
              isTraining: false,
              progress: 100,
              currentPhase: 'complete',
              result: { mape: 18.5, ... }
            })

            [Optional] Show results card with buttons

T=5         User clicks "View        GET /sku-analysis  Analyze each SKU:
            Analysis"                ?skus=10CH,20CH    - Calculate characteristics
                                                        - Calculate weights
                                                        - Generate explanation

            Modal opens showing                        Response: {
            weights for each SKU                         data: [{
                                                          sku: '10CH',
                                                          characteristics: {...},
                                                          weights: {hw, prophet, ...},
                                                          explanation: "..."
                                                        }]
                                                      }

T=6         User generates           GET /forecast      Generate 5 forecasts
            forecast (any tab)       ?...&include=      ├─ Holt-Winters
                                     hw,prophet,       ├─ Prophet
            Frontend checks:         arima,            ├─ ARIMA
            model ready? YES         linear,xgb        ├─ Linear
                                                       └─ XGBoost (trained!)

                                                       Get SKU characteristics
                                                       Calculate adaptive weights
                                                       Apply: final = Σ(forecast × weight)
                                                       
                                                       Response: [
                                                         {date, quantity, ...},
                                                         ...
                                                       ]

T=7         Display forecast
            with 5 methods
            (better accuracy!)
```

---

## 🎨 UI States Visualization

```
STATE 1: Initial (No Data)
┌─────────────────────────────────────────┐
│ Model Training                          │
├─────────────────────────────────────────┤
│                                         │
│  Status: No data loaded                │
│                                         │
│           [UPLOAD CSV]                 │
│                                         │
│  Waiting for data...                   │
└─────────────────────────────────────────┘


STATE 2: Data Loaded (Ready)
┌─────────────────────────────────────────┐
│ Model Training                          │
├─────────────────────────────────────────┤
│                                         │
│  ✓ Data Loaded (1,247 samples)         │
│  ✓ 12 unique SKUs                      │
│  ✓ Compression: 14.8x                  │
│                                         │
│         [TRAIN MODEL]                  │
│                                         │
│  Ready to train gradient boosting      │
└─────────────────────────────────────────┘


STATE 3: Training In Progress
┌─────────────────────────────────────────┐
│ Model Training                          │
├─────────────────────────────────────────┤
│                                         │
│  Status: Training...                   │
│  Phase: Building trees...              │
│  [████████████░░░░░░░░░░] 60%          │
│  Time: 1m 23s elapsed | ~40s remaining │
│                                         │
│       [TRAINING...] (disabled)         │
│                                         │
│  Do not refresh browser...             │
└─────────────────────────────────────────┘


STATE 4: Training Complete
┌─────────────────────────────────────────┐
│ Model Training                          │
├─────────────────────────────────────────┤
│                                         │
│  ✅ Training Completed!                │
│                                         │
│  📈 MAPE: 18.5%                        │
│     (Good accuracy for supply chain)   │
│                                         │
│  ⏱️  Duration: 2.3 seconds             │
│  📊 Training: 1,000 | Test: 247        │
│  🤖 Method: Gradient Boosting          │
│  ✅ Model Ready: YES                   │
│                                         │
│  [View SKU Analysis]                   │
│  [Download Report]                     │
│                                         │
│  Your forecasts now use the trained ML│
│  model for better accuracy!            │
└─────────────────────────────────────────┘


STATE 5: Error State
┌─────────────────────────────────────────┐
│ Model Training                          │
├─────────────────────────────────────────┤
│                                         │
│  ⚠️  Training Failed                   │
│                                         │
│  Not enough data to train              │
│  (need 6+ months per SKU)              │
│                                         │
│  Have: 3 months                        │
│  Need: 6 months                        │
│                                         │
│  [UPLOAD MORE DATA]                    │
│  [RETRY]                               │
│                                         │
│  Check data requirements in docs       │
└─────────────────────────────────────────┘


STATE 6: SKU Analysis Modal
┌─────────────────────────────────────────┐
│ SKU Weight Analysis              [X]    │
├─────────────────────────────────────────┤
│                                         │
│  SKU: 10CH (Car Hauler)                │
│                                         │
│  Characteristics:                      │
│  ├─ Volatility: 0.45 (Moderate)      │
│  ├─ Seasonality: 0.72 (High) ⬆️       │
│  ├─ Trend: +0.12 (Growing)          │
│  └─ Data Points: 28 months            │
│                                         │
│  Adaptive Weights:                     │
│  ├─ Holt-Winters: 35% ← Seasonal     │
│  ├─ Prophet: 25%                      │
│  ├─ XGBoost: 25%                      │
│  ├─ ARIMA: 10%                        │
│  └─ Linear: 5%                        │
│                                         │
│  Why these weights?                    │
│  "High seasonality (0.72) detected     │
│   → Holt-Winters weight increased.    │
│   Growing trend (+0.12) allows        │
│   → Prophet to contribute."           │
│                                         │
│              [Close]                   │
└─────────────────────────────────────────┘
```

---

## Summary

This document shows:
1. **Complete user journey** - from upload to forecast
2. **Error paths** - how errors are handled
3. **State transitions** - how component state changes
4. **API call sequence** - timing of backend calls
5. **UI states** - what each screen looks like

All of this integrates seamlessly with the existing app!
