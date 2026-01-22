/**
 * TimestampParser - Extract and parse timestamps from spreadsheet comments
 * 
 * Handles multiple timestamp patterns:
 * - M/D HH:mm or MM/DD HH:mm (e.g., "3/2 12:00", "10/15 09:30")
 * - YYYY/M/D HH:mm (e.g., "2023/9/14 12:24")
 * - YYYY/M/D (e.g., "2023/10/27")
 * - Prefixed patterns (e.g., "T2023/9/14 12:24", "S2023/9/6")
 */

export interface ParsedTimestamp {
  date: Date;
  originalText: string;
}

export class TimestampParser {
  // Regex patterns for different timestamp formats
  // Pattern 1: YYYY/M/D HH:mm (with optional prefix like T, S, W, K, H, Y)
  private static readonly FULL_DATETIME_PATTERN = /[TSWKHY]?(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{1,2})/g;
  // Pattern 2: YYYY/M/D (date only, with optional prefix)
  private static readonly DATE_ONLY_PATTERN = /[TSWKHY]?(\d{4})\/(\d{1,2})\/(\d{1,2})(?!\s*\d)/g;
  // Pattern 3: M/D HH:mm (short format, current year assumed)
  private static readonly SHORT_DATETIME_PATTERN = /(?<![\/\d])(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{1,2})/g;
  // Pattern 4: M/D (short date only, current year assumed) - for counting calls
  private static readonly SHORT_DATE_ONLY_PATTERN = /(?<![\/\d])(\d{1,2})\/(\d{1,2})(?!\s*\d)/g;

  /**
   * Parse all timestamps from a text string
   * @param text - Text containing timestamp patterns
   * @returns Array of parsed timestamps with their original text
   */
  parseTimestamps(text: string): ParsedTimestamp[] {
    const timestamps: ParsedTimestamp[] = [];
    const seenPositions = new Set<number>();

    // Pattern 1: Full datetime with year (YYYY/M/D HH:mm)
    const fullPattern = new RegExp(TimestampParser.FULL_DATETIME_PATTERN);
    let match: RegExpExecArray | null;

    while ((match = fullPattern.exec(text)) !== null) {
      try {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const day = parseInt(match[3], 10);
        const hour = parseInt(match[4], 10);
        const minute = parseInt(match[5], 10);

        if (this.isValidDate(month, day, hour, minute) && year >= 2000 && year <= 2100) {
          const date = new Date(year, month - 1, day, hour, minute);
          timestamps.push({ date, originalText: match[0] });
          seenPositions.add(match.index);
        }
      } catch (error) {
        console.error(`Error parsing full datetime: ${match[0]}`, error);
      }
    }

    // Pattern 2: Date only with year (YYYY/M/D)
    const dateOnlyPattern = new RegExp(TimestampParser.DATE_ONLY_PATTERN);
    while ((match = dateOnlyPattern.exec(text)) !== null) {
      // Skip if this position was already matched by full datetime pattern
      if (seenPositions.has(match.index)) continue;

      try {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const day = parseInt(match[3], 10);

        if (this.isValidDate(month, day, 0, 0) && year >= 2000 && year <= 2100) {
          const date = new Date(year, month - 1, day, 12, 0); // Default to noon
          timestamps.push({ date, originalText: match[0] });
          seenPositions.add(match.index);
        }
      } catch (error) {
        console.error(`Error parsing date only: ${match[0]}`, error);
      }
    }

    // Pattern 3: Short datetime (M/D HH:mm)
    const shortPattern = new RegExp(TimestampParser.SHORT_DATETIME_PATTERN);
    while ((match = shortPattern.exec(text)) !== null) {
      // Skip if this position was already matched
      if (seenPositions.has(match.index)) continue;

      try {
        const month = parseInt(match[1], 10);
        const day = parseInt(match[2], 10);
        const hour = parseInt(match[3], 10);
        const minute = parseInt(match[4], 10);

        if (this.isValidDate(month, day, hour, minute)) {
          const date = this.createDate(month, day, hour, minute);
          timestamps.push({ date, originalText: match[0] });
          seenPositions.add(match.index);
        }
      } catch (error) {
        console.error(`Error parsing short datetime: ${match[0]}`, error);
      }
    }

    // Pattern 4: Short date only (M/D) - for counting calls
    const shortDatePattern = new RegExp(TimestampParser.SHORT_DATE_ONLY_PATTERN);
    while ((match = shortDatePattern.exec(text)) !== null) {
      // Skip if this position was already matched
      if (seenPositions.has(match.index)) continue;

      try {
        const month = parseInt(match[1], 10);
        const day = parseInt(match[2], 10);

        if (this.isValidDate(month, day, 0, 0)) {
          const date = this.createDate(month, day, 12, 0); // Default to noon
          timestamps.push({ date, originalText: match[0] });
          seenPositions.add(match.index);
        }
      } catch (error) {
        console.error(`Error parsing short date only: ${match[0]}`, error);
      }
    }

    return timestamps;
  }

  /**
   * Count the number of phone calls from comments based on timestamps
   * @param comments - Array of comment strings
   * @returns Total count of unique timestamps across all comments
   */
  countCallsFromComments(comments: string[]): number {
    let totalCount = 0;

    for (const comment of comments) {
      try {
        const timestamps = this.parseTimestamps(comment);
        totalCount += timestamps.length;
      } catch (error) {
        console.error(`Error counting calls from comment: ${comment}`, error);
        // Continue processing other comments
      }
    }

    return totalCount;
  }

  /**
   * Extract the most recent timestamp from a text
   * @param text - Text containing timestamp patterns
   * @returns Most recent timestamp or null if none found
   */
  getMostRecentTimestamp(text: string): Date | null {
    const timestamps = this.parseTimestamps(text);
    
    if (timestamps.length === 0) {
      return null;
    }

    // Sort by date descending and return the most recent
    timestamps.sort((a, b) => b.date.getTime() - a.date.getTime());
    return timestamps[0].date;
  }

  /**
   * Extract all unique timestamps from multiple texts
   * @param texts - Array of text strings
   * @returns Array of unique timestamps sorted by date (newest first)
   */
  getAllTimestamps(texts: string[]): Date[] {
    const allTimestamps: Date[] = [];

    for (const text of texts) {
      try {
        const timestamps = this.parseTimestamps(text);
        allTimestamps.push(...timestamps.map(t => t.date));
      } catch (error) {
        console.error(`Error extracting timestamps from text`, error);
      }
    }

    // Remove duplicates by converting to timestamps and back
    const uniqueTimestamps = Array.from(
      new Set(allTimestamps.map(d => d.getTime()))
    ).map(t => new Date(t));

    // Sort newest first
    uniqueTimestamps.sort((a, b) => b.getTime() - a.getTime());

    return uniqueTimestamps;
  }

  /**
   * Validate date and time values
   * @private
   */
  private isValidDate(month: number, day: number, hour: number, minute: number): boolean {
    // Basic range validation
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    if (hour < 0 || hour > 23) return false;
    if (minute < 0 || minute > 59) return false;

    // Check days in month (simplified - doesn't account for leap years perfectly)
    const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (day > daysInMonth[month - 1]) return false;

    return true;
  }

  /**
   * Create a Date object from parsed values
   * Uses current year as default
   * @private
   */
  private createDate(month: number, day: number, hour: number, minute: number): Date {
    const currentYear = new Date().getFullYear();
    return new Date(currentYear, month - 1, day, hour, minute);
  }

  /**
   * Check if a text contains any timestamp patterns
   * @param text - Text to check
   * @returns True if at least one timestamp pattern is found
   */
  hasTimestamp(text: string): boolean {
    // Check all patterns
    const fullPattern = new RegExp(TimestampParser.FULL_DATETIME_PATTERN);
    const dateOnlyPattern = new RegExp(TimestampParser.DATE_ONLY_PATTERN);
    const shortPattern = new RegExp(TimestampParser.SHORT_DATETIME_PATTERN);
    return fullPattern.test(text) || dateOnlyPattern.test(text) || shortPattern.test(text);
  }

  /**
   * Extract timestamp count without creating Date objects (for performance)
   * @param text - Text containing timestamp patterns
   * @returns Count of timestamp patterns found
   */
  countTimestampPatterns(text: string): number {
    const timestamps = this.parseTimestamps(text);
    return timestamps.length;
  }
}
