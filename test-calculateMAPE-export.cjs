// Export calculateMAPE for use in test-croston.js
module.exports = (actual, forecast) => {
  const n = Math.min(actual.length, forecast.length);
  let sumPct = 0; let count = 0;
  for (let i = 0; i < n; i++) {
    const a = actual[i]; const f = forecast[i];
    if (a === 0) continue;
    sumPct += Math.abs((a - f) / a) * 100; count++;
  }
  return count > 0 ? (sumPct / count) : 0;
};
