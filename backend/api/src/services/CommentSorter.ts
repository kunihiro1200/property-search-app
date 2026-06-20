/**
 * CommentSorter - Sort comments and activities in reverse chronological order
 * 
 * Sorting strategy:
 * 1. Extract timestamps from comment text using TimestampParser
 * 2. Use most recent timestamp if multiple exist in one comment
 * 3. Fall back to createdAt date for entries without timestamps
 * 4. Sort in descending order (newest first)
 */

import { ActivityLog, Activity } from '../types';
import { TimestampParser } from './TimestampParser';

export interface CommentEntry {
  text: string;
  timestamp?: Date;
  createdAt?: Date;
  source: 'comment' | 'activity';
  originalData?: any;
}

export interface SortedEntry {
  text: string;
  date: Date;
  source: 'comment' | 'activity';
  hasTimestamp: boolean;
}

export class CommentSorter {
  private timestampParser: TimestampParser;

  constructor() {
    this.timestampParser = new TimestampParser();
  }

  /**
   * Sort comment entries by timestamp (newest first)
   * @param entries - Array of comment entries
   * @returns Sorted array (newest first)
   */
  sortByTimestamp(entries: CommentEntry[]): CommentEntry[] {
    return [...entries].sort((a, b) => {
      const dateA = this.getEffectiveDate(a);
      const dateB = this.getEffectiveDate(b);
      
      // Sort descending (newest first)
      return dateB.getTime() - dateA.getTime();
    });
  }

  /**
   * Convert comments and activities to unified entries and sort them
   * @param comments - Array of comment strings
   * @param activities - Array of activity entries
   * @returns Sorted entries (newest first)
   */
  sortCommentsAndActivities(
    comments: string[],
    activities: (ActivityLog | Activity)[]
  ): SortedEntry[] {
    const entries: SortedEntry[] = [];

    // Process comments
    for (const comment of comments) {
      const mostRecentTimestamp = this.timestampParser.getMostRecentTimestamp(comment);
      const hasTimestamp = mostRecentTimestamp !== null;
      
      entries.push({
        text: comment,
        date: mostRecentTimestamp || new Date(), // Fallback to now if no timestamp
        source: 'comment',
        hasTimestamp,
      });
    }

    // Process activities
    for (const activity of activities) {
      const content = 'content' in activity ? activity.content : '';
      const createdAt = new Date(activity.createdAt);
      
      entries.push({
        text: content,
        date: createdAt,
        source: 'activity',
        hasTimestamp: true, // Activities always have createdAt
      });
    }

    // Sort by date (newest first)
    entries.sort((a, b) => b.date.getTime() - a.date.getTime());

    return entries;
  }

  /**
   * Sort only comments (without activities)
   * @param comments - Array of comment strings with optional createdAt dates
   * @returns Sorted comments (newest first)
   */
  sortComments(comments: Array<{ text: string; createdAt?: Date }>): string[] {
    const entries: Array<{ text: string; date: Date }> = comments.map(comment => {
      const mostRecentTimestamp = this.timestampParser.getMostRecentTimestamp(comment.text);
      
      return {
        text: comment.text,
        date: mostRecentTimestamp || comment.createdAt || new Date(),
      };
    });

    // Sort by date (newest first)
    entries.sort((a, b) => b.date.getTime() - a.date.getTime());

    return entries.map(e => e.text);
  }

  /**
   * Get the effective date for sorting
   * Uses most recent timestamp from text, or falls back to createdAt
   * @private
   */
  private getEffectiveDate(entry: CommentEntry): Date {
    // Try to extract timestamp from text
    if (entry.text) {
      const mostRecentTimestamp = this.timestampParser.getMostRecentTimestamp(entry.text);
      if (mostRecentTimestamp) {
        return mostRecentTimestamp;
      }
    }

    // Fall back to explicit timestamp
    if (entry.timestamp) {
      return entry.timestamp;
    }

    // Fall back to createdAt
    if (entry.createdAt) {
      return entry.createdAt;
    }

    // Last resort: use current date
    return new Date();
  }

  /**
   * Group entries by date (for display purposes)
   * @param entries - Sorted entries
   * @returns Map of date string to entries
   */
  groupByDate(entries: SortedEntry[]): Map<string, SortedEntry[]> {
    const grouped = new Map<string, SortedEntry[]>();

    for (const entry of entries) {
      const dateKey = entry.date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      
      grouped.get(dateKey)!.push(entry);
    }

    return grouped;
  }

  /**
   * Get the most recent entry
   * @param entries - Array of entries
   * @returns Most recent entry or null if empty
   */
  getMostRecent(entries: CommentEntry[]): CommentEntry | null {
    if (entries.length === 0) {
      return null;
    }

    const sorted = this.sortByTimestamp(entries);
    return sorted[0];
  }

  /**
   * Get the oldest entry
   * @param entries - Array of entries
   * @returns Oldest entry or null if empty
   */
  getOldest(entries: CommentEntry[]): CommentEntry | null {
    if (entries.length === 0) {
      return null;
    }

    const sorted = this.sortByTimestamp(entries);
    return sorted[sorted.length - 1];
  }

  /**
   * Filter entries by date range
   * @param entries - Array of entries
   * @param from - Start date (inclusive)
   * @param to - End date (inclusive)
   * @returns Filtered entries
   */
  filterByDateRange(
    entries: CommentEntry[],
    from: Date,
    to: Date
  ): CommentEntry[] {
    return entries.filter(entry => {
      const date = this.getEffectiveDate(entry);
      return date >= from && date <= to;
    });
  }
}
