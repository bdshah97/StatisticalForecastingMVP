/**
 * Centralized Date Parsing Utility
 * Converts all date formats to YYYY-MM-DD (ISO format)
 * Handles: MM-DD-YYYY, MM/DD/YYYY, YYYY-MM-DD, YYYY-MM, M-D-YYYY, M/D/YYYY, etc.
 */

/**
 * Parse any date format and return YYYY-MM-DD
 * Handles: MM-DD-YYYY, MM/DD/YYYY, YYYY-MM-DD, YYYY-MM, M-D-YYYY, M/D/YYYY, and more
 * @param dateStr - Date string in any common format
 * @returns Normalized date string in YYYY-MM-DD format, or empty string if invalid
 */
export const parseToISODate = (dateStr: string | Date | undefined): string => {
  if (!dateStr) return '';

  try {
    // Handle Date object
    if (dateStr instanceof Date) {
      if (isNaN(dateStr.getTime())) return '';
      return formatAsISODate(dateStr);
    }

    const str = String(dateStr).trim();
    if (str.length === 0) return '';

    // Try: YYYY-MM-DD (already in correct format)
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const date = new Date(str + 'T00:00:00Z');
      if (!isNaN(date.getTime())) return str;
    }

    // Try: YYYY-MM (partial date, add -01)
    if (/^\d{4}-\d{2}$/.test(str)) {
      return `${str}-01`;
    }

    // Try: MM/DD/YYYY or M/D/YYYY (slash format - US style)
    const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      const month = slashMatch[1].padStart(2, '0');
      const day = slashMatch[2].padStart(2, '0');
      const year = slashMatch[3];
      const dateStr = `${year}-${month}-${day}`;
      const date = new Date(dateStr + 'T00:00:00Z');
      if (!isNaN(date.getTime())) return dateStr;
    }

    // Try: MM-DD-YYYY or M-D-YYYY (dash format - US style with dashes)
    const dashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dashMatch) {
      const month = dashMatch[1].padStart(2, '0');
      const day = dashMatch[2].padStart(2, '0');
      const year = dashMatch[3];
      const dateStr = `${year}-${month}-${day}`;
      const date = new Date(dateStr + 'T00:00:00Z');
      if (!isNaN(date.getTime())) return dateStr;
    }

    // Try: DD/MM/YYYY (European style - if all parts <= 12, ambiguous, so skip this to avoid confusion)
    // Instead, fall through to Date constructor which handles many formats

    // Fallback: Try native Date constructor
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      return formatAsISODate(date);
    }

    // If all parsing fails, return empty
    console.warn(`⚠️ Could not parse date: "${dateStr}"`);
    return '';
  } catch (error) {
    console.error(`❌ Error parsing date "${dateStr}":`, error);
    return '';
  }
};

/**
 * Format a Date object as YYYY-MM-DD
 */
const formatAsISODate = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parse to YYYY-MM (year-month only)
 * Used for aggregation and time-series grouping
 */
export const parseToYearMonth = (dateStr: string | Date | undefined): string => {
  const isoDate = parseToISODate(dateStr);
  if (!isoDate) return '';
  return isoDate.substring(0, 7); // YYYY-MM
};

/**
 * Format date for display as M/YYYY
 * Converts YYYY-MM-DD → M/YYYY
 */
export const formatForDisplay = (dateStr: string | Date | undefined): string => {
  if (!dateStr) return '';

  try {
    // If it's a string, try to parse month/year
    if (typeof dateStr === 'string') {
      const parts = dateStr.split('-');
      if (parts.length >= 2) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        if (!isNaN(year) && !isNaN(month)) {
          return `${month}/${year}`;
        }
      }

      // If already in MM/YYYY format, return as-is
      if (dateStr.includes('/')) {
        return dateStr;
      }
    }

    // Handle Date object
    if (dateStr instanceof Date && !isNaN(dateStr.getTime())) {
      const month = dateStr.getUTCMonth() + 1;
      const year = dateStr.getUTCFullYear();
      return `${month}/${year}`;
    }

    return '';
  } catch (error) {
    console.warn(`Could not format date for display: "${dateStr}"`, error);
    return '';
  }
};

/**
 * Validate if a string is a valid ISO date (YYYY-MM-DD)
 */
export const isValidISODate = (dateStr: string): boolean => {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(new Date(dateStr + 'T00:00:00Z').getTime());
};

/**
 * Get YYYY-MM-DD for today
 */
export const getTodayISODate = (): string => {
  const now = new Date();
  return formatAsISODate(now);
};
