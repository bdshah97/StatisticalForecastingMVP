// Test Croston's method on CBG9878VVSSG2M demand

const fs = require('fs');
const croston = require('./croston.cjs');
const calcMAPE = require('./test-calculateMAPE-export.cjs');

// Read demand series from filled CSV
const demandCsv = fs.readFileSync('cbg9878vvssg2m_demand_filled.csv', 'utf-8');
const lines = demandCsv.split('\n').filter(l => l && !l.startsWith('#'));
const demandArr = lines.map(l => Number(l.split(',')[1]));

// Run Croston's method (forecast next 6 months)
const horizon = 6;
const forecastArr = croston(demandArr, horizon);

// Print forecast
console.log('Croston forecast for next 6 months:', forecastArr.map(x => x.toFixed(2)));

// Backtest: compare Croston forecast to actuals for last 6 months with nonzero actuals
const actuals = demandArr.slice(-horizon);
const mape = calcMAPE(actuals, forecastArr);
console.log('MAPE for last 6 months:', mape.toFixed(2), '%');
