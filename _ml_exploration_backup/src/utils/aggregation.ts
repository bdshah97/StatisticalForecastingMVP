/**
 * Data Aggregation Utility
 * Aggregates raw CSV data by SKU-Month for better performance
 * This mirrors the backend aggregation logic
 */

export interface AggregatedDataPoint {
  sku: string;
  yearMonth: string;
  quantity: number;      // sum of all quantities in that month
  count: number;         // number of records in that month
  minQty: number;
  maxQty: number;
  stdDev: number;
  category?: string;
}

/**
 * Normalize date to YYYY-MM format
 */
const normalizeDate = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      throw new Error(`Invalid date: ${dateStr}`);
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  } catch (error) {
    console.error(`Error normalizing date "${dateStr}":`, error);
    throw error;
  }
};

/**
 * Parse CSV text and extract structured data
 */
const parseCSV = (csvText: string): any[] => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) throw new Error('CSV must have header row');

  // Find column indices by matching header names
  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const dateIdx = header.findIndex(h => h.includes('date'));
  const qtyIdx = header.findIndex(h => h.includes('quantity') || h.includes('qty'));
  const skuIdx = header.findIndex(h => h.includes('sku'));
  const catIdx = header.findIndex(h => h.includes('category') || h.includes('cat'));

  if (dateIdx === -1 || qtyIdx === -1 || skuIdx === -1) {
    throw new Error('CSV must have: date, quantity, sku columns');
  }

  const data: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const trimmedLine = lines[i].trim();
    if (trimmedLine.length === 0) continue;

    const cols = trimmedLine.split(',').map(c => c.trim());
    
    try {
      const date = normalizeDate(cols[dateIdx]);
      const qty = parseFloat(cols[qtyIdx]);
      const sku = cols[skuIdx];
      const category = catIdx >= 0 ? cols[catIdx] : 'Unknown';

      if (!date || isNaN(qty) || !sku) {
        console.warn(`Skipping invalid row ${i}: date=${cols[dateIdx]}, qty=${cols[qtyIdx]}, sku=${sku}`);
        continue;
      }

      data.push({
        date,
        quantity: qty,
        sku,
        category
      });
    } catch (error) {
      console.warn(`Error parsing row ${i}:`, error);
      continue;
    }
  }

  if (data.length === 0) {
    throw new Error('No valid data rows found in CSV');
  }

  return data;
};

/**
 * Aggregate CSV data by SKU-Month
 * Reduces 500K daily records to ~18K monthly records (27x compression)
 */
export const aggregateCSVData = (csvText: string): AggregatedDataPoint[] => {
  console.log('🔄 Aggregating CSV data...');
  const startTime = Date.now();

  try {
    const data = parseCSV(csvText);
    console.log(`✅ Parsed ${data.length} raw records`);

    // Group by SKU-month
    const groups = new Map<string, any[]>();
    data.forEach(point => {
      const key = `${point.sku}-${point.date}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(point);
    });

    console.log(`✅ Created ${groups.size} SKU-month groups`);

    // Aggregate each group
    const aggregates: AggregatedDataPoint[] = [];
    groups.forEach((points, key) => {
      const [sku, yearMonth] = key.split('-');
      const quantities = points.map((p: any) => p.quantity);

      // Calculate statistics
      const sum = quantities.reduce((a, b) => a + b, 0);
      const count = quantities.length;
      const mean = sum / count;
      const variance = quantities.reduce((sq, x) => sq + Math.pow(x - mean, 2), 0) / count;
      const stdDev = Math.sqrt(variance);
      const minQty = Math.min(...quantities);
      const maxQty = Math.max(...quantities);

      aggregates.push({
        sku,
        yearMonth,
        quantity: sum,
        count,
        minQty,
        maxQty,
        stdDev,
        category: points[0].category // Use category from first record
      });
    });

    // Sort by SKU, then date
    aggregates.sort((a, b) => {
      if (a.sku !== b.sku) return a.sku.localeCompare(b.sku);
      return a.yearMonth.localeCompare(b.yearMonth);
    });

    const duration = Date.now() - startTime;
    const compression = Math.round((data.length / aggregates.length) * 10) / 10;

    console.log(`✅ Aggregation complete in ${duration}ms`);
    console.log(`📊 Compression: ${data.length} → ${aggregates.length} records (${compression}x smaller)`);
    console.log(`🎯 Unique SKUs: ${new Set(aggregates.map(a => a.sku)).size}`);

    return aggregates;
  } catch (error) {
    console.error('❌ Aggregation error:', error);
    throw error;
  }
};

/**
 * Convert aggregated data back to the format App.tsx expects
 * Aggregated data has months, but App expects daily-like format
 * We'll expand each month into a single "daily" point for compatibility
 */
export const convertAggregatedToAppFormat = (aggregates: AggregatedDataPoint[]): any[] => {
  return aggregates.map(agg => ({
    date: `${agg.yearMonth}-01`, // Use first day of month
    sku: agg.sku,
    quantity: agg.quantity,        // Sum of month
    category: agg.category || 'Unknown'
  }));
};

/**
 * Calculate statistics from aggregated data for a specific SKU
 */
export const calculateAggregateStats = (aggregates: AggregatedDataPoint[], sku: string) => {
  const skuData = aggregates.filter(a => a.sku === sku);
  if (skuData.length === 0) return null;

  const quantities = skuData.map(a => a.quantity);
  const avg = quantities.reduce((a, b) => a + b, 0) / quantities.length;
  const variance = quantities.reduce((sq, x) => sq + Math.pow(x - avg, 2), 0) / quantities.length;
  const std = Math.sqrt(variance);
  const trend = (quantities[quantities.length - 1] - quantities[0]) / quantities.length;

  return {
    avg,
    std,
    min: Math.min(...quantities),
    max: Math.max(...quantities),
    trend,
    count: quantities.length
  };
};
