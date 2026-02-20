/**
 * Training Service
 * Handles all API calls for ML model training
 * Connects frontend to backend on port 3000
 */

const BASE_URL = 'http://localhost:3000';

// ============================================================================
// Type Definitions
// ============================================================================

export interface TrainingResponse {
  status: 'success' | 'error';
  training?: {
    mape: number;
    trainingSamples: number;
    testSamples: number;
    method: string;
    duration: number;
  };
  duration?: number;
  modelReady?: boolean;
  message?: string;
  error?: string;
}

export interface BackendStatus {
  status: string;
  hasData: boolean;
  xgbReady: boolean;
  xgbTraining: boolean;
  uptime: number;
}

export interface AggregationResponse {
  success: boolean;
  skus: string[];
  data: Array<{
    sku: string;
    yearMonth: string;
    quantity: number;
    count: number;
    minQty: number;
    maxQty: number;
    stdDev: number;
  }>;
  stats?: {
    rawRecords: number;
    aggregatedRecords: number;
    compressionRatio: number;
  };
  error?: string;
}

export interface SkuAnalysisResponse {
  success: boolean;
  data: Array<{
    sku: string;
    characteristics: {
      volatility: number;
      seasonality: number;
      trend: number;
      sparsity: number;
      dataPoints: number;
    };
    weights: {
      xgboost: number;
      holt_winters: number;
      prophet: number;
      linear: number;
      arima: number;
    };
    explanation: string;
  }>;
  error?: string;
}

export interface ForecastResponse {
  success: boolean;
  forecasts: Array<{
    date: string;
    quantity: number;
    upperBound: number;
    lowerBound: number;
    confidence: number;
    methodMix: {
      xgboost?: number;
      holt_winters: number;
      prophet: number;
      arima: number;
      linear: number;
    };
  }>;
  error?: string;
}

// ============================================================================
// Error Handling
// ============================================================================

class TrainingServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'TrainingServiceError';
  }
}

const handleError = (error: unknown): TrainingServiceError => {
  if (error instanceof TrainingServiceError) {
    return error;
  }

  if (error instanceof TypeError) {
    if (error.message.includes('fetch')) {
      return new TrainingServiceError(
        'NETWORK_ERROR',
        'Cannot connect to backend. Is the server running on port 3000?'
      );
    }
  }

  if (error instanceof Error) {
    return new TrainingServiceError(
      'UNKNOWN_ERROR',
      error.message
    );
  }

  return new TrainingServiceError(
    'UNKNOWN_ERROR',
    'An unexpected error occurred'
  );
};

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get backend status and model readiness
 */
export const getStatus = async (): Promise<BackendStatus> => {
  try {
    const response = await fetch(`${BASE_URL}/api/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (!response.ok) {
      throw new TrainingServiceError(
        'STATUS_ERROR',
        `Backend returned ${response.status}: ${response.statusText}`,
        response.status
      );
    }

    const data = await response.json();
    return data as BackendStatus;
  } catch (error) {
    throw handleError(error);
  }
};

/**
 * Aggregate CSV data on backend
 * Converts raw CSV to SKU-month aggregation
 */
export const aggregateData = async (csvData: string): Promise<AggregationResponse> => {
  try {
    if (!csvData || csvData.trim().length === 0) {
      throw new TrainingServiceError(
        'EMPTY_CSV',
        'CSV data cannot be empty'
      );
    }

    const response = await fetch(`${BASE_URL}/api/aggregate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvData }),
      signal: AbortSignal.timeout(30000) // 30 second timeout for large files
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new TrainingServiceError(
        'AGGREGATION_ERROR',
        error.error || `Aggregation failed: ${response.statusText}`,
        response.status
      );
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new TrainingServiceError(
        'AGGREGATION_FAILED',
        data.error || 'Aggregation failed without specific error'
      );
    }

    return data as AggregationResponse;
  } catch (error) {
    throw handleError(error);
  }
};

/**
 * Trigger model training
 * Backend will build gradient boosting model
 * This returns immediately, training happens async
 */
export const trainModel = async (): Promise<TrainingResponse> => {
  try {
    const response = await fetch(`${BASE_URL}/api/train-xgb`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(300000) // 5 minute timeout for training
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new TrainingServiceError(
        'TRAINING_ERROR',
        error.error || `Training failed: ${response.statusText}`,
        response.status
      );
    }

    const data = await response.json();
    
    if (data.status === 'error') {
      throw new TrainingServiceError(
        'TRAINING_FAILED',
        data.error || data.message || 'Training failed'
      );
    }

    return data as TrainingResponse;
  } catch (error) {
    throw handleError(error);
  }
};

/**
 * Get SKU analysis with adaptive weights
 * Shows characteristics and why weights were adjusted
 */
export const getSkuAnalysis = async (skus: string[]): Promise<SkuAnalysisResponse> => {
  try {
    if (!skus || skus.length === 0) {
      throw new TrainingServiceError(
        'EMPTY_SKUS',
        'Must provide at least one SKU'
      );
    }

    const skuString = skus.join(',');
    const response = await fetch(`${BASE_URL}/api/sku-analysis?skus=${encodeURIComponent(skuString)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new TrainingServiceError(
        'ANALYSIS_ERROR',
        error.error || `Analysis failed: ${response.statusText}`,
        response.status
      );
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new TrainingServiceError(
        'ANALYSIS_FAILED',
        data.error || 'Analysis failed without specific error'
      );
    }

    return data as SkuAnalysisResponse;
  } catch (error) {
    throw handleError(error);
  }
};

/**
 * Generate forecast with trained model (if ready)
 * Falls back to statistical methods if model not trained
 */
export const generateForecast = async (
  skus: string[],
  horizon: number = 12,
  confidence: number = 95
): Promise<ForecastResponse> => {
  try {
    if (!skus || skus.length === 0) {
      throw new TrainingServiceError(
        'EMPTY_SKUS',
        'Must provide at least one SKU'
      );
    }

    if (horizon < 1 || horizon > 24) {
      throw new TrainingServiceError(
        'INVALID_HORIZON',
        'Horizon must be between 1 and 24 months'
      );
    }

    if (confidence < 50 || confidence > 99) {
      throw new TrainingServiceError(
        'INVALID_CONFIDENCE',
        'Confidence must be between 50 and 99'
      );
    }

    const skuString = skus.join(',');
    const params = new URLSearchParams({
      skus: skuString,
      horizon: horizon.toString(),
      confidence: confidence.toString()
    });

    const response = await fetch(`${BASE_URL}/api/forecast?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000) // 15 second timeout
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new TrainingServiceError(
        'FORECAST_ERROR',
        error.error || `Forecast generation failed: ${response.statusText}`,
        response.status
      );
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new TrainingServiceError(
        'FORECAST_FAILED',
        data.error || 'Forecast generation failed'
      );
    }

    return data as ForecastResponse;
  } catch (error) {
    throw handleError(error);
  }
};

// ============================================================================
// Polling Helper
// ============================================================================

/**
 * Poll backend status until training completes or timeout
 * Useful for monitoring training progress
 */
export const pollUntilTrainingComplete = async (
  intervalMs: number = 500,
  timeoutMs: number = 300000, // 5 minutes default
  onUpdate?: (status: BackendStatus) => void
): Promise<void> => {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const status = await getStatus();

        // Call update callback if provided
        if (onUpdate) {
          onUpdate(status);
        }

        // Check if training is complete
        if (!status.xgbTraining) {
          clearInterval(interval);
          resolve();
          return;
        }

        // Check timeout
        if (Date.now() - startTime > timeoutMs) {
          clearInterval(interval);
          reject(new TrainingServiceError(
            'TRAINING_TIMEOUT',
            `Training did not complete within ${timeoutMs / 1000} seconds`
          ));
          return;
        }
      } catch (error) {
        clearInterval(interval);
        reject(handleError(error));
      }
    }, intervalMs);
  });
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if backend is reachable
 * Good for initialization/health check
 */
export const isBackendReady = async (): Promise<boolean> => {
  try {
    await getStatus();
    return true;
  } catch {
    return false;
  }
};

/**
 * Format error message for display
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof TrainingServiceError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred';
};

/**
 * Retry a function with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  initialDelayMs: number = 1000
): Promise<T> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts) {
        const delayMs = initialDelayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
};

// ============================================================================
// Export all functions as service object (optional)
// ============================================================================

export const trainingService = {
  getStatus,
  aggregateData,
  trainModel,
  getSkuAnalysis,
  generateForecast,
  pollUntilTrainingComplete,
  isBackendReady,
  getErrorMessage,
  retryWithBackoff
};

export default trainingService;
