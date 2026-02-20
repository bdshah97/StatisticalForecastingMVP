import fs from 'fs';
import path from 'path';

// Read CSV and extract SKU series
const csvPath = path.join(process.cwd(), 'Big Tex Historical Sales.csv');
const raw = fs.readFileSync(csvPath, 'utf8');
const lines = raw.split(/\r?\n/).filter(Boolean);
const header = lines.shift();

const rows = lines.map(l => {
  // naive CSV parse for this simple file
  const parts = l.split(',');
  const date = parts[0];
  const sku = parts[2];
  const qty = parseInt(parts[3], 10);
  return { date, sku, qty };
});

const skuKey = '10CH';
const skuRows = rows.filter(r => r.sku && r.sku.toUpperCase() === skuKey.toUpperCase());

// Sort by date
skuRows.sort((a, b) => new Date(a.date) - new Date(b.date));

const dates = skuRows.map(r => r.date);
const quantities = skuRows.map(r => r.qty);

console.log(`Found ${quantities.length} rows for SKU ${skuKey}`);
// Determine training (<= 12/2024) and test 1/2025-6/2025
const trainingEnd = new Date('2024-12-01');
const testStart = new Date('2025-01-01');
const testEnd = new Date('2025-06-30');

const training = [];
const actual = [];

for (let i = 0; i < skuRows.length; i++) {
  const d = new Date(skuRows[i].date);
  if (d <= trainingEnd) training.push(skuRows[i].qty);
  else if (d >= testStart && d <= testEnd) actual.push(skuRows[i].qty);
}

console.log('Training length:', training.length);
console.log('Actual (test) length:', actual.length);
console.log('Actual values:', actual);

// Forecast functions (copied from comprehensive-backtest.js)
function hwAdditive(values, horizon) {
  const L = 12, alpha = 0.3, beta = 0.1, gamma = 0.05;
  let level = values.slice(0, L).reduce((a, b) => a + b) / L;
  let trend = (values[L] - values[0]) / L;
  let seasonal = Array.from({ length: L }, (_, i) => values[i] - level);

  for (let i = L; i < values.length; i++) {
    const y = values[i];
    const lastLevel = level;
    level = alpha * (y - seasonal[i % L]) + (1 - alpha) * (lastLevel + trend);
    trend = beta * (level - lastLevel) + (1 - beta) * trend;
    seasonal[i % L] = gamma * (y - level) + (1 - gamma) * seasonal[i % L];
  }

  const forecast = [];
  for (let h = 1; h <= horizon; h++) {
    const idx = (values.length - L + h - 1) % L;
    forecast.push(Math.max(0, Math.round(level + (h * trend) + seasonal[idx])));
  }
  return forecast;
}

function hwMultiplicative(values, horizon) {
  const L = 12, alpha = 0.3, beta = 0.1, gamma = 0.05;
  let level = values.slice(0, L).reduce((a, b) => a + b) / L;
  let trend = (values[L] - values[0]) / L;
  let seasonal = Array.from({ length: L }, (_, i) => values[i] / level);

  for (let i = L; i < values.length; i++) {
    const y = values[i];
    const lastLevel = level;
    level = alpha * (y / seasonal[i % L]) + (1 - alpha) * (lastLevel + trend);
    trend = beta * (level - lastLevel) + (1 - beta) * trend;
    seasonal[i % L] = gamma * (y / level) + (1 - gamma) * seasonal[i % L];
  }

  const forecast = [];
  for (let h = 1; h <= horizon; h++) {
    const idx = (values.length - L + h - 1) % L;
    forecast.push(Math.max(0, Math.round((level + (h * trend)) * seasonal[idx])));
  }
  return forecast;
}

function linear(values, horizon) {
  const x = Array.from({ length: values.length }, (_, i) => i + 1);
  const xMean = x.reduce((a, b) => a + b) / values.length;
  const yMean = values.reduce((a, b) => a + b) / values.length;
  
  let numerator = 0, denominator = 0;
  for (let i = 0; i < values.length; i++) {
    numerator += (x[i] - xMean) * (values[i] - yMean);
    denominator += Math.pow(x[i] - xMean, 2);
  }
  
  const slope = numerator / denominator;
  const intercept = yMean - slope * xMean;

  const forecast = [];
  for (let h = 1; h <= horizon; h++) {
    forecast.push(Math.max(0, Math.round(intercept + slope * (values.length + h))));
  }
  return forecast;
}

function prophetReference(values, horizon) {
  const L = 12;
  const avgGrowth = (values[values.length-1] - values[0]) / values.length;
  const mean_val = values.reduce((a, b) => a + b) / values.length;
  const seasonal = Array(L).fill(0);
  
  for (let i = 0; i < values.length; i++) {
    seasonal[i % L] += (values[i] - mean_val);
  }
  for (let i = 0; i < L; i++) {
    seasonal[i] /= Math.ceil(values.length / L);
  }

  const forecast = [];
  for (let i = 1; i <= horizon; i++) {
    const seasonalBase = seasonal[(i - 1) % 12];
    const simulatedVal = seasonalBase + mean_val + (avgGrowth * 1.2 * i);
    forecast.push(Math.max(0, Math.round(simulatedVal)));
  }
  return forecast;
}

function prophetApp(values, horizon) {
  const recentValues = values.slice(-12);
  const avgGrowth = (values[values.length-1] - values[0]) / values.length;

  const forecast = [];
  for (let i = 1; i <= horizon; i++) {
    const seasonalBase = recentValues[(i - 1) % 12];
    const simulatedVal = seasonalBase + (avgGrowth * 1.2 * i);
    forecast.push(Math.max(0, Math.round(simulatedVal)));
  }
  return forecast;
}

function arimaReference(values, horizon) {
  const diffs = [];
  for (let i = 1; i < values.length; i++) {
    diffs.push(values[i] - values[i-1]);
  }
  
  const diffMean = diffs.reduce((a, b) => a + b) / diffs.length;
  let numerator = 0, denominator = 0;
  for (let i = 1; i < diffs.length; i++) {
    numerator += (diffs[i-1] - diffMean) * (diffs[i] - diffMean);
    denominator += Math.pow(diffs[i-1] - diffMean, 2);
  }
  const phi = numerator / denominator;
  
  const forecast = [];
  let lastValue = values[values.length-1];
  let lastDiff = diffs[diffs.length - 1];
  
  for (let i = 1; i <= horizon; i++) {
    const nextDiff = diffMean + phi * (lastDiff - diffMean);
    const nextValue = lastValue + nextDiff;
    forecast.push(Math.max(0, Math.round(nextValue)));
    lastValue = nextValue;
    lastDiff = nextDiff;
  }
  return forecast;
}

function arimaApp(values, horizon) {
  const n = values.length;
  const forecast = [];
  let currentVal = values[n-1];
  const arCoefficient = 0.85;

  for (let i = 1; i <= horizon; i++) {
    const mean = values.reduce((a,b) => a+b, 0) / n;
    currentVal = mean + arCoefficient * (currentVal - mean);
    forecast.push(Math.max(0, Math.round(currentVal)));
  }
  return forecast;
}

const forecasts = {
  'HW Additive': hwAdditive(training, 6),
  'HW Multiplicative': hwMultiplicative(training, 6),
  'Linear': linear(training, 6),
  'Prophet (Reference)': prophetReference(training, 6),
  'Prophet (App)': prophetApp(training, 6),
  'ARIMA (Reference)': arimaReference(training, 6),
  'ARIMA (App)': arimaApp(training, 6),
};

function calcMetrics(forecast, actual) {
  const mae = forecast.reduce((sum, f, i) => sum + Math.abs(f - actual[i]), 0) / forecast.length;
  const rmse = Math.sqrt(forecast.reduce((sum, f, i) => sum + Math.pow(f - actual[i], 2), 0) / forecast.length);
  let sumPct = 0; let count = 0;
  for (let i = 0; i < Math.min(forecast.length, actual.length); i++) {
    const a = actual[i];
    const f = forecast[i];
    if (a === 0) continue;
    sumPct += Math.abs((a - f) / a) * 100;
    count++;
  }
  const mape = count > 0 ? (sumPct / count) : 0;
  return { mae, rmse, mape };
}

const results = {};
Object.entries(forecasts).forEach(([name, forecast]) => {
  results[name] = calcMetrics(forecast, actual);
});

console.log('\n=== FORECAST COMPARISON ===\n');

const months = ['Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025', 'May 2025', 'Jun 2025'];
for (let i = 0; i < 6; i++) {
  let row = `${months[i].padEnd(11)}| ${String(actual[i]).padStart(6)} | `;
  row += `${String(forecasts['HW Additive'][i]).padStart(6)} | `;
  row += `${String(forecasts['HW Multiplicative'][i]).padStart(6)} | `;
  row += `${String(forecasts['Linear'][i]).padStart(6)} | `;
  row += `${String(forecasts['Prophet (Reference)'][i]).padStart(11)} | `;
  row += `${String(forecasts['Prophet (App)'][i]).padStart(12)} | `;
  row += `${String(forecasts['ARIMA (Reference)'][i]).padStart(9)} | `;
  row += `${String(forecasts['ARIMA (App)'][i]).padStart(9)}`;
  console.log(row);
}

console.log('\n=== ACCURACY METRICS ===\n');
console.log('Methodology                | MAE  | RMSE | MAPE');
console.log('---------------------------|------|------|--------');

const sorted = Object.entries(results).sort((a, b) => a[1].mape - b[1].mape);
sorted.forEach(([name, metrics]) => {
  console.log(`${name.padEnd(27)}| ${metrics.mae.toFixed(1).padStart(4)} | ${metrics.rmse.toFixed(1).padStart(4)} | ${metrics.mape.toFixed(1).padStart(5)}%`);
});

console.log('\n=== APP vs REFERENCE COMPARISON ===\n');
const prophetAppErr = results['Prophet (App)'].mape;
const prophetRefErr = results['Prophet (Reference)'].mape;
const arimaAppErr = results['ARIMA (App)'].mape;
const arimaRefErr = results['ARIMA (Reference)'].mape;

console.log('Prophet:');
console.log(`  App:       ${prophetAppErr.toFixed(1)}% MAPE`);
console.log(`  Reference: ${prophetRefErr.toFixed(1)}% MAPE`);
console.log(`  Better: ${prophetAppErr < prophetRefErr ? '✓ App' : '✓ Reference'} (${Math.abs(prophetAppErr - prophetRefErr).toFixed(1)}% difference)\n`);

console.log('ARIMA:');
console.log(`  App:       ${arimaAppErr.toFixed(1)}% MAPE`);
console.log(`  Reference: ${arimaRefErr.toFixed(1)}% MAPE`);
console.log(`  Better: ${arimaAppErr < arimaRefErr ? '✓ App' : '✓ Reference'} (${Math.abs(arimaAppErr - arimaRefErr).toFixed(1)}% difference)\n`);
