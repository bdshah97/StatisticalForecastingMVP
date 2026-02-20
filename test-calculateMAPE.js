// Simple tests for per-pair calculateMAPE logic
const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); process.exit(1); } };

const calculateMAPE = (actual, forecast) => {
  const n = Math.min(actual.length, forecast.length);
  let sumPct = 0; let count = 0;
  for (let i = 0; i < n; i++) {
    const a = actual[i]; const f = forecast[i];
    if (a === 0) continue;
    sumPct += Math.abs((a - f) / a) * 100; count++;
  }
  return count > 0 ? (sumPct / count) : 0;
};

// Test 1: simple known values
const a1 = [100, 200, 0, 50];
const f1 = [90, 220, 10, 50];
// per-pair pct: |100-90|/100=0.1, |200-220|/200=0.1, skip zero, |50-50|/50=0 => avg = (10%+10%+0%)/3 = 6.666...
const m1 = calculateMAPE(a1, f1);
assert(Math.abs(m1 - 6.6666667) < 1e-6, `expected ~6.6667 got ${m1}`);

// Test 2: all zeros -> should be 0
const a2 = [0,0]; const f2 = [0,0];
const m2 = calculateMAPE(a2,f2);
assert(m2 === 0, `expected 0 got ${m2}`);

// Test 3: single pair
const a3 = [50]; const f3 = [25]; // error 25/50 = 0.5 -> 50%
const m3 = calculateMAPE(a3,f3);
assert(Math.abs(m3 - 50) < 1e-9, `expected 50 got ${m3}`);

console.log('All calculateMAPE tests passed.');
