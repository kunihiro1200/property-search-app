/**
 * CallCounter - Count phone calls from multiple sources with deduplication
 * 
 * Combines call counts from:
 * 1. Communication history (ActivityLog entries)
 * 2. Spreadsheet comments (timestamp patterns)
 * 
 * Ensures no duplicate counting occurs
 */

import { ActivityLog, Activity, ActivityType } from '../types';
import { TimestampParser } from './TimestampParser';

export interface CallCountResult {
  totalCalls: number;
  callsFromHistory: number;
  callsFromComments: number;
  historyTimestamps: Date[];
  commentTimestamps: Date[];
}

export class CallCounter {
  private timestampParser: TimestampParser;

  constructor() {
    this.timestampParser = new TimestampParser();
  }

  /**
   * Count phone calls from communication history
   * @param activities - Array of activity log entries
   * @returns Count of phone call activities and their timestamps
   */
  countCallsFromHistory(activities: ActivityLog[] | Activity[]): { count: number; timestamps: Date[] } {
    const phoneCalls = activities.filter(activity => {
      // Check both 'action' (ActivityLog) and 'type' (Activity) fields
      const activityType = 'action' in activity ? activity.action : activity.type;
      return activityType === 'phone_call' || activityType === ActivityType.PHONE_CALL;
    });

    const timestamps = phoneCalls.map(call => new Date(call.createdAt));
    
    return {
      count: phoneCalls.length,
      timestamps,
    };
  }

  /**
   * Count phone calls from spreadsheet comments
   * @param comments - Array of comment strings
   * @returns Count of timestamps and the timestamps themselves
   */
  countCallsFromComments(comments: string[]): { count: number; timestamps: Date[] } {
    const allTimestamps: Date[] = [];

    for (const comment of comments) {
      try {
        const timestamps = this.timestampParser.parseTimestamps(comment);
        allTimestamps.push(...timestamps.map(t => t.date));
      } catch (error) {
        console.error(`Error counting calls from comment`, error);
        // Continue processing other comments
      }
    }

    return {
      count: allTimestamps.length,
      timestamps: allTimestamps,
    };
  }

  /**
   * Count total calls from both sources with deduplication
   * 
   * Deduplication strategy:
   * - Timestamps within 5 minutes of each other are considered the same call
   * - This handles cases where a call is logged in both systems with slight time differences
   * 
   * @param activities - Communication history entries
   * @param comments - Spreadsheet comments
   * @returns Detailed call count result
   */
  countTotalCalls(
    activities: ActivityLog[] | Activity[],
    comments: string[]
  ): CallCountResult {
    const historyResult = this.countCallsFromHistory(activities);
    const commentsResult = this.countCallsFromComments(comments);

    // Deduplicate timestamps that are within 5 minutes of each other
    const deduplicatedCount = this.deduplicateTimestamps(
      historyResult.timestamps,
      commentsResult.timestamps
    );

    return {
      totalCalls: deduplicatedCount,
      callsFromHistory: historyResult.count,
      callsFromComments: commentsResult.count,
      historyTimestamps: historyResult.timestamps,
      commentTimestamps: commentsResult.timestamps,
    };
  }

  /**
   * Deduplicate timestamps from two sources
   * 
   * Considers timestamps within 5 minutes as duplicates
   * 
   * @private
   * @param historyTimestamps - Timestamps from communication history
   * @param commentTimestamps - Timestamps from comments
   * @returns Total unique call count
   */
  private deduplicateTimestamps(
    historyTimestamps: Date[],
    commentTimestamps: Date[]
  ): number {
    const DUPLICATE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

    // Start with all history timestamps
    const uniqueTimestamps = [...historyTimestamps];

    // Add comment timestamps that don't match any history timestamp
    for (const commentTs of commentTimestamps) {
      const isDuplicate = historyTimestamps.some(historyTs => {
        const diff = Math.abs(commentTs.getTime() - historyTs.getTime());
        return diff < DUPLICATE_THRESHOLD_MS;
      });

      if (!isDuplicate) {
        uniqueTimestamps.push(commentTs);
      }
    }

    return uniqueTimestamps.length;
  }

  /**
   * Simple count without deduplication (for backward compatibility)
   * @param activities - Communication history entries
   * @param comments - Spreadsheet comments
   * @returns Simple sum of calls from both sources
   */
  countSimple(
    activities: ActivityLog[] | Activity[],
    comments: string[]
  ): number {
    const historyCount = this.countCallsFromHistory(activities).count;
    const commentsCount = this.countCallsFromComments(comments).count;
    return historyCount + commentsCount;
  }

  /**
   * Get all unique timestamps from both sources, sorted newest first
   * @param activities - Communication history entries
   * @param comments - Spreadsheet comments
   * @returns Array of unique timestamps sorted by date (newest first)
   */
  getAllTimestamps(
    activities: ActivityLog[] | Activity[],
    comments: string[]
  ): Date[] {
    const historyResult = this.countCallsFromHistory(activities);
    const commentsResult = this.countCallsFromComments(comments);

    // Combine all timestamps
    const allTimestamps = [
      ...historyResult.timestamps,
      ...commentsResult.timestamps,
    ];

    // Remove exact duplicates
    const uniqueTimestamps = Array.from(
      new Set(allTimestamps.map(d => d.getTime()))
    ).map(t => new Date(t));

    // Sort newest first
    uniqueTimestamps.sort((a, b) => b.getTime() - a.getTime());

    return uniqueTimestamps;
  }
}
