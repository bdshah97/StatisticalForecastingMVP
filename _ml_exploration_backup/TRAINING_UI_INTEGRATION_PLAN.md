# Frontend Training UI Integration Plan

## Overview
This document outlines how the ML model training UI will integrate with the existing frontend architecture. The solution will add training capabilities without disrupting current forecasting workflows.

---

## 1. Current Frontend Architecture

### Main App Structure
- **File:** `App.tsx` (3289 lines)
- **Pattern:** Single-page app with React state management
- **Navigation:** Tab-based system (not traditional routing)

### Current State Management
```typescript
// Key state variables in App.tsx
const [data, setData] = useState<DataPoint[]>(SAMPLE_DATA);
const [filters, setFilters] = useState<FilterState>({...});
const [committedSettings, setCommittedSettings] = useState({...});
const [uploadError, setUploadError] = useState<{...}>();
const [aggregationStats, setAggregationStats] = useState<{...}>();
```

### Existing Components
1. **MetricsCard.tsx** - Displays KPI metrics
2. **ChatAgent.tsx** - AI chat interface
3. **ReportModal.tsx** - Modal for reports
4. **InfoTooltip.tsx** - Tooltip helper

### Data Upload Flow (Current)
```
User CSV → parseDate() → aggregateCSVData() → setData → Re-render Dashboard
```

---

## 2. Training UI Architecture

### New State Variables to Add
```typescript
// Add to App.tsx state
const [trainingState, setTrainingState] = useState<{
  isTraining: boolean;           // Is training in progress?
  progress: number;              // 0-100 for progress bar
  startTime: number | null;      // When training started
  estimatedTimeRemaining: number; // Seconds
  currentPhase: 'idle' | 'aggregating' | 'training' | 'complete' | 'error';
  error: string | null;          // Error message if failed
  result: {
    mape: number;                // MAPE (Mean Absolute Percentage Error)
    trainingSamples: number;     // Number of training samples
    testSamples: number;         // Number of test samples
    method: string;              // 'gradient-boosting'
    modelReady: boolean;         // Is model loaded?
    duration: number;            // Total duration in ms
  } | null;
  modelLastTrained: string | null; // ISO timestamp
}>({
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

### Training Service Module
**New File:** `services/trainingService.ts`

```typescript
export interface TrainingResponse {
  status: 'success' | 'error';
  training?: {
    mape: number;
    trainingSamples: number;
    testSamples: number;
    method: string;
    duration: number;
  };
  duration: number;
  modelReady: boolean;
  message: string;
  error?: string;
}

export interface BackendStatus {
  status: string;
  hasData: boolean;
  xgbReady: boolean;
  xgbTraining: boolean;
  uptime: number;
}

export const trainingService = {
  // Check backend status and model readiness
  getStatus: async (): Promise<BackendStatus> => { ... },

  // Aggregate CSV and load into backend
  aggregateData: async (csvData: string): Promise<AggregationResponse> => { ... },

  // Trigger training
  trainModel: async (): Promise<TrainingResponse> => { ... },

  // Poll training progress (every 500ms)
  pollStatus: async (onUpdate: (status: BackendStatus) => void): Promise<void> => { ... },

  // Get SKU analysis (adaptive weights)
  getSkuAnalysis: async (skus: string[]): Promise<SkuAnalysisResponse> => { ... },

  // Generate forecast with trained model
  generateForecast: async (params: ForecastParams): Promise<ForecastResponse> => { ... }
};
```

---

## 3. UI Component Hierarchy

### New Training Component
**File:** `components/TrainingPanel.tsx`

```
TrainingPanel
├── HeaderSection
│   ├── Title: "Model Training"
│   ├── Status Badge (Idle/Training/Complete/Error)
│   └── Last Trained Timestamp
├── DataStatusSection
│   ├── "Data Loaded" indicator
│   ├── Sample count (e.g., "1,247 samples")
│   └── SKU count
├── ActionButton
│   ├── "Train Model" (when data loaded, not training)
│   ├── "Training..." (disabled, when training)
│   └── "Retry" (when error)
├── ProgressBarSection (shown when isTraining)
│   ├── Animated progress bar (0-100%)
│   ├── Percentage text
│   ├── Phase label ("Aggregating..." / "Training..." / "Saving...")
│   └── Time elapsed & estimated remaining
├── ResultsSection (shown when complete)
│   ├── MAPE Score (with interpretation)
│   ├── Training Duration
│   ├── Sample Statistics
│   ├── Method (Gradient Boosting)
│   └── "View SKU Analysis" button
├── ErrorSection (shown when error)
│   ├── Error message
│   └── "Retry" or "View Logs" button
└── SkuAnalysisModal
    ├── List of SKUs with characteristics
    ├── Adaptive weights breakdown
    └── Weight explanation
```

### Integration Points in App.tsx
```
App.tsx (main tab navigation)
├── Existing Tabs:
│   ├── "Dashboard"
│   ├── "Detailed Forecast"
│   ├── "Quality" 
│   └── "Insights"
├── NEW TAB: "Model Training" ← TrainingPanel goes here
└── Right sidebar:
    ├── Existing controls (filters, settings)
    └── NEW: Training Status Widget (compact version)
```

---

## 4. Data Flow Diagram

### Training Workflow
```
User clicks "Train Model"
    ↓
[Validate data exists & backend running]
    ↓
POST /api/aggregate (send CSV)
    ├─ Backend: Parse & aggregate by SKU-month
    └─ Response: ✓ Aggregation complete
    ↓
setTrainingState({ isTraining: true, currentPhase: 'training' })
    ↓
POST /api/train-xgb (trigger gradient boosting)
    ├─ Backend: Build 100 decision trees
    ├─ Backend: Evaluate on test set
    └─ Backend: Save model to disk
    ↓
[Poll GET /api/status every 500ms until !isTraining]
    ├─ Update progress bar
    └─ Update phase
    ↓
Training Complete
    ├─ setTrainingState({ result: { mape, duration, ... } })
    ├─ Save modelLastTrained timestamp
    └─ Show results card
    ↓
GET /api/sku-analysis (optional: show weights for each SKU)
    ↓
Display: "Model trained! MAPE: 18.5% | Ready to forecast"
```

### Forecast Generation (Enhanced)
```
User requests forecast
    ↓
[Check if model trained: trainingState.result?.modelReady]
    ├─ YES: Include xgboost in ensemble ← Uses trained model
    └─ NO: Use 4 statistical methods only
    ↓
GET /api/forecast?skus=...&method=ensemble&include=hw,prophet,arima,linear,xgb
    ├─ Backend: Generate predictions from each method
    ├─ Backend: Apply adaptive weights (based on SKU characteristics)
    └─ Response: Weighted ensemble forecast
    ↓
Display forecast with better accuracy (weighted ensemble > 4 methods alone)
```

---

## 5. Integration Points

### 5.1 Data Upload → Training Connection
**Current:** CSV upload → aggregation → dashboard display

**Enhanced:**
```typescript
// In handleHistoricalDataUpload()
const handleHistoricalDataUpload = (file: File) => {
  const reader = new FileReader();
  reader.onload = async (event) => {
    const csvData = event.target?.result as string;
    
    // 1. Local aggregation (for display)
    const aggregated = aggregateCSVData(csvData);
    setData(aggregated);
    
    // 2. NEW: Send to backend for model training
    try {
      const response = await trainingService.aggregateData(csvData);
      setAggregationStats(response);
      setTrainingState(prev => ({ 
        ...prev, 
        error: null // Clear any previous errors
      }));
    } catch (error) {
      setTrainingState(prev => ({ 
        ...prev, 
        error: `Backend aggregation failed: ${error.message}`
      }));
    }
  };
};
```

### 5.2 Training Button → Backend Training
```typescript
// New handler
const handleTrainModel = async () => {
  if (!data || data.length === 0) {
    setTrainingState(prev => ({ 
      ...prev, 
      error: 'No data loaded. Upload a CSV first.'
    }));
    return;
  }

  setTrainingState({
    isTraining: true,
    progress: 0,
    startTime: Date.now(),
    estimatedTimeRemaining: 120, // Assume ~2 min
    currentPhase: 'training',
    error: null,
    result: null,
    modelLastTrained: null
  });

  try {
    // Trigger training
    const result = await trainingService.trainModel();
    
    // Update state with results
    setTrainingState(prev => ({
      ...prev,
      isTraining: false,
      progress: 100,
      currentPhase: 'complete',
      result: result.training || null,
      modelLastTrained: new Date().toISOString(),
      error: result.status === 'error' ? result.error : null
    }));

    // Show success notification
    if (result.status === 'success') {
      console.log(`✅ Model trained! MAPE: ${result.training?.mape.toFixed(2)}%`);
    }
  } catch (error) {
    setTrainingState(prev => ({
      ...prev,
      isTraining: false,
      currentPhase: 'error',
      error: `Training failed: ${error.message}`
    }));
  }
};
```

### 5.3 Progress Polling
```typescript
// In useEffect hook
useEffect(() => {
  if (!trainingState.isTraining) return;

  const pollInterval = setInterval(async () => {
    try {
      const status = await trainingService.getStatus();
      
      // Estimate progress (0-80% while training, 80-100% while saving)
      const elapsed = (Date.now() - trainingState.startTime!) / 1000; // seconds
      const estimatedDuration = 120; // ~2 minutes typical
      let progress = Math.min(80, (elapsed / estimatedDuration) * 100);
      
      setTrainingState(prev => ({
        ...prev,
        progress,
        estimatedTimeRemaining: Math.max(0, estimatedDuration - elapsed)
      }));

      // Check if training is done (backend says so)
      if (!status.xgbTraining && trainingState.isTraining) {
        clearInterval(pollInterval);
        // Training is complete, fetch results
        const result = await trainingService.trainModel();
        setTrainingState(prev => ({
          ...prev,
          isTraining: false,
          progress: 100,
          result: result.training
        }));
      }
    } catch (error) {
      console.error('Poll error:', error);
    }
  }, 500); // Poll every 500ms

  return () => clearInterval(pollInterval);
}, [trainingState.isTraining, trainingState.startTime]);
```

### 5.4 Forecast Enhancement
```typescript
// In calculateForecast() or wherever forecasts are generated
const enhanced_forecast_params = {
  ...existing_params,
  include: trainingState.result?.modelReady 
    ? 'hw,prophet,arima,linear,xgb'  // Include XGBoost
    : 'hw,prophet,arima,linear'       // Statistical methods only
};

// GET /api/forecast will apply adaptive weights automatically
```

---

## 6. UI Placement Strategy

### Option A: Dedicated Tab (Recommended)
```
┌─ Navigation Bar ──────────────────────────────┐
│ Dashboard | Detailed | Quality | Insights | ★ MODEL TRAINING ★ |
└───────────────────────────────────────────────┘
     ↓
[TrainingPanel component fills main content area]
├─ Header: "Gradient Boosting Model Training"
├─ Status: Data Loaded (1,247 samples) ✓
├─ Button: [TRAIN MODEL] (green, large)
├─ Results (when complete):
│  ├─ MAPE: 18.5%
│  ├─ Duration: 2.3s
│  ├─ Samples: 1,000 train / 247 test
│  └─ [View SKU Analysis]
└─ Advanced: Adaptive Weights Explanation
```

### Option B: Inline Widget (Alternative)
```
Existing Dashboard Tab
├─ Left: Forecasting controls (current)
├─ Right: [NEW] Compact Training Panel
│  ├─ Status: "Ready to Train"
│  ├─ Button: [TRAIN] (small)
│  ├─ Progress: [████░░░░░░] 40%
│  └─ Results: "MAPE: 18.5%"
└─ Expands to full modal when training starts
```

**Recommendation:** Option A (dedicated tab) for:
- Clear focus on training vs forecasting
- Better UX for long-running operations
- Room for detailed results and analysis
- Can add historical training logs later

---

## 7. Implementation Sequence

### Phase 1: Backend Service Layer (2 hours)
1. Create `services/trainingService.ts`
2. Implement:
   - `getStatus()` - Check backend status
   - `aggregateData()` - Send CSV to backend
   - `trainModel()` - Trigger training
   - `getSkuAnalysis()` - Fetch weight analysis
   - Error handling and retries

### Phase 2: Component Development (2-3 hours)
1. Create `components/TrainingPanel.tsx` with:
   - Status display
   - Training button
   - Progress bar
   - Results card
   - SKU analysis modal
   
2. Add to App.tsx:
   - New state: `trainingState`
   - New handlers: `handleTrainModel()`, `handleRetry()`
   - useEffect for polling
   - New tab in navigation

### Phase 3: Integration (1.5 hours)
1. Connect data upload → backend aggregation
2. Integrate training results with forecast generation
3. Add model status check before forecasting
4. Error handling and user feedback

### Phase 4: Testing & Polish (1 hour)
1. Test with Big Tex CSV
2. Test error scenarios
3. UI refinements
4. Loading states and animations

**Total: ~6-7 hours** (matches Milestone 2 estimate)

---

## 8. Backend Connection Details

### Endpoint: POST /api/aggregate
```
Request:
{
  "csvData": "Date,Category,SKU,Quantity\n9/1/2022,Car Hauler,10CH,3\n..."
}

Response:
{
  "success": true,
  "skus": ["10CH", "20CH", ...],
  "data": [
    { "sku": "10CH", "yearMonth": "2022-09", "quantity": 145, ... },
    ...
  ],
  "stats": {
    "rawRecords": 2309,
    "aggregatedRecords": 156,
    "compressionRatio": 14.8
  }
}
```

### Endpoint: POST /api/train-xgb
```
Request:
{} (no body, uses pre-loaded data from /aggregate)

Response:
{
  "status": "success",
  "training": {
    "mape": 18.5,
    "trainingSamples": 1000,
    "testSamples": 247,
    "method": "gradient-boosting",
    "duration": 2347
  },
  "modelReady": true,
  "message": "XGBoost model trained and ready for forecasting"
}
```

### Endpoint: GET /api/status
```
Response:
{
  "status": "ok",
  "uptime": 1234.5,
  "hasData": true,
  "xgbReady": true,
  "xgbTraining": false
}
```

### Endpoint: GET /api/sku-analysis
```
Query: ?skus=10CH,20CH

Response:
{
  "success": true,
  "data": [
    {
      "sku": "10CH",
      "characteristics": {
        "volatility": 0.45,
        "seasonality": 0.72,
        "trend": 0.12,
        "sparsity": 0.05,
        "dataPoints": 28
      },
      "weights": {
        "xgboost": 0.25,
        "holt_winters": 0.35,
        "prophet": 0.25,
        "linear": 0.10,
        "arima": 0.05
      },
      "explanation": "High seasonality detected → Holt-Winters weight increased to 35%...\n..."
    }
  ]
}
```

---

## 9. Error Handling Strategy

### User-Facing Errors
1. **No data loaded**
   - Message: "Upload a CSV file first to train a model"
   - Action: Show upload dialog

2. **Insufficient data**
   - Message: "Need at least 6 months of history per SKU"
   - Action: Guide to data requirements

3. **Training timeout (>5 min)**
   - Message: "Training is taking longer than expected..."
   - Action: Show cancel button, allow manual retry

4. **Backend error**
   - Message: Display backend error message
   - Action: Show retry button, error details in log

### Recovery Mechanisms
```typescript
// Retry logic
const handleRetry = () => {
  setTrainingState(prev => ({
    ...prev,
    error: null,
    currentPhase: 'idle'
  }));
  // User can click Train button again
};

// Timeout protection
useEffect(() => {
  if (!trainingState.isTraining) return;
  
  const timeout = setTimeout(() => {
    setTrainingState(prev => ({
      ...prev,
      isTraining: false,
      error: 'Training timed out after 5 minutes'
    }));
  }, 5 * 60 * 1000); // 5 minutes
  
  return () => clearTimeout(timeout);
}, [trainingState.isTraining]);
```

---

## 10. State Flow Diagram

```
Initial State: { isTraining: false, currentPhase: 'idle', result: null, error: null }
                ↓
User uploads CSV
                ↓
State: { hasData: true, error: null }
                ↓
User clicks "Train Model"
                ↓
State: { isTraining: true, currentPhase: 'training', progress: 0, startTime: now }
                ↓
[Poll status every 500ms]
                ↓
Progress updates: { progress: 20% → 40% → 60% → 80% }
                ↓
Training complete (backend: xgbTraining = false)
                ↓
State: { isTraining: false, currentPhase: 'complete', progress: 100, result: {...} }
                ↓
Display results: MAPE, duration, samples, button to view SKU analysis
                ↓
[Optional] User clicks "View SKU Analysis"
                ↓
Modal: Show adaptive weights for each SKU
```

---

## 11. Key Implementation Files

| File | Purpose | Size |
|------|---------|------|
| `services/trainingService.ts` | Backend API calls | 150-200 lines |
| `components/TrainingPanel.tsx` | Main UI component | 400-500 lines |
| `components/SkuAnalysisModal.tsx` | Weight analysis modal | 200-300 lines |
| `App.tsx` (modifications) | State + handlers | 100-150 lines |
| `types.ts` (additions) | New interfaces | 50-100 lines |

---

## 12. Testing Plan

### Unit Tests
- [ ] `trainingService.ts` - Mock backend responses
- [ ] `TrainingPanel.tsx` - Render, user interactions, state updates
- [ ] Progress calculation logic
- [ ] Error handling

### Integration Tests
- [ ] Full flow: Upload → Train → Results
- [ ] Progress polling
- [ ] Model ready status affects forecasting
- [ ] SKU analysis display

### Manual Testing
- [ ] Train with Big Tex CSV (2,309 rows)
- [ ] Monitor progress bar accuracy
- [ ] Verify MAPE calculation
- [ ] Test error scenarios (no data, timeout, backend down)
- [ ] Test adaptive weights display

---

## 13. Success Criteria

✅ **Milestone 2 Complete When:**
1. TrainingPanel component renders in dedicated tab
2. "Train Model" button works with live progress
3. Results display (MAPE, duration, samples)
4. Backend integration confirmed (API calls successful)
5. SKU analysis modal shows adaptive weights
6. Error handling for edge cases
7. Model status affects forecast generation
8. No console errors, clean UX

---

## Summary

The training UI will be a **dedicated tab in the existing app** with:
- **Status display** showing data readiness
- **One-click training** button
- **Live progress bar** with phase labels
- **Results card** with MAPE and statistics
- **SKU analysis modal** showing adaptive weights
- **Seamless integration** with existing forecast generation

The architecture uses:
- **New service layer** (`trainingService.ts`) for API calls
- **New component** (`TrainingPanel.tsx`) for UI
- **Extended state** in `App.tsx` to track training progress
- **Polling mechanism** for progress updates (every 500ms)
- **Error recovery** with retry logic

This approach keeps the existing codebase clean while adding powerful new functionality in a focused, user-friendly way.
