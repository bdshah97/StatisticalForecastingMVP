/**
 * Forecasting Service
 * Implements 4 statistical forecasting methods
 */

import { SkuMonthAggregate, ForecastResult } from '../types';

const getZMultiplier = (conf: number): number => {
  if (conf >= 99) return 2.576;
  if (conf >= 95) return 1.96;
  if (conf >= 90) return 1.645;
  if (conf >= 85) return 1.44;
  if (conf >= 80) return 1.28;
  return 1.96;
};

/**
 * Holt-Winters Multiplicative
 */
export const forecastHoltWinters = (
  values: number[],
  horizon: number,
  seasonLength: number = 12
): number[] => {
  const alpha = 0.3, beta = 0.1, gamma = 0.05;
  const n = values.length;

  const initPeriod = Math.min(seasonLength, n);
  const level0 = values.slice(0, initPeriod).reduce((a, b) => a + b, 0) / initPeriod || 1;

  let level = level0;
  let trend = (values[Math.min(seasonLength - 1, n - 1)] - values[0]) / Math.min(seasonLength, n - 1) || 0;
  const seasonal = new Array(seasonLength).fill(1);

  for (let i = 0; i < initPeriod; i++) {
    seasonal[i] = values[i] / level0;
  }

  for (let i = 0; i < n; i++) {
    const value = values[i];
    const prevLevel = level;
    level = alpha * (value / (seasonal[i % seasonLength] || 1)) + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    seasonal[i % seasonLength] = gamma * (value / (level || 1)) + (1 - gamma) * seasonal[i % seasonLength];
  }

  const forecast = [];
  for (let i = 1; i <= horizon; i++) {
    forecast.push(Math.max(0, (level + i * trend) * seasonal[(n + i - 1) % seasonLength]));
  }
  return forecast;
};

/**
 * Prophet-Inspired (Additive)
 */
export const forecastProphet = (values: number[], horizon: number): number[] => {
  const n = values.length;
  const L = 12;

  const avgGrowth = (values[n - 1] - values[0]) / n;
  const mean = values.reduce((a, b) => a + b) / n;
  const seasonal = Array(L).fill(0);

  for (let i = 0; i < n; i++) {
    seasonal[i % L] += (values[i] - mean);
  }
  for (let i = 0; i < L; i++) {
    seasonal[i] /= Math.ceil(n / L);
  }

  const forecast = [];
  for (let i = 1; i <= horizon; i++) {
    const seasonalBase = seasonal[(i - 1) % 12];
    const simulatedVal = seasonalBase + mean + (avgGrowth * 1.2 * i);
    forecast.push(Math.max(0, Math.round(simulatedVal)));
  }
  return forecast;
};

/**
 * ARIMA Simulation
 */
export const forecastARIMA = (values: number[], horizon: number): number[] => {
  const n = values.length;
  const forecast = [];
  let currentVal = values[n - 1];
  const arCoefficient = 0.85;

  for (let i = 1; i <= horizon; i++) {
    const mean = values.reduce((a, b) => a + b, 0) / n;
    currentVal = mean + arCoefficient * (currentVal - mean);
    forecast.push(Math.max(0, currentVal));
  }
  return forecast;
};

/**
 * Linear Regression
 */
export const forecastLinear = (values: number[], horizon: number): number[] => {
  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const forecast = [];
  for (let i = 1; i <= horizon; i++) {
    forecast.push(Math.max(0, slope * (n + i - 1) + intercept));
  }
  return forecast;
};

/**
 * Generate forecasts for all SKUs using specified method
 */
export const generateForecasts = (
  aggregates: SkuMonthAggregate[],
  method: 'hw' | 'prophet' | 'arima' | 'linear',
  horizon: number,
  confidence: number
): ForecastResult[] => {
  // Group aggregates by SKU
  const bySkuMap = new Map<string, SkuMonthAggregate[]>();
  aggregates.forEach(agg => {
    if (!bySkuMap.has(agg.sku)) {
      bySkuMap.set(agg.sku, []);
    }
    bySkuMap.get(agg.sku)!.push(agg);
  });

  const results: ForecastResult[] = [];
  const zMultiplier = getZMultiplier(confidence);

  bySkuMap.forEach((skuData, sku) => {
    // Sort by date
    skuData.sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));

    const values = skuData.map(a => a.quantity);
    const stdDev = skuData[0].stdDev || Math.sqrt(values.reduce((sq, x) => sq + Math.pow(x - values.reduce((a, b) => a + b) / values.length, 2), 0) / values.length);

    let forecast: number[];
    switch (method) {
      case 'hw':
        forecast = forecastHoltWinters(values, horizon);
        break;
      case 'prophet':
        forecast = forecastProphet(values, horizon);
        break;
      case 'arima':
        forecast = forecastARIMA(values, horizon);
        break;
      case 'linear':
        forecast = forecastLinear(values, horizon);
        break;
      default:
        forecast = forecastLinear(values, horizon);
    }

    // Generate dates
    const lastDate = new Date(skuData[skuData.length - 1].yearMonth + '-01');
    const dates: string[] = [];
    const lowerBound: number[] = [];
    const upperBound: number[] = [];

    for (let i = 0; i < horizon; i++) {
      const d = new Date(lastDate);
      d.setMonth(d.getMonth() + i + 1);
      dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);

      const uncertainty = zMultiplier * stdDev * Math.sqrt(i + 1) * 0.4;
      lowerBound.push(Math.max(0, Math.round(forecast[i] - uncertainty)));
      upperBound.push(Math.round(forecast[i] + uncertainty));
    }

    results.push({
      sku,
      dates,
      forecast: forecast.map(f => Math.round(f)),
      lowerBound,
      upperBound,
      method
    });
  });

  return results;
};
