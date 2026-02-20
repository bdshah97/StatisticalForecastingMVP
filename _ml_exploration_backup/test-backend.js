#!/usr/bin/env node

/**
 * Backend Integration Test
 * Tests gradient boosting training with Big Tex CSV
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testBackend() {
  console.log('🧪 Starting Backend Integration Tests...\n');

  // 1. Test Status Endpoint
  console.log('1️⃣  Testing /api/status endpoint...');
  try {
    const response = await fetch('http://localhost:3000/api/status', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    console.log(`   ✅ Status: ${JSON.stringify(data, null, 2).substring(0, 100)}...\n`);
  } catch (e) {
    console.log(`   ❌ Failed: ${e.message}\n`);
  }

  // 2. Test Aggregation with Big Tex CSV
  console.log('2️⃣  Testing /api/aggregate with Big Tex CSV...');
  try {
    const csvPath = path.join(__dirname, 'Big Tex Historical Sales.csv');
    const csv = fs.readFileSync(csvPath, 'utf-8');
    
    const response = await fetch('http://localhost:3000/api/aggregate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv })
    });
    const data = await response.json();
    
    if (data.success) {
      console.log(`   ✅ Aggregated ${data.skus.length} SKUs, ${data.data.length} months of data`);
      console.log(`   📊 Sample SKU: ${data.skus[0]} (${data.data.filter(d => d.sku === data.skus[0]).length} months)\n`);
    } else {
      console.log(`   ❌ Aggregation failed: ${data.error}\n`);
    }
  } catch (e) {
    console.log(`   ❌ Failed: ${e.message}\n`);
  }

  // 3. Test Training
  console.log('3️⃣  Testing /api/train-xgb (Gradient Boosting)...');
  try {
    const csvPath = path.join(__dirname, 'Big Tex Historical Sales.csv');
    const csv = fs.readFileSync(csvPath, 'utf-8');
    
    // First aggregate
    const aggResponse = await fetch('http://localhost:3000/api/aggregate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv })
    });
    const aggData = await aggResponse.json();
    
    if (!aggData.success) {
      console.log(`   ❌ Aggregation failed before training\n`);
      return;
    }

    // Then train
    const trainResponse = await fetch('http://localhost:3000/api/train-xgb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const trainData = await trainResponse.json();
    
    if (trainData.status === 'success') {
      console.log(`   ✅ Training completed!`);
      console.log(`   📈 MAPE: ${trainData.training.mape.toFixed(2)}%`);
      console.log(`   ⏱️  Duration: ${(trainData.training.duration / 1000).toFixed(1)}s`);
      console.log(`   🤖 Method: ${trainData.training.method}`);
      console.log(`   📊 Training samples: ${trainData.training.trainingSamples}`);
      console.log(`   📊 Test samples: ${trainData.training.testSamples}\n`);
    } else {
      console.log(`   ❌ Training failed: ${trainData.error}\n`);
    }
  } catch (e) {
    console.log(`   ❌ Failed: ${e.message}\n`);
  }

  // 4. Test SKU Analysis
  console.log('4️⃣  Testing /api/sku-analysis endpoint...');
  try {
    const response = await fetch('http://localhost:3000/api/sku-analysis?skus=10CH', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    
    if (data.success && data.data.length > 0) {
      const analysis = data.data[0];
      console.log(`   ✅ SKU Analysis for ${analysis.sku}:`);
      console.log(`   📊 Characteristics:`, {
        volatility: analysis.characteristics.volatility.toFixed(3),
        seasonality: analysis.characteristics.seasonality.toFixed(3),
        trend: analysis.characteristics.trend.toFixed(3),
        dataPoints: analysis.characteristics.dataPoints
      });
      console.log(`   ⚖️  Adaptive Weights:`, {
        xgboost: (analysis.weights['xgboost'] * 100).toFixed(1) + '%',
        holt_winters: (analysis.weights['holt_winters'] * 100).toFixed(1) + '%',
        prophet: (analysis.weights['prophet'] * 100).toFixed(1) + '%'
      });
      console.log(`   💡 Explanation: ${analysis.explanation.split('\n')[0]}\n`);
    } else {
      console.log(`   ❌ Analysis failed: ${data.error}\n`);
    }
  } catch (e) {
    console.log(`   ❌ Failed: ${e.message}\n`);
  }

  console.log('✅ Backend Integration Tests Complete!');
}

testBackend().catch(console.error);
