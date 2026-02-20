/**
 * TrainingPanel Component
 * Main UI for model training workflow
 * Handles: CSV upload, aggregation, training, progress, and analysis
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  trainingService,
  BackendStatus,
  AggregationResponse,
  TrainingResponse,
  getErrorMessage
} from '../services/trainingService';
import SkuAnalysisModal from './SkuAnalysisModal';

interface TrainingState {
  step: 'upload' | 'aggregating' | 'aggregated' | 'training' | 'complete' | 'error';
  csvFile: File | null;
  aggregationData: AggregationResponse | null;
  backendStatus: BackendStatus | null;
  trainingMetrics: TrainingResponse | null;
  error: string | null;
  progress: number;
  skus: string[];
  selectedSkus: string[];
  showAnalysis: boolean;
  isBackendReady: boolean;
}

const TrainingPanel: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<TrainingState>({
    step: 'upload',
    csvFile: null,
    aggregationData: null,
    backendStatus: null,
    trainingMetrics: null,
    error: null,
    progress: 0,
    skus: [],
    selectedSkus: [],
    showAnalysis: false,
    isBackendReady: false
  });

  // Check backend availability on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const ready = await trainingService.isBackendReady();
        setState(prev => ({ ...prev, isBackendReady: ready }));

        if (ready) {
          const status = await trainingService.getStatus();
          setState(prev => ({ ...prev, backendStatus: status }));
        }
      } catch (error) {
        const errorMsg = getErrorMessage(error);
        setState(prev => ({
          ...prev,
          error: `Backend connection error: ${errorMsg}`,
          isBackendReady: false
        }));
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 5000); // Recheck every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setState(prev => ({
        ...prev,
        error: 'Please select a CSV file',
        step: 'error'
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      csvFile: file,
      error: null,
      step: 'upload'
    }));
  };

  // Handle CSV aggregation
  const handleAggregate = async () => {
    if (!state.csvFile) {
      setState(prev => ({ ...prev, error: 'No CSV file selected', step: 'error' }));
      return;
    }

    setState(prev => ({
      ...prev,
      step: 'aggregating',
      error: null,
      progress: 10
    }));

    try {
      const csvText = await state.csvFile.text();
      setState(prev => ({ ...prev, progress: 30 }));

      const result = await trainingService.aggregateData(csvText);
      setState(prev => ({ ...prev, progress: 80 }));

      const uniqueSkus = [...new Set(result.data.map(d => d.sku))];

      setState(prev => ({
        ...prev,
        step: 'aggregated',
        aggregationData: result,
        skus: uniqueSkus,
        selectedSkus: uniqueSkus.slice(0, 5), // Select first 5 by default
        progress: 100,
        error: null
      }));
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      setState(prev => ({
        ...prev,
        step: 'error',
        error: `Aggregation failed: ${errorMsg}`,
        progress: 0
      }));
    }
  };

  // Handle model training
  const handleTrain = async () => {
    setState(prev => ({
      ...prev,
      step: 'training',
      error: null,
      progress: 5
    }));

    try {
      // Start training request
      const trainingResult = await trainingService.trainModel();
      setState(prev => ({ ...prev, progress: 20 }));

      // Poll until complete
      await trainingService.pollUntilTrainingComplete(
        500, // Poll every 500ms
        300000, // 5 minute timeout
        (status) => {
          setState(prev => ({
            ...prev,
            backendStatus: status,
            progress: Math.min(95, prev.progress + 5)
          }));
        }
      );

      setState(prev => ({
        ...prev,
        step: 'complete',
        trainingMetrics: trainingResult,
        progress: 100,
        error: null
      }));
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      setState(prev => ({
        ...prev,
        step: 'error',
        error: `Training failed: ${errorMsg}`,
        progress: 0
      }));
    }
  };

  // Handle SKU selection toggle
  const handleSkuToggle = (sku: string) => {
    setState(prev => {
      const newSelected = prev.selectedSkus.includes(sku)
        ? prev.selectedSkus.filter(s => s !== sku)
        : [...prev.selectedSkus, sku];
      return { ...prev, selectedSkus: newSelected };
    });
  };

  // Handle select/deselect all
  const handleSelectAllSkus = (selectAll: boolean) => {
    setState(prev => ({
      ...prev,
      selectedSkus: selectAll ? prev.skus : []
    }));
  };

  // Reset for new upload
  const handleReset = () => {
    setState({
      step: 'upload',
      csvFile: null,
      aggregationData: null,
      backendStatus: null,
      trainingMetrics: null,
      error: null,
      progress: 0,
      skus: [],
      selectedSkus: [],
      showAnalysis: false,
      isBackendReady: state.isBackendReady
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Render different UI based on step
  return (
    <div className="training-panel p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">📊 Model Training</h2>
        <p className="text-gray-600">
          Upload CSV data and train an ML model to improve forecasts
        </p>
      </div>

      {/* Backend Status Indicator */}
      <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
        state.isBackendReady
          ? 'bg-green-100 text-green-800'
          : 'bg-red-100 text-red-800'
      }`}>
        <span className="text-lg">
          {state.isBackendReady ? '✅' : '❌'}
        </span>
        <span className="font-medium">
          Backend: {state.isBackendReady ? 'Connected' : 'Disconnected'}
        </span>
        {!state.isBackendReady && (
          <span className="text-sm">
            (Make sure port 3000 is running: npx tsx backend/src/server.ts)
          </span>
        )}
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <p className="font-bold mb-1">⚠️ Error</p>
          <p className="text-sm">{state.error}</p>
        </div>
      )}

      {/* Step 1: CSV Upload */}
      {state.step === 'upload' && (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center hover:bg-blue-50 transition">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-input"
            />
            <label htmlFor="csv-input" className="cursor-pointer">
              <div className="text-4xl mb-2">📁</div>
              <p className="text-gray-700 font-semibold">
                {state.csvFile ? state.csvFile.name : 'Click to select CSV file'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                or drag and drop
              </p>
            </label>
          </div>

          <button
            onClick={handleAggregate}
            disabled={!state.csvFile || !state.isBackendReady}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition"
          >
            Next: Aggregate Data
          </button>
        </div>
      )}

      {/* Step 2: Aggregating */}
      {state.step === 'aggregating' && (
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-4xl mb-2">⚙️</div>
            <p className="text-gray-700 font-semibold">Aggregating CSV Data...</p>
            <p className="text-sm text-gray-500 mt-1">
              Converting raw transactions to monthly summaries
            </p>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${state.progress}%` }}
            />
          </div>

          <p className="text-center text-sm text-gray-600">
            {state.progress}% complete
          </p>
        </div>
      )}

      {/* Step 3: Data Aggregated - SKU Selection */}
      {state.step === 'aggregated' && state.aggregationData && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-300 rounded-lg p-4 mb-4">
            <p className="text-green-800 font-semibold mb-2">✅ Data Aggregated Successfully</p>
            <div className="grid grid-cols-2 gap-2 text-sm text-green-700">
              <p>📊 Total SKUs: <span className="font-bold">{state.aggregationData.skus.length}</span></p>
              <p>📈 Aggregated Records: <span className="font-bold">{state.aggregationData.data.length}</span></p>
              <p>🗜️ Compression: <span className="font-bold">{state.aggregationData.stats?.compressionRatio.toFixed(1)}x</span></p>
              <p>📦 Raw Records: <span className="font-bold">{state.aggregationData.stats?.rawRecords}</span></p>
            </div>
          </div>

          {/* SKU Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-gray-700">
                Select SKUs to Train ({state.selectedSkus.length}/{state.skus.length})
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSelectAllSkus(true)}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  All
                </button>
                <button
                  onClick={() => handleSelectAllSkus(false)}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  None
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-white">
              {state.skus.map(sku => (
                <label key={sku} className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={state.selectedSkus.includes(sku)}
                    onChange={() => handleSkuToggle(sku)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">{sku}</span>
                </label>
              ))}
            </div>
          </div>

          {/* SKU Analysis Button */}
          <button
            onClick={() => setState(prev => ({ ...prev, showAnalysis: true }))}
            className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition text-sm"
          >
            📊 Analyze Selected SKUs
          </button>

          {/* Train Button */}
          <button
            onClick={handleTrain}
            disabled={state.selectedSkus.length === 0 || !state.isBackendReady}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition"
          >
            Next: Train Model
          </button>
        </div>
      )}

      {/* Step 4: Training */}
      {state.step === 'training' && (
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-4xl mb-2 animate-spin">🤖</div>
            <p className="text-gray-700 font-semibold">Training XGBoost Model...</p>
            <p className="text-sm text-gray-500 mt-1">
              Building 100 decision trees with {state.selectedSkus.length} SKUs
            </p>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-green-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${state.progress}%` }}
            />
          </div>

          <p className="text-center text-lg font-semibold text-gray-700">
            {state.progress}% complete
          </p>

          {state.backendStatus && (
            <div className="text-sm text-gray-600 text-center">
              <p>Backend uptime: {(state.backendStatus.uptime / 1000).toFixed(1)}s</p>
              <p className="text-xs mt-1">
                Training happens server-side, this window can be closed safely
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step 5: Training Complete */}
      {state.step === 'complete' && state.trainingMetrics && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-400 rounded-lg p-6">
            <p className="text-center text-2xl font-bold text-green-800 mb-4">
              ✅ Training Complete!
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-gray-600 uppercase tracking-wide">Model Accuracy</p>
                <p className="text-2xl font-bold text-green-700">
                  {(100 - state.trainingMetrics.training!.mape).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">MAPE: {state.trainingMetrics.training!.mape.toFixed(2)}%</p>
              </div>

              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-gray-600 uppercase tracking-wide">Training Duration</p>
                <p className="text-2xl font-bold text-blue-700">
                  {(state.trainingMetrics.training!.duration / 1000).toFixed(1)}s
                </p>
                <p className="text-xs text-gray-500">
                  {state.trainingMetrics.training!.trainingSamples} training samples
                </p>
              </div>

              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-gray-600 uppercase tracking-wide">Training Data</p>
                <p className="text-2xl font-bold text-indigo-700">
                  {state.trainingMetrics.training!.trainingSamples}
                </p>
                <p className="text-xs text-gray-500">
                  Test: {state.trainingMetrics.training!.testSamples}
                </p>
              </div>

              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-gray-600 uppercase tracking-wide">Method</p>
                <p className="text-2xl font-bold text-purple-700">
                  XGBoost
                </p>
                <p className="text-xs text-gray-500">
                  100 trees ensemble
                </p>
              </div>
            </div>

            <p className="text-center text-sm text-gray-700 mt-4">
              Model is ready! Forecasts will now use the trained XGBoost model.
            </p>
          </div>

          <button
            onClick={handleReset}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition"
          >
            Train Another Model
          </button>
        </div>
      )}

      {/* Analysis Modal */}
      {state.showAnalysis && state.selectedSkus.length > 0 && (
        <SkuAnalysisModal
          skus={state.selectedSkus}
          onClose={() => setState(prev => ({ ...prev, showAnalysis: false }))}
        />
      )}
    </div>
  );
};

export default TrainingPanel;
