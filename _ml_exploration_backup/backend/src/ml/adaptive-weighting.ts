/**
 * Dynamic Ensemble Weighting System
 * Automatically adjusts method weights based on data characteristics
 * 
 * Key principle: Methods that fail on specific SKU types get lower weights
 * - Seasonal products: HW gets high weight (understands seasonality)
 * - Chaotic products: XGBoost gets high weight (learns from noise)
 * - Growing products: Prophet gets high weight (explicit trend modeling)
 */

import { SkuMonthAggregate, ForecastResult } from '../types';

export interface MethodWeights {
  hw: number;
  prophet: number;
  arima: number;
  linear: number;
  xgb: number;
}

export interface SKUCharacteristics {
  sku: string;
  volatility: number;        // 0-1: How chaotic is demand?
  seasonality: number;        // 0-1: How seasonal is it?
  trend: number;              // -1 to 1: Growing (positive) or declining (negative)
  dataPoints: number;         // How much history do we have?
  sparsity: number;           // 0-1: How many zero/low values?
}

/**
 * Analyze a single SKU's characteristics
 */
export const analyzeSKUCharacteristics = (
  skuData: SkuMonthAggregate[]
): SKUCharacteristics | null => {
  if (skuData.length < 3) return null;

  // Sort by yearMonth to ensure chronological order
  const sorted = [...skuData].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
  const quantities = sorted.map(d => d.quantity);
  const n = quantities.length;

  // 1. VOLATILITY: Coefficient of Variation (std / mean)
  const mean = quantities.reduce((a, b) => a + b, 0) / n;
  const variance = quantities.reduce((sq, x) => sq + Math.pow(x - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? stdDev / mean : 0;
  const volatility = Math.min(1, cv); // Normalize to 0-1

  // 2. SEASONALITY: Peak-to-trough variation in monthly patterns
  // If we have 12+ months, can analyze seasonal pattern
  let seasonality = 0;
  if (n >= 12) {
    const monthlyAvgs: Map<number, number[]> = new Map();
    for (let i = 0; i < n; i++) {
      const month = parseInt(sorted[i].yearMonth.split('-')[1]);
      if (!monthlyAvgs.has(month)) monthlyAvgs.set(month, []);
      monthlyAvgs.get(month)!.push(quantities[i]);
    }

    const monthMeans = Array.from(monthlyAvgs.values()).map(
      vals => vals.reduce((a, b) => a + b, 0) / vals.length
    );

    const monthMean = monthMeans.reduce((a, b) => a + b, 0) / monthMeans.length;
    const monthVariance = monthMeans.reduce((sq, x) => sq + Math.pow(x - monthMean, 2), 0) / monthMeans.length;
    const monthStdDev = Math.sqrt(monthVariance);
    seasonality = Math.min(1, monthMean > 0 ? monthStdDev / monthMean : 0);
  }

  // 3. TREND: Linear slope over time
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += quantities[i];
    sumXY += i * quantities[i];
    sumXX += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const trendMagnitude = mean > 0 ? slope / mean : 0; // Normalized slope
  const trend = Math.max(-1, Math.min(1, trendMagnitude)); // Clamp to -1 to 1

  // 4. SPARSITY: % of zero or very low values
  const lowThreshold = mean * 0.2;
  const lowCount = quantities.filter(q => q === 0 || q < lowThreshold).length;
  const sparsity = lowCount / n;

  return {
    sku: skuData[0].sku,
    volatility,
    seasonality,
    trend,
    dataPoints: n,
    sparsity
  };
};

/**
 * Calculate method weights based on SKU characteristics
 * Returns weights that sum to 1.0
 */
export const calculateMethodWeights = (
  characteristics: SKUCharacteristics,
  xgbAvailable: boolean = true
): MethodWeights => {
  // Start with base weights (equal distribution)
  let hw = 0.20;
  let prophet = 0.20;
  let arima = 0.20;
  let linear = 0.20;
  let xgb = xgbAvailable ? 0.20 : 0;

  const { volatility, seasonality, trend, sparsity } = characteristics;

  // RULE 1: Chaotic/Volatile products → trust XGBoost more
  if (volatility > 0.7) {
    if (xgbAvailable) {
      xgb += 0.25;
      hw -= 0.10;
      prophet -= 0.10;
      arima -= 0.05;
    } else {
      // Fallback if XGBoost not available: use ARIMA (mean reversion)
      arima += 0.15;
      hw -= 0.10;
      prophet -= 0.05;
    }
  }

  // RULE 2: Seasonal products → trust HW more
  if (seasonality > 0.6) {
    hw += 0.15;
    prophet += 0.05;
    if (xgbAvailable) xgb -= 0.10;
    linear -= 0.10;
  }

  // RULE 3: Growing/Trending products → trust Prophet more
  if (Math.abs(trend) > 0.08) {
    prophet += 0.10;
    if (trend > 0) {
      // Positive trend: Prophet's optimism is good
      if (xgbAvailable) xgb += 0.05;
    } else {
      // Negative trend: be cautious
      linear -= 0.05;
      if (xgbAvailable) xgb += 0.05;
    }
  }

  // RULE 4: Very sparse/new products → reduce all methods, increase Linear
  if (sparsity > 0.5 || characteristics.dataPoints < 12) {
    linear += 0.10;
    hw -= 0.05;
    prophet -= 0.05;
    arima -= 0.05;
    if (xgbAvailable) xgb -= 0.05;
  }

  // RULE 5: XGBoost gets a boost if very stable (low volatility) + lots of data
  if (volatility < 0.3 && characteristics.dataPoints >= 24 && xgbAvailable) {
    xgb += 0.10;
    linear -= 0.05;
    arima -= 0.05;
  }

  // Normalize to sum to 1.0
  const total = hw + prophet + arima + linear + xgb;
  const normalized: MethodWeights = {
    hw: hw / total,
    prophet: prophet / total,
    arima: arima / total,
    linear: linear / total,
    xgb: xgb / total
  };

  return normalized;
};

/**
 * Generate default weights when we don't have enough data
 */
export const getDefaultWeights = (xgbAvailable: boolean = true): MethodWeights => {
  if (xgbAvailable) {
    return {
      hw: 0.20,
      prophet: 0.15,
      arima: 0.15,
      linear: 0.10,
      xgb: 0.40
    };
  } else {
    return {
      hw: 0.30,
      prophet: 0.25,
      arima: 0.25,
      linear: 0.20,
      xgb: 0
    };
  }
};

/**
 * Apply weighted ensemble to multiple forecasts
 * Returns single forecast that is weighted average of all methods
 */
export const applyWeightedEnsemble = (
  hwForecast: ForecastResult[],
  prophetForecast: ForecastResult[],
  arimaForecast: ForecastResult[],
  linearForecast: ForecastResult[],
  xgbForecast: ForecastResult[] | null,
  weights: MethodWeights
): ForecastResult[] => {
  // Use the first forecast as template
  const template = hwForecast.length > 0 ? hwForecast : prophetForecast;

  return template.map((point, idx) => {
    const hwVal = hwForecast[idx]?.forecast?.[0] || 0;
    const prophetVal = prophetForecast[idx]?.forecast?.[0] || 0;
    const arimaVal = arimaForecast[idx]?.forecast?.[0] || 0;
    const linearVal = linearForecast[idx]?.forecast?.[0] || 0;
    const xgbVal = xgbForecast?.[idx]?.forecast?.[0] || 0;

    // Weighted average
    const ensembleForecast = Math.max(
      0,
      Math.round(
        weights.hw * hwVal +
        weights.prophet * prophetVal +
        weights.arima * arimaVal +
        weights.linear * linearVal +
        weights.xgb * xgbVal
      )
    );

    // Weighted confidence bounds
    const hwLower = hwForecast[idx]?.lowerBound?.[0] || hwVal;
    const hwUpper = hwForecast[idx]?.upperBound?.[0] || hwVal;
    const prophetLower = prophetForecast[idx]?.lowerBound?.[0] || prophetVal;
    const prophetUpper = prophetForecast[idx]?.upperBound?.[0] || prophetVal;
    const arimaLower = arimaForecast[idx]?.lowerBound?.[0] || arimaVal;
    const arimaUpper = arimaForecast[idx]?.upperBound?.[0] || arimaVal;
    const linearLower = linearForecast[idx]?.lowerBound?.[0] || linearVal;
    const linearUpper = linearForecast[idx]?.upperBound?.[0] || linearVal;
    const xgbLower = xgbForecast?.[idx]?.lowerBound?.[0] || xgbVal;
    const xgbUpper = xgbForecast?.[idx]?.upperBound?.[0] || xgbVal;

    const ensembleLower = Math.round(
      weights.hw * hwLower +
      weights.prophet * prophetLower +
      weights.arima * arimaLower +
      weights.linear * linearLower +
      weights.xgb * (xgbLower || 0)
    );

    const ensembleUpper = Math.round(
      weights.hw * hwUpper +
      weights.prophet * prophetUpper +
      weights.arima * arimaUpper +
      weights.linear * linearUpper +
      weights.xgb * (xgbUpper || 0)
    );

    return {
      ...point,
      forecast: [ensembleForecast, ...point.forecast.slice(1)],
      lowerBound: [Math.max(0, ensembleLower), ...point.lowerBound.slice(1)],
      upperBound: [ensembleUpper, ...point.upperBound.slice(1)]
    };
  });
};

/**
 * Generate a summary of why weights were adjusted
 */
export const explainWeights = (
  characteristics: SKUCharacteristics,
  weights: MethodWeights
): string => {
  const lines: string[] = [];
  lines.push(`SKU: ${characteristics.sku}`);
  lines.push(`  Data points: ${characteristics.dataPoints} months`);
  lines.push(`  Volatility: ${(characteristics.volatility * 100).toFixed(1)}%${characteristics.volatility > 0.7 ? ' ⚠️ CHAOTIC' : ''}`);
  lines.push(`  Seasonality: ${(characteristics.seasonality * 100).toFixed(1)}%${characteristics.seasonality > 0.6 ? ' 📅 SEASONAL' : ''}`);
  lines.push(`  Trend: ${(characteristics.trend * 100).toFixed(1)}%${Math.abs(characteristics.trend) > 0.08 ? ' 📈 TRENDING' : ''}`);
  lines.push(`  Sparsity: ${(characteristics.sparsity * 100).toFixed(1)}%${characteristics.sparsity > 0.5 ? ' 🔶 SPARSE' : ''}`);
  lines.push(`  Weights: HW=${(weights.hw*100).toFixed(0)}% Prophet=${(weights.prophet*100).toFixed(0)}% ARIMA=${(weights.arima*100).toFixed(0)}% Linear=${(weights.linear*100).toFixed(0)}% XGB=${(weights.xgb*100).toFixed(0)}%`);

  return lines.join('\n');
};
