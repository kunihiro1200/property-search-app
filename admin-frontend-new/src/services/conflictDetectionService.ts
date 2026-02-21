/**
 * Conflict Detection Service
 * 
 * Detects concurrent edits to buyer records and provides conflict information
 * for resolution.
 */

import api from './api';

export interface ConflictInfo {
  conflictingValue: any;
  conflictingUser: string;
  conflictingTimestamp: Date;
  currentValue: any;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflict?: ConflictInfo;
}

/**
 * Check if a field has been modified by another user since the last fetch
 * 
 * @param buyerId - The buyer record ID
 * @param fieldName - The field being edited
 * @param lastKnownTimestamp - The timestamp when the user started editing
 * @param currentValue - The current value the user is trying to save
 * @returns Conflict check result with conflict details if detected
 */
export async function checkForConflict(
  buyerId: string,
  fieldName: string,
  lastKnownTimestamp: Date,
  currentValue: any
): Promise<ConflictCheckResult> {
  try {
    const response = await api.get(
      `/api/buyers/${buyerId}/conflict-check`,
      {
        params: {
          field: fieldName,
          timestamp: lastKnownTimestamp.toISOString()
        }
      }
    );

    const data = response.data;

    if (data.hasConflict) {
      return {
        hasConflict: true,
        conflict: {
          conflictingValue: data.conflictingValue,
          conflictingUser: data.conflictingUser,
          conflictingTimestamp: new Date(data.conflictingTimestamp),
          currentValue,
        },
      };
    }

    return { hasConflict: false };
  } catch (error) {
    console.error('Error checking for conflicts:', error);
    // In case of error, assume no conflict to allow save attempt
    return { hasConflict: false };
  }
}

/**
 * Get the last modified timestamp for a specific field
 * 
 * @param buyerId - The buyer record ID
 * @param fieldName - The field name
 * @returns The last modified timestamp for the field
 */
export async function getFieldTimestamp(
  buyerId: string,
  fieldName: string
): Promise<Date> {
  try {
    const response = await api.get(
      `/api/buyers/${buyerId}/field-timestamp`,
      {
        params: { field: fieldName }
      }
    );

    return new Date(response.data.timestamp);
  } catch (error) {
    console.error('Error getting field timestamp:', error);
    return new Date(); // Return current time as fallback
  }
}
