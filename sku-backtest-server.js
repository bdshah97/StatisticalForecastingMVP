import express from 'express';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 4001;

// Simple CSV parse and forecasting functions (same logic as run-sku-backtest.js)
function parseCSV(raw) {
  const lines = raw.split(/\r?\n/).filter(Boolean);
  lines.shift();
  return lines.map(l => {
    const parts = l.split(',');
    return { date: parts[0], sku: parts[2], qty: parseInt(parts[3], 10) };
  });
}

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
  const slope = numerator / denominator; const intercept = yMean - slope * xMean;
  const forecast = [];
  for (let h = 1; h <= horizon; h++) forecast.push(Math.max(0, Math.round(intercept + slope * (values.length + h))));
  return forecast;
}
function prophetReference(values, horizon) {
  const L = 12; const avgGrowth = (values[values.length-1] - values[0]) / values.length;
  const mean_val = values.reduce((a, b) => a + b) / values.length; const seasonal = Array(L).fill(0);
  for (let i = 0; i < values.length; i++) seasonal[i % L] += (values[i] - mean_val);
  for (let i = 0; i < L; i++) seasonal[i] /= Math.ceil(values.length / L);
  const forecast = [];
  for (let i = 1; i <= horizon; i++) { const seasonalBase = seasonal[(i - 1) % 12]; const simulatedVal = seasonalBase + mean_val + (avgGrowth * 1.2 * i); forecast.push(Math.max(0, Math.round(simulatedVal))); }
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
  const diffs = []; for (let i = 1; i < values.length; i++) diffs.push(values[i] - values[i-1]);
  const diffMean = diffs.reduce((a, b) => a + b) / diffs.length; let numerator = 0, denominator = 0;
  for (let i = 1; i < diffs.length; i++) { numerator += (diffs[i-1] - diffMean) * (diffs[i] - diffMean); denominator += Math.pow(diffs[i-1] - diffMean, 2); }
  const phi = numerator / denominator; const forecast = []; let lastValue = values[values.length-1]; let lastDiff = diffs[diffs.length - 1];
  for (let i = 1; i <= horizon; i++) { const nextDiff = diffMean + phi * (lastDiff - diffMean); const nextValue = lastValue + nextDiff; forecast.push(Math.max(0, Math.round(nextValue))); lastValue = nextValue; lastDiff = nextDiff; }
  return forecast;
}
function arimaApp(values, horizon) {
  const n = values.length; const forecast = []; let currentVal = values[n-1]; const arCoefficient = 0.85;
  for (let i = 1; i <= horizon; i++) { const mean = values.reduce((a,b) => a+b, 0) / n; currentVal = mean + arCoefficient * (currentVal - mean); forecast.push(Math.max(0, Math.round(currentVal))); }
  return forecast;
}

const calculateMAPE = (actual, forecast) => {
  let sumPct = 0; let count = 0;
  for (let i = 0; i < Math.min(actual.length, forecast.length); i++) {
    const a = actual[i]; if (a === 0) continue; sumPct += Math.abs((a - forecast[i]) / a) * 100; count++; }
  return count > 0 ? (sumPct / count) : 0;
};

app.get('/run-backtest', (req, res) => {
  const sku = (req.query.sku || '10CH').toString().toUpperCase();
  const fileName = req.query.file ? req.query.file.toString() : 'Big Tex Historical Sales.csv';
  const csvPath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(csvPath)) return res.status(500).json({ error: 'CSV not found' });
  const raw = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSV(raw);
  const skuRows = rows.filter(r => r.sku && r.sku.toUpperCase() === sku).sort((a,b)=>new Date(a.date)-new Date(b.date));
  if (skuRows.length === 0) return res.status(404).json({ error: 'SKU not found' });

  const trainingEnd = new Date('2024-12-01'); const testStart = new Date('2025-01-01'); const testEnd = new Date('2025-06-30');
  const training = []; const actual = [];
  skuRows.forEach(r => { const d = new Date(r.date); if (d <= trainingEnd) training.push(r.qty); else if (d >= testStart && d <= testEnd) actual.push(r.qty); });

  const forecasts = {
    'HW Additive': hwAdditive(training, 6),
    'HW Multiplicative': hwMultiplicative(training, 6),
    'Linear': linear(training, 6),
    'Prophet (Reference)': prophetReference(training, 6),
    'Prophet (App)': prophetApp(training, 6),
    'ARIMA (Reference)': arimaReference(training, 6),
    'ARIMA (App)': arimaApp(training, 6),
  };

  const results = {};
  Object.entries(forecasts).forEach(([name, f]) => {
    const mae = f.reduce((s, x, i) => s + Math.abs(x - actual[i]), 0) / f.length;
    const rmse = Math.sqrt(f.reduce((s, x, i) => s + Math.pow(x - actual[i], 2), 0) / f.length);
    const mape = calculateMAPE(actual, f);
    results[name] = { mae, rmse, mape, forecast: f };
  });

  res.json({ sku, trainingLength: training.length, actual, results });
});

// Diagnostic endpoint: returns detailed per-month errors and both MAPE variants
app.get('/debug-backtest', (req, res) => {
  const sku = (req.query.sku || '10CH').toString().toUpperCase();
  const dataEndStr = req.query.dataEnd || '2024-12-01'; // YYYY-MM-DD
  const forecastStartStr = req.query.forecastStart || '2025-01-01';
  const horizon = parseInt(req.query.horizon || '6', 10);

  const csvPath = path.join(process.cwd(), 'Big Tex Historical Sales.csv');
  if (!fs.existsSync(csvPath)) return res.status(500).json({ error: 'CSV not found' });
  const raw = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSV(raw);
  const skuRows = rows.filter(r => r.sku && r.sku.toUpperCase() === sku).sort((a,b)=>new Date(a.date)-new Date(b.date));
  if (skuRows.length === 0) return res.status(404).json({ error: 'SKU not found' });

  const dataEnd = new Date(dataEndStr);
  const forecastStart = new Date(forecastStartStr);
  const testStart = new Date(forecastStart);
  const testEnd = new Date(forecastStart);
  testEnd.setMonth(testEnd.getMonth() + horizon - 1);

  const training = [];
  const actual = [];
  const actualDates = [];

  skuRows.forEach(r => {
    const d = new Date(r.date);
    if (d <= dataEnd) training.push({date: r.date, qty: r.qty});
    if (d >= testStart && d <= testEnd) { actual.push(r.qty); actualDates.push(r.date); }
  });

  const forecasts = {
    'HW Additive': hwAdditive(training.map(t => t.qty), horizon),
    'HW Multiplicative': hwMultiplicative(training.map(t => t.qty), horizon),
    'Linear': linear(training.map(t => t.qty), horizon),
    'Prophet (Reference)': prophetReference(training.map(t => t.qty), horizon),
    'Prophet (App)': prophetApp(training.map(t => t.qty), horizon),
    'ARIMA (Reference)': arimaReference(training.map(t => t.qty), horizon),
    'ARIMA (App)': arimaApp(training.map(t => t.qty), horizon),
  };

  const diagnostics = {};
  Object.entries(forecasts).forEach(([name, f]) => {
    const perMonth = [];
    for (let i = 0; i < horizon; i++) {
      perMonth.push({
        date: actualDates[i] || null,
        actual: actual[i] ?? null,
        forecast: f[i] ?? null,
        absError: actual[i] != null ? Math.abs((f[i] ?? 0) - actual[i]) : null,
        pctError: (actual[i] && actual[i] !== 0) ? (Math.abs((f[i] ?? 0) - actual[i]) / actual[i]) * 100 : null
      });
    }

    // per-pair MAPE
    let sumPct = 0; let count = 0; let num = 0; let den = 0;
    perMonth.forEach(m => {
      if (m.actual == null) return;
      num += m.absError || 0;
      den += Math.abs(m.actual) || 0;
      if (m.actual !== 0 && m.pctError != null) { sumPct += m.pctError; count++; }
    });
    const mape = count > 0 ? (sumPct / count) : 0;
    const wmap = den > 0 ? (num / den) * 100 : 0;

    diagnostics[name] = { perMonth, mape, wmap };
  });

  res.json({ sku, trainingCount: training.length, testRange: { start: testStart.toISOString().split('T')[0], end: testEnd.toISOString().split('T')[0]}, actualCount: actual.length, diagnostics });
});

app.listen(PORT, () => console.log(`Backtest server listening on http://localhost:${PORT}`));
