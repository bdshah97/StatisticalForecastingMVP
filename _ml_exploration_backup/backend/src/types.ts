/**
 * Aggregated data at SKU-month granularity
 * Used as basis for all forecasting
 */
export interface SkuMonthAggregate {
  sku: string;
  yearMonth: string; // YYYY-MM
  quantity: number; // SUM of all datapoints for this month
  count: number; // Number of datapoints in this aggregate
  minQty: number;
  maxQty: number;
  stdDev: number;
  category?: string;
}

/**
 * Forecast result for a single SKU
 */
export interface ForecastResult {
  sku: string;
  dates: string[];
  forecast: number[];
  lowerBound: number[];
  upperBound: number[];
  method: string;
}

/**
 * Complete forecast with all methods
 */
export interface CompleteForecast {
  hw?: ForecastResult;
  prophet?: ForecastResult;
  arima?: ForecastResult;
  linear?: ForecastResult;
  xgb?: ForecastResult;
  ensemble?: ForecastResult;
  metadata: {
    skus: string[];
    horizon: number;
    confidence: number;
    timestamp: string;
    duration: number;
  };
}

/**
 * Training features for ML models
 */
export interface TrainingFeature {
  label: number;
  features: number[];
  sku: string;
  date: string;
}

/**
 * XGBoost model structure
 */
export interface XGBModelData {
  trees: any[];
  config: {
    n_estimators: number;
    max_depth: number;
    learning_rate: number;
  };
  feature_names: string[];
}
