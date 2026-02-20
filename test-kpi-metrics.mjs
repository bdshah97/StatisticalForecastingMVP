// Automated test for demand planning KPIs using sample datasets (ESM version)
import assert from 'assert';
import datasets from './test-kpi-sample-datasets.cjs';
import { calculateMAPE, calculateMAPECorrected, calculateMetrics } from './dist/utils/forecasting.js';

function nearlyEqual(a, b, tol = 1e-6) {
  if (Number.isNaN(a) && Number.isNaN(b)) return true;
  if (!isFinite(a) && !isFinite(b)) return true;
  return Math.abs(a - b) < tol;
}

datasets.forEach(ds => {
  const mape = calculateMAPE(ds.actual, ds.forecast);
  const mapeCorrected = calculateMAPECorrected(ds.actual, ds.forecast);
  const metrics = calculateMetrics(ds.actual, ds.forecast, 1, 1);
  console.log(`\n[${ds.name}]`);
  console.log(`  MAPE:           ${mape}`);
  console.log(`  MAPE Corrected: ${mapeCorrected}`);
  console.log(`  RMSE:           ${metrics.rmse}`);
  console.log(`  Accuracy:       ${metrics.accuracy}`);
  console.log(`  Bias:           ${metrics.bias}`);
  assert(nearlyEqual(mape, ds.expected.mape), `MAPE mismatch for ${ds.name}`);
  assert(nearlyEqual(mapeCorrected, ds.expected.mapeCorrected), `MAPE Corrected mismatch for ${ds.name}`);
  assert(nearlyEqual(metrics.rmse, ds.expected.rmse), `RMSE mismatch for ${ds.name}`);
  assert(nearlyEqual(metrics.accuracy, ds.expected.accuracy), `Accuracy mismatch for ${ds.name}`);
  // Bias can be Infinity in some cases, so only check if both are finite
  if (isFinite(ds.expected.bias)) {
    assert(nearlyEqual(metrics.bias, ds.expected.bias), `Bias mismatch for ${ds.name}`);
  }
});

console.log('\nAll KPI tests passed!');
