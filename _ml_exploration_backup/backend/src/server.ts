/**
 * Express Server
 * Main backend API endpoints
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { aggregateCSV } from './services/aggregation';
import { generateForecasts } from './services/forecasting';
import { createEnsemble } from './ml/ensemble';
import { trainXGBModel, loadXGBModel, predictXGB } from './ml/train-xgboost';
import { extractFeatures, generateTrainingData, generateTestData } from './ml/features';
import { analyzeSKUCharacteristics, calculateMethodWeights, applyWeightedEnsemble, explainWeights } from './ml/adaptive-weighting';
import { SkuMonthAggregate, CompleteForecast } from './types';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173'
}));
app.use(express.json({ limit: '100mb' }));

// Request tracking
app.use((req: Request, res: Response, next: NextFunction) => {
  (req as any).startTime = Date.now();
  next();
});

// State
let currentAggregates: SkuMonthAggregate[] | null = null;
let xgbModel: any = null;
let isTraining = false;

/**
 * Health check
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    hasData: currentAggregates !== null,
    xgbReady: xgbModel !== null,
    xgbTraining: isTraining
  });
});

/**
 * POST /api/aggregate
 * Upload CSV and aggregate to SKU-month level
 */
app.post('/api/aggregate', async (req: Request, res: Response) => {
  try {
    const { csvData } = req.body;

    if (!csvData || typeof csvData !== 'string' || csvData.length === 0) {
      return res.status(400).json({ error: 'CSV data required' });
    }

    console.log(`📥 Aggregating CSV (${csvData.length} bytes)...`);

    const aggregates = aggregateCSV(csvData);

    if (aggregates.length === 0) {
      return res.status(400).json({ error: 'No valid data in CSV' });
    }

    currentAggregates = aggregates;
    const uniqueSkus = new Set(aggregates.map(a => a.sku)).size;
    
    // Find date range
    let minDate = '';
    let maxDate = '';
    aggregates.forEach(a => {
      if (!minDate || a.yearMonth < minDate) minDate = a.yearMonth;
      if (!maxDate || a.yearMonth > maxDate) maxDate = a.yearMonth;
    });

    console.log(`✅ Aggregated ${aggregates.length} records (${uniqueSkus} SKUs)`);

    res.json({
      status: 'success',
      records: aggregates.length,
      uniqueSkus,
      dateRange: { start: minDate, end: maxDate },
      message: 'Data aggregated. Run /api/train-xgb to train ML model.'
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('❌ Aggregation error:', msg);
    res.status(500).json({ error: msg });
  }
});

/**
 * POST /api/train-xgb
 * Train XGBoost model on loaded data
 */
app.post('/api/train-xgb', async (req: Request, res: Response) => {
  try {
    if (!currentAggregates) {
      return res.status(400).json({ error: 'No data loaded. Upload CSV first.' });
    }

    if (isTraining) {
      return res.status(400).json({ error: 'Training already in progress' });
    }

    isTraining = true;
    const startTime = Date.now();

    console.log('🤖 Starting XGBoost training...');

    const result = await trainXGBModel(currentAggregates);

    if (!result) {
      isTraining = false;
      return res.status(400).json({
        error: 'Not enough data to train (need 6+ months per SKU)',
        minimum: 'Try uploading more historical data'
      });
    }

    // Load trained model
    xgbModel = loadXGBModel();

    isTraining = false;
    const duration = Date.now() - startTime;

    console.log(`✅ Training completed in ${(duration / 1000).toFixed(1)}s`);

    res.json({
      status: 'success',
      training: result,
      duration,
      modelReady: xgbModel !== null,
      message: 'XGBoost model trained and ready for forecasting'
    });
  } catch (error) {
    isTraining = false;
    const msg = error instanceof Error ? error.message : String(error);
    console.error('❌ Training error:', msg);
    res.status(500).json({ error: msg });
  }
});

/**
 * GET /api/forecast
 * Generate forecasts using specified methods
 * Query: ?skus=SKU1,SKU2&method=ensemble&horizon=12&confidence=95&include=hw,prophet,arima,linear,xgb
 */
app.get('/api/forecast', async (req: Request, res: Response) => {
  try {
    if (!currentAggregates) {
      return res.status(400).json({ error: 'No data loaded. Upload CSV first.' });
    }

    const {
      skus = '',
      horizon = '12',
      confidence = '95',
      include = 'hw,prophet,arima,linear' // Don't include XGB by default
    } = req.query;

    if (!skus || typeof skus !== 'string') {
      return res.status(400).json({ error: 'skus parameter required' });
    }

    const skuList = skus.split(',').map(s => s.trim()).filter(s => s.length > 0);
    const horizonNum = Math.min(36, Math.max(1, parseInt(horizon as string) || 12));
    const confidenceNum = Math.max(80, Math.min(99, parseInt(confidence as string) || 95));

    // Filter aggregates for requested SKUs
    const filtered = currentAggregates.filter(a => skuList.includes(a.sku));

    if (filtered.length === 0) {
      return res.status(404).json({
        error: `No data found for SKUs: ${skuList.join(', ')}`
      });
    }

    const methods = (include as string).split(',').map(m => m.trim().toLowerCase());
    const forecasts = new Map<string, any>();

    // Calculate statistical forecasts
    if (methods.includes('hw')) {
      forecasts.set('hw', generateForecasts(filtered, 'hw', horizonNum, confidenceNum));
    }
    if (methods.includes('prophet')) {
      forecasts.set('prophet', generateForecasts(filtered, 'prophet', horizonNum, confidenceNum));
    }
    if (methods.includes('arima')) {
      forecasts.set('arima', generateForecasts(filtered, 'arima', horizonNum, confidenceNum));
    }
    if (methods.includes('linear')) {
      forecasts.set('linear', generateForecasts(filtered, 'linear', horizonNum, confidenceNum));
    }

    // XGBoost (if model loaded and requested)
    if (methods.includes('xgb') && xgbModel) {
      console.log('🤖 Generating XGBoost forecasts...');

      // Sort aggregates by SKU and date
      const sorted = filtered.sort((a, b) => {
        if (a.sku !== b.sku) return a.sku.localeCompare(b.sku);
        return a.yearMonth.localeCompare(b.yearMonth);
      });

      const bySkuMap = new Map<string, SkuMonthAggregate[]>();
      sorted.forEach(agg => {
        if (!bySkuMap.has(agg.sku)) {
          bySkuMap.set(agg.sku, []);
        }
        bySkuMap.get(agg.sku)!.push(agg);
      });

      const xgbForecasts: any[] = [];

      bySkuMap.forEach((skuData, sku) => {
        // Extract features for all future periods
        const xgbForecast: number[] = [];
        const xgbLower: number[] = [];
        const xgbUpper: number[] = [];

        // Start from last data point
        let workingData = [...skuData];

        for (let i = 0; i < horizonNum; i++) {
          const features = extractFeatures(workingData, workingData.length - 1);
          const pred = predictXGB(xgbModel, [features])[0];

          xgbForecast.push(Math.max(0, Math.round(pred)));

          // For bounds, use ±20% as simple uncertainty estimate
          const uncertainty = pred * 0.2;
          xgbLower.push(Math.max(0, Math.round(pred - uncertainty)));
          xgbUpper.push(Math.round(pred + uncertainty));

          // Add predicted point to working data for next iteration
          const lastDate = new Date(workingData[workingData.length - 1].yearMonth + '-01');
          lastDate.setMonth(lastDate.getMonth() + 1);

          workingData.push({
            sku,
            yearMonth: `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}`,
            quantity: pred,
            count: 1,
            minQty: pred,
            maxQty: pred,
            stdDev: 0
          });
        }

        // Generate dates
        const lastDate = new Date(skuData[skuData.length - 1].yearMonth + '-01');
        const dates: string[] = [];
        for (let i = 1; i <= horizonNum; i++) {
          const d = new Date(lastDate);
          d.setMonth(d.getMonth() + i);
          dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
        }

        xgbForecasts.push({
          sku,
          dates,
          forecast: xgbForecast,
          lowerBound: xgbLower,
          upperBound: xgbUpper,
          method: 'xgb'
        });
      });

      forecasts.set('xgb', xgbForecasts);
    }

    // Create ensemble
    const ensembleForecasts = createEnsemble(forecasts);
    if (ensembleForecasts.length > 0) {
      forecasts.set('ensemble', ensembleForecasts);
    }

    const duration = Date.now() - (req as any).startTime;

    res.json({
      status: 'success',
      data: Object.fromEntries(forecasts),
      metadata: {
        skus: skuList,
        horizon: horizonNum,
        confidence: confidenceNum,
        timestamp: new Date().toISOString(),
        duration,
        xgbAvailable: xgbModel !== null
      }
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('❌ Forecast error:', msg);
    res.status(500).json({ error: msg });
  }
});

/**
 * GET /api/sku-analysis
 * Analyze SKU characteristics and show adaptive weights
 * Query: ?skus=SKU1,SKU2
 */
app.get('/api/sku-analysis', (req: Request, res: Response) => {
  try {
    if (!currentAggregates) {
      return res.status(400).json({ error: 'No data loaded. Upload CSV first.' });
    }

    const { skus = '' } = req.query;
    if (!skus || typeof skus !== 'string') {
      return res.status(400).json({ error: 'skus parameter required' });
    }

    const skuList = skus.split(',').map(s => s.trim()).filter(s => s.length > 0);

    // Group aggregates by SKU
    const bySkuMap = new Map<string, SkuMonthAggregate[]>();
    currentAggregates.forEach(agg => {
      if (skuList.includes(agg.sku)) {
        if (!bySkuMap.has(agg.sku)) {
          bySkuMap.set(agg.sku, []);
        }
        bySkuMap.get(agg.sku)!.push(agg);
      }
    });

    if (bySkuMap.size === 0) {
      return res.status(404).json({ error: `No data for SKUs: ${skuList.join(', ')}` });
    }

    // Analyze each SKU
    const analysis: any[] = [];
    bySkuMap.forEach((skuData, sku) => {
      const sorted = [...skuData].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
      const characteristics = analyzeSKUCharacteristics(sorted);
      
      if (characteristics) {
        const weights = calculateMethodWeights(characteristics, xgbModel !== null);
        const explanation = explainWeights(characteristics, weights);

        analysis.push({
          sku,
          characteristics,
          weights,
          explanation
        });
      }
    });

    res.json({
      status: 'success',
      analysis
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('❌ Analysis error:', msg);
    res.status(500).json({ error: msg });
  }
});

/**
 * GET /api/status
 * Get current backend status
 */
app.get('/api/status', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    dataLoaded: currentAggregates !== null,
    dataCount: currentAggregates?.length || 0,
    uniqueSkus: currentAggregates ? new Set(currentAggregates.map(a => a.sku)).size : 0,
    xgbModel: {
      trained: xgbModel !== null,
      training: isTraining,
      path: process.env.ML_MODEL_PATH
    },
    uptime: process.uptime()
  });
});

// Serve static files from frontend build (production)
const distPath = path.join(__dirname, '../../dist');
app.use(express.static(distPath));

// SPA fallback: serve index.html for all non-API routes
app.get('*', (req: Request, res: Response) => {
  // Don't serve index.html for API routes
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) {
        // If index.html doesn't exist (dev mode), just 404
        res.status(404).json({ error: 'Not found' });
      }
    });
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// Error handling
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Error:', err);
  res.status(500).json({ error: err.message });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`✅ Supply Chain Backend running on port ${PORT}`);
  console.log(`📍 Frontend: ${process.env.FRONTEND_URL || `http://localhost:${PORT}`}`);
  console.log(`🎯 Routes:`);
  console.log(`   /                          - Frontend (SPA)`);
  console.log(`   POST /api/aggregate        - Upload CSV`);
  console.log(`   POST /api/train-xgb        - Train ML model`);
  console.log(`   GET  /api/forecast         - Get forecasts`);
  console.log(`   GET  /api/status           - Backend status`);
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.close();
  process.exit(0);
});
