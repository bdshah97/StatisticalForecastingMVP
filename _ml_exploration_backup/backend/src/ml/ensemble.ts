/**
 * Ensemble Forecasting
 * Combines multiple forecasting methods with weighted averaging
 */

import { ForecastResult } from '../types';

/**
 * Calculate accuracy metrics
 */
export const calculateMAPE = (actual: number[], predicted: number[]): number => {
  const n = Math.min(actual.length, predicted.length);
  if (n === 0) return 0;

  let sumError = 0;
  for (let i = 0; i < n; i++) {
    if (actual[i] === 0) continue;
    sumError += Math.abs((predicted[i] - actual[i]) / actual[i]);
  }

  return (sumError / n) * 100;
};

/**
 * Generate ensemble forecast by combining multiple methods
 */
export const createEnsemble = (
  forecasts: Map<string, ForecastResult[]>,
  weights: Map<string, number> = new Map([
    ['hw', 0.35],
    ['prophet', 0.30],
    ['arima', 0.20],
    ['linear', 0.10],
    ['xgb', 0.05]
  ])
): ForecastResult[] => {
  if (forecasts.size === 0) {
    return [];
  }

  // Get first forecast to extract dates and SKUs
  const firstMethod = Array.from(forecasts.values())[0];
  if (!firstMethod || firstMethod.length === 0) {
    return [];
  }

  const ensembleResults: ForecastResult[] = [];

  // For each SKU
  const skuSet = new Set(firstMethod.map(f => f.sku));

  skuSet.forEach(sku => {
    // Collect forecasts from all methods for this SKU
    const methodForecasts = new Map<string, ForecastResult>();

    forecasts.forEach((skuForecasts, method) => {
      const skuForecast = skuForecasts.find(f => f.sku === sku);
      if (skuForecast) {
        methodForecasts.set(method, skuForecast);
      }
    });

    if (methodForecasts.size === 0) {
      return;
    }

    // Get first forecast for dates
    const firstForecast = Array.from(methodForecasts.values())[0];

    // Combine forecasts
    const combined: number[] = new Array(firstForecast.forecast.length).fill(0);
    const combinedLower: number[] = new Array(firstForecast.lowerBound.length).fill(0);
    const combinedUpper: number[] = new Array(firstForecast.upperBound.length).fill(0);

    let totalWeight = 0;

    methodForecasts.forEach((forecast, method) => {
      const weight = weights.get(method) || 0.1;
      totalWeight += weight;

      for (let i = 0; i < forecast.forecast.length; i++) {
        combined[i] += forecast.forecast[i] * weight;
        combinedLower[i] += forecast.lowerBound[i] * weight;
        combinedUpper[i] += forecast.upperBound[i] * weight;
      }
    });

    // Normalize
    for (let i = 0; i < combined.length; i++) {
      combined[i] /= totalWeight;
      combinedLower[i] /= totalWeight;
      combinedUpper[i] /= totalWeight;
    }

    ensembleResults.push({
      sku,
      dates: firstForecast.dates,
      forecast: combined.map(f => Math.round(f)),
      lowerBound: combinedLower.map(f => Math.round(f)),
      upperBound: combinedUpper.map(f => Math.round(f)),
      method: 'ensemble'
    });
  });

  return ensembleResults;
};
