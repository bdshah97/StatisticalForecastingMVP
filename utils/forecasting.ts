/**
 * Corrected MAPE: Gives credit for correct zero-actual/zero-forecast pairs (0% error),
 * penalizes zero-actual/nonzero-forecast pairs (100% error),
 * otherwise uses standard MAPE formula.
 */
export const calculateMAPECorrected = (actual: number[], forecast: number[]): number => {
  const n = Math.min(actual.length, forecast.length);
  let sumPct = 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    const a = actual[i];
    const f = forecast[i];
    if (a === 0) {
      if (f === 0) {
        sumPct += 0; // perfect prediction
      } else {
        sumPct += 100; // maximum penalty
      }
      count++;
    } else {
      sumPct += Math.abs((a - f) / a) * 100;
      count++;
    }
  }
  return count > 0 ? (sumPct / count) : 0;
};
// Croston's method for intermittent demand forecasting
const runCroston = (values: number[], horizon: number): number[] => {
  let n = values.length;
  let alpha = 0.1;
  let z = 0, p = 0;
  let lastNonZero = -1;
  // Find first nonzero demand
  for (let i = 0; i < n; i++) {
    if (values[i] > 0) {
      z = values[i];
      p = i + 1;
      lastNonZero = i;
      break;
    }
  }
  if (lastNonZero === -1) {
    // All zero demand
    return Array(horizon).fill(0);
  }
  for (let t = lastNonZero + 1; t < n; t++) {
    if (values[t] > 0) {
      let interval = t - lastNonZero;
      z = z + alpha * (values[t] - z);
      p = p + alpha * (interval - p);
      lastNonZero = t;
    }
  }
  let crostonForecast = z / p;
  let forecastArr = Array(horizon).fill(crostonForecast);
  return forecastArr;
};

import { DataPoint, ForecastPoint, ForecastMetrics, ForecastMethodology, MarketShock, TimeInterval } from '../types.ts';

/**
 * Fill gaps in time series with zeros for missing months.
 * This ensures HW sees the real sparse pattern instead of treating non-consecutive points as consecutive.
 */
const fillTimeSeriesGaps = (dataPoints: DataPoint[]): DataPoint[] => {
  if (dataPoints.length < 2) return dataPoints;
  
  const sorted = [...dataPoints].sort((a, b) => a.date.localeCompare(b.date));
  const filled: DataPoint[] = [];
  
  for (let i = 0; i < sorted.length; i++) {
    filled.push(sorted[i]);
    
    if (i < sorted.length - 1) {
      const currentDate = new Date(sorted[i].date);
      const nextDate = new Date(sorted[i + 1].date);
      
      // Normalize to 1st of month for comparison
      currentDate.setDate(1);
      nextDate.setDate(1);
      
      // Fill gap months with zeros
      const gapDate = new Date(currentDate);
      gapDate.setMonth(gapDate.getMonth() + 1);
      
      while (gapDate < nextDate) {
        const gapDateStr = gapDate.toISOString().split('T')[0].substring(0, 7) + '-01';
        filled.push({
          date: gapDateStr,
          quantity: 0,
          sku: sorted[i].sku,
          category: sorted[i].category
        });
        gapDate.setMonth(gapDate.getMonth() + 1);
      }
    }
  }
  
  return filled;
};

/**
 * Statistics Helpers
 */
const getStdDev = (values: number[]) => {
  const n = values.length;
  if (n === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  return Math.sqrt(values.reduce((sq, x) => sq + Math.pow(x - mean, 2), 0) / n);
};

const getZMultiplier = (conf: number) => {
  // Precision mapping for statistical confidence levels
  if (conf >= 99) return 2.576;
  if (conf >= 95) return 1.96;
  if (conf >= 90) return 1.645;
  if (conf >= 85) return 1.44;
  if (conf >= 80) return 1.28;
  return 1.96; // Default to 95%
};

/**
 * Auto-detect best Holt-Winters variant (Additive vs Multiplicative)
 * Based on data characteristics: coefficient of variation, early sparsity, and trend strength
 */
export const detectHWMethod = (values: number[]): 'additive' | 'multiplicative' => {
  if (values.length < 4) {
    console.log('🔍 HW Method Decision: Too few values, defaulting to additive');
    return 'additive';
  }

  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;

  // 1. Coefficient of Variation (volatility relative to mean)
  const stdDev = getStdDev(values);
  const cv = mean > 0 ? stdDev / mean : 0;

  // 2. Early Sparsity (% of very low/zero values in first 25% of data)
  const earlyDataSize = Math.ceil(n * 0.25);
  const earlyValues = values.slice(0, earlyDataSize);
  const lowValueThreshold = mean * 0.2; // Values below 20% of mean are considered "low"
  const sparseCount = earlyValues.filter(v => v === 0 || v < lowValueThreshold).length;
  const earlySparsity = earlyValues.length > 0 ? sparseCount / earlyValues.length : 0;

  // 3. Trend Strength (slope of linear regression)
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const trendStrength = Math.abs(slope) / (mean > 0 ? mean : 1); // Normalized slope

  // Log all decision factors
  console.log(`🔍 HW Method Decision: n=${n}, mean=${mean.toFixed(2)}, stdDev=${stdDev.toFixed(2)}, cv=${cv.toFixed(2)}, earlySparsity=${earlySparsity.toFixed(2)}, trendStrength=${trendStrength.toFixed(2)}`);

  // **NEW: Check for low-volume OR high-volatility SKUs** - these MUST use additive
  // Low volume (< 1000 avg) OR extreme volatility (CV > 0.8) = use additive
  if (mean < 1000 || cv > 0.8) {
    console.log('🔍 HW Method Decision: ADDITIVE (low volume or extreme volatility)');
    return 'additive';
  }

  // Decision logic
  // Use ADDITIVE if:
  // - High volatility (CV > 0.5) OR
  // - Sparse early data (>40% zeros/lows) OR
  // - Strong growth trend (trend > 0.05 normalized)
  if (cv > 0.5 || earlySparsity > 0.4 || trendStrength > 0.05) {
    console.log('🔍 HW Method Decision: ADDITIVE (high volatility, sparsity, or strong trend)');
    return 'additive';
  }

  console.log('🔍 HW Method Decision: MULTIPLICATIVE');
  return 'multiplicative';
};

/**
 * Apply Market Shocks to Forecasts
 */
export const applyMarketShocks = (forecastPoints: ForecastPoint[], shocks: MarketShock[]): ForecastPoint[] => {
  if (shocks.length === 0) return forecastPoints;
  
  return forecastPoints.map(point => {
    const shock = shocks.find(s => s.month === point.date.substring(0, 7)); // Extract YYYY-MM from date
    if (shock && point.isForecast) {
      const multiplier = 1 + (shock.percentageChange / 100);
      return {
        ...point,
        forecast: Math.round(point.forecast * multiplier),
        scenarioForecast: point.scenarioForecast ? Math.round(point.scenarioForecast * multiplier) : undefined,
        projectedInventory: point.projectedInventory ? Math.round(point.projectedInventory * multiplier) : undefined,
        projectedRevenue: point.projectedRevenue ? Math.round(point.projectedRevenue * multiplier) : undefined,
        projectedMargin: point.projectedMargin ? Math.round(point.projectedMargin * multiplier) : undefined
      };
    }
    return point;
  });
};

/**
 * Anomaly Cleaning (Outlier Smoothing)
 */
export const cleanAnomalies = (data: DataPoint[]): DataPoint[] => {
  const values = data.map(d => d.quantity);
  const mean = values.reduce((a, b) => a + b, 0) / (values.length || 1);
  const std = getStdDev(values);
  
  return data.map(d => {
    const isAnomaly = Math.abs(d.quantity - mean) > 2.5 * std;
    return isAnomaly ? { ...d, quantity: Math.round(mean) } : d;
  });
};

/**
 * Holt-Winters Additive (Better for sparse/volatile data or products with growth ramp-ups)
 */
const runHoltWintersAdditive = (values: number[], horizon: number, L: number): number[] => {
  const alpha = 0.3, beta = 0.1, gamma = 0.05;
  const n = values.length;
  
  // Use average of LAST 12 months as initial level (not all data)
  const recentPeriod = Math.min(L, n);
  const level0 = values.slice(-recentPeriod).reduce((a, b) => a + b, 0) / recentPeriod || 1;
  let level = level0;
  let trend = 0;
  
  // Initialize seasonal factors using averages across ALL years for each month
  const seasonal = new Array(L).fill(0);
  const seasonalCounts = new Array(L).fill(0);
  for (let i = 0; i < n; i++) {
    seasonal[i % L] += values[i];
    seasonalCounts[i % L]++;
  }
  const overallMean = values.reduce((a, b) => a + b, 0) / n;
  for (let i = 0; i < L; i++) {
    if (seasonalCounts[i] > 0) {
      seasonal[i] = (seasonal[i] / seasonalCounts[i]) - overallMean;
    }
  }
  
  // Count zeros in training data
  const zeroCount = values.filter(v => v === 0).length;
  const zeroPct = ((zeroCount / n) * 100).toFixed(1);
  
  // Log initial state
  console.log(`🔬 HW Additive INIT: n=${n}, zeros=${zeroCount} (${zeroPct}%), level0=${level0.toFixed(1)}, overallMean=${overallMean.toFixed(1)}`);
  console.log(`🔬 HW Additive SEASONAL INIT: [${seasonal.map(s => s.toFixed(1)).join(', ')}]`);
  
  for (let i = 0; i < n; i++) {
    const value = values[i];
    const prevLevel = level;
    level = alpha * (value - seasonal[i % L]) + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    seasonal[i % L] = gamma * (value - level) + (1 - gamma) * seasonal[i % L];
  }
  
  // Log final state
  console.log(`🔬 HW Additive FINAL: level=${level.toFixed(1)}, trend=${trend.toFixed(2)}`);
  console.log(`🔬 HW Additive SEASONAL FINAL: [${seasonal.map(s => s.toFixed(1)).join(', ')}]`);
  
  const forecast = [];
  for (let i = 1; i <= horizon; i++) {
    const fc = Math.max(0, level + i * trend + seasonal[(n + i - 1) % L]);
    forecast.push(fc);
  }
  
  console.log(`🔬 HW Additive FORECAST (first 6): [${forecast.slice(0, 6).map(f => f.toFixed(0)).join(', ')}]`);
  
  return forecast;
};

/**
 * Holt-Winters Multiplicative (Better for steady-state products with consistent seasonality)
 */
const runHoltWintersMultiplicative = (values: number[], horizon: number, L: number): number[] => {
  const alpha = 0.3, beta = 0.1, gamma = 0.05;
  const n = values.length;
  
  // Use average of LAST 12 months as initial level (not first 12)
  const recentPeriod = Math.min(L, n);
  const level0 = values.slice(-recentPeriod).reduce((a, b) => a + b, 0) / recentPeriod || 1;
  
  let level = level0;
  let trend = 0; // Start with no trend assumption
  
  // Initialize seasonal factors using averages across ALL years for each month
  const seasonal = new Array(L).fill(1);
  const seasonalSums = new Array(L).fill(0);
  const seasonalCounts = new Array(L).fill(0);
  for (let i = 0; i < n; i++) {
    seasonalSums[i % L] += values[i];
    seasonalCounts[i % L]++;
  }
  const overallMean = values.reduce((a, b) => a + b, 0) / n || 1;
  for (let i = 0; i < L; i++) {
    if (seasonalCounts[i] > 0 && overallMean > 0) {
      seasonal[i] = (seasonalSums[i] / seasonalCounts[i]) / overallMean;
    }
  }
  
  for (let i = 0; i < n; i++) {
    const value = values[i];
    const prevLevel = level;
    level = alpha * (value / (seasonal[i % L] || 1)) + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    seasonal[i % L] = gamma * (value / (level || 1)) + (1 - gamma) * seasonal[i % L];
  }
  
  const forecast = [];
  for (let i = 1; i <= horizon; i++) {
    forecast.push(Math.max(0, (level + i * trend) * seasonal[(n + i - 1) % L]));
  }
  return forecast;
};

/**
 * Wrapper to choose between HW methods
 */
const runHoltWinters = (values: number[], horizon: number, L: number, method: 'additive' | 'multiplicative' = 'multiplicative'): number[] => {
  return method === 'additive' 
    ? runHoltWintersAdditive(values, horizon, L)
    : runHoltWintersMultiplicative(values, horizon, L);
};

/**
 * Prophet-Inspired Simulation (Additive Trend + Full History Seasonality)
 */
const runProphet = (values: number[], horizon: number): number[] => {
  const n = values.length;
  const L = 12; // Monthly seasonality
  const forecast = [];
  
  // Calculate trend from all available data
  const avgGrowth = (values[n-1] - values[0]) / n;
  
  // Calculate seasonal factors from all data
  const mean = values.reduce((a, b) => a + b) / n;
  const seasonal = Array(L).fill(0);
  for (let i = 0; i < n; i++) {
    seasonal[i % L] += (values[i] - mean);
  }
  for (let i = 0; i < L; i++) {
    seasonal[i] /= Math.ceil(n / L);
  }

  for (let i = 1; i <= horizon; i++) {
    const seasonalBase = seasonal[(i - 1) % 12];
    // Add slightly bullish trend for Prophet simulation
    const simulatedVal = seasonalBase + mean + (avgGrowth * 1.2 * i);
    forecast.push(Math.max(0, Math.round(simulatedVal)));
  }
  return forecast;
};

/**
 * ARIMA Simulation (Auto-Regressive, focusing on last few lags)
 */
const runArima = (values: number[], horizon: number): number[] => {
  const n = values.length;
  const forecast = [];
  let currentVal = values[n-1];
  const arCoefficient = 0.85; // Strong AR factor

  for (let i = 1; i <= horizon; i++) {
    // Regress towards the long term mean
    const mean = values.reduce((a,b) => a+b, 0) / n;
    currentVal = mean + arCoefficient * (currentVal - mean);
    forecast.push(Math.max(0, currentVal));
  }
  return forecast;
};

const runLinear = (values: number[], horizon: number): number[] => {
  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) { sumX += i; sumY += values[i]; sumXY += i * values[i]; sumXX += i * i; }
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const forecast = [];
  for (let i = 1; i <= horizon; i++) forecast.push(Math.max(0, slope * (n + i - 1) + intercept));
  return forecast;
};

export const calculateForecast = (
  historicalData: DataPoint[],
  horizon: number,
  trainingDataEndDate: string,
  interval: 'monthly' = 'monthly',
  confidenceLevel: number = 95,
  method: ForecastMethodology = ForecastMethodology.HOLT_WINTERS,
  hwMethod: 'additive' | 'multiplicative' = 'multiplicative',
  autoDetectHW: boolean = false
): ForecastPoint[] => {
  if (historicalData.length < 3 || !trainingDataEndDate) return [];

  // Split data: training (through trainingDataEndDate) and all historical (for display)
  const rawTrainingData = historicalData.filter(d => d.date <= trainingDataEndDate);
  if (rawTrainingData.length < 3) return [];

  // Fill gaps with zeros so HW sees real sparse pattern
  const trainingData = fillTimeSeriesGaps(rawTrainingData);
  
  // Debug log: show original vs gap-filled
  console.log(`🔍 Gap-filling: ${rawTrainingData.length} original points → ${trainingData.length} with gaps filled`);
  console.log('🔍 Holt-Winters Training Window:', trainingData.map(d => `${d.date}:${d.quantity}`).join(', '));

  const values = trainingData.map(d => d.quantity);
  const L = 12; // Monthly seasonality

  // Auto-detect HW method if requested
  let effectiveHWMethod = hwMethod;
  if (method === ForecastMethodology.HOLT_WINTERS && autoDetectHW) {
    effectiveHWMethod = detectHWMethod(values);
  }

  let forecastValues: number[];
  switch (method) {
    case ForecastMethodology.LINEAR:
      forecastValues = runLinear(values, horizon); break;
    case ForecastMethodology.PROPHET:
      forecastValues = runProphet(values, horizon); break;
    case ForecastMethodology.ARIMA:
      forecastValues = runArima(values, horizon); break;
    case ForecastMethodology.CROSTON:
      forecastValues = runCroston(values, horizon); break;
    case ForecastMethodology.HOLT_WINTERS:
    default:
      forecastValues = runHoltWinters(values, horizon, L, effectiveHWMethod); break;
  }

  // Return all historical data points (even those after trainingDataEndDate)
  const results: ForecastPoint[] = historicalData.map(d => ({
    date: d.date,
    historical: d.quantity,
    forecast: d.quantity,
    isForecast: d.date > trainingDataEndDate // Mark based on training boundary
  }));

  // Generate forecast starting from month after trainingDataEndDate
  const multiplier = getZMultiplier(confidenceLevel);
  const stdDev = getStdDev(values);
  
  // Normalize lastDate to 1st of month to avoid day-of-month issues during month arithmetic
  const lastDate = new Date(trainingDataEndDate);
  lastDate.setDate(1); // Set to 1st of month to prevent month-skipping during arithmetic

  forecastValues.forEach((val, i) => {
    const step = i + 1;
    const forecastDate = new Date(lastDate);
    forecastDate.setMonth(lastDate.getMonth() + step);

    const uncertainty = multiplier * stdDev * Math.sqrt(step) * 0.4;
    const normalizedDate = forecastDate.toISOString().split('T')[0].substring(0, 7) + '-01';
    results.push({
      date: normalizedDate,
      forecast: Math.round(val),
      lowerBound: Math.max(0, Math.round(val - uncertainty)),
      upperBound: Math.round(val + uncertainty),
      isForecast: true
    });
  });

  return results;
};

export const calculateMetrics = (actual: number[], forecast: number[], unitCost: number, sellingPrice: number): ForecastMetrics => {
  let sumAbsError = 0, sumSqError = 0, sumActual = 0, sumError = 0;
  const n = Math.min(actual.length, forecast.length);
  for (let i = 0; i < n; i++) {
    const error = forecast[i] - actual[i];
    sumError += error;
    sumAbsError += Math.abs(error);
    sumSqError += error * error;
    sumActual += actual[i];
  }
  // Compute MAPE at the individual pair (sku-month) level then average
  let sumPct = 0;
  let pctCount = 0;
  for (let i = 0; i < n; i++) {
    const a = actual[i];
    const f = forecast[i];
    if (a === 0) continue; // skip zero-actual periods to avoid divide-by-zero
    sumPct += Math.abs((a - f) / a) * 100;
    pctCount++;
  }
  const mape = pctCount > 0 ? (sumPct / pctCount) : 0;
  return {
    mape,
    rmse: Math.sqrt(sumSqError / (n || 1)),
    bias: (sumError / (sumActual || 1)) * 100,
    mad: sumAbsError / (n || 1),
    accuracy: Math.max(0, 100 - mape),
    holdingCostRisk: 0,
    stockoutRevenueRisk: 0
  };
};

/**
 * Calculate MAPE by computing percentage error per pair (sku-month) and averaging.
 * Skips pairs where actual === 0 to avoid divide-by-zero.
 */
export const calculateMAPE = (actual: number[], forecast: number[]): number => {
  const n = Math.min(actual.length, forecast.length);
  let sumPct = 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    const a = actual[i];
    const f = forecast[i];
    if (a === 0) continue;
    sumPct += Math.abs((a - f) / a) * 100;
    count++;
  }
  return count > 0 ? (sumPct / count) : 0;
};

/**
 * Legacy weighted-MAPE (wMAPE) kept for compatibility: sum(|A-F|)/sum(|A|)
 */
export const calculateWMape = (actual: number[], forecast: number[]): number => {
  const n = Math.min(actual.length, forecast.length);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += Math.abs(actual[i] - forecast[i]);
    den += Math.abs(actual[i]);
  }
  return den > 0 ? (num / den) * 100 : 0;
};

