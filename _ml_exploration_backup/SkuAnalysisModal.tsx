/**
 * SkuAnalysisModal Component
 * Shows detailed analysis of SKU characteristics and adaptive weights
 * Helps users understand why certain methods are preferred
 */

import React, { useState, useEffect } from 'react';
import { trainingService, SkuAnalysisResponse, getErrorMessage } from '../services/trainingService';

interface SkuAnalysisModalProps {
  skus: string[];
  onClose: () => void;
}

const SkuAnalysisModal: React.FC<SkuAnalysisModalProps> = ({ skus, onClose }) => {
  const [analysisData, setAnalysisData] = useState<SkuAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSku, setExpandedSku] = useState<string | null>(skus[0] || null);

  // Fetch analysis on mount
  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await trainingService.getSkuAnalysis(skus);
        setAnalysisData(result);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [skus]);

  // Helper to get method icon and color
  const getMethodStyle = (method: string): { icon: string; color: string; bgColor: string } => {
    const styles: Record<string, { icon: string; color: string; bgColor: string }> = {
      xgboost: { icon: '🤖', color: 'text-purple-700', bgColor: 'bg-purple-100' },
      holt_winters: { icon: '📊', color: 'text-blue-700', bgColor: 'bg-blue-100' },
      prophet: { icon: '🔮', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
      arima: { icon: '📈', color: 'text-orange-700', bgColor: 'bg-orange-100' },
      linear: { icon: '📐', color: 'text-green-700', bgColor: 'bg-green-100' }
    };
    return styles[method] || { icon: '📊', color: 'text-gray-700', bgColor: 'bg-gray-100' };
  };

  // Render characteristic gauge
  const CharacteristicGauge: React.FC<{
    label: string;
    value: number;
    interpretation: string;
  }> = ({ label, value, interpretation }) => {
    const percentage = Math.min(100, Math.max(0, value * 100));
    const color = percentage < 33 ? 'bg-green-500' : percentage < 66 ? 'bg-yellow-500' : 'bg-red-500';

    return (
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-gray-700">{label}</span>
          <span className="text-sm font-bold text-gray-800">{value.toFixed(2)}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${percentage}%` }} />
        </div>
        <p className="text-xs text-gray-600 italic">{interpretation}</p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold">📊 SKU Analysis</h3>
            <p className="text-blue-100 text-sm mt-1">
              Characteristics & Adaptive Weights
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl hover:opacity-75 transition"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="text-center py-8">
              <div className="text-4xl mb-2 animate-spin">⚙️</div>
              <p className="text-gray-600">Analyzing SKU characteristics...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded-lg mb-4">
              <p className="font-bold mb-1">Error Loading Analysis</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {analysisData && analysisData.data.length > 0 && (
            <div className="space-y-4">
              {/* SKU Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-200">
                {analysisData.data.map(item => (
                  <button
                    key={item.sku}
                    onClick={() => setExpandedSku(item.sku)}
                    className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
                      expandedSku === item.sku
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {item.sku}
                  </button>
                ))}
              </div>

              {/* Selected SKU Details */}
              {analysisData.data
                .filter(item => item.sku === expandedSku)
                .map(item => (
                  <div key={item.sku} className="space-y-6">
                    {/* Characteristics */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-bold text-gray-800 mb-4 text-lg">📈 Product Characteristics</h4>
                      <div className="space-y-3">
                        <CharacteristicGauge
                          label="Volatility"
                          value={item.characteristics.volatility}
                          interpretation={
                            item.characteristics.volatility > 0.7
                              ? 'High volatility - unpredictable demand'
                              : item.characteristics.volatility > 0.4
                              ? 'Moderate volatility'
                              : 'Stable demand pattern'
                          }
                        />
                        <CharacteristicGauge
                          label="Seasonality"
                          value={item.characteristics.seasonality}
                          interpretation={
                            item.characteristics.seasonality > 0.6
                              ? 'Strong seasonal pattern detected'
                              : item.characteristics.seasonality > 0.3
                              ? 'Some seasonal effects'
                              : 'Minimal seasonal impact'
                          }
                        />
                        <CharacteristicGauge
                          label="Trend"
                          value={Math.abs(item.characteristics.trend)}
                          interpretation={
                            Math.abs(item.characteristics.trend) > 0.08
                              ? `Strong ${item.characteristics.trend > 0 ? 'upward' : 'downward'} trend`
                              : Math.abs(item.characteristics.trend) > 0.04
                              ? 'Slight trend present'
                              : 'No significant trend'
                          }
                        />
                        <CharacteristicGauge
                          label="Sparsity"
                          value={item.characteristics.sparsity}
                          interpretation={
                            item.characteristics.sparsity > 0.5
                              ? 'Sparse data - many missing values'
                              : item.characteristics.sparsity > 0.2
                              ? 'Some missing values'
                              : 'Complete data availability'
                          }
                        />
                        <div className="pt-2 border-t border-gray-200">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-700">Data Points:</span>
                            <span className="text-lg font-bold text-gray-900">{item.characteristics.dataPoints}</span>
                            <span className="text-xs text-gray-500">
                              ({item.characteristics.dataPoints < 12 ? '⚠️ Low' : item.characteristics.dataPoints < 24 ? '⚠️ Moderate' : '✅ Good'})
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Adaptive Weights */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-bold text-gray-800 mb-4 text-lg">⚖️ Ensemble Weights</h4>
                      <div className="space-y-3">
                        {Object.entries(item.weights)
                          .sort(([, a], [, b]) => b - a) // Sort by weight descending
                          .map(([method, weight]) => {
                            const style = getMethodStyle(method);
                            return (
                              <div key={method} className={`${style.bgColor} rounded-lg p-3`}>
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xl">{style.icon}</span>
                                    <span className={`font-bold ${style.color}`}>
                                      {method.replace('_', ' ').toUpperCase()}
                                    </span>
                                  </div>
                                  <span className={`text-xl font-bold ${style.color}`}>
                                    {(weight * 100).toFixed(1)}%
                                  </span>
                                </div>
                                <div className="w-full bg-white bg-opacity-50 rounded-full h-2">
                                  <div
                                    className={style.bgColor.replace('100', '600')}
                                    style={{
                                      width: `${weight * 100}%`,
                                      height: '100%',
                                      borderRadius: '999px',
                                      transition: 'width 0.3s'
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                      <div className="mt-4 pt-4 border-t border-blue-200">
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">💡 Note:</span> Weights are automatically adjusted based on product characteristics. More volatile products get higher XGBoost weight, while seasonal products favor Holt-Winters.
                        </p>
                      </div>
                    </div>

                    {/* Explanation */}
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                      <h4 className="font-bold text-gray-800 mb-2">📝 Analysis Explanation</h4>
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {item.explanation}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {!loading && !error && (!analysisData || analysisData.data.length === 0) && (
            <div className="text-center py-8">
              <p className="text-gray-600">No analysis data available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SkuAnalysisModal;
