/**
 * Feature Engineering for ML Models
 */

import { SkuMonthAggregate, TrainingFeature } from '../types';

export const extractFeatures = (
  skuData: SkuMonthAggregate[],
  targetIndex: number
): number[] => {
  if (targetIndex < 1) {
    return Array(9).fill(0); // Return default features if not enough history
  }

  const current = skuData[targetIndex];
  const prev1 = skuData[Math.max(0, targetIndex - 1)];
  const prev6 = skuData[Math.max(0, targetIndex - 6)];
  const prev12 = skuData[Math.max(0, targetIndex - 12)];

  // Historical values for averaging
  const historyWindow = skuData.slice(Math.max(0, targetIndex - 12), targetIndex);
  const avgQuantity = historyWindow.length > 0 
    ? historyWindow.reduce((s, d) => s + d.quantity, 0) / historyWindow.length 
    : current.quantity;

  // Volatility
  const variance = historyWindow.length > 0
    ? historyWindow.reduce((sq, d) => sq + Math.pow(d.quantity - avgQuantity, 2), 0) / historyWindow.length
    : 0;
  const volatility = Math.sqrt(variance);

  // Trend (simple linear)
  let trend = 0;
  if (historyWindow.length > 1) {
    const firstHalf = historyWindow.slice(0, Math.ceil(historyWindow.length / 2));
    const secondHalf = historyWindow.slice(Math.ceil(historyWindow.length / 2));
    const firstAvg = firstHalf.reduce((s, d) => s + d.quantity, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, d) => s + d.quantity, 0) / secondHalf.length;
    trend = (secondAvg - firstAvg) / firstAvg;
  }

  // Month seasonality
  const monthStr = current.yearMonth;
  const month = parseInt(monthStr.split('-')[1]);
  const sinMonth = Math.sin(2 * Math.PI * (month / 12));
  const cosMonth = Math.cos(2 * Math.PI * (month / 12));

  return [
    prev1?.quantity || 0,           // lag-1
    prev6?.quantity || 0,           // lag-6
    prev12?.quantity || 0,          // lag-12
    avgQuantity,                    // 12-month average
    volatility,                     // volatility (std dev)
    trend,                          // trend
    sinMonth,                       // seasonality sin
    cosMonth,                       // seasonality cos
    current.stdDev                  // recent volatility
  ];
};

export const generateTrainingData = (
  aggregates: SkuMonthAggregate[],
  testWindowMonths: number = 6
): TrainingFeature[] => {
  // Sort by SKU and date
  const sorted = aggregates.sort((a, b) => {
    if (a.sku !== b.sku) return a.sku.localeCompare(b.sku);
    return a.yearMonth.localeCompare(b.yearMonth);
  });

  const features: TrainingFeature[] = [];

  // For each SKU
  const bySkuMap = new Map<string, SkuMonthAggregate[]>();
  sorted.forEach(agg => {
    if (!bySkuMap.has(agg.sku)) {
      bySkuMap.set(agg.sku, []);
    }
    bySkuMap.get(agg.sku)!.push(agg);
  });

  bySkuMap.forEach((skuData, sku) => {
    // Skip if not enough history
    if (skuData.length < testWindowMonths + 3) {
      return;
    }

    // Training set: all but last 6 months
    const trainingEnd = skuData.length - testWindowMonths;

    for (let i = 1; i < trainingEnd; i++) {
      const featureVec = extractFeatures(skuData, i);
      const target = skuData[i].quantity;

      features.push({
        label: target,
        features: featureVec,
        sku,
        date: skuData[i].yearMonth
      });
    }
  });

  return features;
};

export const generateTestData = (
  aggregates: SkuMonthAggregate[],
  testWindowMonths: number = 6
): { features: TrainingFeature[]; actuals: number[] } => {
  const sorted = aggregates.sort((a, b) => {
    if (a.sku !== b.sku) return a.sku.localeCompare(b.sku);
    return a.yearMonth.localeCompare(b.yearMonth);
  });

  const bySkuMap = new Map<string, SkuMonthAggregate[]>();
  sorted.forEach(agg => {
    if (!bySkuMap.has(agg.sku)) {
      bySkuMap.set(agg.sku, []);
    }
    bySkuMap.get(agg.sku)!.push(agg);
  });

  const features: TrainingFeature[] = [];
  const actuals: number[] = [];

  bySkuMap.forEach((skuData, sku) => {
    if (skuData.length < testWindowMonths + 3) {
      return;
    }

    const trainingEnd = skuData.length - testWindowMonths;

    for (let i = trainingEnd; i < skuData.length; i++) {
      const featureVec = extractFeatures(skuData, i);
      const target = skuData[i].quantity;

      features.push({
        label: target,
        features: featureVec,
        sku,
        date: skuData[i].yearMonth
      });

      actuals.push(target);
    }
  });

  return { features, actuals };
};
