/**
 * Data Validation Utility
 * Validates DataPoint and ProductAttribute objects for data quality
 */

import { DataPoint, ProductAttribute } from '../types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a single DataPoint
 * Checks for: valid date, valid quantity, non-empty SKU
 */
export const validateDataPoint = (point: DataPoint): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check SKU
  if (!point.sku || String(point.sku).trim() === '') {
    errors.push('Missing SKU');
  }

  // Check date format (should be YYYY-MM-DD)
  if (!point.date || !/^\d{4}-\d{2}-\d{2}$/.test(point.date)) {
    errors.push(`Invalid date format: "${point.date}" (expected YYYY-MM-DD)`);
  }

  // Check quantity is a number
  if (typeof point.quantity !== 'number') {
    errors.push(`Quantity is not a number: "${point.quantity}"`);
  }

  // Check quantity is non-negative
  if (point.quantity < 0) {
    errors.push(`Negative quantity: ${point.quantity}`);
  }

  // Check for suspicious quantities (likely data entry errors)
  if (point.quantity > 10000000) {
    warnings.push(`Very large quantity (possible error): ${point.quantity}`);
  }

  // Check for zero quantities (valid but worth noting)
  if (point.quantity === 0) {
    warnings.push(`Zero quantity on ${point.date}`);
  }

  // Validate category if present
  if (point.category && String(point.category).trim() === '') {
    warnings.push('Empty category string');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validate array of DataPoints and return summary
 */
export const validateDataPoints = (points: DataPoint[]): {
  totalPoints: number;
  validPoints: number;
  invalidPoints: number;
  totalErrors: string[];
  totalWarnings: string[];
  invalidRows: Array<{ index: number; errors: string[] }>;
} => {
  const invalidRows: Array<{ index: number; errors: string[] }> = [];
  const totalErrors: string[] = [];
  const totalWarnings: string[] = [];
  let validCount = 0;

  points.forEach((point, index) => {
    const result = validateDataPoint(point);
    if (result.valid) {
      validCount++;
    } else {
      invalidRows.push({ index, errors: result.errors });
      totalErrors.push(`Row ${index}: ${result.errors.join('; ')}`);
    }
    totalWarnings.push(...result.warnings.map(w => `Row ${index}: ${w}`));
  });

  return {
    totalPoints: points.length,
    validPoints: validCount,
    invalidPoints: points.length - validCount,
    totalErrors,
    totalWarnings,
    invalidRows
  };
};

/**
 * Clean data: remove invalid rows and return clean dataset + summary
 */
export const cleanDataPoints = (
  points: DataPoint[],
  removeZeroQuantity: boolean = false
): { cleaned: DataPoint[]; removed: Array<{ index: number; reason: string }> } => {
  const removed: Array<{ index: number; reason: string }> = [];

  const cleaned = points.filter((point, index) => {
    const validation = validateDataPoint(point);

    if (!validation.valid) {
      removed.push({ index, reason: validation.errors[0] });
      return false;
    }

    if (removeZeroQuantity && point.quantity === 0) {
      removed.push({ index, reason: 'Zero quantity' });
      return false;
    }

    return true;
  });

  return { cleaned, removed };
};

/**
 * Validate ProductAttribute
 */
export const validateProductAttribute = (attr: ProductAttribute): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check SKU
  if (!attr.sku || String(attr.sku).trim() === '') {
    errors.push('Missing SKU');
  }

  // Check lead time
  if (typeof attr.leadTimeDays !== 'number' || attr.leadTimeDays < 0) {
    errors.push(`Invalid lead time: ${attr.leadTimeDays}`);
  }

  // Check unit cost
  if (typeof attr.unitCost !== 'number' || attr.unitCost < 0) {
    errors.push(`Invalid unit cost: ${attr.unitCost}`);
  }

  // Check selling price
  if (typeof attr.sellingPrice !== 'number' || attr.sellingPrice < 0) {
    errors.push(`Invalid selling price: ${attr.sellingPrice}`);
  }

  // Check service level (should be 0-1)
  if (typeof attr.serviceLevel !== 'number' || attr.serviceLevel < 0 || attr.serviceLevel > 1) {
    errors.push(`Invalid service level: ${attr.serviceLevel} (must be 0-1)`);
  }

  // Warn if selling price < unit cost
  if (attr.sellingPrice < attr.unitCost) {
    warnings.push(`Selling price (${attr.sellingPrice}) < unit cost (${attr.unitCost})`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Data Quality Report
 */
export const generateQualityReport = (points: DataPoint[]): string => {
  const validation = validateDataPoints(points);
  const skus = new Set(points.map(p => p.sku)).size;
  const dateRange = points.length > 0
    ? `${points[0].date} to ${points[points.length - 1].date}`
    : 'N/A';
  const avgQuantity = points.length > 0
    ? Math.round(points.reduce((s, p) => s + p.quantity, 0) / points.length)
    : 0;

  const report = `
📊 DATA QUALITY REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Records:      ${validation.totalPoints}
Valid Records:      ${validation.validPoints} ✅
Invalid Records:    ${validation.invalidPoints} ❌
Unique SKUs:        ${skus}
Date Range:         ${dateRange}
Avg Quantity:       ${avgQuantity}

Validation Status:  ${validation.invalidPoints === 0 ? '✅ PASS' : '❌ FAIL'}
Warnings:           ${validation.totalWarnings.length}

${validation.totalErrors.length > 0 ? `\nErrors:\n${validation.totalErrors.slice(0, 5).join('\n')}${validation.totalErrors.length > 5 ? `\n... and ${validation.totalErrors.length - 5} more` : ''}` : ''}

${validation.totalWarnings.length > 0 ? `\nWarnings:\n${validation.totalWarnings.slice(0, 5).join('\n')}${validation.totalWarnings.length > 5 ? `\n... and ${validation.totalWarnings.length - 5} more` : ''}` : ''}
  `.trim();

  return report;
};
