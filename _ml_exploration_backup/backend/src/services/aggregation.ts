/**
 * CSV Aggregation Service
 * Parses raw CSV data and groups by SKU-month
 */

import { SkuMonthAggregate } from '../types';

const parseCSV = (csvText: string): any[] => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) throw new Error('CSV must have header row');

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
    if (lines[i].trim().length === 0) continue;

    const cols = lines[i].split(',').map(c => c.trim());
    const date = normalizeDate(cols[dateIdx]);
    const qty = parseFloat(cols[qtyIdx]);
    const sku = cols[skuIdx];
    const category = catIdx >= 0 ? cols[catIdx] : 'Unknown';

    if (!date || isNaN(qty) || !sku) continue;

    data.push({
      date,
      quantity: qty,
      sku,
      category
    });
  }

  return data;
};

const normalizeDate = (dateStr: string): string => {
  // Handle multiple date formats
  let date: Date;
  
  // Try parsing as yyyy-MM format first (2025-01)
  if (/^\d{4}-\d{2}$/.test(dateStr.trim())) {
    const [year, month] = dateStr.trim().split('-');
    date = new Date(Number(year), Number(month) - 1, 1);
  } 
  // Try parsing as MM-DD-YYYY format (01-15-2025)
  else if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr.trim())) {
    const [month, day, year] = dateStr.trim().split('-');
    date = new Date(Number(year), Number(month) - 1, Number(day));
  }
  // Try parsing as MM/DD/YYYY format (01/15/2025)
  else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr.trim())) {
    const [month, day, year] = dateStr.trim().split('/');
    date = new Date(Number(year), Number(month) - 1, Number(day));
  }
  // Try ISO format (2025-01-15)
  else {
    date = new Date(dateStr.trim());
  }
  
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: "${dateStr}" (expected: yyyy-MM, yyyy-MM-dd, MM-DD-yyyy, or MM/DD/yyyy)`);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const aggregateCSV = (csvText: string): SkuMonthAggregate[] => {
  const data = parseCSV(csvText);

  // Group by SKU-month
  const groups = new Map<string, any[]>();
  data.forEach(point => {
    const key = `${point.sku}-${point.date}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(point);
  });

  // Aggregate
  const aggregates: SkuMonthAggregate[] = [];
  groups.forEach((points, key) => {
    const [sku, yearMonth] = key.split('-');
    const quantities = points.map((p: any) => p.quantity);

    const sum = quantities.reduce((a, b) => a + b, 0);
    const mean = sum / quantities.length;
    const variance = quantities.reduce((sq, x) => sq + Math.pow(x - mean, 2), 0) / quantities.length;
    const stdDev = Math.sqrt(variance);

    aggregates.push({
      sku,
      yearMonth,
      quantity: sum,
      count: quantities.length,
      minQty: Math.min(...quantities),
      maxQty: Math.max(...quantities),
      stdDev,
      category: points[0].category
    });
  });

  return aggregates.sort((a, b) => {
    if (a.sku !== b.sku) return a.sku.localeCompare(b.sku);
    return a.yearMonth.localeCompare(b.yearMonth);
  });
};
