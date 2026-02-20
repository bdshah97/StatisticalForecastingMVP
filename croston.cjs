// Croston's method for intermittent demand forecasting
// Input: demandArr = array of demand (number), horizon = forecast months
// Returns: forecast array for horizon months
function croston(demandArr, horizon = 6) {
    let n = demandArr.length;
    let alpha = 0.1; // smoothing parameter (typical: 0.1-0.3)
    let z = 0, p = 0, q = 0;
    let first = true;
    let lastDemand = 0;
    let intervals = [];
    let lastNonZero = -1;
    // Find first nonzero demand
    for (let i = 0; i < n; i++) {
        if (demandArr[i] > 0) {
            z = demandArr[i];
            p = i + 1;
            lastNonZero = i;
            break;
        }
    }
    if (lastNonZero === -1) {
        // All zero demand
        return Array(horizon).fill(0);
    }
    for (let t = lastNonZero + 1; t < n; t++) {
        if (demandArr[t] > 0) {
            let interval = t - lastNonZero;
            z = z + alpha * (demandArr[t] - z);
            p = p + alpha * (interval - p);
            lastNonZero = t;
        }
    }
    let crostonForecast = z / p;
    // Forecast for horizon months
    let forecastArr = Array(horizon).fill(crostonForecast);
    return forecastArr;
}

module.exports = croston;