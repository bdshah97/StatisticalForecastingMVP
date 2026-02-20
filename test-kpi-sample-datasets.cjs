// Sample datasets for demand planning KPI testing
// Each dataset is an object with actual, forecast, and expected KPI values

module.exports = [
  // 1. All zeros
  {
    name: 'All Zeros',
    actual: [0, 0, 0],
    forecast: [0, 0, 0],
    expected: {
      mape: 0,
      mapeCorrected: 0,
      rmse: 0,
      accuracy: 100,
      bias: 0
    }
  },
  // 2. Actuals zero, forecasts nonzero
  {
    name: 'Actuals Zero, Forecasts Nonzero',
    actual: [0, 0, 0],
    forecast: [10, 5, 2],
    expected: {
      mape: 0,
      mapeCorrected: 100,
      rmse: Math.sqrt((10*10 + 5*5 + 2*2)/3),
      accuracy: 0,
      bias: Infinity // division by zero
    }
  },
  // 3. Actuals nonzero, forecasts zero
  {
    name: 'Actuals Nonzero, Forecasts Zero',
    actual: [10, 5, 2],
    forecast: [0, 0, 0],
    expected: {
      mape: 100,
      mapeCorrected: 100,
      rmse: Math.sqrt((10*10 + 5*5 + 2*2)/3),
      accuracy: 0,
      bias: -100
    }
  },
  // 4. Perfect match
  {
    name: 'Perfect Match',
    actual: [10, 20, 30],
    forecast: [10, 20, 30],
    expected: {
      mape: 0,
      mapeCorrected: 0,
      rmse: 0,
      accuracy: 100,
      bias: 0
    }
  },
  // 5. Mixed zeros and nonzeros
  {
    name: 'Mixed Zeros and Nonzeros',
    actual: [0, 20, 0, 40],
    forecast: [0, 18, 5, 35],
    expected: {
      mape: ( (2/20)*100 + (5/40)*100 ) / 2, // skips zeros
      mapeCorrected: (0 + (2/20)*100 + 100 + (5/40)*100) / 4, // includes all
      rmse: Math.sqrt((0*0 + 2*2 + 5*5 + 5*5)/4),
      accuracy: (1 - Math.abs((20+40)-(18+35))/Math.max(20+40,1))*100,
      bias: ((18+35)-(20+40))/Math.max(20+40,1)*100
    }
  },
  // 6. Random values
  {
    name: 'Random',
    actual: [100, 0, 50, 0, 25],
    forecast: [90, 0, 60, 10, 30],
    expected: {
      mape: (10/100*100 + 10/50*100 + 5/25*100)/3,
      mapeCorrected: (10/100*100 + 0 + 10/50*100 + 100 + 5/25*100)/5,
      rmse: Math.sqrt((10*10 + 0*0 + 10*10 + 10*10 + 5*5)/5),
      accuracy: (1 - Math.abs((100+50+25)-(90+60+10+30))/Math.max(100+50+25,1))*100,
      bias: ((90+60+10+30)-(100+50+25))/Math.max(100+50+25,1)*100
    }
  }
];
