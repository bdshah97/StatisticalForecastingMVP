# Statistical Forecasting Methodologies

**Version:** 2.0  
**Last Updated:** February 20, 2026  
**Status:** Production-Ready

---

## Overview

This document outlines the statistical forecasting methodologies, accuracy metrics, and supply chain calculations used in the forecasting engine. These methods have been optimized for supply chain demand planning with support for sparse, volatile, and seasonal demand patterns.

### Key Capabilities

✅ **Multiple Forecasting Algorithms** - Choose from 5 methods based on your data characteristics  
✅ **Intelligent Method Selection** - Auto-detection of optimal algorithm for each SKU  
✅ **Sparse Demand Handling** - Special algorithms for intermittent/lumpy demand patterns  
✅ **Seasonality Support** - Monthly seasonal decomposition with full history averaging  
✅ **Confidence Intervals** - Probabilistic forecasts with upper/lower bounds  
✅ **Supply Chain Integration** - Safety stock, reorder points, inventory projections  
✅ **Scenario Analysis** - Apply market shocks and growth multipliers  
✅ **Production Planning** - Account for incoming POs and manufacturing runs  

---

## Forecasting Methods

### 1. Holt-Winters Exponential Smoothing (DEFAULT)

**Best For:** Seasonal products with consistent demand patterns; automated general-purpose forecasting

**Algorithm:** Three-component exponential smoothing (level, trend, seasonal)

**Parameters:**
- `α (alpha)` = 0.3 [Level smoothing coefficient]
- `β (beta)` = 0.1 [Trend smoothing coefficient]
- `γ (gamma)` = 0.05 [Seasonal smoothing coefficient]
- `L` = 12 [Seasonal period in months]

**Two Variants:**

#### a) **Additive Holt-Winters** (for volatile/sparse demand)

```
Level[t] = α(Demand[t] - Seasonal[t-L]) + (1-α)(Level[t-1] + Trend[t-1])
Trend[t] = β(Level[t] - Level[t-1]) + (1-β)Trend[t-1]
Seasonal[t] = γ(Demand[t] - Level[t]) + (1-γ)Seasonal[t-1]

Forecast[t+h] = Level[t] + h*Trend[t] + Seasonal[t+h-L]
```

**Characteristics:**
- Seasonal components are deviations from the level (measured in units)
- Better for products with low volumes or high volatility (CV > 0.5)
- Handles zero-demand periods gracefully
- Suitable for ramp-up products with growth trends

#### b) **Multiplicative Holt-Winters** (for steady-state demand)

```
Level[t] = α(Demand[t] / Seasonal[t-L]) + (1-α)(Level[t-1] + Trend[t-1])
Trend[t] = β(Level[t] - Level[t-1]) + (1-β)Trend[t-1]
Seasonal[t] = γ(Demand[t] / Level[t]) + (1-γ)Seasonal[t-1]

Forecast[t+h] = (Level[t] + h*Trend[t]) * Seasonal[t+h-L]
```

**Characteristics:**
- Seasonal components are ratios (percentage adjustments)
- Better for high-volume stable products
- Seasonality scales with base demand level
- Assumes proportional seasonal variance

**Automatic Method Selection Logic:**

The algorithm automatically chooses between additive and multiplicative based on:

```
IF (mean < 1,000 units OR coefficient_of_variation > 0.8)
  → Use ADDITIVE [low-volume or extreme volatility]

ELSE IF (CV > 0.5 OR early_sparsity > 40% OR trend_strength > 0.05)
  → Use ADDITIVE [volatile, sparse, or trending]

ELSE
  → Use MULTIPLICATIVE [steady-state]
```

**Seasonal Initialization:**
- Computed from all available historical data (not just first year)
- Averages across all years to capture consistent seasonal patterns
- Formula: `Seasonal[month] = (Month Average / Overall Mean) - 1` [additive] or `/ Overall Mean` [multiplicative]

**Initialization:**
- Level initialized from LAST 12 months (recent trend), not first 12
- Trend initialized to zero (conservative assumption)
- This prevents distortion from old data and captures current momentum

---

### 2. Croston's Method

**Best For:** Intermittent/lumpy demand with many zero-demand periods

**Use When:**
- Demand is sparse (>30% zero periods)
- Products with irregular demand spikes
- Parts purchased on as-needed basis

**Algorithm:** Separates demand size from demand frequency

```
z[t] = α*Demand[t] + (1-α)*z[t-1]         [Demand size]
p[t] = α*Interval + (1-α)*p[t-1]          [Period between demands]

Forecast = z[t] / p[t]   [Average demand per period]
```

**Parameters:**
- `α` = 0.1 [Smoothing constant]
- Applies constant forecast for entire horizon

**Key Characteristic:** 
- Handles zero-demand months without division errors
- Provides single point estimate (no trend or seasonality)
- Conservative for sparse SKUs

---

### 3. Linear Regression

**Best For:** Trending products with clear upward/downward trajectory

**Use When:**
- Product in growth/decline phase
- Minimal seasonality
- Long-term trend is primary pattern

**Algorithm:** Ordinary least-squares (OLS) regression

```
y = m*x + b

Where:
m = (n*Σ(xy) - Σ(x)*Σ(y)) / (n*Σ(x²) - (Σ(x))²)
b = (Σ(y) - m*Σ(x)) / n

Forecast[t] = m*t + b
```

**Limitation:** Does not account for seasonality; assumes constant growth rate throughout forecast period

---

### 4. ARIMA (Auto-Regressive Integrated Moving Average)

**Best For:** Stationary demand with auto-correlation patterns

**Simplified Implementation:** AR(1) with mean-reversion

```
Forecast[t] = Mean + φ*(Previous_Demand - Mean)

Where φ = 0.85 (AR coefficient with mean-reversion)
```

**Characteristics:**
- Regresses toward historical mean, not zero
- Captures momentum but doesn't grow unbounded
- Effective for mean-reverting processes

---

### 5. Prophet (Facebook's Forecasting Algorithm Simulation)

**Best For:** Holiday/special event adjustments; bullish growth scenarios

**Simplified Implementation:** Additive model with all-history seasonality

```
Forecast[t] = Trend + Seasonality + Error

Trend = (Last_Value - First_Value) / n * 1.2
Seasonality = Monthly_Average - Overall_Mean
```

**Note:** This is a simplified adaptation, not the full Prophet algorithm

**Characteristic:** Applies +20% growth boost, useful for scenario planning

---

## Accuracy Metrics

### MAPE (Mean Absolute Percentage Error)

**Formula:**
```
MAPE = (1/n) * Σ|Actual[i] - Forecast[i]| / |Actual[i]| * 100%

Where Actual[i] ≠ 0
```

**Interpretation:**
- 0% = Perfect forecast
- < 10% = Excellent
- 10-20% = Good
- 20-50% = Acceptable
- > 50% = Poor

**Handles Zero Actuals:** Automatically excludes periods with zero actual demand (to avoid division by zero)

**Best For:** Comparing forecast accuracy across products with different scales

---

### MAPE Corrected (Zero-Aware)

**Purpose:** Evaluates forecasting of zero-demand periods (important for intermittent products)

**Formula:**
```
IF Actual[i] = 0:
  IF Forecast[i] = 0 → Error = 0%     [✓ Correct prediction]
  IF Forecast[i] > 0 → Error = 100%   [✗ Predicted demand when none occurred]

ELSE:
  Error = |Actual[i] - Forecast[i]| / Actual[i] * 100%

MAPE_Corrected = Average(All Errors)
```

**Use Case:** Assessing performance on sparse SKUs where zero-forecasting is common

**Example:**
```
Actual:   [0, 0, 5, 0]
Forecast: [0, 2, 5, 0]
           ✓  ✗  ✓  ✓

MAPE Corrected = (0 + 100 + 0 + 0) / 4 = 25%
```

---

### Accuracy

**Formula:**
```
Accuracy = 100% - MAPE
```

**Range:** 0-100%

---

### RMSE (Root Mean Square Error)

**Formula:**
```
RMSE = √[(1/n) * Σ(Actual[i] - Forecast[i])²]
```

**Interpretation:**
- Same units as demand
- Heavily penalizes large errors
- Useful for operational planning

---

### Bias

**Formula:**
```
Bias = [(Σ(Forecast[i]) - Σ(Actual[i])) / Σ(Actual[i])] * 100%

Positive Bias = Over-forecasting
Negative Bias = Under-forecasting
```

**Interpretation:**
- 0% = Unbiased
- ±5% = Acceptable
- ±10% = Significant bias

---

### MAD (Mean Absolute Deviation)

**Formula:**
```
MAD = (1/n) * Σ|Actual[i] - Forecast[i]|
```

**Use:** Safety stock calculations; simpler alternative to standard deviation

---

## Data Preprocessing

### Gap Filling for Time Series

**Purpose:** Fill missing months with zero-demand to show true sparsity to Holt-Winters

**Process:**
1. Sort data chronologically
2. Detect all gaps between consecutive months
3. Insert zero-demand points for each missing month
4. Feed complete gap-filled series to forecasting algorithm

**Rationale:** HW expects regular monthly intervals. Without gap-filling, sparse products are treated as having more consistent patterns than reality.

**Example:**
```
Raw Data:        [2024-01: 100, 2024-03: 50, 2024-06: 75]
After Gap-Fill:  [2024-01: 100, 2024-02: 0, 2024-03: 50, 
                   2024-04: 0, 2024-05: 0, 2024-06: 75]
```

---

### Anomaly Cleaning (Outlier Smoothing)

**Purpose:** Smooth extreme outliers that distort forecast patterns

**Method:** Z-score based detection and replacement

```
IF |Demand[i] - Mean| > 2.5*StdDev
  → Replace with Mean
ELSE
  → Keep original
```

**Threshold:** 2.5 standard deviations (~98.8% confidence)

**Note:** This is optional preprocessing; enable for noisy demand data

---

### Seasonal Decomposition

**Method:** Classical additive/multiplicative decomposition

**Steps:**
1. Calculate overall mean across all data
2. For each month (1-12), average across all years
3. Compute deviation from overall mean:
   - **Additive:** `Seasonal[m] = Month_Avg - Overall_Mean`
   - **Multiplicative:** `Seasonal[m] = Month_Avg / Overall_Mean`

**Characteristic:** Uses ALL available history, not just recent years

---

## Confidence Intervals

### Upper & Lower Bounds

**Formula:**
```
LowerBound[t] = Forecast[t] - (Z * σ * √t)
UpperBound[t] = Forecast[t] + (Z * σ * √t)

Where:
Z = Critical value from standard normal distribution
σ = Historical standard deviation
t = Number of periods ahead
```

**Z-Score Mapping (Standard Normal):**

| Confidence Level | Z-Score |
|-----------------|---------|
| 80% | 1.28 |
| 85% | 1.44 |
| 90% | 1.645 |
| 95% | 1.96 |
| 99% | 2.576 |

**Uncertainty Growth:** Bounds expand proportionally to √t (forecast horizon)

---

## Supply Chain Calculations

### Safety Stock

**Formula:**
```
Safety Stock = Z_α * σ_d * √(LT/30)

Where:
Z_α = Service level z-score
σ_d = Standard deviation of historical demand
LT = Lead time in days
30 = Days per month (for normalization)
```

**Service Level Z-Scores:**

| Service Level | Z-Score | Meaning |
|--------------|---------|---------|
| 80% | 0.84 | 1 stockout per 5 years |
| 85% | 1.04 | 1 stockout per 6-7 years |
| 90% | 1.28 | 1 stockout per 10 years |
| 95% | 1.645 | 1 stockout per 20 years |
| 98% | 2.05 | 1 stockout per 50 years |
| 99% | 2.33 | 1 stockout per 100 years |

**Volatility Adjustment:**
```
Adjusted_LT = LT * (1 + Volatility_Multiplier)
```

Used during supply chain stress testing to simulate supplier uncertainty

---

### Reorder Point

**Formula:**
```
Reorder Point = (Average_Daily_Demand * Adjusted_LT) + Safety_Stock

Where:
Average_Daily_Demand = Forecasted_Monthly_Demand / 30
Adjusted_LT = Lead_Time * (1 + Volatility_Multiplier)
```

**Interpretation:** When on-hand inventory drops to this level, place new order

---

### Projected Inventory

**Formula:**
```
Inventory[t] = Inventory[t-1] - Demand[t] + Incoming_Production[t]

Where:
Demand[t] = Forecasted demand (or scenario-adjusted forecast)
Incoming_Production[t] = Sum of POs/production runs expected in month t
```

**Logic:**
1. Start with current on-hand inventory
2. Deduct each month's forecasted demand
3. Add incoming production/POs
4. Track month-by-month projection

---

### Inventory Value

**Formula:**
```
Inventory Value = Projected_Inventory * Unit_Cost
```

**Calculation Method:**
- Uses SKU-specific unit cost from product attributes
- Falls back to portfolio average if SKU-specific cost unavailable
- Updated each period based on projected inventory level

---

### Projected Revenue

**Formula:**
```
Projected_Revenue = Forecasted_Demand * Selling_Price

Or with Scenario:
Projected_Revenue = Scenario_Adjusted_Demand * Selling_Price
```

**Note:** Calculated only for forecast periods (not historical)

---

### Projected Margin

**Formula:**
```
Projected_Margin = Forecasted_Demand * (Selling_Price - Unit_Cost)
Projected_Margin$ = Margin per unit * Quantity
```

**Note:** Contribution margin, not net margin

---

## Pareto Analysis (ABC Classification)

**Purpose:** Segment inventory by volume contribution (80/20 rule)

**Method:**
```
1. Sort SKUs by total volume (descending)
2. Calculate cumulative volume %, starting from top
3. Classify by cumulative percentage:
   - A: Cumulative % ≤ 80%  [Top 20% of SKUs, 80% of volume]
   - B: Cumulative % ≤ 95%  [Middle SKUs]
   - C: Cumulative % > 95%   [Long tail, 5% of volume]
```

**Use Case:** Prioritize forecasting effort and inventory investment

**Example:**
```
Rank  SKU        Volume   Cumsum    %      Grade
1     SKU-101    10,000   10,000    50%    A
2     SKU-202    8,000    18,000    80%    A
3     SKU-305    5,000    23,000    88%    B
4     SKU-408    3,000    26,000    95%    B
5     SKU-501    1,500    27,500    99%    C
6     SKU-602    500      28,000    100%   C

Action: Focus forecasting on A items, standard for B, simple for C
```

---

## Scenario Analysis

### Applying Market Shocks

**Purpose:** Adjust forecasts for known market events

**Formula:**
```
Forecast_Adjusted = Base_Forecast * (1 + Shock_Percentage/100)

All downstream metrics recalculate:
- Projected Revenue = Adjusted_Forecast * Price
- Projected Inventory = Inventory[t-1] - Adjusted_Forecast
- Projected Margin = Adjusted_Forecast * (Price - Cost)
```

**Use Cases:**
- Promotional campaigns (increase demand) → +20%
- Price increases (decrease demand) → -10%
- Supply disruptions → adjust lead time instead
- New product launch → +50%

---

### Volatility/Resiliency Adjustments

**Purpose:** Stress-test supply chain during uncertainty

**Formula:**
```
Volatility_Multiplier = 0.0 to 1.0  [0% to 100% increase]

Adjusted_Lead_Time = Lead_Time * (1 + Volatility_Multiplier)
Adjusted_Safety_Stock = Z * σ * √(Adjusted_LT/30)
```

**Effect:** Simulates longer/more uncertain lead times
- Increases safety stock buffer
- Raises reorder points
- Ensures higher fill rates during disruption scenarios

---

## Comparison Matrix

### Which Method to Choose?

| Demand Pattern | Recommended Method | Reason |
|---|---|---|
| Seasonal, stable volume | Multiplicative HW | Captures recurring patterns |
| Seasonal, highly volatile | Additive HW | Handles volatility better |
| Sparse/intermittent (10-30% zero) | Croston | Purpose-built for intermittent demand |
| Trending upward/downward | Linear | Captures growth/decline trajectory |
| Mean-reverting/stationary | ARIMA | Auto-correlation structure |
| Bullish growth scenario | Prophet | Applies optimistic 1.2x trend multiplier |
| Uncertain/new product | Holt-Winters Auto | Let system choose based on CV, trend, sparsity |

**Recommended Default:** Holt-Winters with Auto-Detection

---

## Implementation Details

### Training Window

**Definition:** Historical data up to `trainingDataEndDate`

**Used For:** Calculate all model parameters (level, trend, seasonal factors)

**Why Separate?** Allows realistic backtesting by:
1. Training on past data
2. Forecasting future periods
3. Comparing to actual future outcomes

---

### Forecast Point Structure

```typescript
{
  date: "2024-05-01",           // YYYY-MM-01 format
  historical: 1250,             // Actual value (if not forecast)
  forecast: 1320,               // Base forecast
  scenarioForecast: 1450,       // Forecast with scenario applied
  isForecast: true,             // Is this a forecasted period?
  
  // Confidence bounds
  lowerBound: 1050,             // 95% CI lower
  upperBound: 1590,             // 95% CI upper
  
  // Supply chain metrics
  safetyStock: 250,
  reorderPoint: 1800,
  projectedInventory: 500,
  incomingProduction: 300,
  
  // Financial projection
  projectedRevenue: 198000,     // forecast * price
  projectedMargin: 63200,       // forecast * (price - cost)
  inventoryValue: 50000         // inventory * cost
}
```

---

## Calibration & Tuning

### Smoothing Coefficients

Current values are conservative:
- `α = 0.3` (slow level adjustment)
- `β = 0.1` (slow trend adjustment)  
- `γ = 0.05` (slow seasonal adjustment)

**To increase responsiveness:** Increase α/β/γ (range: 0.0-1.0)

**To smooth/dampen:** Decrease α/β/γ

---

### Croston's Alpha

Currently `α = 0.1` (conservative)

**For more responsive:** Increase to 0.2-0.3
**For more stable:** Decrease to 0.05

---

### Confidence Level

Default: 95% (Z = 1.96)

**For higher safety stock:** Use 99% (Z = 2.576)
**For lower cost/risk:** Use 90% (Z = 1.645)

---

## Accuracy Improvement

### Data Quality First

1. **Fix date formats** → All dates normalized to YYYY-MM-01
2. **Remove duplicates** → Consolidate multiple entries per month
3. **Cap outliers** → Use anomaly cleaning for extreme values
4. **Fill gaps** → Ensure continuous monthly data

### Algorithm Selection

1. **Try multiple methods** → Compare MAPE on holdout data
2. **Review demand pattern** → Sparse? Use Croston. Trending? Use Linear.
3. **Use auto-detection** → Let system choose based on CV, sparsity, trend
4. **Backtest thoroughly** → Evaluate on actual data from 3+ months

### Parameter Tuning

1. **Start conservative** → α=0.3, β=0.1, γ=0.05
2. **Adjust if biased** → Increase α if lagging actual
3. **Reduce if noisy** → Increase L (seasonal period) or disable gamm
4. **Test before deploy** → Verify MAPE on validation set

---

## Limitations & Assumptions

### Holt-Winters

- Assumes consistent monthly seasonality (L=12)
- Does not handle step-change level shifts well
- Limited to linear trends (not polynomial growth)
- Requires at least 2 full seasonal cycles (24 months recommended)

### MAPE Metric

- Undefined for zero-actual periods (excluded from calculation)
- Not suitable for data with many zeros (use RMSE or MAD instead)
- Gives more weight to smaller values (percentage-based)

### Confidence Intervals

- Assume normally distributed forecast errors
- Width grows with forecast horizon (√t)
- May be too wide for intermittent demand (use safety stock instead)

### Safety Stock

- Assumes demand variability dominates (vs supply variability)
- Single-period model (assumes one order outstanding)
- Does not account for demand autocorrelation

---

## References

**Holt-Winters Method**
- Holt, C. C. (2004). "Forecasting seasonals and trends by exponentially weighted moving averages"
- Winters, P. R. (1960). "Forecasting sales by exponentially weighted moving averages"

**Croston's Method**
- Croston, J. D. (1972). "Forecasting and stock control for intermittent demands"

**Safety Stock Formula**
- Silver, E. A., Pyke, D. F., & Peterson, R. (2016). "Inventory and production management in supply chains"

**Pareto Analysis**
- Vilfredo, P. (1896). "The Law of Pareto" [80/20 principle]

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | Feb 2026 | Auto HW detection, zero-aware MAPE, confidence intervals |
| 1.5 | Jan 2026 | Croston's method, scenario analysis, Pareto classification |
| 1.0 | Dec 2025 | Initial release (HW multiplicative, linear, ARIMA, Prophet) |

---

**Status:** Production Ready  
**Last Tested:** February 20, 2026  
**Next Review:** May 2026 (quarterly)  
